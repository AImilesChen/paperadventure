import test from 'node:test';
import assert from 'node:assert/strict';
import {clockSpec} from '../content/paper-contract-qa.mjs';
import {linkedClockContext} from '../content/linked-contract-qa.mjs';
import {generateBlueprintMaterialStep,validateSavedBlueprintMaterialStep} from './staged-story.mjs';

test('repeated order action is isolated to the saved material on retry',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:14,
    plan:{...clockSpec.plan,stages:clockSpec.plan.stages.map((stage,index)=>index<2?{...stage,mechanic:'sequence'}:stage)}};
  const frame={actions:['Install the spare signal gear'],discoveries:[{finding:'The tower path is safe.'},{finding:'The lantern path reaches the repair room.'}]};
  const earlier={material:{items:[{label:'Inspect the bell tower steps'},{label:'Gather the brass gears'},{label:'Prepare the clock shaft'},{label:'Position the spare rope'}]}};
  const previous=structuredClone(linkedClockContext().stages[2]);
  previous.material.items[0].label='Inspect the bell tower steps';
  previous.material.items[1].label='Lift the signal lantern';
  previous.material.items[2].label='Thread the copper wire';
  previous.material.items[3].label='Secure the painted puppet';
  assert.throws(()=>validateSavedBlueprintMaterialStep(spec,frame,2,previous,[earlier]),/repeats a printed action/);
  const corrected=structuredClone(previous);
  corrected.material.items[0].label='Trace the lantern path';
  const result=await generateBlueprintMaterialStep(spec,frame,2,[earlier],{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'fixture'},async(_url,init)=>{
    const sent=JSON.parse(init.body);
    const input=JSON.parse(sent.input);
    assert.deepEqual(input.previousMaterial,previous);
    assert.deepEqual(input.repeatedItemNumbers,[1]);
    assert.match(sent.instructions,/Replace only repeatedItemNumbers/);
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(corrected)}]}]});
  },'Checkpoint 2 repeats a printed action from an earlier checkpoint.',previous);
  assert.equal(result.data.material.items[0].label,'Trace the lantern path');
  assert.equal(earlier.material.items[0].label,'Inspect the bell tower steps');
});

