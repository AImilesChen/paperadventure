import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {handleProductionApi} from './production-worker.mjs';
import {dispatchSupportNotification,resumeSupportNotifications} from './support-notifications.mjs';
import {signAccessToken} from './security.mjs';
function fixture(){
 const db=new DatabaseSync(':memory:');
 for(const file of readdirSync(new URL('./migrations/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync(new URL('./migrations/'+file,import.meta.url),'utf8'));
 const binding={prepare:sql=>({bind:(...args)=>({first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})})}),batch:async items=>{db.exec('BEGIN');try{const out=[];for(const i of items)out.push(await i.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}};
 db.exec("INSERT INTO price_versions(id,sku,currency,unit_amount,tax_behavior) VALUES('price','custom_home','USD',1499,'unknown'); INSERT INTO orders(id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES('support-order','custom','custom_home','{}','hash','owner','price',1499,'USD','published',CURRENT_TIMESTAMP)");
 const sent=[],env={DB:binding,SESSION_SECRET:'fixture',PUBLIC_ORIGIN:'https://example.test',EMAIL_FROM:'support@paperadventure.app',EMAIL_PUBLIC_DESTINATIONS_READY:'true',EMAIL:{send:async m=>{sent.push(m);return {messageId:'fixture'};}},FETCH:async()=>{throw Error('No provider, payment or AI call expected');}};
 async function request(method='POST',body={issueType:'refund',refundReason:'fault',description:'The printout is unusable.',requestKey:'11111111-1111-4111-8111-111111111111'},owner='owner'){
  const cookie='paw_session='+await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  return handleProductionApi(new Request('https://example.test/api/v1/orders/support-order/issues',{method,headers:{cookie,origin:env.PUBLIC_ORIGIN,'content-type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})}),env);
 }
 return {db,env,sent,request};
}
test('a repeated refund submission reserves one case, one evidence event and one operator email without issuing refunds',async()=>{
 const f=fixture();const a=await f.request(),b=await f.request();assert.equal(a.status,201);assert.equal(b.status,201);assert.equal((await a.json()).caseId,(await b.json()).caseId);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM support_cases').get().n,1);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM order_evidence WHERE event='refund_requested'").get().n,1);
 assert.equal(f.sent.length,1);assert.equal(f.sent[0].to,'support@paperadventure.app');assert.match(f.sent[0].text,/Refund reason: Faulty or unusable files/);assert.match(f.sent[0].text,/not a refund instruction/);
 assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'published');assert.equal((await (await f.request('GET')).json()).cases[0].notification_status,'sent');
 assert.equal((await f.request('GET',undefined,'other')).status,404);assert.equal((await f.request('POST',undefined,'other')).status,404);
});
test('email failure preserves the request and retries later; concurrent workers do not send twice',async()=>{
 const f=fixture();let attempts=0;f.env.EMAIL.send=async m=>{attempts++;if(attempts===1)throw Error('private provider failure');f.sent.push(m);};
 assert.equal((await f.request()).status,201);const row=f.db.prepare('SELECT * FROM support_case_notifications').get();assert.equal(row.status,'pending');assert.equal(row.attempts,1);
 await resumeSupportNotifications(f.env);assert.equal(attempts,1,'respect retry delay');
 f.db.exec('UPDATE support_case_notifications SET next_attempt_at=0');
 await Promise.all([dispatchSupportNotification(row.case_id,f.env),dispatchSupportNotification(row.case_id,f.env)]);
 assert.equal(attempts,2);assert.equal(f.sent.length,1);assert.equal(f.db.prepare('SELECT status FROM support_case_notifications').get().status,'sent');
});
test('case, evidence and notification are atomic, with no success acknowledgement after a failed reservation',async()=>{
 const f=fixture();f.db.exec("CREATE TRIGGER reject_notice BEFORE INSERT ON support_case_notifications BEGIN SELECT RAISE(ABORT,'fixture failure'); END;");
 assert.equal((await f.request()).status,500);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM support_cases').get().n,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM order_evidence').get().n,0);assert.equal(f.sent.length,0);
});
