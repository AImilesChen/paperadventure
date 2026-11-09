import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { freePuzzles } from '../shared/free-puzzles.mjs';

const page = () => readFile('dist/client/en/escape-room-puzzles/index.html', 'utf8');
test('the base resource HTML starts with the playable workshop before its promotional and print sections', async () => {
  const html = await page();
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  const game = main.indexOf('id="try-puzzles"');
  assert.ok(game > 0);
  assert.ok(main.indexOf('id="puzzle-directory"') < main.indexOf('id="puzzle-play"'));
  assert.equal((main.match(/id="pick-/g)||[]).length,6);
  assert.ok(game < main.indexOf('id="print-puzzles"'));
  assert.equal((main.match(/<h1\b/g) || []).length, 1);
  assert.match(main, /<h1 id="pw-title">Free escape room puzzles<\/h1>/);
  assert.doesNotMatch(main, /Start solving/);
});

test('compact navigation exposes all six puzzles and printing without the old large picker grid', async () => {
  const html = await page();
  const nav = html.match(/<nav class="pw-entry-picker"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(nav);
  assert.equal((nav.match(/<option\b/g) || []).length, 6);
  for (const puzzle of freePuzzles) assert.ok(nav.includes(`value="${puzzle.id}"`));
  assert.match(nav, /Previous puzzle/); assert.match(nav, /Next puzzle/);
  assert.doesNotMatch(html, /class="pw-picker"/);
  assert.match(html, /class="pw-entry-print" href="#print-puzzles"/);
});

test('all cases, visible first-puzzle premise and separate hidden solutions remain in the indexable page', async () => {
  const html = await page();
  for (const puzzle of freePuzzles) {
    assert.ok(html.includes(`id="${puzzle.id}"`));
    assert.ok(html.includes(`id="${puzzle.id}-title"`));
    assert.ok(html.includes(`id="${puzzle.id}-solution" hidden=""`));
  }
  assert.match(html, /<p class="si-premise">Each row is one of these four words written in symbols\. The word labels have been shuffled\.<\/p>/);
  assert.match(html, /Which word matches each stamp record\?/);
  assert.match(html, /Choose your challenge/);
  assert.match(html, /https:\/\/paperadventure.app\/en\/escape-room-puzzles\//);
});
