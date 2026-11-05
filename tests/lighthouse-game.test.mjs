import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { lighthouse, lighthouseStages, lighthouseLogs, lighthouseModules, lensReadings, lighthouseSequence, checkLighthouseAnswer, freshLighthouseProgress, restoreLighthouseProgress, completeLighthouseStage, lighthousePdfPath } from '../shared/lighthouse-game.mjs';
import { pageFor } from '../shared/page-manifest.mjs';
import { pageSchema } from '../shared/seo.mjs';
import { conversionProperties } from '../src/conversionEvents.mjs';
import { prepareLighthousePdf } from '../src/lighthouseDownload.mjs';

function permutations(items) { return items.length ? items.flatMap((item, i) => permutations(items.filter((_, j) => i !== j)).map(rest => [item, ...rest])) : [[]]; }

test('the journal has one event order and preserves the four actual strip IDs', () => {
  const orders = permutations(lighthouseLogs.map(p => p.id));
  const possible = orders.filter(p => p.indexOf('T') < p.indexOf('M') && p.indexOf('M') < p.indexOf('R') && p.indexOf('R') < p.indexOf('K'));
  assert.deepEqual(possible, [['T', 'M', 'R', 'K']]);
  assert.ok(checkLighthouseAnswer(0, possible[0].join('')));
  assert.ok(!checkLighthouseAnswer(0, lighthouseLogs.map(p => p.id).join('')));
});

test('only one of eight module combinations fits both printed rules', () => {
  const options = symbol => lighthouseModules.filter(m => m.symbol === symbol).map(m => m.value);
  const sums = [], valid = [];
  for (const star of options('star')) for (const wave of options('wave')) for (const leaf of options('leaf')) {
    if (star + wave + leaf === 13) { sums.push([star, wave, leaf]); if (leaf > wave) valid.push([star, wave, leaf]); }
  }
  assert.equal(sums.length, 2);
  assert.deepEqual(valid, [[4, 2, 7]]);
  assert.ok(checkLighthouseAnswer(1, valid[0].join('')));
  assert.ok(!checkLighthouseAnswer(1, '463'));
  assert.ok(!checkLighthouseAnswer(1, '472'));
});

test('the numbered lens windows produce the journal sequence only at EAST', () => {
  const matches = [0, 1, 2, 3].filter(i => JSON.stringify(lensReadings(i)) === JSON.stringify(lighthouseSequence));
  assert.deepEqual(matches, [1]);
  assert.deepEqual(lensReadings(5), lighthouseSequence);
  assert.deepEqual(lensReadings(-3), lighthouseSequence);
});

test('the final startup requires both independently derived discoveries', () => {
  assert.ok(checkLighthouseAnswer(3, { direction: 'east', code: '4 2 7' }));
  for (const wrong of [{ direction: 'WEST', code: '427' }, { direction: 'EAST', code: '472' }, { code: '427' }, '427', null, {}]) assert.equal(checkLighthouseAnswer(3, wrong), false);
  assert.equal(checkLighthouseAnswer(4, '427'), false);
  assert.equal(checkLighthouseAnswer(0, { value: 'TMRK' }), false);
});

test('progress advances once, in order, and a failed answer cannot skip or erase findings', () => {
  let progress = freshLighthouseProgress();
  assert.equal(completeLighthouseStage(progress, 2, 'EAST').ok, false);
  assert.equal(completeLighthouseStage(progress, 0, 'wrong').progress.completed, 0);
  for (const [stage, answer] of [[0, 't-m-r-k'], [1, '427'], [2, 'E'], [3, { direction: 'EAST', code: '427' }]]) {
    const result = completeLighthouseStage(progress, stage, answer);
    assert.ok(result.ok); assert.equal(result.progress.completed, stage + 1);
    assert.equal(progress.completed, stage, 'does not mutate earlier record');
    assert.equal(completeLighthouseStage(result.progress, stage, answer).ok, false, 'does not duplicate completion');
    progress = result.progress;
  }
  assert.equal(progress.completed, 4);
});

