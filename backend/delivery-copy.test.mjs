import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {clockSpec} from '../content/paper-contract-qa.mjs';
import {linkedClockContext} from '../content/linked-contract-qa.mjs';
import {prepareBlueprintCandidate,generateStagedCheckpoint,assembleStagedStory} from './staged-story.mjs';
import {validateDeliveryCopy,normalizeDeliveryCopy,applyDeliveryCopy,verifyDeliveryPuzzles} from './delivery-copy.mjs';
import {ensureDeliveryCopy,requireDeliveryReview,deliveryCopyStatus,deliveryCopySchemaFor} from './delivery-copy-service.mjs';
import {clockDeliveryCopy} from '../tests/fixtures/delivery-copy-fixture.mjs';
import {buildGamePdf} from './pdf.mjs';
import {validateGeneratedStory} from './domain.mjs';

async function fixture(){
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:4,packLayoutVersion:4};
  const blueprint=prepareBlueprintCandidate(linkedClockContext(),spec),stages=[];
  for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{},()=>{throw Error('No provider calls');})).stage);
  const story=assembleStagedStory(spec,blueprint,stages);
  return {spec,story,copy:clockDeliveryCopy(story)};
}
function database(){
  const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE orders (id TEXT PRIMARY KEY); INSERT INTO orders VALUES (\'fixture\');');
  db.exec(readFileSync(new URL('./migrations/0026_printed_delivery_copy.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('./migrations/0027_delivery_copy_checkpoints.sql',import.meta.url),'utf8'));
  return {db,DB:{prepare(sql){const stmt=db.prepare(sql);return {bind(...values){return {first:async()=>stmt.get(...values)||null,run:async()=>({meta:{changes:stmt.run(...values).changes}})};}}}}};
}
test('final visible records solve uniquely, keep every digit, and reject a modified witness or code',async()=>{
  const {story,copy}=await fixture();validateDeliveryCopy(story,copy);
  const printed=applyDeliveryCopy(story,copy),proof=verifyDeliveryPuzzles(printed);
  assert.deepEqual(proof.map(item=>item.resultDigit),story.stages.map(item=>item.material.logic.resultDigit));
  assert.doesNotMatch(JSON.stringify(printed),/Mentions power: YES/);
  assert.match(printed.stages[0].material.items[0].detail,/The clock/);
  assert.ok(printed.stages[4].material.items[0].detail.includes(copy.actions[0].description));
  const bad=structuredClone(printed);bad.stages[1].material.items[3].detail='The reliable record confirms: Something absent.';
  assert.throws(()=>verifyDeliveryPuzzles(bad),/disagree|fact|proof/);
  const wrong=structuredClone(printed);wrong.stages[4].material.items[0].detail=copy.actions[0].description+' Final action code: 1111';
  assert.throws(()=>verifyDeliveryPuzzles(wrong),/matching action|adult answer/);
});
test('copy validation rejects noun lists and invented cited evidence',async()=>{
  const {story,copy}=await fixture();
  const bad=structuredClone(copy);bad.actions[0].description='Bags, open chest, take scroll, west gate.';
  assert.throws(()=>validateDeliveryCopy(story,bad),/complete instructions/);
  const ungrounded=structuredClone(copy);ungrounded.links[0].fact='The seal means the chest is safe.';
  assert.throws(()=>validateDeliveryCopy(story,ungrounded),/exact printed finding/);
});

test('a blocked closing reports its current bounded rule and counts without exposing saved prose or consuming review',async()=>{
  const {story,spec,copy}=await fixture(),{DB,db}=database(),edition={...spec,packCopyVersion:1};
  copy.celebration='The clock turns and Pip cheers.';
  const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};let calls=0;
  await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,async()=>{calls++;return Response.json({output_text:JSON.stringify(copy)});}),{code:'DELIVERY_COPY_INVALID'});
  const status=await deliveryCopyStatus('fixture',env,story,edition);
  assert.deepEqual(status.formatIssue,{field:'closing',rule:'sentence_count',length:31,limit:240,sentences:1});
  assert.equal(calls,1);assert.equal(status.resumeAvailable,false);
  assert.doesNotMatch(JSON.stringify(status),/The clock turns|Pip cheers/);
  assert.equal(db.prepare('SELECT calls FROM custom_delivery_copy').get().calls,1);
});

