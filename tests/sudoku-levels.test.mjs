import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {levelCatalog,publicCatalog} from '../shared/sudoku/catalog.mjs';
import {chapterRoadmap,techniqueStages} from '../shared/sudoku/level-roadmap.mjs';
import {pageFor} from '../shared/page-manifest.mjs';
import publicWorker from '../backend/preview-deploy-worker.mjs';

test('roadmap bands and mixed chapters match the real puzzle catalogue',()=>{
 assert.equal(levelCatalog.length,publicCatalog.publishedCount);
 for(const p of levelCatalog){
  const stage=techniqueStages.find(s=>p.level>=s.from&&p.level<=s.to);
  assert.equal(p.rank,stage.rank,`level ${p.level}`);
  const chapter=chapterRoadmap.find(c=>p.level>=c.from&&p.level<=c.to);
  assert.ok(chapter.stages.some(s=>s.rank===p.rank));
 }
 assert.equal(chapterRoadmap[3].techniques,'Hidden positions → Locked candidates');
 assert.deepEqual(chapterRoadmap.flatMap(c=>Array.from({length:10},(_,i)=>c.from+i)),Array.from({length:publicCatalog.publishedCount},(_,i)=>i+1));
});

test('public initial HTML is indexable, complete, and independent of account loading',async()=>{
 const html=await readFile('dist/client/en/sudoku/levels/index.html','utf8');
 assert.equal(pageFor('/en/sudoku/levels/').indexable,true);
 assert.ok(!/<meta name="robots" content="noindex"/.test(html));
 assert.equal((html.match(/<h1[ >]/g)||[]).length,1);
 assert.match(html,/<link rel="canonical" href="https:\/\/paperadventure.app\/en\/sudoku\/levels\/"/);
 for(const text of ['See how the logic changes','Separate row example','Separate candidate row',`Sudoku Levels: ${publicCatalog.publishedCount} Progressive Puzzles`,'How these Sudoku levels progress','Saving your progress','Can I skip a locked level?','Complete the trail'])assert.ok(html.includes(text),text);
 assert.equal((html.match(/class="sd-chapter sd-tone-/g)||[]).length,10);
 assert.equal((html.match(/class="sd-level-tile /g)||[]).length,100);
 assert.equal((html.match(/class="sd-stage sd-tone-/g)||[]).length,4);
 for(const [,hash]of html.matchAll(/href="(#[^"]+)"/g))assert.ok(html.includes('id="'+hash.slice(1)+'"'),hash);
 assert.match(await readFile('dist/client/sitemap.xml','utf8'),/<loc>https:\/\/paperadventure.app\/en\/sudoku\/levels\/<\/loc>/);
 for(const route of ['play','leaderboard'])assert.equal(pageFor('/en/sudoku/'+route+'/').indexable,false,route);
});

test('only the canonical host exposes levels to indexing; previews and personal game routes stay noindex',async()=>{
 const env={ASSETS:{fetch:async()=>new Response('<html>public shell</html>',{headers:{'content-type':'text/html','x-robots-tag':'noindex'}})}};
 for(const[host,path,indexable]of [['paperadventure.app','levels',true],['preview.test','levels',false],['paperadventure.app','play',false],['paperadventure.app','leaderboard',false]]){
  const r=await publicWorker.fetch(new Request(`https://${host}/en/sudoku/${path}/`),env);
  assert.equal(r.headers.has('x-robots-tag'),!indexable,host+'/'+path);
 }
});

test('chapter inspection preserves unlocks, first-clear labels and merge restrictions',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
 try{
  const{default:Map}=await server.ssrLoadModule('/src/sudokuLevelMap.jsx');
  const{SudokuLevelsContent,validateLevelsResponse}=await server.ssrLoadModule('/src/sudokuLevels.jsx');
  const page=(data=null,error='')=>renderToStaticMarkup(React.createElement(SudokuLevelsContent,{data,error}));
  const fresh={state:{highest:0,current:1,balance:15,completions:{}},profile:{authenticated:false}};
  assert.equal(validateLevelsResponse(fresh),fresh);
  assert.throws(()=>validateLevelsResponse({...fresh,state:{...fresh.state,highest:publicCatalog.publishedCount+1}}),/Progress unavailable/);
  assert.throws(()=>validateLevelsResponse({state:{highest:0}}),/Progress unavailable/);
  const loading=page();assert.match(loading,/Loading your saved place/);assert.doesNotMatch(loading,/0<\/b> \/ 100 cleared/);assert.match(loading,/Preview/);
  assert.match(page(fresh),/Start level 1/);
  const failed=page(null,'Unable to load progress');assert.match(failed,/Retry progress/);assert.match(failed,/How these Sudoku levels progress/);assert.match(failed,/href="\/en\/sudoku\/"[^>]*>Play Sudoku/);
  const complete=page({...fresh,state:{...fresh.state,highest:publicCatalog.publishedCount,current:publicCatalog.publishedCount}});assert.match(complete,new RegExp(`All ${publicCatalog.publishedCount} published levels complete`));assert.match(complete,/href="#sd-map-title"[^>]*>Revisit your levels/);
  assert.match(page({...fresh,mergePending:{conflicts:[]}}),/Review saved progress/);
  const render=props=>renderToStaticMarkup(React.createElement(Map,props));
  const links=html=>[...html.matchAll(/href="\/en\/sudoku\/play\/\?level=(\d+)"/g)].map(m=>Number(m[1])).sort((a,b)=>a-b);
  assert.deepEqual(links(render({progress:null})),[]);
  const completions=Object.fromEntries(Array.from({length:35},(_,i)=>[i+1,{assisted:i===0}]));
  const mid=render({progress:{highest:35,current:36,completions}});
  assert.deepEqual(links(mid),Array.from({length:36},(_,i)=>i+1));
  assert.ok(mid.indexOf('Chapter 4 ·')<mid.indexOf('Chapter 1 ·'));
  assert.match(mid,/aria-label="Level 1, cleared/);assert.match(mid,/aria-label="Level 2, cleared/);
  assert.match(mid,/aria-label="Level 37, locked/);
  assert.deepEqual(links(render({progress:null,blocked:true})),[]);
  const done=render({progress:{highest:publicCatalog.publishedCount,current:publicCatalog.publishedCount,completions:Object.fromEntries(Array.from({length:publicCatalog.publishedCount},(_,i)=>[i+1,{assisted:false}]))}});
  assert.equal(links(done).length,100);assert.match(done,/Your completed trail/);
 }finally{await server.close();}
});
