import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from './worker.mjs';
import { offers, themes, publicCatalog } from '../shared/catalog.mjs';

const call = (path, method = 'GET') => handleApi(new Request(`https://preview.example${path}`, { method }));

test('catalog prices and sale gates match the agreed four SKUs', () => {
  assert.deepEqual(Object.fromEntries(offers.map(o => [o.sku, o.unitAmount])), {
    ready_home: 999, ready_classroom: 1499, custom_home: 1499, custom_classroom: 1999,
  });
  assert.ok(offers.every(o => o.saleEnabled === false));
  assert.ok(themes.every(t => t.home.readyStatus === 'not_published' && t.classroom.readyStatus === 'not_published'));
  assert.equal(publicCatalog().freeSampleThemeId, null);
  assert.equal(publicCatalog().freeSampleCandidateThemeId, 'celebration');
});

test('catalog is machine-readable but cannot imply a live product', async () => {
  const response = call('/api/v1/catalog');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.publicationState, 'development_preview');
  assert.equal(body.themes.length, 6);
  assert.equal(body.offers.length, 4);
});

test('unknown themes and unfinished commercial routes fail closed', async () => {
  assert.equal((await call('/api/v1/themes/not-real').json()).error.code, 'THEME_NOT_FOUND');
  const checkout = call('/api/v1/checkout-intents', 'POST');
  assert.equal(checkout.status, 503);
  assert.equal((await checkout.json()).error.code, 'CHECKOUT_NOT_READY');
  const order = call('/api/v1/orders/example');
  assert.equal(order.status, 503);
  assert.equal((await order.json()).error.code, 'ORDER_ACCESS_NOT_READY');
});
