// Isolated test database with synthetic CI files or explicit actual local PDFs.
// Never import in production; actualPdfs:true must never fall back to synthetic.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handleProductionApi} from './production-worker.mjs';
import {sha256,signAccessToken} from './security.mjs';
export async function museumFixture({actualPdfs=false}={}){
 const db=new DatabaseSync(':memory:');for(const name of readdirSync(new URL('./migrations/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())db.exec(readFileSync(new URL('./migrations/'+name,import.meta.url),'utf8'));
 const DB={prepare(sql){return {bind(...args){const s=db.prepare(sql);return {first:async()=>s.get(...args)||null,all:async()=>({results:s.all(...args)}),run:async()=>({meta:{changes:Number(s.run(...args).changes)}})};}};},async batch(statements){db.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(await s.run());db.exec('COMMIT');return rows;}catch(e){db.exec('ROLLBACK');throw e;}}};
 db.exec("INSERT OR IGNORE INTO theme_worlds(id,title_en,status) VALUES('museum','Museum','published'); UPDATE theme_worlds SET status='published' WHERE id='museum'; INSERT INTO ready_packs(id,theme_world_id,setting,version,status,licence_version) VALUES('museum-original','museum','classroom','v1.0','published','fixture'); INSERT INTO price_versions(id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES('museum-price','ready_classroom','USD',1499,'price_fake','exclusive',1);");
 const objects=new Map(),hash=b=>createHash('sha256').update(b).digest('hex'),manifests=[];
 for(const paper of ['A4','Letter'])for(const role of ['player','guide']){
  const b=Buffer.from(`%PDF-1.4\nLEGACY MUSEUM ${paper}/${role}\n%%EOF`),key=`legacy/museum/${paper}/${role}.pdf`;objects.set(key,b);db.prepare('INSERT INTO ready_pack_files(ready_pack_id,paper,role,r2_key,sha256,bytes) VALUES(?,?,?,?,?,?)').run('museum-original',paper,role,key,hash(b),b.length);
 }
 for(const [locale,version] of [['en','1.1'],['zh','1.0-zh.1']]){
  // Ordinary CI tests need no private generated deliverables. Local byte-level QA
  // explicitly requests the real files and fails if any is absent or changed.
  const synthetic=new Map();
  const m=actualPdfs?JSON.parse(readFileSync(new URL(`../output/pdf/museum-classroom-${locale}-${version}/manifest.json`,import.meta.url),'utf8')):{locale,version,items:['A4','Letter'].flatMap(paper=>['player','guide'].map(role=>{
   const b=Buffer.from(`%PDF-1.4\nSYNTHETIC TEST ONLY MUSEUM ${locale}/${version}/${paper}/${role}\n%%EOF`),sha=hash(b),path=`synthetic/${locale}/${paper}/${role}.pdf`;synthetic.set(path,b);
   return {locale,version,paper,role,path,sha256:sha,bytes:b.length,r2Key:`ready-localized/museum/classroom/${locale}/${version}/${paper}/${role}-${sha.slice(0,16)}.pdf`};
  }))};manifests.push(m);
  db.prepare("INSERT INTO localized_ready_packs(id,ready_pack_id,locale,version,source_english_version,status,published_at) VALUES(?,?,?,?,?,'published',CURRENT_TIMESTAMP)").run('museum-'+locale,'museum-original',locale,version,'v1.0');
  for(const f of m.items){const b=actualPdfs?readFileSync(new URL('../'+f.path,import.meta.url)):synthetic.get(f.path);if(hash(b)!==f.sha256)throw Error('Fixture PDF changed');objects.set(f.r2Key,b);db.prepare('INSERT INTO localized_ready_pack_files(pack_id,paper,role,r2_key,sha256,bytes) VALUES(?,?,?,?,?,?)').run('museum-'+locale,f.paper,f.role,f.r2Key,f.sha256,f.bytes);}
 }
 const env={DB,PRIVATE_FILES:{get:async key=>objects.has(key)?{body:objects.get(key)}:null},SESSION_SECRET:'museum-local-fixture',PUBLIC_ORIGIN:'https://test.example',PAID_READY_ZH_ENABLED:'true',PAID_MUSEUM_EDITIONS_ENABLED:'true',ACCOUNT_ENABLED:'true',GOOGLE_CLIENT_ID:'fake.apps.googleusercontent.com'};
 const owner=await sha256(`${env.SESSION_SECRET}|adult@example.com`),spec=JSON.stringify({themeId:'museum',setting:'classroom',packVersion:'v1.0'});
 db.prepare("INSERT INTO orders(id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES('museum-old','ready','ready_classroom',?,?,?,'museum-price',1499,'USD','published',CURRENT_TIMESTAMP)").run(spec,await sha256(spec),owner);
 db.exec("INSERT INTO entitlements(id,order_id,ready_pack_id,status,access_expires_at) VALUES('museum-access','museum-old','museum-original','active',datetime('now','+12 months'))");
 const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
 const get=(path,auth=true)=>handleProductionApi(new Request(env.PUBLIC_ORIGIN+path,{headers:auth?{cookie:`paw_session=${token}`}:{}}),env);
 return {db,DB,env,get,objects,manifests};
}
