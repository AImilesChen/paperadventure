import {readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {generateBatch} from './sudoku-bank-generator.mjs';
import {digest,validateStock} from './sudoku-bank-validation.mjs';

export function weekKey(date){const d=new Date(date);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
export function planMaintenance(published,stock,policy,now,{bootstrap=false}={}){
 const week=weekKey(now),first=bootstrap&&published.length===policy.frozenCount;
 const due=!first&&stock.lastReleaseWeek!==week;
 const release=first?policy.initialPublished-published.length:due?policy.weeklyRelease:0;
 const refill=first||stock.reserve.length<policy.refillBelow||stock.reserve.length<release;
 const generate=refill?Math.max(0,policy.reserveTarget+release-stock.reserve.length):0;
 return{week,release,generate};
}

export function artifacts(published,stock,policy){
 const version='bank-'+digest(published).slice(0,16);
 const levels=published.map(({givens,solution,...p})=>({...p,puzzleVersion:digest(givens).slice(0,16)}));
 const summary={schema:1,version,publishedCount:published.length,chapterSize:policy.chapterSize,collectionSize:policy.collectionSize,chapterCount:Math.ceil(published.length/policy.chapterSize),collectionCount:Math.ceil(published.length/policy.collectionSize)};
 return new Map([
  ['backend/sudoku/puzzles.json',JSON.stringify(published)],
  ['backend/sudoku/bank-stock.json',JSON.stringify(stock)],
  ['shared/sudoku/catalog.mjs',`// Generated from verified published stock; solutions remain on the server.\nexport const sudokuVersion="v1";\nexport const levelCatalog=${JSON.stringify(levels)};\nexport const catalogSummary=${JSON.stringify(summary)};\nexport const publicCatalog={...catalogSummary,levels:levelCatalog};\n`],
 ]);
}

export async function maintain({root=process.cwd(),now=new Date(),bootstrap=false,verify=false,dryRun=false,log=console.log,generate=generateBatch}={}){
 const read=async p=>JSON.parse(await readFile(resolve(root,p),'utf8'));
 const policy=await read('backend/sudoku/bank-policy.json');
 const lock=resolve(root,'.sudoku-bank-lock');
 try{await mkdir(lock);}catch(e){if(e.code==='EEXIST')throw Error('Another stock task is running. No files changed.');throw e;}
 const originals=new Map();
 try{
  const published=await read('backend/sudoku/puzzles.json');
  const stock=await read('backend/sudoku/bank-stock.json').catch(e=>{if(e.code!=='ENOENT')throw e;return{schema:1,seed:20261109,reserve:[],lastReleaseWeek:null,releases:[]};});
  validateStock(published,stock.reserve,policy);
  for(const release of stock.releases)if(release.version!=='bank-'+digest(published.slice(0,release.to)).slice(0,16))throw Error('A previously released puzzle changed; publication refused');
  const expected=artifacts(published,stock,policy);
  if(verify){for(const [path,content]of expected)if(await readFile(resolve(root,path),'utf8')!==content)throw Error('Derived bank artifact mismatch: '+path);log(JSON.stringify({verified:true,published:published.length,reserve:stock.reserve.length,version:'bank-'+digest(published).slice(0,16)}));return;}
  const plan=planMaintenance(published,stock,policy,now,{bootstrap});
  if(dryRun){log(JSON.stringify({...plan,published:published.length,reserve:stock.reserve.length,dryRun:true}));return;}
  const sourceDigest=digest({published,stock,policy}),initialReserve=stock.reserve.length;
  const checkpointPath=resolve(root,'backend/sudoku/bank-candidates.json');
  const checkpoint=await read('backend/sudoku/bank-candidates.json').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(checkpoint?.sourceDigest===sourceDigest){
   validateStock(published,checkpoint.stock.reserve,policy);Object.assign(stock,checkpoint.stock);
   log(JSON.stringify({resumedCandidates:stock.reserve.length-initialReserve}));
  }
  const generationPolicy={...policy,minScore:Math.max(policy.minScore,published.at(-1).score)};
  for(let left=Math.max(0,plan.generate-(stock.reserve.length-initialReserve));left>0;){
   const count=Math.min(left,policy.generationBatch),batch=generate({seed:stock.seed,count,existing:[...published,...stock.reserve],policy:generationPolicy});
   if(batch.puzzles.length!==count||!Number.isInteger(batch.seed))throw Error('Generator batch contract failed; published bank retained');
   stock.seed=batch.seed;stock.reserve.push(...batch.puzzles);left-=count;
   const temp=resolve(lock,'qualified-candidates.json');await writeFile(temp,JSON.stringify({sourceDigest,stock}));await rename(temp,checkpointPath);
   log(JSON.stringify({qualifiedBatch:count,attempts:batch.attempts,reserve:stock.reserve.length}));
  }
  stock.reserve.sort((a,b)=>a.rank-b.rank||a.score-b.score||a.givens.localeCompare(b.givens));
  if(plan.release){if(stock.reserve.length<plan.release)throw Error('Not enough verified reserve; published bank retained.');
   const start=published.length+1;
   for(const p of stock.reserve.splice(0,plan.release)){const level=published.length+1;published.push({...p,level,chapter:Math.floor((level-1)/policy.chapterSize)+1,id:`v1-${String(level).padStart(3,'0')}`});}
   stock.lastReleaseWeek=plan.week;stock.releases.push({week:plan.week,from:start,to:published.length,version:'bank-'+digest(published).slice(0,16)});
  }
  validateStock(published,stock.reserve,policy);
  const files=artifacts(published,stock,policy);
  // All validation happens before writes. CI commits these files together and
  // deploys a single immutable API bundle before the corresponding site bundle.
  for(const [path,content]of files){const full=resolve(root,path);originals.set(full,await readFile(full,'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;}));await writeFile(resolve(lock,path.replaceAll('/','_')),content);}
  try{for(const [path]of files)await rename(resolve(lock,path.replaceAll('/','_')),resolve(root,path));}
  catch(e){for(const [full,content]of originals){if(content===null)await rm(full,{force:true});else await writeFile(full,content);}throw e;}
  await rm(checkpointPath,{force:true});
  log(JSON.stringify({updated:true,published:published.length,reserve:stock.reserve.length,version:'bank-'+digest(published).slice(0,16)}));
 }finally{await rm(lock,{recursive:true,force:true});}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const allowed=new Set(['--bootstrap','--verify','--dry-run']);
 if(process.argv.slice(2).some(a=>!allowed.has(a)))throw Error('Use --bootstrap, --verify or --dry-run. Production dates come from UTC system time.');
 await maintain({bootstrap:process.argv.includes('--bootstrap'),verify:process.argv.includes('--verify'),dryRun:process.argv.includes('--dry-run')});
}
