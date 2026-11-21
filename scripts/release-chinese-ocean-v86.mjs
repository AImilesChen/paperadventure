// Production execution is limited to additive paid-language tables and four immutable R2 objects.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CHINESE_OCEAN_RELEASE,'v86');
assert.ok(process.env.WRANGLER_CLI&&process.env.CLOUDFLARE_API_TOKEN&&process.env.RUNNER_TEMP);
const dir='output/pdf/ocean-classroom-zh-1.0-zh.2/',m=JSON.parse(readFileSync(dir+'manifest.json'));
const hash=b=>createHash('sha256').update(b).digest('hex'),config='backend/wrangler.stage.generated.jsonc';
assert.equal(m.version,'1.0-zh.2');assert.equal(m.items.length,4);
for(const f of m.items){const b=readFileSync(f.path);assert.equal(hash(b),f.sha256);assert.equal(b.length,f.bytes);assert.equal(b.subarray(0,5).toString(),'%PDF-');assert.ok(f.r2Key.startsWith('ready-localized/ocean/classroom/zh/1.0-zh.2/'));}
assert.equal(new Set(m.items.map(f=>`${f.paper}/${f.role}`)).size,4);
const cli=(args,capture=false)=>execFileSync(process.execPath,[process.env.WRANGLER_CLI,...args],{...(capture?{encoding:'utf8',stdio:['ignore','pipe','inherit']}:{stdio:'inherit'}),env:process.env});
function sql(command){const rows=JSON.parse(cli(['d1','execute','DB','--remote','--config',config,'--command',command,'--json'],true));assert.ok(rows.every(x=>x.success!==false));return rows.flatMap(x=>x.results||[]);}
const englishSql='SELECT ready_pack_id,paper,role,r2_key,sha256,bytes FROM ready_pack_files ORDER BY ready_pack_id,paper,role';
const before=sql(englishSql);assert.ok(before.length>=4);
const eligible=sql("SELECT id,version FROM ready_packs WHERE theme_world_id='ocean' AND setting='classroom' AND status='published' AND version IN ('1.0','v1.0') ORDER BY id");
assert.ok(eligible.length>0,'No compatible published English Ocean pack; stop before any mutation.');
const publicBefore=await (await fetch('https://paperadventure.app/api/v1/catalog',{signal:AbortSignal.timeout(25000)})).json();
const prices=publicBefore.offers.map(({sku,unitAmount,currency,saleEnabled})=>({sku,unitAmount,currency,saleEnabled}));
writeFileSync(process.env.RUNNER_TEMP+'/ocean-before.json',JSON.stringify({englishRows:before.length,englishDigest:hash(JSON.stringify(before)),prices},null,2));
// Run this one additive schema only; do not apply unrelated pending migrations.
cli(['d1','execute','DB','--remote','--config',config,'--file','backend/migrations/0055_localized_ready_packs.sql','--yes']);
mkdirSync(process.env.RUNNER_TEMP+'/ocean-object-check',{recursive:true});
const objects=[];
for(const [i,f] of m.items.entries()){
 const object='paper-adventure-stage-private/'+f.r2Key,out=process.env.RUNNER_TEMP+`/ocean-object-check/${i}.pdf`;
 cli(['r2','object','put',object,'--remote','--file',f.path,'--content-type','application/pdf']);
 cli(['r2','object','get',object,'--remote','--file',out]);assert.equal(hash(readFileSync(out)),f.sha256);
 objects.push({paper:f.paper,role:f.role,sha256:f.sha256,bytes:f.bytes});console.log(`Verified private Chinese ${f.paper}/${f.role} 1.0-zh.2`);
}
execFileSync(process.execPath,['scripts/prepare-ocean-chinese-release.mjs'],{stdio:'inherit'});
for(const name of ['stage','activate-after-review'])cli(['d1','execute','DB','--remote','--config',config,'--file',dir+`release/${name}.sql`,'--yes']);
const active=sql("SELECT l.ready_pack_id,l.status,l.version,COUNT(f.role) AS files FROM localized_ready_packs l JOIN localized_ready_pack_files f ON f.pack_id=l.id WHERE l.locale='zh' AND l.version='1.0-zh.2' AND l.id='ocean-classroom-zh-1.0-zh.2:'||l.ready_pack_id GROUP BY l.id ORDER BY l.ready_pack_id");
assert.equal(active.length,eligible.length);for(const p of active){assert.equal(p.status,'published');assert.equal(p.files,4);}
assert.deepEqual(sql(englishSql),before);
writeFileSync(process.env.RUNNER_TEMP+'/ocean-release.json',JSON.stringify({status:'private_objects_and_edition_verified',version:m.version,objects,activeEditions:active.length,englishRowsPreserved:before.length,englishDigest:hash(JSON.stringify(before)),migration:'0055_only_additive',ordersWritten:0},null,2));
console.log('Verified paid Chinese edition metadata and private bytes; all English slots unchanged. API activation follows.');
