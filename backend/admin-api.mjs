import {ApiError} from './domain.mjs';
import {requireAdmin} from './admin-identity.mjs';
import {normalizeEmail,sha256} from './security.mjs';
import {stripeRequest} from './payments.mjs';
import {succeededRefundAmount} from './refund-status.mjs';
import {recordPurchaseEmail} from './admin-identity.mjs';
import {dispatchAdminReply} from './admin-mail.mjs';
import {q,rows,audit,templates,pageRows,searchValue,like,orderFilter,safeOrder,inboxSql,messageDetail,userList,summary,orderDetail,refundList,exceptionList,paymentModeStatement,refundSnapshotStatement,refundTransactionStatements} from './admin-data.mjs';
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'private, no-store','x-robots-tag':'noindex','referrer-policy':'no-referrer'}});
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max+1):'';
const mismatch=()=>new ApiError(409,'ADMIN_STALE','内容已更新，请刷新后重试。');
async function bodyOf(request) {
 const raw=await request.text();if(new TextEncoder().encode(raw).length>16384)throw new ApiError(413,'ADMIN_BODY_TOO_LARGE','内容过长。');
 try {const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw new ApiError(400,'ADMIN_INVALID_JSON','请求格式不正确。');}
}
function checkRevision(body) {if(!Number.isInteger(body.revision)||body.revision<0)throw new ApiError(400,'ADMIN_REVISION_REQUIRED','请刷新后重试。');}

async function saveReview(env,actor,kind,id,body) {
 const source=await messageDetail(env,kind,id);checkRevision(body);
 if(source.revision!==body.revision)throw mismatch();
 if(!['unread','in_progress','resolved'].includes(body.status)||typeof body.archived!=='boolean'||typeof body.internalNote!=='string'||body.internalNote.length>2000)throw new ApiError(400,'ADMIN_INVALID_REVIEW','检查状态和备注，备注最多 2,000 字。');
 const changes=await env.DB.batch([
  q(env,`INSERT INTO admin_message_reviews(source_kind,source_id,status,archived_at,internal_note) VALUES(?,?,?,CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END,?) ON CONFLICT(source_kind,source_id) DO UPDATE SET status=excluded.status,archived_at=excluded.archived_at,internal_note=excluded.internal_note,revision=admin_message_reviews.revision+1,updated_at=CURRENT_TIMESTAMP WHERE admin_message_reviews.revision=?`,kind,id,body.status,body.archived?1:0,body.internalNote.trim(),body.revision),
  q(env,"INSERT INTO admin_action_log(actor_hash,action,target_kind,target_id,details_json) SELECT ?,'message_reviewed',?,?,? WHERE changes()=1",actor.emailHash,kind,id,JSON.stringify({status:body.status,archived:body.archived,noteChanged:body.internalNote.trim()!==source.internal_note})),
  ...(kind==='support'?[q(env,'UPDATE support_cases SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND changes()=1',({unread:'open',in_progress:'reviewing',resolved:'resolved'})[body.status],id)]:[]),
 ]);
 if(!changes[0]?.meta?.changes)throw mismatch();
 return messageDetail(env,kind,id);
}

