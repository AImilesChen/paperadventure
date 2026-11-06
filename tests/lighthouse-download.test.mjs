import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { prepareLighthousePack } from '../src/lighthouseDownload.mjs';
import { conversionProperties } from '../src/conversionEvents.mjs';

test('complete lighthouse ZIP uses two checked matching PDFs and includes start instructions', async () => {
  for (const paper of ['A4', 'Letter']) {
    const calls = [], originals = [];
    const result = await prepareLighthousePack({ paper, fetcher: async (url, options) => {
      calls.push(url); assert.equal(options.credentials, 'same-origin'); assert.ok(options.signal);
      const bytes = await readFile('public' + url); originals.push(bytes);
      return new Response(bytes, { headers: { 'content-type': 'application/pdf' } });
    } });
    assert.deepEqual(calls, ['players', 'guide'].map(role => `/assets/lighthouse/sleeping-lighthouse-${paper}-${role}.pdf`));
    assert.equal(result.filename, `The-Sleeping-Lighthouse-${paper}-complete.zip`);
    assert.equal(result.blob.type, 'application/zip');
    const zip = Buffer.from(await result.blob.arrayBuffer());
    for (const pdf of originals) assert.ok(zip.includes(pdf), 'stored ZIP preserves the exact supplied PDF bytes');
    assert.ok(zip.includes(Buffer.from('START-HERE.txt')));
    assert.ok(zip.includes(Buffer.from('This is a webpage, not an offline file in this ZIP.')));
    assert.ok(zip.includes(Buffer.from(`Selected paper size: ${paper === 'Letter' ? 'US Letter' : 'A4'}`)));
  }
});

test('an incomplete or mislabeled pair rejects instead of producing a partial game ZIP; retry can succeed', async () => {
  for (const bad of [() => new Response('missing', { status: 404 }), () => new Response('<html>error</html>', { headers: { 'content-type': 'application/pdf' } }), () => new Response('%PDF-mislabeled', { headers: { 'content-type': 'text/html' } })]) {
    let signal;
    await assert.rejects(prepareLighthousePack({ paper: 'A4', fetcher: async (url, options) => {
      signal = options.signal;
      return url.includes('guide') ? bad() : new Response('%PDF-1.7\nplayer', { headers: { 'content-type': 'application/pdf' } });
    } }));
    assert.equal(signal.aborted, true);
  }
  const retry = await prepareLighthousePack({ paper: 'Letter', fetcher: async () => new Response('%PDF-1.7\nretry', { headers: { 'content-type': 'application/pdf' } }) });
  assert.equal(retry.blob.type, 'application/zip');
});

test('invalid paper makes no request and complete-download telemetry excludes private fields', async () => {
  let calls = 0;
  for (const paper of ['A3', '', null, {}, 'Letter?private']) await assert.rejects(prepareLighthousePack({ paper, fetcher: () => { calls++; } }));
  assert.equal(calls, 0);
  assert.deepEqual(conversionProperties('escape_pdf_download', { game: 'sleeping-lighthouse', paper: 'A4', file: 'complete', answer: 'PRIVATE', email: 'PRIVATE' }), { game: 'sleeping-lighthouse', paper: 'A4', file: 'complete' });
});
