import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fresh,restore,complete,checkAnswer,solutions} from './model.mjs';
const data=JSON.parse(fs.readFileSync(new URL('./game.json',import.meta.url)));
test('evidence has one missing silhouette and one matching transfer',()=>{
 assert.equal(new Set(data.arrival).size,6);
 assert.deepEqual(data.carriages.filter(c=>!data.arrival.includes(c.id)).map(c=>c.id),['K7']);
 assert.deepEqual(data.transfers.filter(t=>t.carriage==='K7'&&t.mark==='CLOCK'&&t.batch==='27'&&t.status.startsWith('EXECUTED')).map(t=>t.id),['T3']);
 assert.equal(new Set(data.carriages.map(c=>`${c.windows}-${c.door}-${c.roof}-${c.mark}`)).size,7);
});
test('corrected clock matches exactly one log window and sign',()=>{
 const minutes=s=>s.split(':').map(Number).reduce((h,m)=>h*60+m);
 const reading=minutes(data.clock.observed)+4;
 assert.deepEqual(data.stations.filter(s=>minutes(s.start)<=reading&&minutes(s.end)>=reading&&s.mark==='MOON').map(s=>s.name),['Moonbay']);
});
test('complete case accepts evidence but rejects missing or incorrect fields',()=>{
 let p=fresh();
 assert.equal(complete(p,4,solutions[4]),p);
 for(let stage=0;stage<6;stage++){
  assert.equal(checkAnswer(stage,solutions[stage]),true);
  for(const field of Object.keys(solutions[stage]))assert.equal(checkAnswer(stage,{...solutions[stage],[field]:'wrong'}),false,`${stage}:${field}`);
  p=complete(p,stage,solutions[stage],stage===2);
 }
 assert.deepEqual(p.completed,[0,1,2,3,4,5]);assert.deepEqual(p.assisted,[2]);
 assert.equal(complete(p,5,solutions[5]),p);
});
test('corrupt and noncontiguous progress cannot unlock later stages',()=>{
 for(const raw of ['broken','null','{}',JSON.stringify({version:2,completed:[0,2]})])assert.deepEqual(restore(raw),fresh());
 const p=restore({version:2,completed:[0],hints:[999,-2,'3'],assisted:[0,5],drafts:[]});
 assert.deepEqual(p.hints,[3,0,0,0,0,0]);assert.deepEqual(p.assisted,[0]);assert.deepEqual(p.drafts,{});
});
test('private development output is outside public assets',()=>{
 assert.equal(fs.existsSync(new URL('../../public/assets/seventh-carriage/',import.meta.url)),false);
 assert.equal(data.price.amount,999);assert.equal(data.price.taxInclusive,true);
});


test('time and sign each leave multiple candidates; combined evidence is unique',()=>{const time=data.stations.filter(s=>s.start<='21:18'&&s.end>='21:18');const sign=data.stations.filter(s=>s.mark==='MOON');assert.equal(time.length,2);assert.equal(sign.length,2);assert.deepEqual(time.filter(s=>s.mark==='MOON').map(s=>s.name),['Moonbay']);});
test('only one return plan satisfies release, capacity and deadline',()=>{assert.deepEqual(data.routes.filter(r=>r.time>='21:36'&&r.arrival<='22:00'&&r.bay==='3'&&r.wholeCarriage).map(r=>r.id),['B']);assert.equal(data.transfers.filter(t=>t.carriage==='K7'&&t.batch==='27'&&t.mark==='CLOCK').length,2);});
test('stale v1 save cannot skip revised evidence checks',()=>{assert.deepEqual(restore({version:1,completed:[0,1,2,3,4,5]}),fresh());});
