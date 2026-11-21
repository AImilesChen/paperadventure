// LOCAL PREPARATION ONLY. No network, uploads, database execution or deployment.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir='output/pdf/ocean-classroom-zh-1.0-zh.2/',m=JSON.parse(readFileSync(dir+'manifest.json'));
assert.equal(m.items.length,4);const stage=[],activate=[],q=s=>"'"+String(s).replaceAll("'","''")+"'";
const where="p.theme_world_id='ocean' AND p.setting='classroom' AND p.status='published' AND p.version IN ('1.0','v1.0')";
stage.push(`INSERT OR IGNORE INTO localized_ready_packs(id,ready_pack_id,locale,version,source_english_version,status) SELECT 'ocean-classroom-zh-1.0-zh.2:'||p.id,p.id,'zh','1.0-zh.2',p.version,'draft' FROM ready_packs p WHERE ${where};`);
for(const f of m.items){
 const b=readFileSync(f.path);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);assert.equal(b.length,f.bytes);assert.equal(f.version,m.version);assert.equal(f.locale,'zh');
 stage.push(`INSERT OR IGNORE INTO localized_ready_pack_files(pack_id,paper,role,r2_key,sha256,bytes) SELECT 'ocean-classroom-zh-1.0-zh.2:'||p.id,${[f.paper,f.role,f.r2Key,f.sha256].map(q).join(',')},${f.bytes} FROM ready_packs p WHERE ${where};`);
}
const matches=m.items.map(f=>`(f.paper=${q(f.paper)} AND f.role=${q(f.role)} AND f.r2_key=${q(f.r2Key)} AND f.sha256=${q(f.sha256)} AND f.bytes=${f.bytes})`).join(' OR ');
activate.push(`UPDATE localized_ready_packs SET status='published',published_at=CURRENT_TIMESTAMP WHERE locale='zh' AND version='1.0-zh.2' AND status='draft' AND id='ocean-classroom-zh-1.0-zh.2:'||ready_pack_id AND (SELECT COUNT(*) FROM localized_ready_pack_files f WHERE f.pack_id=localized_ready_packs.id)=4 AND (SELECT COUNT(*) FROM localized_ready_pack_files f WHERE f.pack_id=localized_ready_packs.id AND (${matches}))=4;`);
mkdirSync(dir+'release',{recursive:true});
for(const [name,lines] of [['stage',stage],['activate-after-review',activate],['withdraw', ["UPDATE localized_ready_packs SET status='withdrawn' WHERE locale='zh' AND version='1.0-zh.2' AND id='ocean-classroom-zh-1.0-zh.2:'||ready_pack_id;"]]])writeFileSync(dir+`release/${name}.sql`,lines.join('\n')+'\n');
writeFileSync(dir+'release/plan.json',JSON.stringify({status:'prepared_not_executed',migration:'0055_localized_ready_packs.sql',flag:'PAID_READY_ZH_ENABLED',objects:m.items.map(({r2Key,sha256,bytes,path})=>({r2Key,sha256,bytes,path})),order:['Create/verify rollback tag from latest live source','Deploy additive migration/API with feature off','Upload four private objects and verify read-back hashes','Stage/activate matching locale edition','Enable flag, verify owner/expired/refunded/other-owner behavior','Publish matching frontend and verify real paid download; never create a real charge for testing'],rollback:['Disable PAID_READY_ZH_ENABLED or withdraw only this Chinese revision','Restore scoped frontend/API if needed after checking later changes','Retain all English slots, orders, entitlements, payment data and additive schema']},null,2));
console.log('Prepared paid Chinese edition plan only; English slots and orders untouched.');
