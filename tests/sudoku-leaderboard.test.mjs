import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {freshAccount,applyAction,publicState,puzzles} from '../backend/sudoku/service.mjs';
import {mergeAccounts} from '../backend/sudoku/merge.mjs';
import {D1SudokuStore,sudokuApi} from '../backend/sudoku/api.mjs';
import {unassistedClears} from '../shared/sudoku/ranking.mjs';

function complete(account,level,assisted=false){let a=applyAction(account,'start',{level}).account;const sessionId=puzzles[level-1].id;if(assisted)a=applyAction(a,'hints',{sessionId,tier:1,requestId:'hint-level-'+level}).account;a.sessions[sessionId].board=[...puzzles[level-1].solution].map(Number);return applyAction(a,'complete',{sessionId,requestId:'clear-level-'+level}).account;}
async function fixture(){const db=new DatabaseSync(':memory:');db.exec(await readFile('backend/migrations/0049_sudoku.sql','utf8'));const d1={prepare(sql){return{bind(...args){return{async first(){return db.prepare(sql).get(...args)||null;},async all(){return{results:db.prepare(sql).all(...args)};},async run(){return{meta:{changes:db.prepare(sql).run(...args).changes}};}};}};}};return{db,store:new D1SudokuStore(d1)};}
function historical(highest,assisted=[]){const a=freshAccount();a.highest=highest;a.independent=0;for(let i=1;i<=highest;i++)a.completions[i]={assisted:assisted.includes(i),elapsed:1000,at:i};return a;}
async function insert(f,owner,a,{listed=1,verified=1,nickname=owner}={}){await f.store.ensure(owner,Boolean(verified));f.db.prepare('UPDATE sudoku_accounts SET state_json=?,highest=?,independent=0,listed=?,verified=?,nickname=? WHERE owner=?').run(JSON.stringify(a),a.highest,listed,verified,nickname,owner);}

