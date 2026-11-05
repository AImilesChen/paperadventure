export const key='paw-midnight-masquerade-v2';
const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
const nameSet=v=>String(v??'').split(/[,;/]/).map(norm).filter(Boolean).sort().join(',');
export const solutions=[
 {seat1:'Lina',seat2:'Omar',seat3:'Bea',seat4:'Iris',seat5:'Theo',seat6:'Nico'},
 {order:'D2,I,D3',interval:'interlude',method:'rear',transport:'trolley'},
 {person:'Iris',galleryPanel:'Omar,Iris',galleryTrolley:'Bea,Iris',panelTrolley:'Iris,Theo'},
 {note:'N2',batch:'II',dots:'3',signed:'yes',mark:'MOON',reject:'batch-seal'},
 {container:'music',mark:'MOON',lining:'FELT',shelf:'LOWER'},
 {person:'Iris',interval:'interlude',method:'rear',transport:'trolley',container:'music',personProof:'A3+B3+C3',intervalProof:'A2+B2',methodProof:'C2',placeProof:'N2+B5+C5'}
];
export function checkAnswer(stage,a){if(!Number.isInteger(stage)||!solutions[stage]||!a||typeof a!=='object')return false;return Object.entries(solutions[stage]).every(([k,v])=>['galleryPanel','galleryTrolley','panelTrolley'].includes(k)?nameSet(a[k])===nameSet(v):norm(a[k])===norm(v));}
export function fresh(){return {version:1,completed:[],assisted:[],hints:[0,0,0,0,0,0],drafts:{}};}
export function restore(raw){try{const p=typeof raw==='string'?JSON.parse(raw):raw;if(p?.version!==1||!Array.isArray(p.completed)||p.completed.length>6||!p.completed.every((v,i)=>v===i))return fresh();return {version:1,completed:p.completed,assisted:Array.isArray(p.assisted)?[...new Set(p.assisted.filter(v=>Number.isInteger(v)&&v>=0&&v<p.completed.length))]:[],hints:Array.from({length:6},(_,i)=>Math.max(0,Math.min(3,Number.isInteger(p.hints?.[i])?p.hints[i]:0))),drafts:p.drafts&&typeof p.drafts==='object'&&!Array.isArray(p.drafts)?p.drafts:{}};}catch{return fresh();}}
export function complete(p,stage,a,assisted=false){if(stage!==p.completed.length||!checkAnswer(stage,a))return p;return {...p,completed:[...p.completed,stage],assisted:assisted?[...p.assisted,stage]:p.assisted};}

