import {ApiError} from './domain.mjs';
import {normalizeEmail,sha256} from './security.mjs';
export const q=(env,sql,...args)=>env.DB.prepare(sql).bind(...args);
export const rows=async(env,sql,...args)=>(await q(env,sql,...args).all()).results||[];
export const audit=(env,actor,action,kind,id,details={})=>q(env,'INSERT INTO admin_action_log(actor_hash,action,target_kind,target_id,details_json) VALUES(?,?,?,?,?)',actor.emailHash,action,kind,id,JSON.stringify(details));
export const templates=[
 {id:'feedback',label:'收到建议',subject:'Thank you for your feedback — Paper Adventure',body:'Hi,\n\nThank you for sharing your feedback. We have noted your suggestion and will consider it as we improve Paper Adventure.\n\nBest wishes,\nPaper Adventure support'},
 {id:'details',label:'补充问题细节',subject:'A little more detail about your request — Paper Adventure',body:'Hi,\n\nThank you for getting in touch. Could you tell us which file, page or checkpoint is affected and what happened? Please do not include children’s names, photographs, passwords or card details.\n\nBest wishes,\nPaper Adventure support'},
 {id:'delivery',label:'交付问题已收到',subject:'We are reviewing your delivery issue — Paper Adventure',body:'Hi,\n\nWe have received your delivery report and are reviewing the existing order. Please do not purchase the same game again to resolve this issue. We will follow up when we have an update.\n\nBest wishes,\nPaper Adventure support'},
 {id:'refund',label:'退款申请审核中',subject:'Your refund request is under review — Paper Adventure',body:'Hi,\n\nWe have received your refund request and are reviewing the order and payment details. This message acknowledges your request; it does not confirm that a refund has been issued. We will let you know the outcome.\n\nBest wishes,\nPaper Adventure support'},
];
export function pagination(params) {return {page:Math.min(100000,Math.max(1,Number.parseInt(params.get('page'))||1)),limit:25};}
export function searchValue(params){return (params.get('q')||'').trim().slice(0,100);}
export const like=value=>'%'+value.replace(/[\\%_]/g,'\\$&')+'%';
export async function pageRows(env,sql,args,params) {
 const {page,limit}=pagination(params),count=await q(env,`SELECT COUNT(*) total FROM (${sql})`,...args).first();
 const items=await rows(env,`${sql} LIMIT ? OFFSET ?`,...args,limit,(page-1)*limit);
 return {items,page,limit,total:count.total,pages:Math.max(1,Math.ceil(count.total/limit))};
}
export function orderFilter(params) {
 const where=[],args=[],mode=params.get('mode')||'live',status=params.get('status'),query=searchValue(params),user=params.get('user');
 if(['live','test','unknown'].includes(mode)){where.push('payment_mode=?');args.push(mode);}
 if(['pending_payment','paid','fulfilling','published','failed','refunded'].includes(status)){where.push('status=?');args.push(status);}
 if(params.get('archived')==='yes')where.push('archived_at IS NOT NULL');
 if(params.get('archived')==='no')where.push('archived_at IS NULL');
 if(user){where.push('purchaser_email_hash=?');args.push(user);}
 if(query){where.push("(id LIKE ? ESCAPE '\\' OR title LIKE ? ESCAPE '\\' OR customer_email LIKE ? ESCAPE '\\')");args.push(...Array(3).fill(like(query)));}
 return {where:where.length?' WHERE '+where.join(' AND '):'',args};
}
export function safeOrder(row) {
 const {stripe_checkout_session_id:session,stripe_payment_intent_id:intent,...safe}=row;
 return {...safe,stripeUrl:/^pi_[A-Za-z0-9]+$/.test(intent||'')&&row.payment_mode!=='unknown'?`https://dashboard.stripe.com/${row.payment_mode==='test'?'test/':''}payments/${intent}`:null};
}
export const inboxSql=`SELECT m.*,COALESCE(r.status,CASE WHEN m.original_status='reviewing' THEN 'in_progress' WHEN m.original_status='resolved' THEN 'resolved' ELSE 'unread' END) review_status,
 r.archived_at,r.internal_note,COALESCE(r.revision,0) revision,r.updated_at,
 (SELECT COUNT(*) FROM admin_replies ar WHERE ar.source_kind=m.source_kind AND ar.source_id=m.id) reply_count
 FROM (
 SELECT 'feedback' source_kind,f.id,f.type,f.message,f.reply_email email,f.page_path,f.created_at,f.notification_status,NULL order_id,NULL original_status,f.browser_category,f.device_category FROM site_feedback f
 UNION ALL
 SELECT 'support',s.id,s.issue_type,s.description,p.email,'/en/orders/',s.created_at,n.status,s.order_id,s.status,NULL,NULL FROM support_cases s LEFT JOIN account_profiles p ON p.email_hash=s.email_hash LEFT JOIN support_case_notifications n ON n.case_id=s.id
 ) m LEFT JOIN admin_message_reviews r ON r.source_kind=m.source_kind AND r.source_id=m.id`;
