import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import policy from '../backend/sudoku/bank-policy.json' with {type:'json'};
import stock from '../backend/sudoku/bank-stock.json' with {type:'json'};
import {puzzles,applyAction,freshAccount,publicState} from '../backend/sudoku/service.mjs';
import {publicCatalog} from '../shared/sudoku/catalog.mjs';
import {validateCatalog,collectionsFor} from '../shared/sudoku/catalog-model.mjs';
import {digest,independentlySolve,fingerprints,validateStock,validatePuzzle} from '../scripts/sudoku-bank-validation.mjs';
import {planMaintenance,maintain,weekKey,artifacts} from '../scripts/maintain-sudoku-bank.mjs';
import {generateBatch} from '../scripts/sudoku-bank-generator.mjs';
 import {assertAppendOnlyUpgrade,needsDeployment,checkUpgrade} from '../scripts/check-sudoku-bank-upgrade.mjs';
import {sudokuApi} from '../backend/sudoku/api.mjs';

test('published and reserve banks independently verify, the original hundred are frozen, and public metadata contains no puzzles',()=>{
 assert(puzzles.length>=policy.initialPublished);assert(stock.reserve.length>=policy.reserveTarget);
 assert.equal(digest(puzzles.slice(0,100)),policy.frozenSha256);
 assert.deepEqual(validateStock(puzzles,stock.reserve,policy,{checkHints:false}),{published:puzzles.length,reserve:stock.reserve.length,frozenSha256:policy.frozenSha256});
 assert.equal(validateCatalog(publicCatalog),publicCatalog);assert.equal(publicCatalog.publishedCount,puzzles.length);
 for(const p of [...puzzles,...stock.reserve])assert.equal(independentlySolve(p.givens).solution,p.solution);
 const previousAnswers=new Set(puzzles.slice(0,100).map(p=>fingerprints(p.solution).digits));
 for(const p of [...puzzles.slice(100),...stock.reserve]){const key=fingerprints(p.solution).digits;assert(!previousAnswers.has(key),'New levels cannot reuse equivalent completed boards');previousAnswers.add(key);}
 assert(!JSON.stringify(publicCatalog).includes('givens'));assert(!JSON.stringify(publicCatalog).includes('solution'));
 assert(!JSON.stringify(publicCatalog).includes(stock.reserve[0].givens));
 assert.equal(collectionsFor(publicCatalog).length,Math.ceil(puzzles.length/100));
 assert.throws(()=>validateCatalog({...publicCatalog,publishedCount:100}),/catalogue/);
});

test('a real future-week release appends twenty verified levels with stable previous IDs and is idempotent',async()=>{
 const root=await mkdtemp(join(tmpdir(),'paw-sudoku-release-'));
 try{
  await mkdir(resolve(root,'backend/sudoku'),{recursive:true});await mkdir(resolve(root,'shared/sudoku'),{recursive:true});
  await writeFile(resolve(root,'backend/sudoku/bank-policy.json'),JSON.stringify(policy));
  for(const [path,content]of artifacts(puzzles,stock,policy))await writeFile(resolve(root,path),content);
  const nextWeek=new Date(stock.lastReleaseWeek+'T12:00:00Z');nextWeek.setUTCDate(nextWeek.getUTCDate()+7);
  const args={root,now:nextWeek,log:()=>{},generate:()=>{throw Error('Existing reserve should cover this batch');}};
  await maintain(args);
  const published=JSON.parse(await readFile(resolve(root,'backend/sudoku/puzzles.json'),'utf8'));
  assert.equal(published.length,puzzles.length+20);assert.deepEqual(published.slice(0,puzzles.length),puzzles);assert.equal(published.at(-1).id,`v1-${puzzles.length+20}`);
  const reserve=JSON.parse(await readFile(resolve(root,'backend/sudoku/bank-stock.json'),'utf8'));assert.equal(reserve.reserve.length,stock.reserve.length-20);
  await maintain(args);assert.deepEqual(JSON.parse(await readFile(resolve(root,'backend/sudoku/puzzles.json'),'utf8')),published);
 }finally{assert(root.startsWith(resolve(tmpdir())));await rm(root,{recursive:true,force:true});}
});

