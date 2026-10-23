import test from 'node:test';
import assert from 'node:assert/strict';
import {puzzleVariants,selectPuzzleVariants,witnessTeamwork} from '../shared/puzzle-variants.mjs';
import {paperAction,paperContractTypes} from '../shared/paper-contract.mjs';
import {validatePurchase,validateGeneratedStory} from './domain.mjs';
import {validatePlan} from '../shared/creator-plan.mjs';
import {planFixture} from '../tests/fixtures/creator-plan-fixture.mjs';
import {inspectSavedPlan} from './plan-proposals.mjs';
import {buildContextPuzzle,buildClassicContextPuzzle,validateContextualPuzzle} from './contextual-puzzles.mjs';
import {selectCheckedVariant} from './puzzle-variants.mjs';
import {verifyPrintedPuzzle,verifyPrintedPuzzles} from './paper-proof.mjs';
import {buildBaselinePack} from './baseline-pack.mjs';
import {buildGamePdf} from './pdf.mjs';
import {reviseStage} from './openai.mjs';

const styles=['reasoning','sequence','code','discussion'];
const selections=styles.flatMap(primary=>{
  const others=styles.filter(value=>value!==primary);
  return [[],...others.map(value=>[value]),...others.flatMap(a=>others.filter(b=>b!==a).map(b=>[a,b]))].map(secondary=>({primary,secondary}));
});
function purchase(gameplay,setting='home'){
  const spec=validatePurchase({sku:`custom_${setting}`,creatorVersion:3,customIdea:'The harbour keeper and the missing clockwork message',players:setting==='home'?4:12,groups:3,age:'8-10',paper:'A4',gameplay}).spec;
  spec.plan=planFixture(spec);spec.planConfirmed=true;return spec;
}
function context(type,variant,number=1,seed=7,paper='A4'){
  const action=paperAction(type,number);
  return {labels:type==='symbol_key'?['1','2','3','4']:type==='order_tiles'?['Open keeper journal','Lay out mission letter','Gather keeper notes','Prepare team briefing']:
    type==='route_board'?['Garden path','Courtyard path','Orchard path']:['Keeper journal','Courier letter','Explorer report'],
    features:['Mentions mission plan','Names team briefing'],word:'LAMP',title:'The keeper material',variantVersion:1,variant,seed,
    printProfile:{paper,packExperienceVersion:3,packLayoutVersion:4,title:action.title,task:action.task,teamwork:type==='decision_record'?witnessTeamwork:'Read, compare and record together.',storyContext:'The keeper asks the team to check the papers before the mission continues.'}};
}

test('every finite variant prints one independently proven answer on both page sizes and survives serialization',()=>{
  const seen=new Set();
  for(const [type,variants] of Object.entries(puzzleVariants))for(const variant of variants)
    for(const paper of ['A4','Letter'])for(let number=1;number<=4;number++)for(const seed of [0,1,7,22]){
      const stage=buildContextPuzzle(number,type,context(type,variant,number,seed,paper),[],3,14);
      assert.equal(stage.material.logic.variant.used,variant,`${type} ${variant} ${paper} uses the requested format`);
      seen.add(stage.material.logic.variant.used);
      assert.equal(verifyPrintedPuzzle(stage).resultDigit,stage.material.logic.resultDigit);
      validateContextualPuzzle(JSON.parse(JSON.stringify(stage)));
      if(variant==='code-shapes')assert.ok(stage.material.items.every(item=>/CIRCLE|SQUARE|TRIANGLE|STAR/.test(item.label)));
      if(type==='decision_record'){
        assert.equal(stage.material.items[3].label,'Reader clue 1');assert.equal(stage.material.items[4].label,'Checker clue 2');
        assert.ok(stage.material.instruction.includes('Without cutting'));
        for(const clue of stage.material.items.slice(3)){
          const remaining=variant==='witness-exclusions'?stage.material.items.slice(0,3).filter(item=>!clue.detail.includes(item.label)):
            stage.material.items.slice(0,3).filter(item=>item.detail.includes(clue.detail.match(/^The right choice has (.+): YES\.$/)[1]+': YES.'));
          assert.equal(remaining.length,2,'either role clue alone must leave two candidates');
        }
      }
    }
  assert.equal(seen.size,10);
});

test('variants and result digits stay stable across retries and narrative edits, with different formats for repeated play types',()=>{
  const spec=purchase({primary:'code',secondary:['discussion','sequence']});
  assert.equal(spec.packQualityVersion,14);assert.equal(spec.packDeliveryPolicyVersion,2);
  const plan=validatePlan(spec.plan,spec),types=paperContractTypes(plan);
  assert.deepEqual(plan.puzzleVariants,selectPuzzleVariants(types,plan.puzzleSeed));
  assert.notEqual(plan.puzzleVariants[0],plan.puzzleVariants[2]);
  assert.deepEqual(planFixture({...spec,paper:'Letter'}).puzzleVariants,plan.puzzleVariants,'paper-size changes must not change the game');
  const edited=structuredClone(plan);edited.title='A different title for the same approved setting';
  edited.stages[0].storyBeat='The keeper finds another message beside the harbour gate.';
  assert.deepEqual(inspectSavedPlan(edited,spec).plan.puzzleVariants,plan.puzzleVariants);
  const modified=structuredClone(plan);modified.puzzleVariants[0]='invented-format';
  assert.throws(()=>validatePlan(modified,spec),/saved puzzle variants/);
  const digits=new Set(),positions=new Set();
  for(let seed=0;seed<20;seed++){
    const stage=buildContextPuzzle(1,'symbol_key',context('symbol_key','code-numbers',1,seed),[],3,14);
    digits.add(stage.material.logic.resultDigit);positions.add(stage.answerIndex);
  }
  assert.equal(digits.size,3);assert.equal(positions.size,3);
});

