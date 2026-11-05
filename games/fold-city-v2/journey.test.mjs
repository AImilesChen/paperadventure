import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {initialState,stateKey,act} from './model.mjs';
import {explore} from './solver.mjs';
import {validPaperState,freshJourney,journeyFile,restoreJourney,rescueFor,jobRound,jobOwners} from './journey.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL(n,import.meta.url))),d=read('game.json'),known=new Set(read('reachable.json')),rescues=read('rescues.json'),policy=read('policy.json'),routes=read('solutions.json');
test('every reachable paper snapshot round-trips without action history and can finish',()=>{
 const states=explore(d).states;assert.equal(states.length,known.size);
 for(const s of states){assert.ok(validPaperState(d,s,known));const j=freshJourney(d,s,'paper',3),restored=restoreJourney(d,journeyFile(d,j),known,rescues);assert.ok(restored);assert.deepEqual(restored.states[0],s);let next=s,n=0;while(next.at!=='E'){next=act(d,next,policy[stateKey(next)]);assert.ok(++n<60);}}
});
test('covered, outside-before-opening, malformed and unreachable paper combinations are refused',()=>{
 const s=initialState(d);for(const bad of [{...s,at:'W'},{...s,at:'E'},{...s,gate:true},{...s,clips:4},{...s,tiles:[{r:4,f:false},...s.tiles.slice(1)]},{...s,tiles:[{r:0,f:'false'},...s.tiles.slice(1)]},null])assert.equal(validPaperState(d,bad,known),false);
});
test('every rescue preserves earned/installed clasps, is reachable and has a legal next action',()=>{
 for(const s of explore(d).states){const r=rescueFor(s,rescues);assert.ok(r);assert.equal(r.state.clips,s.clips);assert.equal(r.state.gate,s.gate);assert.ok(validPaperState(d,r.state,known));assert.doesNotThrow(()=>act(d,r.state,policy[stateKey(r.state)]));}
 assert.equal(new Set(rescues.map(r=>r.id)).size,5);
});
test('anchored saves replay only legal later actions; old action-only edition files remain importable',()=>{
 for(const r of rescues){const j=freshJourney(d,r.state,'rescue',2),a=policy[stateKey(r.state)];j.actions.push(a);j.states.push(act(d,r.state,a));const restored=restoreJourney(d,JSON.stringify(journeyFile(d,j)),known,rescues);assert.deepEqual(restored,j);}
 const actions=routes.binderyFirst.map(s=>s.action);const old=restoreJourney(d,{game:d.id,schema:1,actions},known,rescues);assert.equal(old.states.at(-1).at,'E');
 const valid=journeyFile(d,freshJourney(d));for(const bad of [{...valid,edition:3},{...valid,game:'other'},{...valid,teamSize:5},{...valid,origin:'unknown'},{...valid,base:{...valid.base,gate:true}},{...valid,actions:[{type:'move',to:'E'}]},'{'])assert.equal(restoreJourney(d,bad,known,rescues),null);
 const nonRescue=explore(d).states.find(s=>!rescues.some(r=>stateKey(r.state)===stateKey(s)));assert.equal(restoreJourney(d,{...valid,origin:'rescue',base:nonRescue},known,rescues),null);
});
test('jobs rotate on first turntable visits and taking clasps; trials and revisits do not rotate them',()=>{
 const j=freshJourney(d);const push=a=>{j.actions.push(a);j.states.push(act(d,j.states.at(-1),a));};push({type:'move',to:'CC'});assert.equal(jobRound(d,j),1);push({type:'rotate',tile:2});push({type:'rotate',tile:2});assert.equal(jobRound(d,j),1);push({type:'move',to:'CA'});assert.equal(jobRound(d,j),2);
 for(const size of [2,3,4])for(let r=0;r<9;r++){const owners=jobOwners(d,size,r);assert.notEqual(owners[2],owners[3]);assert.equal(new Set(owners).size,size);}
 const full=freshJourney(d);for(const s of routes.gardenFirst){full.actions.push(s.action);full.states.push(s.after);}assert.equal(jobRound(d,full),5);
});
