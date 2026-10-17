import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {clockSpec} from '../content/paper-contract-qa.mjs';
import {linkedClockContext} from '../content/linked-contract-qa.mjs';
import {prepareBlueprintCandidate,generateStagedCheckpoint,assembleStagedStory} from './staged-story.mjs';
import {validateDeliveryCopy,applyDeliveryCopy,verifyDeliveryPuzzles} from './delivery-copy.mjs';
import {ensureDeliveryCopy,requireDeliveryReview} from './delivery-copy-service.mjs';
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
  assert.throws(()=>validateDeliveryCopy(story,bad),/instruction verb/);
  const ungrounded=structuredClone(copy);ungrounded.links[0].fact='The seal means the chest is safe.';
  assert.throws(()=>validateDeliveryCopy(story,ungrounded),/exact printed finding/);
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
  const env={DB,OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'},fetcher=async()=>{calls++;return Response.json({output_text:JSON.stringify(calls===1?copy:{pass:false,issues:[{stageNumber:1,code:'UNSUPPORTED_CAUSE',quote:'bad fact',reason:'not established'}]})});};
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
