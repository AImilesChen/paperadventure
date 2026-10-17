import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync,readdirSync } from 'node:fs';
import productionWorker,{handleProductionApi} from './production-worker.mjs';
import {reserveOrderCover,processOrderCover,resumeOrderCovers,coverPrompt} from './theme-covers.mjs';
import {signAccessToken} from './security.mjs';
import {validatePurchase} from './domain.mjs';
import {planFixture} from '../tests/fixtures/creator-plan-fixture.mjs';
import {createHmac} from 'node:crypto';

function fixture({creatorVersion=1}={}) {
  const db=new DatabaseSync(':memory:');
  for(const name of readdirSync(new URL('./migrations/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())db.exec(readFileSync(new URL('./migrations/'+name,import.meta.url),'utf8'));
  const binding={prepare(sql){return {bind(...values){const statement=db.prepare(sql);return {first:async()=>statement.get(...values)||null,all:async()=>({results:statement.all(...values)}),run:async()=>({meta:{changes:Number(statement.run(...values).changes)}})};}};},async batch(statements){const result=[];for(const item of statements)result.push(await item.run());return result;}};
  const spec={creatorVersion,customIdea:'A floating bakery run by friendly robots',proposalTitle:'The Flying Bakery',email:'DO NOT SEND THIS EMAIL',playerNames:['DO NOT SEND THESE NAMES'],setting:'home',paper:'A4'};
  db.exec("INSERT INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES ('cover-price','custom_home','USD',1499,'price_cover','exclusive',1)");
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('cover-order','custom','custom_home',?,'hash','owner','cover-price',1499,'USD','published',CURRENT_TIMESTAMP)").run(JSON.stringify(spec));
  const queue=[],objects=new Map(),requests=[];
  const jpeg=new Uint8Array(150);jpeg.set([255,216,255,224]);
  const env={DB:binding,FAL_KEY:'test-secret-not-for-client',SESSION_SECRET:'test-session',GENERATION_QUEUE:{send:async body=>queue.push(body)},PRIVATE_FILES:{put:async(key,bytes)=>objects.set(key,new Uint8Array(bytes)),head:async key=>objects.has(key)?{size:objects.get(key).length}:null,get:async key=>objects.has(key)?{body:objects.get(key),size:objects.get(key).length}:null},FETCH:async(url,init={})=>{
    requests.push({url,init});
    if(init.method==='POST'){assert.equal(url,'https://queue.fal.run/fal-ai/flux/schnell');assert.equal(init.headers.Authorization,'Key '+env.FAL_KEY);const input=JSON.parse(init.body);assert.equal(input.num_images,1);assert.equal(input.enable_safety_checker,true);assert.doesNotMatch(input.prompt,/DO NOT SEND/);return Response.json({request_id:'cover-request-001',status_url:'https://queue.fal.run/fal-ai/flux/requests/cover-request-001/status',response_url:'https://queue.fal.run/fal-ai/flux/requests/cover-request-001'});}
    if(url.endsWith('/status'))return Response.json({status:'COMPLETED'});
    if(url==='https://queue.fal.run/fal-ai/flux/requests/cover-request-001')return Response.json({images:[{url:'https://v3.fal.media/files/cover.jpg',width:1024,height:576}],has_nsfw_concepts:[false]});
    assert.equal(url,'https://v3.fal.media/files/cover.jpg');assert.equal(init.headers,undefined,'never forward the API key to the image CDN');return new Response(jpeg,{headers:{'content-type':'image/jpeg'}});
  }};
  const order=db.prepare('SELECT * FROM orders WHERE id = ?').get('cover-order');
  const row=()=>db.prepare('SELECT * FROM order_theme_covers WHERE order_id = ?').get('cover-order');
  const due=()=>db.exec('UPDATE order_theme_covers SET next_check_at = 0,lease_until = 0');
  return {db,env,spec,order,row,due,queue,objects,requests};
}
const req=(path,method='GET',cookie,origin='https://adventure.example')=>new Request('https://adventure.example'+path,{method,headers:{...(cookie?{cookie}:{}),origin}});
async function cookie(env,owner='owner'){return 'paw_session='+await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});}

test('an arbitrary non-catalog theme generates one persistent cover despite concurrent deliveries and repeat requests',async()=>{
  const f=fixture();assert.equal(await reserveOrderCover(f.order,f.env),true);assert.equal(await reserveOrderCover(f.order,f.env),false);
  await Promise.all([processOrderCover(f.order.id,f.env),processOrderCover(f.order.id,f.env)]);
  assert.equal(f.requests.filter(r=>r.init.method==='POST').length,1);
  f.due();assert.equal((await processOrderCover(f.order.id,f.env)).status,'ready');
  assert.equal(f.row().generation_calls,1);assert.equal(f.objects.size,1);
  await processOrderCover(f.order.id,f.env);await resumeOrderCovers(f.env);
  const token=await cookie(f.env);
  assert.equal((await handleProductionApi(req('/api/v1/orders/cover-order/cover','POST',token),f.env)).status,200);
  const shelf=await handleProductionApi(req('/api/v1/my-orders','GET',token),f.env).then(r=>r.json());
  assert.equal(shelf.orders[0].image,'/api/v1/orders/cover-order/cover');assert.equal(shelf.orders[0].coverStatus,'ready');
  assert.doesNotMatch(JSON.stringify(shelf),/test-secret|cover-request-001|fal.media|DO NOT SEND/);
  assert.equal(f.requests.filter(r=>r.init.method==='POST').length,1);
});

test('cover serving and creation require the paid order owner, and tampered bytes are never served',async()=>{
  const f=fixture(),path='/api/v1/orders/cover-order/cover';await reserveOrderCover(f.order,f.env);await processOrderCover(f.order.id,f.env);f.due();await processOrderCover(f.order.id,f.env);
  assert.equal((await handleProductionApi(req(path),f.env)).status,401);
  const other=await cookie(f.env,'other');assert.equal((await handleProductionApi(req(path,'GET',other),f.env)).status,404);assert.equal((await handleProductionApi(req(path,'POST',other),f.env)).status,404);
  const token=await cookie(f.env),result=await handleProductionApi(req(path,'GET',token),f.env);
  assert.equal(result.status,200);assert.equal(result.headers.get('content-type'),'image/jpeg');assert.match(result.headers.get('cache-control'),/private.*no-store/);
  f.objects.get(f.row().r2_key)[10]=42;assert.equal((await handleProductionApi(req(path,'GET',token),f.env)).status,503);
  f.db.exec("UPDATE orders SET status = 'refunded'");assert.equal((await handleProductionApi(req(path,'POST',token),f.env)).status,404);
});

test('an ambiguous submission timeout stops after one call and cannot be restarted through refresh or POST',async()=>{
  const f=fixture();let calls=0;f.env.FETCH=async()=>{calls++;throw Error('secret provider text must never become a public error');};
  await reserveOrderCover(f.order,f.env);assert.equal((await processOrderCover(f.order.id,f.env)).status,'failed');
  f.due();await processOrderCover(f.order.id,f.env);await resumeOrderCovers(f.env);
  const stopped=await handleProductionApi(req('/api/v1/orders/cover-order/cover','POST',await cookie(f.env)),f.env);
  assert.equal(stopped.status,409);assert.equal(calls,1);assert.equal(f.row().generation_calls,1);assert.equal(f.row().error_code,'COVER_NETWORK');
  assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'published');
});

