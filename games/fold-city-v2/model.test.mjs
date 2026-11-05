import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{initialState,act,legalActions,visibleMap,landmarkPosition,rotateMask,rotatePoint,restoreHistory,stateKey,cellPath}from'./model.mjs';
import{solve,explore}from'./solver.mjs';
const d=JSON.parse(fs.readFileSync(new URL('./game.json',import.meta.url)));
test('physical left flap exposes base, replaces exactly one column, and keeps controls on fixed front paper',()=>{
 for(let k=0;k<3;k++)for(let r=0;r<4;r++){
  const s=initialState(d);s.tiles[k]={r,f:true};const map=visibleMap(d,s),[ox,oy]=d.tiles[k].origin;
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){
   const [rx,ry]=rotatePoint(x,y,r),cell=map[oy+ry][ox+rx];
   assert.equal(cell.layer,x===0?'base':x===1?'reverse':'front');
   assert.equal(cell.mask,x===0?d.base[oy+ry][ox+rx]:rotateMask(x===1?d.tiles[k].fold[y]:d.tiles[k].front[y][x],r));
  }
  const operator=d.landmarks.find(l=>l.operator===k),[x,y]=landmarkPosition(d,s,operator.id);assert.equal(map[y][x].layer,'front');
 }
});
test('initial city has a real first route and a physically blocked exit',()=>{const s=initialState(d);assert.deepEqual(legalActions(d,s),[{type:'move',to:'CC'}]);assert.equal(cellPath(d,s,'E'),null);assert.throws(()=>act(d,s,{type:'move',to:'E'}));});
test('only a local turntable permits a map change; unreachable and hidden stops cannot be entered',()=>{
 const s=initialState(d);assert.throws(()=>act(d,s,{type:'rotate',tile:0}));assert.throws(()=>act(d,s,{type:'move',to:'W'}));assert.throws(()=>act(d,s,{type:'move',to:'G'}));
 const n=act(d,s,{type:'move',to:'CC'});assert.throws(()=>act(d,n,{type:'fold',tile:0}));const p=act(d,n,{type:'rotate',tile:2});assert.equal(p.at,'CC');assert.notDeepEqual(landmarkPosition(d,n,'CC'),landmarkPosition(d,p,'CC'));assert.equal(n.tiles[2].r,0);
});
test('the completed game requires real folds and turns, including a fold in each quarter',()=>{
 for(const ban of [(_,a)=>a.type==='fold',(_,a)=>a.type==='rotate',...[0,1,2].map(k=>(_,a)=>a.type==='fold'&&a.tile===k)])assert.equal(solve(d,{ban}),null);
});
test('both clasp collection orders reach the actual outside node',()=>{
 for(const first of [1,2]){const sol=solve(d,{ban:(s,a)=>a.type==='collect'&&a.item!==first&&!(s.clips&first)});assert.ok(sol);let s=initialState(d);for(const a of sol.actions)s=act(d,s,a);assert.equal(s.at,'E');assert.equal(s.clips,3);assert.equal(s.gate,true);assert.deepEqual(legalActions(d,s),[]);}
});
test('every reachable state has a decreasing-distance recovery hint and can finish',()=>{
 const policy=JSON.parse(fs.readFileSync(new URL('./policy.json',import.meta.url))),ex=explore(d);for(const original of ex.states){let s=original;const seen=new Set();while(s.at!=='E'){const key=stateKey(s);assert.ok(!seen.has(key));seen.add(key);assert.ok(policy[key]);s=act(d,s,policy[key]);}}
});
test('saved progress replays legal actions; forged, mixed-edition and interrupted histories reset safely',()=>{
 const actions=solve(d).actions;for(let n=0;n<=actions.length;n++){const r=restoreHistory(d,{game:d.id,schema:1,actions:actions.slice(0,n)});assert.equal(r.valid,true);assert.equal(r.states.length,n+1);}
 for(const raw of ['{',{game:d.id,schema:2,actions:[]},{game:'other',schema:1,actions:[]},{game:d.id,schema:1,actions:[{type:'move',to:'E'}]}])assert.equal(restoreHistory(d,raw).valid,false);
 assert.equal(restoreHistory(d,{game:d.id,schema:1,actions:[{to:'CC',type:'move'}]}).valid,true);
});
test('clasps cannot be collected twice or installed remotely; opening is not itself escape',()=>{
 let s=initialState(d);const sol=solve(d);for(const a of sol.actions){if(a.type==='collect'){assert.throws(()=>act(d,s,{type:'install'}));s=act(d,s,a);assert.throws(()=>act(d,s,a));}else if(a.type==='install'){s=act(d,s,a);assert.equal(s.at,'M');assert.throws(()=>act(d,s,a));}else s=act(d,s,a);}assert.equal(s.at,'E');
});
