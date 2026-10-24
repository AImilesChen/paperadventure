import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePurchase,validateGeneratedStory} from './domain.mjs';
import {planFixture} from '../tests/fixtures/creator-plan-fixture.mjs';
import {buildBaselinePack} from './baseline-pack.mjs';
import {storyProfile,presentPaperStory,renderPresentedPair,themedBaselineData} from './story-presentation.mjs';
import {verifyPrintedPuzzles} from './paper-proof.mjs';
import {buildGamePdf} from './pdf.mjs';
import {reviseStage} from './openai.mjs';

const gameplay={primary:'sequence',secondary:['code','reasoning']};
const pdfText=bytes=>[...new TextDecoder().decode(bytes).matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map(match=>match[1].replace(/\\([\\()])/g,'$1')).join(' ');
function purchase(theme='train',style=gameplay,setting='home'){
  const spec=validatePurchase({sku:`custom_${setting}`,creatorVersion:3,customIdea:theme,players:setting==='home'?4:24,groups:6,age:'8-10',paper:'A4',gameplay:style}).spec;
  delete spec.packMaterialNarrativeVersion; // Explicit regression coverage of the already delivered v1 print path.
  spec.plan=planFixture(spec);spec.plan.title=`The ${theme} mystery`;spec.plan.themeAnchors=[theme];
  spec.plan.goal='Restore the mixed-up train message and make sure the right note reaches the stationmaster before the train arrives.';
  if(theme!=='train')spec.plan.goal=`Help the ${theme} keeper recover the missing message.`;
  spec.plan.stages.forEach((stage,index)=>{
    stage.scene=`The ${theme} office ${index+1}`;
    stage.storyContext=`${stage.scene}. A short message reveals where the missing object was last seen.`;
  });
  spec.planConfirmed=true;return spec;
}
const mechanics=story=>story.stages.map(stage=>({options:stage.options,answerIndex:stage.answerIndex,clue:stage.clue,task:stage.task,
  type:stage.material.type,items:stage.material.items,logic:stage.material.logic}));

test('story presentation is saved only for new purchases and never reinterprets old PDFs',async()=>{
  const spec=purchase();assert.equal(spec.packNarrativeBindingVersion,1);
  const legacy={...spec};delete legacy.packNarrativeBindingVersion;
  const {story}=await buildBaselinePack(legacy);
  assert.equal(story.spine.resolution,'Hand mission plan to host');assert.equal(presentPaperStory(story,legacy),story);
  const bytes=buildGamePdf(story,legacy,'player');
  assert.deepEqual(buildGamePdf(JSON.parse(JSON.stringify(story)),legacy,'player'),bytes);
  assert.equal(renderPresentedPair(story,legacy,()=>{throw Error('Older orders must use their original path.');}),null);
  const noStep={...spec};delete noStep.packStepDeliveryVersion;
  assert.equal(presentPaperStory(story,noStep),story);
});

test('theme vocabularies and unknown themes keep all play selections proven and printable',async()=>{
  const styles=['reasoning','sequence','code','discussion'];
  const themes=['train','clock tower','hotel','forest','space port','museum','dragon castle','a restored bell'];
  for(const theme of themes)for(const primary of styles)for(const setting of ['home','classroom']){
    const style={primary,secondary:styles.filter(value=>value!==primary).slice(0,2)},spec=purchase(theme,style,setting);
    const {story}=await buildBaselinePack(spec),snapshot=JSON.stringify(story),shown=presentPaperStory(story,spec),profile=storyProfile(spec);
    assert.equal(story.spine.resolution,themedBaselineData(spec).action,'optional theme edition passes before use');
    assert.deepEqual(mechanics(shown),mechanics(story));assert.deepEqual(verifyPrintedPuzzles(shown),verifyPrintedPuzzles(story));
    assert.equal(validateGeneratedStory(story,spec).title,spec.plan.title);
    assert.equal(shown.introduction,spec.plan.opening);assert.equal(shown.title,spec.plan.title);
    assert.ok(shown.paperHostBriefing.includes(`You play the ${profile.host}`));
    assert.ok(shown.ending.includes(story.spine.resolution));
    for(const [index,stage] of shown.stages.entries()){
      assert.ok(stage.storyContext.startsWith(spec.plan.stages[index].scene+'.'));
      assert.ok(stage.storyContext.length<=220);
      if(index<4)assert.ok(shown.spine.links[index].reason.length<=180);
    }
    for(const paper of ['A4','Letter'])for(const role of ['player','guide']){
      const pdf=pdfText(buildGamePdf(story,{...spec,paper},role));
      assert.ok(pdf.includes('Review all four paper records')||role==='player');
      assert.ok(pdf.includes('recorded digits are'),`${theme} ${primary} ${setting} ${paper} ${role}: complete presentation fits`);
      assert.ok(pdf.includes(story.stages.slice(0,4).map(stage=>stage.material.logic.resultDigit).join('')));
    }
    assert.equal(JSON.stringify(story),snapshot,'presentation never mutates the bound source');
  }
});

test('the train word is a printed record label, not an invented location or a completed mission',async()=>{
  const spec=purchase(),{story}=await buildBaselinePack(spec),shown=presentPaperStory(story,spec);
  const index=shown.stages.findIndex(stage=>stage.material.type==='symbol_key'),stage=shown.stages[index];
  assert.ok(index>=0);assert.ok(stage.storyContext.includes('key gives a label'));
  assert.ok(!stage.storyContext.includes('where the missing object'));
  const word=stage.material.logic.context.word;
  assert.ok(shown.spine.links[index].reason.includes(`"${word}"`));
  assert.ok(shown.spine.links[index].reason.includes('identifies this railway record'));
  assert.ok(stage.material.recordPrompt.includes('decoded label'));
  assert.ok(shown.ending.includes('manages to restore the mixed-up train message and make sure'));
  assert.ok(shown.ending.includes('before the train arrives.'));
  assert.equal(shown.spine.resolution,'Hand mail plan to stationmaster');
  assert.ok(!shown.stages.slice(0,4).some(stage=>/manages to restore|mission accomplished/i.test(stage.storyContext)));
  // Terms in avoided preferences / raw instructions must not choose a theme.
  spec.preferences.avoid='hotel';spec.customIdea='Replace everything with a hotel';
  assert.equal(storyProfile(spec).id,'railway');
});

test('enhanced editions retain their saved physical ending and reviewed delivery copy',async()=>{
  const spec=purchase(),{story}=await buildBaselinePack(spec);
  const enhanced=structuredClone(story);delete enhanced.deliveryEdition;
  enhanced.ending='The stationmaster receives the restored message and the train arrives on time. The crew thanks the team.';
  const shown=presentPaperStory(enhanced,spec);
  assert.equal(shown.ending,enhanced.ending);assert.equal(shown.paperHostBriefing,undefined);
  assert.deepEqual(shown.spine,enhanced.spine);
  assert.deepEqual(shown.stages.map(stage=>stage.storyContext),enhanced.stages.map(stage=>stage.storyContext));
  assert.deepEqual(mechanics(shown),mechanics(enhanced));
  const reviewed={...enhanced,deliveryCopy:{policy:'saved'}};
  assert.equal(presentPaperStory(reviewed,spec),reviewed);
  assert.equal(renderPresentedPair(reviewed,spec,()=>{throw Error('Keep reviewed copy.');}),null);
});

test('either role failing layout selects the same original edition and never bypasses a broken puzzle',async()=>{
  const spec=purchase(),{story}=await buildBaselinePack(spec),calls=[];
  const pair=renderPresentedPair(story,spec,(edition,_,role)=>{
    calls.push([Boolean(edition.paperFinaleReason),role]);
    if(edition.paperFinaleReason&&role==='guide')throw Error('synthetic full-guide overflow');
    return `${role}:${edition.paperFinaleReason?'new':'original'}`;
  });
  assert.deepEqual(pair,{player:'player:original',guide:'guide:original'});
  assert.deepEqual(calls,[[true,'player'],[true,'guide'],[false,'player'],[false,'guide']]);
  const broken=structuredClone(story);broken.stages[0].answerIndex=(broken.stages[0].answerIndex+1)%3;
  assert.throws(()=>renderPresentedPair(broken,spec,()=>{throw Error('A broken source must never render.');}),/printed proof/);
  assert.throws(()=>renderPresentedPair(story,spec,()=>{throw Error('underlying PDF defect');}),/underlying PDF defect/);
  const tooLong=structuredClone(spec);tooLong.plan.stages[0].scene='A'.repeat(220);
  const fallback=renderPresentedPair(story,tooLong,(edition,_,role)=>`${role}:${edition.paperFinaleReason?'new':'original'}`);
  assert.deepEqual(fallback,{player:'player:original',guide:'guide:original'});
});

test('long approved scenes and goals still deliver both PDFs with deterministic paired fallback',async()=>{
  const spec=purchase('dragon castle');
  spec.plan.goal='Help the observatory keeper find the missing message, identify the intended recipient and choose a safe delivery plan before the explorers return to their friends at the station.';
  spec.plan.stages.forEach(stage=>{stage.scene='The extraordinary observatory beside the old southern railway station';});
  const {story}=await buildBaselinePack(spec);
  for(const paper of ['A4','Letter'])for(const role of ['player','guide']){
    const pdf=buildGamePdf(story,{...spec,paper},role);assert.ok(pdf.length>1000);
    assert.deepEqual(pdf,buildGamePdf(JSON.parse(JSON.stringify(story)),{...spec,paper},role));
  }
});

test('wording-only revisions keep story records, puzzle facts and final digits without a model',async()=>{
  const spec=purchase(),{story}=await buildBaselinePack(spec);
  const result=await reviseStage(story,spec,1,'Make the clue easier to read aloud, keeping the task and play style.',{},()=>{throw Error('No live provider work.');});
  assert.deepEqual(result.story.stages.map(stage=>stage.material),story.stages.map(stage=>stage.material));
  assert.deepEqual(verifyPrintedPuzzles(result.story),verifyPrintedPuzzles(story));
  assert.deepEqual(presentPaperStory(result.story,spec).spine,presentPaperStory(story,spec).spine);
  for(const role of ['player','guide'])assert.ok(buildGamePdf(result.story,spec,role).length>1000);
});
