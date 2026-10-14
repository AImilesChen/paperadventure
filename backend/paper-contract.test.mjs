import test from 'node:test';
import assert from 'node:assert/strict';
import {clockSpec,clockBlueprintContext} from '../content/paper-contract-qa.mjs';
import {prepareContextualBlueprint} from './contextual-puzzles.mjs';
import {generateBlueprint,repairBlueprint,generateStagedCheckpoint,assembleStagedStory,auditStagedStory} from './staged-story.mjs';
import {validateGeneratedStory} from './domain.mjs';
import {buildGamePdf} from './pdf.mjs';
import {reviseStage} from './openai.mjs';
import {alignPaperPlan,paperContractTypes} from '../shared/paper-contract.mjs';
import {verifyPrintedPuzzles} from './paper-proof.mjs';

async function game(spec=clockSpec){
  const blueprint=(await generateBlueprint(spec,{OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(clockBlueprintContext)}]}]}))).blueprint;
  const stages=[];
  for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{},()=>{throw Error('Unexpected provider request');})).stage);
  return {blueprint,story:assembleStagedStory(spec,blueprint,stages)};
}

test('clock game tasks, materials and adult steps agree, and the final action uses four earlier discoveries',async()=>{
  const {blueprint,story}=await game();
  assert.deepEqual(story.stages.map(stage=>stage.material.type),['evidence_cards','decision_record','order_tiles','route_board','decision_record']);
  assert.deepEqual(story.stages.slice(0,4).map(stage=>stage.material.logic.resultDigit),['3','1','2','3']);
  assert.deepEqual(story.stages[4].material.logic.previousDigits,['3','1','2','3']);
  assert.match(story.stages[4].options[story.stages[4].answerIndex],/Restore noon bell \/ 3123/);
  assert.match(story.stages[2].task,/Arrange the four/);
  assert.match(story.stages[0].clue,/Power present.*Noon mark missing/);
  assert.match(story.stages[0].unlock,/checkpoint 2, Player pages 4-5/);
  for(const paper of ['A4','Letter'])for(const role of ['player','guide']){
    const pdf=new TextDecoder().decode(buildGamePdf(story,{...clockSpec,paper},role));
    assert.match(pdf,new RegExp(`/Count ${role==='player'?12:7}`));
    assert.match(pdf,/Page 1 of/);
    if(role==='guide')assert.match(pdf,/Player pages 6-7/);
    else assert.doesNotMatch(pdf,/The saved result digits, in order, are/);
  }
  let auditCalls=0;
  await auditStagedStory(story,clockSpec,blueprint,{OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async()=>{
    auditCalls++;return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({pass:true,issues:[]})}]}]});
  });
  assert.equal(auditCalls,1,'content coherence needs an independent audit, beyond puzzle arithmetic');
});

test('unified contracts reject changed tasks, incomplete introductions, placeholder pieces and mismatched final records',async()=>{
  const {story}=await game();
  assert.throws(()=>validateGeneratedStory({...story,stages:story.stages.map((stage,i)=>i===2?{...stage,task:'Compare coloured seals.'}:stage)},clockSpec),/contract|action/);
  const brokenSpec={...clockSpec,plan:{...clockSpec.plan,opening:'The keeper left a note that only makes sense'}};
  assert.throws(()=>prepareContextualBlueprint(clockBlueprintContext,brokenSpec),/complete sentence/);
  const placeholder=structuredClone(clockBlueprintContext);placeholder.stages[0].material.items[0].label='Plain fact A';
  assert.throws(()=>prepareContextualBlueprint(placeholder,clockSpec),/placeholder/);
  const modified=structuredClone(story);modified.stages[4].material.logic.previousDigits[0]='1';
  assert.throws(()=>validateGeneratedStory(modified,clockSpec),/contract|earlier result/);
});

test('reading revisions preserve all result digits and the final puzzle',async()=>{
  const {story}=await game();
  const result=await reviseStage(story,clockSpec,3,'Simplify reading in this checkpoint',{},()=>{throw Error('Unexpected provider request');});
  assert.equal(result.story.stages[2].material.logic.resultDigit,story.stages[2].material.logic.resultDigit);
  assert.deepEqual(result.story.stages[4],story.stages[4]);
});

