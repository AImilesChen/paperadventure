const prefix='paw-sudoku-device-v1:';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const key=c=>prefix+c.owner+':edit-history:'+encodeURIComponent(c.sessionId);
function valid(frame,givens){return frame&&Array.isArray(frame.values)&&frame.values.length===81&&frame.values.every((n,i)=>Number.isInteger(n)&&n>=0&&n<=9&&(!Number(givens[i])||n===Number(givens[i])))&&Array.isArray(frame.notes)&&frame.notes.length===81&&frame.notes.every(ns=>Array.isArray(ns)&&ns.length<=9&&new Set(ns).size===ns.length&&ns.every(n=>Number.isInteger(n)&&n>=1&&n<=9));}
const empty=()=>({undo:[],redo:[]});
export function readEditHistory(context,storage=localStorage){try{
 if(!context.owner||!context.sessionId)return empty();const saved=JSON.parse(storage.getItem(key(context)));
 if(!saved||saved.version!==1||saved.attemptId!==(context.attemptId||null)||saved.givens!==context.givens||!same(saved.current,context.current)||!valid(saved.current,context.givens))return empty();
 if(!['undo','redo'].every(k=>Array.isArray(saved[k])&&saved[k].length<=200&&saved[k].every(f=>valid(f,context.givens))))return empty();
 return{undo:saved.undo,redo:saved.redo};
 }catch{return empty();}}
export function writeEditHistory(context,history,storage=localStorage){try{
 if(!context.owner||!context.sessionId||!valid(context.current,context.givens))return false;
 const saved={version:1,attemptId:context.attemptId||null,givens:context.givens,current:context.current,undo:history.undo.slice(-200),redo:history.redo.slice(-200)};
 if(![...saved.undo,...saved.redo].every(f=>valid(f,context.givens)))return false;
 storage.setItem(key(context),JSON.stringify(saved));return true;
 }catch{return false;}}
