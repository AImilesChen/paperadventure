import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {clockSpec,clockBlueprintContext} from '../content/paper-contract-qa.mjs';
import {linkedClockContext} from '../content/linked-contract-qa.mjs';
import {buildContextPuzzle,normalizeStoryCodeWords,normalizeStoryOrderActions,prepareContextualBlueprint} from './contextual-puzzles.mjs';
import {assembleBlueprintSteps,generateBlueprint,repairBlueprint,repairBlueprintTogether,prepareBlueprintCandidate,validateBlueprint,generateStagedCheckpoint,assembleStagedStory,auditStagedStory,auditCheckpointSemantics,generateBlueprintClosingStep,generateBlueprintMaterialStep,deliverableClosing} from './staged-story.mjs';
import {validateGeneratedStory} from './domain.mjs';
import {buildGamePdf} from './pdf.mjs';
import {reviseStage} from './openai.mjs';
import {alignPaperPlan,paperContractTypes,completePaperPlan} from '../shared/paper-contract.mjs';
import {verifyPrintedPuzzles} from './paper-proof.mjs';
import {compileStorySpine,prepareStoryFrame,validateStorySpine} from './story-spine.mjs';

test('long provider story-frame text is fitted before printable validation',()=>{
  const frame=prepareStoryFrame({
    problem:'A deliberately long unresolved story problem '.repeat(8),
    actions:['Install the calibrated replacement signal gear in the upper clock tower chamber','Install the old display gear','Install the spare winding gear'],
    purposes:['This deliberately long discovery purpose explains a concrete story consequence before the final repair '.repeat(3),'This locates the spare component required for the final repair.','This gives the safe preparation sequence before the repair.','This identifies a usable route for the replacement.'],
  });
  assert.ok(frame.problem.length<=180);
  assert.ok(frame.actions.every(value=>value.length<=40));
  assert.ok(frame.purposes.every(value=>value.length<=100));
  assert.match(frame.actions[0],/chamber$/i);
});

test('story frame keeps complete actions and conceals an opening that gives away the winning action',()=>{
  const frame=prepareStoryFrame({
    problem:'The parcel must reach the friendly market keeper before the clock closes the gate.',
    actions:['Hand the parcel to the friendly market keeper','Leave the parcel at the blue stall','Send the parcel through the side gate'],
    purposes:['This identifies which parcel record belongs to the waiting customer.','This names the safe person who can receive the parcel.','This puts the delivery preparations in a safe order.','This identifies an open route through the busy market.'],
  });
  assert.equal(frame.actions[0],'Hand parcel to market keeper');
  assert.match(frame.problem,/mission is still blocked/i);
  assert.doesNotMatch(frame.problem,/market keeper/i);
  const reopened=prepareStoryFrame({...frame,purposes:[...frame.purposes.slice(0,3),'This confirms the missing parcel was delivered to the shopkeeper.']});
  assert.doesNotMatch(reopened.purposes[3],/delivered/i);
  assert.throws(()=>prepareStoryFrame({...frame,actions:['Final action A','Final action B','Final action C']}),/specific story action/);
});

test('quality version 5 requires completed causal discoveries instead of future investigations',()=>{
  const strong={
    problem:'The tower remains silent while the traveler waits below.',
    actions:['Fit signal gear','Reset tower hands','Replace bell rope'],
    purposes:[
      'The signal gear is missing, so fitting that gear restores the drive path.',
      'The spare gear fits the shaft, which means the signal gear can turn safely.',
      'The checked order aligns the signal gear, so its teeth will not jam.',
      'The upper route reaches the gear room, which allows the team to carry the signal gear safely.',
    ],
  };
  assert.equal(prepareStoryFrame(strong,5).purposes.length,4);
  assert.throws(()=>prepareStoryFrame({...strong,purposes:[...strong.purposes.slice(0,3),'Ask the keeper about the signal gear to reveal what stopped it.']},5),/already learned|later investigation/);
  assert.throws(()=>prepareStoryFrame({...strong,purposes:strong.purposes.map(value=>value.replace(/, (?:so|which means|which allows).*$/i,'.'))},5),/story consequence|explain why/);
});

const structuredClockFrame=()=>({
  problem:'The tower remains silent while the traveler waits below.',
  actions:['Fit signal gear','Reset tower hands','Replace bell rope'],
  discoveries:[
    {finding:'The signal gear is missing.',consequence:'The drive path becomes usable.',supportsAction:'signal gear'},
    {finding:'The spare gear fits the shaft.',consequence:'The gear can turn without binding.',supportsAction:'signal gear'},
    {finding:'The checked order protects the teeth.',consequence:'The parts stay aligned during repair.',supportsAction:'Fit signal gear'},
    {finding:'The upper bridge reaches the gear room.',consequence:'The replacement can reach the tower.',supportsAction:'signal gear'},
  ],
});

test('quality version 6 uses structured causal fields instead of keyword matching',()=>{
  const frame=prepareStoryFrame(structuredClockFrame(),6);
  assert.equal(frame.discoveries.length,4);
  assert.equal(frame.discoveries[0].consequence,'The drive path becomes usable.');
  assert.doesNotMatch(frame.discoveries[0].consequence,/because|so|enables|allows/i);
  const raw=linkedClockContext();
  const spine=compileStorySpine(frame,raw.stages,paperContractTypes(clockSpec.plan),6);
  assert.equal(spine.links[0].supportsAction,'signal gear');
  assert.match(spine.links[0].reason,/supports "Fit signal gear"/i);
  assert.doesNotThrow(()=>validateStorySpine(spine,prepareContextualBlueprint({...raw,storyFrame:frame,spine,celebration:'The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.'},{...clockSpec,packExperienceVersion:3,packQualityVersion:6}).stages,paperContractTypes(clockSpec.plan),clockSpec.plan.goal,6));
  const future=structuredClockFrame();future.discoveries[0].finding='Inspect the tower to reveal the missing gear.';
  assert.throws(()=>prepareStoryFrame(future,6),/already known|later investigation/);
  const unrelated=structuredClockFrame();unrelated.discoveries[0].supportsAction='bell rope';
  assert.throws(()=>prepareStoryFrame(unrelated,6),/intended final action/);
});

test('quality version 9 reopens a premature frame consequence without another provider call',()=>{
  const frame=structuredClockFrame();
  frame.discoveries[2].consequence='The signal gear was repaired and the bell rang.';
  const prepared=prepareStoryFrame(frame,9);
  assert.equal(prepared.discoveries[2].finding,frame.discoveries[2].finding);
  assert.equal(prepared.discoveries[2].consequence,'The safe sequence keeps signal gear ready for the final action.');
  assert.doesNotMatch(prepared.discoveries[2].consequence,/repaired|rang|completed/i);
});

