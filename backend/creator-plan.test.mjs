import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePurchase,validateGeneratedStory} from './domain.mjs';
import {signPreview,confirmPreview} from './creator-preview.mjs';
import {generateProposals,generateStory,reviseStage} from './openai.mjs';
import {generateSinglePlan,planFailureCategory,inspectSavedPlan,savedFormatRecovery} from './plan-proposals.mjs';
import {planFormatIssue,planFormatMessage,safePlanFormatIssue} from '../shared/plan-format.mjs';
import {contextKey,storySuggestions,validatePlan} from '../shared/creator-plan.mjs';
import {normalizeDraft,draftSpec,activePlans,readySetup,fromCloudDraft} from '../src/creatorDraft.mjs';
import {planFixture} from '../tests/fixtures/creator-plan-fixture.mjs';
import {journeyProviderPlan} from '../tests/fixtures/journey-provider-plan.mjs';
import {buildGamePdf} from './pdf.mjs';
const input={sku:'custom_home',creatorVersion:2,customIdea:'西游记',players:4,age:'8-10',paper:'A4',direction:'mystery',storyLocation:'A stop on the journey',mood:'Gentle mystery',gameplay:{primary:'reasoning',secondary:['code','discussion'],request:''}};
const base=()=>validatePurchase(input).spec;
const response=value=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const env={AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'fixture-key'};
function storyFixture(plan) {return {title:plan.title,introduction:plan.opening,ending:'The team restores the document.',groupInstructions:'',stages:plan.stages.map((item,index)=>({title:item.title,mechanic:item.mechanic,clue:'The target has a round seal and two stripes. Choose the matching record.',options:['Round seal, two stripes','Square seal, two stripes','Round seal, three stripes'],answerIndex:0,explanation:'Both stated features match only the first record.',hint:'Check both the seal and stripe count.',prerequisite:index?'STOP-'+index:'START',unlock:'STOP-'+(index+1)}))};}

