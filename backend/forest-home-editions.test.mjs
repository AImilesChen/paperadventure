import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {forestFixture as createForestHomeFixture} from './forest-home-editions.fixture.mjs';
import {prepareReadyLanguageDownload} from '../src/readyDocumentDownload.mjs';
import {readyDocumentEditions} from './localized-ready-packs.mjs';
import {handleProductionApi} from './production-worker.mjs';
import {purchaseConsentVersion} from '../shared/purchase-consent.mjs';
import {sha256,signAccessToken} from './security.mjs';
import {readyDocumentLabel,readyDocumentPages,paidDocumentGame,readyEnglishRepairGame,readyDocumentStem} from '../shared/ready-document-editions.mjs';
import {prepareForestHomeRelease} from '../scripts/prepare-forest-home-editions-release.mjs';
const pack={id:'forest-original',theme_world_id:'forest',setting:'home',version:'v1.0'};
const forestFixture=()=>createForestHomeFixture({actualPdfs:process.env.FOREST_HOME_ACTUAL_PDFS==='true'});

test('Forest Home requires its own gate even when Dinosaur Home and every Classroom gate are enabled',async()=>{
 const f=await forestFixture();f.env.PAID_FOREST_HOME_EDITIONS_ENABLED='false';
 for(const key of ['PAID_SPACE_HOME_EDITIONS_ENABLED','PAID_DINOSAUR_HOME_EDITIONS_ENABLED','PAID_READY_ZH_ENABLED','PAID_MUSEUM_EDITIONS_ENABLED','PAID_LIBRARY_EDITIONS_ENABLED','PAID_WEATHER_EDITIONS_ENABLED','PAID_WORKSHOP_EDITIONS_ENABLED'])f.env[key]='true';
 assert.deepEqual(await readyDocumentEditions(f.env,pack),[{locale:'en',version:'v1.0'}]);
 assert.equal((await f.get('/api/v1/files/forest-old/player?locale=zh')).status,409);
});

test('Forest release preparation stages idempotently and activates only complete exact manifests; withdrawal stays scoped',{skip:process.env.FOREST_HOME_ACTUAL_PDFS!=='true'},async()=>{
 const f=await forestFixture(),sql=prepareForestHomeRelease(),oldFiles=f.db.prepare('SELECT * FROM ready_pack_files ORDER BY ready_pack_id,paper,role').all(),orders=f.db.prepare('SELECT * FROM orders').all();
 f.db.exec("DELETE FROM localized_ready_pack_files WHERE pack_id IN ('forest-en','forest-zh'); DELETE FROM localized_ready_packs WHERE id IN ('forest-en','forest-zh'); INSERT INTO localized_ready_packs(id,ready_pack_id,locale,version,source_english_version,status) VALUES('forest-other-version','forest-original','en','0.9','v1.0','withdrawn')");
 f.db.exec(sql.stage);f.db.exec(sql.stage);
 const scope="id LIKE 'forest-home-%:forest-original'";
 assert.equal(f.db.prepare(`SELECT COUNT(*) n FROM localized_ready_packs WHERE ${scope} AND status='draft'`).get().n,2);
 f.db.exec("UPDATE localized_ready_pack_files SET bytes=bytes+1 WHERE pack_id='forest-home-zh-1.0-zh.1:forest-original' AND paper='A4' AND role='player'");
 f.db.exec(sql.activate);assert.equal(f.db.prepare("SELECT status FROM localized_ready_packs WHERE id='forest-home-zh-1.0-zh.1:forest-original'").get().status,'draft');
 f.db.exec("UPDATE localized_ready_pack_files SET bytes=bytes-1 WHERE pack_id='forest-home-zh-1.0-zh.1:forest-original' AND paper='A4' AND role='player'");f.db.exec(sql.activate);
 assert.equal(f.db.prepare(`SELECT COUNT(*) n FROM localized_ready_packs WHERE ${scope} AND status='published'`).get().n,2);
 f.db.exec(sql.withdraw);assert.equal(f.db.prepare(`SELECT COUNT(*) n FROM localized_ready_packs WHERE ${scope} AND status='withdrawn'`).get().n,2);
 assert.equal(f.db.prepare("SELECT status FROM localized_ready_packs WHERE id='forest-other-version'").get().status,'withdrawn');
 assert.deepEqual(f.db.prepare('SELECT * FROM ready_pack_files ORDER BY ready_pack_id,paper,role').all(),oldFiles);assert.deepEqual(f.db.prepare('SELECT * FROM orders').all(),orders);
});