test('quality version 8 blocks a concrete story defect and rejects a generic ending',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:8,packLayoutVersion:4};
  const raw=linkedClockContext();
  raw.storyFrame=structuredClockFrame();
  raw.storyFrame.discoveries[0].consequence='The missing noon mark points to the gear.';
  raw.storyFrame.discoveries[2].consequence='The wheel stays aligned during repair.';
  raw.storyFrame.discoveries[3].consequence='The upper bridge can carry the part.';
  raw.spine=compileStorySpine(raw.storyFrame,raw.stages,paperContractTypes(spec.plan),8);
  raw.celebration='The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.';
  const repeated=structuredClone(raw);
  repeated.stages[0].material.items=['Report A: loose pin','Report B: loose pin','Report C: loose pin'].map(label=>({label}));
  assert.throws(()=>prepareBlueprintCandidate(repeated,spec),/distinct named story pieces/);
  const premature=structuredClone(raw);
  premature.stages[2].material.items[0].label=raw.storyFrame.actions[0];
  assert.throws(()=>prepareBlueprintCandidate(premature,spec),/cannot perform the final action/);
  const nounTile=structuredClone(raw);
  nounTile.stages[2].material.items[1].label='Clapper';
  assert.throws(()=>prepareBlueprintCandidate(nounTile,spec),/ordering pieces must each begin with a complete in-world action/);
  const nounPhrase=structuredClone(raw);
  nounPhrase.stages[2].material.items[1].label='Clapper swing';
  assert.throws(()=>prepareBlueprintCandidate(nounPhrase,spec),/ordering pieces must each begin with a complete in-world action/);
  const earlyParaphrase=structuredClone(raw);
  earlyParaphrase.stages[2].material.items[1].label='Fit the signal gear';
  assert.throws(()=>prepareBlueprintCandidate(earlyParaphrase,spec),/cannot perform the final action/);
  const checkedTile=structuredClone(raw);
  checkedTile.stages[2].material.items[1].label='Check the clapper swing';
  checkedTile.storyFrame.discoveries[2].consequence='The clapper swing is checked before fitting the signal gear.';
  checkedTile.spine=compileStorySpine(checkedTile.storyFrame,checkedTile.stages,paperContractTypes(spec.plan),8);
  assert.equal(prepareBlueprintCandidate(checkedTile,spec).stages[2].material.logic.context.labels[1],'Check the clapper swing');
  const earnedBecause=structuredClone(raw);
  earnedBecause.celebration='Because the fitted gear turns, the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.';
  assert.match(prepareBlueprintCandidate(earnedBecause,spec).celebration,/^Because the fitted gear turns/);
  const genericFeatures=structuredClone(raw);
  genericFeatures.stages[0].features=['Mentions answer','Names result'];
  assert.throws(()=>prepareBlueprintCandidate(genericFeatures,spec),/concrete, distinct printed record facts/);
  const ungrounded=structuredClone(raw);
  ungrounded.storyFrame.discoveries[0].consequence='A distant cart waits beneath the mist.';
  ungrounded.spine=compileStorySpine(ungrounded.storyFrame,ungrounded.stages,paperContractTypes(spec.plan),8);
  assert.throws(()=>prepareBlueprintCandidate(ungrounded,spec),/story link consequence must name a printed piece or fact/);
  const blueprint=prepareBlueprintCandidate(raw,spec),stages=[];
  for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{},()=>{throw Error('Unexpected provider request');})).stage);
  const story=assembleStagedStory(spec,blueprint,stages);
  assert.doesNotMatch(story.ending,/carries out that action/i);
  assert.match(story.ending,/^The four checked results form code /);
  const overlong=structuredClockFrame();
  overlong.actions[0]='Fit the clapper pin through the bell crown loop before noon';
  assert.throws(()=>prepareStoryFrame(overlong,8),/under 40 characters/);
  const env={OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};
  await assert.rejects(()=>auditStagedStory(story,spec,blueprint,env,async(_url,request)=>{
    const input=JSON.parse(JSON.parse(request.body).input);
    assert.equal(input.checkpoints[2].printedPieces.length,4,'the reviewer sees the actual printed steps');
    assert.deepEqual(input.checkpoints.map(checkpoint=>checkpoint.printedPieces.length),stages.map(stage=>stage.material.logic.context.labels.length),'engine-supplied rule cards are excluded from candidate review');
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({pass:false,issues:[{stageNumber:3,reason:'The tower note is a document, not an action.'}]})}]}]});
  }),error=>error.code==='GENERATION_QA_FAILED'&&error.stageNumber===3);
  let reviews=0;
  const overturned=await auditStagedStory(story,spec,blueprint,env,async(_url,request)=>{
    reviews++;
    const name=JSON.parse(request.body).text.format.name;
    assert.equal(name,reviews===1?'staged_story_audit':'staged_story_adjudication');
    const data=reviews===1?{pass:false,issues:[{stageNumber:5,reason:'Fit signal gear is a noun phrase.'}]}:{pass:true,issues:[]};
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(data)}]}]});
  });
  assert.equal(reviews,2);
  assert.equal(overturned.advisories,undefined);
  await assert.rejects(()=>auditStagedStory(story,spec,blueprint,env,async()=>{throw Error('Review unavailable');}),error=>error.code==='GENERATION_UPSTREAM_FAILED');
  await assert.rejects(()=>auditStagedStory(story,spec,blueprint,env,async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({pass:false,issues:[{stageNumber:5,reason:'The ending does not state the observable outcome of the final action.'}]})}]}]})),error=>error.code==='GENERATION_QA_FAILED'&&error.stageNumber===0);
  await assert.rejects(()=>auditStagedStory(story,spec,blueprint,env,async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({pass:false,issues:[{stageNumber:0,reason:'The ending claims success, but the selected final action is only a preparation and cannot finish the goal.'}]})}]}]})),error=>error.code==='GENERATION_QA_FAILED'&&error.stageNumber===5);
  const generic=structuredClone(raw);
  generic.celebration='The mission result is now visible to everyone in the village. Everyone cheers and thanks the team for completing the mission.';
  assert.throws(()=>prepareBlueprintCandidate(generic,spec),/concrete result/);
});

test('quality version 9 completes malformed ordering actions before story grounding',()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:9,packLayoutVersion:4};
  const raw=linkedClockContext(),types=paperContractTypes(spec.plan);
  const orderIndex=types.indexOf('order_tiles');
  raw.stages[orderIndex].material.items=['Clapper','Clockwork note','Compare the code','Fit signal gear'].map(label=>({label}));
  const storyFrame=structuredClockFrame();
  const normalized=normalizeStoryOrderActions(raw.stages,storyFrame,spec);
  const labels=normalized[orderIndex].material.items.map(item=>item.label);
  assert.deepEqual(labels,['Inspect signal gear','Gather signal gear supplies','Prepare signal gear parts','Position signal gear']);
  assert.ok(labels.every(label=>/^(?:Inspect|Gather|Prepare|Position)\s+\S+/i.test(label)));
});

test('quality version 13 rejects fabricated ordering actions before saving that material',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:13,packLayoutVersion:4};
  const raw=linkedClockContext(),frame=structuredClockFrame();
  const orderIndex=paperContractTypes(spec.plan).indexOf('order_tiles');
  const bad=['Inspect through front','Gather through front supplies','Prepare through front parts','Position through front'];
  raw.stages[orderIndex].material.items=bad.map(label=>({label}));
  assert.deepEqual(normalizeStoryOrderActions(raw.stages,frame,spec)[orderIndex].material.items.map(item=>item.label),bad,
    'a bad provider response must not be silently replaced with more invented prose');
  assert.throws(()=>prepareContextualBlueprint({...raw,storyFrame:frame},spec),/ordering pieces must be complete, natural/);
  const env={OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};
  await assert.rejects(()=>generateBlueprintMaterialStep(spec,frame,orderIndex+1,[],env,async()=>
    Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(raw.stages[orderIndex])}]}]})),
  error=>error.code==='BLUEPRINT_INVALID'&&error.stageNumber===orderIndex+1);
});

test('quality version 13 keeps a concrete, causally grounded five-step blueprint',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:13,packLayoutVersion:4};
  const raw=linkedClockContext(),frame=structuredClockFrame();
  const consequences=[
    'The noon mark identifies the gear the keeper must fit.',
    'The spare gear can be collected from safe storage.',
    'Aligning the wheel keeps the gear ready for fitting.',
    'The upper bridge carries the gear to the tower.',
  ];
  const result=await assembleBlueprintSteps(spec,frame,raw.stages,
    'The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.',
    {OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async()=>{
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({consequences})}]}]});
    });
  assert.equal(result.blueprint.stages.length,5);
  assert.match(result.blueprint.spine.links[0].reason,/noon mark/i);
  const themedSpec={...spec,customIdea:'Journey to the West with Sun Wukong and Eastern mythology'};
  const stages=[];
  for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(themedSpec,result.blueprint,number,stages.at(-1),{},()=>{throw Error('No provider call expected');})).stage);
  const story=assembleStagedStory(themedSpec,result.blueprint,stages);
  let reviews=0;
  await assert.rejects(()=>auditStagedStory(story,themedSpec,result.blueprint,
    {OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,request)=>{
      reviews++;
      assert.match(JSON.parse(request.body).input,/Sun Wukong/);
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({pass:false,issues:[{stageNumber:1,reason:'The purchased Journey to the West theme and named character Sun Wukong disappeared from this generic clock story.'}]})}]}]});
    }),error=>error.code==='GENERATION_QA_FAILED'&&error.terminalThemeMismatch===true);
  assert.equal(reviews,2,'theme failure is independently checked before stopping');
});

