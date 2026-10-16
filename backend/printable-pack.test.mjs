import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePurchase, validateGeneratedStory } from './domain.mjs';
import { validateBlueprint, generateBlueprint, generateStagedCheckpoint, repairStagedCheckpoint, assembleStagedStory, auditStagedStory } from './staged-story.mjs';
import { buildGamePdf } from './pdf.mjs';
import { reviseStage } from './openai.mjs';
import {controlledMaterialTypes} from './controlled-puzzles.mjs';
import { sampleSpec, sampleStory } from '../content/custom-paper-format-sample.mjs';

test('new custom checkouts request the interactive paper-pack format',()=>{
  const result=validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'A paper lighthouse',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:['sequence','code']}});
  assert.equal(result.spec.gamePackVersion,2);
  assert.equal(result.spec.packLogicVersion,1);
  assert.equal(result.spec.packQualityVersion,13);
  assert.equal(result.spec.packLayoutVersion,4);
});

test('reasoning and discussion packs fix activity types before AI and fit long narrative unlocks',async()=>{
  const mechanics=['reasoning','discussion','reasoning','reasoning','discussion'];
  const spec={...sampleSpec,packLogicVersion:1,gameplay:{primary:'reasoning',secondary:['discussion']},plan:{...sampleSpec.plan,stages:sampleSpec.plan.stages.map((stage,index)=>({...stage,mechanic:mechanics[index]}))}};
  const types=controlledMaterialTypes(spec.plan);
  assert.equal(new Set(types).size,3);
  assert.ok(types.includes('evidence_cards'));assert.ok(types.includes('route_board'));
  assert.ok(types.every((type,index)=>mechanics[index]!=='discussion'||['evidence_cards','decision_record'].includes(type)));
  let calls=0;
  const result=await generateBlueprint(spec,{OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,{body})=>{
    calls++;
    const request=JSON.parse(body),input=JSON.parse(request.input);
    assert.deepEqual(input.paperActivities.map(item=>item.type),types);
    assert.equal(request.text.format.schema.properties.stages.items.properties.material.properties.type,undefined);
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({ending:sampleStory.ending,groupInstructions:'',stages:input.paperActivities.map((activity,index)=>({
      unlock:`Checkpoint ${index+1} opens the next scene. `+'The explorers compare their paper findings. '.repeat(3),
      material:{type:'symbol_key',title:`Clock puzzle ${index+1}`,items:Array.from({length:activity.pieceCount},(_,piece)=>({label:['Morning marker','Noon marker','Evening marker','Night marker'][piece]}))},
    }))})}]}]});
  });
  assert.equal(calls,1,'length fitting and activity allocation cannot require a repair model call');
  assert.deepEqual(result.blueprint.stages.map(stage=>stage.material.type),types);
  assert.ok(result.blueprint.stages.every(stage=>stage.unlock.length<=100));
  const stages=[];
  for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,result.blueprint,number,stages.at(-1),{},()=>{throw Error('Unexpected model call');})).stage);
  const story=assembleStagedStory(spec,result.blueprint,stages);
  assert.match(new TextDecoder().decode(buildGamePdf(story,spec,'player')),/\/Count 12/);
  assert.match(new TextDecoder().decode(buildGamePdf(story,spec,'guide')),/\/Count 7/);
});

