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
for(let i=0;i<24;i++){try{const h=await call('/health');assert.equal(h.release,'sudoku-v30');assert.equal(h.weeklyVersion,0);assert.equal(h.weeklyRetired,true);assert.equal(h.leaderboardVersion,2);ready=true;break;}catch{await new Promise(r=>setTimeout(r,5000));}}
assert.ok(ready,'Matching Sudoku backend not ready');
const progress=await call('/progress');assert.equal(progress.state.highest,0);assert.equal(progress.state.balance,15);assert.equal(progress.profile.authenticated,false);
const game=await call('/sessions',{level:1});assert.equal(game.puzzle.level,1);assert.ok(!('solution'in game.puzzle));
const board=[...game.session.board],notes=Array.from({length:81},()=>[]);
const saved=await call('/sessions/'+game.session.id+'/save',{board,notes,revision:game.session.revision},'PUT');
assert.equal(saved.session.revision,game.session.revision+1);
const resumed=await call('/sessions',{level:1});assert.deepEqual(resumed.session.board,board);
const final=await call('/progress');assert.equal(final.state.balance,15);assert.equal(final.state.highest,0);
const ranks=await call('/leaderboard');assert.ok(Array.isArray(ranks.rows));assert.ok(!JSON.stringify(ranks.rows).includes('account:'));
console.log('Verified Sudoku v30: guest session, persistent save/resume, balance, leaderboard and no-store. No paid action or public score created.');

for(const path of ['/weekly','/weekly/2026-11-09/progress','/weekly/2026-11-09/sessions','/weekly/2026-11-09/leaderboard']){
 const r=await fetch(origin+'/api/v1/sudoku'+path,{signal:AbortSignal.timeout(20000)});assert.equal(r.status,410);const d=await r.json();assert.equal(d.error.code,'WEEKLY_RETIRED');assert.equal(r.headers.get('set-cookie'),null);
}
for(const [path,target]of [['/en/sudoku/weekly/','/en/sudoku/'],['/en/sudoku/weekly/play/?week=2026-11-09&level=9','/en/sudoku/'],['/en/sudoku/weekly/leaderboard/?week=2026-11-09','/en/sudoku/leaderboard/']]){
 const r=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});assert.equal(r.status,308);assert.equal(r.headers.get('location'),origin+target);
}
console.log('Verified retired weekly APIs return410 without creating progress; old URLs redirect to campaign and total leaderboard.');