test('relabelled and rotated boards are duplicate puzzles; ambiguity, wrong answers and forged grades fail closed',()=>{
 const p=puzzles[99],rename=[...p.givens].map(d=>d==='0'?'0':String(10-Number(d))).join('');
 const rotated=Array.from({length:81},(_,i)=>p.givens[(8-i%9)*9+Math.floor(i/9)]).join('');
 assert.deepEqual(fingerprints(rename),fingerprints(p.givens));assert.deepEqual(fingerprints(rotated),fingerprints(p.givens));
 assert.equal(independentlySolve('0'.repeat(81)).count,2);
 assert.throws(()=>validatePuzzle({...p,solution:p.solution.replace(/^./,'0')}),/unique-solution/);
 assert.throws(()=>validatePuzzle({...p,score:p.score+1}),/grading/);
 assert.throws(()=>validateStock(puzzles,[p],policy,{checkHints:false}),/Equivalent/);
 const changed=structuredClone(puzzles);changed[0].score++;
 assert.throws(()=>validateStock(changed,[],policy,{checkHints:false}),/Original/);
});

test('generator is seeded and repeatable, uses the real difficulty floor, and cannot fill shortages with invalid puzzles',()=>{
 const args={seed:20261109,count:1,existing:puzzles.slice(0,100),policy};
 const a=generateBatch(args),b=generateBatch(args);assert.deepEqual(a,b);assert(a.puzzles[0].score>=233);assert.equal(a.puzzles[0].rank,4);
 assert.throws(()=>generateBatch({...args,maxAttempts:0}),/shortage/);
});

test('daily plans refill low stock, publish once per UTC week, and append twenty instead of resetting the campaign',()=>{
 const now=new Date('2026-11-10T12:00:00Z'),week=weekKey(now);
 assert.equal(week,'2026-11-09');assert.equal(weekKey('2026-11-09T00:00:00Z'),week);assert.equal(weekKey('2026-11-08T23:59:59Z'),'2026-11-02');
 let plan=planMaintenance(puzzles,{reserve:Array(100),lastReleaseWeek:'2026-11-02'},policy,now);assert.equal(plan.release,20);assert.equal(plan.generate,0);
 plan=planMaintenance(puzzles,{reserve:Array(40),lastReleaseWeek:week},policy,now);assert.equal(plan.release,0);assert.equal(plan.generate,60);
 plan=planMaintenance(puzzles,{reserve:Array(80),lastReleaseWeek:week},policy,now);assert.equal(plan.release,0);assert.equal(plan.generate,0);
 assert.equal(planMaintenance(puzzles.slice(0,100),{reserve:[],lastReleaseWeek:null},policy,now,{bootstrap:true}).release,200);
});

