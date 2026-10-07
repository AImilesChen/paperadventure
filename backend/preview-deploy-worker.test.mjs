import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './preview-deploy-worker.mjs';

const env = { ASSETS: { fetch: async request => new Response(new URL(request.url).pathname === '/index.html' ? '<html>Preview</html>' : '', { status: new URL(request.url).pathname === '/index.html' ? 200 : 404, headers: { 'content-type': 'text/html' } }) } };

test('hosted preview serves SPA routes without enabling checkout and blocks indexing', async () => {
  const page = await worker.fetch(new Request('https://preview.paperadventure.app/en/themes/dinosaur/', { headers: { accept: 'text/html' } }), env);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.match(await page.text(), /Preview/);
  const payment = await worker.fetch(new Request('https://preview.paperadventure.app/api/v1/checkout-intents', { method: 'POST' }), env);
  assert.equal(payment.status, 503);
  assert.equal((await payment.json()).error.code, 'CHECKOUT_NOT_READY');
  const robots = await worker.fetch(new Request('https://preview.paperadventure.app/robots.txt'), env);
  assert.match(await robots.text(), /User-agent: AhrefsSiteAudit\nAllow: \//);
});