test('quality version 8 grounds story consequences after the printable pieces exist',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:8,packLayoutVersion:4};
  const raw=linkedClockContext();
  raw.celebration='The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.';
  const materials={celebration:raw.celebration,stages:raw.stages};
  const initial=structuredClockFrame();
  const grounded=[
    'The noon mark identifies the gear the keeper must fit.',
    'The spare gear can be collected from safe storage.',
    'Aligning the wheel keeps the gear ready for fitting.',
    'The upper bridge carries the gear to the tower.',
  ];
  const names=[];
  const env={AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'fixture',DEEPSEEK_MODEL:'deepseek-flash'};
  const result=await generateBlueprint(spec,env,async(_url,request)=>{
    const body=JSON.parse(request.body),name=body.text.format.name;
    names.push(name);
    assert.equal(body.reasoning.effort,name==='story_frame'?'low':'none');
    if(name==='story_frame'){
      assert.match(body.instructions,/last step that directly makes the approved goal true/i);
      assert.ok(body.max_output_tokens>=14000,'reasoning must leave room for a structured answer');
    }
    if(name==='game_blueprint')assert.match(body.instructions,/none may repeat or carry out a final action/i);
    if(name==='grounded_discoveries'){
      const input=JSON.parse(body.input);
      assert.equal(input.printed[0].selectedFinding,'Signal gear report');
      assert.deepEqual(input.printed[0].features,raw.stages[0].features);
      assert.equal(input.fixedFinalAction,'Fit signal gear');
    }
    const data=name==='story_frame'?initial:name==='game_blueprint'?materials:{consequences:grounded};
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(data)}]}]});
  });
  assert.deepEqual(names,['story_frame','game_blueprint','grounded_discoveries']);
  assert.equal(result.blueprint.storyFrame.discoveries[0].consequence,grounded[0]);
  assert.match(result.blueprint.storyFrame.discoveries[0].finding,/signal gear report/i);
  assert.match(result.blueprint.spine.links[0].reason,/noon mark/i);
  assert.match(result.blueprint.storyFrame.discoveries[3].consequence,/open .* gives the team a route/i);
  assert.doesNotMatch(result.blueprint.storyFrame.discoveries[3].consequence,/carries the gear/i);
});

test('quality version 8 re-grounds saved discoveries after repairing one material',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:8,packLayoutVersion:4};
  const raw=linkedClockContext();
  raw.storyFrame=structuredClockFrame();
  raw.storyFrame.discoveries[0].consequence='The noon mark identifies the gear the keeper must fit.';
  raw.storyFrame.discoveries[1].consequence='The spare gear can be collected from safe storage.';
  raw.storyFrame.discoveries[2].consequence='The wheel stays aligned during repair.';
  raw.storyFrame.discoveries[3].consequence='The upper bridge can carry the part.';
  raw.spine=compileStorySpine(raw.storyFrame,raw.stages,paperContractTypes(spec.plan),8);
  raw.celebration='The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.';
  const repairedStage=structuredClone(raw.stages[2]);
  repairedStage.material.items=['Inspect the drive wheel','Align the drive wheel','Secure the gear bracket','Test the wheel motion'].map(label=>({label}));
  const consequences=[
    'The noon mark identifies the gear the keeper must fit.',
    'The spare gear can be collected from safe storage.',
    'The aligned wheel keeps the signal gear ready for fitting.',
    'The upper bridge carries the gear to the tower.',
  ];
  const calls=[];
  const result=await repairBlueprint(spec,raw,'Checkpoint 3 ordering pieces must each begin with a complete in-world action.',
    {OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,request)=>{
      const body=JSON.parse(request.body),name=body.text.format.name,input=JSON.parse(body.input);
      calls.push(name);
      if(name==='checkpoint_material_repair')return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(repairedStage)}]}],usage:{input_tokens:3,output_tokens:5}});
      assert.equal(name,'grounded_discoveries');
      assert.deepEqual(input.printed[2].labels,repairedStage.material.items.map(item=>item.label));
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({consequences})}]}],usage:{input_tokens:7,output_tokens:11}});
    });
  assert.deepEqual(calls,['checkpoint_material_repair','grounded_discoveries']);
  assert.deepEqual(result.usage,{input_tokens:10,output_tokens:16});
  assert.equal(result.blueprint.storyFrame.discoveries[2].consequence,consequences[2]);
  assert.match(result.blueprint.spine.links[2].reason,/aligned wheel/i);
  assert.deepEqual(result.blueprint.stages[0].material.logic.context.labels,raw.stages[0].material.items.map(item=>item.label));
  assert.deepEqual(result.blueprint.stages[1].material.logic.context.labels,raw.stages[1].material.items.map(item=>item.label));
});

test('a closing error that mentions the final action repairs only the closing',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:9,packLayoutVersion:4};
  const raw=linkedClockContext();
  raw.storyFrame=structuredClockFrame();
  raw.storyFrame.discoveries[0].consequence='The noon mark identifies the gear the keeper must fit.';
  raw.storyFrame.discoveries[1].consequence='The spare gear stays available for the final action.';
  raw.storyFrame.discoveries[2].consequence='The aligned wheel keeps the signal gear ready for fitting.';
  raw.storyFrame.discoveries[3].consequence='The open upper bridge gives the team a route for the final action.';
  raw.spine=compileStorySpine(raw.storyFrame,raw.stages,paperContractTypes(spec.plan),9);
  raw.celebration='The mission result is visible. The group celebrates.';
  const celebration='The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.';
  const calls=[];
  const result=await repairBlueprint(spec,raw,'The ending celebration needs two complete sentences: a concrete result of the final action followed by a character response.',
    {OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,request)=>{
      const body=JSON.parse(request.body);
      calls.push(body.text.format.name);
      assert.equal(body.text.format.name,'closing_repair');
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({celebration})}]}],usage:{input_tokens:4,output_tokens:8}});
    });
  assert.deepEqual(calls,['closing_repair']);
  assert.equal(result.blueprint.celebration,celebration);
  assert.deepEqual(result.blueprint.storyFrame.actions,prepareStoryFrame(raw.storyFrame,9).actions);
});

test('a short provider closing is completed without another model retry',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:9};
  const frame=structuredClockFrame();
  let calls=0;
  const result=await generateBlueprintClosingStep(spec,frame,{OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async()=>{
    calls++;
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({celebration:'The bell rings.'})}]}],usage:{input_tokens:4,output_tokens:3}});
  });
  assert.equal(calls,1);
  assert.ok(result.data.celebration.length>=90&&result.data.celebration.length<=240);
  assert.equal(result.data.celebration.match(/[^.!?]+[.!?]+/g)?.length,2);
  assert.match(result.data.celebration,/restore the noon bell/i);
});

test('a closing that ends at a connector is rebuilt with a complete approved goal',()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:10,plan:{...clockSpec.plan,goal:'Restore the clock tower noon chime so the traveler can set out and finish the journey safely.'}};
  const frame=structuredClockFrame();
  const broken='After "Pull the bell rope in the tower", the approved goal succeeds: "Restore the clock tower noon chime so the traveler can set out and". The whole team cheers together.';
  const closing=deliverableClosing(broken,spec,frame);
  assert.doesNotMatch(closing,/\band["']?[.!?](?:\s|$)/i);
  assert.match(closing,/finish the journey safely/i);
  assert.equal(closing.match(/[^.!?]+[.!?]+/g)?.length,2);
  assert.ok(closing.length>=90&&closing.length<=240);
});

test('quality version 8 replaces a generic code word with an approved story word before grounding',()=>{
  const plan=structuredClone(clockSpec.plan);
  plan.goal='Restore the exhibit CASE label before the visitors arrive.';
  plan.stages[0].mechanic='code';
  const spec={...clockSpec,packQualityVersion:8,plan,customIdea:'A museum exhibit CASE has a lost label.'};
  const stages=Array.from({length:5},(_,index)=>({word:index===0?'CODE':'GEAR'}));
  const normalized=normalizeStoryCodeWords(stages,spec);
  assert.equal(normalized[0].word,'CASE');
  assert.equal(stages[0].word,'CODE','the provider candidate is not mutated');
});

test('quality version 6 repairs only a failed discovery before rebuilding materials',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:6,packLayoutVersion:4};
  const frame=structuredClockFrame();
  frame.discoveries[0].supportsAction='bell rope';
  const fixed={finding:'The signal gear is missing.',consequence:'The drive path becomes usable.',supportsAction:'signal gear'};
  const raw=linkedClockContext(),material={celebration:'The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.',stages:raw.stages};
  let calls=0;
  const result=await repairBlueprint(spec,{storyFrame:frame},'Checkpoint 1 discovery must name a concrete part of the intended final action.',
    {OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,request)=>{
      calls++;
      const body=JSON.parse(request.body);
      if(calls===1){
        assert.equal(body.text.format.name,'story_discovery_repair');
        assert.equal(JSON.parse(body.input).checkpoint,1);
        return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(fixed)}]}]});
      }
      assert.equal(body.text.format.name,'game_blueprint');
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(material)}]}]});
    });
  assert.equal(calls,2);
  assert.deepEqual(result.blueprint.storyFrame.discoveries[0],fixed);
  assert.deepEqual(result.blueprint.storyFrame.discoveries.slice(1),prepareStoryFrame({...frame,discoveries:[fixed,...frame.discoveries.slice(1)]},6).discoveries.slice(1));
});

