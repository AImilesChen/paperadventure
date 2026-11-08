import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { freshCreditPreview, restoreCreditPreview, quoteHelp, unlockPreviewHelp, rememberOpenedHelp, resetDemoBalance, helpKey } from '../shared/puzzle-credit-preview.mjs';
import { freshWorkshop } from '../shared/puzzle-workshop.mjs';

test('preview quotes use fixed 0/1/2/5 prices and do not mutate or unlock the wallet', () => {
  const wallet = freshCreditPreview(), before = structuredClone(wallet);
  assert.equal(wallet.balance, 8);
  for (const [kind, cost] of [['hint-1', 0], ['hint-2', 1], ['hint-3', 2], ['solution', 5]]) {
    assert.equal(quoteHelp(wallet, 'stamp-code', kind).cost, cost);
    assert.equal(quoteHelp(wallet, 'stamp-code', kind).remaining, 8 - cost);
  }
  assert.deepEqual(wallet, before);
  assert.equal(quoteHelp(wallet, 'unknown', 'solution').ok, false);
  assert.equal(quoteHelp(wallet, 'stamp-code', 'custom-price').ok, false);
});

test('one content key charges once, even on repeated unlock calls, and other puzzles remain separate', () => {
  const initial = freshCreditPreview();
  const first = unlockPreviewHelp(initial, 'stamp-code', 'hint-2');
  assert.equal(first.charged, 1); assert.equal(first.wallet.balance, 7);
  const again = unlockPreviewHelp(first.wallet, 'stamp-code', 'hint-2');
  assert.equal(again.wallet, first.wallet); assert.equal(again.charged, 0);
  assert.equal(again.wallet.history.length, 1);
  const other = unlockPreviewHelp(again.wallet, 'signal-shift', 'hint-2');
  assert.equal(other.wallet.balance, 6); assert.equal(other.wallet.unlocked.length, 2);
  assert.deepEqual(initial, freshCreditPreview());
});

test('insufficient credits never change balance, entitlements or history', () => {
  let wallet = unlockPreviewHelp(freshCreditPreview(), 'stamp-code', 'solution').wallet;
  wallet = unlockPreviewHelp(wallet, 'stamp-code', 'hint-3').wallet;
  const before = structuredClone(wallet), result = unlockPreviewHelp(wallet, 'signal-shift', 'solution');
  assert.equal(result.ok, false); assert.equal(result.reason, 'insufficient-credits');
  assert.equal(result.wallet, wallet); assert.deepEqual(result.wallet, before);
  assert.equal(quoteHelp(wallet, 'signal-shift', 'hint-1').affordable, true);
});

test('all hints and a solution use exactly eight sample credits and reopening at zero is free', () => {
  let wallet = freshCreditPreview();
  for (const kind of ['hint-1', 'hint-2', 'hint-3', 'solution']) wallet = unlockPreviewHelp(wallet, 'stamp-code', kind).wallet;
  assert.equal(wallet.balance, 0); assert.equal(wallet.history.reduce((sum, row) => sum + row.cost, 0), 8);
  assert.equal(unlockPreviewHelp(wallet, 'stamp-code', 'solution').ok, true);
  assert.equal(unlockPreviewHelp(wallet, 'stamp-code', 'solution').charged, 0);
  assert.equal(unlockPreviewHelp(wallet, 'parcel-queue', 'hint-2').ok, false);
});

test('previously opened free help is honoured without billing and a solved puzzle earns its explanation', () => {
  const workshop = freshWorkshop(); workshop.items['stamp-code'].hints = 2; workshop.items['shared-parcel'].viewed = true;
  const wallet = rememberOpenedHelp(freshCreditPreview(), workshop);
  assert.equal(wallet.balance, 8); assert.equal(wallet.history.length, 0);
  assert.equal(quoteHelp(wallet, 'stamp-code', 'hint-2').cost, 0);
  assert.equal(quoteHelp(wallet, 'shared-parcel', 'solution').cost, 0);
  const earned = unlockPreviewHelp(wallet, 'harbour-route', 'solution', true);
  assert.equal(earned.charged, 0); assert.equal(earned.wallet.balance, 8);
});

test('resetting sample balance keeps unlocked help and restoring a save keeps its transactions', () => {
  const wallet = unlockPreviewHelp(freshCreditPreview(), 'stamp-code', 'solution').wallet;
  const reset = resetDemoBalance(wallet);
  assert.equal(reset.balance, 8); assert.deepEqual(reset.unlocked, wallet.unlocked);
  assert.equal(reset.history.at(-1).kind, 'demo-reset');
  assert.deepEqual(restoreCreditPreview(JSON.parse(JSON.stringify(reset))), reset);
  assert.equal(quoteHelp(reset, 'stamp-code', 'solution').cost, 0);
});

test('corrupt balances and obsolete content editions cannot create current unlocks', () => {
  for (const balance of [-1, Infinity, NaN, '999', 0.5, 10001]) assert.deepEqual(restoreCreditPreview({ version: 1, balance }), freshCreditPreview());
  const wallet = restoreCreditPreview({ version: 1, balance: 5, unlocked: ['stamp-code@2:solution', helpKey('stamp-code', 'hint-2'), 'evil'], history: [null, { kind: 'solution', cost: -9 }] });
  assert.deepEqual(wallet.unlocked, [helpKey('stamp-code', 'hint-2')]);
  assert.equal(quoteHelp(wallet, 'stamp-code', 'solution').cost, 5);
  assert.deepEqual(wallet.history, []);
});

test('credit preview is gated to local dev after mount; public HTML stays free and contains the visible premise', async () => {
  const html = await readFile('dist/client/en/escape-room-puzzles/index.html', 'utf8');
  assert.doesNotMatch(html, /demo credits|Full solution · 5 credits|DEMO CREDITS/);
  assert.match(html, /Which word matches each stamp record\?/);
  assert.match(html, /<p class="si-premise">Each row is one of these four words written in symbols\. The word labels have been shuffled\.<\/p>/);
  assert.doesNotMatch(html, /<details[^>]*class="si-premise"/);
  const source = await readFile('src/puzzleWorkshop.jsx', 'utf8');
  assert.match(source, /import\.meta\.env\.DEV/);
  assert.match(source, /\['localhost', '127\.0\.0\.1'\]\.includes/);
});


test('a full solution includes all lower hint tiers, including a previously saved solution entitlement', () => {
  const result = unlockPreviewHelp(freshCreditPreview(), 'parcel-queue', 'solution');
  assert.equal(result.wallet.balance, 3); assert.equal(result.wallet.unlocked.length, 4);
  for (const kind of ['hint-1', 'hint-2', 'hint-3', 'solution']) {
    assert.equal(quoteHelp(result.wallet, 'parcel-queue', kind).cost, 0);
    assert.equal(unlockPreviewHelp(result.wallet, 'parcel-queue', kind).wallet.balance, 3);
  }
  const legacy = restoreCreditPreview({ version: 1, balance: 3, unlocked: [helpKey('stamp-code', 'solution')] });
  assert.equal(quoteHelp(legacy, 'stamp-code', 'hint-3').cost, 0);
});