test('Forest bilingual support is Home-only and never enables other Home or Forest Classroom games',async()=>{
 assert.equal(paidDocumentGame('forest','home'),true);assert.equal(paidDocumentGame('forest','classroom'),false);
 assert.equal(readyEnglishRepairGame('forest','home'),true);assert.equal(readyEnglishRepairGame('forest','classroom'),false);
 assert.equal(paidDocumentGame('halloween','home'),false);assert.equal(paidDocumentGame('forest','home','variant'),false);
 assert.equal(readyDocumentPages('forest','en','1.1','classroom'),null);assert.equal(readyDocumentStem('forest','home'),'forest-home');assert.throws(()=>readyDocumentStem('forest','classroom'));
 const f=await forestFixture();const response=await f.get('/api/v1/catalog',false);assert.equal(response.status,200);const c=await response.json();
 const d=c.themes.find(t=>t.id==='forest');assert.deepEqual(d.home.documentEditions,[{locale:'en',version:'1.1'},{locale:'zh',version:'1.0-zh.1'}]);assert.equal(d.classroom.documentEditions,undefined);
 for(const theme of c.themes.filter(t=>t.id!=='forest'))assert.equal(theme.home.documentEditions?.length||0,0);
});

test('Home editions reject a classroom-shaped key even when all classroom flags are enabled',async()=>{
 const f=await forestFixture();for(const name of ['PAID_READY_ZH_ENABLED','PAID_MUSEUM_EDITIONS_ENABLED','PAID_LIBRARY_EDITIONS_ENABLED','PAID_WEATHER_EDITIONS_ENABLED','PAID_WORKSHOP_EDITIONS_ENABLED'])f.env[name]='true';
 f.db.exec("UPDATE localized_ready_pack_files SET r2_key=replace(r2_key,'forest/home/','forest/classroom/') WHERE pack_id='forest-zh'");
 assert.equal((await f.get('/api/v1/files/forest-old/player?locale=zh&edition=1.0-zh.1')).status,409);
 f.db.exec("UPDATE ready_packs SET setting='classroom'");assert.deepEqual(await readyDocumentEditions(f.env,{...pack,setting:'classroom'}),[{locale:'en',version:'v1.0'}]);
});

