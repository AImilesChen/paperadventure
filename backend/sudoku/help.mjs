import {board,nextHint,name,peers,digits} from '../../shared/sudoku/engine.mjs';
import {hintAccess} from '../../shared/sudoku/help-model.mjs';

// The solution and the complete step stay on the server. Only paid access is projected.
export function createHelp(raw,puzzle){
 const b=board(raw),solution=board(puzzle.solution),wrong=b.findIndex((n,i)=>n&&n!==solution[i]);
 if(b.every(Boolean)&&wrong<0)return null;
 const logical=wrong<0?nextHint(b,solution):null;
 const index=wrong>=0?wrong:Number.isInteger(logical?.index)?logical.index:b.findIndex(n=>!n);
 if(index<0)return null;
 const row=Math.floor(index/9),column=index%9,rowName='ABCDEFGHI'[row],rowValues=b.slice(row*9,row*9+9),missing=digits.filter(n=>!rowValues.includes(n));
 const target={index,coordinate:name(index),row:rowName,rowNumber:row+1,column:column+1};
 const method=wrong>=0?
  `Revisit the number you entered at ${name(index)} (row ${rowName}, column ${column+1}). Check the row, column and 3×3 box again. An entry can be incorrect even when no red duplicate is shown.`:
  `Row ${rowName} is missing ${missing.join(', ')}. At ${name(index)}, cross out digits already in column ${column+1} or its 3×3 box.`;
 const reason=wrong>=0?
  `Replace the entry at ${name(index)} with ${solution[index]}. This is the verified value in this puzzle's unique solution. If a nearby entry now creates a duplicate, review that entry next.`:
  logical?.reason||`The verified next entry at ${name(index)} is ${solution[index]}. It belongs to this puzzle's unique solution; check its row, column and 3×3 box as you continue.`;
 return{target,method,reason,digit:solution[index],correction:wrong>=0,previous:wrong>=0?b[index]:null,cells:[index,...peers[index].filter(i=>b[i])]};
}
export function publicHelp(h,puzzle){
 const access=hintAccess(h.tier),step=h.format===2&&h.target?{target:h.target,method:h.texts[0],reason:h.texts[1],digit:h.digit,correction:h.correction,previous:h.previous,cells:h.cells}:h.help||createHelp(h.board,puzzle);
 if(!step)return{id:h.id,tier:h.tier,board:h.board,access,texts:h.texts.slice(0,h.tier),cells:h.cells||[],format:2};
 const texts=[step.method,step.reason,`${step.target.coordinate} = ${step.digit}. ${step.reason}`];
 return{id:h.id,tier:h.tier,board:h.board,access,format:2,target:step.target,method:step.method,cells:step.cells,updatedAt:h.updatedAt||h.createdAt||0,
  texts:access==='answer'?texts.slice(0,h.tier):[step.method],
  ...(access==='answer'?{placement:{...step.target,digit:step.digit,reason:step.reason,correction:step.correction,previous:step.previous}}:{})};
}