test('quality version 5 requires an earned two-beat ending and fills final-guide spare space',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:5,packLayoutVersion:4};
  const raw=linkedClockContext();
  raw.storyFrame={problem:raw.spine.problem,actions:raw.stages[4].material.items.map(item=>item.label),purposes:[
    'The signal gear is missing, so fitting the signal gear restores the drive path.',
    'The spare gear fits the shaft, which means the signal gear can turn safely.',
    'The checked order aligns the signal gear, so the gear teeth will not jam.',
    'The upper route reaches the gear room, which allows the team to carry the signal gear safely.',
  ]};
  raw.spine={problem:raw.spine.problem,resolution:'Fit signal gear',links:[
    'Signal gear report contains both power and a missing noon mark. The missing signal gear is confirmed, so fitting the signal gear restores the drive path.',
    'Gear chamber note contains both spare gear and safe storage. The spare gear fits the shaft, which means the signal gear can turn safely.',
    'Stop the signal > Align the wheel > Set noon hands > Test the bell is the checked story sequence. The checked order aligns the signal gear, so the gear teeth will not jam.',
    'Upper bridge is the only open story route. The upper route reaches the gear room, which allows the team to carry the signal gear safely.',
  ]};
  raw.celebration='The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.';
  const blueprint=prepareContextualBlueprint(raw,spec),stages=[];
  for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{},()=>{throw Error('Unexpected provider request');})).stage);
  const story=assembleStagedStory(spec,blueprint,stages);
  const guide=new TextDecoder().decode(buildGamePdf(story,spec,'guide'));
  assert.match(guide,/HOST NOTES/);
  const thin=structuredClone(raw);thin.celebration='The gear works. Pip smiles.';
  assert.throws(()=>prepareContextualBlueprint(thin,spec),/two complete beats/);
  await assert.rejects(()=>auditStagedStory(story,spec,blueprint,{OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async()=>
    Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({pass:false,issues:[{stageNumber:3,reason:'The third link promises a later inspection instead of stating its result.'}]})}]}]})),/quality check/);
});

test('quality version 6 builds a second theme on A4 and Letter with the same delivery gates',async()=>{
  const plan=alignPaperPlan({...structuredClone(clockSpec.plan),title:'The Garden Lantern at Dusk',
    opening:'The community garden path is dark, and the evening visitors are waiting. Four checked discoveries will identify the safe way to light the lantern.',
    goal:'Light the garden lantern so visitors can follow the path home.',
    stages:clockSpec.plan.stages.map((stage,index)=>({...stage,storyContext:[
      'At the potting table. Three supply reports describe the lantern parts.',
      'Inside the tool shed. Three storage notes identify the safe socket.',
      'Beside the garden gate. Four preparation steps must be ordered.',
      'Across the garden. Three routes lead toward the lantern post.',
      'At the lantern post. The team combines its four checked discoveries.',
    ][index]}))});
  const spec={...clockSpec,plan,packExperienceVersion:3,packQualityVersion:6,packLayoutVersion:4};
  const raw=linkedClockContext();
  raw.stages[0].material={title:'Lantern supply reports',items:['Copper wire report','Glass shade report','Lantern wick report'].map(label=>({label}))};
  raw.stages[0].features=['Mentions dry wick','Names brass socket'];
  raw.stages[1].material={title:'Garden storage notes',items:['Tool shed note','Gate cabinet note','Potting bench note'].map(label=>({label}))};
  raw.stages[1].features=['Mentions lantern key','Names dry shelf'];
  raw.stages[2].material={title:'Lantern preparation steps',items:['Secure lantern post','Fit the dry wick','Close the glass shade','Turn the lantern key'].map(label=>({label}))};
  raw.stages[3].material={title:'Garden route board',items:['Gate path route','Herb path route','Pond path route'].map(label=>({label}))};
  raw.stages[4].material={title:'Lantern final actions',items:['Light garden lantern','Move lantern to shed','Close the garden gate'].map(label=>({label}))};
  raw.storyFrame={problem:'The garden lantern remains dark while the evening visitors wait.',actions:raw.stages[4].material.items.map(item=>item.label),discoveries:[
    {finding:'The dry wick fits the brass socket.',consequence:'The flame can stay steady.',supportsAction:'garden lantern'},
    {finding:'The lantern key is on a dry shelf.',consequence:'The switch can turn safely.',supportsAction:'lantern'},
    {finding:'The shade closes after the wick is fitted.',consequence:'The flame stays protected.',supportsAction:'Light garden lantern'},
    {finding:'The pond path reaches the lantern post.',consequence:'The key can reach the post.',supportsAction:'lantern'},
  ]};
  raw.spine=compileStorySpine(raw.storyFrame,raw.stages,paperContractTypes(plan),6);
  raw.celebration='The dry wick catches and the garden lantern lights the whole path. The visitors cheer, thank the team, and walk home together.';
  const blueprint=prepareContextualBlueprint(raw,spec),stages=[];
  for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{},()=>{throw Error('Unexpected provider request');})).stage);
  const story=assembleStagedStory(spec,blueprint,stages);
  assert.equal(verifyPrintedPuzzles(story).length,5);
  if(process.env.PAPER_QA_OUTPUT){
    await mkdir(process.env.PAPER_QA_OUTPUT,{recursive:true});
    for(const role of ['player','guide'])await writeFile(`${process.env.PAPER_QA_OUTPUT}/garden-v6-${role}-A4.pdf`,buildGamePdf(story,spec,role));
  }
  for(const paper of ['A4','Letter'])for(const role of ['player','guide']){
    const pdf=new TextDecoder().decode(buildGamePdf(story,{...spec,paper},role));
    assert.match(pdf,/The Garden Lantern at Dusk/);
    assert.match(pdf,/HOST NOTES|Player Pack/);
  }
  const dense={...story,title:'The Garden Lantern and the Missing Path for the Evening Visitors',
    spine:{...story.spine,problem:'The garden path remains dark while several visitors wait by the gate. The lantern has a missing part, and the crew must identify the safe supplies and route before the evening walk can begin.'}};
  const denseSpec={...spec,setting:'classroom',groups:6,paper:'Letter',plan:{...plan,goal:'Light the correct garden lantern so all evening visitors can follow the safe path home before the gate closes.'}};
  assert.match(new TextDecoder().decode(buildGamePdf(dense,denseSpec,'guide')),/Adult guide \/ Preparation/);
});

test('repeated code checkpoints print different messages and remain independently solvable',()=>{
  const words=['SLOT','GATE','MASK'];
  const stages=words.map((word,index)=>buildContextPuzzle(index+1,'symbol_key',{
    labels:['1','2','3','4'],features:['Checked fact','Matching fact'],word,title:`Museum message ${index+1}`,
  },[],3,8));
  const messages=stages.map(stage=>stage.clue.match(/message is ([1-4](?:-[1-4]){3})/i)?.[1]);
  assert.equal(new Set(messages).size,3);
  const evidence=buildContextPuzzle(4,'evidence_cards',{
    labels:['Curator note','Gallery report','Keeper log'],features:['Mentions label sleeve','Names main gallery'],word:'NOTE',title:'Museum records',
  },stages.map(stage=>stage.material.logic.resultDigit),3,8);
  stages.push(evidence);
  stages.push(buildContextPuzzle(5,'decision_record',{
    labels:['Set label on plinth','Tape label to case','Store label in box'],features:['Checked fact','Matching fact'],word:'NOTE',title:'Final actions',
  },stages.map(stage=>stage.material.logic.resultDigit),3,8));
  assert.equal(verifyPrintedPuzzles({stages}).length,5);
});

test('a decoded story word CODE is not confused with an answer-code explanation',()=>{
  const stages=[
    {word:'CODE',material:{items:['1','2','3','4'].map(label=>({label}))}},
    {material:{items:['North route','East route','West route'].map(label=>({label}))}},
    {material:{items:['Inspect sign','Prepare hook','Lift frame','Secure label'].map(label=>({label}))}},
    {material:{items:['Hall route','Desk route','Case route'].map(label=>({label}))}},
    {material:{items:['Hang label beside case','Place label on desk','Store label in folder'].map(label=>({label}))}},
  ];
  const spine=validateStorySpine({problem:'The exhibit label is still missing.',resolution:'Hang label beside case',links:[
    'CODE is the decoded story message and identifies the kind of museum record to inspect.',
    'North route is the only open story route for reaching the display safely.',
    'Inspect sign > Prepare hook > Lift frame > Secure label is the checked story sequence.',
    'Case route is the only open story route and leads to the correct display area.',
  ]},stages,['symbol_key','route_board','order_tiles','route_board','decision_record'],'Restore the missing exhibit label.');
  assert.match(spine.links[0].reason,/CODE/);
});