test('saved provider story events fit the real 220-character printed story moment without truncation',()=>{
  const spec=validatePurchase({...input,creatorVersion:3,gameplay:{primary:'discussion',secondary:['reasoning']}}).spec;
  assert.equal(spec.packDeliveryPolicyVersion,2,'new purchases use the checked baseline delivery policy');
  const inspected=inspectSavedPlan(journeyProviderPlan,spec);
  assert.ok(inspected.plan);assert.deepEqual(inspected.issues,[]);
  inspected.plan.stages.forEach((stage,index)=>{assert.ok(stage.storyContext.length<=220);assert.equal(stage.storyBeat,journeyProviderPlan.stages[index].storyBeat);});
  const tooLong=structuredClone(journeyProviderPlan);tooLong.stages[0].scene='A'.repeat(79);tooLong.stages[0].storyBeat='B'.repeat(179)+'.';
  assert.equal(inspectSavedPlan(tooLong,spec).plan,null,'the actual combined print boundary still blocks overflow');
});
test('a preview is bound to its owner, settings, play choices and content',async()=>{
  const spec=base();spec.plan=planFixture(spec);spec.previewToken=await signPreview(spec.plan,spec,'owner','secret');
  await confirmPreview(spec,'owner','secret');
  for(const changed of [{...spec,place:'Somewhere else'},{...spec,players:5},{...spec,storyLocation:'Another world'},{...spec,gameplay:{...spec.gameplay,request:'New request'}},{...spec,plan:{...spec.plan,goal:'Change the goal'}}])await assert.rejects(confirmPreview(changed,'owner','secret'),error=>error.code==='PREVIEW_STALE');
  await assert.rejects(confirmPreview(spec,'other-owner','secret'));
  await assert.rejects(confirmPreview({...spec,previewToken:spec.previewToken+'bad'},'owner','secret'));
  await assert.rejects(confirmPreview({...spec,direction:'mission'},'owner','secret'));
});
test('play selection is validated and separate venue/story settings survive',()=>{
  const spec=base();assert.equal(spec.storyLocation,input.storyLocation);assert.equal(spec.language,'en');
  assert.throws(()=>validatePurchase({...input,gameplay:{primary:'folding',secondary:[]}}));
  assert.throws(()=>validatePurchase({...input,gameplay:{primary:'reasoning',secondary:['reasoning']}}));
  assert.throws(()=>validatePurchase({...input,language:'zh'}));
});
test('plan validation normalizes printable typography without accepting non-English text',()=>{
  const spec=base(),plan=planFixture(spec);
  plan.summary='A clock tower’s bell is missing—follow the clues…';
  plan.roles='A'.repeat(220);
  assert.equal(validatePlan(plan,spec).summary,"A clock tower's bell is missing-follow the clues...");
  plan.summary='钟楼的谜题';
  assert.throws(()=>validatePlan(plan,spec));
});
test('a new code-led plan varies its four playable puzzles while retaining the main style',()=>{
  const spec={...validatePurchase({...input,creatorVersion:3,gameplay:{primary:'code',secondary:[],request:''}}).spec,packQualityVersion:15};
  const plan=planFixture({...spec,gameplay:{primary:'reasoning',secondary:[]}});
  plan.stages.forEach((stage,index)=>{stage.mechanic=['code','code','reasoning','reasoning','code'][index];});
  assert.equal(validatePlan(plan,spec).stages[4].mechanic,'code');
  const oldAllocation={...plan,stages:plan.stages.map((stage,index)=>({...stage,mechanic:index<3?'code':'reasoning'}))};
  assert.throws(()=>validatePlan(oldAllocation,spec),/three different paper activities/);
  assert.equal(validatePlan(oldAllocation,{...spec,packQualityVersion:14}).stages[4].mechanic,'reasoning');
  const impossible={...plan,stages:plan.stages.map(stage=>({...stage,mechanic:'code'}))};
  assert.throws(()=>validatePlan(impossible,spec),/varied paper actions/);
});
test('quality 14 validates theme metadata without rejecting translations and aliases',()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec;
  const plan=planFixture(spec);
  assert.deepEqual(validatePlan(plan,spec).themeAnchors,['Journey to the West']);
  assert.throws(()=>validatePlan({...plan,themeAnchors:[]},spec),/purchased-theme anchors/);
  assert.throws(()=>validatePlan({...plan,themeAnchors:['same','SAME']},spec),error=>error.code==='PLAN_THEME_INVALID');
  assert.throws(()=>validatePlan({...plan,themeAnchors:[]},spec),error=>error.code==='PLAN_THEME_MISSING');
  const aliases={...plan,opening:'The Monkey King helps his companions recover a lost message.',stages:plan.stages.map((stage,index)=>({...stage,scene:['At Sun Wukong\'s mountain','Beside the monk\'s shrine','At the pilgrim inn','At the river crossing','Beside the temple gate'][index]}))};
  assert.equal(validatePlan(aliases,spec).opening,aliases.opening);
});
test('theme-plan repair asks for the returned premise and scenes across two themes',async()=>{
  for(const customIdea of ['西游记，东方神话元素','A clock tower that stopped at noon']){
    const spec=validatePurchase({...input,creatorVersion:3,customIdea}).spec;
    const valid=planFixture(spec);
    valid.premise=`The ${valid.themeAnchors[0]} guardians find that a vital message has gone missing.`;
    valid.stages[1].scene=`At the ${valid.themeAnchors[0]} archive`;
    const previous={...valid,themeAnchors:undefined,stages:valid.stages.map((stage,index)=>({...stage,storyBeat:undefined,scene:`At a generic desk ${index+1}`}))};
    const invalid={...valid,themeAnchors:[]};
    const sent=[];
    const result=await generateSinglePlan(spec,env,async(_url,request)=>{
      const body=JSON.parse(request.body);sent.push(body);
      const value=[invalid,valid,{pass:true,issues:[]}][sent.length-1];
      return response(value);
    },{kind:'full',feedback:'Restore the purchased theme.',previousPlan:previous});
    assert.equal(sent.length,3);
    assert.match(sent[0].instructions,/Judge the premise and five scenes together by meaning/);
    assert.match(sent[1].instructions,/Do not return opening, roles, preparation, tasks or answers/);
    assert.match(result.plan.opening,new RegExp(valid.themeAnchors[0],'i'));
    assert.equal(result.providerCalls,3);
  }
  assert.equal(planFailureCategory({code:'PLAN_INVALID',cause:new Error('Theme anchors must appear in the opening')}),'PLAN_THEME_ANCHORS');
  assert.equal(planFailureCategory({code:'PLAN_QA_FAILED',auditIssueCode:'SCENE_SEQUENCE'}),'PLAN_QA_SCENE_SEQUENCE');
  assert.equal(planFailureCategory({code:'PLAN_INVALID',cause:new Error('Private story text')}),'PLAN_INVALID');
});
test('paid plan parser accepts fenced provider JSON and audits the result',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec;
  const plan=planFixture(spec);let calls=0;
  const result=await generateSinglePlan(spec,env,async()=>{
    calls++;
    const value=calls===1?plan:{pass:true,issues:[]};
    const fence=String.fromCharCode(96).repeat(3);
    return Response.json({output:[{content:[{type:'output_text',text:fence+'json\n'+JSON.stringify(value)+'\n'+fence}]}]});
  });
  assert.equal(calls,2);assert.equal(result.plan.title,plan.title);
});

