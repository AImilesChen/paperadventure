import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { letterPurchaseState, freshChoiceDemo, choiceDemoView, changeChoiceDemo, freshPreparation, preparationView, changePreparation } from '../src/letterDetailModel.mjs';

const catalog = () => ({ escapeGames: [{ id: 'thirteenth-hour', home: { readyStatus: 'published' } }, { id: 'last-letter', home: { readyStatus: 'published' } }], offers: [{ sku: 'ready_home', currency: 'USD', unitAmount: 999, saleEnabled: true }] });
test('letter checkout distinguishes this game, failed requests, paused sales and live pricing', () => {
  assert.equal(letterPurchaseState(catalog(), 'loading').status, 'loading');
  assert.equal(letterPurchaseState(catalog(), 'error').status, 'error');
  assert.deepEqual(letterPurchaseState(catalog()), { status: 'available', amount: 999 });
  const paused = catalog(); paused.escapeGames[1].home.readyStatus = 'paused';
  assert.equal(letterPurchaseState(paused).status, 'unavailable');
  const disabled = catalog(); disabled.offers[0].saleEnabled = false;
  assert.equal(letterPurchaseState(disabled).status, 'unavailable');
  for (const data of [null, {}, { ...catalog(), offers: [{ ...catalog().offers[0], unitAmount: '999' }] }, { ...catalog(), offers: [{ ...catalog().offers[0], currency: 'EUR' }] }]) assert.equal(letterPurchaseState(data).status, 'error');
});

test('sample choices account for every legal budget and reject an unaffordable handover', () => {
  let completed = 0;
  for (const [route, cost] of [['a', 2], ['b', 4]]) for (const helped of [false, true]) {
    let state = changeChoiceDemo(freshChoiceDemo(), { type: 'route', value: route });
    state = changeChoiceDemo(state, { type: 'help', value: helped });
    assert.equal(choiceDemoView(state).beforeDelivery, 6 - cost - Number(helped));
    for (const [delivery, fee] of [['direct', 2], ['desk', 1]]) {
      const next = changeChoiceDemo(state, { type: 'delivery', value: delivery });
      if (6 - cost - Number(helped) < fee) { assert.strictEqual(next, state); continue; }
      completed++;
      assert.equal(choiceDemoView(next).remaining, 6 - cost - Number(helped) - fee);
      assert.ok(choiceDemoView(next).remaining >= 0);
    }
  }
  assert.equal(completed, 7);
});

test('earlier sample decisions clear downstream choices and cannot earn help before a route', () => {
  const start = freshChoiceDemo();
  assert.strictEqual(changeChoiceDemo(start, { type: 'help', value: true }), start);
  assert.strictEqual(changeChoiceDemo(start, { type: 'delivery', value: 'desk' }), start);
  let state = changeChoiceDemo(start, { type: 'route', value: 'a' });
  state = changeChoiceDemo(state, { type: 'help', value: false });
  state = changeChoiceDemo(state, { type: 'delivery', value: 'direct' });
  assert.deepEqual(changeChoiceDemo(state, { type: 'route', value: 'b' }), { route: 'b', helped: null, delivery: null });
  assert.equal(changeChoiceDemo(state, { type: 'help', value: true }).delivery, null);
  assert.deepEqual(changeChoiceDemo(state, { type: 'reset' }), start);
});

test('print recipes retain every open option and the exact prepared-route page inventory', () => {
  assert.deepEqual(preparationView(freshPreparation()).pages, Array.from({ length: 20 }, (_, i) => i + 1));
  assert.deepEqual(preparationView({ ...freshPreparation(), mode: 'route', route: 'press' }).pages, [1,2,3,4,5,6,7,8,9,10,14,15,16,20]);
  assert.deepEqual(preparationView({ ...freshPreparation(), mode: 'tool', route: 'station', tool: 'lamp' }).pages, [1,2,3,4,5,6,7,8,9,10,18,19,20]);
  for (const route of ['dock', 'press', 'station']) {
    assert.equal(preparationView({ ...freshPreparation(), mode: 'route', route }).pages.length, 14);
    for (const tool of ['folder', 'lamp']) assert.equal(preparationView({ ...freshPreparation(), mode: 'tool', route, tool }).pages.length, 13);
  }
});

