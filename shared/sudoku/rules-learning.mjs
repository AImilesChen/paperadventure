import {board,candidates,units,digits} from './engine.mjs';
import {rulesFixtures} from './rules-fixtures.mjs';
export {rulesFixtures};
export const cellName=i=>`R${Math.floor(i/9)+1}C${i%9+1}`;
export const ruleKinds=['row','column','box'];
export function groupIndex(cell,kind){return kind==='row'?Math.floor(cell/9):kind==='column'?9+cell%9:18+Math.floor(cell/27)*3+Math.floor(cell%9/3);}
export const groupCells=(cell,kind)=>units[groupIndex(cell,kind)];
export const groupLabel=(cell,kind)=>kind==='row'?`row ${Math.floor(cell/9)+1}`:kind==='column'?`column ${cell%9+1}`:`box ${groupIndex(cell,kind)-17}`;
export function brokenRules(raw,cell,digit){const b=board(raw);if(!Number.isInteger(cell)||cell<0||cell>80||!digits.includes(digit))return [];return ruleKinds.flatMap(kind=>{const blockers=groupCells(cell,kind).filter(i=>i!==cell&&b[i]===digit);return blockers.length?[{kind,blockers}]:[];});}
export function placementChecks(f){const b=board(f.givens),missing=digits.filter(d=>!groupCells(f.target,'row').some(i=>b[i]===d)),afterColumn=missing.filter(d=>!groupCells(f.target,'column').some(i=>b[i]===d)),remaining=afterColumn.filter(d=>!groupCells(f.target,'box').some(i=>b[i]===d));return {missing,afterColumn,remaining};}
const list=a=>a.join(', ');
export function firstMoveSteps(f=rulesFixtures.guided){const s=placementChecks(f);return [
 ['Choose the empty cell',`We are checking ${cellName(f.target)}. The large digits are fixed clues. The outlined empty cell is the place we want to fill.`,null],
 ['Read the row',`${groupLabel(f.target,'row')} is missing ${list(s.missing)}. Both digits are starting possibilities, so the row alone does not yet decide the answer.`,'row'],
 ['Check the column',`${cellName(f.blocking)} already contains ${f.blockedDigit} in ${groupLabel(f.target,'column')}. That rules out ${f.blockedDigit} at ${cellName(f.target)} and leaves ${list(s.afterColumn)}.`,'column'],
 ['Check the box',`Now check the bold-bordered ${groupLabel(f.target,'box')}. It contains no fixed ${f.digit}, so that digit is still allowed. The final candidate list is ${list(s.remaining)}.`,'box'],
 ['Make the justified placement',`${cellName(f.target)} can be filled with ${f.digit}: the row needs it, and neither the column nor the box blocks it. Review these three groups after entering it.`,'row']
 ];}
export function gradeRulesTask(task,response={}){
 if(!response||typeof response!=='object')response={};
 if(task==='conflict'){
  const f=rulesFixtures.practice.conflict,selected=Array.isArray(response.cells)?[...new Set(response.cells)]:[],expected=[f.target,f.blocker];
  const correct=selected.length===2&&selected.every(i=>expected.includes(i));
  return {correct,message:correct?`The trial ${f.proposed} at ${cellName(f.target)} repeats the fixed ${f.proposed} at ${cellName(f.blocker)}. Both cells are in ${groupLabel(f.target,'box')}; a box cannot contain the same digit twice.`:selected.length!==2?'Select both cells containing the repeated digit in the outlined box.':'Compare the two selected digits and check that both cells belong to the outlined 3×3 box.'};
 }
 if(task==='judgment'){
  const f=rulesFixtures.practice.judgment,actual=brokenRules(f.givens,f.target,f.proposed),expected=actual.map(r=>r.kind),chosen=Array.isArray(response.rules)?[...new Set(response.rules)]:[];
  const correct=response.verdict===(expected.length?'cannot':'can')&&chosen.length===expected.length&&chosen.every(k=>expected.includes(k));
  return {correct,message:correct?`You cannot enter ${f.proposed} at ${cellName(f.target)}. ${cellName(f.blocker)} already contains ${f.proposed} in the same column. Passing the row and box checks does not cancel this column conflict.`:!response.verdict?'Choose whether the trial digit can be entered, then identify any rule it breaks.':response.verdict==='cannot'&&!chosen.length?'Choose the rule that the trial entry breaks before checking.':'Check all three groups around the outlined cell. A digit can be missing from its row and still repeat in a crossing column or box.'};
 }
 if(task==='placement'){
  const f=rulesFixtures.practice.placement,correct=response.digit===f.digit,checks=placementChecks(f);
  return {correct,message:correct?`${cellName(f.target)} = ${f.digit}. The row is missing ${list(checks.missing)}. ${cellName(f.blocking)} already has ${f.blockedDigit} in the column, leaving ${list(checks.afterColumn)}. Its box allows ${f.digit}, so the placement fits all three rules.`:!digits.includes(response.digit)?'Select the outlined empty cell, enter a digit, then check your move.':(()=>{const conflicts=brokenRules(f.givens,f.target,response.digit);return conflicts.length?`${response.digit} repeats in ${conflicts.map(r=>groupLabel(f.target,r.kind)).join(' and ')}. Check the fixed digits in those groups, then try again.`:'A legal-looking digit still needs a reason. List what is missing from the row, then check the column and box.';})()};
 }
 return {correct:false,message:'Choose one of the three beginner tasks.'};
}
// The controls exercise has one editable cell; fixed clues never enter its history.
export const emptyRuleEntry=()=>({digit:0,notes:[]});
export function editRuleEntry(entry,action){
 if(action.type==='erase')return emptyRuleEntry();
 if(action.type!=='digit'||!digits.includes(action.digit))return entry;
 if(action.notes)return {digit:0,notes:entry.notes.includes(action.digit)?entry.notes.filter(n=>n!==action.digit):[...entry.notes,action.digit].sort((a,b)=>a-b)};
 return {digit:action.digit,notes:[]};
}
