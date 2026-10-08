#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { publicPages } from '../shared/page-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist', 'client');
const origin = process.env.SITE_ORIGIN || 'https://paperadventure.app';
if (!/^https:\/\/[^/]+$/.test(origin)) throw new Error('SITE_ORIGIN must be an HTTPS origin without a path');

// Publication remains gated by real packs, reviewed policies and live-service QA.
// Every generated page is deliberately excluded from search until those gates pass.
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const template = await readFile(path.join(out, 'index.html'), 'utf8');
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
globalThis.localStorage = { getItem: () => null };

try {
  const { App } = await server.ssrLoadModule('/src/App.jsx');
  for (const record of publicPages) {
    globalThis.window = { location: { pathname: record.path, search: '', origin } };
    const markup = renderToString(React.createElement(App));
    const url = `${origin}${record.path}`;
    const tags = [
      `<title>${escape(record.title)} | Paper Adventure Workshop</title>`,
      `<meta name="description" content="${escape(record.description)}" />`,
      '<meta name="robots" content="noindex,nofollow" />',
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
  // Let the owner's Ahrefs audit crawl the preview; all other bots remain blocked.
  // noindex remains in HTML and response headers until the release gates pass.
  await writeFile(path.join(out, 'robots.txt'), 'User-agent: AhrefsSiteAudit\nAllow: /\n\nUser-agent: AhrefsBot\nAllow: /\n\nUser-agent: *\nDisallow: /\n');
  await writeFile(path.join(out, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n');
  console.log(`Generated ${publicPages.length} pre-rendered, noindex pages for ${origin}`);
} finally {
  delete globalThis.window;
  delete globalThis.localStorage;
  await server.close();
}
