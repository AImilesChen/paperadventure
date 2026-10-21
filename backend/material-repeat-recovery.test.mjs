import test from 'node:test';
import assert from 'node:assert/strict';
import {clockSpec} from '../content/paper-contract-qa.mjs';
import {linkedClockContext} from '../content/linked-contract-qa.mjs';
import {generateBlueprintMaterialStep,recoverSavedWorksheetMaterialStep,validateSavedBlueprintMaterialStep} from './staged-story.mjs';
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

test('a bad model label repair uses the saved material without replacing its valid fields',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:15,
    plan:{...clockSpec.plan,stages:clockSpec.plan.stages.map((stage,index)=>index<2?{...stage,mechanic:'sequence'}:stage)}};
  const frame={actions:['Install the spare signal gear'],discoveries:[{finding:'The tower path is safe.'},{finding:'The lantern path reaches the repair room.'}]};
  const previous=structuredClone(linkedClockContext().stages[2]);
  previous.material.items[1].label='Match the printed tiles';
  const result=await generateBlueprintMaterialStep(spec,frame,2,[],{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'fixture'},
    async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({replacements:['Sort the printed tiles']})}]}]}),
    'Checkpoint 2 labels must name fictional story pieces or actions, not worksheet instructions.',previous);
  assert.equal(result.data.features[0],previous.features[0]);
  assert.equal(result.data.material.items[0].label,previous.material.items[0].label);
  assert.doesNotThrow(()=>validateSavedBlueprintMaterialStep(spec,frame,2,result.data));
  assert.equal(previous.material.items[1].label,'Match the printed tiles');
});

test('a saved route material with worksheet wording can be repaired without a provider call',()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:15};
  const frame={actions:['Install the spare signal gear'],discoveries:[{},{},{},
    {finding:'The upper bridge leads back to the keeper.',consequence:'The wheel can return safely.',supportsAction:'upper bridge'}]};
  const previous=structuredClone(linkedClockContext().stages[3]);
  previous.material.items[0].label='Compare the printed routes';
  const original=structuredClone(previous);
  assert.throws(()=>validateSavedBlueprintMaterialStep(spec,frame,4,previous),/not worksheet instructions/);
  const repaired=recoverSavedWorksheetMaterialStep(spec,frame,4,previous,[],
    'Checkpoint 4 labels must name fictional story pieces or actions, not worksheet instructions.');
  assert.ok(repaired);
  assert.deepEqual(repaired.material.items.slice(1),original.material.items.slice(1),'valid labels stay intact');
  assert.deepEqual(repaired.features,original.features);
  assert.equal(repaired.word,original.word);
  assert.deepEqual(previous,original,'saved failed candidate is not mutated');
  assert.doesNotThrow(()=>validateSavedBlueprintMaterialStep(spec,frame,4,repaired));
  assert.equal(recoverSavedWorksheetMaterialStep(spec,frame,4,previous,[],
    'Checkpoint 4 printed record facts are missing.'),null,'unrelated failures are not silently repaired');
});

test('new route materials repair worksheet wording before another model attempt',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:15};
  const frame={actions:['Install the spare signal gear'],discoveries:[{},{},{},
    {finding:'The upper bridge leads back to the keeper.',consequence:'The wheel can return safely.',supportsAction:'upper bridge'}]};
  const candidate=structuredClone(linkedClockContext().stages[3]);
  candidate.material.items[0].label='Compare the printed routes';
  let calls=0;
  const result=await generateBlueprintMaterialStep(spec,frame,4,[],{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'fixture'},
    async()=>{calls++;return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(candidate)}]}]});});
  assert.equal(calls,1);
  assert.equal(result.data.material.items[1].label,'Side walkway');
  assert.doesNotThrow(()=>validateSavedBlueprintMaterialStep(spec,frame,4,result.data));
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

test('an ordering tile must not place the final object at a conflicting destination',()=>{
  const finalAction='Put Twinkle in booth chest before glow';
  const goal='Find Twinkle the star puppet and bring it back to the puppet booth before the lanterns are lit for the show.';
  // Placing the final object somewhere the final action does not place it
  // invents a second, contradictory destination.
  for(const label of ['Set Twinkle on the shelf','Place Twinkle on the shelf','Position Twinkle by the curtain'])
    assert.equal(invalidStoryOrderAction(label,finalAction,goal),true,label);
  // Natural preparation steps stay valid.
  for(const label of ['Close the puppet chest','Draw the booth curtain','Light the lantern glow'])
    assert.equal(invalidStoryOrderAction(label,finalAction,goal),false,label);
  // Deterministic fallback labels are lowercase and stay valid.
  for(const label of ['Inspect twinkle sequence','Gather twinkle supplies','Position twinkle sequence'])
    assert.equal(invalidStoryOrderAction(label,finalAction,goal),false,label);
});