test('independent proof rejects missing role clues, broken registers, changed route rules and corrupt shape keys',()=>{
  const cases=[
    ['decision_record','witness-exclusions',s=>s.material.items.pop()],
    ['decision_record','witness-properties',s=>s.material.items[4].detail=s.material.items[3].detail],
    ['evidence_cards','evidence-crosscheck',s=>s.material.items[3].detail='No matching register entries.'],
    ['route_board','route-conditions',s=>s.material.items[3].detail='Choose a route with YES for both other fact and another fact.'],
    ['symbol_key','code-shapes',s=>s.material.items[0].detail='X'],
  ];
  for(const [type,variant,mutate] of cases){
    const stage=buildContextPuzzle(1,type,context(type,variant),[],3,14);mutate(stage);
    assert.throws(()=>verifyPrintedPuzzle(stage),`${variant} corruption must not be accepted`);
  }
});

test('a variant proof or layout failure selects the already checked same-type mature format',()=>{
  const c=context('symbol_key','code-shapes'),classic=buildClassicContextPuzzle(1,'symbol_key',c,[],3,14);
  for(const reason of ['simulated proof rejection','simulated page overflow']){
    const checked=[];
    const result=selectCheckedVariant(classic,c,(stage,used)=>{
      checked.push(used);verifyPrintedPuzzle(stage);
      if(used!=='classic')throw Error(reason);
      return {...stage,selectedFormat:used};
    });
    assert.deepEqual(checked,['classic','code-shapes']);assert.equal(result.selectedFormat,'classic');
    assert.equal(result.material.type,'symbol_key');assert.equal(verifyPrintedPuzzle(result).resultDigit,classic.material.logic.resultDigit);
  }
});

test('every play selection delivers the same approved variants through a complete proven Home and Classroom baseline',async()=>{
  const used=new Set();
  for(const gameplay of selections)for(const setting of ['home','classroom']){
    const spec=purchase(gameplay,setting),{story}=await buildBaselinePack(spec);
    assert.equal(validateGeneratedStory(story,spec).deliveryEdition,'baseline');assert.equal(verifyPrintedPuzzles(story).length,5);
    assert.deepEqual(story.stages.map(stage=>stage.material.logic.context.variant),spec.plan.puzzleVariants);
    for(const stage of story.stages){used.add(stage.material.logic.variant.used);assert.notEqual(stage.material.logic.variant.used,'classic');}
    for(const paper of ['A4','Letter'])for(const role of ['player','guide']){
      const pdf=buildGamePdf(story,{...spec,paper},role);assert.ok(pdf.length>1000);
      if(role==='guide')assert.ok(new TextDecoder().decode(pdf).includes('Do all four saved digits match this action in order?'),'the finale retains its four-result hint');
    }
  }
  assert.equal(used.size,11,'ten activities plus the fixed finale are exercised');
});

test('legacy allocations keep old puzzles and single-checkpoint wording revisions preserve variant facts and digits',async()=>{
  const spec=purchase({primary:'discussion',secondary:['code','sequence']});
  const {story}=await buildBaselinePack(spec);
  const {story:revised}=await reviseStage(story,spec,1,'Make the clue easier to read aloud, keeping the task and play style.',{},()=>{throw Error('No model call is needed.');});
  assert.deepEqual(revised.stages[0].material,story.stages[0].material);assert.equal(verifyPrintedPuzzles(revised).length,5);
  const legacy={...spec};delete legacy.packPuzzleVariantVersion;legacy.plan=planFixture(legacy);
  const old=await buildBaselinePack(legacy);
  assert.equal(legacy.plan.puzzleVariantVersion,undefined);assert.ok(old.story.stages.every(stage=>!stage.material.logic.variant));
});


test('maximum printed labels and long story moments retain a proved playable format on both page sizes',()=>{
  for(const [type,variants] of Object.entries(puzzleVariants))for(const variant of variants)for(const paper of ['A4','Letter']){
    const c=context(type,variant,2,23,paper);c.title='The missing observatory investigation records';
    c.printProfile.storyContext='At the observatory, the explorers take turns examining the keeper\'s papers. They keep the mission unfinished while combining the written observations and preparing the next part of their delivery plan.';
    if(type==='evidence_cards'||type==='decision_record'){
      c.labels=['Observatory courier inspection report','Observatory keeper inspection journal','Observatory explorer inspection letter'];
      c.features=['Mentions observatory mission plan','Names observatory team briefing'];
    }
    const stage=buildContextPuzzle(2,type,c,[],3,14);
    assert.equal(verifyPrintedPuzzle(stage).resultDigit,stage.material.logic.resultDigit);
    validateContextualPuzzle(stage);
  }
});
