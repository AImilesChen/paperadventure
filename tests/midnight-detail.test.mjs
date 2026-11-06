import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { midnightPurchaseState, sharingCards, sharingResult } from '../src/midnightPurchase.mjs';

const catalog = () => ({ escapeGames: [{ id: 'seventh-carriage', home: { readyStatus: 'published' } }, { id: 'midnight-masquerade', home: { readyStatus: 'published' } }], offers: [{ sku: 'ready_home', currency: 'USD', unitAmount: 999, saleEnabled: true }] });
test('midnight offer checks the correct game and distinguishes request failures from paused sales', () => {
  assert.equal(midnightPurchaseState(catalog(), 'loading').status, 'loading');
  assert.equal(midnightPurchaseState(catalog(), 'error').status, 'error');
  assert.deepEqual(midnightPurchaseState(catalog()), { status: 'available', amount: 999 });
  const paused = catalog(); paused.escapeGames[1].home.readyStatus = 'paused';
  assert.equal(midnightPurchaseState(paused).status, 'unavailable');
  const disabled = catalog(); disabled.offers[0].saleEnabled = false;
  assert.equal(midnightPurchaseState(disabled).status, 'unavailable');
  for (const data of [null, {}, { ...catalog(), offers: [{ ...catalog().offers[0], unitAmount: '999' }] }, { ...catalog(), offers: [{ ...catalog().offers[0], currency: 'EUR' }] }]) assert.equal(midnightPurchaseState(data).status, 'error');
});

test('the unrelated sharing example needs all three distinct records, in any reveal order', () => {
  for (const subset of [[], ['A'], ['B'], ['C'], ['A','B'], ['B','C'], ['A','C'], ['A','A','B'], ['A','B','unknown']]) assert.equal(sharingResult(subset).answer, null);
  for (const order of [['A','B','C'], ['C','A','B'], ['B','C','A']]) assert.equal(sharingResult(order).answer, 'Ellis belongs at table 2.');
  assert.equal(sharingCards.length, 3);
  assert.equal(sharingResult(['A','A']).count, 1);
});

test('midnight detail states accurate preparation and protects the paid case while retaining the checkout contract', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { EscapeMidnightDetail } = await vite.ssrLoadModule('/src/escapeMidnight.jsx');
    const Link = ({ to, children, ...props }) => createElement('a', { href: to, ...props }, children);
    const render = props => renderToStaticMarkup(createElement(EscapeMidnightDetail, { Link, catalog: catalog(), ...props }));
    const html = render({ catalogStatus: 'ready' });
    assert.match(html, /checkout\/\?kind=ready&amp;setting=home&amp;theme=midnight-masquerade/);
    for (const value of ['3–6 players + 1 adult host', '22 player sheets', '12 PDFs', '31 cut game pieces', 'seven optional packet labels', 'Never give an entire portfolio sheet', '12 months', 'classroom licence', 'not yet been verified', 'separate teaching example']) assert.ok(html.includes(value), value);
    assert.equal((html.match(/class="md-round"/g)||[]).length, 6);
    assert.equal((html.match(/class="md-excerpt-image"/g)||[]).length, 3);
    assert.match(html, /name="midnight-group"[^>]*value="3"/);
    assert.doesNotMatch(html, /Iris|music box|N2 is valid|CONFIRM-RETURN-VERIFY|\/api\/v1\/orders\//i);
    for (const catalogStatus of ['loading','error']) { const h=render({catalogStatus});assert.doesNotMatch(h,/href="[^\"]*checkout/);assert.doesNotMatch(h,/Checkout is currently unavailable/); }
    const disabled=catalog();disabled.offers[0].saleEnabled=false;assert.doesNotMatch(render({catalog:disabled}),/href="[^\"]*checkout/);
    const repriced=catalog();repriced.offers[0].unitAmount=1299;const h=render({catalog:repriced});assert.match(h,/US\$12\.99/);assert.doesNotMatch(h,/US\$9\.99/);
  } finally { await vite.close(); }
});

test('built midnight page has working fragments and only the three selected public excerpt images', async () => {
  for (const name of ['seating','prompt','table']) assert.ok((await stat(`public/assets/midnight-detail-v2/${name}.webp`)).size>100);
  const html=await readFile('dist/client/en/escape-room-games/the-midnight-masquerade/index.html','utf8');
  for (const [,id] of html.matchAll(/href="#([^\"]+)"/g)) assert.ok(html.includes(`id="${id}"`),id);
  assert.match(html,/https:\/\/paperadventure.app\/en\/escape-room-games\/the-midnight-masquerade\//);
  assert.doesNotMatch(html,/href="[^\"]*(?:\.pdf|companion\.html)|Iris|music box|N2 is valid/i);
});
