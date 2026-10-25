import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {handleProductionApi} from './production-worker.mjs';
import {dispatchFeedbackNotification,resumeFeedbackNotifications} from './site-feedback.mjs';
import {feedbackPagePath} from '../shared/feedback.mjs';

function fixture(){
  const db=new DatabaseSync(':memory:');
  for(const file of readdirSync(new URL('./migrations/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync(new URL('./migrations/'+file,import.meta.url),'utf8'));
  const DB={prepare:sql=>({bind:(...args)=>({first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})})})};
  const sent=[],env={DB,SESSION_SECRET:'feedback-fixture-secret',PUBLIC_ORIGIN:'https://example.test',EMAIL_FROM:'support@paperadventure.app',EMAIL_PUBLIC_DESTINATIONS_READY:'true',EMAIL:{send:async email=>{assert.equal(db.prepare('SELECT COUNT(*) n FROM site_feedback').get().n>0,true,'save before send');sent.push(email);return {messageId:'fixture'};}},FETCH:async()=>{throw Error('No AI, Stripe or remote call expected');}};
  const body={type:'suggestion',message:'Please add an easier way to choose games.',wantsReply:false,email:null,pagePath:'/en/pricing/?token=private#secret',browserCategory:'Chrome',deviceCategory:'desktop'};
  const request=(value=body,key='feedback-request-key-0001',headers={})=>handleProductionApi(new Request(env.PUBLIC_ORIGIN+'/api/v1/feedback',{method:'POST',headers:{origin:env.PUBLIC_ORIGIN,'content-type':'application/json','idempotency-key':key,'cf-connecting-ip':'203.0.113.7',...headers},body:JSON.stringify(value)}),env);
  return {db,env,sent,body,request};
}

test('anonymous feedback is durable before one operator notification; retries never create another record or email',async()=>{
  const f=fixture(),a=await f.request({...f.body,email:'must-not-save@example.test'}),b=await f.request();
  assert.equal(a.status,201);assert.equal(b.status,200);
  const response=await a.json();assert.equal(response.saved,true);assert.equal((await b.json()).id,response.id);
  assert.deepEqual(Object.keys(response).sort(),['id','saved']);
  const item=f.db.prepare('SELECT * FROM site_feedback').get();
  assert.equal(item.reply_email,null);assert.equal(item.page_path,'/en/pricing/');assert.equal(item.notification_status,'sent');
  assert.equal(f.sent.length,1);assert.equal(f.sent[0].to,'support@paperadventure.app');assert.equal(f.sent[0].replyTo,undefined);assert.match(f.sent[0].text,/Anonymous/);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM orders').get().n,0);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM support_cases').get().n,0);
  assert.equal(JSON.stringify(f.db.prepare('SELECT * FROM feedback_rate_limits').all()).includes('203.0.113.7'),false);
  const publicRead=await handleProductionApi(new Request(f.env.PUBLIC_ORIGIN+'/api/v1/feedback'),f.env);assert.equal(publicRead.status,404);
});

test('reply email is required only on request and is sent as Reply-To with safe context',async()=>{
  const f=fixture();
  assert.equal((await f.request({...f.body,wantsReply:true,email:''})).status,400);
  assert.equal((await f.request({...f.body,wantsReply:true,email:'a@example.test\r\nBcc:other@example.test'})).status,400);
  assert.equal((await f.request({...f.body,wantsReply:true,email:' Adult@Example.test ',pagePath:'/en/orders/private-order/?token=secret'})).status,201);
  const item=f.db.prepare('SELECT * FROM site_feedback').get();assert.equal(item.reply_email,'adult@example.test');assert.equal(item.page_path,'/en/orders/');
  assert.equal(f.sent[0].replyTo,'adult@example.test');assert.equal(f.sent[0].text.includes('private-order'),false);assert.equal(f.sent[0].text.includes('token=secret'),false);
});

