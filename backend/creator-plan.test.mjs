import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePurchase,validateGeneratedStory} from './domain.mjs';
import {signPreview,confirmPreview} from './creator-preview.mjs';
import {generateProposals,generateStory,reviseStage} from './openai.mjs';
import {generateSinglePlan} from './plan-proposals.mjs';
import {contextKey,storySuggestions,validatePlan} from '../shared/creator-plan.mjs';
import {normalizeDraft,draftSpec,activePlans,readySetup,fromCloudDraft} from '../src/creatorDraft.mjs';
import {planFixture} from '../tests/fixtures/creator-plan-fixture.mjs';
import {buildGamePdf} from './pdf.mjs';
const input={sku:'custom_home',creatorVersion:2,customIdea:'西游记',players:4,age:'8-10',paper:'A4',direction:'mystery',storyLocation:'A stop on the journey',mood:'Gentle mystery',gameplay:{primary:'reasoning',secondary:['code','discussion'],request:''}};
const base=()=>validatePurchase(input).spec;
const response=value=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const env={AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'fixture-key'};
function storyFixture(plan) {return {title:plan.title,introduction:plan.opening,ending:'The team restores the document.',groupInstructions:'',stages:plan.stages.map((item,index)=>({title:item.title,mechanic:item.mechanic,clue:'The target has a round seal and two stripes. Choose the matching record.',options:['Round seal, two stripes','Square seal, two stripes','Round seal, three stripes'],answerIndex:0,explanation:'Both stated features match only the first record.',hint:'Check both the seal and stripe count.',prerequisite:index?'STOP-'+index:'START',unlock:'STOP-'+(index+1)}))};}
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
test('a code-led paid plan may use two reasoning support tasks so printable material types remain possible',()=>{
  const spec=validatePurchase({...input,creatorVersion:3,gameplay:{primary:'code',secondary:[],request:''}}).spec;
  const plan=planFixture({...spec,gameplay:{primary:'reasoning',secondary:[]}});
  plan.stages.forEach((stage,index)=>{stage.mechanic=index<3?'code':'reasoning';});
  assert.equal(validatePlan(plan,spec).stages[4].mechanic,'reasoning');
  const impossible={...plan,stages:plan.stages.map(stage=>({...stage,mechanic:'code'}))};
  assert.throws(()=>validatePlan(impossible,spec),/evidence and an ordering or route-compatible checkpoint/);
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
test('an overlong paid plan is repaired before audit and usage includes the repair',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec;
  const valid=planFixture(spec),overlong={...valid,roles:'R'.repeat(350)};
  let calls=0;
  const result=await generateSinglePlan(spec,env,async()=>{
    const value=[overlong,valid,{pass:true,issues:[]}][calls++];
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:20}});
  });
  assert.equal(calls,3);assert.equal(result.plan.roles,valid.roles);
  assert.equal(result.usage.input_tokens,30);assert.equal(result.usage.output_tokens,60);
});
test('a paid plan rejected by audit is corrected and independently rechecked once',async()=>{
  const spec=validatePurchase({...input,creatorVersion:3}).spec;
  const first=planFixture(spec),corrected=planFixture(spec);
  corrected.stages[1].task+=' Compare the printed clock hands.';
  let calls=0;
  const result=await generateSinglePlan(spec,env,async(_url,options)=>{
    const sent=JSON.parse(options.body);
    const value=[first,{pass:false,issues:['Checkpoint 2 needs clearer printed evidence.']},corrected,{pass:true,issues:[]}][calls++];
    if(calls===3)assert.deepEqual(JSON.parse(sent.input).auditIssues,['Checkpoint 2 needs clearer printed evidence.']);
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:20}});
  });
  assert.equal(calls,4);
  assert.equal(result.plan.stages[1].task,corrected.stages[1].task);
  assert.equal(result.usage.input_tokens,40);
  assert.equal(result.usage.output_tokens,80);
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
