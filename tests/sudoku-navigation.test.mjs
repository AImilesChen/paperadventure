import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerSudokuLeave,prepareSudokuLeave} from '../src/sudoku-leave.mjs';
import {sudokuLinks,sudokuSection} from '../shared/sudoku-navigation.mjs';
import {pageFor} from '../shared/page-manifest.mjs';

test('Sudoku navigation resolves real routes and separates private progress from public lessons',()=>{
 for(const link of sudokuLinks)assert.ok(pageFor(link.href),link.href);
 assert.equal(sudokuSection('/en/sudoku/play/'),'play');assert.equal(sudokuSection('/en/sudoku/levels/'),'levels');
 for(const p of ['/en/sudoku/levels/','/en/sudoku/leaderboard/','/en/sudoku/play/'])assert.equal(pageFor(p).indexable,false);
 for(const p of ['/en/sudoku/how-to-play/','/en/sudoku/techniques/'])assert.equal(pageFor(p).indexable,true);
});
test('navigation waits for saved edits and a failed save keeps the player on their board',async()=>{
 let finish;const saved=new Promise(r=>finish=r);const clean=registerSudokuLeave(async()=>{await saved;return true;});let moved=false;const navigate=prepareSudokuLeave().then(ok=>moved=ok);
 await Promise.resolve();assert.equal(moved,false);finish();await navigate;assert.equal(moved,true);clean();
 const failed=registerSudokuLeave(async()=>false);assert.equal(await prepareSudokuLeave(),false);failed();assert.equal(await prepareSudokuLeave(),true);
});
test('an obsolete board cleanup cannot remove the latest navigation guard',async()=>{
 const old=registerSudokuLeave(async()=>true);const latest=registerSudokuLeave(async()=>false);old();assert.equal(await prepareSudokuLeave(),false);latest();
});
test('new lesson HTML contains readable separate diagrams without requiring progress',async()=>{
 for(const [route,phrase]of [['how-to-play','Every group contains 1–9 exactly once'],['techniques','Naked pair']]){
  const html=await readFile('dist/client/en/sudoku/'+route+'/index.html','utf8');assert.ok(html.includes(phrase));assert.ok(html.includes('sd-rule-board'));assert.ok(html.includes('Paper Adventure Workshop'));assert.ok(!html.includes('Loading your adventure'));
  for(const [,href]of html.matchAll(/href="(#[^"]+)"/g))assert.ok(html.includes('id="'+href.slice(1)+'"'),href);
 }
});