test('all 22 valid fully fixed preparations have nine or ten sheets and preserve affordable delivery', () => {
  let valid = 0;
  for (const route of ['dock', 'press', 'station']) for (const tool of ['folder', 'lamp']) for (const helped of [false, true]) for (const delivery of ['home', 'office']) {
    const state = { mode: 'fixed', route, tool, helped, delivery };
    if (route === 'station' && helped && delivery === 'home') { assert.throws(() => preparationView(state), /cannot afford/); continue; }
    valid++;
    const pages = preparationView(state).pages;
    assert.equal(pages.length, helped ? 10 : 9);
    assert.equal(pages.includes(4), helped);
    assert.ok(pages.includes(20));
    assert.equal(pages.filter(p => p >= 7 && p <= 10).length, 1);
  }
  assert.equal(valid, 22);
  const changed = changePreparation({ mode: 'fixed', route: 'dock', tool: 'folder', helped: true, delivery: 'home' }, { route: 'station' });
  assert.equal(changed.delivery, 'office');
  assert.deepEqual(preparationView(changed).pages, [1,2,3,4,5,6,10,17,19,20]);
});

test('letter detail renders the correct guarded checkout, truthful scope and independent demonstration', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { EscapeLetterDetail } = await vite.ssrLoadModule('/src/escapeLetter.jsx');
    const Link = ({ to, children, ...props }) => createElement('a', { href: to, ...props }, children);
    const render = props => renderToStaticMarkup(createElement(EscapeLetterDetail, { Link, catalog: catalog(), ...props }));
    const html = render({});
    assert.match(html, /checkout\/\?kind=ready&amp;setting=home&amp;theme=last-letter/);
    for (const text of ['2–6 players + 1 adult host', 'Independent teaching example', '22 legal complete paths', 'not 22 independent stories or endings', 'Print 20 player sheets', 'Player Pack · 20 pages', 'Adult Guide · 8 pages', 'Four PDFs', '12 months', 'not yet been verified', 'classroom licence', 'No cutting or folding']) assert.ok(html.includes(text), text);
    assert.equal((html.match(/class="ll-act-number"/g) || []).length, 6);
    assert.equal((html.match(/class="ll-excerpt-image"/g) || []).length, 3);
    for (const catalogStatus of ['loading', 'error']) { const h = render({ catalogStatus }); assert.doesNotMatch(h, /href="[^\"]*checkout/); assert.doesNotMatch(h, /Checkout is currently unavailable/); }
    const paused = catalog(); paused.escapeGames[1].home.readyStatus = 'paused'; assert.doesNotMatch(render({ catalog: paused }), /href="[^\"]*checkout/);
    const repriced = catalog(); repriced.offers[0].unitAmount = 1299; const h = render({ catalog: repriced }); assert.match(h, /US\$12\.99/); assert.doesNotMatch(h, /US\$9\.99/);
  } finally { await vite.close(); }
});

test('built letter page has real fragment targets and three selected excerpts without public paid downloads', async () => {
  for (const id of ['seal', 'record', 'routes']) assert.ok((await stat(`public/assets/letter-detail-v2/${id}.webp`)).size > 100);
  const html = await readFile('dist/client/en/escape-room-games/the-last-letter-before-the-storm/index.html', 'utf8');
  for (const [, id] of html.matchAll(/href="#([^\"]+)"/g)) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /https:\/\/paperadventure.app\/en\/escape-room-games\/the-last-letter-before-the-storm\//);
  assert.doesNotMatch(html, /href="[^\"]*(?:\.pdf|companion\.html)|\/api\/v1\/orders\//);
});