test('location-only plans cannot reach approval even when a scripted auditor would pass them',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec;
  const locations=planFixture(spec);for(const stage of locations.stages)delete stage.storyBeat;
  let calls=0;
  await assert.rejects(generateSinglePlan(spec,env,async(_url,request)=>{
    calls++;assert.notEqual(JSON.parse(request.body).text.format.name,'paid_plan_audit');
    return response(locations);
  },{kind:'full'}),error=>error.code==='PLAN_INVALID');
  assert.equal(calls,2,'one candidate and one structural repair; no audit can waive missing story events');
});

test('format failures retain exact field measurements without exposing candidate text',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec,candidate=planFixture(spec);
  candidate.stages[1].storyBeat='PRIVATE STORY '.repeat(14)+'.';
  let saved;
  await assert.rejects(generateSinglePlan(spec,env,async()=>response(candidate),{kind:'full',resume:{candidate,sceneRepairUsed:true,correctionUsed:true},onCheckpoint:async value=>saved=structuredClone(value)}));
  assert.deepEqual(saved.formatIssue,{field:'storyBeat',rule:'length',stage:2,length:197,limit:180});
  assert.match(planFormatMessage(saved.formatIssue),/Checkpoint 2: Story event has 197 characters; the limit is 180/);
  assert.doesNotMatch(planFormatMessage(saved.formatIssue),/PRIVATE STORY/);
  assert.equal(safePlanFormatIssue({field:'PRIVATE STORY',rule:'length',length:197,limit:180}),null);
  assert.equal(savedFormatRecovery({status:'failed',error_code:'PLAN_PRINT_FIT',provider_calls:3,checkpoint_json:JSON.stringify(saved)},spec).available,true);
  assert.equal(savedFormatRecovery({status:'failed',error_code:'PLAN_PRINT_FIT',provider_calls:4,checkpoint_json:JSON.stringify(saved)},spec).available,false);
});

