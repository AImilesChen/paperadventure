import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handleProductionApi} from './production-worker.mjs';
import {sha256,signAccessToken} from './security.mjs';
import {validatePurchase} from './domain.mjs';
import {readyDocumentEditions} from './localized-ready-packs.mjs';
import {prepareReadyLanguageDownload} from '../src/readyDocumentDownload.mjs';
import {purchaseConsentVersion} from '../shared/purchase-consent.mjs';
async function fixture(){
 const db=new DatabaseSync(':memory:');for(const name of readdirSync(new URL('./migrations/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync(new URL('./migrations/'+name,import.meta.url),'utf8'));
 const DB={prepare(sql){return {bind(...args){const s=db.prepare(sql);return {first:async()=>s.get(...args)||null,all:async()=>({results:s.all(...args)}),run:async()=>({meta:{changes:Number(s.run(...args).changes)}})};}};}};
 db.exec("INSERT OR IGNORE INTO theme_worlds(id,title_en,status) VALUES('ocean','Ocean','published'); UPDATE theme_worlds SET status='published' WHERE id='ocean'; INSERT INTO ready_packs(id,theme_world_id,setting,version,status,licence_version) VALUES('ocean-en','ocean','classroom','v1.0','published','test'); INSERT INTO price_versions(id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES('ocean-price','ready_classroom','USD',1499,'price_fake','exclusive',1);");
 const objects=new Map(),hash=b=>createHash('sha256').update(b).digest('hex');
 db.exec("INSERT INTO localized_ready_packs(id,ready_pack_id,locale,version,source_english_version,status,published_at) VALUES('ocean-zh','ocean-en','zh','1.0-zh.1','v1.0','published',CURRENT_TIMESTAMP)");
 for(const paper of ['A4','Letter'])for(const role of ['player','guide'])for(const locale of ['en','zh']){
  const bytes=Buffer.from(`%PDF-1.4\n${locale}/${paper}/${role}\n%%EOF`),key=locale==='zh'?`ready-localized/ocean/classroom/zh/1.0-zh.1/${paper}/${role}.pdf`:`ready/en/${paper}/${role}.pdf`;objects.set(key,bytes);
  const table=locale==='zh'?'localized_ready_pack_files':'ready_pack_files',column=locale==='zh'?'pack_id':'ready_pack_id',id=locale==='zh'?'ocean-zh':'ocean-en';
  db.prepare(`INSERT INTO ${table}(${column},paper,role,r2_key,sha256,bytes) VALUES(?,?,?,?,?,?)`).run(id,paper,role,key,hash(bytes),bytes.length);
 }
 const env={DB,PRIVATE_FILES:{get:async key=>objects.has(key)?{body:objects.get(key)}:null},SESSION_SECRET:'local-fixture-only',PUBLIC_ORIGIN:'https://test.example',PAID_READY_ZH_ENABLED:'true',ACCOUNT_ENABLED:'true',GOOGLE_CLIENT_ID:'fake.apps.googleusercontent.com'};
 const owner=await sha256(`${env.SESSION_SECRET}|adult@example.com`),spec=JSON.stringify({themeId:'ocean',setting:'classroom',packVersion:'v1.0'});
 db.prepare("INSERT INTO orders(id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES('old-order','ready','ready_classroom',?,?,?,'ocean-price',1499,'USD','published',CURRENT_TIMESTAMP)").run(spec,await sha256(spec),owner);
 db.exec("INSERT INTO entitlements(id,order_id,ready_pack_id,status,access_expires_at) VALUES('old-access','old-order','ocean-en','active',datetime('now','+12 months'))");
 const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
 const request=(path,auth=true)=>new Request(env.PUBLIC_ORIGIN+path,{headers:auth?{cookie:`paw_session=${token}`}:{}});
 const get=(path,auth=true)=>handleProductionApi(request(path,auth),env);
 return {db,env,objects,get,DB};
}
test('existing paid entitlement downloads either language without replacing English slots',async()=>{
 const {db,get}=await fixture();const before=db.prepare('SELECT * FROM ready_pack_files ORDER BY paper,role').all();
 for(const paper of ['A4','Letter'])for(const locale of ['en','zh']){
  const version=locale==='zh'?'1.0-zh.1':'v1.0';
  const result=await prepareReadyLanguageDownload({orderId:'old-order',paper,locale,edition:version,fetcher:url=>get(url)});
  assert.ok(result.blob.size>100);assert.match(result.filename,new RegExp(locale));
 }
 assert.deepEqual(db.prepare('SELECT * FROM ready_pack_files ORDER BY paper,role').all(),before);
 assert.equal(db.prepare("SELECT count(*) AS n FROM orders").get().n,1);
});
test('localized paid files retain owner, expiry and refund restrictions',async()=>{
 const {db,get}=await fixture();const path='/api/v1/files/old-order/player?paper=A4&locale=zh&edition=1.0-zh.1';
 assert.equal((await get(path,false)).status,401);assert.equal((await get(path.replace('old-order','someone-else'))).status,404);
 db.exec("UPDATE entitlements SET access_expires_at=datetime('now','-1 day')");assert.equal((await get(path)).status,403);
 db.exec("UPDATE entitlements SET access_expires_at=datetime('now','+12 months'); UPDATE orders SET status='refunded'");assert.equal((await get(path)).status,404);
});
test('incomplete, withdrawn, wrong-version and disabled translations never fall back to English',async()=>{
 const {db,env,get,DB}=await fixture();const path='/api/v1/files/old-order/player?locale=zh&edition=1.0-zh.1';
 assert.equal((await get(path.replace('1.0-zh.1','1.0-zh.9'))).status,409);
 db.exec("UPDATE localized_ready_packs SET status='withdrawn'");assert.equal((await get(path)).status,409);assert.equal((await get('/api/v1/files/old-order/player')).status,200);
 db.exec("UPDATE localized_ready_packs SET status='published'; DELETE FROM localized_ready_pack_files WHERE paper='Letter' AND role='guide'");
 assert.equal((await get(path)).status,409);assert.deepEqual(await readyDocumentEditions(env,{id:'ocean-en',version:'v1.0',theme_world_id:'ocean',setting:'classroom'}),[{locale:'en',version:'v1.0'}]);
 env.PAID_READY_ZH_ENABLED='false';assert.equal((await get(path)).status,409);
 assert.equal((await get('/api/v1/files/old-order/player?locale=fr')).status,400);assert.equal((await get(path+'&locale=en')).status,400);
});
test('changing source English revision hides incompatible translations',async()=>{
 const {db,get}=await fixture();db.exec("UPDATE ready_packs SET version='v2.0'");
 assert.equal((await get('/api/v1/files/old-order/player?locale=zh')).status,409);
 assert.equal((await get('/api/v1/files/old-order/player?locale=en')).status,200);
});
test('client refuses mismatched language/revision, bad PDF and partial pairs',async()=>{
 const run=fetcher=>prepareReadyLanguageDownload({orderId:'test',paper:'A4',locale:'zh',edition:'1.0-zh.1',fetcher});
 for(const headers of [{'x-paper-adventure-locale':'en','x-paper-adventure-pack-version':'1.0-zh.1'},{'x-paper-adventure-locale':'zh','x-paper-adventure-pack-version':'old'}])await assert.rejects(run(async()=>new Response('%PDF-1.4',{headers:{'content-type':'application/pdf',...headers}})),/language or edition/);
 await assert.rejects(run(async url=>url.includes('/guide')?new Response('{}',{status:503}):new Response('%PDF-1.4',{headers:{'content-type':'application/pdf','x-paper-adventure-locale':'zh','x-paper-adventure-pack-version':'1.0-zh.1'}})),/unavailable/);
 await assert.rejects(run(async()=>new Response('html',{headers:{'content-type':'application/pdf','x-paper-adventure-locale':'zh','x-paper-adventure-pack-version':'1.0-zh.1'}})),/verified/);
});
test('purchase snapshots PDF language separately from interface locale and limits game scope',()=>{
 const input={sku:'ready_classroom',themeId:'ocean',packVersion:'v1.0',locale:'en',documentLocale:'zh',documentEdition:'1.0-zh.1'};
 assert.equal(validatePurchase(input).spec.documentLocale,'zh');assert.equal(validatePurchase({...input,documentLocale:'en'}).spec.documentLocale,undefined);
 assert.throws(()=>validatePurchase({...input,themeId:'dinosaur'}),/not offered/);assert.throws(()=>validatePurchase({...input,documentLocale:'fr'}),/English or Simplified Chinese/);assert.throws(()=>validatePurchase({...input,documentEdition:''}),/PDF edition/);
});
test('checkout pins Chinese edition in the stored paid-order specification before provider handoff',async()=>{
 const {db,env,DB}=await fixture();
 DB.batch=async statements=>{db.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(await s.run());db.exec('COMMIT');return rows;}catch(e){db.exec('ROLLBACK');throw e;}};
 for(const kind of ['privacy','terms','cookies','refunds'])db.prepare("INSERT INTO legal_documents(kind,version,title,effective_at,sections_json,status) VALUES(?,?,?,'2026-11-21',?,'published')").run(kind,'fixture-1',kind,JSON.stringify([{heading:'Fixture',body:'Local test only'}]));
 let calls=0;Object.assign(env,{CHECKOUT_ENABLED:'true',LEGAL_RELEASED:'true',TAX_CONFIGURED:'true',STRIPE_SECRET_KEY:'sk_test_fake',STRIPE_WEBHOOK_SECRET:'whsec_fake',RESEND_API_KEY:'re_test',EMAIL_FROM:'test@example.com',EMAIL_LOGIN_ENABLED:'true',FETCH:async(url,init)=>{calls++;return Response.json({id:'cs_fake_locale',url:'https://checkout.stripe.com/test-only',client_reference_id:new URLSearchParams(init.body).get('client_reference_id')});}});
 const body={sku:'ready_classroom',themeId:'ocean',packVersion:'v1.0',email:'adult@example.com',locale:'en',documentLocale:'zh',documentEdition:'1.0-zh.1',serviceRequest:{version:purchaseConsentVersion,requested:true}};
 const request=key=>new Request(env.PUBLIC_ORIGIN+'/api/v1/checkout-intents',{method:'POST',headers:{'content-type':'application/json','Idempotency-Key':key,origin:env.PUBLIC_ORIGIN},body:JSON.stringify(body)});
 const result=await handleProductionApi(request('locale-checkout-fixture-001'),env);assert.equal(result.status,201,JSON.stringify(await result.clone().json()));
 const order=db.prepare("SELECT purchase_spec_json FROM orders WHERE id<>'old-order'").get(),spec=JSON.parse(order.purchase_spec_json);assert.equal(spec.documentLocale,'zh');assert.equal(spec.documentEdition,'1.0-zh.1');assert.equal(calls,1);
 env.PAID_READY_ZH_ENABLED='false';const blocked=await handleProductionApi(request('locale-checkout-fixture-002'),env);assert.equal(blocked.status,409);assert.equal(calls,1);assert.equal(db.prepare('SELECT count(*) AS n FROM orders').get().n,2);
});