test('quality 14 refuses a generic story ending instead of publishing fallback copy',()=>{
  const spec={...clockSpec,packQualityVersion:14};
  assert.throws(()=>deliverableClosing('',spec,{actions:['Align signal gear']}),/specific two-sentence outcome/);
  assert.equal(deliverableClosing('The keeper aligns the signal gear, so the noon bell rings again and Pip can continue home. The people at the tower welcome Pip back and thank the children for restoring their signal.',spec,{actions:['Align signal gear']}).includes('noon bell'),true);
});

test('symbol-key rows are compiled by the engine and do not depend on model labels',()=>{
  const plan=alignPaperPlan({...structuredClone(clockSpec.plan),stages:clockSpec.plan.stages.map((stage,index)=>({...stage,mechanic:index<3?'code':'reasoning'}))});
  const spec={...clockSpec,plan,packExperienceVersion:3,packQualityVersion:3};
  const raw=linkedClockContext();
  raw.storyFrame={problem:raw.spine.problem,actions:raw.stages[4].material.items.map(item=>item.label),purposes:[
    'This identifies a message needed before choosing the final action.',
    'This locates another message needed before choosing the final action.',
    'This establishes a safe preparation before the team attempts the final action.',
    'This identifies a useful record for carrying out the final action.',
  ]};
  for(let index=0;index<3;index++)raw.stages[index].material.items=[{label:'Repeated row'},{label:'Repeated row'}];
  const blueprint=prepareContextualBlueprint(raw,spec);
  for(let index=0;index<3;index++)assert.deepEqual(blueprint.stages[index].material.logic.context.labels,['1','2','3','4']);
});

test('linked blueprint replaces worksheet commands and early outcomes with playable in-world pieces',()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:3};
  const raw=linkedClockContext();
  raw.storyFrame={problem:raw.spine.problem,actions:raw.stages[4].material.items.map(item=>item.label),purposes:[
    'This identifies the missing signal component needed for the final repair.',
    'This locates the spare component required to carry out the final repair.',
    'This gives the safe preparation sequence before the repair is attempted.',
    'This identifies a usable route for bringing the replacement into the tower.',
  ]};
  raw.stages[2].material.items=['Read printed rule','Record answer digit','Compare the tiles','Bell repaired'].map(label=>({label}));
  raw.stages[3].material.items=['Check printed route','Bell rang route','Record final digit'].map(label=>({label}));
  raw.spine={...raw.spine,links:raw.spine.links};
  const blueprint=prepareContextualBlueprint(raw,spec);
  const orderLabels=blueprint.stages[2].material.logic.context.labels;
  const routeLabels=blueprint.stages[3].material.logic.context.labels;
  assert.equal(new Set(orderLabels).size,4);
  assert.ok(orderLabels.every(label=>/^(?:Inspect|Gather|Prepare|Position)\b/.test(label)));
  assert.ok(routeLabels.every(label=>/ route$/i.test(label)));
  assert.ok([...orderLabels,...routeLabels].every(label=>!/(?:printed|digit|repaired|rang)/i.test(label)));
});

test('linked story requires four printed findings and explains them in the adult guide',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:3};
  const raw=linkedClockContext();
  const frame={problem:raw.spine.problem,actions:raw.stages[4].material.items.map(item=>item.label),purposes:[
    'This identifies the missing signal component needed for the final repair.',
    'This locates the spare component required to carry out the final repair.',
    'This gives the safe preparation sequence before the repair is attempted.',
    'This identifies a usable route for bringing the replacement into the tower.',
  ]};
  let providerCalls=0;
  const {blueprint}=await generateBlueprint(spec,{OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,request)=>{
    const body=JSON.parse(request.body);
    providerCalls+=1;
    if(body.text.format.name==='story_frame'){
      assert.ok(body.text.format.schema.required.includes('actions'));
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(frame)}]}]});
    }
    assert.equal(body.text.format.name,'game_blueprint');
    assert.ok(!body.text.format.schema.required.includes('spine'));
    const materials=structuredClone(raw);delete materials.spine;
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(materials)}]}]});
  });
  assert.equal(providerCalls,2);
  assert.deepEqual(blueprint.storyFrame.actions,frame.actions);
  const stages=[];
  for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{},()=>{throw Error('Unexpected provider request');})).stage);
  const story=assembleStagedStory(spec,blueprint,stages);
  assert.equal(story.spine.links.length,4);
  for(const link of story.spine.links){
    assert.match(link.reason,/[.!?]$/,'every story link must end as a complete sentence');
    assert.doesNotMatch(link.reason,/\b(?:a|an|the|to|of|for|from|with|into|onto|at|by|as|and|or|but|because|so|than|that|which|who|whose|when|where|while|through|before|after|under|over|its|their|this|these|those)[.!?]$/i,'a story link cannot end on a dangling connector');
  }
  assert.equal(verifyPrintedPuzzles(story).length,5);
  if(process.env.PAPER_QA_OUTPUT){
    await mkdir(process.env.PAPER_QA_OUTPUT,{recursive:true});
    for(const role of ['player','guide'])await writeFile(`${process.env.PAPER_QA_OUTPUT}/clock-${role}-A4.pdf`,buildGamePdf(story,spec,role));
  }
  for(const paper of ['A4','Letter']){
    const guide=new TextDecoder().decode(buildGamePdf(story,{...spec,paper},'guide'));
    assert.match(guide,/WHY THIS FINDING MATTERS/);
    assert.match(guide,/CONNECT THE FOUR DISCOVERIES/);
    assert.match(guide,/Gear chamber note/);
    assert.match(guide,/WHY THIS ACTION/);
    const continuation=guide.split('endstream').filter(stream=>/STORY AND NEXT PAGE/.test(stream)).at(-1);
    assert.match(continuation,/CONNECT THE FOUR DISCOVERIES/,'a short final instruction must not sit alone on a sparse continuation page');
    assert.ok((continuation.match(/\) Tj ET/g)||[]).length>=18,'the final guide continuation must contain enough host guidance to justify a page');
  }
  await auditStagedStory(story,spec,blueprint,{OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,request)=>{
    const input=JSON.parse(JSON.parse(request.body).input);
    assert.equal(input.spine.links.length,4);
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({pass:true,issues:[]})}]}]});
  });
  const editorial=await auditStagedStory(story,spec,blueprint,{OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async()=>
    Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({pass:false,issues:[{stageNumber:5,reason:'The final action may feel too easy to guess.'}]})}]}]}));
  assert.equal(editorial.advisories.length,1);
  for(const [mutate,message] of [
    [value=>{delete value.spine;},/game needs one problem/],
    [value=>{value.stages[4].material.items[0].label='Restore noon bell';value.spine.resolution='Restore noon bell';},/specific repair or action/],
    [value=>{value.spine.links[0]='A useful number leads to the answer code.';},/fictional reason beyond the answer code/],
  ]){
    const invalid=linkedClockContext();mutate(invalid);
    assert.throws(()=>prepareContextualBlueprint(invalid,spec),message);
  }
  const verbose=linkedClockContext();
  verbose.spine.links[1]+=' The same clue is repeated in several extra sentences that add no new play rule or fictional finding.'.repeat(3);
  assert.ok(prepareContextualBlueprint(verbose,spec).spine.links[1].reason.length<=180);
  const mismatched=linkedClockContext();
  mismatched.spine.resolution='Reset tower hands';
  mismatched.spine.links[1]='The keeper can inspect the component before making a final repair.';
  const normalized=prepareContextualBlueprint(mismatched,spec);
  assert.equal(normalized.spine.resolution,normalized.stages[4].material.logic.context.labels[0]);
  assert.match(normalized.spine.links[1].reason,/Gear chamber note/);
  for(const feature of normalized.stages[1].material.logic.context.features)
    assert.ok(normalized.spine.links[1].reason.toLowerCase().includes(feature.replace(/^(?:Mentions|Names)\s+/i,'').toLowerCase()));
});

test('provider JSON split across output text blocks is read as one checked blueprint',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:3};
  const source=linkedClockContext();
  const frame={problem:source.spine.problem,actions:source.stages[4].material.items.map(item=>item.label),purposes:[
    'This identifies the missing signal component needed for the final repair.',
    'This locates the spare component required to carry out the final repair.',
    'This gives the safe preparation sequence before the repair is attempted.',
    'This identifies a usable route for bringing the replacement into the tower.',
  ]};
  const materials=structuredClone(source);delete materials.spine;
  const raw=JSON.stringify(materials),pivot=Math.floor(raw.length/2);
  const result=await generateBlueprint(spec,{OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,request)=>{
    const body=JSON.parse(request.body);
    if(body.text.format.name==='story_frame')return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(frame)}]}]});
    return Response.json({output:[{content:[
      {type:'output_text',text:raw.slice(0,pivot)},
      {type:'output_text',text:raw.slice(pivot)},
    ]}]});
  });
  assert.equal(result.blueprint.spine.links.length,4);
});

