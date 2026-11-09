import {readFile,writeFile} from 'node:fs/promises';
import {countSolutions,analyse,peers} from '../shared/sudoku/engine.mjs';
let seed=330911;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
// Normalize digit relabelling plus rotations/reflections: swapping symbols is not a new puzzle.
export function puzzleKey(raw){const b=[...raw];const variants=[];for(let rotate=0;rotate<4;rotate++)for(let mirror=0;mirror<2;mirror++){let out='';const map=new Map([['0','0']]);for(let r=0;r<9;r++)for(let c=0;c<9;c++){let y=r,x=mirror?8-c:c;for(let n=0;n<rotate;n++)[y,x]=[x,8-y];const d=b[y*9+x];if(!map.has(d))map.set(d,String(map.size));out+=map.get(d);}variants.push(out);}return variants.sort()[0];}
function solvedGrid(){const b=Array(81).fill(0);let visits=0;function fill(){if(++visits>150000)return false;let index=-1,options=[];for(let i=0;i<81;i++)if(!b[i]){const ds=[1,2,3,4,5,6,7,8,9].filter(d=>!peers[i].some(j=>b[j]===d));if(!ds.length)return false;if(index<0||ds.length<options.length){index=i;options=ds;if(ds.length===1)break;}}if(index<0)return true;for(const d of shuffle(options)){b[index]=d;if(fill())return true;}b[index]=0;return false;}return fill()?b:solvedGrid();}
const existing=JSON.parse(await readFile('backend/sudoku/weekly-puzzles.json','utf8').catch(()=>'{"weeks":[]}')).weeks;
const weekCount=Number(process.argv.find(a=>a.startsWith('--weeks='))?.split('=')[1]||4);
const nextStart=existing.length?Date.parse(existing.at(-1).id+'T00:00:00Z')+604800000:Date.parse('2026-11-09T00:00:00Z');
const start=process.argv.find(a=>a.startsWith('--start='))?.split('=')[1];
const startAt=start?Date.parse(start+'T00:00:00Z'):nextStart;
if(!Number.isInteger(weekCount)||weekCount<1||weekCount>26||!Number.isFinite(startAt)||new Date(startAt).getUTCDay()!==1||existing.some(w=>Date.parse(w.id+'T00:00:00Z')>=startAt))throw Error('Append 1–26 new weeks after the existing bank, starting on a Monday.');
const campaign=JSON.parse(await readFile('backend/sudoku/puzzles.json','utf8')),seen=new Set([...campaign,...existing.flatMap(w=>w.puzzles)].map(p=>puzzleKey(p.givens))),pool={1:[],2:[],3:[],4:[]};
const targets={1:weekCount*2,2:weekCount*3,3:weekCount*3,4:weekCount*2};
for(let attempt=0;attempt<9000;attempt++){
 const solution=solvedGrid(),b=[...solution],target=attempt%7===0?43:24+Math.floor(random()*6);let clues=81;
 for(const i of shuffle([...Array(81).keys()])){const d=b[i];b[i]=0;if(countSolutions(b).count!==1)b[i]=d;else clues--;if(clues<=target)break;}
 const report=analyse(b),givens=b.join(''),key=puzzleKey(givens);
 if(report.solved&&report.rank&&pool[report.rank].length<targets[report.rank]&&!seen.has(key)){seen.add(key);pool[report.rank].push({givens,solution:solution.join(''),rank:report.rank,score:report.score,techniques:[...new Set(report.trace.map(s=>s.technique))]});}
 if(attempt%100===0)console.log({attempt,counts:Object.fromEntries(Object.entries(pool).map(([r,p])=>[r,p.length]))});
 if(Object.entries(targets).every(([r,n])=>pool[r].length===n))break;
}
for(const[r,n]of Object.entries(targets)){if(pool[r].length<n)throw Error('Not enough verified puzzles in band '+r);pool[r].sort((a,b)=>a.score-b.score);}
const weeks=[];
for(let w=0;w<weekCount;w++){const id=new Date(startAt+w*604800000).toISOString().slice(0,10),chosen=[];for(const[rank,n]of [[1,2],[2,3],[3,3],[4,2]])chosen.push(...pool[rank].slice(w*n,(w+1)*n));weeks.push({id,puzzles:chosen.map((p,i)=>({...p,id:'w'+id.replaceAll('-','')+'-'+String(i+1).padStart(2,'0'),level:i+1,chapter:1}))});}
await writeFile('backend/sudoku/weekly-puzzles.json',JSON.stringify({version:1,weeks:[...existing,...weeks]}));console.log(`Appended ${weekCount} weeks (${weekCount*10} verified new puzzles). Existing weeks were preserved; solutions remain server-only.`);