test('storage recovery reuses the completed fal request without generating another image',async()=>{
  const f=fixture();await reserveOrderCover(f.order,f.env);await processOrderCover(f.order.id,f.env);f.due();
  const put=f.env.PRIVATE_FILES.put;let attempts=0;f.env.PRIVATE_FILES.put=async(...args)=>{if(++attempts===1)throw Error('temporary storage failure');return put(...args);};
  assert.equal((await processOrderCover(f.order.id,f.env)).status,'pending');f.due();assert.equal((await processOrderCover(f.order.id,f.env)).status,'ready');
  assert.equal(f.requests.filter(r=>r.init.method==='POST').length,1);assert.equal(f.row().generation_calls,1);
});

test('missing keys, unpaid orders, and old orders viewed on the shelf never start a cover',async()=>{
  const f=fixture();assert.equal(await reserveOrderCover({...f.order,paid_at:null},f.env),false);
  assert.equal(await reserveOrderCover(f.order,{...f.env,FAL_KEY:undefined}),false);
  await handleProductionApi(req('/api/v1/my-orders','GET',await cookie(f.env)),f.env);assert.equal(f.row(),undefined);assert.equal(f.requests.length,0);
  f.db.exec("UPDATE orders SET paid_at = NULL,status = 'pending_payment'");assert.equal((await handleProductionApi(req('/api/v1/orders/cover-order/cover','POST',await cookie(f.env)),f.env)).status,404);
});

test('paid creator covers wait for a translated plan and preserve its actual theme',async()=>{
  const f=fixture({creatorVersion:3});await reserveOrderCover(f.order,f.env);assert.equal((await processOrderCover(f.order.id,f.env)).status,'waiting_plan');assert.equal(f.requests.length,0);
  const plan={title:'The Flying Bakery',premise:'Friendly robot bakers carry a floating bakery above the town.',themeAnchors:['robot bakers','floating bakery']};
  f.db.exec("INSERT INTO custom_plan_orders (order_id,status,active_version) VALUES ('cover-order','review',1)");
  f.db.prepare("INSERT INTO custom_plan_versions (order_id,version_number,plan_json,request_kind) VALUES ('cover-order',1,?,'initial')").run(JSON.stringify(plan));
  await processOrderCover(f.order.id,f.env);assert.match(JSON.parse(f.requests[0].init.body).prompt,/Friendly robot bakers/);assert.doesNotMatch(coverPrompt(f.spec,plan),/DO NOT SEND/);
});

