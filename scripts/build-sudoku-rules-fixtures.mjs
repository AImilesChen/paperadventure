import {writeFile} from 'node:fs/promises';
import {countSolutions,peers,units} from '../shared/sudoku/engine.mjs';
import {independentlySolve} from './sudoku-bank-validation.mjs';
let seed=480123;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const solution=ds=>Array.from({length:81},(_,i)=>ds[(Math.floor(i/9)*3+Math.floor(i/27)+i%9)%9]);
function prune(answer,remove,keep){const b=[...answer];for(const i of remove)b[i]=0;if(countSolutions(b).count!==1)throw Error('Initial fixture ambiguous');for(const i of shuffle(Array.from({length:81},(_,i)=>i).filter(i=>b[i]&&!keep.includes(i)))){const d=b[i];b[i]=0;if(countSolutions(b).count!==1)b[i]=d;if(b.filter(Boolean).length<=44)break;}const givens=b.join('');if(independentlySolve(givens).count!==1)throw Error('Independent uniqueness failed');return givens;}
function firstMove(ds,target,partner){const answer=solution(ds),row=units[Math.floor(target/9)],proposed=answer[partner],blocking=units[9+target%9].find(i=>answer[i]===proposed),givens=prune(answer,[target,partner],[...row.filter(i=>i!==target&&i!==partner),blocking]);return {givens,target,digit:answer[target],partner,blockedDigit:proposed,blocking};}
function conflict(ds,target,kind){const answer=solution(ds),row=units[Math.floor(target/9)],col=units[9+target%9],box=units[18+Math.floor(target/27)*3+Math.floor(target%9/3)];const scope=kind==='row'?row:kind==='column'?col:box;const blocker=scope.find(i=>i!==target&&(kind==='box'?Math.floor(i/9)!==Math.floor(target/9)&&i%9!==target%9:kind==='row'?!box.includes(i):!box.includes(i)));const proposed=answer[blocker],remove=[target,...peers[target].filter(i=>answer[i]===proposed&&i!==blocker)],givens=prune(answer,remove,[blocker]);return {givens,target,proposed,blocker,kind};}
const fixtures={
 guided:firstMove([7,2,8,5,1,9,3,6,4],0,1),
 examples:{row:conflict([7,2,8,5,1,9,3,6,4],0,'row'),column:conflict([9,3,6,1,8,4,2,7,5],40,'column'),box:conflict([8,4,2,6,5,9,1,7,3],22,'box')},
 practice:{conflict:conflict([3,8,1,9,2,6,5,4,7],30,'box'),judgment:conflict([2,9,5,8,4,1,7,3,6],50,'column'),placement:firstMove([4,8,2,7,9,5,1,3,6],22,21)}
};
await writeFile('shared/sudoku/rules-fixtures.mjs','// Original independent beginner positions. Invalid trial entries are deliberately separate from the valid givens.\nexport const rulesFixtures='+JSON.stringify(fixtures,null,2)+';\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(fixtures.practice).map(([k,f])=>[k,{target:f.target,digit:f.digit,proposed:f.proposed,blocker:f.blocker,kind:f.kind}]))));