test('controlled paper puzzles keep material, choices, answer and both PDFs in one checked contract',async()=>{
  const spec={...sampleSpec,packLogicVersion:1};
  const modelBlueprint={ending:sampleStory.ending,groupInstructions:'',stages:sampleStory.stages.map(stage=>({
    question:stage.clue,evidence:stage.clue,options:stage.options,answerIndex:stage.answerIndex,unlock:stage.unlock,
    material:{...stage.material,items:stage.material.items.slice(0,['order_tiles','symbol_key'].includes(stage.material.type)?4:3)},
  }))};
  let modelCalls=0;
  const fetcher=async(_url,{body})=>{
    modelCalls++;
    assert.equal(JSON.parse(body).text.format.name,'game_blueprint');
    return Response.json({id:'story-fixture',output:[{content:[{type:'output_text',text:JSON.stringify(modelBlueprint)}]}]});
  };
  const env={OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};
  const {blueprint}=await generateBlueprint(spec,env,fetcher);
  const stages=[];
  for(let number=1;number<=5;number++){
    const {stage}=await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),env,fetcher);
    stages.push(stage);
  }
  const story=assembleStagedStory(spec,blueprint,stages);
  await auditStagedStory(story,spec,blueprint,env,fetcher);
  assert.equal(modelCalls,1,'a single model call provides story context; checked puzzle text and QA are deterministic');
  assert.deepEqual(story.stages.map(stage=>stage.answerIndex),[0,2,1,0,2]);
  assert.equal(new Set(story.stages.map(stage=>stage.material.type)).size,5);
  const player=new TextDecoder().decode(buildGamePdf(story,spec,'player'));
  const guide=new TextDecoder().decode(buildGamePdf(story,spec,'guide'));
  assert.match(player,/Rule slip/);assert.match(player,/1-2-3-4/);
  assert.match(guide,/The rules require/);
  assert.doesNotMatch(player,/The rules require/);
  assert.throws(()=>validateGeneratedStory({...story,stages:story.stages.map((stage,index)=>index?stage:{...stage,answerIndex:1})},spec),/checked rules/);
  assert.throws(()=>validateGeneratedStory({...story,stages:story.stages.map((stage,index)=>index?stage:{...stage,material:{...stage.material,items:stage.material.items.map((item,i)=>i?item:{...item,detail:'Answer is B.'})}})},spec),/checked rules/);
  const revised=await reviseStage(story,spec,2,'Simplify the reading in this checkpoint',{},fetcher);
  assert.equal(revised.story.stages[1].logicStyle,'simple');
  assert.equal(revised.story.stages[1].answerIndex,story.stages[1].answerIndex);
  assert.equal(modelCalls,1,'a wording revision cannot spend another model call or change the fixed puzzle');
  await assert.rejects(()=>reviseStage(story,spec,2,'Add a new movement game',{},fetcher),/needs personal support/);
});

test('checked paper materials create separate playable sheets and adult-only answers',()=>{
  const checked=validateGeneratedStory(sampleStory,sampleSpec);
  assert.equal(new Set(checked.stages.map(item=>item.material.type)).size,5);
  const player=new TextDecoder().decode(buildGamePdf(checked,sampleSpec,'player'));
  const guide=new TextDecoder().decode(buildGamePdf(checked,sampleSpec,'guide'));
  assert.match(player,/\/Count 12/);
  assert.match(guide,/\/Count 7/);
  assert.match(player,/Four inspection cards/);
  assert.match(player,/Three harbour routes/);
  assert.match(guide,/Only the beacon lamp has power/);
  assert.doesNotMatch(player,/Only the beacon lamp has power/);
});

test('new blueprint rejects missing or repetitive paper materials',()=>{
  const blueprint={ending:sampleStory.ending,groupInstructions:'',stages:sampleStory.stages.map(stage=>({
    question:`What follows checkpoint ${stage.number}?`,evidence:stage.clue,options:stage.options,answerIndex:stage.answerIndex,unlock:stage.unlock,material:stage.material,
  }))};
  assert.equal(validateBlueprint(blueprint,sampleSpec).stages[0].material.type,'evidence_cards');
  assert.throws(()=>validateBlueprint({...blueprint,stages:blueprint.stages.map(stage=>({...stage,material:blueprint.stages[0].material}))},sampleSpec),/paper material does not support its approved play style|three different paper activities/);
  assert.throws(()=>validateGeneratedStory({...sampleStory,stages:sampleStory.stages.map((stage,index)=>index?stage:{...stage,material:null})},sampleSpec),/paper activity/);
});

