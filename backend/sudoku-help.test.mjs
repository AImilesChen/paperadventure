import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAccount,applyAction,puzzles} from './sudoku/service.mjs';
import {board,nextHint} from '../shared/sudoku/engine.mjs';
import {sqliteD1} from '../scripts/sqlite-d1.mjs';
import {sudokuApi,D1SudokuStore} from './sudoku/api.mjs';
const start=()=>applyAction(freshAccount(),'start',{level:1}).account;
const input=(a,mode,cost,id='help-request-001')=>({sessionId:'v1-001',helpMode:mode,expectedCost:cost,boardSnapshot:a.sessions['v1-001'].board.join(''),requestId:id});

test('a paid thinking hint gives a concrete method without exposing its verified placement',()=>{
 const a=start(),r=applyAction(a,'hints',input(a,'reasoning',1));
 assert.equal(r.account.balance,14);assert.equal(r.result.receipt.charged,1);assert.equal(r.result.hint.target.coordinate,'A3');assert.match(r.result.hint.method,/missing 3, 4, 5, 8/);
 assert.equal(r.result.hint.placement,undefined);assert.equal(r.result.hint.digit,undefined);assert(!JSON.stringify(r.result).includes(puzzles[0].solution));assert.equal(a.balance,15);
 const replay=applyAction(r.account,'hints',input(a,'reasoning',1));assert.equal(replay.account.balance,14);assert.equal(replay.account.ledger.filter(l=>l.kind==='hint').length,1);assert.equal(replay.result.receipt.charged,1);
});
test('an exact answer costs three in total, an upgrade costs two, and repeated reading is free',()=>{
 let a=start();a=applyAction(a,'hints',input(a,'reasoning',1)).account;
 const r=applyAction(a,'hints',input(a,'answer',2,'help-request-002'));a=r.account;
 assert.equal(a.balance,12);assert.equal(r.result.receipt.charged,2);assert.equal(r.result.hint.placement.coordinate,'A3');assert.equal(r.result.hint.placement.digit,4);assert.equal(r.result.helpQuote.costs.answer,0);
 const read=applyAction(a,'hints',{sessionId:'v1-001',read:true});assert.equal(read.account.balance,12);assert.equal(read.result.hints[0].placement.digit,4);
 const free=applyAction(a,'hints',input(a,'answer',0,'help-request-003'));assert.equal(free.account.balance,12);assert.equal(free.result.receipt.charged,0);
 const direct=start(),answer=applyAction(direct,'hints',input(direct,'answer',3));assert.equal(answer.account.balance,12);
});
test('legacy layer two and layer three purchases retain full next-answer access without a new debit',()=>{
 for(const tier of [2,3]){
  const a=start(),b=a.sessions['v1-001'].board.join('');a.balance=tier===3?10:12;a.paidBalance=7;a.sessions['v1-001'].hints=[{id:'old-help-'+tier,board:b,tier,...nextHint(board(b),board(puzzles[0].solution))}];
  const read=applyAction(a,'hints',{sessionId:'v1-001',read:true});assert.equal(read.result.helpQuote.costs.answer,0);assert.equal(read.result.hints[0].placement.digit,4);
  const r=applyAction(a,'hints',input(a,'answer',0));assert.equal(r.account.balance,a.balance);assert.equal(r.account.paidBalance,7);assert.equal(r.result.receipt.charged,0);
 }
 const a=start(),r=applyAction(a,'hints',{sessionId:'v1-001',tier:3,requestId:'old-client-request'});assert.equal(r.account.balance,12,'older clients never pay five for the same next answer');
});
test('stale prices, changed boards, insufficient balance and completed grids never debit credits',()=>{
 const a=start(),original=JSON.stringify(a);
 assert.throws(()=>applyAction(a,'hints',input(a,'answer',2)),e=>e.code==='HINT_QUOTE_CHANGED');
 assert.throws(()=>applyAction(a,'hints',{...input(a,'reasoning',1),boardSnapshot:'0'.repeat(81)}),e=>e.code==='HINT_BOARD_CHANGED');
 assert.equal(JSON.stringify(a),original);
 a.balance=0;assert.throws(()=>applyAction(a,'hints',input(a,'reasoning',1)),e=>e.code==='INSUFFICIENT_POINTS');assert.equal(a.balance,0);
 a.balance=15;a.sessions['v1-001'].board=board(puzzles[0].solution);assert.throws(()=>applyAction(a,'hints',input(a,'answer',3)),e=>e.code==='READY_TO_CHECK');assert.equal(a.balance,15);
});
test('a wrong entry has an explicit verified correction, not another vague instruction to erase',()=>{
 const a=start();a.sessions['v1-001'].board[1]=4;
 const r=applyAction(a,'hints',input(a,'answer',3));const p=r.result.hint.placement;
 assert.equal(p.index,1);assert.equal(p.previous,4);assert.equal(p.digit,Number(puzzles[0].solution[1]));assert.equal(p.correction,true);assert.match(p.reason,/Replace the entry/);assert.equal(r.account.balance,12);
});

