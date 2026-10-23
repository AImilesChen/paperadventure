import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBaselinePack} from './baseline-pack.mjs';
import {clockSpec} from '../content/paper-contract-qa.mjs';
import {alignPaperPlan,paperPlanMechanics} from '../shared/paper-contract.mjs';
import {validateGeneratedStory} from './domain.mjs';
import {verifyPrintedPuzzles} from './paper-proof.mjs';
import {buildGamePdf} from './pdf.mjs';

test('baseline packs preserve approved themes and mechanics across ages, settings and paper sizes',async()=>{
  for(const theme of ['clock tower','hotel','garden','museum','space port','forest','puppet show','night market','clue room','code guild','team','rule house'])
  for(const primary of ['reasoning','discussion','sequence','code'])for(const setting of ['home','classroom']){
    const mechanics=paperPlanMechanics({primary,secondary:['reasoning']});
    const spec={...clockSpec,setting,gameplay:{primary,secondary:primary==='reasoning'?[]:['reasoning']},players:setting==='home'?4:24,groups:setting==='home'?null:6,
      age:primary==='code'?'10-12':'6-8',packExperienceVersion:3,packQualityVersion:14,packLayoutVersion:4,
      packDeliveryPolicyVersion:2,packResilientDeliveryVersion:1,packStepDeliveryVersion:1,
      plan:alignPaperPlan({...clockSpec.plan,title:`The ${theme} mystery`,themeAnchors:[theme],
        opening:`The ${theme} keeper needs help with a missing message. Work together to help the keeper.`,
        goal:`Help the ${theme} keeper recover the missing message.`,
        stages:clockSpec.plan.stages.map((stage,index)=>({...stage,mechanic:mechanics[index],storyContext:`At the ${theme}, the team studies the keeper's records.`}))})};
    const {story}=await buildBaselinePack(spec);
    assert.equal(story.title,spec.plan.title);
    assert.equal(story.introduction,spec.plan.opening);
    assert.deepEqual(story.stages.map(stage=>stage.storyContext),spec.plan.stages.map(stage=>stage.storyContext));
    assert.deepEqual(story.stages.map(stage=>stage.mechanic),mechanics);
    assert.equal(validateGeneratedStory(story,spec).deliveryEdition,'baseline');
    assert.equal(verifyPrintedPuzzles(story).length,5);
    for(const paper of ['A4','Letter'])for(const role of ['player','guide']){
      const pdf=new TextDecoder().decode(buildGamePdf(story,{...spec,paper},role));
      assert.ok(pdf.startsWith('%PDF-'));
      if(role==='guide')assert.ok(pdf.includes('PAPER MISSION BRIEFING'));
      assert.ok(pdf.includes(spec.plan.goal),`${theme} ${role} keeps the approved goal`);
    }
  }
});

test('the baseline fits long approved story fields without cutting or replacing the goal',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:14,packLayoutVersion:4,packResilientDeliveryVersion:1,packStepDeliveryVersion:1,
    setting:'classroom',players:35,groups:10,paper:'Letter',plan:{...clockSpec.plan,
      title:'The Extraordinary Explorers and the Missing Observatory Message',themeAnchors:['a restored bell'],
      goal:'Help the observatory keeper find the missing message, identify the intended recipient and choose a safe delivery plan before the explorers return to their friends at the station.',
      stages:clockSpec.plan.stages.map(stage=>({...stage,storyContext:'At the observatory, the explorers take turns examining the keeper\'s papers. They keep the mission unfinished while combining the written observations and preparing the next part of their delivery plan.'}))}};
  const {story}=await buildBaselinePack(spec);
  assert.equal(story.introduction,spec.plan.opening);
  assert.equal(verifyPrintedPuzzles(story).length,5);
  for(const paper of ['A4','Letter'])for(const role of ['player','guide'])assert.ok(buildGamePdf(story,{...spec,paper},role).length>1000);
});
