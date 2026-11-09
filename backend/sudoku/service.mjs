import {board,validComplete,nextHint,name}from'../../shared/sudoku/engine.mjs';
import puzzles from './puzzles.json' with {type:'json'};
export {puzzles};
export class SudokuError extends Error{constructor(status,code,message){super(message);Object.assign(this,{status,code});}}
const fail=(code,message,status=400)=>{throw new SudokuError(status,code,message);};
export const freshAccount=()=>({version:'v1',balance:15,highest:0,independent:0,current:1,sessions:{},completions:{},seen:{},ledger:[{id:'welcome',delta:15,reason:'Welcome points'}],practiceClaims:[]});
export function sanitiseBoard(raw,givens){let b;try{b=board(raw);}catch{fail('BOARD_INVALID','Send 81 digits.');}if(board(givens).some((n,i)=>n&&b[i]!==n))fail('GIVENS_CHANGED','Original digits cannot be changed.');return b;}
export function publicState(a){return{version:a.version,balance:a.balance,highest:a.highest,independent:a.independent,current:a.current,completions:a.completions,ledger:a.ledger.slice(-30),sessions:Object.fromEntries(Object.entries(a.sessions).map(([id,s])=>[id,{...s,hints:undefined}]))};}
export function applyAction(account,action,input,now=Date.now()){
 const a=structuredClone(account);if(action==='start'){const level=Number(input.level);if(!Number.isInteger(level)||level<1||level>100||level>a.highest+1)fail('LEVEL_LOCKED','Complete earlier levels first.',403);const p=puzzles[level-1];a.current=level;a.sessions[p.id]??={id:p.id,level,board:board(p.givens),notes:Array.from({length:81},()=>[]),startedAt:null,finishedAt:null,savedAt:now,revision:0,hints:[],lastHints:[],completed:false,practice:false};return {account:a,result:{session:a.sessions[p.id],puzzle:{id:p.id,level,givens:p.givens,chapter:p.chapter,rank:p.rank,techniques:p.techniques},state:publicState(a)}};}
 const s=a.sessions[input.sessionId];if(!s)fail('SESSION_NOT_FOUND','Open this level first.',404);const p=puzzles[s.level-1];
 if(action==='hints'&&input.read===true)return{account:a,result:{hints:s.hints.map(h=>({id:h.id,tier:h.tier,texts:h.texts.slice(0,h.tier),cells:h.cells,board:h.board})),state:publicState(a)}};
 if(action==='save'){
 if(s.completed)fail('ALREADY_COMPLETED','This result is already recorded.',409);
 if(input.revision!==s.revision)fail('SAVE_CONFLICT','A newer save exists. Reload this level before editing.',409);
 const b=sanitiseBoard(input.board,p.givens);if(!Array.isArray(input.notes)||input.notes.length!==81||input.notes.some(ns=>!Array.isArray(ns)||ns.length>9||ns.some(d=>!Number.isInteger(d)||d<1||d>9)))fail('NOTES_INVALID','Invalid candidate notes.');s.board=b;s.notes=input.notes.map((ns,i)=>b[i]?[]:[...new Set(ns)].sort());if(!s.startedAt&&(b.join('')!==p.givens||s.notes.some(ns=>ns.length)))s.startedAt=now;s.savedAt=now;s.revision++;return{account:a,result:{session:s}};
 }
 if(!/^[a-zA-Z0-9-]{8,100}$/.test(input.requestId||''))fail('REQUEST_ID_REQUIRED','A unique request identifier is required.');
 const previous=a.ledger.find(l=>l.id===input.requestId);if(previous)return {account:a,result:{replayed:true,state:publicState(a),session:s,...(previous.hintId?{hint:s.hints.find(h=>h.id===previous.hintId)}:{})}};
 if(action==='restart'){s.board=board(p.givens);s.notes=Array.from({length:81},()=>[]);s.completed=false;s.practice=Boolean(a.completions[s.level]);s.startedAt=null;s.finishedAt=null;s.revision++;a.ledger.push({id:input.requestId,delta:0,reason:'Restart level',at:now});return{account:a,result:{session:s,state:publicState(a)}};}
 if(action==='complete'){
 if(!validComplete(s.board,p.givens))fail('NOT_SOLVED','Some cells are empty or the board breaks a Sudoku rule.');
 s.completed=true;s.finishedAt??=now;s.startedAt??=now;
 if(!a.completions[s.level]){if(s.level!==a.highest+1)fail('LEVEL_ORDER','Complete the next unlocked level.',409);const assisted=Boolean(a.seen[s.level]);a.completions[s.level]={assisted,elapsed:Math.max(0,s.finishedAt-s.startedAt),at:now};a.highest=s.level;if(!assisted&&a.independent===s.level-1)a.independent=s.level;const delta=s.level%10===0?8:3;a.balance+=delta;a.ledger.push({id:input.requestId,delta,reason:`Level ${s.level} complete`,at:now});}else a.ledger.push({id:input.requestId,delta:0,reason:'Replay complete',at:now});return{account:a,result:{session:s,state:publicState(a),next:s.level<100?s.level+1:null}};
 }
 if(action==='hints'){
 if(s.completed)fail('ALREADY_COMPLETED','This level is already complete.',409);const tier=Number(input.tier);if(![1,2,3].includes(tier))fail('TIER_INVALID','Choose hint layer 1, 2 or 3.');const fingerprint=s.board.join('');let h=s.hints.find(x=>x.board===fingerprint);if(!h){const hint=nextHint(s.board,board(p.solution));if(hint.technique==='finished')fail('READY_TO_CHECK','The board is ready. Choose Check board.');h={id:crypto.randomUUID(),board:fingerprint,tier:0,...hint};}
 const prices=[0,1,3,5],cost=Math.max(0,prices[tier]-prices[h.tier]);if(a.balance<cost)fail('INSUFFICIENT_POINTS','Not enough points. Earn points in the technique practice.',402);
 a.balance-=cost;h.tier=Math.max(h.tier,tier);if(!s.hints.some(x=>x.id===h.id))s.hints.push(h);a.seen[s.level]=true;s.lastHints=[h.id];a.ledger.push({id:input.requestId,delta:-cost,reason:`Level ${s.level} hint layer ${tier}`,hintId:h.id,at:now});return{account:a,result:{hint:{id:h.id,tier:h.tier,texts:h.texts.slice(0,h.tier),cells:h.cells,board:h.board},state:publicState(a)}};
 }
 fail('UNKNOWN_ACTION','Unknown action.',404);
}
