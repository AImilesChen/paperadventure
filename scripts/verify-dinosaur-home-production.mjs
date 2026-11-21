import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {assertPaymentRuntime} from './payment-runtime.mjs';
const dir=process.env.RUNNER_TEMP||'tmp/qa';mkdirSync(dir,{recursive:true});
const origin='https://paperadventure.app',baseline=dir+'/dinosaur-home-before.json';
for(let i=0;i<(process.argv.includes('--wait')?120:1);i++){
 try{
  const response=await fetch(origin+'/api/v1/catalog',{cache:'no-store',signal:AbortSignal.timeout(20000)});assert.equal(response.status,200);const catalog=await response.json();
  const pack=catalog.themes.find(t=>t.id==='dinosaur')?.home;assert.equal(pack.readyStatus,'published');
  assert.deepEqual(pack.documentEditions,[{locale:'en',version:'1.1'},{locale:'zh',version:'1.0-zh.1'}]);
  assert.deepEqual(catalog.themes.find(t=>t.id==='museum')?.classroom?.documentEditions,[{locale:'en',version:'1.1'},{locale:'zh',version:'1.0-zh.1'}]);
  assert.deepEqual(catalog.themes.find(t=>t.id==='library')?.classroom?.documentEditions,[{locale:'en',version:'1.1'},{locale:'zh',version:'1.0-zh.1'}]);
  assert.deepEqual(catalog.themes.find(t=>t.id==='weather')?.classroom?.documentEditions,[{locale:'en',version:'1.1'},{locale:'zh',version:'1.0-zh.1'}]);
  assert.deepEqual(catalog.themes.find(t=>t.id==='workshop')?.classroom?.documentEditions,[{locale:'en',version:'1.1'},{locale:'zh',version:'1.0-zh.1'}]);
  assert.ok(!catalog.themes.find(t=>t.id==='dinosaur')?.classroom?.documentEditions);
  const ocean=catalog.themes.find(t=>t.id==='ocean')?.classroom;assert.ok(ocean.documentEditions.some(e=>e.locale==='zh'&&e.version==='1.0-zh.2'));
  const health=await fetch(origin+'/api/v1/health',{signal:AbortSignal.timeout(20000)});assert.equal(health.status,200);assertPaymentRuntime(await health.json(),{expectedMode:'live'});
  for(const locale of ['en','zh'])assert.equal((await fetch(origin+`/api/v1/files/dinosaur-home-v91-nonexistent/player?paper=A4&locale=${locale}`,{signal:AbortSignal.timeout(20000)})).status,401);
  if(existsSync(baseline)){
   const before=JSON.parse(readFileSync(baseline));assert.deepEqual(catalog.offers.map(({sku,unitAmount,currency,saleEnabled})=>({sku,unitAmount,currency,saleEnabled})),before.prices);
   assert.deepEqual(catalog.themes.filter(t=>t.id!=='dinosaur'),before.otherThemes);
  }
  writeFileSync(dir+'/dinosaur-home-production-checks.json',JSON.stringify({status:'passed',editions:pack.documentEditions,oceanEditionPreserved:true,privateAnonymousDenied:2,paymentMode:'live',pricesAndOtherThemesPreserved:existsSync(baseline),realPaidOwnerDownload:'not_verified_no_real_purchase_created'},null,2));
  console.log('Verified both Dinosaur Home editions, Museum, Ocean, anonymous guards and live payment runtime.');break;
 }catch(error){if(!process.argv.includes('--wait')||i===119)throw error;console.log(`Waiting for matching Dinosaur Home editions (${i+1}/120); retaining current public site.`);await new Promise(r=>setTimeout(r,5000));}
}
