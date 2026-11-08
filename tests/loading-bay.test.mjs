import test from 'node:test';
import assert from 'node:assert/strict';
import { bayEdition, bayPieces, bayStart, bayOccupancy, bayStates, baySlides, bayMove, baySolved, solveBay, cleanBay, freshBay, bayHints, describeBayMove } from '../shared/loading-bay.mjs';
import { freshWorkshop, freshItem, changeData, undoItem, restoreWorkshop, checkWorkshop } from '../shared/puzzle-workshop.mjs';
import { helpKey, restoreCreditPreview, freshCreditPreview } from '../shared/puzzle-credit-preview.mjs';

test('original board has 906 reachable states; every state has a legal route to the exit',()=>{
 assert.equal(bayStates().size,906);assert.equal(solveBay(bayStart).length,18);
 for(const positions of bayStates().values()){
  assert.ok(bayOccupancy(positions));const path=solveBay(positions);assert.ok(Array.isArray(path));let data={edition:bayEdition,positions};
  for(const m of path){assert.equal(m.from,data.positions[bayPieces.findIndex(p=>p.id===m.piece)]);data=bayMove(data,m.piece,m.to);assert.ok(data);assert.deepEqual(data.positions,m.positions);}
  assert.equal(baySolved(data.positions),true);
 }
});
test('slides preserve orientation and reject jumps, rotation, overlap and off-board coordinates',()=>{
 assert.equal(bayMove(freshBay(),'X',4),null);assert.equal(bayMove(freshBay(),'D',0),null);assert.equal(bayMove(freshBay(),'X',-1),null);assert.equal(bayMove(freshBay(),'UNKNOWN',2),null);
 for(const s of bayStates().values())for(const m of baySlides(s)){
  const i=bayPieces.findIndex(p=>p.id===m.piece),reverse=baySlides(m.positions).find(x=>x.piece===m.piece&&x.to===m.from);
  assert.ok(reverse);assert.deepEqual(reverse.positions,s);assert.equal(m.positions.filter((v,j)=>v!==s[j]).length,1);assert.equal(m.positions[i],m.to);
 }
});
test('hint3 is an executable current-layout move; every hinted move progresses towards delivery',()=>{
 for(const positions of bayStates().values()){
  const path=solveBay(positions),hints=bayHints(positions);assert.equal(hints.length,3);
  if(!path.length)continue;
  assert.equal(hints[2],describeBayMove(path[0]));assert.equal(solveBay(path[0].positions).length,path.length-1);
 }
 const next=bayMove(freshBay(),'A',3);assert.notEqual(bayHints(bayStart)[2],bayHints(next.positions)[2]);
});
test('save validation rejects malformed/unreachable boards; snapshots support Undo and completion recovery',()=>{
 for(const raw of [null,{}, {edition:bayEdition,positions:[]},{edition:bayEdition,positions:[0,0,0,0,0,0,0,0]},{edition:bayEdition,positions:[0,2,2,2,0,2,2,Infinity]}])assert.deepEqual(cleanBay(raw),freshBay());
 let item=freshItem('parcel-queue');for(const move of solveBay(bayStart))item=changeData(item,'parcel-queue',{edition:bayEdition,positions:move.positions});
 assert.equal(checkWorkshop('parcel-queue',item.data).ok,true);assert.equal(checkWorkshop('parcel-queue',undoItem(item).data).ok,false);
 const state=freshWorkshop();state.items['parcel-queue']={...item,completion:'independent'};assert.equal(restoreWorkshop(state).items['parcel-queue'].completion,'independent');
 state.items['parcel-queue'].data=freshBay();assert.equal(restoreWorkshop(state).items['parcel-queue'].completion,null);
});
test('old queue completion and help cannot solve the new bay or change the other five saves',()=>{
 const state=freshWorkshop(),before=restoreWorkshop(state);state.items['parcel-queue']={data:{order:['SUN','LEAF','STAR','MOON']},completion:'independent',history:[{}],viewed:true,hints:3};
 const loaded=restoreWorkshop(state);assert.deepEqual(loaded.items['parcel-queue'].data,freshBay());assert.equal(loaded.items['parcel-queue'].legacyBayCompletion,'independent');assert.equal(loaded.items['parcel-queue'].completion,null);assert.equal(loaded.items['parcel-queue'].hints,0);assert.equal(loaded.items['parcel-queue'].viewed,false);
 for(const [id,item] of Object.entries(before.items))if(id!=='parcel-queue')assert.deepEqual(loaded.items[id],item);
 assert.deepEqual(restoreWorkshop(loaded),loaded);
 const wallet=restoreCreditPreview({...freshCreditPreview(),unlocked:['parcel-queue@1:solution',helpKey('signal-shift','hint-2')]});assert.equal(wallet.unlocked.includes('parcel-queue@1:solution'),false);assert.ok(wallet.unlocked.includes(helpKey('signal-shift','hint-2')));
});

test('old five-square layout never becomes the new challenge or consumes other progress',()=>{
 const state=freshWorkshop();state.items['parcel-queue']={data:{edition:2,positions:[3,0,0,0,0,3,3,2]},completion:'hint',hints:3,viewed:false,history:[]};
 const loaded=restoreWorkshop(state);assert.deepEqual(loaded.items['parcel-queue'].data,freshBay());assert.equal(loaded.items['parcel-queue'].completion,null);assert.equal(loaded.items['parcel-queue'].legacyBayCompletion,'hint');
});
