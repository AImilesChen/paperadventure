import { uiText } from "../ui-locale.mjs";import { board, candidates, units, digits } from './engine.mjs';
import { rulesFixtures } from './rules-fixtures.mjs';
export { rulesFixtures };
export const cellName = (i) => `R${Math.floor(i / 9) + 1}C${i % 9 + 1}`;
export const ruleKinds = ['row', 'column', 'box'];
export function groupIndex(cell, kind) {return kind === 'row' ? Math.floor(cell / 9) : kind === 'column' ? 9 + cell % 9 : 18 + Math.floor(cell / 27) * 3 + Math.floor(cell % 9 / 3);}
export const groupCells = (cell, kind) => units[groupIndex(cell, kind)];
export const groupLabel = (cell, kind) => kind === 'row' ? uiText("row {value0}", { value0: Math.floor(cell / 9) + 1 }) : kind === 'column' ? uiText("column {value0}", { value0: cell % 9 + 1 }) : uiText("box {value0}", { value0: groupIndex(cell, kind) - 17 });
export function brokenRules(raw, cell, digit) {const b = board(raw);if (!Number.isInteger(cell) || cell < 0 || cell > 80 || !digits.includes(digit)) return [];return ruleKinds.flatMap((kind) => {const blockers = groupCells(cell, kind).filter((i) => i !== cell && b[i] === digit);return blockers.length ? [{ kind, blockers }] : [];});}
export function placementChecks(f) {const b = board(f.givens),missing = digits.filter((d) => !groupCells(f.target, 'row').some((i) => b[i] === d)),afterColumn = missing.filter((d) => !groupCells(f.target, 'column').some((i) => b[i] === d)),remaining = afterColumn.filter((d) => !groupCells(f.target, 'box').some((i) => b[i] === d));return { missing, afterColumn, remaining };}
const list = (a) => a.join(', ');
export function firstMoveSteps(f = rulesFixtures.guided) {const s = placementChecks(f);return [
  ['Choose the empty cell', uiText("We are checking {value0}. The large digits are fixed clues. The outlined empty cell is the place we want to fill.", { value0: cellName(f.target) }), null],
  ['Read the row', uiText("{value0} is missing {value1}. Both digits are starting possibilities, so the row alone does not yet decide the answer.", { value0: groupLabel(f.target, 'row'), value1: list(s.missing) }), 'row'],
  ['Check the column', uiText("{value0} already contains {value1} in {value2}. That rules out {value3} at {value4} and leaves {value5}.", { value0: cellName(f.blocking), value1: f.blockedDigit, value2: groupLabel(f.target, 'column'), value3: f.blockedDigit, value4: cellName(f.target), value5: list(s.afterColumn) }), 'column'],
  ['Check the box', uiText("Now check the bold-bordered {value0}. It contains no fixed {value1}, so that digit is still allowed. The final candidate list is {value2}.", { value0: groupLabel(f.target, 'box'), value1: f.digit, value2: list(s.remaining) }), 'box'],
  ['Make the justified placement', uiText("{value0} can be filled with {value1}: the row needs it, and neither the column nor the box blocks it. Review these three groups after entering it.", { value0: cellName(f.target), value1: f.digit }), 'row']];
}
export function gradeRulesTask(task, response = {}) {
  if (!response || typeof response !== 'object') response = {};
  if (task === 'conflict') {
    const f = rulesFixtures.practice.conflict,selected = Array.isArray(response.cells) ? [...new Set(response.cells)] : [],expected = [f.target, f.blocker];
    const correct = selected.length === 2 && selected.every((i) => expected.includes(i));
    return { correct, message: correct ? uiText("The trial {value0} at {value1} repeats the fixed {value2} at {value3}. Both cells are in {value4}; a box cannot contain the same digit twice.", { value0: f.proposed, value1: cellName(f.target), value2: f.proposed, value3: cellName(f.blocker), value4: groupLabel(f.target, 'box') }) : selected.length !== 2 ? 'Select both cells containing the repeated digit in the outlined box.' : 'Compare the two selected digits and check that both cells belong to the outlined 3×3 box.' };
  }
  if (task === 'judgment') {
    const f = rulesFixtures.practice.judgment,actual = brokenRules(f.givens, f.target, f.proposed),expected = actual.map((r) => r.kind),chosen = Array.isArray(response.rules) ? [...new Set(response.rules)] : [];
    const correct = response.verdict === (expected.length ? 'cannot' : 'can') && chosen.length === expected.length && chosen.every((k) => expected.includes(k));
    return { correct, message: correct ? uiText("You cannot enter {value0} at {value1}. {value2} already contains {value3} in the same column. Passing the row and box checks does not cancel this column conflict.", { value0: f.proposed, value1: cellName(f.target), value2: cellName(f.blocker), value3: f.proposed }) : !response.verdict ? 'Choose whether the trial digit can be entered, then identify any rule it breaks.' : response.verdict === 'cannot' && !chosen.length ? 'Choose the rule that the trial entry breaks before checking.' : 'Check all three groups around the outlined cell. A digit can be missing from its row and still repeat in a crossing column or box.' };
  }
  if (task === 'placement') {
    const f = rulesFixtures.practice.placement,correct = response.digit === f.digit,checks = placementChecks(f);
    return { correct, message: correct ? uiText("{value0} = {value1}. The row is missing {value2}. {value3} already has {value4} in the column, leaving {value5}. Its box allows {value6}, so the placement fits all three rules.", { value0: cellName(f.target), value1: f.digit, value2: list(checks.missing), value3: cellName(f.blocking), value4: f.blockedDigit, value5: list(checks.afterColumn), value6: f.digit }) : !digits.includes(response.digit) ? 'Select the outlined empty cell, enter a digit, then check your move.' : (() => {const conflicts = brokenRules(f.givens, f.target, response.digit);return conflicts.length ? uiText("{value0} repeats in {value1}. Check the fixed digits in those groups, then try again.", { value0: response.digit, value1: conflicts.map((r) => groupLabel(f.target, r.kind)).join(' and ') }) : 'A legal-looking digit still needs a reason. List what is missing from the row, then check the column and box.';})() };
  }
  return { correct: false, message: 'Choose one of the three beginner tasks.' };
}
// The controls exercise has one editable cell; fixed clues never enter its history.
export const emptyRuleEntry = () => ({ digit: 0, notes: [] });
export function editRuleEntry(entry, action) {
  if (action.type === 'erase') return emptyRuleEntry();
  if (action.type !== 'digit' || !digits.includes(action.digit)) return entry;
  if (action.notes) return { digit: 0, notes: entry.notes.includes(action.digit) ? entry.notes.filter((n) => n !== action.digit) : [...entry.notes, action.digit].sort((a, b) => a - b) };
  return { digit: action.digit, notes: [] };
}
