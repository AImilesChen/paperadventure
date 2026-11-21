// Authorized production release: eight immutable Library PDFs plus scoped edition rows.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {prepareLibraryRelease} from './prepare-library-editions-release.mjs';
assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.LIBRARY_RELEASE,'v88');
assert.ok(process.env.WRANGLER_CLI&&process.env.CLOUDFLARE_API_TOKEN&&process.env.RUNNER_TEMP);
const config='backend/wrangler.stage.generated.jsonc',hash=b=>createHash('sha256').update(b).digest('hex');
const cli=(args,capture=false)=>execFileSync(process.execPath,[process.env.WRANGLER_CLI,...args],{...(capture?{encoding:'utf8',stdio:['ignore','pipe','inherit']}:{stdio:'inherit'}),env:process.env});
function sql(command){const rows=JSON.parse(cli(['d1','execute','DB','--remote','--config',config,'--command',command,'--json'],true));assert.ok(rows.every(x=>x.success!==false));return rows.flatMap(x=>x.results||[]);}
const manifests=[['en','1.1'],['zh','1.0-zh.1']].map(([l,v])=>JSON.parse(readFileSync(`output/pdf/library-classroom-${l}-${v}/manifest.json`)));
const items=manifests.flatMap(m=>m.items);assert.equal(items.length,8);
for(const m of manifests){assert.equal(m.items.length,4);assert.equal(new Set(m.items.map(f=>f.paper+'/'+f.role)).size,4);for(const f of m.items){const b=readFileSync(f.path);assert.equal(hash(b),f.sha256);assert.equal(b.length,f.bytes);assert.equal(b.subarray(0,5).toString(),'%PDF-');assert.ok(f.r2Key.startsWith(`ready-localized/library/classroom/${m.locale}/${m.version}/`));}}
const eligible=sql("SELECT id,version FROM ready_packs WHERE theme_world_id='library' AND setting='classroom' AND status='published' AND version IN ('1.0','v1.0') ORDER BY id");assert.ok(eligible.length>0,'No compatible original Library edition; stop before writes.');
const englishSql='SELECT ready_pack_id,paper,role,r2_key,sha256,bytes FROM ready_pack_files ORDER BY ready_pack_id,paper,role';
const otherEditionsSql="SELECT l.*,f.paper,f.role,f.r2_key,f.sha256,f.bytes FROM localized_ready_packs l JOIN ready_packs p ON p.id=l.ready_pack_id LEFT JOIN localized_ready_pack_files f ON f.pack_id=l.id WHERE p.theme_world_id<>'library' ORDER BY l.id,f.paper,f.role";
const before=sql(englishSql),otherEditionsBefore=sql(otherEditionsSql);assert.ok(before.length>=4&&otherEditionsBefore.length>=4);
const catalog=await (await fetch('https://paperadventure.app/api/v1/catalog',{signal:AbortSignal.timeout(25000)})).json();
writeFileSync(process.env.RUNNER_TEMP+'/library-before.json',JSON.stringify({englishRows:before.length,englishDigest:hash(JSON.stringify(before)),otherEditionsDigest:hash(JSON.stringify(otherEditionsBefore)),prices:catalog.offers.map(({sku,unitAmount,currency,saleEnabled})=>({sku,unitAmount,currency,saleEnabled})),otherThemes:catalog.themes.filter(t=>t.id!=='library')},null,2));
// 0055 already exists. No new or unrelated migration is executed.
const objects=[];mkdirSync(process.env.RUNNER_TEMP+'/library-object-check',{recursive:true});
for(const [i,f] of items.entries()){
 const object='paper-adventure-stage-private/'+f.r2Key,out=process.env.RUNNER_TEMP+`/library-object-check/${i}.pdf`;
 cli(['r2','object','put',object,'--remote','--file',f.path,'--content-type','application/pdf']);
 cli(['r2','object','get',object,'--remote','--file',out]);assert.equal(hash(readFileSync(out)),f.sha256);assert.equal(readFileSync(out).length,f.bytes);
 objects.push({locale:f.locale,paper:f.paper,role:f.role,sha256:f.sha256,bytes:f.bytes});console.log(`Verified private Library ${f.locale}/${f.paper}/${f.role}.`);
}
prepareLibraryRelease();
for(const name of ['stage','activate'])cli(['d1','execute','DB','--remote','--config',config,'--file',`output/pdf/library-release-v88/${name}.sql`,'--yes']);
const active=sql("SELECT l.ready_pack_id,l.locale,l.version,l.status,COUNT(f.role) files FROM localized_ready_packs l JOIN localized_ready_pack_files f ON f.pack_id=l.id WHERE l.id IN ('library-classroom-en-1.1:'||l.ready_pack_id,'library-classroom-zh-1.0-zh.1:'||l.ready_pack_id) GROUP BY l.id ORDER BY l.id");
assert.equal(active.length,eligible.length*2);for(const row of active){assert.equal(row.status,'published');assert.equal(row.files,4);}
assert.deepEqual(sql(englishSql),before);assert.deepEqual(sql(otherEditionsSql),otherEditionsBefore);
writeFileSync(process.env.RUNNER_TEMP+'/library-release.json',JSON.stringify({status:'private_bytes_and_editions_verified',objects,activeEditions:active,englishRowsPreserved:before.length,englishDigest:hash(JSON.stringify(before)),otherEditionsDigest:hash(JSON.stringify(otherEditionsBefore)),migrationExecuted:false,ordersWritten:0},null,2));
console.log('Eight private PDFs read-back verified; original English slots and Ocean, Museum and other editions unchanged. API activation follows.');
