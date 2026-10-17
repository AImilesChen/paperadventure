import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {clockSpec} from '../content/paper-contract-qa.mjs';
import {linkedClockContext} from '../content/linked-contract-qa.mjs';
import {prepareBlueprintCandidate,generateStagedCheckpoint,assembleStagedStory} from './staged-story.mjs';
import {validateDeliveryCopy,normalizeDeliveryCopy,applyDeliveryCopy,verifyDeliveryPuzzles} from './delivery-copy.mjs';
import {ensureDeliveryCopy,requireDeliveryReview,deliveryCopyStatus,deliveryCopySchemaFor,grantSavedFactRepair} from './delivery-copy-service.mjs';
import {clockDeliveryCopy} from '../tests/fixtures/delivery-copy-fixture.mjs';
import {buildGamePdf} from './pdf.mjs';
import {validateGeneratedStory} from './domain.mjs';
import {sha256} from './security.mjs';

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
  db.exec(readFileSync(new URL('./migrations/0028_explicit_saved_fact_repair.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('./migrations/0029_bound_delivery_copy_revision.sql',import.meta.url),'utf8'));
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

test('complete consequences above the writing target stay intact when the combined block and both PDFs fit',async()=>{
  const {story,spec,copy}=await fixture();
  const reason='The damaged signal gear must be replaced before noon can sound. The broken tooth identifies which clock part needs the repair.';
  assert.ok(reason.length>110);copy.links[0].reason=reason;
  validateDeliveryCopy(story,copy);assert.equal(normalizeDeliveryCopy(story,copy).links[0].reason,reason);
  for(const paper of ['A4','Letter'])for(const role of ['player','guide'])assert.ok(buildGamePdf({...story,deliveryCopy:copy},{...spec,paper,packCopyVersion:1},role).length>10000);
  const tooLong=structuredClone(copy);tooLong.links[0].reason='The record supplies relevant information. '.repeat(7).trim();
  assert.throws(()=>validateDeliveryCopy(story,tooLong),/Story consequence/);
});

test('complete record facts above the writing target retain their wording and stay inside actual material boxes',async()=>{
  const {story,spec,copy}=await fixture();
  copy.stages[0].facts=[
    {yes:'The town clock still receives power from its working spring mechanism.',no:'The town clock receives no power from its broken spring mechanism.'},
    {yes:'The signal gear inside the old town clock has a broken wooden tooth.',no:'The signal gear inside the old town clock retains every wooden tooth.'},
  ];
  copy.links[0].fact=copy.stages[0].facts[1].yes;
  copy.stages[1].facts=[
    {yes:'The spare signal gear is stored in the gear chamber beside the clock.',no:'The spare signal gear is stored in the bell chamber beside the clock.'},
    {yes:'The keeper permits collection of the spare gear from the gear chamber.',no:'The keeper forbids collection of the spare gear from the gear chamber.'},
  ];
  copy.links[1].fact=copy.stages[1].facts[0].yes;
  assert.ok(copy.stages[0].facts.some(fact=>fact.yes.length>66));
  validateDeliveryCopy(story,copy);
  assert.deepEqual(normalizeDeliveryCopy(story,copy).stages[0].facts,copy.stages[0].facts);
  for(const paper of ['A4','Letter'])for(const role of ['player','guide']){
    const bytes=buildGamePdf({...story,deliveryCopy:copy},{...spec,paper,packCopyVersion:1},role);
    assert.ok(bytes.length>10000);
    mkdirSync('tmp/pdfs/retained-facts',{recursive:true});
    writeFileSync(`tmp/pdfs/retained-facts/${role}-${paper}.pdf`,bytes);
  }
  const tooLong=structuredClone(copy);tooLong.stages[0].facts[0].no='The clock still receives power from its working spring mechanism and every wheel in the old town tower.';
  assert.ok(tooLong.stages[0].facts[0].no.length>100);
  assert.throws(()=>validateDeliveryCopy(story,tooLong),/Alternative printed fact/);
  const tallRecord=applyDeliveryCopy(story,copy);tallRecord.stages[1].material.items[0].detail='A complete but oversized printed statement. '.repeat(15);
  assert.throws(()=>buildGamePdf(tallRecord,spec,'player'),/record rows do not fit/);
  const tallCard=applyDeliveryCopy(story,copy);tallCard.stages[0].material.items[0].detail='A complete but oversized printed statement. '.repeat(15);
  assert.throws(()=>buildGamePdf(tallCard,spec,'player'),/printed piece text does not fit/);
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
  copy.links[2].reason='Private consequence '.repeat(14)+'.';
  await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,async()=>Response.json({output_text:JSON.stringify(copy)})));
  db.prepare("UPDATE custom_delivery_copy SET error_detail='Closing needs printable English within 240 characters.'").run();
  const status=await deliveryCopyStatus('fixture',env,story,edition);
  assert.equal(status.field,'consequence');assert.equal(status.formatIssue.limit,220-copy.links[2].fact.length-1);
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
  assert.deepEqual(status.reviewProtocol,{verdict:'fail',issueCount:1,valid:false,rule:null,issues:[{stage:1,code:'GRAMMAR',quoteLength:18,reasonLength:13,rules:['quote_match']}],editionMatches:true});
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

test('explicit saved-fact correction retains the original ledger and draft, then permits exactly one extra bound review',async()=>{
  const {story,spec,copy}=await fixture(),{DB,db}=database(),edition={...spec,packCopyVersion:1},draft=structuredClone(copy);
  draft.stages[0].facts=draft.stages[0].facts.slice(0,1);draft.stages[1].facts=draft.stages[1].facts.slice(0,1);
  const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};let requests=0;
  await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,async()=>{requests++;return Response.json({output_text:JSON.stringify(draft)});}),{code:'DELIVERY_COPY_INVALID'});
  const before=await deliveryCopyStatus('fixture',env,story,edition);assert.equal(before.factRepairAvailable,true);assert.equal(before.limit,2);assert.equal(before.resumeAvailable,false);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_delivery_fact_repairs').get().n,0,'reading status never grants an extra review');
  await grantSavedFactRepair('fixture',env,story,edition);await grantSavedFactRepair('fixture',env,story,edition);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_delivery_fact_repairs').get().n,1);
  const granted=await deliveryCopyStatus('fixture',env,story,edition);assert.equal(granted.limit,3);assert.equal(granted.resumeAvailable,true);assert.equal(granted.calls,1);
  const patch={recordFacts:{checkpoint_1:copy.stages[0].facts,checkpoint_2:copy.stages[1].facts}};
  const fetcher=async(_url,{body})=>{requests++;const request=JSON.parse(body);
    assert.equal(request.text.format.name,requests===2?'printed_fact_repair':'printed_copy_audit');
    if(requests===2){assert.deepEqual(request.text.format.schema.required,['recordFacts']);assert.equal(JSON.parse(request.input).checkpoints.length,2);}
    return Response.json({output_text:JSON.stringify(requests===2?patch:{pass:true,issues:[]})});
  };
  const checked=await ensureDeliveryCopy(story,edition,'fixture',env,fetcher);
  await requireDeliveryReview(checked,edition,'fixture',env);
  assert.deepEqual(checked.deliveryCopy,copy);assert.deepEqual(checked.stages,story.stages);
  assert.equal(db.prepare('SELECT candidate_json FROM custom_delivery_copy').get().candidate_json,JSON.stringify(draft));
  assert.equal(db.prepare('SELECT calls FROM custom_delivery_copy').get().calls,2);
  assert.equal(db.prepare('SELECT extra_audit_calls FROM custom_delivery_fact_repairs').get().extra_audit_calls,1);
  assert.equal((await deliveryCopyStatus('fixture',env,story,edition)).calls,3);
  await ensureDeliveryCopy(story,edition,'fixture',env,fetcher);assert.equal(requests,3,'no fourth call on redelivery');
  await assert.rejects(()=>grantSavedFactRepair('fixture',env,story,edition),{code:'DELIVERY_COPY_FACT_REPAIR_UNAVAILABLE'});
  await assert.rejects(()=>ensureDeliveryCopy({...story,ending:'A different ending.'},edition,'fixture',env,fetcher),{code:'DELIVERY_COPY_SOURCE_CHANGED'});
});

