import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {assertPaymentRuntime} from './payment-runtime.mjs';
const origin='https://paperadventure.app',attempts=process.argv.includes('--wait')?120:1;
let result;
for(let attempt=0;attempt<attempts;attempt++){
 try{
  const r=await fetch(origin+'/api/v1/catalog',{cache:'no-store',signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);const catalog=await r.json();
  const ocean=catalog.themes.find(t=>t.id==='ocean');assert.equal(ocean.classroom.readyStatus,'published');
  assert.ok(ocean.classroom.documentEditions.some(e=>e.locale==='zh'&&e.version==='1.0-zh.2'));
  assert.ok(ocean.classroom.documentEditions.some(e=>e.locale==='en'&&e.version===ocean.classroom.packVersion));
  assert.ok(ocean.classroom.documentEditions.every(e=>Object.keys(e).sort().join(',')==='locale,version'),'Catalog must not expose private file keys/solutions.');
  const hr=await fetch(origin+'/api/v1/health',{signal:AbortSignal.timeout(20000)});assert.equal(hr.status,200);assertPaymentRuntime(await hr.json(),{expectedMode:'live'});
  const cr=await fetch(origin+'/api/v1/credits/health',{signal:AbortSignal.timeout(20000)});assert.equal(cr.status,200);assert.equal((await cr.json()).ready,true);
  for(const locale of ['en','zh']){const denied=await fetch(origin+`/api/v1/files/ocean-v86-nonexistent/player?paper=A4&locale=${locale}`,{signal:AbortSignal.timeout(20000)});assert.equal(denied.status,401,'Private paid downloads require authentication.');}
  const baseline=(process.env.RUNNER_TEMP||'tmp/qa')+'/ocean-before.json';
  if(existsSync(baseline)){const before=JSON.parse(readFileSync(baseline));assert.deepEqual(catalog.offers.map(({sku,unitAmount,currency,saleEnabled})=>({sku,unitAmount,currency,saleEnabled})),before.prices);}
  result={status:'passed',version:'1.0-zh.2',documentEditions:ocean.classroom.documentEditions,privateAnonymousRequestsDenied:2,paymentMode:'live',creditsReady:true,pricesPreserved:existsSync(baseline),paidOwnerBrowserDownload:'not_verified_no_real_purchase_created'};break;
 }catch(error){if(attempt===attempts-1)throw error;console.log(`Waiting for matching paid Chinese edition (${attempt+1}/${attempts}); retaining current public site.`);await new Promise(r=>setTimeout(r,5000));}
}
writeFileSync((process.env.RUNNER_TEMP||'tmp/qa')+'/ocean-production-checks.json',JSON.stringify(result,null,2));
console.log('Matching Chinese paid edition is published; English selection, anonymous access guards, live payments and credits verified.');
