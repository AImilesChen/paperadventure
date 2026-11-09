import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import site from '../backend/preview-deploy-worker.mjs';
import {retiredWeeklyTarget} from '../shared/sudoku-retirement.mjs';
import {pageFor} from '../shared/page-manifest.mjs';
import {sudokuLinks} from '../shared/sudoku-navigation.mjs';
import {freshAccount,applyAction} from '../backend/sudoku/service.mjs';
import {mergeAccounts,mergeConflicts} from '../backend/sudoku/merge.mjs';
import {sudokuApi,D1SudokuStore} from '../backend/sudoku/api.mjs';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';

test('cached client routes show the retirement fallback before the unknown-page guard',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
 const previousWindow=globalThis.window,previousStorage=globalThis.localStorage;
 try{
  globalThis.localStorage={getItem:()=>null};
  const{App}=await server.ssrLoadModule('/src/App.jsx');
  for(const pathname of ['/en/sudoku/weekly/','/en/sudoku/weekly/play/','/en/sudoku/weekly/leaderboard/']){
   globalThis.window={location:{pathname,search:'?week=2026-11-09&level=10',origin:'https://paperadventure.app'}};
   const html=renderToString(React.createElement(App));
   assert.match(html,/The weekly challenge has closed/);assert.doesNotMatch(html,/That page isn/);
   assert.ok(html.includes('href="'+retiredWeeklyTarget(pathname)+'"'));
  }
 }finally{globalThis.window=previousWindow;globalThis.localStorage=previousStorage;await server.close();}
});

test('old weekly URLs redirect before assets or API calls and discard the old query',async()=>{
 for(const[path,target]of [['/en/sudoku/weekly','/en/sudoku/'],['/en/sudoku/weekly/','/en/sudoku/'],['/en/sudoku/weekly/play/','/en/sudoku/'],['/en/sudoku/weekly/leaderboard/','/en/sudoku/leaderboard/']]){
  assert.equal(retiredWeeklyTarget(path),target);
  for(const method of ['GET','HEAD']){
   const r=await site.fetch(new Request('https://paperadventure.app'+path+'?week=2026-11-09&level=10',{method}),{ASSETS:{fetch(){throw Error('Must redirect before assets');}}});
   assert.equal(r.status,308);assert.equal(r.headers.get('location'),'https://paperadventure.app'+target);assert.equal(r.headers.get('x-robots-tag'),'noindex');
  }
 }
 assert.equal(retiredWeeklyTarget('/en/sudoku/weekly-other/'),null);
 assert.ok(!sudokuLinks.some(l=>l.id==='weekly'));
 assert.equal(pageFor('/en/sudoku/weekly/'),null);
});

test('retired weekly reads and mutations fail before auth, account creation, merges or writes',async()=>{
 for(const path of ['/weekly','/weekly/','/weekly/2026-11-09/progress','/weekly/2026-11-09/leaderboard','/weekly/2026-11-09/sessions','/weekly/2026-11-09/sessions/old/save','/weekly/2026-11-09/sessions/old/hints','/weekly/2026-11-09/sessions/old/complete']){
  for(const method of ['GET','POST','PUT']){
   const r=await sudokuApi(new Request('https://test.local/api/v1/sudoku'+path,{method}),{},{store:{ensure(){throw Error('Unexpected write');}},authenticate(){throw Error('Unexpected auth');}});
   assert.equal(r.status,410,path);assert.equal(r.headers.get('set-cookie'),null);assert.match(r.headers.get('cache-control'),/no-store/);
   assert.equal((await r.json()).error.code,'WEEKLY_RETIRED');
  }
 }
});

const history=tag=>({highest:1,independent:1,current:2,ranked:{highest:1,independent:1,joinedAt:1},completions:{1:{assisted:false,at:2}},sessions:{archived:{id:'archived',level:1,board:Array(81).fill(tag),notes:Array.from({length:81},()=>[]),startedAt:1,revision:2,hints:[]}},seen:{}});
test('retired board conflicts never block campaign linking, and both histories and balances survive',()=>{
 const a=freshAccount(),g=freshAccount();a.balance=41;g.balance=17;a.weekly={'2026-11-09':history(1)};g.weekly={'2026-11-09':history(2)};
 const original=structuredClone(a.weekly),guestHistory=structuredClone(g.weekly);
 assert.deepEqual(mergeConflicts(a,g),[]);
 const linked=mergeAccounts(a,g,'old-guest');
 assert.equal(linked.balance,41);assert.deepEqual(linked.weekly,original);assert.deepEqual(linked.retiredWeeklyImports['old-guest'].weekly,guestHistory);
 assert.deepEqual(mergeAccounts(linked,g,'old-guest'),linked);assert.deepEqual(a.weekly,original);assert.deepEqual(g.weekly,guestHistory);
});

test('campaign writes and profile updates preserve historical weekly results byte-for-byte',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(await readFile('backend/migrations/0049_sudoku.sql','utf8'));
 const store=new D1SudokuStore({prepare(sql){return{bind(...args){return{async first(){return db.prepare(sql).get(...args)||null;},async all(){return{results:db.prepare(sql).all(...args)};},async run(){return{meta:{changes:db.prepare(sql).run(...args).changes}};}};}};}});
 try{
  let row=await store.ensure('account:retirement-test',true);row.state.weekly={'2026-11-09':history(4)};row.state.balance=38;
  assert.ok(await store.cas(row,row.state,{listed:1}));row=await store.get(row.owner);const before=JSON.stringify(row.state.weekly);
  const action=applyAction(row.state,'start',{level:1});assert.ok(await store.cas(row,action.account));
  row=await store.get(row.owner);assert.equal(JSON.stringify(row.state.weekly),before);assert.equal(row.state.balance,38);assert.equal(row.state.highest,0);
  assert.ok(await store.cas(row,row.state,{nickname:'Still here',listed:0}));row=await store.get(row.owner);assert.equal(JSON.stringify(row.state.weekly),before);
  const h=await sudokuApi(new Request('https://test.local/api/v1/sudoku/health'),{},{store});assert.equal((await h.json()).weeklyRetired,true);
 }finally{db.close();}
});

test('public HTML and offline caches expose only campaign navigation',async()=>{
 for(const route of ['','play/','levels/','leaderboard/','how-to-play/','techniques/']){
  const html=await readFile('dist/client/en/sudoku/'+route+'index.html','utf8');
  assert.doesNotMatch(html,/href="\/en\/sudoku\/weekly(?:\/|\?)/,route);
 }
 assert.doesNotMatch(await readFile('dist/client/sitemap.xml','utf8'),/sudoku\/weekly/);
 const sw=await readFile('public/en/sudoku/sw.js','utf8');assert.doesNotMatch(sw,/'\/en\/sudoku\/weekly\/'/);assert.match(sw,/v35-1/);
});
