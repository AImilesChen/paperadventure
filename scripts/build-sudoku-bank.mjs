import {writeFile,mkdir}from'node:fs/promises';
import{countSolutions,analyse}from'../shared/sudoku/engine.mjs';
let seed=280911;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const pool=[],counts={};
for(let attempt=0;attempt<7000;attempt++){
 const ds=shuffle([1,2,3,4,5,6,7,8,9]),rows=shuffle([0,1,2]).flatMap(g=>shuffle([0,1,2]).map(n=>g*3+n)),cols=shuffle([0,1,2]).flatMap(g=>shuffle([0,1,2]).map(n=>g*3+n));const answer=rows.flatMap(r=>cols.map(c=>ds[(r*3+Math.floor(r/3)+c)%9])),b=[...answer];
 const target=attempt%8===0?43:24+Math.floor(random()*6);let clues=81;
 for(const i of shuffle(Array.from({length:81},(_,i)=>i))){let n=b[i];b[i]=0;if(countSolutions(b).count!==1)b[i]=n;else clues--;if(clues<=target)break;}
 const report=analyse(b);if(!report.solved)continue;counts[report.rank]=(counts[report.rank]||0)+1;
 if(pool.filter(p=>p.rank===report.rank).length<100)pool.push({givens:b.join(''),solution:answer.join(''),rank:report.rank,score:report.score,techniques:[...new Set(report.trace.map(s=>s.technique))],steps:report.trace.length});
 if([1,2,3,4].every(r=>pool.filter(p=>p.rank===r).length>=[10,25,35,30][r-1]))break;
}
const chosen=[];for(const [rank,count]of [[1,10],[2,25],[3,35],[4,30]]){const ps=pool.filter(p=>p.rank===rank).sort((a,b)=>a.score-b.score);if(ps.length<count)throw Error(`Insufficient rank ${rank}: ${ps.length}; ${JSON.stringify(counts)}`);for(let k=0;k<count;k++)chosen.push(ps[Math.floor(k*ps.length/count)]);}
const levels=chosen.map((p,i)=>({...p,level:i+1,chapter:Math.floor(i/10)+1,id:`v1-${String(i+1).padStart(3,'0')}`}));
await mkdir('backend/sudoku',{recursive:true});await writeFile('backend/sudoku/puzzles.json',JSON.stringify(levels));await writeFile('shared/sudoku/catalog.mjs','export const sudokuVersion="v1";\nexport const levelCatalog='+JSON.stringify(levels.map(({solution,givens,...p})=>p))+';\n');console.log({levels:levels.length,counts,first:levels[0].score,last:levels.at(-1).score});