test('valid English verbs and numbered findings survive normalization without duplicated final labels',async()=>{
  const {story,copy}=await fixture(),input=structuredClone(copy);
  for(const [index,verb] of ['Retrieve','Restore','Examine'].entries()){
    input.actions[index].label=`${verb} the signal gear`;
    input.actions[index].description=`${verb} the signal gear before the bell rings.`;
  }
  input.stages[4].labels=[];
  input.links[0]={factIndex:0,reason:copy.links[0].reason};
  const normalized=normalizeDeliveryCopy(story,input);
  validateDeliveryCopy(story,normalized);
  assert.deepEqual(normalized.stages[4].labels,input.actions.map(action=>action.label));
  assert.equal(normalized.links[0].fact,input.stages[0].facts[0].yes);
  assert.deepEqual(input.stages[4].labels,[],'normalization does not mutate saved provider output');
  input.links[0].factIndex=3;
  assert.throws(()=>normalizeDeliveryCopy(story,input),/out of range/);
});

test('unused fact fields are engine-owned while missing printed record facts stay blocked',async()=>{
  const {story,spec,copy}=await fixture(),{DB}=database(),edition={...spec,packCopyVersion:1};
  const draft=structuredClone(copy);
  for(const index of [2,3,4])draft.stages[index].facts=[{yes:'Unused metadata.',no:'Unused alternative.'}];
  const normalized=normalizeDeliveryCopy(story,draft);validateDeliveryCopy(story,normalized);
  assert.deepEqual(normalized.stages.slice(2).map(part=>part.facts),[[],[],[]]);
  assert.deepEqual(normalized.stages.slice(0,2).map(part=>part.facts),copy.stages.slice(0,2).map(part=>part.facts));
  assert.deepEqual(verifyDeliveryPuzzles(applyDeliveryCopy(story,normalized)).map(proof=>proof.resultDigit),story.stages.map(stage=>stage.material.logic.resultDigit));
  draft.stages[0].facts=[];
  const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};
  await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,async()=>Response.json({output_text:JSON.stringify(draft)})));
  const status=await deliveryCopyStatus('fixture',env,story,edition);
  assert.deepEqual(status.formatIssue,{field:'record_fact',rule:'fact_count',counts:[0,2,0,0,0],expected:[2,2,0,0,0]});
  assert.equal(status.resumeAvailable,false);assert.equal(status.calls,1);
});

test('provider schema requires two separate fact pairs for each actual record checkpoint',async()=>{
  const {story,copy}=await fixture(),schema=deliveryCopySchemaFor(story),draft=structuredClone(copy);
  assert.deepEqual(schema.properties.recordFacts.required,['checkpoint_1','checkpoint_2']);
  for(const key of schema.properties.recordFacts.required){assert.equal(schema.properties.recordFacts.properties[key].minItems,2);assert.equal(schema.properties.recordFacts.properties[key].maxItems,2);}
  assert.equal(schema.properties.stages.items.properties.facts,undefined);
  assert.equal(schema.properties.stages.items.properties.labels,undefined);
  assert.equal(schema.properties.materialLabels.properties.checkpoint_1.minItems,3);
  assert.equal(schema.properties.materialLabels.properties.checkpoint_3.minItems,4);
  assert.equal(schema.properties.links.properties.checkpoint_1.properties.factIndex.maximum,1);
  assert.equal(schema.properties.links.properties.checkpoint_3.properties.factIndex.maximum,3);
  assert.equal(schema.properties.links.properties.checkpoint_4.properties.factIndex.maximum,0);
  draft.recordFacts={checkpoint_1:draft.stages[0].facts,checkpoint_2:draft.stages[1].facts};
  draft.materialLabels={checkpoint_1:draft.stages[0].labels,checkpoint_2:draft.stages[1].labels,checkpoint_3:draft.stages[2].labels};
  draft.stages.forEach(part=>{delete part.facts;delete part.labels;});
  draft.links=Object.fromEntries(draft.links.map((link,index)=>[`checkpoint_${index+1}`,{factIndex:index===0?1:0,reason:link.reason}]));
  const normalized=normalizeDeliveryCopy(story,draft);validateDeliveryCopy(story,normalized);
  assert.equal(normalized.recordFacts,undefined);assert.deepEqual(normalized.stages.map(part=>part.facts),copy.stages.map(part=>part.facts));
  assert.deepEqual(normalized,copy,'typed fields compile to the same complete printed edition');
});

