import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicPages } from '../shared/page-manifest.mjs';
import { themes } from '../shared/catalog.mjs';

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

test('brand icons and social card are built and linked from every preview route', async () => {
  const html = await read('en/index.html');
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\/icon\.svg"/);
  assert.match(html, /<link rel="icon" type="image\/x-icon" href="\/favicon\.ico"/);
  assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png"/);
  assert.match(html, /<meta property="og:image" content="https:\/\/paperadventure\.app\/og-image\.jpg"/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/paperadventure\.app\/og-image\.jpg"/);
  for (const file of ['icon.svg', 'brand-wordmark.svg', 'brand-horizontal.svg', 'brand-stacked.svg', 'favicon.ico', 'favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png', 'icon-512.png', 'og-image.jpg']) {
    assert.ok((await stat(path.join(out, file))).size > 0, file);
  }
});

test('theme detail distinguishes both fixed-pack previews from unavailable payment', async () => {
  const html = await read('en/themes/celebration/index.html');
  for (const setting of ['home', 'classroom']) {
    assert.ok(html.includes(`/en/checkout/demo/?kind=ready&amp;theme=celebration&amp;setting=${setting}`));
  }
  assert.match(html, /<button[^>]*disabled[^>]*>Home(?:<!-- -->)? pack not available<\/button>/);
  assert.match(html, /<button[^>]*disabled[^>]*>Classroom(?:<!-- -->)? pack not available<\/button>/);
});

test('each theme explains distinct Home and Classroom stories before a pack is published', async () => {
  assert.equal(themes.length, 6);
  const codes = new Set();
  for (const theme of themes) {
    const html = await read(`en/themes/${theme.id}/index.html`);
    for (const setting of ['home', 'classroom']) {
      const story = theme.story[setting];
      assert.equal(story.beats.length, 5, `${theme.id} ${setting}`);
      assert.ok(!codes.has(story.code), story.code);
      codes.add(story.code);
      assert.ok(html.includes(story.title.replaceAll("'", '&#x27;')), `${story.code} title missing`);
      assert.ok(html.includes(story.goal.replaceAll("'", '&#x27;')), `${story.code} goal missing`);
      assert.equal(theme[setting].readyStatus, 'not_published');
    }
  }
});
