export const key='paw-thirteenth-hour-v2';
export const corrected=(reading,fast)=>((reading-fast-1)%12+12)%12+1;
export const solutions=[{tool:'A',socket:'SQUARE',teeth:'2',turn:'LEFT'},{direction:'RIGHT',source:'W-01'},{c:'2',p:'5',w:'7',state:'BEFORE'},{direction:'RIGHT',mark:'LEAF',bridge:'connected',directionProof:'W-01',markProof:'M-01'},{c:'5',p:'7',w:'11',state:'AFTER'},{direction:'RIGHT',mark:'LEAF',c:'5',p:'7',w:'11',state:'AFTER',driveProof:'W-01+M-01',pinProof:'AFTER+R-01',stateProof:'TAB'}];
const norm=v=>String(v??'').trim().toUpperCase();
export const checkAnswer=(n,a)=>Number.isInteger(n)&&!!solutions[n]&&!!a&&Object.entries(solutions[n]).every(([k,v])=>norm(a[k])===norm(v));
export const fresh=()=>({version:1,completed:[],assisted:[],hints:[0,0,0,0,0,0],drafts:{},lampOpened:false,wallAfter:false});
export function restore(raw){try{const p=typeof raw==='string'?JSON.parse(raw):raw;if(p?.version!==1||!Array.isArray(p.completed)||p.completed.length>6||!p.completed.every((v,i)=>v===i))return fresh();return {version:1,completed:p.completed,assisted:[...new Set((Array.isArray(p.assisted)?p.assisted:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<p.completed.length))],hints:Array.from({length:6},(_,i)=>Math.max(0,Math.min(3,Number.isInteger(p.hints?.[i])?p.hints[i]:0))),drafts:p.drafts&&typeof p.drafts==='object'&&!Array.isArray(p.drafts)?p.drafts:{},lampOpened:p.completed.length>=2||p.completed.length>=1&&p.lampOpened===true,wallAfter:p.completed.length>=5||p.completed.length>=4&&p.wallAfter===true};}catch{return fresh();}}
export const openLamp=p=>p.completed.length>=1?{...p,lampOpened:true}:p;
export const moveWall=p=>p.completed.length>=4?{...p,wallAfter:true}:p;
export function complete(p,n,a,assist=false){if(n!==p.completed.length||!checkAnswer(n,a))return p;if(!assist&&(n===1&&!p.lampOpened||n>=4&&!p.wallAfter))return p;return {...p,completed:[...p.completed,n],assisted:assist?[...p.assisted,n]:p.assisted,lampOpened:p.lampOpened||assist&&n>=1,wallAfter:p.wallAfter||assist&&n>=4};}
export function sceneState(p){const n=p.completed.length;return {lamp:p.lampOpened?'OPEN':'CLOSED',wall:p.wallAfter?'AFTER':'BEFORE',drive:n>=4?'CONNECTED':'OFF',extension:n>=6?'OPEN':'CLOSED',history:n>=3?'2-5-7':null,pins:n>=5?'5-7-11':null};}

