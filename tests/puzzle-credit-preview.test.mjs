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

test('public games use the server wallet with a free first hint and no demo reset',async()=>{
 const html=await readFile('dist/client/en/escape-room-puzzles/index.html','utf8');
 assert.doesNotMatch(html,/demo credits|DEMO CREDITS|Reset demo balance/);assert.match(html,/Which word matches each stamp record\?/);assert.match(html,/Hint 1/);assert.match(html,/First hint free/);assert.match(html,/up to 5 credits total/);
 const source=await readFile('src/puzzleWorkshop.jsx','utf8');assert.match(source,/useGameCredits/);assert.doesNotMatch(source,/useCreditPreview|import\.meta\.env\.DEV/);
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


test('parcel help spending is credited toward the 5-credit complete explanation', () => {
  let wallet=freshCreditPreview();
  for(const [kind,cost] of [['hint-1',0],['hint-2',1],['hint-3',2],['solution',2]]){
    const before=structuredClone(wallet),quote=quoteHelp(wallet,'shared-parcel',kind);assert.equal(quote.cost,cost);assert.deepEqual(wallet,before);
    const result=unlockPreviewHelp(wallet,'shared-parcel',kind);assert.equal(result.charged,cost);wallet=result.wallet;
  }
  assert.equal(wallet.balance,3);assert.equal(wallet.spentByEdition['shared-parcel@3'],5);
  for(const kind of ['hint-1','hint-2','hint-3','solution'])assert.equal(unlockPreviewHelp(wallet,'shared-parcel',kind).charged,0);
  assert.equal(unlockPreviewHelp(freshCreditPreview(),'shared-parcel','solution').charged,5);
});

test('parcel discount survives reload and activity truncation, with old edition unlocks kept separate', () => {
  let wallet=unlockPreviewHelp(freshCreditPreview(),'shared-parcel','hint-2').wallet;
  wallet=unlockPreviewHelp(wallet,'shared-parcel','hint-3').wallet;
  for(let i=0;i<105;i++)wallet=resetDemoBalance(wallet);
  wallet=restoreCreditPreview(JSON.parse(JSON.stringify(wallet)));
  assert.equal(wallet.history.length,100);assert.equal(quoteHelp(wallet,'shared-parcel','solution').cost,2);
  const old=restoreCreditPreview({version:1,balance:3,unlocked:['shared-parcel@1:solution','shared-parcel@2:solution'],spentByEdition:{'shared-parcel@2':5}});
  assert.equal(quoteHelp(old,'shared-parcel','solution').owned,false);assert.equal(quoteHelp(old,'shared-parcel','solution').cost,5);
});

test('parcel insufficient upgrade is atomic and completion earns the full explanation free', () => {
  let wallet=unlockPreviewHelp(freshCreditPreview(),'shared-parcel','hint-2').wallet;
  wallet=unlockPreviewHelp(wallet,'shared-parcel','hint-3').wallet;wallet={...wallet,balance:1};
  const before=structuredClone(wallet),failed=unlockPreviewHelp(wallet,'shared-parcel','solution');assert.equal(failed.ok,false);assert.deepEqual(failed.wallet,before);
  const earned=unlockPreviewHelp(wallet,'shared-parcel','solution',true);assert.equal(earned.charged,0);assert.equal(earned.wallet.balance,1);assert.equal(quoteHelp(earned.wallet,'shared-parcel','hint-3').cost,0);
  // Existing games retain their approved prices, independently of parcel spending.
  assert.equal(quoteHelp(wallet,'signal-shift','solution').cost,5);
});
