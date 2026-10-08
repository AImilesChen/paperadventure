import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('query choices and saved browser drafts do not change the hydration render', async () => {
  const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { App } = await server.ssrLoadModule('/src/App.jsx');
    const render = (pathname, search, draft) => {
      globalThis.window = { location: { pathname, search, origin: 'https://paperadventure.app' } };
      globalThis.localStorage = { getItem: key => key === 'paw-draft' ? draft : null };
      return renderToString(React.createElement(App));
    };
    const saved = JSON.stringify({ theme: 'space', setting: 'home', players: '5', age: '8–10', direction: 'mission' });
    for (const [pathname, search] of [
      ['/en/create/', '?theme=dinosaur&setting=classroom'],
      ['/en/checkout/demo/', '?kind=ready&theme=celebration&setting=home'],
      ['/en/checkout/demo/', '?kind=ready&theme=space&setting=classroom'],
      ['/en/my-adventures/', ''],
    ]) {
      assert.equal(render(pathname, search, saved), render(pathname, '', null), pathname);
    }
    const unknown = render('/en/does-not-exist/', '', null);
    assert.match(unknown, /That page isn&#x27;t here\./);
    assert.doesNotMatch(unknown, /Privacy Notice/);
    assert.match(render('/en/create/unexpected/', '', null), /That page isn&#x27;t here\./);
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
    await server.close();
  }
});
