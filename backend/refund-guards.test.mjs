import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import worker, {handleProductionApi} from './production-worker.mjs';
import {assertOrderNotRefunded,orderWorkEnvironment} from './order-evidence.mjs';
import {validPurchaseConsent,purchaseConsentSnapshot,purchaseConsentVersion} from '../shared/purchase-consent.mjs';
import {succeededRefundAmount} from './refund-status.mjs';

function fixture({testMode=true}={}) {
 const db=new DatabaseSync(':memory:');
 for(const file of readdirSync(new URL('./migrations/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(`./migrations/${file}`,import.meta.url),'utf8'));
 const binding={prepare:sql=>({bind:(...args)=>({first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})})}),batch:async statements=>{db.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(await s.run());db.exec('COMMIT');return rows;}catch(e){db.exec('ROLLBACK');throw e;}}};
 db.exec("INSERT INTO price_versions(id,sku,currency,unit_amount,tax_behavior) VALUES('price','custom_home','USD',1499,'exclusive')");
 db.prepare("INSERT INTO orders(id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at,stripe_payment_intent_id) VALUES('order','custom','custom_home',?,'hash','owner','price',1499,'USD','published',CURRENT_TIMESTAMP,'pi_original')").run(JSON.stringify({legalVersions:testMode?{testMode:'stripe-sandbox-2026-10-09'}:{refunds:'previous-policy'}}));
 db.exec("INSERT INTO custom_activities(id,order_id,status,story_spec_json) VALUES('activity','order','published','{}'); INSERT INTO entitlements(id,order_id,custom_activity_id,status,revision_success_used,remake_success_used) VALUES('rights','order','activity','active',2,1)");
 let calls=0;const env={DB:binding,STRIPE_WEBHOOK_SECRET:'fixture-secret',STRIPE_SECRET_KEY:'sk_test_fixture',FETCH:async()=>{calls++;return Response.json({fixture:true});}};
 async function refund({eventId='evt_refund',mode=testMode?false:true,chargeMode=mode,amount=1499,refunded=amount===1499,currency='usd',refundStatus='succeeded'}={}) {
  const raw=JSON.stringify({id:eventId,type:'charge.refunded',livemode:mode,data:{object:{payment_intent:'pi_original',currency,amount:1499,amount_refunded:amount,refunded,livemode:chargeMode,refunds:{has_more:false,data:[{id:'re_fixture',status:refundStatus,amount,currency:'usd',payment_intent:'pi_original'}]}}}});
  return sendEvent(JSON.parse(raw));
 }
 async function sendEvent(event) {
  const raw=JSON.stringify(event);
  const t=Math.floor(Date.now()/1000),v=createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(`${t}.${raw}`).digest('hex');
  return handleProductionApi(new Request('https://example.test/api/v1/stripe/webhook',{method:'POST',headers:{'Stripe-Signature':`t=${t},v1=${v}`},body:raw}),env);
 }
 return {db,env,refund,sendEvent,calls:()=>calls};
}

test('immediate-supply confirmation is explicit, version-bound and never a rights waiver',()=>{
 for(const input of [undefined,{},true,{version:purchaseConsentVersion,requested:false},{version:'stale',requested:true}])assert.equal(validPurchaseConsent(input),false);
 for(const kind of ['custom','ready']) {const value=purchaseConsentSnapshot(kind);assert.equal(validPurchaseConsent(value),true);assert.equal(value.statutoryRightsWaived,false);assert.match(value.notice,/mandatory|rights/);}
});

test('full refunds revoke future work without resetting rights, deleting history or reopening on replay',async()=>{
 const f=fixture();f.db.exec("INSERT INTO custom_plan_requests(id,order_id,kind,status) VALUES('plan','order','initial','queued')");
 const before=f.db.prepare('SELECT revision_success_used,remake_success_used FROM entitlements').get();
 assert.equal((await f.refund()).status,200);assert.equal((await f.refund()).status,200);
 assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'refunded');
 assert.equal(f.db.prepare('SELECT status FROM entitlements').get().status,'revoked');
 assert.equal(f.db.prepare('SELECT status FROM custom_plan_requests').get().status,'failed');
 assert.deepEqual(f.db.prepare('SELECT revision_success_used,remake_success_used FROM entitlements').get(),before);
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM order_evidence WHERE event='full_refund_confirmed'").get().n,1);
 assert.throws(()=>f.db.exec("UPDATE orders SET status='paid'"),/ORDER_REFUNDED/);
 assert.throws(()=>f.db.exec("UPDATE entitlements SET status='active'"),/ORDER_REFUNDED/);
 await assert.rejects(()=>assertOrderNotRefunded(f.env,'order'),{code:'ORDER_REFUNDED'});
 let ack=0;await worker.queue({messages:[{body:{type:'plan',requestId:'plan'},ack(){ack++;},retry(){assert.fail('Refunded work must not retry');}}]},f.env);
 assert.equal(ack,1);assert.equal(f.calls(),0);
});

