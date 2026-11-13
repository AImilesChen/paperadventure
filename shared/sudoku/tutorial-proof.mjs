import {board,candidates,units,digits} from './engine.mjs';
import {singleChecks} from './learning.mjs';

// Facts for the article are derived from the same original board as its demo.
// This does not read, solve or change a player's saved campaign.
export function tutorialProof(lesson){
 const f=lesson.demo,b=board(f.givens),notes=candidates(b);
 if(lesson.id==='single'){
  const cell=f.cells[0],checks=singleChecks(f);
  return {cell,digit:f.digit,stages:[
   {label:'Check the row',remaining:checks.missing,removed:digits.filter(n=>!checks.missing.includes(n))},
   {label:'Check the column',remaining:checks.afterColumn,removed:checks.missing.filter(n=>!checks.afterColumn.includes(n))},
   {label:'Check the box',remaining:checks.remaining,removed:checks.afterColumn.filter(n=>!checks.remaining.includes(n))},
  ]};
 }
 const changes=units[f.unit].filter(cell=>!b[cell]&&!f.cells.includes(cell)).map(cell=>{
  const removed=notes[cell].filter(n=>lesson.id==='locked'?n===f.digit:f.digits.includes(n));
  return {cell,before:notes[cell],removed,after:notes[cell].filter(n=>!removed.includes(n))};
 }).filter(r=>r.removed.length&&(lesson.id!=='locked'||!units[f.box].includes(r.cell)));
 return {cells:f.cells,notes:f.cells.map(cell=>notes[cell]),changes,placements:changes.filter(r=>r.after.length===1).map(r=>({cell:r.cell,digit:r.after[0]})),positions:lesson.id==='locked'?units[f.box].filter(cell=>notes[cell].includes(f.digit)):null};
}
