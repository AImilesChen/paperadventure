import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { checkPuzzleAnswer, freePuzzles, harbourBridges, normalizePuzzleAnswer, parcels, puzzleCategories, puzzlePath, puzzlePdfPath, stampKey, trailGrid, trailMoves } from '../shared/free-puzzles.mjs';
import { pageFor } from '../shared/page-manifest.mjs';
import { pageSchema } from '../shared/seo.mjs';
import { conversionProperties } from '../src/conversionEvents.mjs';

const find = id => freePuzzles.find(p => p.id === id);
function permutations(items) { return items.length === 0 ? [[]] : items.flatMap((item, i) => permutations(items.filter((_, n) => n !== i)).map(rest => [item, ...rest])); }

test('the two cipher answers follow the printed keys', () => {
  const lookup = Object.fromEntries(stampKey);
  assert.equal(['circle', 'triangle', 'square'].map(s => lookup[s]).join(''), find('stamp-code').answer);
  const decoded = [...'FKHFN WKH UHG VWDU'].map(c => c === ' ' ? c : String.fromCharCode(65 + (c.charCodeAt(0) - 65 - 3 + 26) % 26)).join('');
  assert.equal(decoded, 'CHECK THE RED STAR');
  assert.equal(decoded.split(' ')[2], find('signal-shift').answer);
});

test('all queue arrangements yield exactly one order, with every clue necessary', () => {
  const constraints = [a => a[0] === 'SUN', a => a.indexOf('STAR') + 1 === a.indexOf('MOON'), a => a[3] !== 'LEAF'];
  const possible = permutations(['SUN', 'LEAF', 'STAR', 'MOON']);
  const valid = possible.filter(a => constraints.every(rule => rule(a)));
  assert.deepEqual(valid, [['SUN', 'LEAF', 'STAR', 'MOON']]);
  assert.equal(valid[0][3], find('parcel-queue').answer);
  for (let omit = 0; omit < constraints.length; omit++) assert.ok(possible.filter(a => constraints.every((rule, i) => i === omit || rule(a))).length > 1);
});

test('all three shared clues contribute to identifying a unique parcel', () => {
  const constraints = [p => p.pattern === 'stripes', p => p.seal === 'triangle', p => p.stamps === 2];
  assert.deepEqual(parcels.filter(p => constraints.every(rule => rule(p))).map(p => p.id), [find('shared-parcel').answer]);
  for (let omit = 0; omit < constraints.length; omit++) assert.equal(parcels.filter(p => constraints.every((rule, i) => i === omit || rule(p))).length, 2);
});

test('the forest trail stays on the board and extracts exactly six letters', () => {
  let x = 0, y = 0, letters = '';
  for (const move of trailMoves) {
    if (move === 'E') x++; if (move === 'W') x--; if (move === 'S') y++; if (move === 'N') y--;
    assert.ok(x >= 0 && x < 4 && y >= 0 && y < 4);
    letters += trailGrid[y][x];
  }
  assert.equal(letters, find('forest-trail').answer);
});

test('enumerating harbour routes gives exactly one valid three-bridge crossing', () => {
  const paths = [];
  function walk(at, nodes, code) {
    if (at === 'beacon') { if (code.length === 3 && nodes.includes('bell')) paths.push({ nodes, code }); return; }
    if (code.length >= 3) return;
    for (const [a, b, digit] of harbourBridges) {
      const next = a === at ? b : b === at ? a : null;
      if (next && next !== 'mill' && !nodes.includes(next)) walk(next, [...nodes, next], code + digit);
    }
  }
  walk('dock', ['dock'], '');
  assert.deepEqual(paths, [{ nodes: ['dock', 'oak', 'bell', 'beacon'], code: '258' }]);
  assert.equal(paths[0].code, find('harbour-route').answer);
});

