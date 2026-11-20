import {board, conflicts} from './engine.mjs';

export const boardCheckMessages = {
  incomplete: 'No repeated digits found in rows, columns or boxes. {value0} empty cells remain. Keep filling the board to finish this level.',
  conflict: 'Some digits repeat in a row, column or 3×3 box. Review the highlighted cells.',
  unverified: 'This board could not be verified as complete. Review any empty cells and Sudoku rule conflicts.'
};

// A partial check only detects visible rule conflicts; it never checks the
// private solution or awards completion. Full boards still require the server.
export function inspectBoard(raw) {
  const values = board(raw), empty = values.filter(n => !n).length;
  if (conflicts(values).length) return {kind: 'conflict', message: boardCheckMessages.conflict, empty};
  if (empty) return {kind: 'incomplete', message: boardCheckMessages.incomplete, empty};
  return {kind: 'ready', empty: 0};
}