test('a longer useful adult explanation fits, and an overlong checkpoint gets a targeted repair',async()=>{
  const expanded='The printed marks identify the only fitting answer. '.repeat(6);
  assert.ok(expanded.length>250 && expanded.length<400);
  const valid=validateGeneratedStory({...sampleStory,stages:sampleStory.stages.map((stage,index)=>index?stage:{...stage,explanation:expanded})},sampleSpec);
  assert.equal(valid.stages[0].explanation,expanded.trim());
  const blueprint={stages:sampleStory.stages.map(stage=>({...stage}))};
  const candidate={clue:sampleStory.stages[1].clue,explanation:'The printed marks identify the only fitting answer. '.repeat(10),hint:sampleStory.stages[1].hint};
  const fetcher=async(_url,{body})=>{
    const input=JSON.parse(JSON.parse(body).input);
    const value=input.candidate?{...candidate,explanation:expanded}:candidate;
    return Response.json({id:'checkpoint-repair',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]});
  };
  const env={OPENAI_API_KEY:'mock-key',OPENAI_MODEL:'mock-model'};
  let invalid;
  try { await generateStagedCheckpoint(sampleSpec,blueprint,2,sampleStory.stages[0],env,fetcher); }
  catch(error) { invalid=error; }
  assert.match(invalid?.message||'',/Answer explanation/);
  assert.equal(invalid.candidate.explanation,candidate.explanation);
  const repaired=await repairStagedCheckpoint(sampleSpec,blueprint,2,sampleStory.stages[0],invalid.candidate,invalid.message,env,fetcher);
  assert.equal(repaired.stage.explanation,expanded.trim());
});

test('quality review preserves its actionable checkpoint reason for recovery',async()=>{
  const review={pass:false,issues:[{stageNumber:5,reason:'The last clue names the selected route before the team compares its cards.'}]};
  const fetcher=async()=>Response.json({id:'audit-rejected',output:[{content:[{type:'output_text',text:JSON.stringify(review)}]}]});
  const env={OPENAI_API_KEY:'mock-key',OPENAI_MODEL:'mock-model'};
  let failure;
  try { await auditStagedStory(sampleStory,sampleSpec,{stages:sampleStory.stages},env,fetcher); }
  catch(error) { failure=error; }
  assert.equal(failure?.stageNumber,5);
  assert.match(failure?.message||'',/last clue names the selected route/);
  assert.deepEqual(failure?.candidate,review);
});

test('the paid blueprint and five independently generated paper checkpoints assemble into printable PDFs',async()=>{
  const calls=[];
  const fetcher=async(_url,{body})=>{
    const payload=JSON.parse(body),input=JSON.parse(payload.input),name=payload.text.format.name;
    calls.push([name,input.stageNumber||0]);
    const value=name==='game_blueprint'
      ? {ending:sampleStory.ending,groupInstructions:'',stages:sampleStory.stages.map(stage=>({
        question:`How do you complete checkpoint ${stage.number}?`,evidence:stage.clue,options:stage.options,
        answerIndex:stage.answerIndex,unlock:stage.unlock,material:stage.material,
      }))}
      : name==='game_checkpoint'
        ? Object.fromEntries(['clue','explanation','hint'].map(key=>[key,sampleStory.stages[input.stageNumber-1][key]]))
        : {pass:true,issues:[]};
    return Response.json({id:`mock-${calls.length}`,usage:{input_tokens:10,output_tokens:20},
      output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]});
  };
  const env={OPENAI_API_KEY:'mock-key',OPENAI_MODEL:'mock-model'};
  const {blueprint}=await generateBlueprint(sampleSpec,env,fetcher);
  const stages=[];
  for(let stageNumber=1;stageNumber<=5;stageNumber++){
    const {stage}=await generateStagedCheckpoint(sampleSpec,blueprint,stageNumber,stages.at(-1),env,fetcher);
    stages.push(stage);
  }
  const story=assembleStagedStory(sampleSpec,blueprint,stages);
  await auditStagedStory(story,sampleSpec,blueprint,env,fetcher);
  assert.equal(story.stages.length,5);
  assert.equal(calls.filter(([name])=>name==='game_checkpoint').length,5);
  for(const paper of ['A4','Letter']){
    const spec={...sampleSpec,paper};
    assert.match(new TextDecoder().decode(buildGamePdf(story,spec,'player')),/\/Count 12/);
    assert.match(new TextDecoder().decode(buildGamePdf(story,spec,'guide')),/\/Count 7/);
  }
});

