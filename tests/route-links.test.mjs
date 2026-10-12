import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicPages } from '../shared/page-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routes = new Set(publicPages.map(page => page.path));

test('all links rendered in the static preview have a declared route or an existing asset', async () => {
  const missing = [];
  for (const page of publicPages) {
    const html = await readFile(path.join(root, 'dist/client', page.path.slice(1), 'index.html'), 'utf8');
    for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
      const url = new URL(href.replaceAll('&amp;', '&'), `https://paperadventure.app${page.path}`);
      if (url.origin !== 'https://paperadventure.app') continue;
      if (url.pathname.startsWith('/assets/')) {
        try {
          const asset = await stat(path.join(root, 'dist/client', decodeURIComponent(url.pathname.slice(1))));
          if (asset.isFile() && asset.size > 0) continue;
        } catch { /* Report missing assets alongside missing routes. */ }
      }
      if (!routes.has(url.pathname)) missing.push(`${page.path} → ${url.pathname}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('every local image rendered by a preview page exists in the upload', async () => {
  const missing = [];
  for (const page of publicPages) {
    const html = await readFile(path.join(root, 'dist/client', page.path.slice(1), 'index.html'), 'utf8');
    for (const [, src] of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
      if (!src.startsWith('/')) continue;
      const file = path.join(root, 'dist/client', src.slice(1));
      try { if ((await stat(file)).size === 0) missing.push(`${page.path} → ${src} (empty)`); }
      catch { missing.push(`${page.path} → ${src}`); }
    }
  }
  assert.deepEqual(missing, []);
});
