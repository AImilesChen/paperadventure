import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePurchase, validateGeneratedStory } from './domain.mjs';
import { validateBlueprint, generateBlueprint, generateStagedCheckpoint, assembleStagedStory, auditStagedStory } from './staged-story.mjs';
import { buildGamePdf } from './pdf.mjs';
import { sampleSpec, sampleStory } from '../content/custom-paper-format-sample.mjs';

test('new custom checkouts request the interactive paper-pack format',()=>{
  const result=validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'A paper lighthouse',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:['sequence','code']}});
  assert.equal(result.spec.gamePackVersion,2);
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