async function queueReply(env,actor,kind,id,body,context) {
 const source=await messageDetail(env,kind,id),recipient=normalizeEmail(source.email);
 if(!recipient)throw new ApiError(409,'ADMIN_REPLY_ADDRESS_MISSING','此留言没有可用回复邮箱。订单客服可先在订单详情核对购买联系方式。');
 if(body.confirmRecipient!==recipient)throw new ApiError(409,'ADMIN_RECIPIENT_CHANGED','收件人已变化，请重新核对后发送。');
 const subject=text(body.subject,160),message=text(body.body,5000),key=body.requestKey;
 if(!subject||subject.length>160||/[\r\n]/.test(subject)||!message||message.length>5000||typeof key!=='string'||!/^[a-f0-9-]{36}$/i.test(key))throw new ApiError(400,'ADMIN_INVALID_REPLY','请填写邮件主题和正文，正文最多 5,000 字。');
 const replyId=await sha256(`admin-reply|${actor.emailHash}|${kind}|${id}|${key}`),fingerprint=await sha256(JSON.stringify([recipient,subject,message]));
 const previous=await q(env,'SELECT payload_sha256,status FROM admin_replies WHERE id=?',replyId).first();
 if(previous){if(previous.payload_sha256!==fingerprint)throw mismatch();return {id:replyId,status:previous.status,replayed:true};}
 const count=await q(env,"SELECT COUNT(*) total FROM admin_replies WHERE source_kind=? AND source_id=? AND created_at>=datetime('now','-1 day')",kind,id).first();
 if(count.total>=20)throw new ApiError(429,'ADMIN_REPLY_LIMIT','该留言今天的回复较多，请稍后再试。');
 await env.DB.batch([
  q(env,'INSERT OR IGNORE INTO admin_replies(id,source_kind,source_id,recipient_email,subject,body,payload_sha256,created_by) VALUES(?,?,?,?,?,?,?,?)',replyId,kind,id,recipient,subject,message,fingerprint,actor.emailHash),
  q(env,"INSERT INTO admin_action_log(actor_hash,action,target_kind,target_id,details_json) SELECT ?,'reply_queued',?,?,? WHERE changes()=1",actor.emailHash,kind,id,JSON.stringify({replyId})),
 ]);
 const saved=await q(env,'SELECT payload_sha256 FROM admin_replies WHERE id=?',replyId).first();if(saved?.payload_sha256!==fingerprint)throw mismatch();
 const task=dispatchAdminReply(replyId,env).catch(()=>{});if(context.waitUntil)context.waitUntil(task);else await task;
 return {id:replyId,status:(await q(env,'SELECT status FROM admin_replies WHERE id=?',replyId).first()).status};
}

async function syncOrder(env,actor,id) {
 const order=await q(env,'SELECT * FROM orders WHERE id=?',id).first();if(!order)throw new ApiError(404,'ORDER_NOT_FOUND','未找到订单。');
 const ledger=await q(env,'SELECT payment_mode FROM admin_order_ledger WHERE id=?',id).first();
 // Existing live credentials must never be used to look up a known test transaction.
 if(ledger.payment_mode==='test')throw new ApiError(409,'ADMIN_TEST_SYNC_DISABLED','测试订单保留独立记录；当前后台不会用正式凭据读取测试支付。');
 if(!/^cs_[A-Za-z0-9_]+$/.test(order.stripe_checkout_session_id||'')||!env.STRIPE_SECRET_KEY)throw new ApiError(409,'ADMIN_PAYMENT_LOOKUP_UNAVAILABLE','该历史订单缺少可核对的支付会话。');
 let session;
 try{session=await stripeRequest(env,'checkout/sessions/'+encodeURIComponent(order.stripe_checkout_session_id),{signal:AbortSignal.timeout(15000)},env.FETCH||fetch);}catch{throw new ApiError(503,'ADMIN_STRIPE_READ_UNAVAILABLE','Stripe 只读核对暂不可用，请检查连接或现有密钥的读取权限。未改动付款。');}
 const intent=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id;
 if(session.id!==order.stripe_checkout_session_id||session.client_reference_id!==order.id||session.currency?.toLowerCase()!=='usd'||session.amount_total!==order.amount_total||typeof session.livemode!=='boolean'||order.stripe_payment_intent_id&&intent!==order.stripe_payment_intent_id)throw new ApiError(409,'ADMIN_PAYMENT_BINDING_MISMATCH','支付资料与订单不匹配，未同步。');
 const mode=session.livemode?'live':'test';
 const email=session.customer_details?.email||session.customer_email;
 const statements=[paymentModeStatement(env,id,mode,session.payment_status),audit(env,actor,'payment_contact_checked','order',id,{mode})];
 await env.DB.batch(statements);
 const contactSynced=await recordPurchaseEmail(env,order,email,'stripe');
 let refundSynced=false;
 if(intent&&order.paid_at&&mode==='live') {
  try {
   const list=await stripeRequest(env,'refunds?payment_intent='+encodeURIComponent(intent)+'&limit=100',{signal:AbortSignal.timeout(15000)},env.FETCH||fetch);
   const amount=succeededRefundAmount(list,{id:list.data?.[0]?.charge,payment_intent:intent,currency:order.currency.toLowerCase(),amount:order.amount_total});
   const state=amount===order.amount_total?'full':list.data.some(r=>['pending','requires_action'].includes(r.status))?'pending':amount>0?'partial':list.data.some(r=>r.status==='failed')?'failed':'none';
   // A read-only reconciliation never changes paid status, rights or generates files.
   await env.DB.batch([refundSnapshotStatement(env,id,mode,amount,state,Math.floor(Date.now()/1000)),...refundTransactionStatements(env,id,mode,list),audit(env,actor,'refund_snapshot_checked','order',id,{state})]);
   refundSynced=true;
  } catch {/* Keep the earlier trusted refund evidence if refunds are unavailable. */}
 }
 return {contactSynced,refundSynced,notice:refundSynced?'付款联系方式及退款记录已核对。':'已核对支付会话；退款明细暂未同步，保留原记录。'};
}