test('new linked repair changes only one material and recompiles its story link in code',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:3};
  const raw=linkedClockContext();
  const frame={problem:raw.spine.problem,actions:raw.stages[4].material.items.map(item=>item.label),purposes:[
    'This identifies the missing signal component needed for the final repair.',
    'This locates the spare component required to carry out the final repair.',
    'This gives the safe preparation sequence before the repair is attempted.',
    'This identifies a usable route for bringing the replacement into the tower.',
  ]};
  const materials=structuredClone(raw);delete materials.spine;
  const generated=await generateBlueprint(spec,{OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,request)=>{
    const body=JSON.parse(request.body);
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(body.text.format.name==='story_frame'?frame:materials)}]}]});
  });
  const repairedStage=structuredClone(materials.stages[0]);
  repairedStage.material.items=[{label:'Dial cabinet report'},{label:'Bell chamber report'},{label:'Keeper desk report'}];
  repairedStage.features=['Mentions signal gear','Names noon marker'];
  let calls=0;
  const repaired=await repairBlueprint(spec,generated.blueprint,'Checkpoint 1: replace the unclear written records.',{OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,request)=>{
    const body=JSON.parse(request.body);calls+=1;
    assert.equal(body.text.format.name,'checkpoint_material_repair');
    assert.ok(!Object.hasOwn(body.text.format.schema.properties,'link'));
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(repairedStage)}]}]});
  });
  assert.equal(calls,1);
  assert.deepEqual(repaired.blueprint.storyFrame,generated.blueprint.storyFrame);
  assert.deepEqual(repaired.blueprint.stages[1],generated.blueprint.stages[1]);
  assert.match(repaired.blueprint.spine.links[0].reason,/Keeper desk report/);
  assert.match(repaired.blueprint.spine.links[0].reason,/signal gear/);
});

test('linked repair changes one checkpoint and its reason without discarding the others',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:3};
  const raw=linkedClockContext();
  raw.stages[0].features=['Clock face shiny','Names missing noon mark'];
  const corrected=linkedClockContext();
  const result=await repairBlueprint(spec,raw,'Checkpoint 1: a physical property cannot describe all written records.',{OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,request)=>{
    const body=JSON.parse(request.body);
    assert.equal(body.text.format.name,'linked_story_repair');
    assert.deepEqual(Object.keys(body.text.format.schema.properties).sort(),['link','stage']);
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({stage:corrected.stages[0],link:corrected.spine.links[0]})}]}]});
  });
  assert.deepEqual(result.blueprint.stages[1].material.logic.context.labels,raw.stages[1].material.items.map(item=>item.label));
  assert.equal(result.blueprint.spine.links[0].reason,corrected.spine.links[0]);
});

test('linked repair can fill a missing spine while keeping every printed activity fixed',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:3};
  const raw=linkedClockContext(),spine=raw.spine;
  delete raw.spine;
  const result=await repairBlueprint(spec,raw,'The game needs one problem, one final action and four linked findings.',
    {OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,request)=>{
      const body=JSON.parse(request.body);
      assert.equal(body.text.format.name,'missing_story_spine');
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(spine)}]}]});
    });
  assert.equal(result.blueprint.spine.resolution,'Fit signal gear');
  assert.deepEqual(result.blueprint.stages[0].material.logic.context.labels,raw.stages[0].material.items.map(item=>item.label));
  const invalid=structuredClone(result.blueprint);delete invalid.spine;
  assert.throws(()=>validateBlueprint(invalid,spec),/four linked findings/);
});

test('linked story also produces complete classroom garden packs on both paper sizes',async()=>{
  const plan=structuredClone(clockSpec.plan);
  plan.title='The Rooftop Rain Collector';
  plan.opening='The rooftop garden is dry because the rain collector has stopped. The crew needs four findings before choosing the repair.';
  plan.goal='Restore the rain collector so the rooftop garden can receive water again.';
  [
    'The water collector has stopped. Compare the written component reports to identify the part that needs attention.',
    'Two gardeners wrote notes about the spare valve and where it can be found safely.',
    'The crew has four repair steps. Their printed rules determine the safe order.',
    'Use the paper routes to choose a way to bring the valve to the collector.',
    'The crew checks all four results before deciding on its final repair action.',
  ].forEach((scene,index)=>{plan.stages[index].storyContext=scene;});
  const spec={...clockSpec,setting:'classroom',players:24,groups:6,packExperienceVersion:3,packQualityVersion:3,plan};
  const raw=linkedClockContext();
  raw.stages[0].material.items=['Roof pipe report','Water tank report','Collector valve report'].map(label=>({label}));
  raw.stages[0].features=['Mentions water supply','Names stuck valve'];
  raw.stages[1].material.items=['Roof shed note','Garden gate note','Tool bench note'].map(label=>({label}));
  raw.stages[1].features=['Mentions spare valve','Names safe storage'];
  raw.stages[2].material.items=['Shut the flow','Fit the valve','Check the seal','Test the collector'].map(label=>({label}));
  raw.stages[3].material.items=['North stairs','Glass passage','Service walkway'].map(label=>({label}));
  raw.stages[4].material.items=['Fit spare valve','Replace rooftop pipe','Refill the water tank'].map(label=>({label}));
  raw.spine={problem:'The collector is stopped and the rooftop garden is dry until a repair is completed.',
    resolution:'Fit spare valve',links:[
      'Collector valve report names the stuck valve while the water supply is present, pointing to the part needed for the repair.',
      'Roof shed note names safe storage for a spare valve, so the crew knows where to find that replacement.',
      'Shut the flow > Fit the valve > Check the seal > Test the collector gives the crew the repair order.',
      'Service walkway has the open paper route, so the crew can bring the replacement valve to the collector.',
    ]};
  raw.celebration='The garden crew cheers when water reaches the plants again.';
  const blueprint=prepareBlueprintCandidate(raw,spec),stages=[];
  for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{},()=>{throw Error('Unexpected provider request');})).stage);
  const story=assembleStagedStory(spec,blueprint,stages);
  assert.equal(verifyPrintedPuzzles(story).length,5);
  if(process.env.PAPER_QA_OUTPUT){
    await mkdir(process.env.PAPER_QA_OUTPUT,{recursive:true});
    for(const role of ['player','guide'])await writeFile(`${process.env.PAPER_QA_OUTPUT}/garden-${role}-A4.pdf`,buildGamePdf(story,spec,role));
  }
  for(const paper of ['A4','Letter'])for(const role of ['player','guide']){
    const pdf=new TextDecoder().decode(buildGamePdf(story,{...spec,paper},role));
    assert.match(pdf,/Page 1 of/);
    if(role==='guide')assert.match(pdf,/Service walkway/);
  }
});

test('unused route fields cannot reject an otherwise printable linked game',()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:3};
  const raw=linkedClockContext();
  const routeIndex=paperContractTypes(spec.plan).findIndex(type=>type==='route_board');
  assert.ok(routeIndex>=0);
  raw.stages[routeIndex].features=['An arbitrarily long model field that is not printed on the route board','Another unused route detail that cannot change the puzzle'];
  raw.stages[routeIndex].word='NOT-A-KEY';
  const blueprint=prepareContextualBlueprint(raw,spec);
  assert.deepEqual(blueprint.stages[routeIndex].material.logic.context.features,['Checked fact','Matching fact']);
  assert.equal(blueprint.stages[routeIndex].material.logic.context.word,'NOTE');
});

test('a long model key becomes a four-letter printed word without losing its story link',()=>{
  const plan=alignPaperPlan({...clockSpec.plan,stages:clockSpec.plan.stages.map((stage,index)=>({...stage,mechanic:index===1?'code':stage.mechanic}))});
  const spec={...clockSpec,plan,packExperienceVersion:3,packQualityVersion:3};
  const raw=linkedClockContext();
  const codeIndex=paperContractTypes(spec.plan).findIndex(type=>type==='symbol_key');
  assert.ok(codeIndex>=0);
  raw.stages[codeIndex].material.items=['1','2','3','4'].map(label=>({label}));
  raw.stages[codeIndex].word='CLOCK';
  raw.spine.links[codeIndex]='The CLOCK message helps the crew compare the tower records before choosing the repair.';
  const blueprint=prepareContextualBlueprint(raw,spec);
  assert.equal(blueprint.stages[codeIndex].material.logic.context.word,'LOCK');
  assert.match(blueprint.spine.links[codeIndex].reason,/LOCK message/);
});

