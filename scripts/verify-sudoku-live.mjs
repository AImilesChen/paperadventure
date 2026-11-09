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
for(let i=0;i<24;i++){try{const h=await call('/health');assert.equal(h.release,'sudoku-v30');ready=true;break;}catch{await new Promise(r=>setTimeout(r,5000));}}
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