async function saveRefundReview(env,actor,id,body) {
 const source=await q(env,"SELECT id FROM support_cases WHERE id=? AND issue_type='refund'",id).first();if(!source)throw new ApiError(404,'REFUND_CASE_NOT_FOUND','未找到退款申请。');
 checkRevision(body);if(!['pending','approved','rejected'].includes(body.decision)||typeof body.internalNote!=='string'||body.internalNote.length>2000)throw new ApiError(400,'ADMIN_INVALID_REVIEW','检查审核意见和备注。');
 const existing=await q(env,'SELECT revision FROM admin_refund_reviews WHERE case_id=?',id).first();if((existing?.revision||0)!==body.revision)throw mismatch();
 const results=await env.DB.batch([
  q(env,`INSERT INTO admin_refund_reviews(case_id,decision,internal_note) VALUES(?,?,?) ON CONFLICT(case_id) DO UPDATE SET decision=excluded.decision,internal_note=excluded.internal_note,revision=admin_refund_reviews.revision+1,updated_at=CURRENT_TIMESTAMP WHERE admin_refund_reviews.revision=?`,id,body.decision,body.internalNote.trim(),body.revision),
  q(env,"INSERT INTO admin_action_log(actor_hash,action,target_kind,target_id,details_json) SELECT ?,'refund_reviewed','support',?,? WHERE changes()=1",actor.emailHash,id,JSON.stringify({decision:body.decision,executesRefund:false})),
 ]);
 if(!results[0]?.meta?.changes)throw mismatch();return {saved:true,executesRefund:false};
}

async function archiveOrder(env,actor,id,body,restore) {
 const order=await q(env,'SELECT id,paid_at,product_kind,status FROM orders WHERE id=?',id).first();if(!order)throw new ApiError(404,'ORDER_NOT_FOUND','未找到订单。');
 if(!restore&&order.paid_at&&!(order.product_kind==='custom'&&['paid','fulfilling','failed'].includes(order.status)))throw new ApiError(409,'ADMIN_ARCHIVE_INELIGIBLE','仅支持将未付款或未完成的定制订单移出客户日常列表。');
 const reason=!order.paid_at?'unpaid_checkout':'unfinished';
 await env.DB.batch([
  restore?q(env,'DELETE FROM library_order_archives WHERE order_id=?',id):q(env,'INSERT OR IGNORE INTO library_order_archives(order_id,reason,cleanup_ref) VALUES(?,?,?)',id,reason,'admin-console'),
  audit(env,actor,restore?'order_library_restored':'order_library_archived','order',id),
 ]);
 return {saved:true};
}

