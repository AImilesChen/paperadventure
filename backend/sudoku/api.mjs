import {publicCatalog,catalogSummary} from '../../shared/sudoku/catalog.mjs';
import {unassistedClears,rankingStatus} from '../../shared/sudoku/ranking.mjs';
import{mergeConflicts,mergeAccounts}from'./merge.mjs';
import {applyAction,freshAccount,publicState,puzzles,SudokuError}from'./service.mjs';
import {board,logicStep}from'../../shared/sudoku/engine.mjs';
import {sha256}from'../security.mjs';
const cleanHint=h=>h?{id:h.id,tier:h.tier,texts:h.texts.slice(0,h.tier),cells:h.cells,board:h.board}:h;
const response=(data,status=200,cookie)=>Response.json({...data,...(data.session?{session:{...data.session,hints:undefined}}:{}),...(data.hint?{hint:cleanHint(data.hint)}:{})},{status,headers:{'cache-control':'no-store',...(cookie?{'set-cookie':cookie}:{})}});
const query=(db,sql,...args)=>db.prepare(sql).bind(...args);
export class D1SudokuStore{
 constructor(db){this.db=db;}
 async ensure(owner,verified){const name='Player-'+(await sha256(owner)).slice(0,6);await query(this.db,'INSERT OR IGNORE INTO sudoku_accounts(owner,state_json,nickname,verified,updated_at) VALUES(?,?,?,?,?)',owner,JSON.stringify(freshAccount()),name,verified?1:0,Date.now()).run();return this.get(owner);}
 async get(owner){const row=await query(this.db,'SELECT * FROM sudoku_accounts WHERE owner=?',owner).first();return row?{...row,state:JSON.parse(row.state_json)}:null;}
 async cas(row,state,profile={},at=Date.now()){const r=await query(this.db,'UPDATE sudoku_accounts SET state_json=?,revision=revision+1,highest=?,independent=?,assisted=?,nickname=?,listed=?,updated_at=? WHERE owner=? AND revision=?',JSON.stringify(state),state.highest,unassistedClears(state),Object.values(state.completions).filter(c=>c.assisted).length,profile.nickname??row.nickname,profile.listed??row.listed,Date.now(),row.owner,row.revision).run();return Number(r.meta?.changes)===1;}
 async ranks(mode,owner){
  const sql=`WITH eligible AS (
   SELECT owner,nickname,highest,highest AS score FROM sudoku_accounts
   WHERE version='v1' AND verified=1 AND listed=1 AND highest>0
  ), ranked AS (SELECT *,DENSE_RANK() OVER(ORDER BY score DESC) AS rank,
   ROW_NUMBER() OVER(ORDER BY score DESC,nickname COLLATE NOCASE,owner) AS position,
   COUNT(*) OVER(PARTITION BY score) AS tied FROM eligible)
  SELECT * FROM ranked WHERE position<=50 OR owner=? ORDER BY position`;
  const records=(await query(this.db,sql,owner).all()).results;
  const present=r=>({nickname:r.nickname,score:r.score,highest:r.highest,rank:r.rank,tied:r.tied>1,mine:r.owner===owner});
  const mine=records.find(r=>r.owner===owner),account=await this.get(owner);
  return {rows:records.filter(r=>r.position<=50).map(present),mine:mine?present(mine):null,personal:{highest:account?.state.highest||0,status:rankingStatus(account,'all')},limit:50,catalog:catalogSummary};
 }


}
// Separate exercises: never expose a campaign placement before an independent attempt.
const practiceSet=Array.from({length:3},(_,i)=>{const solved=Array.from({length:81},(_,j)=>((Math.floor(j/9)*3+Math.floor(j/27)+j%9+i*2)%9)+1),b=[...solved];for(const j of [0,4,9,13,22,28,37,46,55,64,73])b[j]=0;const step=logicStep(b);return {id:i+1,givens:b.join(''),index:step.index,digit:step.digit,reason:step.reason};});

