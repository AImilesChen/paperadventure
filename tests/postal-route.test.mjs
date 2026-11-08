import test from 'node:test';
import assert from 'node:assert/strict';
import { postalWords, postalClues, postalClueText, postalTests, inspectPostalRoute, linkedPostalPair, movePostalStop } from '../shared/stamp-investigation.mjs';
import { freshWorkshop, freshItem, restoreWorkshop, cleanData, checkWorkshop, changeData, undoItem } from '../shared/puzzle-workshop.mjs';
import { freshCreditPreview, restoreCreditPreview, helpKey, quoteHelp, rememberOpenedHelp } from '../shared/puzzle-credit-preview.mjs';
const permute = a => a.length ? a.flatMap((x, i) => permute(a.filter((_, j) => j !== i)).map(rest => [x, ...rest])) : [[]];
const answer = ['OAK', 'MALL', 'POOL', 'LOOM', 'PALM'];
const solved = { ...freshItem('stamp-code').data, matches: ['LAMP', 'PALM', 'MAP', 'OAK'], verified: true, route: answer };

test('all 120 postal routes have exactly one solution and every record is necessary', () => {
  const routes = permute(postalWords);
  assert.equal(routes.length, 120);
  assert.deepEqual(routes.filter(route => inspectPostalRoute(route).ok), [answer]);
  assert.deepEqual(postalClues.map(postalClueText), [
    'MALL was visited before PALM, but not necessarily immediately before it.',
    'Exactly one stop was between PALM and POOL. Either could come first.',
    'Immediately after POOL, the courier visited LOOM.',
    'OAK and MALL were next to each other. Either could come first.',
    'POOL was not the stop immediately after OAK.',
  ]);
  for (let omit = 0; omit < 5; omit++) {
    const alternatives = routes.filter(route => postalTests.every((test, i) => i === omit || test(Object.fromEntries(route.map((word, n) => [word, n])))));
    assert.ok(alternatives.length > 1, `record ${omit + 1}`);
  }
});

test('correct route requires the earned checked key; old POOL or final PALM alone cannot pass', () => {
  assert.equal(checkWorkshop('stamp-code', solved).ok, true);
  for (const patch of [{ verified: false }, { matches: ['PALM','LAMP','MAP','OAK'] }, { route: ['', '', '', '', 'PALM'] }, { route: ['OAK', 'MALL', 'POOL', 'POOL', 'PALM'] }, { route: undefined, letters: ['P','O','O','L'] }]) assert.equal(checkWorkshop('stamp-code', { ...solved, ...patch }).ok, false);
  assert.equal(inspectPostalRoute(['MALL','OAK','POOL','LOOM','PALM']).clue, 5);
  assert.equal(inspectPostalRoute(['POOL','LOOM','PALM','OAK','MALL']).clue, 1);
});

test('card swaps and all linked-pair moves retain exactly the same stops without splitting the pair', () => {
  assert.deepEqual(movePostalStop(answer, 'OAK', 1), ['MALL','OAK','POOL','LOOM','PALM']);
  assert.deepEqual(movePostalStop(answer, 'POOL', 0, ['POOL','LOOM']), ['POOL','LOOM','OAK','MALL','PALM']);
  for (const route of permute(postalWords)) for (let start = 0; start < 4; start++) for (let target = 0; target < 5; target++) {
    const pair = route.slice(start, start + 2), moved = movePostalStop(route, pair[0], target, pair);
    assert.deepEqual([...moved].sort(), [...postalWords].sort());
    assert.equal(linkedPostalPair(moved, pair), true);
  }
  const item = changeData(freshItem('stamp-code'), 'stamp-code', { ...solved, pair: ['POOL','LOOM'] });
  assert.deepEqual(undoItem(item).data, freshItem('stamp-code').data);
});

test('edition-3 migration retains archive, key and legacy completion, not the obsolete final answer', () => {
  const source = freshWorkshop();
  source.items['stamp-code'] = { data: { edition: 3, matches: solved.matches, verified: true, letters: ['P','O','O','L'] }, history: [], hints: 1, viewed: false, completion: 'independent' };
  source.items['forest-trail'].data.moves = ['E'];
  const loaded = restoreWorkshop(source), item = loaded.items['stamp-code'];
  assert.equal(item.data.edition, 4); assert.deepEqual(item.data.matches, solved.matches); assert.equal(item.data.verified, true);
  assert.equal(item.completion, null); assert.equal(item.routeHints, 0); assert.equal(item.hints, 1);
  assert.deepEqual(item.legacyCompletion, { edition: 3, completion: 'independent' });
  assert.deepEqual(item.data.route, ['', '', '', '', '']);
  assert.deepEqual(loaded.items['forest-trail'], source.items['forest-trail']);
  assert.deepEqual(restoreWorkshop(loaded).items['stamp-code'], item);
  source.items['stamp-code'].data.route = answer;
  assert.equal(restoreWorkshop(source).items['stamp-code'].completion, null);
  source.items['stamp-code'].data.letters = 'POOL';
  assert.doesNotThrow(() => restoreWorkshop(source));
});

test('partial routes, translations and read marks survive reload, invalid pairs and malformed saves are bounded', () => {
  const state = freshWorkshop();
  state.items['stamp-code'].data = { ...solved, route: ['POOL','LOOM','','',''], pair: ['POOL','LOOM'], notes: ['MALL','PALM','',''], readClues: [0,2] };
  assert.deepEqual(restoreWorkshop(state).items['stamp-code'].data, state.items['stamp-code'].data);
  const clean = cleanData('stamp-code', { ...solved, route: ['POOL','POOL','oops',null,'PALM'], pair: ['POOL','PALM'], notes: ['<script>', 34], readClues: [1,1,9,'private'] });
  assert.deepEqual(clean.route, ['POOL','','','','PALM']); assert.deepEqual(clean.pair, []); assert.deepEqual(clean.readClues, [1]);
  assert.equal(clean.notes[0], 'SCRI');
});

test('route hints classify assisted completion and already unlocked older demo help is not rebilled', () => {
  const state = freshWorkshop(); state.items['stamp-code'] = { ...freshItem('stamp-code'), data: solved, completion: 'independent', routeHints: 1 };
  assert.equal(restoreWorkshop(state).items['stamp-code'].completion, 'hint');
  const wallet = restoreCreditPreview({ ...freshCreditPreview(), balance: 3, unlocked: ['stamp-code@3:solution'] });
  assert.equal(quoteHelp(wallet, 'stamp-code', 'solution').cost, 0);
  assert.equal(quoteHelp(wallet, 'stamp-code', 'hint-3').cost, 0);
  assert.equal(wallet.balance, 3);
  const remembered = rememberOpenedHelp(freshCreditPreview(), state);
  assert.ok(remembered.unlocked.includes(helpKey('stamp-code', 'hint-1')));
});
