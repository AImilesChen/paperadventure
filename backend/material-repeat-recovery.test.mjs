import test from 'node:test';
import assert from 'node:assert/strict';
import {clockSpec} from '../content/paper-contract-qa.mjs';
import {linkedClockContext} from '../content/linked-contract-qa.mjs';
import {generateBlueprintMaterialStep,validateSavedBlueprintMaterialStep} from './staged-story.mjs';
import {invalidStoryOrderAction} from './contextual-puzzles.mjs';

test('repeated order action is isolated to the saved material on retry',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:15,
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
  corrected.material.items[3].label='Secure the puppet';
  let requestInput,requestInstructions;
  const result=await generateBlueprintMaterialStep(spec,frame,2,[earlier],{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'fixture'},async(_url,init)=>{
    const sent=JSON.parse(init.body);
    requestInput=JSON.parse(sent.input);requestInstructions=sent.instructions;
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({replacements:['Trace the lantern path','Secure the puppet']})}]}]});
  },'Checkpoint 2 repeats a printed action from an earlier checkpoint.',previous);
  assert.deepEqual(requestInput.invalidItemNumbers,[1,4]);
  assert.deepEqual(requestInput.previousLabels,previous.material.items.map(item=>item.label));
  assert.match(requestInstructions,/Repair ONLY the listed ordering action labels/);
  assert.match(requestInstructions,/Never begin Compare, Match/);
  assert.equal(result.data.material.items[0].label,'Trace the lantern path');
  assert.equal(result.data.material.items[2].label,previous.material.items[2].label);
  assert.equal(result.data.features[0],previous.features[0]);
  assert.equal(earlier.material.items[0].label,'Inspect the bell tower steps');
});

test('a retry identifies repeated and worksheet-style ordering labels together',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:15,
    plan:{...clockSpec.plan,stages:clockSpec.plan.stages.map((stage,index)=>index<2?{...stage,mechanic:'sequence'}:stage)}};
  const frame={actions:['Install the spare signal gear'],discoveries:[{finding:'The tower path is safe.'},{finding:'The lantern path reaches the repair room.'}]};
  const earlier={material:{items:[{label:'Inspect the bell tower steps'},{label:'Gather the brass gears'},{label:'Prepare the clock shaft'},{label:'Position the spare rope'}]}};
  const previous=structuredClone(linkedClockContext().stages[2]);
  previous.material.items[0].label='Inspect the bell tower steps';
  previous.material.items[1].label='Match the printed tiles';
  previous.material.items[2].label='Thread the copper wire';
  previous.material.items[3].label='Secure the painted puppet';
  const corrected=structuredClone(previous);
  corrected.material.items[0].label='Trace the lantern path';
  corrected.material.items[1].label='Align the copper wire';
  corrected.material.items[3].label='Secure the puppet';
  let requestInput;
  const result=await generateBlueprintMaterialStep(spec,frame,2,[earlier],{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'fixture'},async(_url,init)=>{
    const sent=JSON.parse(init.body),input=JSON.parse(sent.input);
    requestInput=input;
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({replacements:['Trace the lantern path','Align the copper wire','Secure the puppet']})}]}]});
  },'Checkpoint 2 repeats a printed action from an earlier checkpoint.',previous);
  assert.deepEqual(requestInput.invalidItemNumbers,[1,2,4]);
  assert.equal(requestInput.previousLabels[2],'Thread the copper wire');
  assert.equal(result.data.material.items[1].label,'Align the copper wire');
});

test('a bad label-only repair is rejected without replacing the saved valid fields',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:15,
    plan:{...clockSpec.plan,stages:clockSpec.plan.stages.map((stage,index)=>index<2?{...stage,mechanic:'sequence'}:stage)}};
  const frame={actions:['Install the spare signal gear'],discoveries:[{finding:'The tower path is safe.'},{finding:'The lantern path reaches the repair room.'}]};
  const previous=structuredClone(linkedClockContext().stages[2]);
  previous.material.items[1].label='Match the printed tiles';
  await assert.rejects(generateBlueprintMaterialStep(spec,frame,2,[],{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'fixture'},
    async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({replacements:['Sort the printed tiles']})}]}]}),
    'Checkpoint 2 labels must name fictional story pieces or actions, not worksheet instructions.',previous),
  /not worksheet instructions/);
  assert.equal(previous.material.items[1].label,'Match the printed tiles');
});

test('a repeated invalid ordering action falls back to stable story labels on retry instead of exhausting the step budget',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:14,
    plan:{...clockSpec.plan,stages:clockSpec.plan.stages.map((stage,index)=>index<2?{...stage,mechanic:'sequence'}:stage)}};
  const frame={actions:['Install the spare signal gear'],discoveries:[{finding:'The tower path is safe.'},{finding:'The lantern path reaches the repair room.'}]};
  const bad=structuredClone(linkedClockContext().stages[2]);
  bad.material.items=[{label:'Arrange the tiles'},{label:'Sort the tiles'},{label:'Match the tiles'},{label:'Record the tiles'}];
  const result=await generateBlueprintMaterialStep(spec,frame,2,[],{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'fixture'},
    async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(bad)}]}]}),
    'Checkpoint 2 ordering material needs four natural unfinished story actions with concrete objects.');
  const labels=result.data.material.items.map(item=>item.label);
  assert.equal(labels.length,4);
  assert.equal(new Set(labels).size,4);
  for(const label of labels) assert.equal(invalidStoryOrderAction(label,frame.actions[0],spec.plan.goal),false);
});

