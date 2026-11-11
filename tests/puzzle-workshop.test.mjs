import {lightDesign,lightEdition} from '../shared/harbour-lights.mjs';
import {answerRoute,forestEdition} from '../shared/forest-loop.mjs';
import { bayStart, solveBay } from '../shared/loading-bay.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkWorkshop, initialData, freshWorkshop, freshItem, restoreWorkshop, changeData, undoItem, trailInfo, harbourInfo } from '../shared/puzzle-workshop.mjs';
import { harbourBridges, trailMoves } from '../shared/free-puzzles.mjs';

const correct = {
  'stamp-code': { edition: 4, matches: ['LAMP', 'PALM', 'MAP', 'OAK'], verified: true, route: ['OAK', 'MALL', 'POOL', 'LOOM', 'PALM'], pair: [], notes: ['', '', '', ''], readClues: [] },
  'signal-shift': { edition: 4, answer: 'DOCK' },
  'parcel-queue': { edition: 3, positions: solveBay(bayStart).at(-1).positions },
  'shared-parcel': { edition: 3, selected: 'A', wrongRecord: 3, excluded: [], notes: '' },
  'forest-trail': { edition:forestEdition, path:answerRoute },
  'harbour-route': {edition:lightEdition,state:2**36-1},
};
test('six completed interactions agree with the original puzzle answers; blanks and final-answer-only guesses cannot pass', () => {
  for (const [id, data] of Object.entries(correct)) {
    assert.equal(checkWorkshop(id, data).ok, true, id);
    assert.equal(checkWorkshop(id, initialData(id)).ok, false, id);
    assert.equal(checkWorkshop(id, { answer: id === 'harbour-route' ? '258' : 'MOON' }).ok, false, id);
  }
});
const permutations = a => a.length ? a.flatMap((x, i) => permutations(a.filter((_, j) => i !== j)).map(b => [x, ...b])) : [[]];
test('loading bay rejects the former queue answer and an undelivered layout', () => {
 assert.equal(checkWorkshop('parcel-queue',{order:['SUN','LEAF','STAR','MOON']}).ok,false);
 assert.equal(checkWorkshop('parcel-queue',{edition:3,positions:bayStart}).ok,false);
 assert.equal(checkWorkshop('parcel-queue',correct['parcel-queue']).ok,true);
});

test('Moon rescue completes with the final word alone and rejects partial or incorrect answers', () => {
 for(const answer of ['', 'DO', 'KCOD', 'FAIL']) assert.equal(checkWorkshop('signal-shift',{edition:4,answer}).ok,false);
 assert.equal(checkWorkshop('signal-shift',{edition:4,answer:'dock'}).ok,true);
});

test('evidence completion requires both the parcel and the false record; notes are optional', () => {
  const d = correct['shared-parcel'];
  for (const selected of ['B', 'C', 'D']) assert.equal(checkWorkshop('shared-parcel', { ...d, selected }).ok, false);
  for (const wrongRecord of [null, 1, 2, 4]) assert.equal(checkWorkshop('shared-parcel', { ...d, wrongRecord }).ok, false);
  assert.equal(checkWorkshop('shared-parcel', { ...d, excluded: ['A'] }).ok, false);
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
test('server-rendered page retains all six indexable puzzle definitions and credit-gated explanations', async () => {
  const html = await readFile('dist/client/en/escape-room-puzzles/index.html', 'utf8');
  assert.equal((html.match(/class="puzzle-card(?: [^"]*)?"/g) || []).length, 6);
  assert.match(html, /Six puzzles. Six ways to solve/);
  assert.match(html, /Clear saved progress/);
  for (const id of Object.keys(correct)) assert.ok(!html.includes(`id="${id}-solution" hidden=""`));
});


test('delivery route requires a checked consistent archive and all five stops', () => {
  const data = correct['stamp-code'];
  for (const patch of [
    { matches: ['PALM', 'LAMP', 'MAP', 'OAK'] },
    { matches: ['LAMP', 'PALM', '', 'OAK'] },
    { matches: ['LAMP', 'PALM', 'MAP', 'MAP'] },
    { verified: false }, { route: ['OAK', 'MALL', 'POOL', 'LOOM', ''] }, { route: ['MALL', 'OAK', 'POOL', 'LOOM', 'PALM'] }, { edition: 2 },
  ]) assert.equal(checkWorkshop('stamp-code', { ...data, ...patch }).ok, false);
  assert.equal(checkWorkshop('stamp-code', { letters: ['P', 'O', 'O', 'L'] }).ok, false);
  assert.match(checkWorkshop('stamp-code', { ...data, matches: ['MAP', 'PALM', 'LAMP', 'OAK'] }).message, /Record A has 4 shapes/);
  assert.match(checkWorkshop('stamp-code', { ...data, matches: ['PALM', 'LAMP', 'MAP', 'OAK'] }).message, /different letters/);
});

test('upgrading the first puzzle resets its obsolete OAK result and keeps the other five saves exactly', () => {
  const old = freshWorkshop(); old.active = 'shared-parcel';
  for (const [id, data] of Object.entries(correct)) old.items[id] = { ...freshItem(id), data, completion: 'independent', hints: 1, viewed: true, attempted: true, history: [initialData(id)] };
  old.items['stamp-code'] = { data: { letters: ['O', 'A', 'K'] }, completion: 'independent', hints: 3, viewed: true, attempted: true, history: [] };
  const next = restoreWorkshop(old);
  assert.deepEqual(next.items['stamp-code'], freshItem('stamp-code'));
  assert.equal(next.active, 'shared-parcel');
  for (const id of Object.keys(correct).filter(id => id !== 'stamp-code')) {
    assert.deepEqual(next.items[id].data, old.items[id].data);
    assert.deepEqual(next.items[id].history, old.items[id].history);
    assert.equal(next.items[id].completion, 'solution');
    assert.equal(next.items[id].hints, 1); assert.equal(next.items[id].viewed, true);
  }
});