test('answer checking accepts formatting variants without accepting arbitrary guesses', () => {
  for (const p of freePuzzles) {
    assert.equal(p.hints.length, 3);
    assert.ok(p.solution.includes(p.answer) || p.id === 'harbour-route');
    assert.ok(checkPuzzleAnswer(p.id, '  ' + p.answer.toLowerCase() + '  '));
    for (const bad of ['', null, {}, 'wrong', p.answer + 'X', '<script>']) assert.equal(checkPuzzleAnswer(p.id, bad), false);
  }
  assert.equal(normalizePuzzleAnswer(' 2 5 8 '), '258');
  assert.equal(checkPuzzleAnswer('unknown', 'OAK'), false);
});

test('puzzle telemetry permits only enumerated properties and strips typed answers', () => {
  for (const p of freePuzzles) {
    assert.deepEqual(conversionProperties('puzzle_attempt', { puzzle: p.id, answer: 'PRIVATE', email: 'PRIVATE' }), { puzzle: p.id });
    assert.deepEqual(conversionProperties('puzzle_solved', { puzzle: p.id, assistance: 'hint', answer: 'PRIVATE' }), { puzzle: p.id, assistance: 'hint' });
  }
  assert.equal(conversionProperties('puzzle_attempt', { puzzle: 'typed-text' }), null);
  assert.equal(conversionProperties('puzzle_solved', { puzzle: 'stamp-code', assistance: 'anything' }), null);
  assert.equal(conversionProperties('puzzle_pdf_download', { paper: 'A3', file: 'players' }), null);
  assert.deepEqual(conversionProperties('puzzle_pdf_download', { paper: 'Letter', file: 'guide', answer: 'PRIVATE' }), { paper: 'Letter', file: 'guide' });
  assert.deepEqual(conversionProperties('puzzle_game_click', { destination: 'home', email: 'PRIVATE' }), { destination: 'home' });
});

test('all promised PDF assets exist and only valid paper/file combinations resolve', async () => {
  for (const paper of ['A4', 'Letter']) for (const kind of ['players', 'guide']) {
    const file = 'public' + puzzlePdfPath(paper, kind);
    assert.ok((await stat(file)).size > 1000);
    assert.equal((await readFile(file)).subarray(0, 5).toString(), '%PDF-');
  }
  assert.equal(puzzlePdfPath('A3', 'players'), null);
  assert.equal(puzzlePdfPath('A4', '../../private'), null);
});

test('the resource page is indexable with a six-item collection, not a paid product offer', () => {
  const record = pageFor(puzzlePath);
  assert.equal(record.indexable, true);
  assert.deepEqual(Object.keys(puzzleCategories).map(k => freePuzzles.filter(p => p.category === k).length), [2, 2, 2]);
  const graph = pageSchema(record, null)['@graph'];
  assert.equal(graph[0]['@type'], 'CollectionPage');
  assert.equal(graph.find(p => p['@type'] === 'ItemList').numberOfItems, 6);
  assert.ok(!graph.some(p => ['Offer', 'Product'].includes(p['@type'])));
});

test('built search HTML contains every puzzle, download destination and contextual entry', async () => {
  const html = await readFile('dist/client' + puzzlePath + 'index.html', 'utf8');
  assert.match(html, /<title>Free Escape Room Puzzles for Kids \| Paper Adventure<\/title>/);
  assert.ok(html.includes('href="https://paperadventure.app' + puzzlePath + '"'));
  assert.equal((html.match(/class="puzzle-card"/g) || []).length, 6);
  for (const p of freePuzzles) {
    assert.ok(html.includes(`id="${p.id}"`));
    assert.ok(html.includes(p.title));
    assert.ok(html.includes(`id="${p.id}-solution" hidden=""`));
  }
  assert.match(html, /not a complete escape-room kit/);
  assert.ok(html.includes('paper-adventure-puzzles-A4-players.pdf'));
  assert.ok(html.includes('paper-adventure-puzzles-A4-guide.pdf'));
  const sitemap = await readFile('dist/client/sitemap.xml', 'utf8');
  assert.ok(sitemap.includes('https://paperadventure.app' + puzzlePath));
  for (const route of ['/en/', '/en/guides/', '/en/samples/home/', '/en/samples/classroom/', '/en/for-home/']) {
    assert.ok((await readFile('dist/client' + route + 'index.html', 'utf8')).includes('href="' + puzzlePath + '"'), route);
  }
});
