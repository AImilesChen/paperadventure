#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { publicPages } from '../shared/page-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist', 'client');
const origin = process.env.SITE_ORIGIN || 'https://paperadventure.app';
if (!/^https:\/\/[^/]+$/.test(origin)) throw new Error('SITE_ORIGIN must be an HTTPS origin without a path');

// Public catalogue and content pages are indexable on the canonical domain.
// Private, transactional and unfinished legal-review routes retain noindex.
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const template = await readFile(path.join(out, 'index.html'), 'utf8');
// Cloudflare canonicalizes requests for /index.html to /. Keep an identical
// non-HTML asset for dynamic client routes so an asset-binding fallback does
// not redirect the browser away from the original order URL.
await writeFile(path.join(out, 'app-shell.txt'), template);
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
globalThis.localStorage = { getItem: () => null };

try {
  const { App } = await server.ssrLoadModule('/src/App.jsx');
  const markupByPath = new Map();
  for (const record of publicPages) {
    globalThis.window = { location: { pathname: record.path, search: '', origin } };
    const markup = renderToString(React.createElement(App));
    markupByPath.set(record.path, markup);
    const url = `${origin}${record.path}`;
    const tags = [
      `<title>${escape(record.title)} | Paper Adventure Workshop</title>`,
      `<meta name="description" content="${escape(record.description)}" />`,
      ...(record.indexable ? [] : ['<meta name="robots" content="noindex" />']),
      `<link rel="canonical" href="${escape(url)}" />`,
      '<meta property="og:type" content="website" />',
      `<meta property="og:title" content="${escape(record.title)} | Paper Adventure Workshop" />`,
      `<meta property="og:description" content="${escape(record.description)}" />`,
      `<meta property="og:url" content="${escape(url)}" />`,
      `<meta property="og:image" content="${origin}/og-image.jpg" />`,
      '<meta property="og:image:width" content="1200" />',
      '<meta property="og:image:height" content="630" />',
      '<meta name="twitter:card" content="summary_large_image" />',
      `<meta name="twitter:title" content="${escape(record.title)} | Paper Adventure Workshop" />`,
      `<meta name="twitter:description" content="${escape(record.description)}" />`,
      `<meta name="twitter:image" content="${origin}/og-image.jpg" />`,
      `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: record.title, description: record.description, url, isPartOf: { '@type': 'WebSite', name: 'Paper Adventure Workshop', url: origin } }).replaceAll('<', '\\u003c')}</script>`,
    ].join('\n    ');
    const html = template
      .replace(/\s*<title>[^<]*<\/title>/, '')
      .replace(/\s*<meta name="description"[^>]*>/, '')
      .replace(/\s*<meta name="robots"[^>]*>/, '')
      .replace('</head>', `    ${tags}\n  </head>`)
      .replace('<div id="root" data-clarity-mask="true"></div>', `<div id="root" data-clarity-mask="true">${markup}</div>`);
    if (!html.includes(markup)) throw new Error(`Failed to render ${record.path}`);
    const target = path.join(out, record.path.slice(1), 'index.html');
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html);
  }
  // Check the same component instance used for pre-rendering. Starting a second
  // Vite SSR server in a later test can cancel an in-flight esbuild transform.
  const renderPreview = (pathname, search, draft) => {
    globalThis.window = { location: { pathname, search, origin } };
    globalThis.localStorage = { getItem: key => key === 'paw-draft' ? draft : null };
    return renderToString(React.createElement(App));
  };
  const savedDraft = JSON.stringify({ theme: 'space', setting: 'home', players: '5', age: '8–10', direction: 'mission' });
  for (const [pathname, search] of [
    ['/en/create/', '?theme=dinosaur&setting=classroom'],
    ['/en/checkout/demo/', '?kind=ready&theme=celebration&setting=home'],
    ['/en/checkout/demo/', '?kind=ready&theme=space&setting=classroom'],
    ['/en/my-adventures/', ''],
  ]) {
    assert.equal(renderPreview(pathname, search, savedDraft), markupByPath.get(pathname), pathname);
  }
  const unknown = renderPreview('/en/does-not-exist/', '', null);
  assert.match(unknown, /That page isn&#x27;t here\./);
  assert.doesNotMatch(unknown, /Privacy Notice/);
  assert.match(renderPreview('/en/create/unexpected/', '', null), /That page isn&#x27;t here\./);
  console.log('Verified query and saved-draft hydration against the pre-rendered pages');
  const indexablePages = publicPages.filter(record => record.indexable);
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + indexablePages.map(record => `  <url><loc>${escape(origin + record.path)}</loc></url>`).join('\n') + '\n</urlset>\n';
  await writeFile(path.join(out, 'sitemap.xml'), sitemap);
  await writeFile(path.join(out, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://paperadventure.app/sitemap.xml\n');
  await writeFile(path.join(out, '_headers'), ['/en/account/*', '/en/my-adventures/*', '/en/checkout/*', '/en/orders/*', '/en/help/recover/*', '/en/terms/*', '/en/cookies/*', '/en/refunds/*'].map(route => route + '\n  X-Robots-Tag: noindex\n').join('\n'));
  console.log(`Generated ${publicPages.length} pre-rendered pages and ${indexablePages.length} sitemap URLs for ${origin}`);
} finally {
  delete globalThis.window;
  delete globalThis.localStorage;
  await server.close();
}
