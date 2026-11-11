import {catalogSummary} from '../shared/sudoku/catalog.mjs';
import assert from 'node:assert/strict';
const origin='https://paperadventure.app';
let cookie='';
async function call(path,body,method='POST'){
 const response=await fetch(origin+'/api/v1/sudoku'+path,{method:body===undefined?'GET':method,headers:{cookie,...(body===undefined?{}:{origin,'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
 const updated=response.headers.getSetCookie?.().find(c=>c.startsWith('paw_sudoku='));if(updated)cookie=updated.split(';')[0];
 assert.equal(response.status,200,path+': '+response.status);
 assert.match(response.headers.get('cache-control')||'',/no-store/);
 return response.json();
}
let ready=false;
for(let i=0;i<24;i++){try{const h=await call('/health');assert.equal(h.release,'sudoku-v40');assert.equal(h.catalog?.version,catalogSummary.version);assert.equal(h.weeklyVersion,0);assert.equal(h.weeklyRetired,true);assert.equal(h.leaderboardVersion,4);assert.equal(h.speedVersion,1);assert.equal(h.pointsVersion,1);ready=true;break;}catch{await new Promise(r=>setTimeout(r,5000));}}
assert.ok(ready,'Matching Sudoku backend not ready');
const progress=await call('/progress');assert.equal(progress.state.highest,0);assert.equal(progress.state.balance,15);assert.equal(progress.profile.authenticated,false);
assert.equal(progress.speedEnabled,true);
const prepared=await call('/sessions',{level:1,prepare:true});assert.equal(prepared.ready,true);assert.equal(prepared.puzzle,undefined);
const game=await call('/sessions',{level:1,timing:'speed-v1'});assert.equal(game.session.speed.status,'running');assert.equal(game.puzzle.level,1);assert.ok(!('solution'in game.puzzle));
const board=[...game.session.board],notes=Array.from({length:81},()=>[]);
const saved=await call('/sessions/'+game.session.id+'/save',{board,notes,revision:game.session.revision,attemptId:game.session.speed.id},'PUT');
assert.equal(saved.session.revision,game.session.revision+1);
const resumed=await call('/sessions',{level:1,timing:'speed-v1'});assert.deepEqual(resumed.session.board,board);assert.equal(resumed.session.speed.id,game.session.speed.id);assert.equal(resumed.session.speed.startedAt,game.session.speed.startedAt);
const speed=await call('/leaderboard?mode=speed&level=1');assert.ok(Array.isArray(speed.rows));assert.equal(speed.latest.status,'running');assert.equal(speed.best,null);assert.ok(!JSON.stringify(speed.rows).includes('account:'));
const deniedReview=await fetch(origin+'/api/v1/sudoku/speed/reviews',{signal:AbortSignal.timeout(20000)});assert.equal(deniedReview.status,403);
const final=await call('/progress');assert.equal(final.state.balance,15);assert.equal(final.state.highest,0);
const ranks=await call('/leaderboard');assert.ok(Array.isArray(ranks.rows));assert.ok(!JSON.stringify(ranks.rows).includes('account:'));
assert.equal(ranks.scoring,'clears-time-v1');assert.equal(ranks.personal.elapsedMs,null);assert.equal(ranks.personal.timedClears,0);assert.equal(ranks.limit,50);assert(ranks.participants>=ranks.rows.length);assert.deepEqual(ranks.rows.map(r=>r.rank),ranks.rows.map((_,i)=>i+1));assert(ranks.rows.every(r=>r.tied===false&&(r.elapsedMs===null||Number.isSafeInteger(r.elapsedMs)&&r.elapsedMs>0)));
console.log('Verified total ranking contract clears-time-v1, unique positions, personal timing and public count.');
console.log('Verified Sudoku speed-v1: board-hidden ready, server-timed start/resume, persistent save, speed queries, admin denial, balance and no-store. No paid action or public score created.');

for(const path of ['/weekly','/weekly/2026-11-09/progress','/weekly/2026-11-09/sessions','/weekly/2026-11-09/leaderboard']){
 const r=await fetch(origin+'/api/v1/sudoku'+path,{signal:AbortSignal.timeout(20000)});assert.equal(r.status,410);const d=await r.json();assert.equal(d.error.code,'WEEKLY_RETIRED');assert.equal(r.headers.get('set-cookie'),null);
}
for(const [path,target]of [['/en/sudoku/weekly/','/en/sudoku/'],['/en/sudoku/weekly/play/?week=2026-11-09&level=9','/en/sudoku/'],['/en/sudoku/weekly/leaderboard/?week=2026-11-09','/en/sudoku/leaderboard/']]){
 const r=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});assert.equal(r.status,308);assert.equal(r.headers.get('location'),origin+target);
}
console.log('Verified retired weekly APIs return410 without creating progress; old URLs redirect to campaign and total leaderboard.');

const catalogueResponse=await fetch(origin+'/api/v1/sudoku/catalog',{signal:AbortSignal.timeout(20000)});
assert.equal(catalogueResponse.status,200);assert.equal(catalogueResponse.headers.get('set-cookie'),null);
const catalogue=(await catalogueResponse.json()).catalog;assert.equal(catalogue.version,catalogSummary.version);assert.equal(catalogue.publishedCount,catalogSummary.publishedCount);
assert.ok(catalogue.levels.every(p=>!('givens'in p)&&!('solution'in p)));
const retiredScoring=await fetch(origin+'/api/v1/sudoku/leaderboard?mode=independent',{signal:AbortSignal.timeout(20000)});
assert.equal(retiredScoring.status,410);assert.equal(retiredScoring.headers.get('set-cookie'),null);
console.log('Verified public catalogue, private puzzle boundary and retired hint-free scoring.');