export async function sudokuApi(request,env,{authenticate=async()=>null,store=env.DB?new D1SudokuStore(env.DB):null,clock=()=>Date.now()}={}){
 const url=new URL(request.url),path=url.pathname.replace('/api/v1/sudoku','');if(/^\/weekly(?:\/|$)/.test(path))return response({error:{code:'WEEKLY_RETIRED',message:'The weekly challenge has closed. Your points and saved progress are kept.'},continueUrl:'/en/sudoku/'},410);if(!store)return response({error:{code:'SUDOKU_NOT_CONFIGURED',message:'Sudoku is not available on this server yet.'}},503);
 if(path==='/catalog'&&request.method==='GET')return response({catalog:publicCatalog});
 if(path==='/leaderboard'&&url.searchParams.get('mode')==='independent')return response({error:{code:'SCORING_RETIRED',message:'The hint-free leaderboard has closed. All first clears count equally on the main leaderboard.'}},410);
 const receivedAt=clock();
 let cookie;
 try{
 if(path==='/health'&&request.method==='GET'){await store.get('health-probe');return response({ready:true,release:'sudoku-v40',weeklyVersion:0,weeklyRetired:true,leaderboardVersion:3,catalog:catalogSummary});}
 if(!['GET','POST','PUT'].includes(request.method))throw new SudokuError(405,'METHOD_NOT_ALLOWED','Unsupported method.');
 if(request.method!=='GET'&&request.headers.get('origin')!==new URL(env.PUBLIC_ORIGIN||request.url).origin)throw new SudokuError(403,'ORIGIN_DENIED','This request origin is not allowed.');
 let token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('paw_sudoku='))?.slice(11);if(!/^[a-f0-9]{64}$/.test(token||'')){token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');cookie=`paw_sudoku=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${url.protocol==='https:'?'; Secure':''}`;}
 const hash=await authenticate(request,env);let guest='guest:'+await sha256(token),owner=hash?'account:'+hash:guest;let row=await store.ensure(owner,Boolean(hash));
 if(!hash&&row.state.mergedTo){token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');cookie=`paw_sudoku=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${url.protocol==='https:'?'; Secure':''}`;guest='guest:'+await sha256(token);owner=guest;row=await store.ensure(owner,false);}
 let pendingMerge=null,mergeDone=false;
 if(hash){const g=await store.get(guest);if(g&&!row.state.imported?.includes(guest)&&(!g.state.mergedTo||g.state.mergedTo===owner)){
 if(path==='/merge'&&(request.method!=='POST'||!request.headers.get('content-type')?.includes('application/json')))throw new SudokuError(415,'JSON_REQUIRED','Send JSON merge choices.');
 let choices={};const conflicts=mergeConflicts(row.state,g.state);
 if(conflicts.length&&path!=='/merge')pendingMerge={conflicts};
 else {
 if(path==='/merge'){const raw=await request.text();if(raw.length>24000)throw new SudokuError(413,'TOO_LARGE','Request too large.');try{const submitted=JSON.parse(raw);if(submitted.ownerKey&&submitted.ownerKey!==await sha256('sudoku-cache:'+owner))throw new SudokuError(409,'OWNER_CHANGED','The account changed. Reload before linking progress.');choices=submitted.choices||{};}catch(e){if(e instanceof SudokuError)throw e;throw new SudokuError(400,'JSON_INVALID','Invalid merge choices.');}if(conflicts.some(c=>!['guest','account'].includes(choices[c.id])))throw new SudokuError(409,'MERGE_CHOICE_REQUIRED','Choose a board for every conflicting level.');}
 const claimed={...g.state,mergedTo:owner};if(!g.state.mergedTo&&!await store.cas(g,claimed,{},receivedAt))throw new SudokuError(409,'RETRY','Progress changed; retry.');
 for(let n=0;n<4;n++){row=await store.get(owner);if(row.state.imported?.includes(guest))break;const a=mergeAccounts(row.state,g.state,guest,choices);if(await store.cas(row,a,{},receivedAt)){mergeDone=true;break;}if(n===3)throw new SudokuError(409,'RETRY','Progress changed; retry.');}row=await store.get(owner);
 }
 }}
 if(pendingMerge&&request.method!=='GET')return response({error:{code:'MERGE_REQUIRED',message:'Choose which saved boards to keep before continuing.'},mergePending:pendingMerge},409,cookie);

 const storageKey=await sha256('sudoku-cache:'+owner);
 const profile=()=>({storageKey,nickname:row.nickname,listed:Boolean(row.listed),authenticated:Boolean(hash)});
 if(request.method==='GET'&&path==='/progress')return response({state:publicState(row.state),catalog:publicCatalog,profile:profile(),mergePending:pendingMerge,local:env.SUDOKU_LOCAL==='true'},200,cookie);
 if(path==='/merge'&&request.method==='POST')return response({state:publicState(row.state),profile:profile(),mergeCompleted:mergeDone},200,cookie);
 if(request.method==='GET'&&path==='/leaderboard'){const mode='all';return response({...await store.ranks(mode,owner),mode,profile:profile()},200,cookie);}
 if(request.method==='GET'&&path==='/practice')return response({challenges:practiceSet.map(({digit,reason,...p})=>({...p,claimed:row.state.practiceClaims.includes(new Date().toISOString().slice(0,10)+':'+p.id)}))},200,cookie);
 if(!request.headers.get('content-type')?.includes('application/json'))throw new SudokuError(415,'JSON_REQUIRED','Send JSON.');const text=await request.text();if(text.length>24000)throw new SudokuError(413,'TOO_LARGE','Request too large.');let input;try{input=JSON.parse(text);}catch{throw new SudokuError(400,'JSON_INVALID','Invalid JSON.');}
 if(input.ownerKey&&input.ownerKey!==storageKey)throw new SudokuError(409,'OWNER_CHANGED','The signed-in account changed. Reload the current account; your earlier device copy is kept separately.');
 const sessionPath=path;
 const match=sessionPath.match(/^\/sessions\/([A-Za-z0-9-]+)\/(save|hints|complete|restart)$/);let action=sessionPath==='/sessions'?'start':match?.[2];if(match)input.sessionId=match[1];
 if(path==='/profile')action='profile';if(path==='/practice')action='practice';if(!action)throw new SudokuError(404,'NOT_FOUND','Unknown Sudoku endpoint.');
 if((action==='save'&&request.method!=='PUT')||(action!=='save'&&request.method!=='POST'))throw new SudokuError(405,'METHOD_NOT_ALLOWED','Unsupported method.');
 for(let retry=0;retry<5;retry++){
 row=await store.get(owner);let next,result,change={};
 if(action==='profile'){if(!hash)throw new SudokuError(401,'LOGIN_REQUIRED','Sign in before joining the public leaderboard.');const nickname=String(input.nickname||'').trim();if(!/^[A-Za-z0-9 _-]{3,20}$/.test(nickname))throw new SudokuError(400,'NICKNAME_INVALID','Use 3–20 letters, numbers, spaces, underscores or hyphens.');change={nickname,listed:input.listed===true?1:0};next=row.state;result={state:publicState(next),profile:{storageKey,nickname,listed:Boolean(change.listed),authenticated:true}};}
 else if(action==='practice'){const p=practiceSet.find(p=>p.id===Number(input.id));if(!p)throw new SudokuError(400,'PRACTICE_INVALID','Unknown exercise.');if(Number(input.digit)!==p.digit)throw new SudokuError(400,'TRY_AGAIN','That digit does not follow the rule. Check the row, column and box again.');next=structuredClone(row.state);const key=new Date().toISOString().slice(0,10)+':'+p.id;if(!next.practiceClaims.includes(key)){next.practiceClaims.push(key);next.balance+=2;next.ledger.push({id:'practice-'+key,delta:2,reason:'Technique practice'});}result={state:publicState(next),message:p.reason};}
 else{const applied=applyAction(row.state,action,input,receivedAt);next=applied.account;result=applied.result;}
 if(await store.cas(row,next,change,receivedAt))return response(result,200,cookie);
 }
 throw new SudokuError(409,'RETRY','Another tab updated your progress. Retry the action.');
 }catch(e){return response({error:{code:e.code||'SUDOKU_UNAVAILABLE',message:e instanceof SudokuError?e.message:'Sudoku could not process that request. Please retry.'}},e.status||503,cookie);}
}
