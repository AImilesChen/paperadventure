import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {lessons,lessonPath} from '../shared/sudoku/learning.mjs';
import {tutorialProof} from '../shared/sudoku/tutorial-proof.mjs';

test('single article follows all three constraints instead of treating a missing row digit as an answer',()=>{
 const proof=tutorialProof(lessons.find(l=>l.id==='single'));
 assert.equal(proof.cell,8);assert.equal(proof.digit,3);
 assert.deepEqual(proof.stages.map(s=>s.remaining),[[1,2,3,5,9],[3,5],[3]]);
 assert.deepEqual(proof.stages.map(s=>s.removed),[[4,6,7,8],[1,2,9],[5]]);
});
test('pointing article preserves the inside positions and distinguishes a new single from unresolved notes',()=>{
 const l=lessons.find(l=>l.id==='locked'),before=JSON.stringify(l),p=tutorialProof(l);
 assert.deepEqual(p.positions,[28,29]);assert.ok(p.notes.every(n=>n.includes(9)));
 assert.deepEqual(p.changes,[{cell:34,before:[1,9],removed:[9],after:[1]},{cell:35,before:[1,5,6,9],removed:[9],after:[1,5,6]}]);
 assert.deepEqual(p.placements,[{cell:34,digit:1}]);assert.equal(JSON.stringify(l),before);
});
test('pair article does not choose a pair order and removes only reserved digits from other cells',()=>{
 const p=tutorialProof(lessons.find(l=>l.id==='pair'));
 assert.deepEqual(p.cells,[70,71]);assert.deepEqual(p.notes,[[1,5],[1,5]]);
 assert.deepEqual(p.changes,[{cell:64,before:[1,2],removed:[1],after:[2]},{cell:66,before:[2,3,5,6],removed:[5],after:[2,3,6]}]);
 assert.deepEqual(p.placements,[{cell:64,digit:2}]);
});
test('three revised article routes include their argument, current dates, exact sources and working anchor destinations',async()=>{
 const sources={single:'tech_singles.php',locked:'tech_intersections.php',pair:'tech_naked.php'};
 for(const l of lessons.filter(l=>l.id!=='hidden')){
  const html=await readFile('dist/client'+lessonPath(l)+'index.html','utf8');
  for(const id of ['complete-proof','technique-sources','worked-example','evidence','counterexample','try-it'])assert.ok(html.includes('id="'+id+'"'),l.id+' '+id);
  for(const id of ['complete-proof','technique-sources'])assert.ok(html.includes('href="#'+id+'"'));
  assert.ok(html.includes('https://hodoku.sourceforge.net/en/'+sources[l.id]));
  assert.ok(html.includes('"datePublished":"2026-11-10"'));assert.ok(html.includes('"dateModified":"2026-11-13"'));assert.match(html,/<time\s+datetime="2026-11-13"/i);
  assert.ok(html.includes('class="tp-answer"'));assert.ok(html.includes(l.id==='single'?'Check the column':'What changes after the justified removals?'));
  const practice=html.slice(html.indexOf('id="try-it"'),html.indexOf('id="questions"'));assert.ok(!practice.includes('Deduction confirmed'));assert.ok(!practice.includes('tp-answer'));
  for(const [,href]of html.matchAll(/href="(#[^"]+)"/g))assert.ok(html.includes('id="'+href.slice(1)+'"'),href);
 }
});