test('current consequence bounds replace stale closing diagnostics without exposing any wording',async()=>{
  const {story,spec,copy}=await fixture(),{DB,db}=database(),edition={...spec,packCopyVersion:1};
  const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};
  copy.links[2].reason='Private consequence '.repeat(9)+'.';
  await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,async()=>Response.json({output_text:JSON.stringify(copy)})));
  db.prepare("UPDATE custom_delivery_copy SET error_detail='Closing needs printable English within 240 characters.'").run();
  const status=await deliveryCopyStatus('fixture',env,story,edition);
  assert.equal(status.field,'consequence');assert.equal(status.formatIssue.limit,110);
  assert.equal(status.formatIssue.lengths[2],copy.links[2].reason.length);
  assert.doesNotMatch(JSON.stringify(status),/Private consequence/);
});

test('malformed saved material does not break owner diagnostics or spend its remaining review',async()=>{
  const {story,spec,copy}=await fixture(),{DB}=database(),edition={...spec,packCopyVersion:1};
  copy.stages[4]=null;const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};
  await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,async()=>Response.json({output_text:JSON.stringify(copy)})));
  const status=await deliveryCopyStatus('fixture',env,story,edition);
  assert.deepEqual(status.formatIssue,{field:'material',rule:'shape'});
  assert.equal(status.resumeAvailable,false);assert.equal(status.calls,1);
});

test('an overlong celebration reuses only a complete saved specific closing and still needs its remaining independent review',async()=>{
  const {story,spec,copy}=await fixture(),{DB,db}=database(),edition={...spec,packCopyVersion:1};
  const saved=copy.celebration,source={...story,ending:`The four checked results form code 3123, which matches "Collect the spare gear" on the final sheet. ${saved}`};
  const draft=structuredClone(copy);draft.celebration='The clock turns '.repeat(16)+'and rings. Pip smiles.';
  assert.ok(draft.celebration.length>240);
  const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};let requests=0;
  const checked=await ensureDeliveryCopy(source,edition,'fixture',env,async(_url,{body})=>{
    const request=JSON.parse(body);requests++;
    if(requests===2){assert.equal(request.text.format.name,'printed_copy_audit');assert.ok(JSON.parse(request.input).printed.ending.endsWith(saved));}
    return Response.json({output_text:JSON.stringify(requests===1?draft:{pass:true,issues:[]})});
  });
  assert.equal(checked.deliveryCopy.celebration,saved);assert.equal(draft.celebration.length>240,true);
  assert.equal(JSON.parse(db.prepare('SELECT candidate_json FROM custom_delivery_copy').get().candidate_json).celebration,draft.celebration,'original provider draft remains intact');
  await requireDeliveryReview(checked,edition,'fixture',env);assert.equal(requests,2);
  const noClosing={...source,ending:'The mission is complete.'};
  assert.throws(()=>validateDeliveryCopy(noClosing,normalizeDeliveryCopy(noClosing,draft)),/Closing/);
  const generic={...source,ending:'The four checked results form code 3123, which matches "Collect the spare gear" on the final sheet. The result is visible. Everyone in the story cheers.'};
  assert.throws(()=>validateDeliveryCopy(generic,normalizeDeliveryCopy(generic,draft)),/Closing/);
});

test('format-stopped original draft resumes only its remaining audit and retains raw text and budget',async()=>{
  const {story,spec,copy}=await fixture(),{DB,db}=database(),edition={...spec,packCopyVersion:1};
  const original=structuredClone(copy);original.actions[0].label='Retrieve the signal gear';original.actions[0].description='Retrieve the signal gear and fit it to the clock.';
  // The old format demanded that the model repeat precisely the same label.
  const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};let calls=0;
  await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,async()=>{calls++;return Response.json({output_text:JSON.stringify({version:1})});}),{code:'DELIVERY_COPY_INVALID'});
  db.prepare('UPDATE custom_delivery_copy SET candidate_json=?').run(JSON.stringify(original));
  const before=await deliveryCopyStatus('fixture',env,story,edition);
  assert.equal(before.calls,1);assert.equal(before.resumeAvailable,true);assert.equal(before.phase,'format');
  const checked=await ensureDeliveryCopy(story,edition,'fixture',env,async(_url,{body})=>{
    calls++;assert.equal(JSON.parse(body).text.format.name,'printed_copy_audit');
    return Response.json({output_text:JSON.stringify({pass:true,issues:[]})});
  });
  await requireDeliveryReview(checked,edition,'fixture',env);
  assert.equal(calls,2);assert.equal(db.prepare('SELECT candidate_json FROM custom_delivery_copy').get().candidate_json,JSON.stringify(original));
  assert.deepEqual(checked.stages,story.stages,'all five canonical puzzles remain saved unchanged');
  assert.equal((await deliveryCopyStatus('fixture',env,story,edition)).resumeAvailable,false);
  // Even a passed audit cannot be replayed over a changed edition.
  original.actions[0].description='Retrieve the signal gear and inspect it beside the clock.';
  db.prepare('UPDATE custom_delivery_copy SET candidate_json=?').run(JSON.stringify(original));
  await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,()=>{throw Error('No third call');}),{code:'DELIVERY_COPY_REVIEW_STALE'});
  assert.equal(db.prepare('SELECT calls FROM custom_delivery_copy').get().calls,2);
});

