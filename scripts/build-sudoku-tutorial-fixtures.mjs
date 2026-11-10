// Reproducible independent teaching positions, never derived from campaign levels.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {board,candidates,peers,units,countSolutions} from '../shared/sudoku/engine.mjs';
import {independentlySolve,fingerprints} from './sudoku-bank-validation.mjs';
let seed=470019;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const bank=JSON.parse(await readFile('backend/sudoku/puzzles.json','utf8'));
const known=new Set(bank.map(p=>fingerprints(p.givens).digits));
const found={single:[],hidden:[],locked:[],pair:[]};
function locate(b){
 const c=candidates(b),out={single:[],hidden:[],locked:[],pair:[]};
 for(let i=0;i<81;i++)if(c[i].length===1&&units[Math.floor(i/9)].filter(j=>!b[j]).length>=3)out.single.push({unit:Math.floor(i/9),cells:[i],digit:c[i][0],answer:[{cell:i,digit:c[i][0]}]});
 for(let unit=0;unit<9;unit++)for(let d=1;d<=9;d++){
  const cells=units[unit].filter(i=>c[i].includes(d));
  if(cells.length===1&&c[cells[0]].length>1)out.hidden.push({unit,cells,digit:d,answer:[{cell:cells[0],digit:d}]});
 }
 for(let box=18;box<27;box++)for(let d=1;d<=9;d++){
  const cells=units[box].filter(i=>c[i].includes(d));
  if(cells.length!==2||!cells.every(i=>Math.floor(i/9)===Math.floor(cells[0]/9)))continue;
  const unit=Math.floor(cells[0]/9),targets=units[unit].filter(i=>!units[box].includes(i)&&c[i].includes(d));
  if(targets.length&&targets.length<=3)out.locked.push({unit,box,cells,digit:d,answer:targets.map(cell=>({cell,digit:d}))});
 }
 for(let unit=0;unit<9;unit++)for(const i of units[unit].filter(i=>c[i].length===2)){
  const cells=units[unit].filter(j=>c[j].join()===c[i].join());
  if(cells.length!==2||cells[0]!==i)continue;
  const answer=units[unit].filter(j=>!cells.includes(j)).flatMap(cell=>c[cell].filter(d=>c[i].includes(d)).map(digit=>({cell,digit})));
  if(answer.length&&answer.length<=4)out.pair.push({unit,cells,digits:c[i],answer});
 }
 return out;
}
for(let attempt=0;attempt<400&&Object.values(found).some(v=>v.length<2);attempt++){
 const ds=shuffle([1,2,3,4,5,6,7,8,9]),rows=shuffle([0,1,2]).flatMap(g=>shuffle([0,1,2]).map(n=>g*3+n)),cols=shuffle([0,1,2]).flatMap(g=>shuffle([0,1,2]).map(n=>g*3+n));
 const b=rows.flatMap(r=>cols.map(c=>ds[(r*3+Math.floor(r/3)+c)%9]));
 for(const i of shuffle(Array.from({length:81},(_,i)=>i))){const d=b[i];b[i]=0;if(countSolutions(b).count!==1)b[i]=d;}
 const givens=b.join(''),fp=fingerprints(givens).digits;if(known.has(fp))continue;known.add(fp);
 const patterns=locate(b);
 for(const kind of Object.keys(found))if(found[kind].length<2&&patterns[kind].length){
  let f={givens,...patterns[kind][0]};
  // Use 5 for the first hidden-single example, so explanatory prose stays concrete.
  if(kind==='hidden'&&found.hidden.length===0&&f.digit!==5){const d=f.digit;f={...f,givens:[...givens].map(n=>Number(n)===d?'5':n==='5'?String(d):n).join(''),digit:5,answer:f.answer.map(a=>({...a,digit:5}))};}
  const solved=independentlySolve(f.givens);if(solved.count!==1)throw Error('Ambiguous teaching fixture');
  for(const a of f.answer)if((kind==='single'||kind==='hidden')!==(Number(solved.solution[a.cell])===a.digit))throw Error('Invalid teaching deduction');
  found[kind].push(f);
 }
}
if(Object.values(found).some(v=>v.length<2))throw Error('Missing teaching patterns');
// Produce a genuine near-miss by removing one clue until the demonstrated rule fails.
for(const kind of Object.keys(found)){
 const f=found[kind][0],b=board(f.givens);
 const holds=next=>{
  const c=candidates(next);
  if(kind==='single')return c[f.cells[0]].length===1;
  if(kind==='hidden')return units[f.unit].filter(i=>c[i].includes(f.digit)).length===1;
  if(kind==='locked')return units[f.box].filter(i=>c[i].includes(f.digit)).every(i=>units[f.unit].includes(i));
  return f.cells.every(i=>c[i].length===2&&c[i].every(n=>f.digits.includes(n)));
 };
 const clue=b.findIndex((d,i)=>{if(!d)return false;const next=[...b];next[i]=0;return !holds(next);});
 if(clue<0)throw Error('No counterexample found');
 const changed=[...b];changed[clue]=0;f.counter={givens:changed.join(''),removedClue:clue,removedDigit:b[clue]};
}
await writeFile('shared/sudoku/tutorial-fixtures.mjs','// Original, independently verified teaching positions. No campaign answers.\nexport const tutorialFixtures='+JSON.stringify(Object.fromEntries(Object.entries(found).map(([k,v])=>[k,{demo:v[0],practice:v[1]}])),null,2)+';\n');
console.log(Object.fromEntries(Object.entries(found).map(([k,v])=>[k,v.map(f=>({unit:f.unit,cells:f.cells,digit:f.digit,digits:f.digits,answer:f.answer}))])));
