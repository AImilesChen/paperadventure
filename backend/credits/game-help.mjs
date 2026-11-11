import {sha256} from '../security.mjs';
import {D1SudokuStore} from '../sudoku/api.mjs';
import {gameHelpContext,helpQuote,applyHelpUnlock} from '../../shared/credits/game-help.mjs';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store','x-robots-tag':'noindex','referrer-policy':'no-referrer'}});
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
export async function creditGameHelpApi(request,env,{authenticate,clock=()=>Date.now()}={}){
 try{
  const identity=await authenticate(request,env);if(!identity)fail(401,'LOGIN_REQUIRED','Sign in to use your shared AI credits. The first hint is free.');
  if(request.method!=='POST')fail(405,'METHOD_NOT_ALLOWED','Use a help quote or unlock request.');
  if(request.headers.get('origin')!==new URL(env.PUBLIC_ORIGIN).origin)fail(403,'ORIGIN_DENIED','Use this website to unlock help.');
  if(!request.headers.get('content-type')?.includes('application/json'))fail(415,'JSON_REQUIRED','Send JSON.');
  const text=await request.text();if(text.length>16000)fail(413,'TOO_LARGE','Game snapshot too large.');let input;try{input=JSON.parse(text);}catch{fail(400,'INVALID_JSON','Send a valid help request.');}
  if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'INVALID_JSON','Send a help request object.');
  const owner='account:'+identity,ownerKey=await sha256('sudoku-cache:'+owner);
  if(input.ownerKey!==ownerKey)fail(409,'OWNER_CHANGED','Your signed-in account changed. Refresh before spending credits.');
  const minute=Math.floor(clock()/60000);
  await env.DB.batch([env.DB.prepare('DELETE FROM ai_credit_help_limits WHERE owner=? AND minute<?').bind(owner,minute-1),env.DB.prepare('INSERT INTO ai_credit_help_limits(owner,minute,attempts) VALUES(?,?,1) ON CONFLICT(owner,minute) DO UPDATE SET attempts=attempts+1').bind(owner,minute)]);
  if((await env.DB.prepare('SELECT attempts FROM ai_credit_help_limits WHERE owner=? AND minute=?').bind(owner,minute).first()).attempts>60)fail(429,'HELP_LIMIT','Please wait a moment before requesting more help.');
  const context=gameHelpContext(input);if(!context)fail(400,'HELP_INVALID','Choose a supported game and help layer.');
  if(input.edition!==context.edition)fail(409,'EDITION_CHANGED','This game version changed. Refresh before unlocking help.');
  const store=new D1SudokuStore(env.DB);await store.ensure(owner,true);
  const action=new URL(request.url).pathname.split('/').at(-1);
  if(!['quote','unlock'].includes(action))fail(404,'NOT_FOUND','Unknown game help action.');
  const fingerprint=await sha256(JSON.stringify({game:context.game,edition:context.edition,kind:input.kind,data:context.data}));
  if(action==='unlock'&&!/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId||''))fail(400,'REQUEST_REQUIRED','Use a unique help request.');
  for(let attempt=0;attempt<4;attempt++){
   if(action==='unlock'){const old=await env.DB.prepare('SELECT * FROM ai_credit_help_requests WHERE owner=? AND request_id=?').bind(owner,input.requestId).first();if(old){if(old.fingerprint!==fingerprint)fail(409,'REQUEST_REUSED','Use a new request after changing your board or help layer.');return reply({...JSON.parse(old.response_json),replayed:true});}}
   const row=await store.get(owner),quote=helpQuote(row.state,context,input.kind);
   if(action==='quote')return reply({quote,ownerKey});
   if(input.expectedCost!==quote.cost)fail(409,'QUOTE_CHANGED','The cost changed. Review the updated quote before unlocking.');
   if(!quote.affordable)fail(402,'INSUFFICIENT_CREDITS','Not enough AI credits. No credits were deducted.');
   const applied=applyHelpUnlock(row.state,context,input.kind,input.requestId,clock()),response={quote,charged:quote.cost,balance:applied.state.balance,game:context.game,edition:context.edition,kind:input.kind,help:input.kind==='solution'?{answer:context.answer,solution:context.solution,hints:context.hints}:{hints:context.hints.slice(0,Number(input.kind.slice(-1)))}};
   const results=await env.DB.batch([
    env.DB.prepare('UPDATE sudoku_accounts SET state_json=?,revision=revision+1,updated_at=? WHERE owner=? AND revision=?').bind(JSON.stringify(applied.state),clock(),owner,row.revision),
    env.DB.prepare('INSERT OR IGNORE INTO ai_credit_help_requests(owner,request_id,fingerprint,response_json,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sudoku_accounts WHERE owner=? AND revision=? AND json_extract(state_json,\'$.lastAiCreditRequest\')=?)').bind(owner,input.requestId,fingerprint,JSON.stringify(response),clock(),owner,row.revision+1,input.requestId)
   ]);
   if(Number(results[0].meta?.changes)>0)return reply(response);
  }
  fail(409,'WALLET_BUSY','Your wallet changed. Refresh the quote and try again.');
 }catch(e){return reply({error:{code:e.code||'CREDITS_RETRY',message:e.code?e.message:'AI credits are temporarily unavailable. No completed unlock was confirmed; retry the same request.'}},e.status||503);}
}