test('typographic normalization reuses the candidate and spends at most one remaining audit call',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec,candidate=planFixture(spec);
  candidate.premise='The Monkey King’s companions pause at a shrine…';
  candidate.stages[0].storyBeat='The keeper says, “The messenger’s route needs checking.”';
  const inspection=inspectSavedPlan(candidate,spec);assert.ok(inspection.plan);assert.equal(inspection.issue,null);
  const checkpoint={candidate,sceneRepairUsed:true,correctionUsed:true};
  assert.equal(savedFormatRecovery({status:'failed',error_code:'PLAN_PRINT_FIT',provider_calls:4,checkpoint_json:JSON.stringify(checkpoint)},spec).calls,1);
  let calls=0;
  const result=await generateSinglePlan(spec,env,async(_url,request)=>{calls++;assert.equal(JSON.parse(request.body).text.format.name,'paid_plan_audit');return response({pass:true,issues:[]});},{kind:'full',resume:checkpoint,previousCalls:4});
  assert.equal(calls,1);assert.match(result.plan.opening,/Monkey King's/);assert.match(result.plan.stages[0].storyBeat,/"The messenger's route needs checking\."$/);
  assert.equal(planFormatIssue({...candidate,premise:'An incomplete opening'}).rule,'sentence');
});

test('format recovery fixes all rejected fields while preserving every passed checkpoint',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec,candidate=planFixture(spec),fixed=structuredClone(candidate);
  candidate.stages[1].storyBeat='A'.repeat(190)+'.';candidate.stages[3].storyBeat='An incomplete event';
  const recovery=savedFormatRecovery({status:'failed',error_code:'PLAN_PRINT_FIT',provider_calls:3,checkpoint_json:JSON.stringify({candidate,sceneRepairUsed:true})},spec);
  assert.equal(recovery.available,true);assert.equal(recovery.fields.length,2);
  fixed.title='Unrequested title';fixed.stages[0].storyBeat='An unrequested robot takes over the mission.';
  let calls=0;
  const result=await generateSinglePlan(spec,env,async(_url,request)=>{
    calls++;if(calls>1)return response({pass:true,issues:[]});
    const sent=JSON.parse(request.body);assert.equal(sent.text.format.name,'paid_plan_format_repair');
    assert.deepEqual(sent.text.format.schema.required,['scene2_storyBeat','scene4_storyBeat']);
    assert.equal(sent.text.format.schema.properties.title,undefined);
    return response({scene2_storyBeat:fixed.stages[1].storyBeat,scene4_storyBeat:fixed.stages[3].storyBeat,title:fixed.title});
  },{kind:'full',previousCalls:3,resume:{candidate,sceneRepairUsed:true,formatResumeUsed:true,correctionUsed:true,formatIssue:recovery.inspected.issue,formatRepairFields:recovery.fields}});
  assert.equal(calls,2);assert.equal(result.plan.title,candidate.title);assert.equal(result.plan.stages[0].storyBeat,candidate.stages[0].storyBeat);
  assert.equal(result.plan.stages[1].storyBeat,fixed.stages[1].storyBeat);assert.equal(result.plan.stages[3].storyBeat,fixed.stages[3].storyBeat);
});

test('saved scene repair preserves passed narrative fields and uses just the remaining request budget',async()=>{
  for(const customIdea of ['西游记，东方神话元素','A clock tower that stopped at noon']){
    const spec=validatePurchase({...input,creatorVersion:3,customIdea}).spec;
    const original=planFixture(spec);for(const stage of original.stages)delete stage.storyBeat;
    const fixed=planFixture(spec);fixed.title='Unrequested replacement title';fixed.goal='Unrequested replacement goal';
    let calls=0,saved;
    const result=await generateSinglePlan(spec,env,async(_url,request)=>{
      const sent=JSON.parse(request.body);calls++;
      if(calls===1){assert.equal(sent.text.format.name,'repaired_paid_plan');return response(fixed);}
      const audited=JSON.parse(sent.input).plan;
      assert.equal(audited.title,original.title);assert.equal(audited.goal,original.goal);
      assert.ok(audited.stages.every(stage=>stage.storyContext.includes(stage.storyBeat)));
      assert.match(sent.instructions,/mentally remove the theme title/);
      return response({pass:true,issues:[]});
    },{kind:'full',previousCalls:3,resume:{candidate:original,sceneRepairUsed:true,correctionUsed:true},onCheckpoint:async value=>saved=value});
    assert.equal(calls,2);assert.equal(result.plan.storySceneVersion,1);assert.equal(saved.sceneRepairUsed,true);
    assert.equal(new Set(result.plan.stages.map(stage=>stage.storyBeat)).size,5);
  }
});