test('linked records print comparable report labels and content facts',()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:3};
  const raw=linkedClockContext();
  const recordIndex=paperContractTypes(spec.plan).findIndex(type=>type==='evidence_cards');
  raw.stages[recordIndex].material.items=['Keeper tower','Bell chamber','Signal cabinet'].map(label=>({label}));
  raw.stages[recordIndex].material.items[0].label='Read Keeper tower';
  raw.stages[recordIndex].features=['Silent bell','Worn gear'];
  raw.spine.links[recordIndex]='The chosen record identifies the damaged component that the crew needs to repair.';
  const blueprint=prepareContextualBlueprint(raw,spec);
  const context=blueprint.stages[recordIndex].material.logic.context;
  assert.ok(context.labels.every(label=>label.endsWith(' report')));
  assert.deepEqual(context.features,['Mentions Silent bell','Mentions Worn gear']);
  assert.ok(blueprint.spine.links[recordIndex].reason.includes(context.labels[(recordIndex+2)%3]));
  assert.ok(blueprint.spine.links[recordIndex].reason.includes('Silent bell'));
});

test('record feature fitting keeps a complete phrase instead of a dangling connector',()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:3};
  const raw=linkedClockContext();
  const recordIndex=paperContractTypes(spec.plan).findIndex(type=>['evidence_cards','decision_record'].includes(type));
  raw.stages[recordIndex].features=['Mentions brass hammer','Names a cracked peg by its owner'];
  const blueprint=prepareContextualBlueprint(raw,spec);
  assert.deepEqual(blueprint.stages[recordIndex].material.logic.context.features,['Mentions brass hammer','Names cracked peg owner']);
  raw.stages[recordIndex].features=['Mentions storing gear in a dry sack','Names the gear as Signal'];
  const meaningful=prepareContextualBlueprint(raw,spec).stages[recordIndex].material.logic.context.features;
  assert.deepEqual(meaningful,['Mentions storing gear dry sack','Names gear Signal']);
});

test('quality version 8 uses one full-game review instead of four paid checkpoint reviews',async()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:8};
  const result=await auditCheckpointSemantics({number:1},spec,{},()=>{throw Error('No checkpoint review should be purchased.');});
  assert.equal(result.usage,null);
});

test('answer-state record features are replaced from the fixed story frame',()=>{
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:3};
  const raw=linkedClockContext();
  raw.storyFrame={problem:raw.spine.problem,actions:raw.stages[4].material.items.map(item=>item.label),purposes:[
    'This identifies the missing signal gear needed for the final repair.',
    'This locates the spare component required to carry out the final repair.',
    'This gives the safe preparation sequence before the repair is attempted.',
    'This identifies a usable route for bringing the replacement into the tower.',
  ]};
  const recordIndex=paperContractTypes(spec.plan).findIndex(type=>['evidence_cards','decision_record'].includes(type));
  raw.stages[recordIndex].features=['Mentions correct answer','Names matching choice'];
  const blueprint=prepareContextualBlueprint(raw,spec);
  const features=blueprint.stages[recordIndex].material.logic.context.features;
  assert.ok(features.every(value=>/^(?:Mentions|Names) /.test(value)));
  assert.ok(features.every(value=>!/(?:correct|answer|match|choice)/i.test(value)));
});

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

test('quality version 3 varies answer positions while preserving earlier checked contracts',async()=>{
  const old=(await game({...clockSpec,packExperienceVersion:2})).story;
  const current=(await game({...clockSpec,packExperienceVersion:2,packQualityVersion:3})).story;
  assert.deepEqual(old.stages.map(stage=>stage.answerIndex),[1,1,1,1,1]);
  assert.deepEqual(current.stages.map(stage=>stage.answerIndex),[2,1,0,2,1]);
  assert.deepEqual(current.stages.slice(0,4).map(stage=>stage.material.logic.resultDigit),old.stages.slice(0,4).map(stage=>stage.material.logic.resultDigit));
  assert.equal(verifyPrintedPuzzles(current).length,5);
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

test('new pack contract prints a traceable route, evidence-based witnesses and fuller adult instructions',async()=>{
  const spec={...clockSpec,packExperienceVersion:2};
  const raw=structuredClone(clockBlueprintContext);
  raw.stages[2].material.items=['Inspect the idle signal','Align the spare wheel','Check the noon marker','Record the test result'].map(label=>({label}));
  const blueprint=prepareContextualBlueprint(raw,spec),stages=[];
  for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{},()=>{throw Error('Unexpected provider request');})).stage);
  const story=assembleStagedStory(spec,blueprint,stages);
  assert.equal(verifyPrintedPuzzles(story).length,5);
  const route=story.stages.find(stage=>stage.material.type==='route_board');
  assert.match(route.material.items[0].detail,/First link: (OPEN|CLOSED).*Second link:/);
  const witness=story.stages.find(stage=>stage.material.type==='decision_record');
  assert.match(witness.material.items[3].detail,/right choice has/);
  assert.doesNotMatch(witness.material.items[3].detail,/rules out/);
  const broken=structuredClone(story);
  const routeIndex=broken.stages.findIndex(stage=>stage.material.type==='route_board');
  broken.stages[routeIndex].material.items[0].detail='A route with no printed links.';
  assert.throws(()=>verifyPrintedPuzzles(broken),/route is missing/);
  for(const paper of ['A4','Letter']){
    const player=new TextDecoder().decode(buildGamePdf(story,{...spec,paper},'player'));
    const guide=new TextDecoder().decode(buildGamePdf(story,{...spec,paper},'guide'));
    assert.match(player,/LINK 1/);assert.match(guide,/HINT 2 - NARROW THE CHECK/);
    assert.match(guide,/IF THEY CHOSE DIFFERENTLY/);
    assert.match(guide,/Do all four saved digits match this action in order/,'the final hint checks the four results, not witness properties');
  }
  const longStory=structuredClone(story);
  longStory.title='The Museum of Lost Words: Restore the Hidden Exhibit Label';
  longStory.introduction='The museum display has lost its exhibit label. Three coded messages and an archive record are the only clues left behind. The team of junior curators must complete four printed checks, record their results, and use the combined code to choose the final action that restores the display. '.repeat(1);
  longStory.stages.forEach((stage,index)=>{stage.title=`Investigate the ${['front desk message','archive clue','garden record','curator report','final exhibit action'][index]} and compare the printed findings`;});
  const longSpec={...spec,plan:{...spec.plan,goal:'Restore the lost exhibit label so the museum display is complete again after the storm.',roles:'Reader, Paper Handler, Checker and Recorder rotate after every checkpoint. For two players, combine jobs in pairs and explain each printed fact together.'}};
  assert.doesNotThrow(()=>buildGamePdf(longStory,{...longSpec,paper:'Letter'},'player'));
  await auditStagedStory(story,spec,blueprint,{OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,request)=>{
    const body=JSON.parse(request.body),outline=JSON.parse(body.input);
    assert.equal(outline.goal,spec.plan.goal);
    assert.equal(outline.checkpoints.length,5);
    assert.equal('story' in outline,false,'the narrative critic must not reinterpret checked paper rules');
    assert.deepEqual(outline.checkpoints[0].printedFeatures,story.stages[0].material.logic.context.features);
    assert.equal(outline.checkpoints[0].printedFacts[0].label,story.stages[0].material.items[0].label);
    assert.equal(outline.checkpoints[0].selectedFinding,story.stages[0].options[story.stages[0].answerIndex]);
    assert.equal(outline.checkpoints[4].intendedFinalAction,story.stages[4].material.logic.context.labels[0]);
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({pass:true,issues:[]})}]}]});
  });
  await assert.rejects(auditStagedStory(story,spec,blueprint,{OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({pass:false,issues:[{stageNumber:1,reason:'Face shows midday cannot apply to a bell rope.'}]})}]}]})),error=>error.code==='GENERATION_QA_FAILED'&&error.stageNumber===1);
});