test('received private correction can recover after interrupted persistence without a new correction',async()=>{
  const {story,spec,copy}=await fixture(),{DB,db}=database(),edition={...spec,packCopyVersion:1};
  const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};
  await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,async()=>Response.json({output_text:JSON.stringify(copy)})).then(()=>{throw Error('review unexpectedly passed');}));
  db.prepare('UPDATE custom_delivery_copy SET calls=1,candidate_json=NULL,audit_json=NULL,audit_response_json=NULL,audit_candidate_sha256=NULL').run();
  assert.equal((await deliveryCopyStatus('fixture',env,story,edition)).resumeAvailable,true);
  const checked=await ensureDeliveryCopy(story,edition,'fixture',env,async(_url,{body})=>{
    assert.equal(JSON.parse(body).text.format.name,'printed_copy_audit');return Response.json({output_text:JSON.stringify({pass:true,issues:[]})});
  });
  await requireDeliveryReview(checked,edition,'fixture',env);
  assert.ok(db.prepare('SELECT candidate_json FROM custom_delivery_copy').get().candidate_json);
});

test('malformed audit is a protocol failure; diagnostics expose only safe metadata and never permit a third call',async()=>{
  const {story,spec,copy}=await fixture(),{DB,db}=database(),edition={...spec,packCopyVersion:1};
  let calls=0;const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},fetcher=async()=>Response.json({id:'private-response-id',output_text:JSON.stringify(++calls===1?copy:{pass:false,issues:[{stageNumber:1,code:'GRAMMAR',quote:'invented quotation',reason:'private prose'}]})});
  await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,fetcher),{code:'DELIVERY_COPY_AUDIT_PROTOCOL'});
  const before=db.prepare('SELECT * FROM custom_delivery_copy').get(),status=await deliveryCopyStatus('fixture',env,story,edition);
  assert.equal(status.code,'DELIVERY_COPY_AUDIT_PROTOCOL');assert.equal(status.calls,2);assert.equal(status.resumeAvailable,false);
  assert.doesNotMatch(JSON.stringify(status),/private-response-id|invented quotation|private prose/);
  assert.deepEqual(db.prepare('SELECT * FROM custom_delivery_copy').get(),before,'reading status does not mutate private state');
  await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,fetcher),{code:'DELIVERY_COPY_AUDIT_PROTOCOL'});
  assert.equal(calls,2);
});
test('one correction and one independent review persist across redelivery; no third call or changed source',async()=>{
  const {story,spec,copy}=await fixture(),{DB,db}=database();let calls=0;
  const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};
  const fetcher=async(_url,{body})=>{const request=JSON.parse(body);calls++;
    assert.equal(request.text.format.name,calls===1?'printed_copy_repair':'printed_copy_audit');
    if(calls===2){const input=JSON.parse(request.input);assert.match(input.printed.stages[0].material.items[0].detail,/The clock/);assert.doesNotMatch(input.printed.stages[0].material.items[0].detail,/: YES/);}
    return Response.json({output_text:JSON.stringify(calls===1?copy:{pass:true,issues:[]}),usage:{input_tokens:12,output_tokens:15}});
  };
  const checked=await ensureDeliveryCopy(story,{...spec,packCopyVersion:1},'fixture',env,fetcher);
  assert.ok(validateGeneratedStory(checked,spec).deliveryCopy);
  assert.deepEqual(await ensureDeliveryCopy(story,{...spec,packCopyVersion:1},'fixture',env,fetcher),checked);
  assert.equal(calls,2);assert.equal(db.prepare('SELECT calls FROM custom_delivery_copy').get().calls,2);
  await requireDeliveryReview(checked,{...spec,packCopyVersion:1,paper:'Letter'},'fixture',env);
  await assert.rejects(()=>requireDeliveryReview({...checked,ending:'Different ending.'},{...spec,packCopyVersion:1},'fixture',env),{code:'DELIVERY_COPY_SOURCE_CHANGED'});
  await assert.rejects(()=>ensureDeliveryCopy({...story,ending:'Changed ending.'},{...spec,packCopyVersion:1},'fixture',env,fetcher),{code:'DELIVERY_COPY_SOURCE_CHANGED'});
  assert.equal(calls,2);
});
test('an ambiguous timeout consumes its reservation and cannot purchase a fresh correction',async()=>{
  const {story,spec}=await fixture(),{DB,db}=database();let calls=0;
  const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},fetcher=async()=>{calls++;throw Error('ambiguous timeout');};
  for(let attempt=0;attempt<3;attempt++)await assert.rejects(()=>ensureDeliveryCopy(story,{...spec,packCopyVersion:1},'fixture',env,fetcher));
  assert.equal(calls,1);assert.equal(db.prepare('SELECT calls FROM custom_delivery_copy').get().calls,1);
});
test('invented ocean and space editions preserve all solutions across different story vocabulary',async()=>{
  const base=await fixture();
  for(const replacements of [[['clock','beacon'],['signal gear','beacon lens'],['gear chamber','lens store'],['bell','harbour light']],[['clock','relay'],['signal gear','relay module'],['gear chamber','module store'],['bell','station signal']]]){
    const rewrite=value=>typeof value==='string'?replacements.reduce((out,[from,to])=>out.replaceAll(new RegExp(from,'gi'),to),value):Array.isArray(value)?value.map(rewrite):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,rewrite(item)])):value;
    const story=rewrite(base.story),copy=rewrite(base.copy);
    validateDeliveryCopy(story,copy);
    const proof=verifyDeliveryPuzzles(applyDeliveryCopy(story,copy));
    assert.deepEqual(proof.map(item=>item.resultDigit),base.story.stages.map(item=>item.material.logic.resultDigit));
    for(const role of ['player','guide'])assert.ok(buildGamePdf({...story,deliveryCopy:copy},{...base.spec,packCopyVersion:1},role).length>10000);
  }
});
test('rejected independent review stays stopped without regenerated text or additional charges',async()=>{
  const {story,spec,copy}=await fixture(),{DB}=database();let calls=0;
  const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},fetcher=async()=>{calls++;return Response.json({output_text:JSON.stringify(calls===1?copy:{pass:false,issues:[{stageNumber:1,code:'UNSUPPORTED_CAUSE',quote:copy.links[0].fact,reason:'not established'}]})});};
  for(let attempt=0;attempt<3;attempt++)await assert.rejects(()=>ensureDeliveryCopy(story,{...spec,packCopyVersion:1},'fixture',env,fetcher),{code:'DELIVERY_COPY_REVIEW'});
  assert.equal(calls,2);
});
test('final copy renders Home and Classroom in A4 and Letter with full actions and correct singular grammar',async()=>{
  const {story,spec,copy}=await fixture(),checked={...story,deliveryCopy:copy};
  const dir=new URL('../tmp/pdfs/delivery-copy-fixtures/',import.meta.url);mkdirSync(dir,{recursive:true});
  for(const setting of ['home','classroom'])for(const paper of ['A4','Letter'])for(const role of ['player','guide']){
    const variant={...spec,setting,paper,groups:1,packCopyVersion:1};
    const bytes=buildGamePdf(checked,variant,role),pdf=new TextDecoder().decode(bytes);
    assert.match(pdf,/form code/);assert.doesNotMatch(pdf,/Print 1 complete Player sets/);
    assert.ok(pdf.includes('Collect the spare signal gear'),'full final action survives');
    writeFileSync(new URL(`${setting}-${paper}-${role}.pdf`,dir),bytes);
  }
  assert.throws(()=>buildGamePdf(story,{...spec,packCopyVersion:1},'player'),/not passed delivery review/);
});
