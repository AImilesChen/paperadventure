import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { foldPurchaseState, freshPractice, practiceView, practiceCells, changePractice, rotateCell, rotateStreet, reflectStreet, jobsForPlayers, printOptions } from '../src/foldDetailModel.mjs';

const catalog = () => ({ escapeGames: [{ id: 'last-letter', home: { readyStatus: 'published' } }, { id: 'fold-city', home: { readyStatus: 'published' } }], offers: [{ sku: 'ready_home', currency: 'USD', unitAmount: 999, saleEnabled: true }] });
test('fold checkout checks this game and distinguishes request failure, paused sale and current price', () => {
  assert.equal(foldPurchaseState(catalog(), 'loading').status, 'loading');
  assert.equal(foldPurchaseState(catalog(), 'error').status, 'error');
  assert.deepEqual(foldPurchaseState(catalog()), { status: 'available', amount: 999 });
  const paused = catalog(); paused.escapeGames[1].home.readyStatus = 'paused'; assert.equal(foldPurchaseState(paused).status, 'unavailable');
  const disabled = catalog(); disabled.offers[0].saleEnabled = false; assert.equal(foldPurchaseState(disabled).status, 'unavailable');
  for (const data of [null, {}, { ...catalog(), offers: [{ ...catalog().offers[0], unitAmount: '999' }] }, { ...catalog(), offers: [{ ...catalog().offers[0], currency: 'EUR' }] }]) assert.equal(foldPurchaseState(data).status, 'error');
});

test('practice rotation carries printed positions and road directions through exact quarter turns', () => {
  assert.deepEqual(rotateCell(0, 0, 1), { x: 3, y: 0 });
  assert.deepEqual(rotateCell(2, 2, 1), { x: 1, y: 2 });
  assert.equal(rotateStreet(9, 1), 3);
  assert.equal(reflectStreet(3), 9);
  for (let mask = 0; mask < 16; mask++) { assert.equal(rotateStreet(mask, 4), mask); assert.equal(reflectStreet(reflectStreet(mask)), mask); }
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) assert.deepEqual(rotateCell(x, y, 4), { x, y });
});

test('covered board roads cannot be walked; folding reveals the needed lower connection', () => {
  let state = freshPractice();
  assert.equal(practiceCells(state)[1 * 6 + 4].mask, 0, 'front paper covers the lower east-west street');
  assert.deepEqual(practiceView(state).reachable.map(s => s.id), ['turntable', 'lookout']);
  assert.strictEqual(changePractice(state, { type: 'rotate' }), state);
  assert.strictEqual(changePractice(state, { type: 'fold' }), state);
  assert.strictEqual(changePractice(state, { type: 'walk', stop: 'goal' }), state);
  state = changePractice(state, { type: 'walk', stop: 'turntable' });
  state = changePractice(state, { type: 'rotate' });
  assert.deepEqual({ x: practiceView(state).party.x, y: practiceView(state).party.y }, { x: 2, y: 3 });
  assert.ok(!practiceView(state).reachable.some(s => s.id === 'goal'));
  state = changePractice(state, { type: 'fold' });
  const revealed = practiceCells(state)[1 * 6 + 4];
  assert.equal(revealed.layer, 'base'); assert.equal(revealed.exposed, true); assert.equal(revealed.mask, 10);
  assert.ok(practiceView(state).reachable.some(s => s.id === 'goal'));
  assert.equal(practiceView(changePractice(state, { type: 'walk', stop: 'goal' })).complete, true);
});

test('every reachable teaching state can finish and every offered walk has reciprocal visible road connections', () => {
  const key = s => `${s.rotation}/${s.folded}/${s.stop}`;
  const queue = [freshPractice()], states = new Map(), edges = new Map();
  for (let index = 0; index < queue.length; index++) {
    const state = queue[index], id = key(state);
    if (states.has(id)) continue;
    states.set(id, state);
    const view = practiceView(state);
    const actions = [{ type: 'rotate' }, { type: 'fold' }, ...view.stops.map(stop => ({ type: 'walk', stop: stop.id }))];
    const next = new Set();
    for (const action of actions) {
      const changed = changePractice(state, action);
      if (changed === state) continue;
      if (action.type === 'walk') assert.ok(view.visited.has(view.stops.find(s => s.id === action.stop).y * 6 + view.stops.find(s => s.id === action.stop).x));
      next.add(key(changed)); queue.push(changed);
    }
    edges.set(id, next);
    const footprint = view.cells.filter(c => c.layer !== 'base');
    assert.equal(footprint.length, state.folded ? 12 : 16);
    assert.ok(footprint.every(c => c.x >= 1 && c.x <= 4 && c.y >= 1 && c.y <= 4));
  }
  assert.ok(states.size >= 18);
  const canFinish = new Set([...states].filter(([, s]) => practiceView(s).complete).map(([id]) => id));
  let previous;
  do { previous = canFinish.size; for (const [id, next] of edges) if ([...next].some(n => canFinish.has(n))) canFinish.add(id); } while (canFinish.size !== previous);
  assert.equal(canFinish.size, states.size, 'no reachable teaching position strands the party');
});