test('rejected content, untrusted image URLs and invalid image bytes cannot become ready covers',async()=>{
  for(const kind of ['unsafe','ssrf','svg','oversize']) {
    const f=fixture(),original=f.env.FETCH;let downloads=0;
    f.env.FETCH=async(url,init)=>{
      if(url==='https://queue.fal.run/fal-ai/flux/requests/cover-request-001')return Response.json({images:[{url:kind==='ssrf'?'https://internal.example/private':'https://v3.fal.media/files/cover.jpg',width:1024,height:576}],has_nsfw_concepts:[kind==='unsafe']});
      if(url==='https://v3.fal.media/files/cover.jpg'){downloads++;return kind==='oversize'?new Response(new Uint8Array(6*1024*1024),{headers:{'content-type':'image/jpeg'}}):new Response('<svg>not a raster image</svg>',{headers:{'content-type':'image/svg+xml'}});}
      return original(url,init);
    };
    await reserveOrderCover(f.order,f.env);await processOrderCover(f.order.id,f.env);f.due();assert.equal((await processOrderCover(f.order.id,f.env)).status,'failed');assert.equal(f.objects.size,0);if(['unsafe','ssrf'].includes(kind))assert.equal(downloads,0);
  }
});

test('an expired in-flight reservation cannot cause a second billable request after a worker interruption',async()=>{
  const f=fixture();await reserveOrderCover(f.order,f.env);f.db.exec("UPDATE order_theme_covers SET status = 'submitting',generation_calls = 1,lease_until = 0");
  await resumeOrderCovers(f.env);assert.equal(f.row().error_code,'COVER_SUBMIT_UNCERTAIN');assert.equal(f.requests.length,0);
  let ack=false;await productionWorker.queue({messages:[{body:{type:'theme_cover',orderId:f.order.id},ack(){ack=true;},retry(){throw Error('terminal covers must not retry');}}]},f.env);assert.equal(ack,true);
});

test('verified payment reserves one cover and a valid initial plan dispatches it without an image call in the plan worker',async()=>{
  const f=fixture({creatorVersion:3});
  const spec=validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'A floating bakery run by friendly robots',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:['discussion']}}).spec;
  spec.onlineRedownloadMonths=12;
  const plan=planFixture(spec);
  f.db.prepare("UPDATE orders SET status = 'pending_payment',paid_at = NULL,purchase_spec_json = ?,stripe_checkout_session_id = 'cs_cover'").run(JSON.stringify(spec));
  f.env.STRIPE_WEBHOOK_SECRET='whsec_fixture';f.env.DEEPSEEK_API_KEY='text-fixture';f.env.AI_PROVIDER='deepseek';
  f.env.FETCH=async(url,init)=>{
    assert.equal(url,'https://api.deepseek.com/responses','the plan worker must not directly call image generation');
    const sent=JSON.parse(init.body);return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(sent.text.format.name==='paid_plan_audit'?{pass:true,issues:[]}:plan)}]}]});
  };
  const session={id:'cs_cover',client_reference_id:'cover-order',metadata:{order_id:'cover-order',spec_hash:'hash'},payment_status:'paid',currency:'usd',amount_subtotal:1499,amount_total:1499,payment_intent:'pi_cover'};
  const raw=JSON.stringify({id:'evt_cover',type:'checkout.session.completed',data:{object:session}}),time=Math.floor(Date.now()/1000),signature=createHmac('sha256',f.env.STRIPE_WEBHOOK_SECRET).update(`${time}.${raw}`).digest('hex');
  const webhook=()=>handleProductionApi(new Request('https://adventure.example/api/v1/stripe/webhook',{method:'POST',headers:{'Stripe-Signature':`t=${time},v1=${signature}`},body:raw}),f.env);
  assert.equal((await webhook()).status,200);assert.equal((await webhook()).status,200);
  assert.equal(f.row().status,'queued');assert.equal(f.row().generation_calls,0);assert.equal(f.queue.filter(item=>item.type==='theme_cover').length,0);
  await productionWorker.queue({messages:[{body:{type:'plan',requestId:'plan-cover-order-initial'},ack(){},retry(){throw Error('valid initial plan should publish');}}]},f.env);
  assert.equal(f.db.prepare('SELECT status FROM custom_plan_orders').get().status,'review');
  assert.deepEqual(f.queue.at(-1),{type:'theme_cover',orderId:'cover-order'});
  assert.equal(f.row().generation_calls,0,'image spending belongs to the independent cover job');
});

