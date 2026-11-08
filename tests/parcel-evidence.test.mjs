import test from 'node:test';
import assert from 'node:assert/strict';
import { parcels, parcelRecords, verifiedParcelRecords, parcelEdition, freshParcel, cleanParcel, enumerateParcels, parcelSolutions, parcelSolution, parcelAnswer, checkParcel, parcelSvg, parcelSteps } from '../shared/parcel-evidence.mjs';
import { freshWorkshop, restoreWorkshop, changeData, undoItem } from '../shared/puzzle-workshop.mjs';

test('all 576 bijections yield one complete ledger, not just one guessed target', () => {
  const all = enumerateParcels();
  assert.equal(all.length, 576);
  assert.equal(new Set(all.map(s => s.map(p => p.recipient + '/' + p.content).join(','))).size, 576);
  // Verify directly against the written rules as well as the shared solver.
  const valid = all.filter(s => {
    const o = n => s.find(p => p.recipient === n), c = n => s.find(p => p.content === n);
    return o('Ava').stamps === c('map').stamps + 1 && c('clock').pattern === 'stripes' && ['A','C'].includes(o('Cleo').id) && ['key','clock'].includes(o('Drew').content) && [o('Ava').ribbon === 'blue', c('map').id === 'B', c('compass').recipient === 'Cleo'].filter(v => !v).length === 1;
  });
  assert.deepEqual(parcelSolutions(), valid);
  assert.equal(valid.length, 1);
  assert.deepEqual(valid[0].map(p => [p.id,p.recipient,p.content]), [['A','Ava','compass'],['B','Ben','map'],['C','Cleo','key'],['D','Drew','clock']]);
  assert.deepEqual(parcelAnswer,{selected:'A',wrongRecord:3});
});

test('every verified record is necessary, and verified records alone leave the target undetermined', () => {
  const safe = parcelSolutions({ignoreNotes:true});
  assert.equal(safe.length,13);
  assert.deepEqual([...new Set(safe.map(s=>s.find(p=>p.content==='compass').id))].sort(),['A','B','C','D']);
  assert.deepEqual(verifiedParcelRecords.map((_,i)=>parcelSolutions({omitVerified:i}).length),[17,2,8,4]);
  assert.deepEqual(parcelRecords.map((_,i)=>safe.filter(s=>parcelRecords.every((r,j)=>r.test(s)===(j!==i))).length),[0,0,1]);
});

test('all 12 submitted pairs have one answer and wrong pairs give identical feedback', () => {
  const valid=[], messages=new Set();
  for(const p of parcels) for(const r of parcelRecords){const result=checkParcel({...freshParcel(),selected:p.id,wrongRecord:r.number});if(result.ok)valid.push([p.id,r.number]);else messages.add(result.message);}
  assert.deepEqual(valid,[['A',3]]);assert.equal(messages.size,1);
  assert.equal(checkParcel({...freshParcel(),selected:'A'}).ok,false);
  assert.equal(checkParcel({...freshParcel(),wrongRecord:3}).ok,false);
});

test('upgrading either old parcel edition resets only that puzzle and preserves earlier completion', () => {
  for(const oldData of [{selected:'C',evidence:[0,1,2]}, {edition:2,selected:'C',wrongRecord:2,excluded:[]}]){
    const old=restoreWorkshop(freshWorkshop());old.active='shared-parcel';old.items['signal-shift'].data.answer='DO';old.items['forest-trail'].data.path=['S','A'];
    old.items['shared-parcel']={data:oldData,history:[],hints:3,viewed:true,completion:'solution'};
    const restored=restoreWorkshop(old);
    assert.deepEqual(restored.items['shared-parcel'].data,freshParcel());assert.equal(restored.items['shared-parcel'].completion,null);assert.equal(restored.items['shared-parcel'].legacyParcelCompletion,'solution');assert.equal(restored.items['shared-parcel'].hints,0);assert.equal(restored.items['shared-parcel'].viewed,false);
    for(const id of Object.keys(old.items).filter(id=>id!=='shared-parcel'))assert.deepEqual(restored.items[id],old.items[id],id);
    assert.equal(restoreWorkshop(restored).items['shared-parcel'].legacyParcelCompletion,'solution');
  }
});

test('notes, exclusions, undo and all assistance classifications survive reload without auto-completion', () => {
  const state=freshWorkshop();let item=changeData(state.items['shared-parcel'],'shared-parcel',{...freshParcel(),selected:'A',notes:'Map might be B',excluded:['D']});
  item=changeData(item,'shared-parcel',{...item.data,wrongRecord:3});state.items['shared-parcel']=item;
  const loaded=restoreWorkshop(JSON.parse(JSON.stringify(state))).items['shared-parcel'];assert.equal(loaded.completion,null);assert.equal(loaded.data.notes,'Map might be B');assert.equal(undoItem(loaded).data.wrongRecord,null);
  for(const [viewed,hints,completion] of [[false,0,'independent'],[false,1,'hint'],[true,3,'solution']]){state.items['shared-parcel']={...item,viewed,hints,completion};assert.equal(restoreWorkshop(state).items['shared-parcel'].completion,completion);}
});

test('scratch notes are ungraded, safely bounded and do not reveal or replace answers', () => {
  assert.equal(checkParcel({...freshParcel(),notes:'A / note III'}).ok,false);
  assert.equal(cleanParcel({...freshParcel(),notes:'x'.repeat(2000)}).notes.length,1600);
  assert.equal(cleanParcel({...freshParcel(),selected:'A',excluded:['A']}).selected,'');
  for(const raw of [null,[],{}, {edition:2}, {edition:parcelEdition,selected:'<script>',wrongRecord:'3',excluded:['Q',null]}])assert.equal(checkParcel(raw).ok,false);
});

test('the written seven-step proof agrees with each mapped item and every stamp drawing', () => {
  assert.equal(parcelSteps.length,7);assert.equal(parcelSteps[6].title,'The compass is in A.');
  assert.ok(verifiedParcelRecords.every(r=>r.test(parcelSolution)));assert.deepEqual(parcelRecords.map(r=>r.test(parcelSolution)),[true,true,false]);
  for(const p of parcels){assert.equal((parcelSvg(p.id).match(/stroke-dasharray="3 2"/g)||[]).length,p.stamps);assert.ok(parcelSvg(p.id).includes(p.ribbon.toUpperCase()));}
});
