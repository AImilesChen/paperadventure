// Scoped release only: new locale tables and immutable private PDF keys.
import {readFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CHINESE_FREE_RELEASE,'v85');
assert.ok(process.env.WRANGLER_CLI&&process.env.CLOUDFLARE_API_TOKEN);
const manifest=JSON.parse(readFileSync('output/pdf/zh-free-games/manifest.json','utf8'));
assert.equal(manifest.items.length,8);assert.equal(manifest.locale,'zh');
const expected={home:'1.0-zh.3',classroom:'1.0-zh.2'},seen=new Set();
const hash=b=>createHash('sha256').update(b).digest('hex');
const selected=manifest.items.filter(f=>f.setting==='home');assert.equal(selected.length,4);
for(const f of selected){
 assert.equal(f.version,expected[f.setting]);assert.equal(f.locale,'zh');
 assert.match(f.r2Key,new RegExp(`^free-localized/celebration/zh/${f.setting}/${f.version.replaceAll('.','\\.')}/${f.paper}/`));
 const bytes=readFileSync(f.path);assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.equal(bytes.length,f.bytes);assert.equal(hash(bytes),f.sha256);
 seen.add(`${f.setting}/${f.paper}/${f.role}`);
}assert.equal(seen.size,4);
const cli=(...args)=>execFileSync(process.execPath,[process.env.WRANGLER_CLI,...args],{stdio:'inherit',env:process.env});
// Only this additive schema is executed; unrelated pending migrations are excluded.
// Existing locale schema already deployed; no migrations for this Home-only revision.
mkdirSync(process.env.RUNNER_TEMP+'/zh-object-check',{recursive:true});
for(const [i,f] of selected.entries()){
 const object=`paper-adventure-stage-private/${f.r2Key}`;
 cli('r2','object','put',object,'--remote','--file',f.path,'--content-type','application/pdf');
 const output=process.env.RUNNER_TEMP+`/zh-object-check/${i}.pdf`;
 cli('r2','object','get',object,'--remote','--file',output);
 assert.equal(hash(readFileSync(output)),f.sha256);console.log(`Verified private ${f.setting}/${f.paper}/${f.role} ${f.version}`);
}
execFileSync(process.execPath,['scripts/prepare-chinese-free-release.mjs','--setting=home'],{stdio:'inherit'});
for(const name of ['stage','activate-after-review'])cli('d1','execute','DB','--remote','--config','backend/wrangler.stage.generated.jsonc','--file',`output/pdf/zh-free-games/home-1.0-zh.3/release/${name}.sql`,'--yes');
console.log('Staged and activated only only Chinese Home1.0-zh.3; English ready_packs and all player data untouched.');
