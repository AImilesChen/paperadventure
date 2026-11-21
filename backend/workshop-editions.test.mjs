import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {workshopFixture as createWorkshopFixture} from './workshop-editions.fixture.mjs';
import {prepareReadyLanguageDownload} from '../src/readyDocumentDownload.mjs';
import {readyDocumentEditions} from './localized-ready-packs.mjs';
import {handleProductionApi} from './production-worker.mjs';
import {purchaseConsentVersion} from '../shared/purchase-consent.mjs';
import {sha256,signAccessToken} from './security.mjs';
import {readyDocumentLabel,readyDocumentPages} from '../shared/ready-document-editions.mjs';
const pack={id:'workshop-original',theme_world_id:'workshop',setting:'classroom',version:'v1.0'};
const workshopFixture=()=>createWorkshopFixture({actualPdfs:process.env.WORKSHOP_ACTUAL_PDFS==='true'});
test('Workshop page labels distinguish the original, repaired and translated files without changing Museum or Ocean',()=>{
 assert.deepEqual(readyDocumentPages('workshop','en','v1.0'),{player:12,guide:10});
 assert.deepEqual(readyDocumentPages('workshop','en','1.1'),{player:16,guide:19});
 assert.match(readyDocumentLabel('workshop','zh','1.0-zh.1','zh'),/16页玩家材料＋19页教师指南/);
 assert.deepEqual(readyDocumentPages('museum','en','1.1'),{player:13,guide:19});
 assert.deepEqual(readyDocumentPages('ocean','zh','1.0-zh.2'),{player:11,guide:19});
});
test('old Workshop entitlement receives complete English repair and Chinese files without rewriting legacy slots',async()=>{
 const f=await workshopFixture(),before=f.db.prepare('SELECT * FROM ready_pack_files ORDER BY paper,role').all();
 assert.deepEqual(await readyDocumentEditions(f.env,pack),[{locale:'en',version:'1.1'},{locale:'zh',version:'1.0-zh.1'}]);
 for(const m of f.manifests)for(const paper of ['A4','Letter']){
  const result=await prepareReadyLanguageDownload({orderId:'workshop-old',themeId:'workshop',paper,locale:m.locale,edition:m.version,fetcher:async url=>{
   const r=await f.get(url);assert.equal(r.status,200);const role=url.includes('/guide')?'guide':'player';assert.equal(createHash('sha256').update(Buffer.from(await r.clone().arrayBuffer())).digest('hex'),m.items.find(x=>x.paper===paper&&x.role===role).sha256);return r;
  }});assert.match(result.filename,/^workshop-classroom-/);assert.ok(result.blob.size>100);
 }
 const latest=await f.get('/api/v1/files/workshop-old/player');assert.equal(latest.headers.get('x-paper-adventure-pack-version'),'1.1');
 const original=await f.get('/api/v1/files/workshop-old/player?locale=en&edition=v1.0');assert.equal(original.status,200);assert.equal(original.headers.get('x-paper-adventure-pack-version'),'v1.0');
 assert.deepEqual(f.db.prepare('SELECT * FROM ready_pack_files ORDER BY paper,role').all(),before);assert.equal(f.db.prepare('SELECT count(*) n FROM orders').get().n,1);
});
test('Workshop gate, withdrawn repair, source mismatch and bad path never mislabel legacy English',async()=>{
 const f=await workshopFixture();f.env.PAID_MUSEUM_EDITIONS_ENABLED='true';f.env.PAID_WORKSHOP_EDITIONS_ENABLED='false';
 assert.deepEqual(await readyDocumentEditions(f.env,pack),[{locale:'en',version:'v1.0'}]);
 assert.equal((await f.get('/api/v1/files/workshop-old/player?locale=en&edition=1.1')).status,409);assert.equal((await f.get('/api/v1/files/workshop-old/player?locale=zh')).status,409);
 assert.equal((await f.get('/api/v1/files/workshop-old/player')).headers.get('x-paper-adventure-pack-version'),'v1.0');
 f.env.PAID_WORKSHOP_EDITIONS_ENABLED='true';f.db.exec("UPDATE localized_ready_packs SET status='withdrawn' WHERE locale='en'");assert.equal((await f.get('/api/v1/files/workshop-old/player?locale=en&edition=1.1')).status,409);
 f.db.exec("UPDATE localized_ready_packs SET status='published'; UPDATE localized_ready_pack_files SET r2_key=replace(r2_key,'workshop/classroom','ocean/classroom') WHERE pack_id='workshop-zh'");assert.equal((await f.get('/api/v1/files/workshop-old/player?locale=zh')).status,409);
 f.db.exec("UPDATE ready_packs SET version='v2.0'");assert.deepEqual(await readyDocumentEditions(f.env,{...pack,version:'v2.0'}),[{locale:'en',version:'v2.0'}]);
});
test('Workshop files keep authentication, account, expiry, refund and complete-pair guards',async()=>{
 const f=await workshopFixture(),p='/api/v1/files/workshop-old/player?locale=zh&edition=1.0-zh.1';
 assert.equal((await f.get(p,false)).status,401);assert.equal((await f.get(p.replace('workshop-old','wrong-owner'))).status,404);
 const other=await signAccessToken(f.env.SESSION_SECRET,{scope:'session',emailHash:await sha256(f.env.SESSION_SECRET+'|other@example.com'),exp:Math.floor(Date.now()/1000)+3600});
 assert.equal((await handleProductionApi(new Request(f.env.PUBLIC_ORIGIN+p,{headers:{cookie:`paw_session=${other}`}}),f.env)).status,404);
 f.db.exec("UPDATE entitlements SET access_expires_at=datetime('now','-1 day')");assert.equal((await f.get(p)).status,403);
 f.db.exec("UPDATE entitlements SET access_expires_at=datetime('now','+12 months'); UPDATE orders SET status='refunded'");assert.equal((await f.get(p)).status,404);
 const incomplete=await workshopFixture();incomplete.db.exec("DELETE FROM localized_ready_pack_files WHERE pack_id='workshop-zh' AND paper='Letter' AND role='guide'");assert.equal((await incomplete.get(p)).status,409);
 await assert.rejects(prepareReadyLanguageDownload({orderId:'workshop-old',themeId:'workshop',paper:'A4',locale:'zh',edition:'1.0-zh.1',fetcher:url=>incomplete.get(url)}),/unavailable/);
});
test('checkout snapshots both Workshop document revisions and blocks a missing revision before provider calls',async()=>{
 for(const [locale,edition] of [['en','1.1'],['zh','1.0-zh.1']]){
  const f=await workshopFixture();for(const kind of ['privacy','terms','cookies','refunds'])f.db.prepare("INSERT INTO legal_documents(kind,version,title,effective_at,sections_json,status) VALUES(?,?,?,'2026-11-21',?,'published')").run(kind,'fixture',kind,JSON.stringify([{heading:'Fixture',body:'Only local'}]));
  let calls=0;Object.assign(f.env,{CHECKOUT_ENABLED:'true',LEGAL_RELEASED:'true',TAX_CONFIGURED:'true',STRIPE_SECRET_KEY:'sk_test_fake',STRIPE_WEBHOOK_SECRET:'whsec_fake',RESEND_API_KEY:'re_test',EMAIL_FROM:'test@example.com',EMAIL_LOGIN_ENABLED:'true',FETCH:async(url,init)=>{calls++;return Response.json({id:'cs_fake_workshop',url:'https://checkout.stripe.com/test-only',client_reference_id:new URLSearchParams(init.body).get('client_reference_id')});}});
  const body={sku:'ready_classroom',themeId:'workshop',packVersion:'v1.0',email:'adult@example.com',locale:'zh',documentLocale:locale,documentEdition:edition,serviceRequest:{version:purchaseConsentVersion,requested:true}};
  const request=key=>new Request(f.env.PUBLIC_ORIGIN+'/api/v1/checkout-intents',{method:'POST',headers:{'content-type':'application/json','Idempotency-Key':key,origin:f.env.PUBLIC_ORIGIN},body:JSON.stringify(body)});
  const r=await handleProductionApi(request('workshop-checkout-'+locale+'-0001'),f.env);assert.equal(r.status,201,JSON.stringify(await r.clone().json()));
  const stored=JSON.parse(f.db.prepare("SELECT purchase_spec_json FROM orders WHERE id<>'workshop-old'").get().purchase_spec_json);assert.equal(stored.documentLocale,locale);assert.equal(stored.documentEdition,edition);assert.equal(calls,1);
  f.env.PAID_WORKSHOP_EDITIONS_ENABLED='false';assert.equal((await handleProductionApi(request('workshop-checkout-'+locale+'-0002'),f.env)).status,409);assert.equal(calls,1);
 }
});