test('new pack rejects an early mission outcome before spending calls on later checkpoints',()=>{
  const spec={...clockSpec,packExperienceVersion:2};
  const raw=structuredClone(clockBlueprintContext);
  raw.stages[2].material.items[3].label='Heard noon chime';
  assert.throws(()=>prepareContextualBlueprint(raw,spec),/Checkpoint 3 names a completed mission outcome/);
  assert.doesNotThrow(()=>prepareBlueprintCandidate(raw,spec),'a completed-sounding piece can be made an open clue without a model call');
  assert.match(prepareBlueprintCandidate(raw,spec).stages[2].material.items[3].label,/Unheard noon chime/i);
  const proposed=structuredClone(clockBlueprintContext);
  proposed.stages[2].material.items[3].label='Repair noon chime';
  assert.doesNotThrow(()=>prepareContextualBlueprint(proposed,spec),'a proposed repair is not a completed mission');
  assert.doesNotThrow(()=>prepareContextualBlueprint(clockBlueprintContext,clockSpec),'legacy paid specifications still validate');
  const premature=structuredClone(clockSpec.plan);
  premature.stages[1].scene='Heard the noon bell';
  assert.throws(()=>completePaperPlan(premature,clockSpec.gameplay),/Checkpoint 2 names a completed mission outcome/);
  const abstract=structuredClone(clockBlueprintContext);
  abstract.stages[1].features=['Two ruled out','One remains'];
  assert.throws(()=>prepareContextualBlueprint(abstract,spec),/concrete story properties/);
  const mismatched=structuredClone(clockBlueprintContext);
  mismatched.stages[1].material.items[0].label='Candidate A';
  assert.throws(()=>prepareContextualBlueprint(mismatched,spec),/candidates must name story objects/);
  const storyCard=structuredClone(clockBlueprintContext);
  storyCard.stages[0].material.items[0].label='Shell facts card';
  assert.doesNotThrow(()=>prepareContextualBlueprint(storyCard,spec));
  const worksheet=structuredClone(clockBlueprintContext);
  worksheet.stages[2].material.items[1].label='Lay out four step tiles';
  assert.throws(()=>prepareContextualBlueprint(worksheet,spec),/not instructions about the worksheet/);
  const genericCard=structuredClone(clockBlueprintContext);
  genericCard.stages[0].material.items[0].label='Compare card one facts';
  assert.throws(()=>prepareContextualBlueprint(genericCard,spec),/not instructions about the worksheet/);
});

test('an invalid new-plan checkpoint repairs only its own context',async()=>{
  const spec={...clockSpec,packExperienceVersion:2};
  const raw=structuredClone(clockBlueprintContext);
  raw.stages[2].material.items[3].label='Heard noon chime';
  let calls=0;
  const result=await repairBlueprint(spec,raw,'Checkpoint 3 names a completed mission outcome before the final action.',
    {OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,request)=>{
      calls++;
      assert.equal(JSON.parse(request.body).text.format.name,'paper_context_repair');
      const corrected=structuredClone(clockBlueprintContext.stages[2]);
      corrected.material.items[3].label='Record the test result';
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(corrected)}]}]});
    });
  assert.equal(calls,1);
  assert.match(result.blueprint.stages[2].material.items[3].label,/Record the test result/);
  assert.equal(result.blueprint.stages[0].material.items[0].label,clockBlueprintContext.stages[0].material.items[0].label);
});

test('semantic feature repair keeps evidence candidates comparable',async()=>{
  const spec={...clockSpec,packExperienceVersion:2,packQualityVersion:3};
  const corrected=structuredClone(clockBlueprintContext.stages[0]);
  corrected.material.items=['Keeper note','Tower log','Repair report'].map(label=>({label}));
  corrected.features=['Mentions noon bell','Names Meridian wheel'];
  const result=await repairBlueprint(spec,clockBlueprintContext,'Checkpoint 1: a clock-face property cannot describe every candidate.',
    {OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,request)=>{
      const body=JSON.parse(request.body);
      assert.match(body.instructions,/WRITTEN RECORDS/);
      assert.equal(body.text.format.name,'paper_context_repair');
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(corrected)}]}]});
    });
  assert.deepEqual(result.blueprint.stages[0].material.logic.context.labels,['Keeper note','Tower log','Repair report']);
  assert.deepEqual(result.blueprint.stages[0].material.logic.context.features,corrected.features);
});

test('joint semantic repair receives all conflicting checkpoints and retains one checked contract',async()=>{
  const spec={...clockSpec,packExperienceVersion:2,packQualityVersion:3};
  const corrected=structuredClone(clockBlueprintContext);
  corrected.celebration='The travelers celebrate when the noon bell finally sounds.';
  corrected.stages[0].material.items=['Gear note','Pendulum note','Bell rope note'].map(label=>({label}));
  corrected.stages[0].features=['Mentions quiet bell','Names worn rope'];
  corrected.stages[3].features=['Mentions quiet bell','Names worn rope'];
  corrected.stages[4].material.items=['Replace bell rope','Oil the stiff gear','Straighten clock hand'].map(label=>({label}));
  const reasons=['Checkpoint 1: physical features do not apply to all written records.',
    'Checkpoint 4: the noon bell cannot have been heard before the final repair.',
    'Checkpoint 5: the selected findings support the rope, not oiling a gear.'];
  const result=await repairBlueprintTogether(spec,prepareBlueprintCandidate(clockBlueprintContext,spec),reasons,
    {OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},async(_url,request)=>{
      const body=JSON.parse(request.body),input=JSON.parse(body.input);
      assert.equal(body.text.format.name,'paper_context_joint_repair');
      assert.deepEqual(input.qualityIssues,reasons);
      assert.equal(input.candidate.stages.length,5);
      assert.match(body.instructions,/fix all supplied contradictions at once/i);
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(corrected)}]}]});
    });
  assert.deepEqual(result.blueprint.stages[4].material.logic.context.labels,corrected.stages[4].material.items.map(item=>item.label));
  assert.deepEqual(result.blueprint.stages[0].material.logic.context.features,corrected.stages[0].features);
});

test('a second story works for Home and Classroom without changing the printed answer contract',async()=>{
  const raw=structuredClone(clockBlueprintContext);
  raw.stages[0].material={title:'Archive record cards',items:['Tide chart','Compass page','Library map'].map(label=>({label}))};
  raw.stages[0].features=['Seal intact','Index visible'];
  raw.stages[1].material={title:'Two keeper reports',items:['North shelf','Reading desk','Window cabinet'].map(label=>({label}))};
  raw.stages[1].features=['Dry storage','Blue mark'];
  raw.stages[2].material={title:'Map search steps',items:['Inspect the catalogue','Compare the symbols','Check the drawer','Record the map mark'].map(label=>({label}))};
  raw.stages[3].material={title:'Library return paths',items:['Coral hallway','Quiet stair','Window bridge'].map(label=>({label}))};
  raw.stages[4].material={title:'Guide home actions',items:['Follow the marked map','Close the bookcase','Polish the compass'].map(label=>({label}))};
  for(const setting of ['home','classroom']){
    const plan={...clockSpec.plan,title:'The Underwater Library Map',opening:'The explorers need the missing map to guide a visitor home. Four paper discoveries reveal the final action.',goal:'Find the missing library map and guide the visitor home.'};
    const spec={...clockSpec,packExperienceVersion:2,setting,players:setting==='home'?4:24,groups:setting==='home'?null:6,plan};
    const blueprint=prepareContextualBlueprint(raw,spec),stages=[];
    for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{},()=>{throw Error('Unexpected model call');})).stage);
    const story=assembleStagedStory(spec,blueprint,stages);
    assert.equal(verifyPrintedPuzzles(story).length,5);
    for(const paper of ['A4','Letter'])for(const role of ['player','guide']){
      const pdf=new TextDecoder().decode(buildGamePdf(story,{...spec,paper},role));
      assert.match(pdf,/The Underwater Library Map/);
      assert.match(pdf,new RegExp(`/Count ${role==='player'?12:7}`));
    }
  }
});

test('story links use the exact normalized printed material names',()=>{
  const raw=linkedClockContext();
  raw.stages[2].material.items[1].label='Check the key hook note';
  raw.spine.links[2]='Open the panel note > Check the key hook note > Fit the brass key note > Wind the spring note is the checked story sequence. This prepares the repair.';
  const story=prepareContextualBlueprint(raw,{...clockSpec,packExperienceVersion:3,packQualityVersion:3});
  const printed=story.stages[2].material.items.map(item=>item.label).join(' > ');
  assert.equal(story.spine.links[2].finding,printed);
  assert.ok(story.spine.links[2].reason.startsWith(`${printed} is the checked story sequence.`));
  assert.doesNotMatch(story.spine.links[2].reason,/Check the key hook note/);
});

test('new plan descriptions and ending cannot invent dates, evidence or decoded exhibit names',()=>{
  const plan=completePaperPlan(clockSpec.plan,clockSpec.gameplay),spec={...clockSpec,plan};
  assert.ok(plan.stages.every(stage=>stage.scene));
  assert.match(plan.stages[1].storyContext,/four printed steps/);
  const raw=structuredClone(clockBlueprintContext);
  raw.stages=[raw.stages[0],raw.stages[2],raw.stages[3],raw.stages[1],raw.stages[4]];
  raw.celebration='Witness evidence proved a hidden date rule because three decoded words named the exhibit.';
  const blueprint=prepareContextualBlueprint(raw,spec);
  assert.match(blueprint.ending,/Restore noon bell/);
  assert.match(blueprint.ending,/3223/);
  assert.doesNotMatch(blueprint.ending,/Witness|hidden date|decoded words/);
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