test('origin, request size, type and content are checked before storing public feedback',async()=>{
  const f=fixture();
  assert.equal((await f.request(f.body,undefined,{origin:'https://evil.test'})).status,403);
  assert.equal((await f.request(f.body,undefined,{'content-type':'text/plain'})).status,415);
  assert.equal((await f.request({...f.body,type:'refund'})).status,400);
  assert.equal((await f.request({...f.body,message:' '.repeat(20)})).status,400);
  assert.equal((await f.request({...f.body,message:'x'.repeat(2001)})).status,400);
  assert.equal((await f.request({...f.body,message:'x'.repeat(17000)})).status,413);
  const missingOrigin=new Request(f.env.PUBLIC_ORIGIN+'/api/v1/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(f.body)});
  assert.equal((await handleProductionApi(missingOrigin,f.env)).status,403);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM site_feedback').get().n,0);assert.equal(f.sent.length,0);
});

test('changed idempotency payload is rejected; parallel retries reserve only one notification',async()=>{
  const f=fixture();const results=await Promise.all([f.request(),f.request()]);
  assert.ok(results.every(r=>[200,201].includes(r.status)));assert.equal(f.sent.length,1);
  assert.equal((await f.request({...f.body,message:'A changed message'})).status,409);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM site_feedback').get().n,1);
});

test('mail failure leaves saved feedback and retries with a lease, delay and bounded attempts',async()=>{
  const f=fixture();let attempts=0;f.env.EMAIL.send=async()=>{attempts++;throw Error('private provider output');};
  assert.equal((await f.request()).status,201);
  const id=f.db.prepare('SELECT id FROM site_feedback').get().id;
  assert.equal((await f.request()).status,200);assert.equal(attempts,1);
  await resumeFeedbackNotifications(f.env);assert.equal(attempts,1);
  f.db.exec('UPDATE site_feedback SET notification_next_at=0');
  f.env.EMAIL.send=async m=>{attempts++;f.sent.push(m);return {messageId:'fixture'};};
  await Promise.all([dispatchFeedbackNotification(id,f.env),dispatchFeedbackNotification(id,f.env)]);
  assert.equal(attempts,2);assert.equal(f.sent.length,1);assert.equal(f.db.prepare('SELECT notification_status s FROM site_feedback').get().s,'sent');
  f.db.exec("UPDATE site_feedback SET notification_status='pending',notification_attempts=7,notification_next_at=0");
  f.env.EMAIL.send=async()=>{throw Error('failure');};await dispatchFeedbackNotification(id,f.env);
  assert.equal(f.db.prepare('SELECT notification_status s FROM site_feedback').get().s,'attention');
  await dispatchFeedbackNotification(id,f.env);assert.equal(f.db.prepare('SELECT notification_attempts n FROM site_feedback').get().n,8);
});

test('public feedback rate limit rejects excess new messages and expires old keyed buckets',async()=>{
  const f=fixture();for(let i=0;i<5;i++)assert.equal((await f.request({...f.body,message:'Suggestion '+i},'rate-test-request-key-'+i)).status,201);
  assert.equal((await f.request(f.body,'rate-test-request-key-6')).status,429);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM site_feedback').get().n,5);
  f.db.exec('UPDATE feedback_rate_limits SET expires_at=0');await resumeFeedbackNotifications(f.env);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM feedback_rate_limits').get().n,0);
});

test('failed durable write never reports success or sends mail; provider errors stay out of responses',async()=>{
  const f=fixture();f.db.exec("CREATE TRIGGER reject_feedback BEFORE INSERT ON site_feedback BEGIN SELECT RAISE(ABORT,'private database details');END;");
  const result=await f.request();assert.equal(result.status,503);assert.equal((await result.text()).includes('private database'),false);
  assert.equal(f.sent.length,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM site_feedback').get().n,0);
});

test('Resend fallback retains the fixed recipient, reply address and idempotent notification key',async()=>{
  const f=fixture();delete f.env.EMAIL;f.env.RESEND_API_KEY='fixture-resend';let payload,headers;
  f.env.FETCH=async(url,init)=>{assert.equal(url,'https://api.resend.com/emails');payload=JSON.parse(init.body);headers=init.headers;return Response.json({id:'fixture'});};
  assert.equal((await f.request({...f.body,wantsReply:true,email:'adult@example.test'})).status,201);
  assert.deepEqual(payload.to,['support@paperadventure.app']);assert.equal(payload.reply_to,'adult@example.test');assert.match(headers['Idempotency-Key'],/^paw-feedback-/);
});

test('same-day policy publication deterministically selects the latest notice before enabling the widget',async()=>{
  const f=fixture();
  for(const [version,sections] of [['2026-10-25-v5','[]'],['2026-10-25-v6','[{"heading":"Site feedback","body":"Feedback use"}]']])f.db.prepare("INSERT INTO legal_documents(kind,version,title,effective_at,sections_json,status) VALUES('privacy',?,'Privacy','2026-10-25',?,'published')").run(version,sections);
  const result=await handleProductionApi(new Request(f.env.PUBLIC_ORIGIN+'/api/v1/legal/privacy'),f.env);assert.equal((await result.json()).version,'2026-10-25-v6');
  const health=await handleProductionApi(new Request(f.env.PUBLIC_ORIGIN+'/api/v1/health'),f.env);const value=await health.json();assert.equal(value.feedback,true);assert.equal(value.feedbackNotice,true);
});

test('page context excludes private identifiers, non-site URLs and sensitive parameters',()=>{
  assert.equal(feedbackPagePath('/en/account/?returnTo=private#token'),'/en/account/');
  assert.equal(feedbackPagePath('/en/orders/abc/'),'/en/orders/');
  assert.equal(feedbackPagePath('https://evil.test/'),'/');assert.equal(feedbackPagePath('//evil.test/'),'/');
  assert.equal(feedbackPagePath('/en/%74oken/secret'),'/');
});
