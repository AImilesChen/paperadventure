import {sudokuApi,D1SudokuStore} from '../sudoku/api.mjs';
import {puzzleIds} from '../../shared/puzzle-workshop.mjs';
export async function creditsHealth(env){let ready=false;try{const result=await env.DB.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name IN('ai_credit_help_requests','ai_credit_help_limits')").bind().first();ready=result?.n===2;}catch{}return Response.json({ready,version:ready?1:0,scope:'site-wide',consumers:['sudoku',...puzzleIds]},{headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});}
// Reuse the existing owner/cookie/merge contract. There is one balance, not a
// second wallet that can drift away from purchases or a concurrent Sudoku save.
export async function creditsContext(request,env,{authenticate,clock}={}){
 const url=new URL(request.url);url.pathname='/api/v1/sudoku/progress';
 const response=await sudokuApi(new Request(url,{headers:request.headers}),env,{authenticate,clock});
 if(!response.ok)return response;const info=await response.json();let state=info.state;
 if(info.profile.authenticated){const identity=await authenticate(request,env);state=(await new D1SudokuStore(env.DB).get('account:'+identity))?.state||state;}
 return Response.json({...info,credits:{balance:state.balance,paidBalance:state.paidBalance||0,unlocks:state.aiCreditUnlocks||{},spent:state.aiCreditSpent||{},ownerKey:info.profile.storageKey}},{headers:response.headers});
}
