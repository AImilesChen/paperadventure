// PREPARE ONLY: no network, uploading, migration, publishing or remote mutations.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('output/pdf/zh-free-games/manifest.json',root),'utf8'));
if(manifest.locale!=='zh'||manifest.items.length!==8)throw Error('Incomplete localized bundle');
const q=value=>"'"+String(value).replaceAll("'","''")+"'";
const dir=new URL('output/pdf/zh-free-games/release/',root);mkdirSync(dir,{recursive:true});
const stage=[],activate=[],rollback=[];
const identities=new Set();
for(const setting of ['home','classroom']){
 const files=manifest.items.filter(f=>f.setting===setting),version=files[0]?.version,id=`celebration-zh-${setting}-${version}`;
 if(!version||files.some(f=>f.version!==version))throw Error('Mixed pack versions');
 if(new Set(files.map(f=>`${f.paper}/${f.role}`)).size!==4)throw Error('Incomplete pair');
 stage.push(`INSERT OR IGNORE INTO localized_free_packs(id,locale,setting,version,source_english_version,status) VALUES (${q(id)},'zh',${q(setting)},${q(version)},${q(manifest.sourceEnglishVersion)},'draft');`);
 for(const f of files){
  const data=readFileSync(new URL(f.path,root));
  if(!data.subarray(0,5).equals(Buffer.from('%PDF-'))||data.length!==f.bytes||createHash('sha256').update(data).digest('hex')!==f.sha256||!f.r2Key.startsWith('free-localized/celebration/zh/'))throw Error('Artifact verification failed');
  const key=`${setting}/${f.paper}/${f.role}`;if(identities.has(key))throw Error('Duplicate artifact');identities.add(key);
  stage.push(`INSERT OR IGNORE INTO localized_free_pack_files(pack_id,paper,role,r2_key,sha256,bytes) VALUES (${[id,f.paper,f.role,f.r2Key,f.sha256].map(q).join(',')},${f.bytes});`);
 }
 const matches=files.map(f=>`(paper=${q(f.paper)} AND role=${q(f.role)} AND sha256=${q(f.sha256)} AND bytes=${f.bytes} AND r2_key=${q(f.r2Key)})`).join(' OR ');
 activate.push(`UPDATE localized_free_packs SET status='published',published_at=CURRENT_TIMESTAMP WHERE id=${q(id)} AND status='draft' AND (SELECT COUNT(*) FROM localized_free_pack_files WHERE pack_id=${q(id)})=4 AND (SELECT COUNT(*) FROM localized_free_pack_files WHERE pack_id=${q(id)} AND (${matches}))=4;`);
 rollback.push(`UPDATE localized_free_packs SET status='withdrawn' WHERE id=${q(id)} AND locale='zh';`);
}
for(const [name,lines]of [['stage',stage],['activate-after-review',activate],['withdraw-chinese-only',rollback]])writeFileSync(new URL(`${name}.sql`,dir),lines.join('\n')+'\n');
writeFileSync(new URL('release-plan.json',dir),JSON.stringify({status:'prepared_not_executed',migration:'backend/migrations/0054_localized_free_samples.sql',requiredFlags:{FREE_SAMPLE_ENABLED:'true',FREE_SAMPLE_ZH_ENABLED:'true'},beforeRelease:['Review sample PDFs','Perform actual print/cut and child play tests','Create and verify rollback Git tag from then-current live commit','Apply additive schema and upload all eight private objects','Stage and verify hashes before activating','Publish API before frontend; then verify actual downloads for both languages'],rollback:['Disable FREE_SAMPLE_ZH_ENABLED','Withdraw only these Chinese pack IDs','Restore scoped frontend/API delta if needed; do not restore DB or change English packs'],uploads:manifest.items.map(({path,r2Key,sha256,bytes})=>({path,r2Key,sha256,bytes}))},null,2)+'\n');
console.log('Prepared Chinese-only staging, activation and withdrawal SQL; no remote changes executed.');
