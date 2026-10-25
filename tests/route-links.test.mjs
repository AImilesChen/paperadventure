import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicPages } from '../shared/page-manifest.mjs';
import {libraryIntent,libraryPath,orderSupportPath} from '../shared/support-navigation.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routes = new Set(publicPages.map(page => page.path));

test('help intent survives sign-in and accepts only supported private-library tasks',()=>{
  assert.deepEqual(libraryIntent('?support=refund&view=games'),{support:'refund',view:'orders'});
  assert.equal(libraryPath(libraryIntent('?support=problem')),'/en/my-adventures/?support=problem');
  assert.equal(libraryPath(libraryIntent('?view=games')),'/en/my-adventures/?view=games');
  assert.equal(libraryPath(libraryIntent('?support=https://untrusted.example&view=other&returnTo=//untrusted.example')),'/en/my-adventures/');
  for(const mode of ['problem','refund']){
    const signIn=new URL('/en/account/?returnTo='+encodeURIComponent(libraryPath({support:mode})),'https://paperadventure.app');
    assert.equal(signIn.searchParams.get('returnTo'),'/en/my-adventures/?support='+mode);
    assert.equal(orderSupportPath('existing-order',mode),'/en/orders/existing-order/?support='+mode+'#order-help');
  }
});

test('help guide fragment links land on an existing section',async()=>{
  for(const page of publicPages.filter(p=>p.path.startsWith('/en/help/'))){
    const html=await readFile(path.join(root,'dist/client',page.path.slice(1),'index.html'),'utf8');
    for(const [,href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)){
      const url=new URL(href.replaceAll('&amp;','&'),'https://paperadventure.app'+page.path);
      if(!url.pathname.startsWith('/en/help/')||!url.hash)continue;
      const target=await readFile(path.join(root,'dist/client',url.pathname.slice(1),'index.html'),'utf8');
      assert.ok(target.includes('id="'+url.hash.slice(1)+'"'),`${page.path} → ${url.pathname}${url.hash}`);
    }
  }
});

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
