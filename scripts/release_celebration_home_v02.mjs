import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const manifest=JSON.parse(readFileSync('output/pdf/celebration-home-v0.2-manifest.json','utf8'));
if(manifest.version!=='v0.2'||manifest.items.length!==4)throw Error('Incomplete home pack');
const q=s=>"'"+String(s).replaceAll("'","''")+"'";
const id='celebration-home-v0.2';
for(const f of manifest.items){
 const bytes=readFileSync(f.path);
 if(bytes.length!==f.bytes||createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('PDF integrity mismatch');
 execFileSync('npx',['--yes','wrangler@4.74.0','r2','object','put','paper-adventure-stage-private/'+f.r2Key,'--file',f.path,'--content-type','application/pdf','--remote'],{stdio:'inherit'});
}
const sql=[`INSERT OR IGNORE INTO ready_packs(id,theme_world_id,setting,version,status,licence_version) VALUES (${q(id)},'celebration','home','v0.2','draft','home-free-v0.2');`];
for(const f of manifest.items)sql.push(`INSERT OR REPLACE INTO ready_pack_files(ready_pack_id,paper,role,r2_key,sha256,bytes) VALUES (${[id,f.paper,f.role,f.r2Key,f.sha256].map(q).join(',')},${f.bytes});`);
sql.push(`UPDATE ready_packs SET status='release_ready',published_at=CURRENT_TIMESTAMP WHERE id=${q(id)} AND (SELECT COUNT(*) FROM ready_pack_files WHERE ready_pack_id=${q(id)})=4;`);
writeFileSync('output/pdf/release-home-v02.sql',sql.join('\n'));
execFileSync('npx',['--yes','wrangler@4.74.0','d1','execute','paper-adventure-stage-db','--remote','--file','output/pdf/release-home-v02.sql','--yes'],{stdio:'inherit'});
for(const f of manifest.items){
 let matched=false;
 for(let attempt=0;attempt<12;attempt++){
  const r=await fetch(`https://paperadventure.app/api/v1/samples/home/${f.paper}/${f.role}?release=v02-${Date.now()}`);
  const b=Buffer.from(await r.arrayBuffer());
  if(r.ok&&createHash('sha256').update(b).digest('hex')===f.sha256){matched=true;break;}
  await new Promise(resolve=>setTimeout(resolve,3000));
 }
 if(!matched)throw Error('Actual public download differs from release: '+f.paper+'/'+f.role);
 console.log('Actual download SHA-256 matches: '+f.paper+'/'+f.role);
}
console.log('Celebration Home v0.2 released and all four actual downloads verified.');

