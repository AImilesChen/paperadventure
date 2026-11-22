// LOCAL PREPARATION ONLY: no network, upload or remote database execution.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
export function prepareChristmasHomeRelease(){
 const q=s=>"'"+String(s).replaceAll("'","''")+"'",stage=[],activate=[],withdraw=[],objects=[];
 const where="p.theme_world_id='christmas' AND p.setting='home' AND p.status='published' AND p.version IN ('1.0','v1.0')";
 for(const [locale,version] of [['en','1.1'],['zh','1.0-zh.1']]){
  const m=JSON.parse(readFileSync(`output/pdf/christmas-home-${locale}-${version}/manifest.json`));
  assert.equal(m.items.length,4);assert.equal(new Set(m.items.map(f=>f.paper+'/'+f.role)).size,4);
  const id=`christmas-home-${locale}-${version}:`;
  stage.push(`INSERT OR IGNORE INTO localized_ready_packs(id,ready_pack_id,locale,version,source_english_version,status) SELECT ${q(id)}||p.id,p.id,${q(locale)},${q(version)},p.version,'draft' FROM ready_packs p WHERE ${where};`);
  for(const f of m.items){
   const b=readFileSync(f.path);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);assert.equal(b.length,f.bytes);
   assert.equal(f.locale,locale);assert.equal(f.version,version);assert.ok(f.r2Key.startsWith(`ready-localized/christmas/home/${locale}/${version}/`));
   stage.push(`INSERT OR IGNORE INTO localized_ready_pack_files(pack_id,paper,role,r2_key,sha256,bytes) SELECT ${q(id)}||p.id,${[f.paper,f.role,f.r2Key,f.sha256].map(q).join(',')},${f.bytes} FROM ready_packs p WHERE ${where};`);
   objects.push(f);
  }
  const matches=m.items.map(f=>`(f.paper=${q(f.paper)} AND f.role=${q(f.role)} AND f.r2_key=${q(f.r2Key)} AND f.sha256=${q(f.sha256)} AND f.bytes=${f.bytes})`).join(' OR ');
  const scope=`locale=${q(locale)} AND version=${q(version)} AND id=${q(id)}||ready_pack_id`;
  activate.push(`UPDATE localized_ready_packs SET status='published',published_at=CURRENT_TIMESTAMP WHERE ${scope} AND status='draft' AND EXISTS (SELECT 1 FROM ready_packs p WHERE p.id=ready_pack_id AND ${where} AND p.version=source_english_version) AND (SELECT COUNT(*) FROM localized_ready_pack_files f WHERE f.pack_id=localized_ready_packs.id)=4 AND (SELECT COUNT(*) FROM localized_ready_pack_files f WHERE f.pack_id=localized_ready_packs.id AND (${matches}))=4;`);
  withdraw.push(`UPDATE localized_ready_packs SET status='withdrawn' WHERE ${scope};`);
 }
 const dir='output/pdf/christmas-home-release-v95';mkdirSync(dir,{recursive:true});
 const sql={stage:stage.join('\n'),activate:activate.join('\n'),withdraw:withdraw.join('\n')};
 for(const [name,value] of Object.entries(sql))writeFileSync(`${dir}/${name}.sql`,value+'\n');
 writeFileSync(`${dir}/plan.json`,JSON.stringify({status:'prepared_not_executed',feature:'PAID_CHRISTMAS_HOME_EDITIONS_ENABLED',existingSchema:'0055_localized_ready_packs.sql',objects,
  order:['Verify latest live source and create/verify a fresh rollback tag','Deploy Christmas Home-aware API with independent Christmas Home feature off; retain Forest Home, Space Home, Dinosaur Home and all five Classroom flags','Upload eight private objects and verify read-back byte sizes and hashes','Stage both Christmas Home editions and activate only complete exact manifests','Enable Christmas Home flag; verify catalogue, old and new paid orders and access restrictions','Publish matching Christmas Home frontend only after API advertises en 1.1 and zh 1.0-zh.1; verify actual entitled downloads'],
  rollback:['Withdraw only these two Christmas Home revisions and disable only Christmas Home feature as appropriate','Keep language-aware API guards for already-created revised orders; do not replace with an API that silently serves original English','Restore scoped frontend changes after checking subsequent releases','Never overwrite original English ready_pack_files, Forest Home, Space Home, Dinosaur Home or Ocean/Museum/Library/Weather/Workshop editions, orders, payments or entitlements; keep additive schema']},null,2));
 return sql;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){prepareChristmasHomeRelease();console.log('Prepared eight-object Christmas Home release locally only.');}