test('provider punctuation and plain label arrays normalize before puzzle checks',async()=>{
  const raw=structuredClone(clockBlueprintContext);
  raw.ending+=' Everyone’s notes match—nothing is missing.';
  raw.stages[0].material.items=['Keeper’s bell','Signal gear','Clock cable'];
  const {blueprint}=await generateBlueprint(clockSpec,{OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async()=>Response.json({output:[{content:[{type:'output_text',text:'```json\n'+JSON.stringify(raw)+'\n```'}]}]}));
  assert.equal(blueprint.stages[0].material.items[0].label,"Keeper's bell");
  assert.match(blueprint.ending,/Everyone's notes match-nothing is missing/);
  assert.doesNotMatch(JSON.stringify(blueprint),/[^\x20-\x7e]/);
});

test('independent solving rejects ambiguous printed facts and ordering constraints',async()=>{
  const {story}=await game();
  assert.equal(verifyPrintedPuzzles(story).length,5);
  const ambiguous=structuredClone(story);
  ambiguous.stages[0].material.items[0].detail='Power present: YES. Noon mark missing: YES. Digit: 1.';
  assert.throws(()=>verifyPrintedPuzzles(ambiguous),/one candidate/);
  const ordering=structuredClone(story),last=ordering.stages[2].material.items[3].label;
  ordering.stages[2].material.items.forEach((item,index)=>{item.detail=index===3?'After every other step.':`Before ${last}.`;});
  assert.throws(()=>verifyPrintedPuzzles(ordering),/one solution/);
});

test('long complete action labels wrap and all adult text stays above the footer',async()=>{
  const raw=structuredClone(clockBlueprintContext);
  raw.stages[2].material.items=['Inspect the north rain collector tank','Reconnect the upper rain collector pipe','Replace the leaking rain collector seal','Test the final rain collector connection'].map(label=>({label}));
  const blueprint=prepareContextualBlueprint(raw,clockSpec),stages=[];
  for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(clockSpec,blueprint,number,stages.at(-1),{},()=>{})).stage);
  const story=assembleStagedStory(clockSpec,blueprint,stages);
  const guide=new TextDecoder().decode(buildGamePdf(story,{...clockSpec,paper:'Letter'},'guide'));
  const textPositions=[...guide.matchAll(/1 0 0 1 [0-9.]+ (-?[0-9.]+) Tm/g)].map(match=>Number(match[1])).filter(y=>y!==30);
  assert.ok(textPositions.every(y=>y>=65));
  assert.match(guide,/collector connection/);
  assert.ok(buildGamePdf(story,{...clockSpec,paper:'Letter'},'player').length>1000);
});

test('a rejected checkpoint context is repaired without regenerating the other four contexts',async()=>{
  const {blueprint}=await game();
  let calls=0;
  const result=await repairBlueprint(clockSpec,blueprint,'Checkpoint 3: steps need clearer story actions',
    {OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(url,request)=>{
      calls++;
      const body=JSON.parse(request.body);
      assert.equal(JSON.parse(body.input).checkpoint.number,3);
      assert.equal(body.text.format.schema.required.includes('stages'),false);
      const context=structuredClone(clockBlueprintContext.stages[2]);
      context.material.items[0].label='Pause noon signal';
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(context)}]}]});
    });
  assert.equal(calls,1);
  for(const index of [0,1,3,4])assert.deepEqual(result.blueprint.stages[index],blueprint.stages[index]);
  assert.match(result.blueprint.stages[2].material.items[0].label,/Pause noon signal/);
  assert.deepEqual(result.blueprint.stages[4].material.logic.previousDigits,blueprint.stages[4].material.logic.previousDigits);
});

test('each main play style produces printable Home and Classroom packs without an impossible repetition gate',async()=>{
  for(const primary of ['reasoning','sequence','code','discussion'])for(const setting of ['home','classroom']){
    const spec={...clockSpec,setting,players:setting==='home'?4:24,groups:setting==='home'?1:6,
      gameplay:{primary,secondary:['reasoning'],request:''},
      plan:alignPaperPlan({...clockSpec.plan,stages:clockSpec.plan.stages.map((stage,index)=>({...stage,mechanic:index<3?primary:'reasoning'}))})};
    const types=paperContractTypes(spec.plan),raw=structuredClone(clockBlueprintContext);
    raw.groupInstructions=setting==='classroom'?'Each crew uses its own printed set. Rotate the four jobs and check the result before continuing.':'';
    raw.stages=types.map((type,index)=>({material:{title:`Clock sheet ${index+1}`,items:(index===4?['Restore noon bell','Paint clock face','Close tower door']:type==='order_tiles'?['Stop noon signal','Align the wheel','Set noon hands','Test the bell']:type==='symbol_key'?['1','2','3','4']:['Clock cable','Meridian wheel','Bell hammer']).map(label=>({label}))},features:[`Condition ${index+1}A`,`Condition ${index+1}B`],word:['BELL','GEAR','NOON','TIME','HOME'][index]}));
    const blueprint=prepareContextualBlueprint(raw,spec),stages=[];
    for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{},()=>{throw Error('Unexpected request');})).stage);
    const story=assembleStagedStory(spec,blueprint,stages);
    assert.equal(verifyPrintedPuzzles(story).length,5);
    for(const paper of ['A4','Letter'])for(const role of ['player','guide'])assert.ok(buildGamePdf(story,{...spec,paper},role).length>1000);
  }
});