export async function messageDetail(env,kind,id) {
 if(!['feedback','support'].includes(kind))throw new ApiError(404,'MESSAGE_NOT_FOUND','未找到留言。');
 const message=await q(env,`SELECT * FROM (${inboxSql}) WHERE source_kind=? AND id=?`,kind,id).first();
 if(!message)throw new ApiError(404,'MESSAGE_NOT_FOUND','未找到留言。');
 const replies=await rows(env,'SELECT id,subject,body,recipient_email,status,attempts,error_code,created_at,sent_at FROM admin_replies WHERE source_kind=? AND source_id=? ORDER BY created_at DESC LIMIT 50',kind,id);
 return {...message,internal_note:message.internal_note||'',replies};
}
export async function userList(env,params) {
 const query=searchValue(params),hash=normalizeEmail(query)?await sha256(`${env.SESSION_SECRET}|${normalizeEmail(query)}`):null;
 const sql=`SELECT u.email_hash,p.email,p.first_login_at,p.last_login_at,p.source,p.is_operator,
  MIN(o.created_at) first_order_at,COUNT(o.id) order_count,
  SUM(CASE WHEN o.paid_at IS NOT NULL AND o.payment_mode='live' THEN 1 ELSE 0 END) paid_orders,
  COALESCE(SUM(CASE WHEN o.paid_at IS NOT NULL AND o.payment_mode='live' THEN o.amount_total ELSE 0 END),0) paid_amount,
  COALESCE(SUM(CASE WHEN o.paid_at IS NOT NULL AND o.payment_mode='live' THEN o.refunded_amount ELSE 0 END),0) refunded_amount
  FROM (SELECT email_hash FROM account_profiles UNION SELECT purchaser_email_hash FROM orders) u
  LEFT JOIN account_profiles p ON p.email_hash=u.email_hash LEFT JOIN admin_order_ledger o ON o.purchaser_email_hash=u.email_hash
  ${query?"WHERE (p.email LIKE ? ESCAPE '\\' OR u.email_hash=?)":''}
  GROUP BY u.email_hash ORDER BY COALESCE(p.last_login_at,MAX(o.created_at)) DESC,u.email_hash`;
 return pageRows(env,sql,query?[like(query),hash||query]:[],params);
}
export async function summary(env,params) {
 const days=[1,7,30].includes(Number(params.get('days')))?Number(params.get('days')):7;
 const from=new Date();from.setUTCHours(0,0,0,0);from.setUTCDate(from.getUTCDate()-days+1);
 const since=from.toISOString().slice(0,19).replace('T',' ');
 const sales=await q(env,`SELECT COUNT(*) paid_orders,COALESCE(SUM(amount_total),0) paid_amount FROM admin_order_ledger WHERE payment_mode='live' AND paid_at>=?`,since).first();
 const refunds=await q(env,`SELECT COALESCE(SUM(refunded_amount),0) refunded_total FROM admin_order_ledger WHERE payment_mode='live' AND paid_at IS NOT NULL`).first();
 // Cumulative refund snapshots cannot be added as per-period refund transactions.
 const lifetime=await q(env,`SELECT COALESCE(SUM(amount_total),0) paid_total FROM admin_order_ledger WHERE payment_mode='live' AND paid_at IS NOT NULL`).first();
 const users=await q(env,'SELECT COUNT(*) registered FROM account_profiles WHERE first_login_at>=? AND is_operator=0',since).first();
 const unread=await q(env,`SELECT COUNT(*) unread FROM (${inboxSql}) WHERE review_status='unread' AND archived_at IS NULL`).first();
 const requests=await q(env,"SELECT COUNT(*) pending FROM support_cases s LEFT JOIN admin_refund_reviews r ON r.case_id=s.id WHERE s.issue_type='refund' AND COALESCE(r.decision,'pending')='pending' AND s.status!='resolved'").first();
 const exceptions=await q(env,"SELECT COUNT(*) delivery FROM admin_order_ledger WHERE payment_mode='live' AND paid_at IS NOT NULL AND status!='refunded' AND (status='failed' OR plan_status='needs_help')").first();
 const modes=await rows(env,'SELECT payment_mode,COUNT(*) total FROM admin_order_ledger GROUP BY payment_mode');
 const attention=await q(env,"SELECT (SELECT COUNT(*) FROM site_feedback WHERE notification_status='attention')+(SELECT COUNT(*) FROM support_case_notifications WHERE status='attention')+(SELECT COUNT(*) FROM admin_replies WHERE status='attention') total").first();
 const periodRefund=await q(env,"SELECT COALESCE(SUM(amount),0) amount FROM admin_refund_transactions WHERE mode='live' AND status='succeeded' AND provider_created>=?",Math.floor(from.getTime()/1000)).first();
 const refundUnreconciled=await q(env,"SELECT COUNT(*) total FROM admin_order_ledger o WHERE o.payment_mode='live' AND o.refunded_amount>COALESCE((SELECT SUM(t.amount) FROM admin_refund_transactions t WHERE t.order_id=o.id AND t.status='succeeded'),0)").first();
 return {days,since,timezone:'UTC',...sales,...refunds,period_refund_amount:periodRefund.amount,refund_unreconciled:refundUnreconciled.total,paid_total:lifetime.paid_total,net_total:lifetime.paid_total-refunds.refunded_total,registered:users.registered,unread:unread.unread,pending_refunds:requests.pending,delivery_exceptions:exceptions.delivery,mail_attention:attention.total,modes};
}
export async function orderDetail(env,id) {
 const order=await q(env,'SELECT * FROM admin_order_ledger WHERE id=?',id).first();
 if(!order)throw new ApiError(404,'ORDER_NOT_FOUND','未找到订单。');
 const events=await rows(env,"SELECT event,created_at,json_extract(details_json,'$.succeededAmount') succeeded_amount,json_extract(details_json,'$.refundFailed') refund_failed,json_extract(details_json,'$.full') full_refund FROM order_evidence WHERE order_id=? ORDER BY created_at DESC,id DESC LIMIT 100",id);
 const files=await rows(env,"SELECT av.version_number,av.status,av.created_at FROM artifact_versions av JOIN custom_activities ac ON ac.id=av.custom_activity_id WHERE ac.order_id=? ORDER BY av.version_number DESC LIMIT 30",id);
 const failures=await rows(env,"SELECT phase,error_code,attempt,created_at,completed_at FROM generation_usage WHERE order_id=? AND status='failed' ORDER BY attempt DESC LIMIT 15",id);
 const messages=await rows(env,`SELECT source_kind,id,type,message,email,created_at,review_status FROM (${inboxSql}) WHERE order_id=? ORDER BY created_at DESC LIMIT 25`,id);
 const payment=await q(env,'SELECT mode,refund_state,succeeded_refund_amount,provider_payment_status,checked_at FROM admin_payment_state WHERE order_id=?',id).first();
 return {order:safeOrder(order),events,files,failures,messages,payment};
}
export async function refundList(env,params) {
 const clauses=[],args=[],mode=params.get('mode')||'live',decision=params.get('decision'),query=searchValue(params);
 if(['live','test','unknown'].includes(mode)){clauses.push('o.payment_mode=?');args.push(mode);}
 if(['pending','approved','rejected'].includes(decision)){clauses.push("COALESCE(r.decision,'pending')=?");args.push(decision);}
 if(query){clauses.push("(s.order_id LIKE ? ESCAPE '\\' OR o.customer_email LIKE ? ESCAPE '\\')");args.push(like(query),like(query));}
 const requests=await pageRows(env,`SELECT s.id,s.order_id,s.description,s.created_at,s.status,o.customer_email,o.amount_total,o.payment_mode,o.refunded_amount,o.refund_state,o.status order_status,COALESCE(r.decision,'pending') decision,COALESCE(r.internal_note,'') internal_note,COALESCE(r.revision,0) revision FROM support_cases s JOIN admin_order_ledger o ON o.id=s.order_id LEFT JOIN admin_refund_reviews r ON r.case_id=s.id WHERE s.issue_type='refund'${clauses.length?' AND '+clauses.join(' AND '):''} ORDER BY s.created_at DESC,s.id`,args,params);
 const confirmed=await rows(env,`SELECT id,customer_email,amount_total,refunded_amount,payment_mode,refund_state,payment_checked_at FROM admin_order_ledger WHERE refunded_amount>0 ${['live','test','unknown'].includes(mode)?'AND payment_mode=?':''} ORDER BY COALESCE(payment_checked_at,paid_at) DESC LIMIT 50`,...(['live','test','unknown'].includes(mode)?[mode]:[]));
 return {...requests,confirmed};
}
export async function exceptionList(env) {
 const orders=await rows(env,"SELECT * FROM admin_order_ledger WHERE paid_at IS NOT NULL AND status!='refunded' AND (status='failed' OR plan_status='needs_help') ORDER BY created_at DESC LIMIT 100");
 const covers=await rows(env,"SELECT id,title,payment_mode,cover_status,status FROM admin_order_ledger WHERE cover_status='failed' AND status!='refunded' ORDER BY created_at DESC LIMIT 50");
 const waiting=await q(env,"SELECT COUNT(*) total FROM admin_order_ledger WHERE plan_status='review' AND status!='refunded'").first();
 const notifications=await rows(env,`SELECT 'feedback' source_kind,id,notification_status status,notification_attempts attempts FROM site_feedback WHERE notification_status='attention' UNION ALL SELECT 'support',case_id,status,attempts FROM support_case_notifications WHERE status='attention' UNION ALL SELECT source_kind,source_id,status,attempts FROM admin_replies WHERE status='attention' LIMIT 100`);
 const paymentSync=await rows(env,"SELECT id,title,payment_mode,provider_payment_status,paid_at,refunded_amount,amount_total,status FROM admin_order_ledger WHERE (provider_payment_status='paid' AND paid_at IS NULL) OR (refunded_amount>=amount_total AND amount_total>0 AND status!='refunded') ORDER BY created_at DESC LIMIT 100");
 return {orders:orders.map(safeOrder),covers,waiting_plan_approval:waiting.total,notifications,payment_sync:paymentSync};
}
export function paymentModeStatement(env,id,mode,status='unknown') {
 const checked=['paid','unpaid','no_payment_required'].includes(status)?status:'unknown';
 return q(env,`INSERT INTO admin_payment_state(order_id,mode,provider_payment_status) VALUES(?,?,?) ON CONFLICT(order_id) DO UPDATE SET mode=CASE WHEN excluded.mode='unknown' THEN admin_payment_state.mode ELSE excluded.mode END,provider_payment_status=CASE WHEN excluded.provider_payment_status='unknown' THEN admin_payment_state.provider_payment_status ELSE excluded.provider_payment_status END`,id,mode,checked);
}
export function refundSnapshotStatement(env,id,mode,amount,state,eventTime=0) {
 return q(env,`INSERT INTO admin_payment_state(order_id,mode,succeeded_refund_amount,refund_state,provider_event_created) VALUES(?,?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET mode=excluded.mode,succeeded_refund_amount=excluded.succeeded_refund_amount,refund_state=excluded.refund_state,provider_event_created=excluded.provider_event_created,checked_at=CURRENT_TIMESTAMP WHERE excluded.provider_event_created>=admin_payment_state.provider_event_created`,id,mode,amount,state,eventTime);
}
export function refundTransactionStatements(env,id,mode,list) {
 if(!['live','test'].includes(mode)||!Array.isArray(list?.data)||list.has_more!==false)return [];
 return list.data.map(r=>q(env,`INSERT INTO admin_refund_transactions(refund_id,order_id,amount,status,mode,provider_created) VALUES(?,?,?,?,?,?) ON CONFLICT(refund_id) DO UPDATE SET status=excluded.status,checked_at=CURRENT_TIMESTAMP WHERE admin_refund_transactions.order_id=excluded.order_id AND admin_refund_transactions.amount=excluded.amount AND admin_refund_transactions.mode=excluded.mode`,r.id,id,r.amount,r.status,mode,Number.isInteger(r.created)?r.created:null));
}
