import test from 'node:test';
import assert from 'node:assert/strict';
import { crossesAnalyticsBoundary, isAnalyticsPage } from '../src/analytics-route.mjs';

test('analytics stays on public information pages and off private flows', () => {
  for (const route of ['/en/', '/en/themes/', '/en/themes/celebration/', '/en/pricing/', '/en/help/']) {
    assert.equal(isAnalyticsPage(route), true, route);
  }
  for (const route of ['/en/create/', '/en/checkout/', '/en/orders/demo/', '/en/orders/order-secret/', '/en/my-adventures/', '/en/account/', '/en/help/recover/', '/en/help/report/', '/en/unknown/']) {
    assert.equal(isAnalyticsPage(route), false, route);
  }
  assert.equal(crossesAnalyticsBoundary('/en/pricing/', '/en/checkout/'), true);
  assert.equal(crossesAnalyticsBoundary('/en/orders/order-secret/', '/en/themes/'), true);
  assert.equal(crossesAnalyticsBoundary('/en/themes/', '/en/pricing/'), false);
});