test('browser progress restores only versioned enums, counts and flags, never free text', () => {
  const safe = restoreLighthouseProgress({ version: 1, completed: 2, hints: [-1, 99, '3', 2], viewed: [true, 'yes', false, true], email: 'private', answer: 'private' });
  assert.deepEqual(safe, { version: 1, started: true, completed: 2, hints: [0, 3, 0, 2], viewed: [true, false, false, true] });
  for (const value of [null, [], { version: 0, completed: 2 }, { version: 1, completed: 8 }, { version: 1, completed: 1.5 }, 'text']) assert.deepEqual(restoreLighthouseProgress(value), freshLighthouseProgress());
});

test('four PDF paths have real files and invalid selectors make no network request', async () => {
  for (const paper of ['A4', 'Letter']) for (const role of ['players', 'guide']) {
    const file = 'public' + lighthousePdfPath(paper, role);
    assert.ok((await stat(file)).size > 1000);
    assert.equal((await readFile(file)).subarray(0, 5).toString(), '%PDF-');
    const calls = [];
    const result = await prepareLighthousePdf({ paper, role, fetcher: async (url, options) => { calls.push(url); assert.equal(options.credentials, 'same-origin'); return new Response('%PDF-1.7\nfixture', { headers: { 'content-type': 'application/pdf' } }); } });
    assert.equal(calls[0], lighthousePdfPath(paper, role));
    assert.equal(result.filename, `The-Sleeping-Lighthouse-${paper}-${role}.pdf`);
  }
  let calls = 0;
  await assert.rejects(prepareLighthousePdf({ paper: 'A3', role: 'players', fetcher: () => { calls++; } }));
  assert.equal(calls, 0);
});

test('failed or mislabeled downloads reject and a later retry succeeds', async () => {
  for (const response of [new Response('missing', { status: 404 }), new Response('<html/>', { headers: { 'content-type': 'text/html' } }), new Response('not a pdf', { headers: { 'content-type': 'application/pdf' } })]) {
    await assert.rejects(prepareLighthousePdf({ paper: 'A4', role: 'players', fetcher: async () => response }));
  }
  const good = await prepareLighthousePdf({ paper: 'A4', role: 'players', fetcher: async () => new Response('%PDF-1.7', { headers: { 'content-type': 'application/pdf' } }) });
  assert.ok(good.blob.size > 0);
});

test('game telemetry accepts only known game/stage/help/paper dimensions', () => {
  const game = lighthouse.id;
  assert.deepEqual(conversionProperties('escape_stage_complete', { game, stage: 'power', assistance: 'hint', answer: 'PRIVATE', email: 'PRIVATE' }), { game, stage: 'power', assistance: 'hint' });
  assert.equal(conversionProperties('escape_stage_complete', { game, stage: 'anything', assistance: 'none' }), null);
  assert.equal(conversionProperties('escape_game_complete', { game, assistance: 'anything' }), null);
  assert.equal(conversionProperties('escape_game_start', { game: 'private' }), null);
  assert.deepEqual(conversionProperties('escape_pdf_download', { game, paper: 'Letter', file: 'guide', answer: 'PRIVATE' }), { game, paper: 'Letter', file: 'guide' });
});

test('search pages are declared while the companion stays out of the sitemap', async () => {
  assert.equal(pageFor(lighthouse.hub).indexable, true);
  assert.equal(pageFor(lighthouse.path).indexable, true);
  assert.equal(pageFor(lighthouse.play).indexable, false);
  const schema = pageSchema(pageFor(lighthouse.path), null)['@graph'];
  assert.equal(schema[0].about['@type'], 'Game');
  assert.equal(schema[0].about.isAccessibleForFree, true);
  assert.ok(!schema.some(x => x['@type'] === 'Product'));
  const html = await readFile('dist/client' + lighthouse.path + 'index.html', 'utf8');
  assert.ok(html.includes('Seven player pages'));
  assert.ok(html.includes(lighthouse.play));
  const sitemap = await readFile('dist/client/sitemap.xml', 'utf8');
  assert.ok(sitemap.includes(lighthouse.path)); assert.ok(sitemap.includes(lighthouse.hub)); assert.ok(!sitemap.includes(lighthouse.play));
  const play = await readFile('dist/client' + lighthouse.play + 'index.html', 'utf8');
  assert.match(play, /name="robots" content="noindex"/);
  assert.ok(!play.includes('TMRK'), 'answers are not in the initial companion HTML');
});
