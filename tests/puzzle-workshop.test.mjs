import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkWorkshop, initialData, freshWorkshop, freshItem, restoreWorkshop, changeData, undoItem, trailInfo, harbourInfo } from '../shared/puzzle-workshop.mjs';
import { harbourBridges, trailMoves } from '../shared/free-puzzles.mjs';

const correct = {
  'stamp-code': { letters: ['O', 'A', 'K'] },
  'signal-shift': { shift: 3, words: ['CHECK', 'THE', 'RED', 'STAR'], star: 'RED' },
  'parcel-queue': { order: ['SUN', 'LEAF', 'STAR', 'MOON'] },
  'shared-parcel': { selected: 'C', excluded: ['A', 'B', 'D'], evidence: [0, 1, 2] },
  'forest-trail': { moves: trailMoves },
  'harbour-route': { path: ['dock', 'oak', 'bell', 'beacon'] },
};
test('six completed interactions agree with the original puzzle answers; blanks and final-answer-only guesses cannot pass', () => {
  for (const [id, data] of Object.entries(correct)) {
    assert.equal(checkWorkshop(id, data).ok, true, id);
    assert.equal(checkWorkshop(id, initialData(id)).ok, false, id);
    assert.equal(checkWorkshop(id, { answer: id === 'harbour-route' ? '258' : 'MOON' }).ok, false, id);
  }
});
const permutations = a => a.length ? a.flatMap((x, i) => permutations(a.filter((_, j) => i !== j)).map(b => [x, ...b])) : [[]];
test('exactly one full queue passes out of 24 arrangements, including six with MOON last', () => {
  const orders = permutations(['SUN', 'LEAF', 'STAR', 'MOON']);
  assert.equal(orders.filter(order => order.at(-1) === 'MOON').length, 6);
  assert.deepEqual(orders.filter(order => checkWorkshop('parcel-queue', { order }).ok), [correct['parcel-queue'].order]);
  assert.equal(checkWorkshop('parcel-queue', { order: ['SUN', 'SUN', 'STAR', 'MOON'] }).ok, false);
});
test('target colour alone, partial message or incorrect decoder alignment does not pass', () => {
  const d = correct['signal-shift'];
  for (const patch of [{ shift: 0 }, { words: ['', '', 'RED', ''] }, { star: 'BLUE' }, { words: ['CHECK', 'THE', 'RED', 'MOON'] }]) assert.equal(checkWorkshop('signal-shift', { ...d, ...patch }).ok, false);
});
test('evidence completion requires all clues, and excludes contradictory chosen/excluded state', () => {
  const d = correct['shared-parcel'];
  for (const selected of ['A', 'B', 'D']) assert.equal(checkWorkshop('shared-parcel', { ...d, selected }).ok, false);
  assert.equal(checkWorkshop('shared-parcel', { ...d, evidence: [0, 1] }).ok, false);
  assert.equal(checkWorkshop('shared-parcel', { ...d, excluded: ['C'] }).ok, false);
});
test('forest movement enforces bounds and complete direction history, not just a word', () => {
  assert.equal(trailInfo(['N']), null);
  assert.equal(trailInfo(['W']), null);
  assert.equal(trailInfo(['E', 'E', 'E', 'E']), null);
  assert.equal(trailInfo(trailMoves).letters, 'BRIDGE');
  assert.equal(checkWorkshop('forest-trail', { moves: ['S', 'E', 'E', 'S', 'W', 'N'], answer: 'BRIDGE' }).ok, false);
});
test('harbour checks every connected path up to six bridges; only the printed route can pass', () => {
  const accepted = [];
  function walk(path) {
    if (checkWorkshop('harbour-route', { path }).ok) accepted.push(path);
    if (path.length >= 7) return;
    for (const [a, b] of harbourBridges) {
      const next = a === path.at(-1) ? b : b === path.at(-1) ? a : null;
      if (next) walk([...path, next]);
    }
  }
  walk(['dock']);
  assert.deepEqual(accepted, [correct['harbour-route'].path]);
  assert.equal(harbourInfo(['dock', 'bell', 'beacon']), null);
  assert.equal(checkWorkshop('harbour-route', { path: ['dock', 'oak', 'pine', 'beacon'] }).ok, false);
  assert.equal(checkWorkshop('harbour-route', { path: ['dock', 'mill', 'pine', 'beacon'] }).ok, false);
});
test('undo restores whole snapshots including route, selected evidence and exclusions', () => {
  for (const [id, data] of Object.entries(correct)) {
    let item = freshItem(id);
    item = changeData(item, id, data);
    assert.deepEqual(undoItem(item).data, initialData(id));
    assert.deepEqual(restoreWorkshop({ ...freshWorkshop(), items: { [id]: item } }).items[id].history[0], initialData(id));
  }
});
test('reload preserves independent/hint/solution completion but rejects forged completion and unknown save versions', () => {
  const state = freshWorkshop(); state.active = 'harbour-route';
  for (const [id, data] of Object.entries(correct)) state.items[id] = { ...freshItem(id), data, completion: 'independent' };
  state.items['signal-shift'].hints = 2;
  state.items['shared-parcel'].viewed = true;
  const loaded = restoreWorkshop(JSON.parse(JSON.stringify(state)));
  assert.equal(loaded.active, state.active);
  assert.equal(loaded.items['stamp-code'].completion, 'independent');
  assert.equal(loaded.items['signal-shift'].completion, 'hint');
  assert.equal(loaded.items['shared-parcel'].completion, 'solution');
  state.items['harbour-route'].data = { path: ['dock'] };
  assert.equal(restoreWorkshop(state).items['harbour-route'].completion, null);
  assert.deepEqual(restoreWorkshop({ ...state, version: -1 }), freshWorkshop());
});
test('malformed local saves are bounded and do not crash the page', () => {
  for (const raw of [null, [], 'oops', {}, { version: 2, active: '<script>', items: { 'forest-trail': { data: { moves: ['BAD'] }, history: ['bad'], hints: Infinity }, 'harbour-route': { data: { path: 'oops' } }, 'shared-parcel': { data: { selected: null, evidence: ['evil'] } } } }]) assert.doesNotThrow(() => restoreWorkshop(raw));
});
test('server-rendered page retains all six indexable puzzle definitions and separate hidden explanations', async () => {
  const html = await readFile('dist/client/en/escape-room-puzzles/index.html', 'utf8');
  assert.equal((html.match(/class="puzzle-card"/g) || []).length, 6);
  assert.match(html, /Six puzzles. Six ways to solve/);
  assert.match(html, /Clear saved progress/);
  for (const id of Object.keys(correct)) assert.ok(html.includes(`id="${id}-solution" hidden=""`));
});