test('a new Home order pinned to Chinese never silently falls back after that revision is withdrawn',async()=>{
 const f=await forestFixture();
 const spec=JSON.stringify({themeId:'forest',setting:'home',packVersion:'v1.0',documentLocale:'zh',documentEdition:'1.0-zh.1'});
 f.db.prepare("UPDATE orders SET purchase_spec_json=?,purchase_spec_sha256=? WHERE id='forest-old'").run(spec,await sha256(spec));
 f.db.exec("UPDATE localized_ready_packs SET status='withdrawn' WHERE locale='zh'");
 assert.equal((await f.get('/api/v1/files/forest-old/player')).status,409);
 const explicit=await f.get('/api/v1/files/forest-old/player?locale=en&edition=v1.0');assert.equal(explicit.status,200);assert.equal(explicit.headers.get('x-paper-adventure-pack-version'),'v1.0');
});
test('ForestHome page labels distinguish the original, repaired and translated files without changing Museum or Ocean',()=>{
 assert.deepEqual(readyDocumentPages('forest','en','v1.0','home'),{player:16,guide:10});
 assert.deepEqual(readyDocumentPages('forest','en','1.1','home'),{player:18,guide:17});
 assert.match(readyDocumentLabel('forest','zh','1.0-zh.1','zh','home'),/18页玩家材料＋17页主持指南/);
 assert.deepEqual(readyDocumentPages('museum','en','1.1'),{player:13,guide:19});
 assert.deepEqual(readyDocumentPages('ocean','zh','1.0-zh.2'),{player:11,guide:19});
});
test('old ForestHome entitlement receives complete English repair and Chinese files without rewriting legacy slots',async()=>{
 const f=await forestFixture(),before=f.db.prepare('SELECT * FROM ready_pack_files ORDER BY paper,role').all();
 assert.deepEqual(await readyDocumentEditions(f.env,pack),[{locale:'en',version:'1.1'},{locale:'zh',version:'1.0-zh.1'}]);
 for(const m of f.manifests)for(const paper of ['A4','Letter']){
  const result=await prepareReadyLanguageDownload({orderId:'forest-old',themeId:'forest',setting:'home',paper,locale:m.locale,edition:m.version,fetcher:async url=>{
   const r=await f.get(url);assert.equal(r.status,200);const role=url.includes('/guide')?'guide':'player';assert.equal(createHash('sha256').update(Buffer.from(await r.clone().arrayBuffer())).digest('hex'),m.items.find(x=>x.paper===paper&&x.role===role).sha256);return r;
  }});assert.match(result.filename,/^forest-home-/);assert.ok(result.blob.size>100);
 }
 const latest=await f.get('/api/v1/files/forest-old/player');assert.equal(latest.headers.get('x-paper-adventure-pack-version'),'1.1');
 const original=await f.get('/api/v1/files/forest-old/player?locale=en&edition=v1.0');assert.equal(original.status,200);assert.equal(original.headers.get('x-paper-adventure-pack-version'),'v1.0');
 assert.deepEqual(f.db.prepare('SELECT * FROM ready_pack_files ORDER BY paper,role').all(),before);assert.equal(f.db.prepare('SELECT count(*) n FROM orders').get().n,1);
});
test('ForestHome gate, withdrawn repair, source mismatch and bad path never mislabel legacy English',async()=>{
 const f=await forestFixture();f.env.PAID_MUSEUM_EDITIONS_ENABLED='true';f.env.PAID_FOREST_HOME_EDITIONS_ENABLED='false';
 assert.deepEqual(await readyDocumentEditions(f.env,pack),[{locale:'en',version:'v1.0'}]);
 assert.equal((await f.get('/api/v1/files/forest-old/player?locale=en&edition=1.1')).status,409);assert.equal((await f.get('/api/v1/files/forest-old/player?locale=zh')).status,409);
 assert.equal((await f.get('/api/v1/files/forest-old/player')).headers.get('x-paper-adventure-pack-version'),'v1.0');
 f.env.PAID_FOREST_HOME_EDITIONS_ENABLED='true';f.db.exec("UPDATE localized_ready_packs SET status='withdrawn' WHERE locale='en'");assert.equal((await f.get('/api/v1/files/forest-old/player?locale=en&edition=1.1')).status,409);
 f.db.exec("UPDATE localized_ready_packs SET status='published'; UPDATE localized_ready_pack_files SET r2_key=replace(r2_key,'forest/home','ocean/home') WHERE pack_id='forest-zh'");assert.equal((await f.get('/api/v1/files/forest-old/player?locale=zh')).status,409);
 f.db.exec("UPDATE ready_packs SET version='v2.0'");assert.deepEqual(await readyDocumentEditions(f.env,{...pack,version:'v2.0'}),[{locale:'en',version:'v2.0'}]);
});
test('ForestHome files keep authentication, account, expiry, refund and complete-pair guards',async()=>{
 const f=await forestFixture(),p='/api/v1/files/forest-old/player?locale=zh&edition=1.0-zh.1';
 assert.equal((await f.get(p,false)).status,401);assert.equal((await f.get(p.replace('forest-old','wrong-owner'))).status,404);
 const other=await signAccessToken(f.env.SESSION_SECRET,{scope:'session',emailHash:await sha256(f.env.SESSION_SECRET+'|other@example.com'),exp:Math.floor(Date.now()/1000)+3600});
 assert.equal((await handleProductionApi(new Request(f.env.PUBLIC_ORIGIN+p,{headers:{cookie:`paw_session=${other}`}}),f.env)).status,404);
 f.db.exec("UPDATE entitlements SET access_expires_at=datetime('now','-1 day')");assert.equal((await f.get(p)).status,403);
 f.db.exec("UPDATE entitlements SET access_expires_at=datetime('now','+12 months'); UPDATE orders SET status='refunded'");assert.equal((await f.get(p)).status,404);
 const incomplete=await forestFixture();incomplete.db.exec("DELETE FROM localized_ready_pack_files WHERE pack_id='forest-zh' AND paper='Letter' AND role='guide'");assert.equal((await incomplete.get(p)).status,409);
 await assert.rejects(prepareReadyLanguageDownload({orderId:'forest-old',themeId:'forest',setting:'home',paper:'A4',locale:'zh',edition:'1.0-zh.1',fetcher:url=>incomplete.get(url)}),/unavailable/);
});
test('checkout snapshots both ForestHome document revisions and blocks a missing revision before provider calls',async()=>{
 for(const [locale,edition] of [['en','1.1'],['zh','1.0-zh.1']]){
  const f=await forestFixture();for(const kind of ['privacy','terms','cookies','refunds'])f.db.prepare("INSERT INTO legal_documents(kind,version,title,effective_at,sections_json,status) VALUES(?,?,?,'2026-11-21',?,'published')").run(kind,'fixture',kind,JSON.stringify([{heading:'Fixture',body:'Only local'}]));
  let calls=0;Object.assign(f.env,{CHECKOUT_ENABLED:'true',LEGAL_RELEASED:'true',TAX_CONFIGURED:'true',STRIPE_SECRET_KEY:'sk_test_fake',STRIPE_WEBHOOK_SECRET:'whsec_fake',RESEND_API_KEY:'re_test',EMAIL_FROM:'test@example.com',EMAIL_LOGIN_ENABLED:'true',FETCH:async(url,init)=>{calls++;return Response.json({id:'cs_fake_forest',url:'https://checkout.stripe.com/test-only',client_reference_id:new URLSearchParams(init.body).get('client_reference_id')});}});
  const body={sku:'ready_home',themeId:'forest',packVersion:'v1.0',email:'adult@example.com',locale:'zh',documentLocale:locale,documentEdition:edition,serviceRequest:{version:purchaseConsentVersion,requested:true}};
  const request=key=>new Request(f.env.PUBLIC_ORIGIN+'/api/v1/checkout-intents',{method:'POST',headers:{'content-type':'application/json','Idempotency-Key':key,origin:f.env.PUBLIC_ORIGIN},body:JSON.stringify(body)});
  const r=await handleProductionApi(request('forest-checkout-'+locale+'-0001'),f.env);assert.equal(r.status,201,JSON.stringify(await r.clone().json()));
  const stored=JSON.parse(f.db.prepare("SELECT purchase_spec_json FROM orders WHERE id<>'forest-old'").get().purchase_spec_json);assert.equal(stored.documentLocale,locale);assert.equal(stored.documentEdition,edition);assert.equal(calls,1);
  f.env.PAID_FOREST_HOME_EDITIONS_ENABLED='false';assert.equal((await handleProductionApi(request('forest-checkout-'+locale+'-0002'),f.env)).status,409);assert.equal(calls,1);
 }
});