test('partial refunds retain valid access and all prior budgets',async()=>{
 const f=fixture();assert.equal((await f.refund({amount:500})).status,200);
 assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'published');
 assert.equal(f.db.prepare('SELECT status FROM entitlements').get().status,'active');
 const guarded=orderWorkEnvironment(f.env,'order');await guarded.FETCH('https://provider.invalid');assert.equal(f.calls(),1);
});

test('pending, failed, canceled and action-required full refunds do not falsely revoke paid access',async()=>{
 for(const refundStatus of ['pending','failed','canceled','requires_action']){
  const f=fixture();assert.equal((await f.refund({refundStatus})).status,200);
  assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'published');
  assert.equal(f.db.prepare('SELECT status FROM entitlements').get().status,'active');
 }
});

test('refund updates reconcile fresh succeeded totals with a read-only Stripe request, including split refunds',async()=>{
 const f=fixture();await f.refund({refundStatus:'pending'});let gets=0;
 f.env.FETCH=async(url,options)=>{
  gets++;assert.equal(url,'https://api.stripe.com/v1/charges/ch_original');assert.equal(options.method,undefined);
  return Response.json({id:'ch_original',payment_intent:'pi_original',currency:'usd',amount:1499,amount_refunded:1499,refunded:true,livemode:false,refunds:{has_more:false,data:[{id:'re_a',amount:500,currency:'usd',status:'succeeded'},{id:'re_b',amount:999,currency:'usd',status:'succeeded'}]}});
 };
 const event={id:'evt_completed_refund',type:'refund.updated',livemode:false,data:{object:{id:'re_b',charge:'ch_original',status:'succeeded'}}};
 assert.equal((await f.sendEvent(event)).status,200);assert.equal(gets,1);assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'refunded');
 // A later stale charge event cannot restore access or counters.
 await f.refund({eventId:'evt_late_partial',amount:500});assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'refunded');
});

test('refund aggregation requires a complete bound list and cannot count pending or duplicated money',()=>{
 const charge={id:'ch_original',payment_intent:'pi_original',currency:'usd',amount:1499};
 const row={id:'re_a',payment_intent:'pi_original',charge:'ch_original',currency:'usd',amount:500,status:'succeeded'};
 assert.equal(succeededRefundAmount({has_more:false,data:[row,{...row,id:'re_b',amount:999,status:'pending'}]},charge),500);
 for(const list of [{has_more:true,data:[row]},{has_more:false,data:[row,row]},{has_more:false,data:[{...row,payment_intent:'other'}]},{has_more:false,data:[{...row,status:'unknown'}]},{has_more:false,data:[{...row,amount:1500}]}])assert.throws(()=>succeededRefundAmount(list,charge));
});

test('signed refund events still require the original currency, amount and payment mode',async()=>{
 const f=fixture();
 for(const args of [{mode:true},{chargeMode:true},{currency:'eur'},{amount:-1},{amount:1500},{amount:500,refunded:true}]){
  assert.equal((await f.refund(args)).status,409);assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'published');
 }
 const live=fixture({testMode:false});assert.equal((await live.refund({mode:false})).status,409);assert.equal((await live.refund({mode:true})).status,200);
});

test('a refund during a provider request prevents its result and every later provider call',async()=>{
 const f=fixture();f.env.FETCH=async()=>{f.db.exec("UPDATE orders SET status='refunded'");return Response.json({private:'late-result'});};
 const guarded=orderWorkEnvironment(f.env,'order');
 await assert.rejects(()=>guarded.FETCH('https://provider.invalid'),{code:'ORDER_REFUNDED'});
 f.env.FETCH=async()=>assert.fail('No second provider request');
 await assert.rejects(()=>guarded.FETCH('https://provider.invalid'),{code:'ORDER_REFUNDED'});
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM order_evidence WHERE event='provider_work_started'").get().n,1);
});

test('database commit guards reject late plans, PDF publication and candidate activation after refund',()=>{
 const f=fixture();f.db.exec("UPDATE orders SET status='refunded'");
 for(const sql of [
  "INSERT INTO custom_plan_versions(order_id,version_number,plan_json,request_kind) VALUES('order',1,'{}','initial')",
  "INSERT INTO artifact_versions(id,custom_activity_id,version_number,status) VALUES('late','activity',1,'published')",
  "INSERT INTO delivery_editions(id,order_id,request_key,kind,feedback,base_version,base_story_sha256,spec_json,spec_sha256,status,phase) VALUES('candidate','order','key','whole','feedback',1,'hash','{}','hash','queued','baseline')",
  "UPDATE custom_activities SET status='published'",
 ])assert.throws(()=>f.db.exec(sql),/ORDER_REFUNDED/);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM artifact_versions').get().n,0);
});