test('an ambiguous fact-only request cannot consume another repair or the extra review',async()=>{
  const {story,spec,copy}=await fixture(),{DB,db}=database(),edition={...spec,packCopyVersion:1};
  copy.stages[0].facts=copy.stages[0].facts.slice(0,1);copy.stages[1].facts=copy.stages[1].facts.slice(0,1);
  const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};let requests=0;
  await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,async()=>{requests++;return Response.json({output_text:JSON.stringify(copy)});}));
  await grantSavedFactRepair('fixture',env,story,edition);
  for(let attempt=0;attempt<3;attempt++)await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,async()=>{requests++;throw Error('ambiguous fact timeout');}));
  assert.equal(requests,2);assert.equal(db.prepare('SELECT calls FROM custom_delivery_copy').get().calls,2);
  assert.equal(db.prepare('SELECT extra_audit_calls FROM custom_delivery_fact_repairs').get().extra_audit_calls,0);
});

test('a failed extra review stays blocked at three actual calls and cannot be granted again',async()=>{
  const {story,spec,copy}=await fixture(),{DB}=database(),edition={...spec,packCopyVersion:1},draft=structuredClone(copy);
  draft.stages[0].facts=draft.stages[0].facts.slice(0,1);draft.stages[1].facts=draft.stages[1].facts.slice(0,1);
  const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};let calls=0;
  await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,async()=>{calls++;return Response.json({output_text:JSON.stringify(draft)});}));
  await grantSavedFactRepair('fixture',env,story,edition);
  const fetcher=async(_url,{body})=>{calls++;const name=JSON.parse(body).text.format.name;return Response.json({output_text:JSON.stringify(name==='printed_fact_repair'?{recordFacts:{checkpoint_1:copy.stages[0].facts,checkpoint_2:copy.stages[1].facts}}:{pass:false,issues:[{stageNumber:1,code:'UNSUPPORTED_CAUSE',quote:copy.links[0].fact,reason:'The consequence is not supported.'}]})});};
  for(let attempt=0;attempt<3;attempt++)await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,fetcher),{code:'DELIVERY_COPY_REVIEW'});
  const status=await deliveryCopyStatus('fixture',env,story,edition);assert.equal(status.calls,3);assert.equal(status.reviewPassed,false);assert.equal(status.resumeAvailable,false);assert.equal(status.factRepairAvailable,false);
  await assert.rejects(()=>grantSavedFactRepair('fixture',env,story,edition));assert.equal(calls,3);
});
test('a bound text-only revision gets one new exact review without altering the exhausted original',async()=>{
  const {story,spec,copy}=await fixture(),{DB,db}=database(),edition={...spec,packCopyVersion:1};
  const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};let oldCalls=0;
  const oldFetcher=async()=>{oldCalls++;return Response.json({output_text:JSON.stringify(oldCalls===1?copy:{pass:false,issues:[{stageNumber:1,code:'UNSUPPORTED_CAUSE',quote:copy.links[0].fact,reason:'This claim needs evidence.'}]})});};
  await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,oldFetcher),{code:'DELIVERY_COPY_REVIEW'});
  const old=db.prepare('SELECT source_sha256,spec_sha256,normalized_sha256,audit_json,calls FROM custom_delivery_copy').get();
  assert.equal(old.calls,2);
  const revised=structuredClone(copy);
  revised.celebration='The team restores the clock and hears the noon bell ring again. The townspeople cheer as the signal returns.';
  validateDeliveryCopy(story,revised);
  const hash=await sha256(JSON.stringify(revised));
  db.prepare('INSERT INTO custom_delivery_copy_revisions (order_id,policy,source_sha256,spec_sha256,base_sha256,copy_json,copy_sha256) VALUES (?,?,?,?,?,?,?)').run('fixture','printed-causal-copy-1',old.source_sha256,old.spec_sha256,old.normalized_sha256,JSON.stringify(revised),hash);
  const before=await deliveryCopyStatus('fixture',env,story,edition);
  assert.equal(before.revisionSaved,true);assert.equal(before.resumeAvailable,true);assert.equal(before.calls,2);
  let reviewCalls=0;
  const reviewFetcher=async(_url,{body})=>{reviewCalls++;const request=JSON.parse(body);assert.equal(request.text.format.name,'bound_printed_copy_audit');assert.ok(JSON.parse(request.input).units.length>0);return Response.json({output_text:JSON.stringify({pass:true,issues:[]})});};
  const checked=await ensureDeliveryCopy(story,edition,'fixture',env,reviewFetcher);
  await requireDeliveryReview(checked,edition,'fixture',env);
  assert.equal(checked.deliveryCopy.celebration,revised.celebration);
  assert.equal(reviewCalls,1);assert.equal(db.prepare('SELECT calls FROM custom_delivery_copy').get().calls,2);
  assert.equal(db.prepare('SELECT audit_calls FROM custom_delivery_copy_revisions').get().audit_calls,1);
  assert.equal(db.prepare('SELECT audit_json FROM custom_delivery_copy').get().audit_json,old.audit_json);
  await ensureDeliveryCopy(story,edition,'fixture',env,reviewFetcher);assert.equal(reviewCalls,1);
  await assert.rejects(()=>requireDeliveryReview({...checked,deliveryCopy:copy},edition,'fixture',env),{code:'DELIVERY_COPY_REVIEW_STALE'});
});

