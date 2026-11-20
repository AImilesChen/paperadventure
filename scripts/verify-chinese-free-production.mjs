import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';

const manifest=JSON.parse(readFileSync(new URL('../output/pdf/zh-free-games/manifest.json',import.meta.url),'utf8'));
const origin='https://paperadventure.app';
const dir=process.env.RUNNER_TEMP||'tmp/qa';mkdirSync(dir,{recursive:true});
const baselinePath=dir+'/zh-release-english-before.json';
const hash=b=>createHash('sha256').update(b).digest('hex');
async function get(path){
 const r=await fetch(origin+path,{signal:AbortSignal.timeout(25000),cache:'no-store'});
 assert.equal(r.status,200,path);return r;
}
async function english(){
 const rows=[];
 for(const setting of ['home','classroom'])for(const paper of ['A4','Letter'])for(const role of ['player','guide']){
  const path=`/api/v1/samples/${setting}/${paper}/${role}`;
  const r=await get(path),bytes=Buffer.from(await r.arrayBuffer());
  assert.ok(r.headers.get('content-type')?.includes('application/pdf'));assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
  rows.push({path,sha256:hash(bytes),bytes:bytes.length});
 }
 return rows;
}
if(process.argv.includes('--capture-english')){
 writeFileSync(baselinePath,JSON.stringify(await english(),null,2));
 console.log('Saved all eight public English sample hashes; no account or order data read.');
}else{
 const attempts=process.argv.includes('--wait')?90:1;let result;
 for(let attempt=0;attempt<attempts;attempt++){
  try{
   const a=await (await get('/api/v1/samples/availability?locale=zh')).json();
   assert.equal(a.locale,'zh');
   for(const setting of ['home','classroom']){
    const files=manifest.items.filter(f=>f.setting===setting);
    assert.equal(a.editions[setting].available,true);assert.equal(a.editions[setting].version,files[0].version);
   }
   const rows=[];
   for(const f of manifest.items){
    const r=await get(`/api/v1/samples/${f.setting}/${f.paper}/${f.role}?locale=zh&version=${encodeURIComponent(f.version)}`);
    assert.ok(r.headers.get('content-type')?.includes('application/pdf'));
    assert.equal(r.headers.get('x-paper-adventure-locale'),'zh');assert.equal(r.headers.get('x-paper-adventure-pack-version'),f.version);
    const bytes=Buffer.from(await r.arrayBuffer());assert.equal(bytes.length,f.bytes);assert.equal(hash(bytes),f.sha256);
    rows.push({setting:f.setting,paper:f.paper,role:f.role,version:f.version,sha256:f.sha256,bytes:f.bytes});
   }
   result={status:'passed',origin,chineseFiles:rows,availability:a};break;
  }catch(error){
   if(attempt===attempts-1)throw error;
   console.log(`Chinese release is not ready (${attempt+1}/${attempts}); retaining current public page.`);
   await new Promise(resolve=>setTimeout(resolve,5000));
  }
 }
 if(process.argv.includes('--compare-english')){
  assert.ok(existsSync(baselinePath));const after=await english();assert.deepEqual(after,JSON.parse(readFileSync(baselinePath,'utf8')));
  result.englishSampleHashesUnchanged=8;
 }
 writeFileSync(dir+'/zh-release-production-checks.json',JSON.stringify(result,null,2));
 console.log('Verified all eight Chinese PDF bytes, locale and edition headers'+(result.englishSampleHashesUnchanged?'; all eight English files unchanged.':'.'));
}
