import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {validatePurchase} from './domain.mjs';
import {planFixture} from '../tests/fixtures/creator-plan-fixture.mjs';
import {buildBaselinePack} from './baseline-pack.mjs';
import {buildGamePdf} from './pdf.mjs';
import {buildInteractiveGameView} from './pdf-interactive.mjs';
import {verifyPrintedPuzzles} from './paper-proof.mjs';
import {renderPresentedPair} from './story-presentation.mjs';
import {hasMaterialNarrative,presentMaterialNarrative,renderMaterialNarrativePair} from './material-narrative.mjs';
import {clockSpec} from '../content/paper-contract-qa.mjs';
import {linkedClockContext} from '../content/linked-contract-qa.mjs';
import {prepareBlueprintCandidate,generateStagedCheckpoint,assembleStagedStory} from './staged-story.mjs';
import {clockDeliveryCopy} from '../tests/fixtures/delivery-copy-fixture.mjs';
import {applyDeliveryCopy,verifyDeliveryPuzzles} from './delivery-copy.mjs';

const styles=['sequence','code','reasoning','discussion'];
const pdfText=bytes=>[...new TextDecoder().decode(bytes).matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map(match=>match[1].replace(/\\([\\()])/g,'$1')).join(' ');
function purchase(theme='hotel',primary='sequence',setting='home',paper='A4'){
 const spec=validatePurchase({sku:`custom_${setting}`,creatorVersion:3,customIdea:theme,players:setting==='home'?4:24,groups:6,age:'8-10',paper,gameplay:{primary,secondary:styles.filter(x=>x!==primary).slice(0,2)}}).spec;
 spec.plan=planFixture(spec);spec.plan.title=`The ${theme} mystery`;spec.plan.themeAnchors=[theme];
 spec.plan.goal=`Help the ${theme} keeper recover the missing message.`;
 spec.plan.opening=`The ${theme} keeper needs help with a missing message. Check the printed records and save four result digits before choosing the final action.`;
 spec.plan.roles='Reader, Paper Handler, Checker and Recorder rotate after each checkpoint.';
 spec.plan.stages.forEach((stage,index)=>{stage.scene=`The ${theme} room ${index+1}`;stage.storyContext=`${stage.scene}. A message reveals which corridor reaches the manager's office.`;});
 spec.planConfirmed=true;return spec;
}
const asEnhanced=story=>{const result=structuredClone(story);delete result.deliveryEdition;return result;};
const mechanics=story=>story.stages.map(stage=>({title:stage.title,task:stage.task,clue:stage.clue,hint:stage.hint,options:stage.options,answerIndex:stage.answerIndex,material:stage.material}));
const legacyView=(story,spec)=>{const legacy={...spec};delete legacy.packMaterialNarrativeVersion;return buildInteractiveGameView(story,legacy);};

test('new purchases snapshot optional narration while legacy output stays byte-for-byte unchanged',async()=>{
 const spec=purchase();assert.equal(spec.packMaterialNarrativeVersion,1);assert.equal(hasMaterialNarrative(spec),true);
 const legacy={...spec};delete legacy.packMaterialNarrativeVersion;
 const {story}=await buildBaselinePack(legacy),snapshot=JSON.stringify(story);
 assert.equal(hasMaterialNarrative(legacy),false);assert.equal(hasMaterialNarrative({...spec,packStepDeliveryVersion:undefined}),false);
 for(const role of ['player','guide']){
  const before=buildGamePdf(story,legacy,role),after=buildGamePdf(JSON.parse(snapshot),legacy,role);
  assert.deepEqual(after,before);assert.ok(!pdfText(before).includes('The team decodes a label using the printed key'));
 }
});

test('enhanced and baseline intros and summaries describe the actual puzzle without invented corridor discoveries',async()=>{
 const spec=purchase(),{story}=await buildBaselinePack(spec),topic={topic:'hotel'};
 for(const source of [story,asEnhanced(story)]){
  const snapshot=JSON.stringify(source),shown=presentMaterialNarrative(source,spec,topic);
  assert.deepEqual(mechanics(shown),mechanics(source));assert.deepEqual(verifyPrintedPuzzles(shown),verifyPrintedPuzzles(source));
  assert.equal(shown.title,source.title);assert.equal(shown.introduction,source.introduction);assert.equal(shown.ending,source.ending);
  assert.equal(shown.spine.resolution,source.spine.resolution);assert.equal(JSON.stringify(source),snapshot);
  for(const [index,stage] of shown.stages.entries()){
   assert.ok(stage.storyContext.startsWith(spec.plan.stages[index].scene+'.'));assert.ok(stage.storyContext.length<=220);
   assert.ok(!stage.storyContext.includes('which corridor'));assert.ok(!stage.storyContext.includes("manager's office"));
   if(stage.material.type==='symbol_key'){
    assert.ok(stage.storyContext.includes('decodes a label'));const word=stage.options[stage.answerIndex].replace(/ \/ digit [1-3]$/,'');
    assert.ok(shown.spine.links[index].reason.includes(`"${word}"`));assert.ok(shown.spine.links[index].reason.includes('checked records'));
   }
  }
 }
});

test('the unchanged pair is rendered before any optional narration, with both-role fallback using its exact bytes',async()=>{
 const spec=purchase(),{story}=await buildBaselinePack(spec),source=asEnhanced(story),calls=[];
 const render=(edition,_,role)=>{const improved=edition.stages[0].storyContext!==source.stages[0].storyContext;calls.push([improved,role]);if(improved&&role==='guide')throw Error('optional guide overflow');return new TextEncoder().encode(`${improved?'new':'original'}-${role}`);};
 const pair=renderPresentedPair(source,spec,render,true);
 assert.deepEqual(calls,[[false,'player'],[false,'guide'],[true,'player'],[true,'guide']]);
 assert.equal(new TextDecoder().decode(pair.player),'original-player');assert.equal(new TextDecoder().decode(pair.guide),'original-guide');assert.deepEqual(pair.printedStory,legacyView(source,spec).printedStory);
});

test('narration exceptions, complete-text overflow, protected-content changes and either PDF failure retain the original pair',async()=>{
 const spec=purchase(),{story}=await buildBaselinePack(spec);
 const original={player:new Uint8Array([1,2,3]),guide:new Uint8Array([4,5,6]),printedStory:story},snapshot=JSON.stringify(story);
 const faults=[()=>{throw Error('narration unavailable');},s=>{s.stages[0].material.items[0].label='Changed piece';return s;},s=>{s.stages[1].answerIndex=(s.stages[1].answerIndex+1)%3;return s;},s=>{s.ending='A different outcome.';return s;}];
 for(const improve of faults){let renders=0;assert.equal(renderMaterialNarrativePair(original,spec,()=>{renders++;}, {},improve),original);assert.equal(renders,0);assert.equal(JSON.stringify(story),snapshot);}
 const long=structuredClone(spec);long.plan.stages[0].scene='A'.repeat(250);
 assert.equal(renderMaterialNarrativePair(original,long,()=>{throw Error('must retain existing bytes');}),original);
 for(const failRole of ['player','guide']){
  let renders=0;const pair=renderMaterialNarrativePair(original,spec,(_,__,role)=>{renders++;if(role===failRole)throw Error('simulated layout failure');return new Uint8Array([9]);});
  assert.equal(pair,original);assert.equal(renders,failRole==='player'?1:2);
 }
});

test('optional presentation never hides a broken printed puzzle or failure of the original PDF path',async()=>{
 const spec=purchase(),{story}=await buildBaselinePack(spec),broken=structuredClone(story);broken.stages[0].answerIndex=(broken.stages[0].answerIndex+1)%3;
 assert.throws(()=>renderPresentedPair(broken,spec,()=>new Uint8Array()),/printed proof/);
 assert.throws(()=>renderPresentedPair(story,spec,()=>{throw Error('underlying PDF defect');}),/underlying PDF defect/);
});

test('both PDFs and the comparison share one material-bound print view across themes, styles, settings and paper sizes',async()=>{
 const seen=new Set();
 for(const theme of ['hotel','clock tower','dragon castle'])for(const primary of styles)for(const setting of ['home','classroom']){
  const spec=purchase(theme,primary,setting),{story}=await buildBaselinePack(spec);
  for(const source of [story,asEnhanced(story)])for(const paper of ['A4','Letter']){
   const current={...spec,paper},snapshot=JSON.stringify(source),view=buildInteractiveGameView(source,current);
   assert.deepEqual(mechanics(view.printedStory),mechanics(legacyView(source,current).printedStory));assert.deepEqual(verifyPrintedPuzzles(view.printedStory),verifyPrintedPuzzles(source));
   for(const stage of source.stages)seen.add(stage.material.type);
   for(const role of ['player','guide']){
    assert.deepEqual(view[role],buildGamePdf(source,current,role));const text=pdfText(view[role]);
    for(const stage of view.printedStory.stages)assert.ok(text.includes(stage.storyContext),`${theme} ${primary} ${setting} ${paper} ${role}: actual scene is printed`);
    for(const link of view.printedStory.spine.links)assert.ok(text.includes(link.reason));
    assert.ok(!text.includes('which corridor reaches'));assert.ok(text.includes('The four checked paper records supply the saved digits')||role==='player');
   }
   assert.equal(JSON.stringify(source),snapshot);
   if(theme==='hotel'&&primary==='sequence'&&setting==='home'&&paper==='A4'&&source.deliveryEdition!=='baseline'){
    mkdirSync('tmp/material-narrative-qa',{recursive:true});
    for(const role of ['player','guide'])writeFileSync(`tmp/material-narrative-qa/${role}.pdf`,view[role]);
    writeFileSync('tmp/material-narrative-qa/printed-view.json',JSON.stringify(view.printedStory,null,2));
   }
  }
 }
 assert.deepEqual([...seen].sort(),['decision_record','evidence_cards','order_tiles','route_board','symbol_key']);
});

test('reviewed visible facts keep their exact wording and proofs when the optional display is applied',async()=>{
 const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:4,packLayoutVersion:4,packStepDeliveryVersion:1,packNarrativeBindingVersion:1,packMaterialNarrativeVersion:1};
 const blueprint=prepareBlueprintCandidate(linkedClockContext(),spec),stages=[];
 for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{},()=>{throw Error('No provider work');})).stage);
 const source=assembleStagedStory(spec,blueprint,stages),printed=applyDeliveryCopy(source,clockDeliveryCopy(source)),view=buildInteractiveGameView(printed,spec);
 assert.deepEqual(mechanics(view.printedStory),mechanics(printed));assert.deepEqual(verifyDeliveryPuzzles(view.printedStory),verifyDeliveryPuzzles(printed));
 assert.equal(view.printedStory.ending,printed.ending);assert.ok(view.printedStory.stages.every(stage=>!stage.storyContext.includes('where the spare part is stored')));
});

test('wording suggestions still apply to the selected print view without changing narrative, facts, or stored source',async()=>{
 const spec=purchase(),{story}=await buildBaselinePack(spec),current=buildInteractiveGameView(story,spec),draft=structuredClone(story);
 draft.postDeliveryWording={2:{leadIn:'Read one sentence at a time.',hint:'Check one printed piece at a time.'}};
 const candidate=buildInteractiveGameView(draft,spec);
 assert.equal(candidate.printedStory.stages[1].clue,'Read one sentence at a time. '+current.printedStory.stages[1].clue);
 assert.equal(candidate.printedStory.stages[1].hint,'Check one printed piece at a time.');
 assert.deepEqual(candidate.printedStory.stages.map(stage=>stage.storyContext),current.printedStory.stages.map(stage=>stage.storyContext));
 assert.deepEqual(candidate.printedStory.stages.map(stage=>stage.material),current.printedStory.stages.map(stage=>stage.material));
 assert.deepEqual(verifyPrintedPuzzles(candidate.printedStory),verifyPrintedPuzzles(current.printedStory));
 for(const role of ['player','guide'])assert.deepEqual(candidate[role],buildGamePdf(draft,spec,role));
});