test('a revision with an invented audit quote cannot consume another request on retry',async()=>{
  const {story,spec,copy}=await fixture(),{DB,db}=database(),edition={...spec,packCopyVersion:1};
  const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};
  let calls=0;
  const original=async()=>{calls++;return Response.json({output_text:JSON.stringify(calls===1?copy:{pass:false,issues:[{stageNumber:1,code:'THEME',quote:copy.stages[0].title,reason:'Review rejected this edition.'}]})});};
  await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,original),{code:'DELIVERY_COPY_REVIEW'});
  const old=db.prepare('SELECT source_sha256,spec_sha256,normalized_sha256 FROM custom_delivery_copy').get();
  const revised=structuredClone(copy);
  revised.celebration='The team restores the clock and hears the noon bell ring again. The townspeople cheer as the signal returns.';
  const hash=await sha256(JSON.stringify(revised));
  db.prepare('INSERT INTO custom_delivery_copy_revisions (order_id,policy,source_sha256,spec_sha256,base_sha256,copy_json,copy_sha256) VALUES (?,?,?,?,?,?,?)').run('fixture','printed-causal-copy-1',old.source_sha256,old.spec_sha256,old.normalized_sha256,JSON.stringify(revised),hash);
  let reviewCalls=0;
  const badReview=async()=>{reviewCalls++;return Response.json({output_text:JSON.stringify({pass:false,issues:[{stageNumber:1,code:'THEME',evidenceId:'$.stages.0.title',quote:'A sentence absent from the printed title.',reason:'This quotation is invented.'}]})});};
  for(let attempt=0;attempt<2;attempt++)await assert.rejects(()=>ensureDeliveryCopy(story,edition,'fixture',env,badReview),{code:'DELIVERY_COPY_AUDIT_PROTOCOL'});
  assert.equal(reviewCalls,1);
  assert.equal(db.prepare('SELECT calls FROM custom_delivery_copy').get().calls,2);
  assert.equal(db.prepare('SELECT audit_calls,audit_passed FROM custom_delivery_copy_revisions').get().audit_calls,1);
  assert.equal(db.prepare('SELECT audit_passed FROM custom_delivery_copy_revisions').get().audit_passed,0);
  await assert.rejects(()=>requireDeliveryReview({...story,deliveryCopy:revised},edition,'fixture',env));
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


