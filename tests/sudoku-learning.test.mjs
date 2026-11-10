import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {lessons,learningRoot,lessonPath,coordinate,gradeDeduction,selectionKey,singleChecks,positionEvidence,counterText} from '../shared/sudoku/learning.mjs';
import {board,candidates,units} from '../shared/sudoku/engine.mjs';
import {independentlySolve,fingerprints} from '../scripts/sudoku-bank-validation.mjs';
import {pageFor} from '../shared/page-manifest.mjs';
import {sudokuSection} from '../shared/sudoku-navigation.mjs';
import {isPublicSudokuPage,isAnalyticsPage} from '../src/analytics-route.mjs';
const values=f=>candidates(board(f.givens));
// A separate coordinate check deliberately does not use the engine's peers/units.
const share=(a,b)=>Math.floor(a/9)===Math.floor(b/9)||a%9===b%9||Math.floor(a/27)===Math.floor(b/27)&&Math.floor(a%9/3)===Math.floor(b%9/3);
function directCandidates(raw,i){if(raw[i]!=='0')return [];return [1,2,3,4,5,6,7,8,9].filter(d=>![...raw].some((n,j)=>i!==j&&Number(n)===d&&share(i,j)));}
function ruleHolds(l,f){const c=values(f);
 if(l.id==='single')return c[f.cells[0]].length===1;
 if(l.id==='hidden')return units[f.unit].filter(i=>c[i].includes(f.digit)).length===1;
 if(l.id==='locked')return units[f.box].filter(i=>c[i].includes(f.digit)).every(i=>units[f.unit].includes(i));
 return f.cells.every(i=>c[i].length===2&&c[i].every(n=>f.digits.includes(n)));
}
test('eight original full-board teaching fixtures are independently unique and separate from the campaign and reserves',async()=>{
 const bank=JSON.parse(await readFile('backend/sudoku/puzzles.json','utf8')),stock=JSON.parse(await readFile('backend/sudoku/bank-stock.json','utf8'));
 const known=new Set([...bank,...stock.reserve].map(f=>fingerprints(f.givens).digits));
 for(const l of lessons){assert.notEqual(l.demo.givens,l.practice.givens);for(const f of [l.demo,l.practice]){
  const solved=independentlySolve(f.givens);assert.equal(solved.count,1);assert.equal(known.has(fingerprints(f.givens).digits),false);
  for(let i=0;i<81;i++)assert.deepEqual(values(f)[i],directCandidates(f.givens,i));
  assert.ok(ruleHolds(l,f));
  for(const a of f.answer){assert.equal(f.givens[a.cell],'0');assert.equal(values(f)[a.cell].includes(a.digit),true);assert.equal(Number(solved.solution[a.cell])===a.digit,l.id==='single'||l.id==='hidden');}
 }}
});
test('patterns establish the complete deduction, including all outside removals and no clue removals',()=>{
 for(const l of lessons)for(const f of [l.demo,l.practice]){const c=values(f);let expected;
  if(l.id==='single'){assert.ok(singleChecks(f).missing.length>=3);assert.deepEqual(singleChecks(f).remaining,[f.digit]);}
  if(l.id==='hidden'){assert.ok(c[f.cells[0]].length>1);assert.deepEqual(units[f.unit].filter(i=>c[i].includes(f.digit)),f.cells);}
  if(l.id==='locked'){assert.deepEqual(units[f.box].filter(i=>c[i].includes(f.digit)),f.cells);expected=units[f.unit].filter(i=>!units[f.box].includes(i)&&c[i].includes(f.digit)).map(cell=>({cell,digit:f.digit}));}
  if(l.id==='pair'){assert.ok(f.cells.every(i=>units[f.unit].includes(i)));assert.deepEqual(c[f.cells[0]],f.digits);assert.deepEqual(c[f.cells[1]],f.digits);assert.equal(units[f.unit].filter(i=>c[i].join()===f.digits.join()).length,2);expected=units[f.unit].filter(i=>!f.cells.includes(i)).flatMap(cell=>f.digits.filter(d=>c[cell].includes(d)).map(digit=>({cell,digit})));}
  if(expected)assert.deepEqual(f.answer,expected);
 }
});
test('every exclusion table names a real fixed blocking digit sharing the stated constraint',()=>{
 for(const l of lessons.filter(l=>l.id==='hidden'||l.id==='locked')){
  const f=l.demo;
  for(const e of positionEvidence(f,f.digit,f.box??f.unit))if(!e.fixed&&!e.allowed){assert.ok(e.witness);assert.equal(Number(f.givens[e.witness.cell]),f.digit);assert.ok(share(e.cell,e.witness.cell));assert.notEqual(e.cell,e.witness.cell);}
 }
});
test('changed-clue counterexamples remain consistent and actually invalidate the original rule',()=>{
 for(const l of lessons){const f=l.demo,changed={...f,givens:f.counter.givens};assert.equal(f.givens[f.counter.removedClue],String(f.counter.removedDigit));assert.equal(changed.givens[f.counter.removedClue],'0');assert.equal([...f.givens].filter((v,i)=>v!==changed.givens[i]).length,1);assert.ok(independentlySolve(changed.givens).count>=1);assert.equal(ruleHolds(l,changed),false);assert.ok(counterText(l).length>60);}
});
test('practice accepts only the whole justified deduction, supports retry and never mutates the fixtures',()=>{
 const original=JSON.stringify(lessons);
 for(const l of lessons){const a=l.practice.answer.map(x=>selectionKey(x.cell,x.digit));assert.equal(gradeDeduction(l.id,[]).correct,false);assert.equal(gradeDeduction(l.id,a.slice(1)).correct,false);assert.equal(gradeDeduction(l.id,[...a,'999:1']).correct,false);assert.equal(gradeDeduction(l.id,a).correct,true);assert.equal(gradeDeduction(l.id,[...a,...a]).correct,true);if(l.id==='pair'||l.id==='locked')assert.equal(gradeDeduction(l.id,[selectionKey(l.practice.cells[0],l.practice.digit??l.practice.digits[0])]).correct,false);}
 assert.equal(gradeDeduction('invalid',null).correct,false);assert.equal(JSON.stringify(lessons),original);
});
test('four real tutorial URLs have public metadata, parent learning navigation and restricted public-Sudoku analytics',()=>{
 for(const l of lessons){const path=lessonPath(l),p=pageFor(path);assert.ok(p?.indexable);assert.ok(p.description.length>80);assert.equal(sudokuSection(path),'techniques');assert.equal(isPublicSudokuPage(path),true);assert.equal(isAnalyticsPage(path),true);}
 assert.equal(isPublicSudokuPage(learningRoot+'unknown/'),false);assert.equal(isAnalyticsPage('/en/sudoku/play/?level=1'),false);
});
test('hub provides distinct tutorials, actual explanations and preserved old fragments in initial HTML',async()=>{
 const html=await readFile('dist/client'+learningRoot+'index.html','utf8');
 for(const l of lessons){assert.ok(html.includes('id="technique-'+l.id+'"'));assert.ok(html.includes('href="'+lessonPath(l)+'"'));assert.ok(html.includes(l.definition.replaceAll('“','“')));}
 for(const text of ['Where do candidate notes come from?','Read a Sudoku candidate list correctly','Match the method to what you can prove','id="speed-practice"'])assert.ok(html.includes(text));
 assert.ok(!html.includes('Open this lesson'));assert.ok(!html.includes('sl-anchors'));
 for(const [,href]of html.matchAll(/href="(#[^"]+)"/g))assert.ok(html.includes('id="'+href.slice(1)+'"'),href);
});
test('tutorial HTML is a complete readable article with evidence, counterexample and unsolved independent practice',async()=>{
 const sitemap=await readFile('dist/client/sitemap.xml','utf8');
 for(const l of lessons){const path=lessonPath(l),html=await readFile('dist/client'+path+'index.html','utf8');
  for(const text of ['Full nine by nine Sudoku teaching board','id="worked-example"','id="evidence"','id="counterexample"','id="try-it"','What breaks this deduction?','Check these conditions'])assert.ok(html.includes(text),path+' '+text);
  for(const [heading]of l.reading)assert.ok(html.includes(heading));
  assert.ok(html.includes(l.definition));assert.ok(html.includes(coordinate(l.demo.cells[0])));
  assert.ok(html.includes('href="https://paperadventure.app'+path+'"'));assert.ok(sitemap.includes('https://paperadventure.app'+path+'</loc>'));
  assert.ok(html.includes('"@type":"Article"'));assert.ok(html.includes('"name":"Solving techniques"'));
  assert.ok(!html.includes('Deduction confirmed'));assert.ok(!html.includes(l.practice.givens));
  const practice=html.slice(html.indexOf('id="try-it"'),html.indexOf('id="questions"'));assert.ok(!practice.includes('tt-key'));assert.ok(!practice.includes('tt-result'));
  for(const [,href]of html.matchAll(/href="(#[^"]+)"/g))assert.ok(html.includes('id="'+href.slice(1)+'"'),path+' '+href);
 }
});