test('opening the flap and four turns restore exact geometry, and reset restores the start', () => {
  let state = changePractice(freshPractice(), { type: 'walk', stop: 'turntable' });
  const before = practiceCells(state);
  state = changePractice(changePractice(state, { type: 'fold' }), { type: 'fold' });
  assert.deepEqual(practiceCells(state), before);
  for (let i = 0; i < 4; i++) state = changePractice(state, { type: 'rotate' });
  assert.deepEqual(practiceCells(state), before);
  assert.deepEqual(changePractice(state, { type: 'reset' }), freshPractice());
});

test('group jobs keep handling and checking separate and printing remains ten plus optional twelve', () => {
  assert.deepEqual(jobsForPlayers(2), [{ person: 1, jobs: ['Reader', 'Map Handler'] }, { person: 2, jobs: ['Route Planner', 'Road Checker'] }]);
  assert.deepEqual(jobsForPlayers(3), [{ person: 1, jobs: ['Reader', 'Route Planner'] }, { person: 2, jobs: ['Map Handler'] }, { person: 3, jobs: ['Road Checker'] }]);
  assert.equal(jobsForPlayers(4).length, 4);
  for (const n of [2,3,4]) assert.equal(jobsForPlayers(n).flatMap(p => p.jobs).length, 4);
  assert.throws(() => jobsForPlayers(5));
  assert.equal(printOptions.screen.count, 10); assert.equal(printOptions.paper.count, 22);
});

test('fold detail explains actual flat materials and guarded checkout without publishing paid components', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { EscapeFoldCityDetail } = await vite.ssrLoadModule('/src/escapeFoldCity.jsx');
    const Link = ({ to, children, ...props }) => createElement('a', { href: to, ...props }, children);
    const render = props => renderToStaticMarkup(createElement(EscapeFoldCityDetail, { Link, catalog: catalog(), ...props }));
    const html = render({});
    assert.match(html, /checkout\/\?kind=ready&amp;setting=home&amp;theme=fold-city/);
    for (const text of ['2–4 players', 'one shared party', 'Story atmosphere', 'flat board + three double-sided map cards', 'Independent teaching map', '88 mm', '176 mm', 'Print 10 sheets', 'Player Pack · 10 pages', 'Adult Guide · 12 pages', 'SEVEN FILES', '12 months', 'not yet been verified', 'classroom licence', 'no-cut mode']) assert.ok(html.includes(text), text);
    assert.equal((html.match(/class="fc-step-number"/g) || []).length, 5);
    assert.equal((html.match(/class="fc-excerpt-image"/g) || []).length, 3);
    assert.doesNotMatch(html, /href="[^\"]*(?:\.pdf|companion\.html)|\/api\/v1\/orders\//);
    for (const catalogStatus of ['loading', 'error']) { const h = render({ catalogStatus }); assert.doesNotMatch(h, /href="[^\"]*checkout/); assert.doesNotMatch(h, /Checkout is currently unavailable/); }
    const paused = catalog(); paused.escapeGames[1].home.readyStatus = 'paused'; assert.doesNotMatch(render({ catalog: paused }), /href="[^\"]*checkout/);
    const repriced = catalog(); repriced.offers[0].unitAmount = 1299; const h = render({ catalog: repriced }); assert.match(h, /US\$12\.99/); assert.doesNotMatch(h, /US\$9\.99/);
  } finally { await vite.close(); }
});

test('built fold page has valid fragment targets and only selected cropped material assets', async () => {
  for (const name of ['foldline','back','snapshot','scale']) assert.ok((await stat(`public/assets/fold-detail-v2/${name}.webp`)).size > 100);
  const html = await readFile('dist/client/en/escape-room-games/the-secret-of-fold-city/index.html', 'utf8');
  for (const [, id] of html.matchAll(/href="#([^\"]+)"/g)) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /https:\/\/paperadventure.app\/en\/escape-room-games\/the-secret-of-fold-city\//);
  const source = await readFile('src/foldDetailModel.mjs', 'utf8');
  assert.doesNotMatch(source, /import.*(?:games\/|solutions|reachable|rescues)/);
});