test('pencil notes preserve the purchased position and its upgrade price',()=>{
 let a=start();a=applyAction(a,'hints',input(a,'reasoning',1)).account;
 const notes=Array.from({length:81},()=>[]);notes[2]=[4,8];
 a=applyAction(a,'save',{sessionId:'v1-001',board:a.sessions['v1-001'].board,notes,revision:0}).account;
 const r=applyAction(a,'hints',{sessionId:'v1-001',read:true});
 assert.equal(r.result.helpQuote.costs.reasoning,0);assert.equal(r.result.helpQuote.costs.answer,2);assert.equal(r.account.balance,14);
 assert.equal(applyAction(a,'hints',input(a,'reasoning',0,'notes-free-reread')).account.balance,14);
});

test('actual SQLite API gives one debit under concurrent unlocks and protects changed board quotes',async()=>{
 const d=sqliteD1();try{
  for(const n of ['0049_sudoku','0050_sudoku_speed','0051_sudoku_points','0052_sudoku_point_products','0053_ai_credit_help'])d.sqlite.exec(await readFile('backend/migrations/'+n+'.sql','utf8'));
  const store=new D1SudokuStore(d.db),env={DB:d.db,PUBLIC_ORIGIN:'https://test.local'},authenticate=async()=> 'alice';
  const call=async(path,body)=>{const r=await sudokuApi(new Request(env.PUBLIC_ORIGIN+'/api/v1/sudoku'+path,{method:body?'POST':'GET',headers:{origin:env.PUBLIC_ORIGIN,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env,{store,authenticate});return{status:r.status,data:await r.json()};};
  const progress=await call('/progress');assert.equal(progress.data.hintVersion,2);
  const s=(await call('/sessions',{level:1})).data.session,snapshot=s.board.join('');
  const read=await call('/sessions/'+s.id+'/hints',{read:true});assert.equal(read.data.helpQuote.costs.reasoning,1);assert.equal(read.data.hints.length,0);
  const req={helpMode:'reasoning',expectedCost:1,boardSnapshot:snapshot};
  const both=await Promise.all([call('/sessions/'+s.id+'/hints',{...req,requestId:'concurrent-help-001'}),call('/sessions/'+s.id+'/hints',{...req,requestId:'concurrent-help-002'})]);
  assert.equal(both.filter(r=>r.status===200).length,1);assert.equal(both.filter(r=>r.status===409).length,1);
  const final=await call('/progress');assert.equal(final.data.state.balance,14);assert.equal(final.data.state.ledger.filter(l=>l.kind==='hint').length,1);
  const answer=await call('/sessions/'+s.id+'/hints',{helpMode:'answer',expectedCost:2,boardSnapshot:snapshot,requestId:'concurrent-help-upgrade'});assert.equal(answer.status,200);assert.equal(answer.data.hint.placement.digit,4);assert.equal(answer.data.state.balance,12);
  const again=await call('/sessions/'+s.id+'/hints',{helpMode:'answer',expectedCost:2,boardSnapshot:snapshot,requestId:'concurrent-help-upgrade'});assert.equal(again.status,200);assert.equal(again.data.state.balance,12);assert.equal(again.data.receipt.charged,2);
 }finally{d.sqlite.close();}
});
