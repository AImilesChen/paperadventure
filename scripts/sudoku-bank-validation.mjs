import {createHash} from 'node:crypto';
import {analyse,board,nextHint,validComplete} from '../shared/sudoku/engine.mjs';

export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Independent bit-mask search: deliberately shares no solver, units or peers with
// the generator. Stops at two solutions, so ambiguous candidates never enter stock.
export function independentlySolve(raw){
 if(!/^[0-9]{81}$/.test(raw))throw Error('Invalid puzzle format');
 const a=[...raw].map(Number),rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0);
 const box=(r,c)=>Math.floor(r/3)*3+Math.floor(c/3);let count=0,solution=null;
 for(let i=0;i<81;i++)if(a[i]){const r=Math.floor(i/9),c=i%9,b=box(r,c),bit=1<<a[i];if((rows[r]|cols[c]|boxes[b])&bit)return{count:0,solution:null};rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;}
 function search(){let at=-1,mask=0,size=10;
  for(let i=0;i<81;i++)if(!a[i]){const r=Math.floor(i/9),c=i%9,m=1022&~(rows[r]|cols[c]|boxes[box(r,c)]);let n=0;for(let t=m;t;t&=t-1)n++;if(!n)return;if(n<size){at=i;mask=m;size=n;if(n===1)break;}}
  if(at<0){count++;solution??=a.join('');return;}
  const r=Math.floor(at/9),c=at%9,b=box(r,c);
  for(let d=1;d<=9&&count<2;d++){const bit=1<<d;if(!(mask&bit))continue;a[at]=d;rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;search();rows[r]^=bit;cols[c]^=bit;boxes[b]^=bit;}
  a[at]=0;
 }
 search();return{count,solution};
}

// Digit relabelling, rotations and reflections are one puzzle for stock purposes.
// Also reject repeated clue masks under these transforms (a stricter practical check).
export function fingerprints(raw){
 const variants=[];
 for(let flip=0;flip<2;flip++)for(let rotation=0;rotation<4;rotation++){
  const out=Array(81);
  for(let r=0;r<9;r++)for(let c=0;c<9;c++){let y=r,x=flip?8-c:c;for(let n=0;n<rotation;n++)[y,x]=[x,8-y];out[y*9+x]=raw[r*9+c];}
  const remap=new Map([['0','0']]);let next=1;
  variants.push({digits:out.map(d=>{if(!remap.has(d))remap.set(d,String(next++));return remap.get(d);}).join(''),mask:out.map(d=>d==='0'?'0':'1').join('')});
 }
 return{digits:variants.map(v=>v.digits).sort()[0],mask:variants.map(v=>v.mask).sort()[0]};
}

export function validatePuzzle(p,{checkHints=true}={}){
 const solved=independentlySolve(p.givens);
 if(solved.count!==1||solved.solution!==p.solution||!validComplete(p.solution,p.givens))throw Error('Independent unique-solution check failed');
 const a=analyse(p.givens);
 if(!a.solved||a.rank!==p.rank||a.score!==p.score||a.trace.length!==p.steps||JSON.stringify([...new Set(a.trace.map(s=>s.technique))])!==JSON.stringify(p.techniques))throw Error('Logic grading differs from recorded metadata');
 const b=board(p.givens),answer=board(p.solution);
 for(const s of a.trace){
  if(s.index!==undefined){if(b[s.index]||s.digit!==answer[s.index])throw Error('Invalid logic placement');
   if(checkHints){const h=nextHint(b,answer);if(h.technique==='finished'||!h.texts?.every(t=>typeof t==='string'&&t.length)||!h.cells?.length||h.index===undefined||b[h.index]||h.digit!==answer[h.index])throw Error('Hint cannot explain the next placement');}
   b[s.index]=s.digit;
  }else if(!s.remove?.length||s.remove.some(([i,d])=>answer[i]===d))throw Error('Invalid candidate elimination');
 }
 if(b.join('')!==p.solution)throw Error('Logic trace does not finish');
 return fingerprints(p.givens);
}

export function validateStock(published,reserve,policy,{checkHints=true}={}){
 if(digest(published.slice(0,policy.frozenCount))!==policy.frozenSha256)throw Error('Original levels changed; publication refused');
 const ids=new Set(),digits=new Set(),masks=new Set(),answers=new Set();
 for(const [i,p]of published.entries())if(p.level!==i+1||p.chapter!==Math.floor(i/policy.chapterSize)+1||p.id!==`v1-${String(i+1).padStart(3,'0')}`)throw Error('Published order or stable ID changed');
 for(let i=policy.frozenCount;i<published.length;i++)if(published[i].rank<published[i-1].rank||published[i].rank===published[i-1].rank&&published[i].score<published[i-1].score)throw Error('Published expansion grades are out of order');
 for(const [i,p]of [...published,...reserve].entries()){
  const fp=validatePuzzle(p,{checkHints});
  const answerKey=fingerprints(p.solution).digits;
  if(i>=policy.frozenCount&&answers.has(answerKey))throw Error('Equivalent completed board already exists');answers.add(answerKey);
  if(digits.has(fp.digits)||masks.has(fp.mask))throw Error('Equivalent puzzle already exists');digits.add(fp.digits);masks.add(fp.mask);
  if(i>=policy.frozenCount&&(p.rank<policy.minRank||p.score<policy.minScore))throw Error('New puzzle is below the expansion technique/score floor');
  if(p.id){if(ids.has(p.id))throw Error('Duplicate puzzle ID');ids.add(p.id);}
 }
 return{published:published.length,reserve:reserve.length,frozenSha256:policy.frozenSha256};
}
