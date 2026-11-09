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
for(let i=0;i<24;i++){try{const h=await call('/health');assert.equal(h.release,'sudoku-v30');assert.equal(h.weeklyVersion,1);assert.equal(h.leaderboardVersion,2);ready=true;break;}catch{await new Promise(r=>setTimeout(r,5000));}}
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

const weekly=await call('/weekly');assert.equal(weekly.profile.authenticated,false);assert.ok(weekly.week,'Prepared current weekly challenge required');assert.equal(weekly.catalog.length,10);
const weekPath='/weekly/'+weekly.week.id;
const weeklyGame=await call(weekPath+'/sessions',{level:1});assert.ok(!('solution'in weeklyGame.puzzle));
const weeklySaved=await call(weekPath+'/sessions/'+weeklyGame.session.id+'/save',{board:weeklyGame.session.board,notes:weeklyGame.session.notes,revision:weeklyGame.session.revision},'PUT');assert.equal(weeklySaved.session.revision,weeklyGame.session.revision+1);
const weeklyResumed=await call(weekPath+'/sessions',{level:1});assert.deepEqual(weeklyResumed.session.board,weeklyGame.session.board);
for(const mode of ['all','independent']){const list=await call(weekPath+'/leaderboard?mode='+mode);assert.ok(Array.isArray(list.rows));assert.equal(list.mine,null);assert.ok(!JSON.stringify(list.rows).includes('account:'));}
assert.equal((await call('/progress')).state.balance,15);assert.equal((await call('/progress')).state.highest,0);
console.log('Verified weekly routes, private guest progress, save/resume and both weekly boards. No hints purchased, reward claimed or public score created.');
