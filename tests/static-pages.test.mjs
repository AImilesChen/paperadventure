import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicPages } from '../shared/page-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist', 'client');
const read = file => readFile(path.join(out, file), 'utf8');

test('every preview route has visible HTML and accurate noindex metadata', async () => {
  assert.equal(new Set(publicPages.map(page => page.path)).size, publicPages.length);
  for (const page of publicPages) {
    const html = await read(path.join(page.path.slice(1), 'index.html'));
    assert.match(html, /<div id="root">[\s\S]*<h1[ >]/, page.path);
    assert.ok(html.includes(`<title>${page.title.replaceAll('&', '&amp;')} | Paper Adventure Workshop</title>`), page.path);
    assert.ok(html.includes('<meta name="robots" content="noindex,nofollow" />'), page.path);
    assert.ok(html.includes(`<link rel="canonical" href="https://preview.paperadventure.app${page.path}" />`), page.path);
    assert.ok(html.includes('application/ld+json'), page.path);
    assert.ok(!html.includes('<div id="root"></div>'), page.path);
  }
});

test('preview blocks indexing at robots and response-header layers', async () => {
  assert.match(await read('robots.txt'), /Disallow: \/\s*$/);
  assert.match(await read('_headers'), /X-Robots-Tag: noindex, nofollow/);
  await assert.rejects(stat(path.join(out, 'sitemap.xml')), { code: 'ENOENT' });
});