test('shared record facts use a neutral subject on every candidate row',async()=>{
  const {story,copy}=await fixture(),named=structuredClone(copy);
  const label=named.stages[0].labels[0];
  named.stages[0].facts[0].yes=`${label} names the needed gear.`;
  named.stages[0].facts[0].no=`${label} does not name the needed gear.`;
  const normalized=normalizeDeliveryCopy(story,named);
  assert.equal(normalized.stages[0].facts[0].yes,'This record names the needed gear.');
  assert.equal(normalized.stages[0].facts[0].no,'This record does not name the needed gear.');
  const printed=applyDeliveryCopy(story,normalized,false);
  assert.ok(printed.stages[0].material.items.slice(0,3).every(item=>!item.detail.includes(`${label} names`)));
});

test('overlong final instructions drop filler without losing the delivery action',async()=>{
  const {story,copy}=await fixture(),draft=structuredClone(copy);
  draft.actions[0].description='Carry the dry parcel to the bridge, check the sealed edge and cross-lantern bell, then hand it to the friendly shopkeeper before the stalls close.';
  const normalized=normalizeDeliveryCopy(story,draft);
  assert.ok(normalized.actions[0].description.length<=140);
  assert.match(normalized.actions[0].description,/Carry the dry parcel/);
  assert.match(normalized.actions[0].description,/hand it to the shopkeeper before the stalls close\./);
});