test('repeated events and premature goal completion are blocked before story review',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec;
  const duplicate=planFixture(spec);duplicate.stages[2].storyBeat=duplicate.stages[0].storyBeat;
  assert.throws(()=>validatePlan(duplicate,spec),/different story event/);
  const premature=planFixture(spec);premature.stages[0].storyBeat='The travellers recovered the missing travel document.';
  await assert.rejects(generateSinglePlan(spec,env,async()=>response(premature),{kind:'full'}),error=>error.code==='PLAN_INVALID');
});

test('a changed title and opening cannot disguise unchanged story events in a whole-plan rework',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec,previous=planFixture(spec),candidate=structuredClone(previous);
  candidate.title='A new title over the old scenes';candidate.premise='The Monkey King and his companions lose a vital message at a mountain inn.';
  await assert.rejects(generateSinglePlan(spec,env,async()=>response(candidate),{kind:'full',previousPlan:previous}),error=>planFailureCategory(error)==='PLAN_REWORK_UNCHANGED');
});

test('new paid plans generate narrative only; setup and selected main-style allocation cannot drift',async()=>{
  const spec={...validatePurchase({...input,creatorVersion:3,gameplay:{primary:'sequence',secondary:['reasoning']}}).spec,packQualityVersion:15};
  const candidate=planFixture({...spec,gameplay:{primary:'reasoning',secondary:[]}});
  candidate.roles='R'.repeat(501);candidate.preparation='P'.repeat(502);
  let calls=0;
  const result=await generateSinglePlan(spec,env,async(url,request)=>{
    const body=JSON.parse(request.body);
    if(!calls){
      assert.deepEqual(body.text.format.schema.required,['id','title','summary','premise','goal','themeAnchors','stages']);
      assert.equal(body.text.format.schema.properties.stages.items.properties.mechanic,undefined);
    }
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(calls++?{pass:true,issues:[]}:candidate)}]}]});
  });
  assert.equal(calls,2);
  assert.deepEqual(result.plan.stages.map(stage=>stage.mechanic),['sequence','sequence','reasoning','reasoning','sequence']);
  assert.match(result.plan.roles,/Reader, Paper Handler, Checker and Recorder/);
  assert.match(result.plan.preparation,/Keep the adult guide and ending private/);
});
test('an overlong paid plan is repaired before audit and usage includes the repair',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec;
  const valid=planFixture(spec),overlong={...valid,premise:'R'.repeat(400)};
  let calls=0;
  const result=await generateSinglePlan(spec,env,async()=>{
    const value=[overlong,valid,{pass:true,issues:[]}][calls++];
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:20}});
  });
  assert.equal(calls,3);assert.match(result.plan.roles,/Reader, Paper Handler, Checker and Recorder/);
  assert.equal(result.usage.input_tokens,30);assert.equal(result.usage.output_tokens,60);
});

