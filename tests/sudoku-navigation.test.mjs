import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerSudokuLeave,prepareSudokuLeave} from '../src/sudoku-leave.mjs';
import {sudokuLinks,sudokuSection} from '../shared/sudoku-navigation.mjs';
import {pageFor} from '../shared/page-manifest.mjs';

test('Sudoku navigation resolves real routes and separates private progress from public lessons',()=>{
 for(const link of sudokuLinks)assert.ok(pageFor(link.href),link.href);
 assert.equal(sudokuSection('/en/sudoku/play/'),'play');assert.equal(sudokuSection('/en/sudoku/levels/'),'levels');
 for(const p of ['/en/sudoku/play/'])assert.equal(pageFor(p).indexable,false);
 for(const p of ['/en/sudoku/leaderboard/','/en/sudoku/levels/','/en/sudoku/how-to-play/','/en/sudoku/techniques/'])assert.equal(pageFor(p).indexable,true);
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

import {rankingContext,rankingPath,rankingSignIn,participation} from '../shared/sudoku/leaderboard-context.mjs';
import {accountReturnPath} from '../shared/account-return.mjs';
test('ranking sign-in preserves selected mode and level using a bounded local return target',()=>{
 const path=rankingPath({mode:'speed',level:201,profile:true});assert.equal(path,'/en/sudoku/leaderboard/?mode=speed&level=201&profile=1#my-results');
 const href=rankingSignIn({mode:'speed',level:201});const target=new URL(href,'https://local.invalid').searchParams.get('returnTo');assert.equal(accountReturnPath(target),path);
 assert.deepEqual(rankingContext('?mode=speed&level=1.2&token=private'),{mode:'speed',level:1,profile:false});
 assert.equal(rankingPath({mode:'https://evil.test',level:99999,profile:true}),'/en/sudoku/leaderboard/?profile=1#my-results');
});
test('participation distinguishes saved private results, review and locked states without changing consent',()=>{
 const guest={authenticated:false,listed:false},privateUser={authenticated:true,listed:false},publicUser={authenticated:true,listed:true};
 assert.equal(participation({profile:guest,highest:2}).id,'guest-result');
 assert.equal(participation({profile:guest,highest:2,speedLevel:1,best:null}).id,'guest');
 assert.equal(participation({profile:privateUser,highest:2,speedLevel:1,best:85}).id,'private');
 assert.equal(participation({profile:publicUser,speedLevel:1,best:null}).id,'no-result');
 assert.equal(participation({profile:publicUser,speedLevel:1,best:85,latest:{status:'pending'}}).id,'pending');
 assert.equal(participation({profile:publicUser,speedLevel:201,best:null,locked:true}).id,'locked');
 assert.equal(publicUser.listed,true);assert.equal(privateUser.listed,false);
});
