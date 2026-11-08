import test from 'node:test';
import assert from 'node:assert/strict';
import { moonRecords, moonMessage, encodeMoon, decodeMoon, checkMoon, shiftText, cleanMoon } from '../shared/moon-signal.mjs';
import { freshWorkshop, freshItem, restoreWorkshop, changeData, undoItem } from '../shared/puzzle-workshop.mjs';
const reverse=s=>[...s].reverse().join('');

test('three records distinguish reversal plus shift3 from simple shifts and endpoint swaps',()=>{
 const operations={same:s=>s,reverse,swapEnds:s=>s.at(-1)+s.slice(1,-1)+s[0]}, valid=[];
 for(const [op,fn] of Object.entries(operations))for(let n=0;n<26;n++)if(moonRecords.every(r=>shiftText(fn(r.original),n)===r.sent))valid.push([op,n]);
 assert.deepEqual(valid,[['reverse',3]]);
 assert.equal(shiftText('NOON',3),'QRRQ');assert.notEqual(shiftText('SUN',3),'QXV');
 for(const r of moonRecords)assert.equal(encodeMoon(r.original),r.sent);
 assert.equal(decodeMoon(moonMessage),'DOCK');assert.equal(encodeMoon('AZ Z'),'CD C');
});
test('final answer alone completes; malformed saves and incomplete hypotheses cannot pass',()=>{
 assert.equal(checkMoon({edition:4,answer:'dock'}).ok,true);
 for(const answer of ['',null,undefined,'DO','KCOD','FAIL',{},3])assert.equal(checkMoon({edition:4,answer}).ok,false);
 assert.equal(checkMoon({edition:4,beacon:'SOL',direction:'EAST',calibrated:true}).ok,false);
 assert.deepEqual(cleanMoon({edition:4,answer:'dock',beacon:'SOL',direction:'EAST'}),{edition:4,answer:'DOCK'});
});
test('answer survives reload and Undo; completion is retained only for a correct answer',()=>{
 const state=freshWorkshop();let item=freshItem('signal-shift');const before=item.data;
 item=changeData(item,'signal-shift',{edition:4,answer:'dock'});state.items['signal-shift']={...item,completion:'independent'};
 assert.deepEqual(undoItem(item).data,before);assert.equal(restoreWorkshop(state).items['signal-shift'].completion,'independent');
 state.items['signal-shift'].data.answer='FAIL';assert.equal(restoreWorkshop(state).items['signal-shift'].completion,null);
});
test('edition3 progress is shortened without auto-completion, losing help or changing other games',()=>{
 for(const completion of [null,'hint']){
 const state=freshWorkshop();state.items['signal-shift']={data:{edition:3,testWord:'DOCK',calibrated:true,draft:['SOL','EAST'],beacon:'SOL',direction:'EAST'},history:[{edition:3,testWord:'KCOD'}],hints:2,viewed:false,completion};
 const others=Object.fromEntries(Object.entries(state.items).filter(([id])=>id!=='signal-shift')),loaded=restoreWorkshop(state);
 assert.deepEqual(loaded.items['signal-shift'].data,{edition:4,answer:'DOCK'});assert.equal(loaded.items['signal-shift'].completion,completion);assert.equal(loaded.items['signal-shift'].hints,2);
 assert.deepEqual(undoItem(loaded.items['signal-shift']).data,{edition:4,answer:'KCOD'});
 for(const [id,item] of Object.entries(others))assert.deepEqual(loaded.items[id],item);
 assert.deepEqual(restoreWorkshop(loaded),loaded);
 }
});
test('unrelated earlier Moon rules reset locally and retain their separate completion',()=>{
 for(const data of [{shift:3,star:'RED'},{edition:2,shift:'3',calibrated:true,beacon:'SOL',direction:'EAST'}]){
 const state=freshWorkshop();state.items['signal-shift']={data,history:[],hints:2,viewed:true,completion:'solution'};
 const loaded=restoreWorkshop(state).items['signal-shift'];assert.equal(loaded.completion,null);assert.equal(loaded.hints,0);assert.equal(loaded.legacySignalCompletion,'solution');
 }
});
