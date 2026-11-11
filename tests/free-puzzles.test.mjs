import { bayStart, solveBay, baySolved } from '../shared/loading-bay.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { checkPuzzleAnswer, freePuzzles, harbourBridges, normalizePuzzleAnswer, parcels, puzzleCategories, puzzlePath, puzzlePdfPath, stampKey, trailGrid, trailMoves } from '../shared/free-puzzles.mjs';
import { stampRecords, stampLabels, postalWords, postalTests, stampShapeNames, stampLetters, inspectStampMatches } from '../shared/stamp-investigation.mjs';
import { pageFor } from '../shared/page-manifest.mjs';
import { pageSchema } from '../shared/seo.mjs';
import { conversionProperties } from '../src/conversionEvents.mjs';

const find = id => freePuzzles.find(p => p.id === id);
function permutations(items) { return items.length === 0 ? [[]] : items.flatMap((item, i) => permutations(items.filter((_, n) => n !== i)).map(rest => [item, ...rest])); }

test('the post office answer follows the inferred key; the message follows its printed decoder', () => {
  const lookup = Object.fromEntries(stampKey);
  assert.equal(permutations(postalWords).filter(route => postalTests.every(test => test(Object.fromEntries(route.map((word, i) => [word, i]))))).map(route => route.join(' ')).join(), find('stamp-code').answer);
  const decoded = 'NFRG'.split(' ').map(w => [...w].map(c => String.fromCharCode(65 + (c.charCodeAt(0) - 65 - 3 + 26) % 26)).reverse().join('')).join(' ');
  assert.equal(decoded, find('signal-shift').answer);
});

test('loading bay has a solvable eighteen-slide layout and delivery is the goal', () => {
 const path=solveBay(bayStart);assert.equal(path.length,18);assert.equal(baySolved(path.at(-1).positions),true);assert.equal(find('parcel-queue').answer,'X reaches EXIT');
});

test('the parcel investigation presents four hidden parcels and the paired final answer', () => {
  assert.deepEqual(parcels.map(p => [p.id, p.stamps, p.pattern, p.ribbon]), [['A',2,'stripes','blue'],['B',1,'dots','red'],['C',3,'dots','blue'],['D',4,'stripes','red']]);
  assert.equal(find('shared-parcel').answer, 'A / note III');
  assert.equal(find('shared-parcel').verified.length, 4);
  assert.equal(find('shared-parcel').clues.length, 3);
  assert.equal(find('shared-parcel').steps.length, 7);
});

test('answer checking accepts formatting variants without accepting arbitrary guesses', () => {
  for (const p of freePuzzles) {
    assert.equal(p.hints.length, 3);
    if (['parcel-queue','forest-trail','harbour-route'].includes(p.id)) { assert.equal(checkPuzzleAnswer(p.id, p.answer), false); continue; }
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
  assert.deepEqual(Object.keys(puzzleCategories).map(k => freePuzzles.filter(p => p.category === k).length), [2, 3, 1]);
  const graph = pageSchema(record, null)['@graph'];
  assert.equal(graph[0]['@type'], 'CollectionPage');
  assert.equal(graph.find(p => p['@type'] === 'ItemList').numberOfItems, 6);
  assert.ok(!graph.some(p => ['Offer', 'Product'].includes(p['@type'])));
});

test('built search HTML contains every puzzle, download destination and contextual entry', async () => {
  const html = await readFile('dist/client' + puzzlePath + 'index.html', 'utf8');
  assert.match(html, /<title>Free Escape Room Puzzles for Kids \| Paper Adventure<\/title>/);
  assert.ok(html.includes('href="https://paperadventure.app' + puzzlePath + '"'));
  assert.equal((html.match(/class="puzzle-card(?: [^"]*)?"/g) || []).length, 6);
  for (const p of freePuzzles) {
    assert.ok(html.includes(`id="${p.id}"`));
    assert.ok(html.includes(p.title));
    assert.ok(!html.includes(`id="${p.id}-solution" hidden=""`));
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


test('all 720 letter bijections and 24 label arrangements yield one consistent post office key', () => {
  const valid = permutations(stampLetters).map(letters => Object.fromEntries(stampShapeNames.map((shape, i) => [shape, letters[i]]))).filter(key => {
    const words = stampRecords.map(record => record.shapes.map(shape => key[shape]).join(''));
    return new Set(words).size === 4 && words.every(word => stampLabels.some(label => label.word === word));
  });
  assert.equal(valid.length, 1);
  assert.equal(['cross', 'circle', 'circle', 'diamond'].map(shape => valid[0][shape]).join(''), 'POOL'); // The old message remains a valid use of the same restored key.
  const validMatches = permutations(stampLabels.map(label => label.word)).filter(matches => inspectStampMatches(matches).ok);
  assert.deepEqual(validMatches, [['LAMP', 'PALM', 'MAP', 'OAK']]);
  assert.deepEqual(inspectStampMatches(validMatches[0]).key, Object.fromEntries(stampKey));
});
