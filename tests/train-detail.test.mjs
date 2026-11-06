import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { trainPurchaseState } from '../src/trainPurchase.mjs';

const catalog = () => ({ escapeGames: [{ id: 'seventh-carriage', home: { readyStatus: 'published' } }], offers: [{ sku: 'ready_home', currency: 'USD', unitAmount: 999, saleEnabled: true }] });
test('purchase state separates request progress, failed requests, paused sales and a valid public offer', () => {
  assert.equal(trainPurchaseState(catalog(), 'loading').status, 'loading');
  assert.equal(trainPurchaseState(catalog(), 'error').status, 'error');
  assert.deepEqual(trainPurchaseState(catalog()), { status: 'available', amount: 999 });
  for (const c of [null, {}, { offers: [] }, { ...catalog(), offers: [{ ...catalog().offers[0], unitAmount: '999' }] }, { ...catalog(), offers: [{ ...catalog().offers[0], currency: 'EUR' }] }]) assert.equal(trainPurchaseState(c).status, 'error');
  const paused = catalog(); paused.escapeGames[0].home.readyStatus = 'paused'; assert.equal(trainPurchaseState(paused).status, 'unavailable');
  const disabled = catalog(); disabled.offers[0].saleEnabled = false; assert.equal(trainPurchaseState(disabled).status, 'unavailable');
  assert.equal(trainPurchaseState({ ...catalog(), escapeGames: [] }).status, 'unavailable');
});

test('train page uses actual availability and price without changing purchase destination or exposing paid answers', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { EscapeTrainDetail } = await vite.ssrLoadModule('/src/escapeTrain.jsx');
    const Link = ({ to, children, ...props }) => createElement('a', { href: to, ...props }, children);
    const render = props => renderToStaticMarkup(createElement(EscapeTrainDetail, { Link, catalog: catalog(), ...props }));
    const html = render({ catalogStatus: 'ready' });
    assert.match(html, /\/en\/checkout\/\?kind=ready&amp;setting=home&amp;theme=seventh-carriage/);
    assert.match(html, /US\$9\.99/);
    for (const value of ['Player Pack · 14 pages', 'Adult Guide · 8 pages', '20 pieces', 'no-cut', '12 months', 'classroom licence', 'not yet been verified']) assert.ok(html.includes(value), value);
    assert.equal((html.match(/class="td-mission-number"/g) || []).length, 6);
    assert.equal((html.match(/class="td-evidence-image"/g) || []).length, 3);
    assert.doesNotMatch(html, /K7|Moonbay|Bay 3|21:36|CONFIRM-RETURN-VERIFY|A-C-B-D|\/api\/v1\/orders\//);
    for (const catalogStatus of ['loading', 'error']) {
      const h = render({ catalogStatus }); assert.doesNotMatch(h, /href="[^\"]*checkout/); assert.doesNotMatch(h, /Checkout is currently unavailable/);
    }
    const paused = catalog(); paused.offers[0].saleEnabled = false;
    assert.doesNotMatch(render({ catalog: paused, catalogStatus: 'ready' }), /href="[^\"]*checkout/);
    const repriced = catalog(); repriced.offers[0].unitAmount = 1299;
    const repricedHtml = render({ catalog: repriced }); assert.match(repricedHtml, /US\$12\.99/); assert.doesNotMatch(repricedHtml, /US\$9\.99/);
  } finally { await vite.close(); }
});

test('public train previews are only selected images, with complete private files absent from public assets', async () => {
  for (const id of ['carriages', 'witness', 'survey']) assert.ok((await stat(`public/assets/train-detail-v2/${id}.webp`)).size > 100);
  const page = await readFile('dist/client/en/escape-room-games/the-missing-seventh-carriage/index.html', 'utf8');
  for (const [, id] of page.matchAll(/href="#([^\"]+)"/g)) assert.ok(page.includes(`id="${id}"`), id);
  assert.ok(page.includes('https://paperadventure.app/en/escape-room-games/the-missing-seventh-carriage/'));
  assert.doesNotMatch(page, /<iframe|\.pdf"|companion\.html|K7|Moonbay|21:36/);
});
