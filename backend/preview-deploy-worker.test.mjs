import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './preview-deploy-worker.mjs';

const env = { ASSETS: { fetch: async request => new Response(new URL(request.url).pathname === '/app-shell.txt' ? '<html>Preview</html>' : '', { status: new URL(request.url).pathname === '/app-shell.txt' ? 200 : 404, headers: { 'content-type': 'text/plain' } }) } };

test('preview aliases stay noindex while canonical content pages are crawlable', async () => {
  const preview = await worker.fetch(new Request('https://preview.paperadventure.app/en/themes/dinosaur/', { headers: { accept: 'text/html' } }), env);
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get('x-robots-tag'), 'noindex');
  assert.match(await preview.text(), /Preview/);
  const previewRobots = await worker.fetch(new Request('https://preview.paperadventure.app/robots.txt'), env);
  assert.match(await previewRobots.text(), /User-agent: \*\nDisallow: \//);
  const home = await worker.fetch(new Request('https://paperadventure.app/en/for-home/', { headers: { accept: 'text/html' } }), env);
  assert.equal(home.status, 200);
  assert.equal(home.headers.get('x-robots-tag'), null);
  const privatePage = await worker.fetch(new Request('https://paperadventure.app/en/account/', { headers: { accept: 'text/html' } }), env);
  assert.equal(privatePage.headers.get('x-robots-tag'), 'noindex');
  const robots = await worker.fetch(new Request('https://paperadventure.app/robots.txt'), env);
  assert.match(await robots.text(), /User-agent: \*\nAllow: \//);
  assert.match(robots.headers.get('content-type'), /text\/plain/);
});

test('the root URL redirects to the English homepage', async () => {
  const response = await worker.fetch(new Request('https://paperadventure.app/'), env);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://paperadventure.app/en/');
});

test('a refreshed private order stays on its URL and receives the app shell', async () => {
  const calls = [];
  const orderUrl = 'https://paperadventure.app/en/orders/00000000-0000-4000-8000-000000000001/';
  const orderEnv = { ASSETS: { fetch: async request => {
    const path = new URL(request.url).pathname;
    calls.push(path);
    if (path === '/index.html') return Response.redirect('https://paperadventure.app/', 307);
    return new Response(path === '/app-shell.txt' ? '<html>Order app</html>' : '', {
      status: path === '/app-shell.txt' ? 200 : 404,
      headers: { 'content-type': 'text/plain' },
    });
  } } };
  const response = await worker.fetch(new Request(orderUrl, { headers: { accept: 'text/html', 'sec-fetch-mode': 'navigate' } }), orderEnv);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('location'), null);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.equal(response.headers.get('x-robots-tag'), 'noindex');
  assert.equal(await response.text(), '<html>Order app</html>');
  assert.deepEqual(calls, ['/app-shell.txt']);
});


test('hosted API forwards same-origin requests to the deployed backend binding', async () => {
  let forwarded;
  const linked = { ...env, BACKEND_STAGE: { fetch: async request => {
    forwarded = request;
    return Response.json({ status: 'configured_runtime', checkout: false });
  } } };
  const incoming = new Request('https://paperadventure.app/api/v1/health');
  const response = await worker.fetch(incoming, linked);
  assert.equal(forwarded, incoming);
  assert.equal((await response.json()).status, 'configured_runtime');
});

test('admin shell and deep links are private, non-cacheable and cannot be framed',async()=>{
 for(const path of ['/admin','/admin/','/admin/messages/feedback/example/']){
  const response=await worker.fetch(new Request('https://paperadventure.app'+path,{headers:{accept:'text/html'}}),env);
  assert.equal(response.status,200);assert.equal(response.headers.get('x-robots-tag'),'noindex');
  assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('x-frame-options'),'DENY');
  assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 }
 const write=await worker.fetch(new Request('https://paperadventure.app/admin/',{method:'POST'}),env);assert.equal(write.status,404);
});