test('verification detects mismatched artifacts, refuses concurrent jobs and never rewrites damaged stock',async()=>{
 const root=await mkdtemp(join(tmpdir(),'paw-sudoku-bank-'));
 try{
  await mkdir(resolve(root,'backend/sudoku'),{recursive:true});await mkdir(resolve(root,'shared/sudoku'),{recursive:true});
  await writeFile(resolve(root,'backend/sudoku/bank-policy.json'),JSON.stringify(policy));
  for(const [path,content]of artifacts(puzzles,stock,policy))await writeFile(resolve(root,path),content);
  await maintain({root,verify:true,log:()=>{}});
  const before=await readFile(resolve(root,'backend/sudoku/puzzles.json'),'utf8');
  await maintain({root,dryRun:true,log:()=>{}});assert.equal(await readFile(resolve(root,'backend/sudoku/puzzles.json'),'utf8'),before);
  await mkdir(resolve(root,'.sudoku-bank-lock'));await assert.rejects(maintain({root}),/Another stock task/);await rm(resolve(root,'.sudoku-bank-lock'),{recursive:true});
  await writeFile(resolve(root,'shared/sudoku/catalog.mjs'),'broken');await assert.rejects(maintain({root,verify:true}),/artifact mismatch/);
  const broken=structuredClone(puzzles);broken[0].givens='0'.repeat(81);await writeFile(resolve(root,'backend/sudoku/puzzles.json'),JSON.stringify(broken));
  await assert.rejects(maintain({root}),/Original levels changed/);assert.equal(await readFile(resolve(root,'backend/sudoku/puzzles.json'),'utf8'),JSON.stringify(broken));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('levels 100 to 101 and later chapter rewards work without resetting original progress or paying replays',()=>{
 let a=freshAccount(),atHundred;
 for(let level=1;level<=110;level++){
  let r=applyAction(a,'start',{level});a=r.account;const id=puzzles[level-1].id;
  if(level===101)a=applyAction(a,'hints',{sessionId:id,tier:1,requestId:'new-hint-101'}).account;
  a.sessions[id].board=[...puzzles[level-1].solution].map(Number);
  r=applyAction(a,'complete',{sessionId:id,requestId:'new-clear-'+level});a=r.account;
  if(level===100){assert.equal(r.result.next,101);assert.equal(publicState(a).current,101);atHundred=structuredClone(a.completions);}
  if(level===110)assert.equal(a.ledger.at(-1).delta,8);
 }
 assert.equal(a.highest,110);assert.equal(a.balance,399);assert.equal(a.completions[101].assisted,true);
 for(let level=1;level<=100;level++)assert.deepEqual(a.completions[level],atHundred[level]);
 const before=a.balance;a=applyAction(a,'restart',{sessionId:'v1-100',requestId:'new-restart-100'}).account;
 a.sessions['v1-100'].board=[...puzzles[99].solution].map(Number);a=applyAction(a,'complete',{sessionId:'v1-100',requestId:'new-replay-100'}).account;
 assert.equal(a.balance,before);assert.equal(a.highest,110);
 assert.throws(()=>applyAction(a,'start',{level:puzzles.length+1}),/earlier/);
});

test('public catalogue and retired hint-free board require no account, issue no cookie and expose no reserve answers',async()=>{
 const deps={store:{},authenticate:async()=>{throw Error('Must not authenticate');}};
 let r=await sudokuApi(new Request('https://test.local/api/v1/sudoku/catalog'),{},deps);assert.equal(r.status,200);assert.equal(r.headers.get('set-cookie'),null);
 assert.deepEqual((await r.json()).catalog,publicCatalog);
 r=await sudokuApi(new Request('https://test.local/api/v1/sudoku/leaderboard?mode=independent'),{},deps);assert.equal(r.status,410);assert.equal(r.headers.get('set-cookie'),null);
});


test('deployment accepts appended catalogues and blocks bank rollback or changed old puzzles',()=>{
 const old={...publicCatalog,publishedCount:100,chapterCount:10,collectionCount:1,levels:publicCatalog.levels.slice(0,100)};
 assertAppendOnlyUpgrade(old,publicCatalog);assert.throws(()=>assertAppendOnlyUpgrade(publicCatalog,old),/downgrade/);
 const altered=structuredClone(publicCatalog);altered.levels[100].score++;
 assert.throws(()=>assertAppendOnlyUpgrade(publicCatalog,altered),/published puzzle changed/);
});

test('a failed batch retains the public bank and a verified checkpoint resumes without publishing twice',async()=>{
 const root=await mkdtemp(join(tmpdir(),'paw-sudoku-checkpoint-'));
 try{
  await mkdir(resolve(root,'backend/sudoku'),{recursive:true});await mkdir(resolve(root,'shared/sudoku'),{recursive:true});
  const smallPolicy={...policy,initialPublished:102,reserveTarget:2,refillBelow:1,generationBatch:1,weeklyRelease:2};
  const published=puzzles.slice(0,100),empty={schema:1,seed:20261109,reserve:[],lastReleaseWeek:null,releases:[]};
  await writeFile(resolve(root,'backend/sudoku/bank-policy.json'),JSON.stringify(smallPolicy));
  for(const [path,content]of artifacts(published,empty,smallPolicy))await writeFile(resolve(root,path),content);
  let index=0;const candidates=puzzles.slice(100,104).map(({id,chapter,level,...p})=>p);
  const generate=()=>({seed:++index,puzzles:[candidates[index-1]],attempts:1});
  const args={root,bootstrap:true,now:new Date('2026-11-09T12:00:00Z'),log:()=>{}};
  await assert.rejects(maintain({...args,generate:()=>{if(index===1)throw Error('Simulated shortage');return generate();}}),/Simulated shortage/);
  assert.equal(JSON.parse(await readFile(resolve(root,'backend/sudoku/puzzles.json'),'utf8')).length,100);
  assert.equal(JSON.parse(await readFile(resolve(root,'backend/sudoku/bank-candidates.json'),'utf8')).stock.reserve.length,1);
  await maintain({...args,generate});
  const final=await readFile(resolve(root,'backend/sudoku/puzzles.json'),'utf8');assert.equal(JSON.parse(final).length,102);
  await maintain({...args,generate:()=>{throw Error('Must not generate again');}});
  assert.equal(await readFile(resolve(root,'backend/sudoku/puzzles.json'),'utf8'),final);
  await assert.rejects(readFile(resolve(root,'backend/sudoku/bank-candidates.json')),e=>e.code==='ENOENT');
 }finally{assert(root.startsWith(resolve(tmpdir())));await rm(root,{recursive:true,force:true});}
});


test('maintenance retries a committed batch after API or site publication failure',async()=>{
 const old={...publicCatalog,version:'bank-0000000000000000',publishedCount:100,chapterCount:10,collectionCount:1,levels:publicCatalog.levels.slice(0,100)};
 const fetcher=(catalog,html)=>async url=>url.endsWith('/health')?Response.json({ready:true,release:'sudoku-v40',leaderboardVersion:3}):url.endsWith('/catalog')?Response.json({catalog}):new Response(html);
 assert.equal(await needsDeployment('https://test.local',fetcher(old,'')),true);
 assert.equal(await needsDeployment('https://test.local',fetcher(publicCatalog,'old site')),true);
 assert.equal(await needsDeployment('https://test.local',fetcher(publicCatalog,`<main data-sudoku-catalog="${publicCatalog.version}">`)),false);
 await assert.rejects(needsDeployment('https://test.local',async()=>new Response('unavailable',{status:503})),/stopped/);
});

test('first release recognises the original read-only health without hitting its guest-creating fallback',async()=>{
 let calls=0;const result=await checkUpgrade('https://test.local',async url=>{
  calls++;assert(url.endsWith('/health'));return Response.json({ready:true,release:'sudoku-v30',leaderboardVersion:2,weeklyRetired:true});
 });assert.equal(calls,1);assert.equal(result.needsDeployment,true);
 await assert.rejects(checkUpgrade('https://test.local',async()=>Response.json({ready:true,release:'unknown',leaderboardVersion:3})),/Unexpected API/);
});


test('bank maintenance accepts the ordinal-ranking API and still rejects unknown protocols',async()=>{
 const {checkUpgrade}=await import('../scripts/check-sudoku-bank-upgrade.mjs');
 const fetcher=version=>async url=>url.endsWith('/health')?Response.json({ready:true,release:'sudoku-v40',leaderboardVersion:version}):Response.json({catalog:publicCatalog});
 assert.equal((await checkUpgrade('https://test.local',fetcher(4))).needsDeployment,false);
 await assert.rejects(checkUpgrade('https://test.local',fetcher(99)),/Unexpected leaderboard protocol/);
});