test('failed initial validation repairs the saved candidate without regenerating it',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec;
  const invalid={...planFixture(spec),premise:'R'.repeat(400)};
  let calls=0;
  await assert.rejects(generateSinglePlan(spec,env,async()=>{
    calls++;return Response.json({id:`failed-${calls}`,output:[{content:[{type:'output_text',text:JSON.stringify(invalid)}]}],usage:{input_tokens:10,output_tokens:20}});
  }),error=>{
    assert.equal(error.code,'PLAN_INVALID');
    assert.deepEqual(error.usage,{input_tokens:30,output_tokens:60});
    assert.equal(error.responseId,'failed-3');return true;
  });
  assert.equal(calls,3);
});
test('a transient invalid initial plan recovers without using a customer change',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec;
  const valid=planFixture(spec),invalid={...valid,premise:'R'.repeat(400)};
  let calls=0;
  const result=await generateSinglePlan(spec,env,async()=>{
    const value=[invalid,invalid,valid,{pass:true,issues:[]}][calls++];
    return Response.json({id:`plan-${calls}`,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:20}});
  });
  assert.equal(calls,4);
  assert.equal(result.plan.title,valid.title);
  assert.deepEqual(result.usage,{input_tokens:40,output_tokens:80});
});
test('a paid plan rejected by audit is corrected and independently rechecked once',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec;
  const first=planFixture(spec),corrected=planFixture(spec);
  corrected.stages[1].task+=' Compare the printed clock hands.';
  corrected.stages[1].scene='Beside the Journey to the West clock face';
  let calls=0;
  const result=await generateSinglePlan(spec,env,async(_url,options)=>{
    const sent=JSON.parse(options.body);
    const rejection={code:'SCENE_SEQUENCE',fields:['scene2'],reason:'The second scene does not advance the missing-message investigation.',evidence:[{field:'scene2',quote:first.stages[1].scene}]};
    const value=[first,{pass:false,issues:[rejection]},corrected,{pass:true,issues:[]}][calls++];
    if(calls===3){assert.deepEqual(JSON.parse(sent.input).auditIssue,rejection);assert.match(JSON.parse(sent.input).auditInstruction,/coherent journey/);}
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:20}});
  });
  assert.equal(calls,4);
  assert.equal(result.plan.stages[1].scene,corrected.stages[1].scene);
  assert.equal(result.usage.input_tokens,40);
  assert.equal(result.usage.output_tokens,80);
});
test('Chinese mythology aliases and a simple English theme reach semantic review without keyword-count rejection',async()=>{
  for(const idea of ['西游记，东方神话元素','A clock tower that stopped at noon']){
    const spec=validatePurchase({...input,creatorVersion:3,customIdea:idea}).spec,plan=planFixture(spec),requests=[];
    plan.premise=idea.startsWith('西游')?'The Monkey King helps a monk recover a message.':'The town bell has fallen silent at noon.';
    plan.stages.forEach((stage,index)=>{stage.scene=['At the mountain shrine','Beside the river','At the keeper\'s workshop','At the narrow bridge','Beside the final gate'][index];});
    const result=await generateSinglePlan(spec,env,async(_url,options)=>{
      const sent=JSON.parse(options.body);requests.push(sent);
      return response(sent.text.format.name==='paid_plan_audit'?{pass:true,issues:[]}:plan);
    },{kind:'full'});
    assert.equal(requests.length,2);
    assert.match(requests[1].instructions,/Accurate translations, character aliases and relevant places are valid/);
    assert.match(result.plan.opening,new RegExp(plan.premise.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  }
});

test('a genuinely rejected theme stays blocked and only rejected fields can change',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec,first=planFixture(spec),badCorrection=structuredClone(first),saved=[];
  first.premise='A generic traveller loses a message.';
  badCorrection.premise='An unrelated robot loses a message.';badCorrection.title='Unrequested title change';badCorrection.goal='Unrequested goal change';
  let calls=0;
  const verdict={pass:false,issues:[{code:'THEME_WEAK',fields:['premise'],reason:'An anonymous traveller or unrelated robot loses the purchased mythology.',evidence:[{field:'premise',quote:'loses a message.'}]}]};
  await assert.rejects(generateSinglePlan(spec,env,async()=>response([first,verdict,badCorrection,verdict][calls++]),{kind:'full',onCheckpoint:async value=>saved.push(structuredClone(value))}),error=>planFailureCategory(error)==='PLAN_QA_THEME_WEAK');
  assert.equal(calls,4);
  const latest=saved.at(-1);
  assert.equal(latest.candidate.title,first.title);assert.equal(latest.candidate.goal,first.goal);
  assert.equal(latest.candidate.premise,badCorrection.premise);assert.equal(latest.audit.issues[0].code,'THEME_WEAK');
});

test('a failed audit resumes the saved candidate and the total provider budget survives redelivery',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec,plan=planFixture(spec);let saved=null,calls=0;
  await assert.rejects(generateSinglePlan(spec,env,async(_url,options)=>{
    const sent=JSON.parse(options.body);calls++;
    return sent.text.format.name==='paid_plan_audit'?new Response('',{status:502}):response(plan);
  },{kind:'full',onCheckpoint:async value=>{saved=structuredClone(value);}}),error=>error.code==='PLAN_AUDIT_FAILED');
  assert.equal(calls,2);assert.equal(saved.valid,true);
  const result=await generateSinglePlan(spec,env,async(_url,options)=>{
    assert.equal(JSON.parse(options.body).text.format.name,'paid_plan_audit');calls++;return response({pass:true,issues:[]});
  },{kind:'full',resume:saved,previousCalls:calls});
  assert.equal(calls,3);assert.equal(result.providerCalls,1);
  await assert.rejects(generateSinglePlan(spec,env,async()=>{throw Error('budget bypass');},{kind:'full',resume:{candidate:plan,valid:true},previousCalls:5}),error=>error.code==='PLAN_CALL_BUDGET');
});

