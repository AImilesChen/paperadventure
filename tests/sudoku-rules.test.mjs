import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rulesFixtures as f,brokenRules,placementChecks,firstMoveSteps,gradeRulesTask,emptyRuleEntry,editRuleEntry} from '../shared/sudoku/rules-learning.mjs';
import {independentlySolve,fingerprints} from '../scripts/sudoku-bank-validation.mjs';
import {pageFor} from '../shared/page-manifest.mjs';
import {pageSchema} from '../shared/seo.mjs';
// Check constraints by coordinates independently of the production engine's peers.
const same=(a,b,k)=>k==='row'?Math.floor(a/9)===Math.floor(b/9):k==='column'?a%9===b%9:Math.floor(a/27)===Math.floor(b/27)&&Math.floor(a%9/3)===Math.floor(b%9/3);
const conflicts=x=>['row','column','box'].filter(k=>[...x.givens].some((n,i)=>i!==x.target&&Number(n)===x.proposed&&same(i,x.target,k)));
test('seven beginner teaching positions are unique and independent of published and reserve puzzles',async()=>{
 const bank=JSON.parse(await readFile('backend/sudoku/puzzles.json','utf8')),stock=JSON.parse(await readFile('backend/sudoku/bank-stock.json','utf8'));
 const known=new Set([...bank,...stock.reserve].map(x=>fingerprints(x.givens).digits)),positions=[f.guided,...Object.values(f.examples),...Object.values(f.practice)],own=new Set();
 for(const x of positions){const solved=independentlySolve(x.givens);assert.equal(solved.count,1);assert.equal(x.givens[x.target],'0');const fp=fingerprints(x.givens).digits;assert.equal(known.has(fp),false);assert.equal(own.has(fp),false);own.add(fp);}
});
test('all three conflict examples and both trial tasks break exactly the stated rule',()=>{
 for(const x of [...Object.values(f.examples),f.practice.conflict,f.practice.judgment]){assert.deepEqual(conflicts(x),[x.kind]);assert.deepEqual(brokenRules(x.givens,x.target,x.proposed),[{kind:x.kind,blockers:[x.blocker]}]);assert.equal(Number(x.givens[x.blocker]),x.proposed);}
});
test('the full first move and the different placement task have independently justified answers',()=>{
 assert.deepEqual(placementChecks(f.guided),{missing:[2,7],afterColumn:[7],remaining:[7]});
 for(const x of [f.guided,f.practice.placement]){assert.equal(Number(independentlySolve(x.givens).solution[x.target]),x.digit);assert.deepEqual(placementChecks(x).remaining,[x.digit]);assert.equal(Number(x.givens[x.blocking]),x.blockedDigit);assert.equal(same(x.target,x.blocking,'column'),true);}
 assert.equal(f.practice.placement.digit,8);assert.notEqual(f.guided.givens,f.practice.placement.givens);assert.equal(firstMoveSteps().length,5);assert.match(firstMoveSteps()[2][1],/R4C1 already contains 2/);
});
test('conflict grading requires both cells, rejects partial and extra choices, and supports retry',()=>{
 const x=f.practice.conflict,a=[x.target,x.blocker];for(const cells of [[],[a[0]],[a[1]],[...a,0],[0,1]])assert.equal(gradeRulesTask('conflict',{cells}).correct,false);assert.equal(gradeRulesTask('conflict',{cells:a}).correct,true);assert.equal(gradeRulesTask('conflict',null).correct,false);
});
test('judgment requires a verdict and its exact reason; final entry is distinct from notes',()=>{
 for(const response of [{},{verdict:'can'},{verdict:'cannot'},{verdict:'cannot',rules:['row']},{verdict:'cannot',rules:['column','box']}])assert.equal(gradeRulesTask('judgment',response).correct,false);
 assert.equal(gradeRulesTask('judgment',{verdict:'cannot',rules:['column']}).correct,true);
 for(const digit of [0,1,2,3,4,5,6,7,9,'8',null])assert.equal(gradeRulesTask('placement',{digit}).correct,false);assert.equal(gradeRulesTask('placement',{digit:8}).correct,true);assert.equal(gradeRulesTask('placement',editRuleEntry(emptyRuleEntry(),{type:'digit',digit:8,notes:true})).correct,false);assert.equal(gradeRulesTask('unknown',null).correct,false);
});
test('practice editing preserves snapshots, toggles sorted notes and replaces notes with final entries',()=>{
 const original=emptyRuleEntry(),a=editRuleEntry(original,{type:'digit',digit:8,notes:true}),b=editRuleEntry(a,{type:'digit',digit:2,notes:true}),c=editRuleEntry(b,{type:'digit',digit:8,notes:true});
 assert.deepEqual(original,{digit:0,notes:[]});assert.deepEqual(a,{digit:0,notes:[8]});assert.deepEqual(b,{digit:0,notes:[2,8]});assert.deepEqual(c,{digit:0,notes:[2]});const final=editRuleEntry(b,{type:'digit',digit:8,notes:false});assert.deepEqual(final,{digit:8,notes:[]});assert.deepEqual(editRuleEntry(final,{type:'erase'}),original);assert.equal(editRuleEntry(final,{type:'digit',digit:10}),final);
});
test('beginner guide metadata describes its real public article and Sudoku breadcrumb',()=>{
 const p=pageFor('/en/sudoku/how-to-play/');assert.equal(p.indexable,true);assert.match(p.title,/How to Play Sudoku/);const g=pageSchema(p,{} )['@graph'];assert.ok(g.some(x=>x['@type']==='Article'&&x.isAccessibleForFree));const c=g.find(x=>x['@type']==='BreadcrumbList');assert.ok(c.itemListElement.some(x=>x.item==='https://paperadventure.app/en/sudoku/'));
});
test('prerender exposes all five reasoning steps, public controls and local practice without preselected answers',async()=>{
 const html=await readFile('dist/client/en/sudoku/how-to-play/index.html','utf8');
 for(const id of ['sudoku-rules','why-moves-fail','first-move','rules-practice','game-controls'])assert.ok(html.includes('id="'+id+'"'));
 for(const [title] of firstMoveSteps())assert.ok(html.includes(title));assert.match(html,/sr-board/);assert.match(html,/Verify saved board/);assert.match(html,/What counts as clearing a level/);assert.match(html,/How to play Sudoku: a beginner/);
 const practice=html.split('id="rules-practice"')[1].split('id="game-controls"')[0];assert.equal(practice.includes('sr-conflict'),false);assert.equal(practice.includes('sr-practice-finished'),false);assert.match(practice,/No cells selected yet/);
});
