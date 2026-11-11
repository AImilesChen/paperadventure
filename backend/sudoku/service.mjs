import {createHelp,publicHelp} from './help.mjs';
import {helpQuote,helpCost,hintAccess} from '../../shared/sudoku/help-model.mjs';
import {unassistedClears} from '../../shared/sudoku/ranking.mjs';
import {board,validComplete,nextHint,name}from'../../shared/sudoku/engine.mjs';
import puzzles from './puzzles.json' with {type:'json'};
import {catalogSummary,publicCatalog} from '../../shared/sudoku/catalog.mjs';
export {puzzles};
if(puzzles.length!==catalogSummary.publishedCount)throw Error('Sudoku catalogue and private bank differ');
export class SudokuError extends Error{constructor(status,code,message){super(message);Object.assign(this,{status,code});}}
const fail=(code,message,status=400)=>{throw new SudokuError(status,code,message);};
export const freshAccount=()=>({version:'v1',balance:15,highest:0,independent:0,current:1,sessions:{},completions:{},seen:{},ledger:[{id:'welcome',delta:15,reason:'Welcome points'}],practiceClaims:[]});
export function sanitiseBoard(raw,givens){let b;try{b=board(raw);}catch{fail('BOARD_INVALID','Send 81 digits.');}if(board(givens).some((n,i)=>n&&b[i]!==n))fail('GIVENS_CHANGED','Original digits cannot be changed.');return b;}
export function publicState(a){return{version:a.version,balance:a.balance,highest:a.highest,independent:unassistedClears(a),current:a.completions[a.current]&&a.current===a.highest?Math.min(a.highest+1,puzzles.length):a.current,catalog:catalogSummary,completions:a.completions,ledger:a.ledger.slice(-30),sessions:Object.fromEntries(Object.entries(a.sessions).filter(([,s])=>s.level===a.current).map(([id,s])=>[id,{...s,hints:undefined}]))};}
const newSpeed=(p,now)=>({id:crypto.randomUUID(),level:p.level,puzzleVersion:publicPuzzleVersion(p.level),rules:'speed-v1',startedAt:now,finishedAt:null,status:'running',reason:'',saves:0});
const publicPuzzleVersion=level=>publicCatalog.levels[level-1].puzzleVersion;
export function applyAction(account,action,input,now=Date.now(),{bank=puzzles,reward=null}={}){
 const a=structuredClone(account);a.independent=unassistedClears(a);if(action==='start'){const level=Number(input.level);if(!Number.isInteger(level)||level<1||level>bank.length||level>a.highest+1)fail('LEVEL_LOCKED','Complete earlier levels first.',403);const p=bank[level-1],existing=Boolean(a.sessions[p.id]);a.current=level;if(input.prepare&&!a.sessions[p.id])return{account:a,result:{ready:true,level,state:publicState(a)}};a.sessions[p.id]??={id:p.id,level,board:board(p.givens),notes:Array.from({length:81},()=>[]),startedAt:null,finishedAt:null,savedAt:now,revision:0,hints:[],lastHints:[],completed:false,practice:false};if(input.timing==='speed-v1'&&!existing&&!a.sessions[p.id].startedAt&&!a.sessions[p.id].speed&&!a.sessions[p.id].completed){a.sessions[p.id].speed=newSpeed(p,now);a.sessions[p.id].startedAt=now;}return {account:a,result:{session:a.sessions[p.id],puzzle:{id:p.id,level,givens:p.givens,chapter:p.chapter,rank:p.rank,techniques:p.techniques},state:publicState(a)}};}
 const s=a.sessions[input.sessionId];if(!s)fail('SESSION_NOT_FOUND','Open this level first.',404);const p=bank[s.level-1];if(s.speed&&input.attemptId!==s.speed.id&&!(action==='restart'&&a.ledger.some(l=>l.id===input.requestId&&l.sessionId===s.id&&l.reason==='Restart level')))fail('ATTEMPT_CHANGED','This timed attempt changed. Reload before continuing.',409);
 if(action==='hints'&&input.read===true)return{account:a,result:{hints:s.hints.map(h=>publicHelp(h,p)),helpQuote:helpQuote(s.board.join(''),s.hints),state:publicState(a)}};
 if(action==='save'){
 if(s.completed)fail('ALREADY_COMPLETED','This result is already recorded.',409);
 if(input.revision!==s.revision)fail('SAVE_CONFLICT','A newer save exists. Reload this level before editing.',409);
 const b=sanitiseBoard(input.board,p.givens);if(!Array.isArray(input.notes)||input.notes.length!==81||input.notes.some(ns=>!Array.isArray(ns)||ns.length>9||ns.some(d=>!Number.isInteger(d)||d<1||d>9)))fail('NOTES_INVALID','Invalid candidate notes.');s.board=b;s.notes=input.notes.map((ns,i)=>b[i]?[]:[...new Set(ns)].sort());if(!s.startedAt&&(b.join('')!==p.givens||s.notes.some(ns=>ns.length)))s.startedAt=now;s.savedAt=now;s.revision++;if(s.speed)s.speed.saves++;return{account:a,result:{session:s}};
 }
 if(!/^[a-zA-Z0-9-]{8,100}$/.test(input.requestId||''))fail('REQUEST_ID_REQUIRED','A unique request identifier is required.');
 const previous=a.ledger.find(l=>l.id===input.requestId);if(previous)return {account:a,result:{replayed:true,state:publicState(a),session:s,next:s.completed&&s.level<bank.length?s.level+1:null,...(previous.hintId?{hint:publicHelp(s.hints.find(h=>h.id===previous.hintId),p),helpQuote:helpQuote(s.board.join(''),s.hints),receipt:{hintId:previous.hintId,charged:-previous.delta,balanceAfter:previous.balanceAfter??a.balance,mode:previous.hintMode||hintAccess(s.hints.find(h=>h.id===previous.hintId)?.tier),replayed:true}}:{})}};
 if(action==='restart'){if(s.speed){a.lastSpeedAttempt={...s.speed,status:s.speed.finishedAt?s.speed.status:'abandoned'};}s.speed=input.timing==='speed-v1'?newSpeed(p,now):null;s.board=board(p.givens);s.notes=Array.from({length:81},()=>[]);s.completed=false;s.practice=Boolean(a.completions[s.level]);s.startedAt=s.speed?.startedAt??null;s.finishedAt=null;s.revision++;a.ledger.push({id:input.requestId,delta:0,sessionId:s.id,reason:'Restart level',at:now});return{account:a,result:{session:s,state:publicState(a)}};}
 if(action==='complete'){
 if(input.board&&!s.completed){if(input.revision!==s.revision)fail('SAVE_CONFLICT','A newer save exists. Reload before submitting.',409);s.board=sanitiseBoard(input.board,p.givens);s.revision++;}
 if(!validComplete(s.board,p.givens))fail('NOT_SOLVED','Some cells are empty or the board breaks a Sudoku rule.');
 s.completed=true;s.finishedAt??=now;s.startedAt??=now;if(s.speed&&!s.speed.finishedAt){const t=s.speed;t.finishedAt=now;t.elapsedMs=now-t.startedAt;t.seconds=Math.max(1,Math.ceil(t.elapsedMs/1000));t.status=t.elapsedMs<0?'invalid':t.elapsedMs<3000?'pending':'valid';t.reason=t.status==='pending'?'Very short attempt; review timing evidence.':t.status==='invalid'?'Clock order invalid':'';}
 if(!a.completions[s.level]){if(s.level!==a.highest+1)fail('LEVEL_ORDER','Complete the next unlocked level.',409);const assisted=Boolean(a.seen[s.level]);a.completions[s.level]={assisted,elapsed:Math.max(0,s.finishedAt-s.startedAt),at:now,...(s.speed?{timingAttemptId:s.speed.id,timingStatus:s.speed.status}:{})};a.highest=s.level;a.independent=unassistedClears(a);const delta=reward??(s.level%10===0?8:3);a.balance+=delta;a.ledger.push({id:input.requestId,delta,reason:`Level ${s.level} complete`,at:now});}else a.ledger.push({id:input.requestId,delta:0,reason:'Replay complete',at:now});return{account:a,result:{session:s,state:publicState(a),next:s.level<bank.length?s.level+1:null}};
 }
 if(action==='hints'){
 if(s.completed)fail('ALREADY_COMPLETED','This level is already complete.',409);
 const modern=input.helpMode!==undefined,mode=modern?input.helpMode:Number(input.tier)===1?'reasoning':'answer',tier=modern?(mode==='reasoning'?1:3):Number(input.tier);
 if(!['reasoning','answer'].includes(mode)||![1,2,3].includes(tier))fail('TIER_INVALID','Choose a thinking hint or a next-cell answer.');
 const fingerprint=s.board.join('');let h=s.hints.find(x=>x.board===fingerprint);const cost=helpCost(mode,h?.tier);
 if(modern){
  if(input.boardSnapshot!==fingerprint)fail('HINT_BOARD_CHANGED','Your board changed. Refresh the help options before unlocking.',409);
  if(!Number.isInteger(input.expectedCost)||input.expectedCost!==cost)fail('HINT_QUOTE_CHANGED','Your help price changed. Refresh the options and confirm the new price.',409);
 }
 const step=createHelp(fingerprint,p);if(!step)fail('READY_TO_CHECK','The board is ready. Choose Check board.');
 if(a.balance<cost)fail('INSUFFICIENT_POINTS','Not enough AI credits. Add credits or earn them in technique practice.',402);
 if(!h)h={id:crypto.randomUUID(),board:fingerprint,tier:0,texts:[],createdAt:now};
 h.format=2;h.target=step.target;h.digit=step.digit;h.correction=step.correction;h.previous=step.previous;delete h.help;h.texts=[step.method,step.reason,`${step.target.coordinate} = ${step.digit}. ${step.reason}`];h.cells=step.cells;h.updatedAt=now;
 const free=a.balance-(a.paidBalance||0);a.paidBalance=Math.max(0,(a.paidBalance||0)-Math.max(0,cost-free));a.balance-=cost;h.tier=Math.max(h.tier,tier);
 if(!s.hints.some(x=>x.id===h.id))s.hints.push(h);a.seen[s.level]=true;s.lastHints=[h.id];
 a.ledger.push({id:input.requestId,delta:-cost,kind:'hint',reason:`Level ${s.level} ${mode==='answer'?'next-cell answer':'thinking hint'}`,hintId:h.id,hintMode:mode,balanceAfter:a.balance,at:now});
 return{account:a,result:{hint:publicHelp(h,p),helpQuote:helpQuote(fingerprint,s.hints),receipt:{hintId:h.id,charged:cost,balanceAfter:a.balance,mode,replayed:false},state:publicState(a)}};
 }

 fail('UNKNOWN_ACTION','Unknown action.',404);
}