test('an assisted first level does not block later hint-free clears, and replay cannot improve first-clear records',()=>{
 let a=complete(freshAccount(),1,true);a=complete(a,2);a=complete(a,3);assert.equal(a.independent,2);assert.equal(a.highest,3);
 a=applyAction(a,'restart',{sessionId:puzzles[0].id,requestId:'restart-test-1'}).account;a.sessions[puzzles[0].id].board=[...puzzles[0].solution].map(Number);a=applyAction(a,'complete',{sessionId:puzzles[0].id,requestId:'replay-test-1'}).account;
 assert.equal(a.independent,2);assert.equal(a.completions[1].assisted,true);assert.equal(Object.keys(a.completions).length,3);
});
test('legacy public progress derives a cumulative score without changing saved history or wallet',()=>{
 const a=historical(20,[1,4,9,12,18]),before=JSON.stringify(a);assert.equal(publicState(a).independent,15);assert.equal(JSON.stringify(a),before);assert.equal(unassistedClears(a),15);
});
test('SQLite ranks old accounts from real records, excludes private/guest/zero scores, ties fairly and leaks no owners',async()=>{
 const f=await fixture();try{
  await insert(f,'account:alice',historical(20,[1,4,9,12,18]),{nickname:'Alice'});await insert(f,'account:bob',historical(20,[2,5,10,13,19]),{nickname:'Bob'});await insert(f,'account:carol',historical(18),{nickname:'Carol'});
  await insert(f,'private-secret',historical(100),{listed:0});await insert(f,'guest-secret',historical(100),{verified:0});await insert(f,'zero',historical(0));
  let r=await f.store.ranks('all','account:alice');assert.deepEqual(r.rows.map(x=>[x.nickname,x.rank,x.score]),[['Alice',1,20],['Bob',1,20],['Carol',2,18]]);assert.equal(r.mine.tied,true);
  r=await f.store.ranks('all','account:alice');assert.deepEqual(r.rows.map(x=>[x.nickname,x.rank,x.score]),[['Alice',1,20],['Bob',1,20],['Carol',2,18]]);assert.equal(r.personal.unassisted,undefined);assert(!JSON.stringify(r).includes('account:'));assert(!JSON.stringify(r).includes('secret'));
  assert.equal((await f.store.get('account:alice')).state.independent,0,'read compatibility does not rewrite stored history');
 }finally{f.db.close();}
});
test('personal rank remains accurate outside the top 50, including a tie crossing the cutoff',async()=>{
 const f=await fixture();try{for(let i=0;i<55;i++)await insert(f,'account:'+i,historical(i===54?1:2),{nickname:'Player'+String(i).padStart(3,'0')});
  let r=await f.store.ranks('all','account:54');assert.equal(r.rows.length,50);assert.equal(r.mine.rank,2);assert.equal(r.mine.score,1);assert(r.rows.every(x=>!x.mine));
  r=await f.store.ranks('all','account:53');assert.equal(r.mine.rank,1);assert.equal(r.mine.tied,true);assert.equal(r.rows.length,50);
 }finally{f.db.close();}
});
test('entry statuses admit hinted clears equally and distinguish guest, private and no clear',async()=>{
 const f=await fixture();try{for(const [owner,a,options,status]of [['guest',historical(2),{verified:0},'guest'],['private',historical(2),{listed:0},'private'],['new',historical(0),{},'no_clears'],['assisted',historical(2,[1,2]),{},'ranked'],['eligible',historical(2,[1]),{},'ranked']]){await insert(f,owner,a,options);const r=await f.store.ranks('all',owner);assert.equal(r.personal.status,status);assert.equal(Boolean(r.mine),status==='ranked');}}finally{f.db.close();}
});
test('writes and account linking recalculate legacy scores while keeping assisted first clears',async()=>{
 const f=await fixture();try{const a=historical(4,[1]);await insert(f,'account:old',a);const row=await f.store.get('account:old');assert(await f.store.cas(row,row.state));assert.equal(f.db.prepare('SELECT independent FROM sudoku_accounts WHERE owner=?').get('account:old').independent,3);
  const m=mergeAccounts(a,historical(6,[1,5]),'guest-test');assert.equal(m.highest,6);assert.equal(m.independent,4);assert(m.completions[1].assisted);
 }finally{f.db.close();}
});
test('API gives guests useful personal progress without exposing their scores publicly',async()=>{
 const f=await fixture();try{const r=await sudokuApi(new Request('https://test.local/api/v1/sudoku/leaderboard'),{PUBLIC_ORIGIN:'https://test.local'},{store:f.store});assert.equal(r.status,200);const d=await r.json();assert.equal(d.mode,'all');assert.equal(d.personal.status,'guest');assert.equal(d.limit,50);assert.deepEqual(d.rows,[]);assert.equal(d.mine,null);assert.match(r.headers.get('cache-control'),/no-store/);}finally{f.db.close();}
});

test('linking progress cannot retroactively mark a hint-free first clear assisted by a later replay hint',()=>{
 const a=historical(2),g=historical(2);a.seen[1]=true;const m=mergeAccounts(a,g,'guest-replay');assert.equal(m.completions[1].assisted,false);assert.equal(m.independent,2);assert.equal(m.seen[1],true);
 g.completions[1].assisted=true;const conservative=mergeAccounts(a,g,'guest-assisted');assert.equal(conservative.completions[1].assisted,true);assert.equal(conservative.independent,1);
});


test('total ranks count levels beyond 100 equally for hinted and unaided players',async()=>{
 const f=await fixture();try{
  await insert(f,'account:hinted',historical(150,Array.from({length:150},(_,i)=>i+1)),{nickname:'HintsWelcome'});
  await insert(f,'account:unaided',historical(150),{nickname:'Unaided'});
  const r=await f.store.ranks('all','account:hinted');assert.equal(r.rows.length,2);
  assert(r.rows.every(row=>row.score===150&&row.rank===1&&row.tied));
  assert(!JSON.stringify(r).includes('unassisted'));assert.equal(r.personal.status,'ranked');
 }finally{f.db.close();}
});
