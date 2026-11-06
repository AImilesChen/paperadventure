import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { clockPurchaseState, workshopDemo, preparationModes } from '../src/clockDetailModel.mjs';

const catalog = () => ({ escapeGames: [{ id: 'midnight-masquerade', home: { readyStatus: 'published' } }, { id: 'thirteenth-hour', home: { readyStatus: 'published' } }], offers: [{ sku: 'ready_home', currency: 'USD', unitAmount: 999, saleEnabled: true }] });
test('clock availability uses its own game and separates request failure from paused sales', () => {
  assert.equal(clockPurchaseState(catalog(), 'loading').status, 'loading');
  assert.equal(clockPurchaseState(catalog(), 'error').status, 'error');
  assert.deepEqual(clockPurchaseState(catalog()), { status: 'available', amount: 999 });
  const paused=catalog();paused.escapeGames[1].home.readyStatus='paused';assert.equal(clockPurchaseState(paused).status,'unavailable');
  const disabled=catalog();disabled.offers[0].saleEnabled=false;assert.equal(clockPurchaseState(disabled).status,'unavailable');
  for (const data of [null, {}, { ...catalog(), offers: [{ ...catalog().offers[0], unitAmount: '999' }] }, { ...catalog(), offers: [{ ...catalog().offers[0], currency: 'EUR' }] }]) assert.equal(clockPurchaseState(data).status,'error');
});

test('the two preparation modes retain their exact print plan and the teaching readings stay separate from the case', () => {
  assert.deepEqual(preparationModes.standard.pages,[1,2,3,4,5,6,7,8,9,11,12]);
  assert.deepEqual(preparationModes.noCut.pages,[1,2,4,6,7,9,10,11,12]);
  assert.equal(new Set(preparationModes.standard.pages).size,11);
  assert.equal(new Set(preparationModes.noCut.pages).size,9);
  assert.ok(preparationModes.noCut.materials.includes('three spare opaque'));
  assert.ok(preparationModes.standard.cutting.includes('17 cut pieces and five window openings'));
  for(const state of Object.values(workshopDemo)){assert.equal(state.readings.length,3);assert.ok(state.readings.every(v=>Number.isInteger(v)&&v>=1&&v<=12));}
  assert.notDeepEqual(workshopDemo.before.readings,[3,7,10]);
  assert.notDeepEqual(workshopDemo.after.readings,[6,9,2]);
  assert.notDeepEqual(workshopDemo.before.readings,workshopDemo.after.readings);
});

test('clock detail explains accurate contents and guarded checkout without disclosing full paid materials', async () => {
  const vite=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
  try {
    const {EscapeClockDetail}=await vite.ssrLoadModule('/src/escapeClock.jsx');
    const Link=({to,children,...props})=>createElement('a',{href:to,...props},children);
    const render=props=>renderToStaticMarkup(createElement(EscapeClockDetail,{Link,catalog:catalog(),...props}));
    const html=render({catalogStatus:'ready'});
    assert.match(html,/checkout\/\?kind=ready&amp;setting=home&amp;theme=thirteenth-hour/);
    for(const value of ['2–5 players + 1 adult host','Teaching illustration only','Print 11 player sheets','12 pages','8 pages','Four PDFs','17 cut pieces','five window openings','12 months','not yet been verified','classroom licence','HISTORY','CURRENT'])assert.ok(html.includes(value),value);
    assert.equal((html.match(/class="cd-round-number"/g)||[]).length,6);
    assert.equal((html.match(/class="cd-excerpt-image"/g)||[]).length,3);
    assert.doesNotMatch(html,/257|RIGHT\+LEAF|5,\s*7,\s*11|\/api\/v1\/orders\//);
    for(const catalogStatus of ['loading','error']){const h=render({catalogStatus});assert.doesNotMatch(h,/href="[^\"]*checkout/);assert.doesNotMatch(h,/Checkout is currently unavailable/);}
    const paused=catalog();paused.escapeGames[1].home.readyStatus='paused';assert.doesNotMatch(render({catalog:paused}),/href="[^\"]*checkout/);
    const repriced=catalog();repriced.offers[0].unitAmount=1299;const h=render({catalog:repriced});assert.match(h,/US\$12\.99/);assert.doesNotMatch(h,/US\$9\.99/);
  } finally {await vite.close();}
});

test('built clock page has real fragment targets and only selected public excerpt assets', async () => {
  for(const id of ['bench','frame','record'])assert.ok((await stat(`public/assets/clock-detail-v2/${id}.webp`)).size>100);
  const html=await readFile('dist/client/en/escape-room-games/the-clockmakers-thirteenth-hour/index.html','utf8');
  for(const [,id] of html.matchAll(/href="#([^\"]+)"/g))assert.ok(html.includes(`id="${id}"`),id);
  assert.match(html,/https:\/\/paperadventure.app\/en\/escape-room-games\/the-clockmakers-thirteenth-hour\//);
  assert.doesNotMatch(html,/href="[^\"]*(?:\.pdf|companion\.html)|257|RIGHT\+LEAF|5,\s*7,\s*11/);
});