async function settings(env,actor,body) {
 if(!body){const saved=await q(env,"SELECT value_json,revision FROM admin_settings WHERE key='reply_templates'").first();return {administrator:actor.email,supportEmail:env.OPERATIONS_EMAIL||'support@paperadventure.app',templates:saved?JSON.parse(saved.value_json):templates,revision:saved?.revision||0,replyMailboxSync:false};}
 checkRevision(body);
 if(!Array.isArray(body.templates)||!body.templates.length||body.templates.length>10)throw new ApiError(400,'ADMIN_INVALID_TEMPLATES','需要 1 至 10 个模板。');
 const ids=new Set(),values=body.templates.map(t=>{
  if(!t||typeof t!=='object'||typeof t.id!=='string'||!/^[a-z0-9_-]{1,30}$/.test(t.id)||ids.has(t.id)||typeof t.label!=='string'||!t.label.trim()||t.label.length>60||typeof t.subject!=='string'||!t.subject.trim()||t.subject.length>160||/[\r\n]/.test(t.subject)||typeof t.body!=='string'||!t.body.trim()||t.body.length>5000)throw new ApiError(400,'ADMIN_INVALID_TEMPLATES','请检查模板名称、主题和正文。');ids.add(t.id);return {id:t.id,label:t.label,subject:t.subject,body:t.body};
 });
 const current=await q(env,"SELECT revision FROM admin_settings WHERE key='reply_templates'").first();if((current?.revision||0)!==body.revision)throw mismatch();
 const result=await env.DB.batch([
  q(env,"INSERT INTO admin_settings(key,value_json) VALUES('reply_templates',?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,revision=admin_settings.revision+1,updated_at=CURRENT_TIMESTAMP WHERE admin_settings.revision=?",JSON.stringify(values),body.revision),
  q(env,"INSERT INTO admin_action_log(actor_hash,action,target_kind,target_id,details_json) SELECT ?,'reply_templates_updated','settings','reply_templates',? WHERE changes()=1",actor.emailHash,JSON.stringify({count:values.length})),
 ]);if(!result[0]?.meta?.changes)throw mismatch();return {saved:true};
}

