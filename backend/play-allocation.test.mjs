import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePurchase,validateGeneratedStory} from './domain.mjs';
import {validatePlan} from '../shared/creator-plan.mjs';
import {paperContractTypes,completePaperPlan} from '../shared/paper-contract.mjs';
import {planFixture} from '../tests/fixtures/creator-plan-fixture.mjs';
import {generateSinglePlan} from './plan-proposals.mjs';
import {buildBaselinePack} from './baseline-pack.mjs';
import {verifyPrintedPuzzles} from './paper-proof.mjs';
import {buildGamePdf} from './pdf.mjs';

const styles=['reasoning','sequence','code','discussion'];
const supported={reasoning:['evidence_cards','order_tiles','route_board','decision_record'],sequence:['order_tiles'],code:['symbol_key'],discussion:['decision_record','evidence_cards']};
const setups=styles.flatMap(primary=>{
  const others=styles.filter(value=>value!==primary);
  return [[],...others.map(value=>[value]),...others.flatMap(a=>others.filter(b=>b!==a).map(b=>[a,b]))].map(secondary=>({primary,secondary}));
});
const purchase=gameplay=>validatePurchase({sku:'custom_classroom',creatorVersion:3,customIdea:'A clock tower with a missing message',players:8,groups:2,age:'8-10',paper:'A4',gameplay}).spec;

test('new play allocation covers every supporting style before the independent finale in all 40 selections',()=>{
  assert.equal(setups.length,40);
  for(const gameplay of setups){
    const spec=purchase(gameplay),plan=validatePlan(planFixture(spec),spec),types=paperContractTypes(plan);
    assert.equal(spec.packQualityVersion,14,'delivery and editorial policies do not change');
    assert.equal(spec.packStepDeliveryVersion,1);
    const playable=plan.stages.slice(0,4);
    assert.equal(playable.filter(stage=>stage.mechanic===gameplay.primary).length,2);
    for(const id of gameplay.secondary)assert.equal(playable.filter(stage=>stage.mechanic===id).length,1);
    assert.equal(plan.stages[4].mechanic,'finale');
    assert.equal(plan.stages[4].title,'Combine the four discoveries');
    assert.ok(new Set(types.slice(0,4)).size>=3);
    assert.ok(types.slice(0,4).every(type=>types.slice(0,4).filter(value=>value===type).length<=2));
    playable.forEach((stage,index)=>assert.ok(supported[stage.mechanic].includes(types[index])));
    assert.deepEqual(planFixture({...spec,gameplay:{...gameplay,secondary:[...gameplay.secondary].reverse()}}),planFixture(spec),'selection order has no effect');
  }
  const sequence=paperContractTypes(planFixture(purchase({primary:'reasoning',secondary:['discussion','sequence']})));
  const code=paperContractTypes(planFixture(purchase({primary:'reasoning',secondary:['discussion','code']})));
  assert.notDeepEqual(sequence,code,'the second supporting choice changes a real printed activity');
  assert.ok(!sequence.includes('symbol_key')&&code.includes('symbol_key'));
});

test('saved legacy plans keep their approved allocation and new plans cannot hide a supporting style in the finale',()=>{
  const spec=purchase({primary:'code',secondary:['discussion','sequence']});
  const legacy={...spec};delete legacy.packPlayAllocationVersion;
  const old=completePaperPlan(planFixture(legacy),legacy.gameplay,legacy.packQualityVersion);
  assert.equal(validatePlan(old,legacy).stages.filter(stage=>stage.mechanic==='code').length,3);
  assert.equal(old.playAllocationVersion,undefined);
  assert.throws(()=>validatePlan(old,spec),/first four checkpoints/);
  const changed=planFixture(spec);changed.stages[3].mechanic='code';changed.stages[4].mechanic='sequence';
  assert.throws(()=>validatePlan(changed,spec),/first four checkpoints/);
});

test('paid narrative generation uses exactly the play activities later approved and printed, without another model request',async()=>{
  for(const gameplay of setups){
    const spec=purchase(gameplay),candidate=planFixture(spec),types=paperContractTypes(candidate);let calls=0;
    const {plan}=await generateSinglePlan(spec,{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'fixture'},async(_url,request)=>{
      calls++;const body=JSON.parse(request.body);
      for(const [index,type] of types.entries())assert.ok(body.instructions.includes(`"number":${index+1},"type":"${type}"`));
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(candidate)}]}]});
    });
    assert.equal(calls,1);
    assert.deepEqual(plan,candidate);
  }
});

test('all selected play allocations retain a proven baseline with matching player and guide PDFs',async()=>{
  for(const gameplay of setups){
    const spec=purchase(gameplay);spec.plan=planFixture(spec);spec.planConfirmed=true;
    const {story}=await buildBaselinePack(spec);
    const types=paperContractTypes(spec.plan);
    assert.equal(validateGeneratedStory(story,spec).deliveryEdition,'baseline');
    assert.deepEqual(story.stages.map(stage=>stage.material.type),types);
    assert.deepEqual(story.stages.map(stage=>stage.mechanic),spec.plan.stages.map(stage=>stage.mechanic));
    assert.equal(verifyPrintedPuzzles(story).length,5);
    for(const paper of ['A4','Letter'])for(const role of ['player','guide'])assert.ok(buildGamePdf(story,{...spec,paper},role).length>1000);
  }
});