test('malformed review results are protocol failures and never become story-mismatch diagnoses',async()=>{
  for(const verdict of [{pass:true,issues:['THEME_WEAK']},{pass:false,issues:[]},{pass:false,issues:[{code:'invented-private-text',fields:['premise']}]}]){
    const spec=validatePurchase({...input,creatorVersion:3}).spec;let calls=0;
    await assert.rejects(generateSinglePlan(spec,env,async()=>response(++calls===1?planFixture(spec):verdict),{kind:'full'}),error=>planFailureCategory(error)==='PLAN_AUDIT_INVALID');
    assert.equal(calls,2);
  }
});

test('review rejection needs actual plan evidence, and a bounded release check cannot spend extra calls',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec,plan=planFixture(spec);
  for(const quote of ['invented content absent from the plan','tiny']){
    let calls=0;
    await assert.rejects(generateSinglePlan(spec,env,async()=>response(++calls===1?plan:{pass:false,issues:[{code:'THEME_WEAK',fields:['premise'],reason:'The event does not preserve the purchased story world.',evidence:[{field:'premise',quote}]}]}),{kind:'full'}),error=>error.code==='PLAN_AUDIT_INVALID');
    assert.equal(calls,2);
  }
  let calls=0;
  await assert.rejects(generateSinglePlan(spec,env,async()=>response(++calls===1?plan:{pass:false,issues:[{code:'THEME_WEAK',fields:['premise'],reason:'The premise does not preserve the purchased story world.',evidence:[{field:'premise',quote:plan.premise}]}]}),{kind:'full',maxProviderCalls:2}),error=>error.code==='PLAN_CALL_BUDGET');
  assert.equal(calls,2);
});

test('a whole-story rejection can repair all dependent narrative fields together',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec,first=planFixture(spec),corrected=structuredClone(first);
  corrected.title='The Monkey King and the Missing Message';
  corrected.premise='The Monkey King must recover a monk\'s lost message at a mountain shrine.';
  corrected.goal='Help the Monkey King return the message so the monk can continue west.';
  corrected.themeAnchors=['Monkey King','mountain shrine'];
  corrected.stages.forEach((stage,index)=>{stage.storyBeat=['The Monkey King questions shrine keepers about the monk\'s missing message.','A river spirit challenges the companions to identify a truthful report.','Pigsy checks two witnesses to trace the message beyond the shrine.','Sandy helps the monk arrange the safe steps across the spirit bridge.','The companions choose how to return the monk\'s message and continue west.'][index];});
  let calls=0;
  const issue={code:'THEME_WEAK',fields:['title','summary','premise','goal','themeAnchors','scene1','scene2','scene3','scene4','scene5'],reason:'The generic events do not preserve the requested mythology.',evidence:[{field:'premise',quote:first.premise}]};
  const result=await generateSinglePlan(spec,env,async()=>response([first,{pass:false,issues:[issue]},corrected,{pass:true,issues:[]}][calls++]),{kind:'full'});
  assert.equal(calls,4);assert.equal(result.plan.title,corrected.title);assert.equal(result.plan.goal,corrected.goal);
  assert.equal(result.plan.stages[2].storyBeat,corrected.stages[2].storyBeat);
});