export async function handleAdminApi(request,env,context={}) {
 try {
  const actor=await requireAdmin(request,env),url=new URL(request.url),path=url.pathname.replace(/\/$/,''),params=url.searchParams;
  const write=['POST','PUT','DELETE','PATCH'].includes(request.method);
  if(write&&request.headers.get('origin')!==new URL(env.PUBLIC_ORIGIN||request.url).origin)throw new ApiError(403,'ADMIN_ORIGIN_DENIED','请求来源不正确。');
  if(write&&Number(request.headers.get('content-length')||0)>16384)throw new ApiError(413,'ADMIN_BODY_TOO_LARGE','请求过长。');
  if(path==='/api/v1/admin/session'&&request.method==='GET')return json({authorized:true,email:actor.email});
  if(path==='/api/v1/admin/summary'&&request.method==='GET')return json(await summary(env,params));
  if(path==='/api/v1/admin/messages'&&request.method==='GET') {
   const where=[],args=[],kind=params.get('kind'),status=params.get('status'),type=params.get('type'),query=searchValue(params);
   if(['feedback','support'].includes(kind)){where.push('source_kind=?');args.push(kind);}
   if(['unread','in_progress','resolved'].includes(status)){where.push('review_status=?');args.push(status);}
   if(type){where.push('type=?');args.push(type.slice(0,30));}
   if(params.get('archive')!=='all')where.push(params.get('archive')==='yes'?'archived_at IS NOT NULL':'archived_at IS NULL');
   if(query){where.push("(message LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR id LIKE ? ESCAPE '\\' OR order_id LIKE ? ESCAPE '\\')");args.push(...Array(4).fill(like(query)));}
   return json(await pageRows(env,`SELECT * FROM (${inboxSql})${where.length?' WHERE '+where.join(' AND '):''} ORDER BY created_at DESC,id`,args,params));
  }
  const message=path.match(/^\/api\/v1\/admin\/messages\/(feedback|support)\/([A-Za-z0-9-]+)(?:\/(review|replies))?$/);
  if(message){const [,kind,id,action]=message;
   if(!action&&request.method==='GET')return json(await messageDetail(env,kind,id));
   if(action==='review'&&request.method==='POST')return json(await saveReview(env,actor,kind,id,await bodyOf(request)));
   if(action==='replies'&&request.method==='POST')return json(await queueReply(env,actor,kind,id,await bodyOf(request),context));
  }
  if(path==='/api/v1/admin/users'&&request.method==='GET')return json(await userList(env,params));
  const user=path.match(/^\/api\/v1\/admin\/users\/([a-f0-9]{64})$/);
  if(user&&request.method==='GET') {
   const profile=await q(env,'SELECT email_hash,email,source,first_seen_at,first_login_at,last_login_at FROM account_profiles WHERE email_hash=?',user[1]).first();
   const orders=await rows(env,'SELECT * FROM admin_order_ledger WHERE purchaser_email_hash=? ORDER BY created_at DESC LIMIT 200',user[1]);
   if(!profile&&!orders.length)throw new ApiError(404,'USER_NOT_FOUND','未找到用户。');
   const cases=await rows(env,"SELECT s.id,s.issue_type,s.description,s.status,s.created_at,s.order_id FROM support_cases s WHERE s.email_hash=? ORDER BY s.created_at DESC LIMIT 50",user[1]);
   return json({profile:profile||{email_hash:user[1],email:null,first_login_at:null,last_login_at:null},orders:orders.map(safeOrder),cases});
  }
  if(path==='/api/v1/admin/orders'&&request.method==='GET'){const f=orderFilter(params);return json(await pageRows(env,`SELECT * FROM admin_order_ledger${f.where} ORDER BY created_at DESC,id`,f.args,params).then(v=>({...v,items:v.items.map(safeOrder)})));}
  const order=path.match(/^\/api\/v1\/admin\/orders\/([A-Za-z0-9-]+)(?:\/(sync|library-archive))?$/);
  if(order){const [,id,action]=order;
   if(!action&&request.method==='GET')return json(await orderDetail(env,id));
   if(action==='sync'&&request.method==='POST')return json(await syncOrder(env,actor,id));
   if(action==='library-archive'&&['POST','DELETE'].includes(request.method))return json(await archiveOrder(env,actor,id,null,request.method==='DELETE'));
  }
  if(path==='/api/v1/admin/refunds'&&request.method==='GET')return json(await refundList(env,params));
  const refund=path.match(/^\/api\/v1\/admin\/refunds\/([A-Za-z0-9-]+)\/review$/);
  if(refund&&request.method==='POST')return json(await saveRefundReview(env,actor,refund[1],await bodyOf(request)));
  if(path==='/api/v1/admin/exceptions'&&request.method==='GET')return json(await exceptionList(env));
  if(path==='/api/v1/admin/settings'&&['GET','PUT'].includes(request.method))return json(await settings(env,actor,request.method==='PUT'?await bodyOf(request):null));
  if(path==='/api/v1/admin/audit'&&request.method==='GET')return json(await pageRows(env,"SELECT a.id,a.action,a.target_kind,a.target_id,a.details_json,a.created_at,COALESCE(p.email,'已授权管理员') actor_email FROM admin_action_log a LEFT JOIN account_profiles p ON p.email_hash=a.actor_hash ORDER BY a.id DESC",[],params));
  throw new ApiError(404,'ADMIN_NOT_FOUND','未找到管理功能。');
 }catch(error){if(error instanceof ApiError)return json({error:{code:error.code,message:error.message}},error.status);return json({error:{code:'ADMIN_READ_FAILED',message:'后台服务暂不可用，请刷新重试。'}},503);}
}
