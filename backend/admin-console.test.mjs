import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handleProductionApi} from './production-worker.mjs';
import {sha256,signAccessToken} from './security.mjs';
import {recordGoogleProfile,recordPurchaseEmail} from './admin-identity.mjs';
import {dispatchAdminReply,resumeAdminReplies} from './admin-mail.mjs';

async function fixture(){
 const db=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('./migrations/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(new URL('./migrations/'+file,import.meta.url),'utf8'));
 const DB={prepare:sql=>({bind:(...args)=>({first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})})}),batch:async statements=>{db.exec('BEGIN');try{const values=[];for(const s of statements)values.push(await s.run());db.exec('COMMIT');return values;}catch(e){db.exec('ROLLBACK');throw e;}}};
 const sent=[],owner='veryhappygou'+'@gmail.com',env={DB,SESSION_SECRET:'admin-fixture-secret',PUBLIC_ORIGIN:'https://example.test',EMAIL_FROM:'support@paperadventure.app',EMAIL_PUBLIC_DESTINATIONS_READY:'true',EMAIL:{send:async m=>{sent.push(m);return {messageId:'fixture'};}},STRIPE_SECRET_KEY:'rk_live_fixture',FETCH:async()=>{throw Error('No provider request expected');}};
 const ownerHash=await sha256(`${env.SESSION_SECRET}|${owner}`),buyer='buyer@example.test',buyerHash=await sha256(`${env.SESSION_SECRET}|${buyer}`);
 const token=async(email=owner,extra={provider:'google',googleSubjectHash:'a'.repeat(64)})=>signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:await sha256(`${env.SESSION_SECRET}|${email}`),email,exp:Math.floor(Date.now()/1000)+3600,...extra});
 const auth=await token();
 const call=(path,method='GET',body,headers={})=>handleProductionApi(new Request(env.PUBLIC_ORIGIN+'/api/v1/admin'+path,{method,headers:{cookie:`paw_session=${auth}`,origin:env.PUBLIC_ORIGIN,...(body?{'content-type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})}),env);
 db.exec("INSERT INTO price_versions(id,sku,currency,unit_amount,tax_behavior) VALUES('admin-price','custom_home','USD',1499,'unknown')");
 const insert=db.prepare("INSERT INTO orders(id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at,stripe_checkout_session_id,stripe_payment_intent_id) VALUES(?,'custom','custom_home',?,'hash',?,'admin-price',1499,'USD',?,?,?,?)");
 for(const [id,mode,status] of [['live-paid','live','published'],['live-failed','live','failed'],['test-paid','test','published'],['unknown-paid',null,'published']])insert.run(id,JSON.stringify({customIdea:'Order '+id,...(mode?{paymentMode:mode}:{})}),buyerHash,status,new Date().toISOString().slice(0,19).replace('T',' '),mode?`cs_${mode}_`+id.replaceAll('-',''):null,mode?'pi_'+id.replaceAll('-',''):null);
 db.prepare('INSERT INTO account_profiles(email_hash,email,first_login_at,last_login_at,source) VALUES(?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?)').run(buyerHash,buyer,'google');
 db.exec("INSERT INTO site_feedback(id,payload_sha256,type,message,reply_email,page_path,browser_category,device_category) VALUES('feedback-one','hash','suggestion','Please improve the print controls.','visitor@example.test','/en/','Chrome','desktop'),('anonymous','hash','other','Anonymous idea',NULL,'/en/','Other','mobile');INSERT INTO support_cases(id,order_id,email_hash,issue_type,description,status) SELECT 'refund-case','live-paid',purchaser_email_hash,'refund','Please review the missing file.','open' FROM orders WHERE id='live-paid';INSERT INTO library_order_archives(order_id,reason) VALUES('live-failed','unfinished')");
 return {db,env,sent,call,token,ownerHash,buyerHash,buyer,owner};
}

test('all admin data requires the designated verified Google session; legacy and email-link sessions are denied',async()=>{
 const f=await fixture();
 for(const cookie of ['',`paw_session=${await f.token('ordinary@example.test')}`,`paw_session=${await f.token(f.owner,{})}`,`paw_session=${await f.token(f.owner,{provider:'email-link'})}`,'paw_session=tampered']){
  for(const path of ['/session','/summary','/messages','/users','/orders','/refunds','/exceptions','/settings','/audit']){
   const response=await f.call(path,'GET',undefined,{cookie});assert.equal(response.status,403,path);assert.equal((await response.text()).includes('buyer@example.test'),false);
  }
 }
 const response=await f.call('/session');assert.equal(response.status,200);assert.equal((await response.json()).email,f.owner);assert.match(response.headers.get('cache-control'),/no-store/);
});

test('overview and user ledger keep live, test and unknown payment modes apart and do not hide archived orders',async()=>{
 const f=await fixture(),body=await (await f.call('/summary?days=30')).json();
 assert.equal(body.paid_orders,2);assert.equal(body.paid_total,2998);assert.equal(body.net_total,2998);assert.equal(body.modes.find(x=>x.payment_mode==='test').total,1);
 const live=await (await f.call('/orders')).json();assert.equal(live.total,2);assert.ok(live.items.find(o=>o.id==='live-failed').archived_at);
 assert.equal(live.items[0].stripe_checkout_session_id,undefined);
 assert.equal((await (await f.call('/orders?mode=all')).json()).total,4);
 const users=await (await f.call('/users?q=buyer@example.test')).json();assert.equal(users.items[0].paid_amount,2998);
 const detail=await (await f.call('/users/'+f.buyerHash)).json();assert.equal(detail.orders.length,4);assert.equal(detail.profile.email,f.buyer);
});

test('first login and purchase-only records are honest, minimal and do not mark purchasers as registered',async()=>{
 const f=await fixture();await recordPurchaseEmail(f.env,{purchaser_email_hash:await sha256(`${f.env.SESSION_SECRET}|new@example.test`)},'new@example.test');
 let row=f.db.prepare("SELECT * FROM account_profiles WHERE email='new@example.test'").get();assert.equal(row.first_login_at,null);assert.equal(row.last_login_at,null);
 await recordGoogleProfile(f.env,{email:'new@example.test',subject:'1234567890123'});row=f.db.prepare("SELECT * FROM account_profiles WHERE email='new@example.test'").get();assert.ok(row.first_login_at);assert.ok(row.last_login_at);assert.equal(row.google_subject_hash.includes('1234567890123'),false);
 const first=row.first_login_at;await recordGoogleProfile(f.env,{email:'new@example.test',subject:'1234567890123'});assert.equal(f.db.prepare("SELECT first_login_at FROM account_profiles WHERE email='new@example.test'").get().first_login_at,first);
 assert.equal(await recordPurchaseEmail(f.env,{purchaser_email_hash:'different'},'bad@example.test'),false);
 await recordGoogleProfile(f.env,{email:f.owner,subject:'9876543210987'});assert.equal(f.db.prepare('SELECT is_operator FROM account_profiles WHERE email=?').get(f.owner).is_operator,1);
});

test('case review and internal notes are CSRF-protected, revision guarded and never send mail',async()=>{
 const f=await fixture(),body={status:'in_progress',archived:false,internalNote:'Private operator note',revision:0};
 assert.equal((await f.call('/messages/feedback/feedback-one/review','POST',body,{origin:'https://evil.test'})).status,403);
 assert.equal((await f.call('/messages/feedback/feedback-one/review','POST',body)).status,200);
 assert.equal((await f.call('/messages/feedback/feedback-one/review','POST',body)).status,409);
 const detail=await (await f.call('/messages/feedback/feedback-one')).json();assert.equal(detail.internal_note,'Private operator note');assert.equal(detail.review_status,'in_progress');assert.equal(detail.revision,1);assert.equal(f.sent.length,0);
 const log=f.db.prepare('SELECT * FROM admin_action_log').get();assert.equal(log.details_json.includes('Private operator note'),false);
});

test('explicit replies are source-bound, idempotent and save history before sending; anonymous feedback cannot receive mail',async()=>{
 const f=await fixture(),body={subject:'Thank you',body:'Thanks for your suggestion.',confirmRecipient:'visitor@example.test',requestKey:'11111111-1111-4111-8111-111111111111'};
 assert.equal((await f.call('/messages/feedback/feedback-one/replies','POST',{...body,confirmRecipient:'attacker@example.test'})).status,409);
 assert.equal((await f.call('/messages/feedback/anonymous/replies','POST',body)).status,409);
 const a=await f.call('/messages/feedback/feedback-one/replies','POST',body),b=await f.call('/messages/feedback/feedback-one/replies','POST',body);assert.equal(a.status,200);assert.equal((await a.json()).status,'sent');assert.equal(b.status,200);assert.equal(f.sent.length,1);assert.equal(f.sent[0].to,'visitor@example.test');assert.equal(f.sent[0].replyTo,'support@paperadventure.app');
 assert.equal((await f.call('/messages/feedback/feedback-one/replies','POST',{...body,body:'Changed'})).status,409);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM admin_replies').get().n,1);
 const detail=await (await f.call('/messages/feedback/feedback-one')).json();assert.equal(detail.replies[0].body,body.body);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM orders').get().n,4);
});

test('failed reply is retained and retries once under a lease without creating another message',async()=>{
 const f=await fixture();f.env.EMAIL.send=async()=>{throw Error('private provider failure');};
 const result=await f.call('/messages/feedback/feedback-one/replies','POST',{subject:'Reply',body:'Your suggestion is recorded.',confirmRecipient:'visitor@example.test',requestKey:'22222222-2222-4222-8222-222222222222'});assert.equal((await result.json()).status,'queued');
 const row=f.db.prepare('SELECT * FROM admin_replies').get();assert.equal(row.attempts,1);assert.equal(row.error_code,'ADMIN_REPLY_FAILED');await resumeAdminReplies(f.env);assert.equal(f.db.prepare('SELECT attempts FROM admin_replies').get().attempts,1);
 f.db.exec('UPDATE admin_replies SET next_attempt_at=0');f.env.EMAIL.send=async m=>{f.sent.push(m);return {};};await Promise.all([dispatchAdminReply(row.id,f.env),dispatchAdminReply(row.id,f.env)]);assert.equal(f.sent.length,1);assert.equal(f.db.prepare('SELECT status FROM admin_replies').get().status,'sent');
});

test('refund review and archive restoration preserve every payment and never execute a provider operation',async()=>{
 const f=await fixture(),before=f.db.prepare('SELECT * FROM orders ORDER BY id').all();
 assert.equal((await f.call('/refunds/refund-case/review','POST',{decision:'approved',internalNote:'Review only',revision:0})).status,200);
 assert.equal((await (await f.call('/refunds')).json()).items[0].decision,'approved');
 assert.equal((await f.call('/orders/live-failed/library-archive','DELETE')).status,200);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM library_order_archives').get().n,0);
 assert.equal((await f.call('/orders/live-failed/library-archive','POST')).status,200);
 assert.equal((await f.call('/orders/live-paid/library-archive','POST')).status,409);
 assert.deepEqual(f.db.prepare('SELECT * FROM orders ORDER BY id').all(),before);assert.equal(f.sent.length,0);
});

test('reconciliation uses only bound Stripe GETs and does not change payment, fulfilment or access',async()=>{
 const f=await fixture(),before=f.db.prepare("SELECT * FROM orders WHERE id='live-paid'").get();let calls=0;
 f.env.FETCH=async(url,init)=>{calls++;assert.equal(init?.method||'GET','GET');
  if(url.includes('/checkout/sessions/'))return Response.json({id:before.stripe_checkout_session_id,client_reference_id:before.id,currency:'usd',amount_total:1499,livemode:true,payment_intent:before.stripe_payment_intent_id,customer_details:{email:f.buyer}});
  assert.match(url,/\/refunds\?/);return Response.json({has_more:false,data:[{id:'re_fixture',amount:300,currency:'usd',status:'succeeded',payment_intent:before.stripe_payment_intent_id,charge:'ch_fixture',created:1792890000}]});
 };
 const result=await f.call('/orders/live-paid/sync','POST');assert.equal(result.status,200);assert.equal((await result.json()).refundSynced,true);assert.equal(calls,2);
 const ledger=f.db.prepare("SELECT * FROM admin_order_ledger WHERE id='live-paid'").get();assert.equal(ledger.refunded_amount,300);assert.equal(ledger.refund_state,'partial');assert.deepEqual(f.db.prepare("SELECT * FROM orders WHERE id='live-paid'").get(),before);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM admin_refund_transactions').get().n,1);
 const journal=await (await f.call('/refunds')).json();assert.equal(journal.transactions[0].status,'succeeded');assert.equal(journal.transactions[0].amount,300);
 assert.equal((await f.call('/orders/test-paid/sync','POST')).status,409);
});

test('templates are editable with optimistic concurrency and audit records omit message bodies',async()=>{
 const f=await fixture(),settings=await (await f.call('/settings')).json();assert.equal(settings.templates.length,4);
 const body={revision:0,templates:[{id:'hello',label:'问候',subject:'Hello',body:'A private reply template'}]};
 assert.equal((await f.call('/settings','PUT',body)).status,200);assert.equal((await f.call('/settings','PUT',body)).status,409);
 const log=await (await f.call('/audit')).json();assert.equal(JSON.stringify(log).includes('A private reply template'),false);
 assert.equal((await (await f.call('/settings')).json()).templates[0].label,'问候');
});

test('reply reservation and audit are atomic, so a failed audit never sends or saves a half-record',async()=>{
 const f=await fixture();f.db.exec("CREATE TRIGGER reject_admin_audit BEFORE INSERT ON admin_action_log BEGIN SELECT RAISE(ABORT,'private audit details');END;");
 const response=await f.call('/messages/feedback/feedback-one/replies','POST',{subject:'Reply',body:'Saved only atomically.',confirmRecipient:'visitor@example.test',requestKey:'33333333-3333-4333-8333-333333333333'});
 assert.equal(response.status,503);assert.equal((await response.text()).includes('private audit details'),false);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM admin_replies').get().n,0);assert.equal(f.sent.length,0);
});

test('support review and public case state roll back together when updating the case fails',async()=>{
 const f=await fixture();f.db.exec("CREATE TRIGGER reject_case_review BEFORE UPDATE ON support_cases BEGIN SELECT RAISE(ABORT,'fixture review failure');END;");
 const response=await f.call('/messages/support/refund-case/review','POST',{status:'resolved',archived:false,internalNote:'Internal only',revision:0});
 assert.equal(response.status,503);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM admin_message_reviews').get().n,0);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM admin_action_log WHERE action='message_reviewed'").get().n,0);assert.equal(f.db.prepare('SELECT status FROM support_cases').get().status,'open');
});


test('historical cleanup removes only confirmed old test exceptions and linked alerts; restore is authorized, atomic and replay-safe',async()=>{
 const f=await fixture();
 f.db.exec("DELETE FROM admin_action_log WHERE target_id='historical-tests-20261025'; UPDATE orders SET status='failed',created_at='2026-10-24 10:00:00' WHERE id IN ('test-paid','live-failed','unknown-paid'); INSERT INTO custom_plan_orders(order_id,status) VALUES('test-paid','review'); INSERT INTO order_theme_covers(order_id,status,expires_at) VALUES('test-paid','failed',9999999999); INSERT INTO admin_payment_state(order_id,mode,refund_state) VALUES('test-paid','test','failed'); INSERT INTO support_cases(id,order_id,email_hash,issue_type,description,status) SELECT 'test-case','test-paid',purchaser_email_hash,'delivery','Fixture problem','open' FROM orders WHERE id='test-paid'; INSERT INTO support_case_notifications(case_id,status,attempts) VALUES('test-case','attention',8),('refund-case','attention',8); UPDATE site_feedback SET notification_status='attention' WHERE id='feedback-one'; INSERT INTO admin_replies(id,source_kind,source_id,recipient_email,subject,body,payload_sha256,created_by,status,attempts) VALUES('test-reply','support','test-case','fake@example.test','Fixture','Fixture','hash','fixture','attention',8)");
 // A test created after the explicit cutoff must remain visible.
 f.db.exec("INSERT INTO orders(id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at,created_at) SELECT 'future-test',product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,'failed',paid_at,'2026-10-26 00:00:00' FROM orders WHERE id='test-paid'");
 const before=f.db.prepare('SELECT * FROM orders ORDER BY id').all();
 const filesBefore=f.db.prepare('SELECT * FROM order_theme_covers').all();
 const migrate=()=>f.db.exec(readFileSync(new URL('./migrations/0045_admin_exception_archives.sql',import.meta.url),'utf8'));
 migrate();migrate();
 let list=await (await f.call('/exceptions')).json();
 assert.equal(list.archived_total,1);assert.equal(list.archived[0].id,'test-paid');assert.equal(list.waiting_plan_approval,0);assert.equal(list.covers.length,0);assert.equal(list.refund_failures.length,0);
 assert.deepEqual(list.orders.map(o=>o.id).sort(),['future-test','live-failed','unknown-paid']);
 assert.deepEqual(list.notifications.map(n=>n.id).sort(),['feedback-one','refund-case']);
 assert.equal((await (await f.call('/summary')).json()).mail_attention,2);
 assert.equal((await (await f.call('/orders?mode=test')).json()).total,2);
 const path='/exceptions/test-paid/restore';
 assert.equal((await f.call(path,'POST',undefined,{origin:'https://evil.test'})).status,403);
 assert.equal((await f.call(path,'POST',undefined,{cookie:''})).status,403);
 assert.equal((await f.call(path,'GET')).status,404);
 f.db.exec("CREATE TRIGGER fixture_restore_audit_failure BEFORE INSERT ON admin_action_log WHEN NEW.action='test_exception_restored' BEGIN SELECT RAISE(ABORT,'fixture'); END");
 assert.equal((await f.call(path,'POST')).status,503);assert.equal(f.db.prepare('SELECT restored_at FROM admin_exception_archives').get().restored_at,null);
 f.db.exec('DROP TRIGGER fixture_restore_audit_failure');
 assert.equal((await f.call(path,'POST')).status,200);assert.equal((await f.call(path,'POST')).status,200);migrate();
 list=await (await f.call('/exceptions')).json();assert.equal(list.archived_total,0);assert.equal(list.waiting_plan_approval,1);assert.equal(list.covers.length,1);assert.equal(list.refund_failures.length,1);assert.equal(list.notifications.length,4);assert.ok(list.orders.some(o=>o.id==='test-paid'));
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM admin_action_log WHERE action='test_exception_restored'").get().n,1);
 assert.deepEqual(f.db.prepare('SELECT * FROM orders ORDER BY id').all(),before);assert.deepEqual(f.db.prepare('SELECT * FROM order_theme_covers').all(),filesBefore);assert.equal(f.sent.length,0);
});

test('historical cleanup also clears bound payment mismatch alerts without rewriting financial state',async()=>{
 const f=await fixture();f.db.exec("DELETE FROM admin_action_log WHERE target_id='historical-tests-20261025'; UPDATE orders SET created_at='2026-10-24 10:00:00',paid_at=NULL WHERE id='test-paid'; INSERT INTO admin_payment_state(order_id,mode,provider_payment_status) VALUES('test-paid','test','paid')");
 assert.equal((await (await f.call('/exceptions')).json()).payment_sync.length,1);
 f.db.exec(readFileSync(new URL('./migrations/0045_admin_exception_archives.sql',import.meta.url),'utf8'));
 assert.equal((await (await f.call('/exceptions')).json()).payment_sync.length,0);
 assert.equal(f.db.prepare("SELECT paid_at FROM orders WHERE id='test-paid'").get().paid_at,null);
 assert.equal(f.db.prepare("SELECT provider_payment_status FROM admin_payment_state WHERE order_id='test-paid'").get().provider_payment_status,'paid');
});