test('two full five-checkpoint plans are required from the proposal provider',async()=>{
  const spec=base();let sent;
  const result=await generateProposals(spec,env,async(_,options)=>{sent=JSON.parse(options.body);return response({proposals:[planFixture(spec),planFixture(spec,'mission')]});});
  assert.equal(result.proposals[0].stages.length,5);assert.equal(JSON.parse(sent.input).gameplay.primary,'reasoning');
  await assert.rejects(generateProposals(spec,env,async()=>response({proposals:[{id:'mystery',title:'Title',summary:'Short'}]})));
  const invalid=planFixture(spec);invalid.stages[0].mechanic='sequence';
  await assert.rejects(generateProposals(spec,env,async()=>response({proposals:[invalid,planFixture(spec,'mission')]})));
});
test('generated stories cannot depart from the approved checkpoint titles, mechanics or opening',async()=>{
  const spec=base();spec.plan=planFixture(spec);const story=storyFixture(spec.plan);
  assert.equal(validateGeneratedStory(story,spec).stages[0].task,spec.plan.stages[0].task);
  assert.throws(()=>validateGeneratedStory({...story,introduction:'A new story begins.'},spec));
  assert.throws(()=>validateGeneratedStory({...story,stages:story.stages.map((s,i)=>i===0?{...s,mechanic:'sequence'}:s)},spec));
  let calls=0;
  const result=await generateStory(spec,env,async(_,options)=>{const sent=JSON.parse(options.body);calls++;return response(sent.text.format.name==='story_audit'?{pass:true,issues:[]}:story);});
  assert.equal(calls,2);assert.equal(result.story.title,spec.plan.title);
  await assert.rejects(reviseStage(story,spec,1,'Change this into an ordering puzzle',env,async()=>response({...story.stages[0],mechanic:'sequence'})));
});
test('old drafts migrate to pay-first setup without trusting old plans',()=>{
  const draft=normalizeDraft({idea:'西游记',setting:'home',players:4,age:'8-10',direction:'mission',proposalTitle:'Old synopsis'});
  assert.equal(draft.creatorVersion,3);assert.equal(draft.plan,undefined);assert.equal(storySuggestions(draft.idea).name,'Journey to the West');assert.ok(readySetup(draft));
  const spec=draftSpec(draft);assert.equal(spec.creatorVersion,3);assert.equal(spec.plan,undefined);assert.equal(spec.previewToken,undefined);
  const restored=fromCloudDraft({...spec,plan:planFixture(spec),previewToken:'old-proof'});assert.equal(restored.plan,undefined);
  assert.equal(readySetup({...draft,age:'10-8'}),false);
  const broken=normalizeDraft({creatorVersion:2,preferences:{characters:{bad:'data'}},gameplay:{primary:'bad',secondary:'bad'},place:{bad:'data'}});
  assert.equal(broken.preferences.characters,'');assert.equal(broken.place,'');assert.equal(broken.gameplay.primary,'reasoning');
});
test('new Player and Guide PDFs include the approved mission, preserve answer separation and use supported materials',()=>{
  const spec=base();spec.plan=planFixture(spec);spec.materials='Glue and cardboard';
  const story=validateGeneratedStory(storyFixture(spec.plan),spec);
  for(const paper of ['A4','Letter']) {
    const player=new TextDecoder().decode(buildGamePdf(story,{...spec,paper},'player'));
    const guide=new TextDecoder().decode(buildGamePdf(story,{...spec,paper},'guide'));
    assert.match(player,/Your team and mission/);assert.match(player,/Work together:/);
    assert.doesNotMatch(player,/Gentle hint:|Why:|Glue and cardboard/);
    assert.match(guide,/Gentle hint:/);assert.match(guide,/Printed player pages and pencils/);
  }
});

