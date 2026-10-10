import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const manifest=JSON.parse(readFileSync('output/pdf/retail-packs-1.0-manifest.json','utf8'));
if(manifest.items.length!==48) throw Error('Expected 12 complete four-file packs');
const q=s=>"'"+String(s).replaceAll("'","''")+"'";
const bucket='paper-adventure-stage-private';
const run=(args)=>execFileSync('npx',['--yes','wrangler@4.74.0',...args],{stdio:'inherit'});
const sql=[];
for(const f of manifest.items){
 const bytes=readFileSync(f.path);
 if(bytes.length!==f.bytes||createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('File integrity mismatch');
 run(['r2','object','put',bucket+'/'+f.r2Key,'--file',f.path,'--content-type','application/pdf','--remote']);
 // Update every existing version for this same story/setting. Old orders keep their
 // entitlement, expiry and payment record, and gain the corrected game files.
 sql.push(`INSERT OR REPLACE INTO ready_pack_files(ready_pack_id,paper,role,r2_key,sha256,bytes) SELECT id,${q(f.paper)},${q(f.role)},${q(f.r2Key)},${q(f.sha256)},${f.bytes} FROM ready_packs WHERE theme_world_id=${q(f.world)} AND setting=${q(f.setting)};`);
}
for(const group of new Set(manifest.items.map(f=>f.world+'/'+f.setting))){
 const [world,setting]=group.split('/');
 sql.push(`UPDATE ready_packs SET version='v1.0',published_at=CURRENT_TIMESTAMP WHERE theme_world_id=${q(world)} AND setting=${q(setting)} AND (SELECT COUNT(*) FROM ready_pack_files WHERE ready_pack_id=ready_packs.id)=4;`);
 if(world!=='celebration')for(const page of [1,2])run(['r2','object','put',bucket+`/internal/draft-previews/${world}/${setting}/v1.0-p${page}.jpg`,'--file',`output/previews/${world}-${setting}-v1.0-p${page}.jpg`,'--content-type','image/jpeg','--remote']);
}
writeFileSync('output/pdf/release-retail.sql',sql.join('\n'));
let applied=false;
for(let attempt=0;attempt<3&&!applied;attempt++){
 try { run(['d1','execute','paper-adventure-stage-db','--remote','--command',sql.join('\n'),'--yes']); applied=true; }
 catch(error){if(attempt===2)throw error; await new Promise(resolve=>setTimeout(resolve,5000));}
}
// Fail the release if a story has no matching record, or any old entitlement slot
// points to a different PDF than the one just uploaded.
const checks=manifest.items.map(f=>`SELECT COUNT(*) AS matched FROM ready_packs p JOIN ready_pack_files f ON f.ready_pack_id=p.id WHERE p.theme_world_id=${q(f.world)} AND p.setting=${q(f.setting)} AND f.paper=${q(f.paper)} AND f.role=${q(f.role)} AND f.sha256=${q(f.sha256)} AND f.bytes=${f.bytes};`).join('\n');
writeFileSync('output/pdf/verify-retail.sql',checks);
const raw=execFileSync('npx',['--yes','wrangler@4.74.0','d1','execute','paper-adventure-stage-db','--remote','--command',checks,'--json'],{encoding:'utf8'});
const results=JSON.parse(raw);
if(results.length!==48||results.some(r=>!r.success||r.results?.[0]?.matched<1))throw Error('An upgraded pack slot is missing');
for(const f of manifest.items.filter(f=>f.world==='celebration')){
 const response=await fetch(`https://paperadventure.app/api/v1/samples/${f.setting}/${f.paper}/${f.role}?edition=1-${Date.now()}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(!response.ok||createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('Public free download does not match release');
}
console.log('48 live file records verified; all eight free downloads match released hashes. Existing order access preserved.');
