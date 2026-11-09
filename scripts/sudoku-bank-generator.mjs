import {analyse} from '../shared/sudoku/engine.mjs';
import {fingerprints,validatePuzzle} from './sudoku-bank-validation.mjs';

// Generator search uses per-cell peer masks recomputed on each branch. The stock
// validator separately maintains row/column/box occupancy and checks the answer.
const peerIndices=Array.from({length:81},(_,i)=>Array.from({length:81},(_,j)=>j).filter(j=>i!==j&&(Math.floor(i/9)===Math.floor(j/9)||i%9===j%9||Math.floor(i/27)===Math.floor(j/27)&&Math.floor(i%9/3)===Math.floor(j%9/3))));
function unique(b){
 let found=0;
 function search(){let cell=-1,options=0,best=10;
  for(let i=0;i<81;i++)if(!b[i]){let used=0;for(const j of peerIndices[i])used|=1<<b[j];const mask=1022&~used;let count=0;for(let t=mask;t;t&=t-1)count++;if(!count)return;if(count<best){cell=i;options=mask;best=count;if(count===1)break;}}
  if(cell<0){found++;return;}
  for(let m=options;m&&found<2;m&=m-1){const bit=m&-m;b[cell]=31-Math.clz32(bit);search();}b[cell]=0;
 }
 search();return found===1;
}

export function generateBatch({seed,count,existing,policy,maxAttempts=80000}){
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const shuffle=raw=>{const a=[...raw];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const known=existing.map(p=>fingerprints(p.givens)),digits=new Set(known.map(f=>f.digits)),masks=new Set(known.map(f=>f.mask)),accepted=[];
 const answers=new Set(existing.map(p=>fingerprints(p.solution).digits));
 const parents=existing.filter(p=>p.rank>=policy.minRank&&p.score>=policy.minScore);
 let attempts=0;
 while(accepted.length<count&&attempts++<maxAttempts){
  const ds=shuffle([1,2,3,4,5,6,7,8,9]),rows=shuffle([0,1,2]).flatMap(g=>shuffle([0,1,2]).map(n=>g*3+n)),cols=shuffle([0,1,2]).flatMap(g=>shuffle([0,1,2]).map(n=>g*3+n));
  let answer=rows.flatMap(r=>cols.map(c=>ds[(r*3+Math.floor(r/3)+c)%9])),b=[...answer];
  // Try removing every clue while maintaining uniqueness. Difficulty is accepted
  // only after a complete logical trace, never inferred from the clue count.
  if(parents.length&&random()<0.99){
   const parent=parents[Math.floor(random()*parents.length)];answer=[...parent.solution].map(Number);b=[...parent.givens].map(Number);
   const empty=shuffle(Array.from({length:81},(_,i)=>i).filter(i=>!b[i]));
   for(const i of empty.slice(0,4))b[i]=answer[i];
   let removed=0;
   for(const i of shuffle(Array.from({length:81},(_,i)=>i).filter(i=>parent.givens[i]!=='0'))){const d=b[i];b[i]=0;if(!unique(b))b[i]=d;else removed++;if(removed===6)break;}
   // Require substantial changes in the clue pattern, not a one-cell variant.
   if(removed<4)continue;
  }else for(const i of shuffle(Array.from({length:81},(_,i)=>i))){const d=b[i];b[i]=0;if(!unique(b))b[i]=d;}
  // Reorder bands, rows within bands, stacks and columns, then relabel digits.
  // Mutated clue patterns must not keep reusing their parent's completed board.
  b=rows.flatMap(r=>cols.map(c=>b[r*9+c]?ds[b[r*9+c]-1]:0));
  answer=rows.flatMap(r=>cols.map(c=>ds[answer[r*9+c]-1]));
  const answerKey=fingerprints(answer.join('')).digits;if(answers.has(answerKey))continue;
  const report=analyse(b);if(!report.solved||report.rank<policy.minRank||report.score<policy.minScore)continue;
  const fp=fingerprints(b.join(''));if(digits.has(fp.digits)||masks.has(fp.mask))continue;
  const p={givens:b.join(''),solution:answer.join(''),rank:report.rank,score:report.score,techniques:[...new Set(report.trace.map(s=>s.technique))],steps:report.trace.length};
  validatePuzzle(p);digits.add(fp.digits);masks.add(fp.mask);answers.add(answerKey);accepted.push(p);parents.push(p);
 }
 if(accepted.length<count)throw Error(`Qualified stock shortage: ${accepted.length}/${count} after ${attempts-1} attempts. Published bank retained.`);
 return{seed,attempts,puzzles:accepted.sort((a,b)=>a.rank-b.rank||a.score-b.score||a.givens.localeCompare(b.givens))};
}
