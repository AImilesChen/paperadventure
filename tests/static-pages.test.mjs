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
    assert.match(html, /<div id="root" data-clarity-mask="true">[\s\S]*<h1[ >]/, page.path);
    assert.ok(html.includes(`<title>${page.title.replaceAll('&', '&amp;')} | Paper Adventure Workshop</title>`), page.path);
    assert.ok(html.includes('<meta name="robots" content="noindex,nofollow" />'), page.path);
    assert.ok(html.includes(`<link rel="canonical" href="https://paperadventure.app${page.path}" />`), page.path);
    assert.ok(html.includes('application/ld+json'), page.path);
    assert.ok(!html.includes('<div id="root" data-clarity-mask="true"></div>'), page.path);
  }
});

test('preview permits Ahrefs auditing while blocking other bots and indexing', async () => {
  const robots = await read('robots.txt');
  assert.match(robots, /User-agent: AhrefsSiteAudit\nAllow: \/\n/);
  assert.match(robots, /User-agent: AhrefsBot\nAllow: \/\n/);
  assert.match(robots, /User-agent: \*\nDisallow: \/\s*$/);
  assert.match(await read('_headers'), /X-Robots-Tag: noindex, nofollow/);
  await assert.rejects(stat(path.join(out, 'sitemap.xml')), { code: 'ENOENT' });
});

test('root entry redirects to the English home while retaining the preview notice', async () => {
  const html = await read('index.html');
  assert.match(html, /location\.pathname === '\/'\) location\.replace\('\/en\/'/);
  assert.match(html, /Purchases, downloads and generated adventures are not available yet/);
});

test('preview HTML never loads analytics vendors before a visitor chooses', async () => {
  const html = await read('en/index.html');
  assert.doesNotMatch(html, /<script[^>]+src="https:\/\/(?:www\.googletagmanager\.com|www\.clarity\.ms|analytics\.ahrefs\.com|plausible\.shipsolo\.io)/);
  assert.match(html, /<div id="root" data-clarity-mask="true">/);
});
