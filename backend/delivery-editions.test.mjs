import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import productionWorker,{handleProductionApi} from './production-worker.mjs';
import {sha256,sha256Bytes,signAccessToken} from './security.mjs';
import {validatePurchase} from './domain.mjs';
import {buildBaselinePack} from './baseline-pack.mjs';
import {buildGamePdf} from './pdf.mjs';
import {buildInteractiveGameView} from './pdf-interactive.mjs';
import {verifyPrintedPuzzles} from './paper-proof.mjs';
import {planFixture} from '../tests/fixtures/creator-plan-fixture.mjs';

async function fixture({setting='home',paper='A4',fetcher=null,failPut=null}={}){
 const db=new DatabaseSync(':memory:');
 for(const name of readdirSync(new URL('./migrations/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync(new URL(`./migrations/${name}`,import.meta.url),'utf8'));
 const binding={prepare:sql=>({bind:(...values)=>({first:async()=>db.prepare(sql).get(...values)||null,all:async()=>({results:db.prepare(sql).all(...values)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...values).changes)}})})}),batch:async statements=>{db.exec('BEGIN');try{const result=[];for(const item of statements)result.push(await item.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}};
 const spec=validatePurchase({sku:`custom_${setting}`,creatorVersion:3,customIdea:'clock tower',players:setting==='home'?4:24,groups:6,age:'8-10',paper,gameplay:{primary:'sequence',secondary:['code','reasoning']}}).spec;
 spec.plan=planFixture(spec);spec.planConfirmed=true;
 const {story}=await buildBaselinePack(spec),stored=JSON.stringify(spec),source=JSON.stringify(story),storyHash=await sha256(source);
 db.prepare("INSERT INTO price_versions(id,sku,currency,unit_amount,tax_behavior) VALUES('price',?,'USD',1499,'exclusive')").run(spec.sku);
 db.prepare("INSERT INTO orders(id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES('order','custom',?,?,?,'owner','price',1499,'USD','published',CURRENT_TIMESTAMP)").run(spec.sku,stored,await sha256(stored));
 db.prepare("INSERT INTO custom_activities(id,order_id,status,story_spec_json) VALUES('activity','order','published',?)").run(stored);
 db.prepare("INSERT INTO entitlements(id,order_id,custom_activity_id,status,revision_success_limit,revision_success_used,revision_expires_at,access_expires_at) VALUES('entitlement','order','activity','active',3,0,datetime('now','+20 days'),datetime('now','+6 months'))").run();
 const files=new Map(),jobs=[];let modelCalls=0;
 const env={DB:binding,SESSION_SECRET:'fixture-secret',PUBLIC_ORIGIN:'https://adventure.example',ACCOUNT_ENABLED:'true',GOOGLE_CLIENT_ID:'fixture.apps.googleusercontent.com',OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>jobs.push(job)},FETCH:async(url,options)=>{modelCalls++;return fetcher?fetcher(url,options):Response.json({output_text:JSON.stringify({style:'reading'})});},PRIVATE_FILES:{get:async key=>files.get(key)||null,put:async(key,body,options)=>{if(failPut?.(key))throw Error('simulated candidate storage failure');files.set(key,{body,customMetadata:options.customMetadata});}}};
 const player=buildGamePdf(story,spec,'player'),guide=buildGamePdf(story,spec,'guide');
 for(const [key,body,hash] of [['original/story.json',source,storyHash],['original/player.pdf',player,await sha256Bytes(player)],['original/guide.pdf',guide,await sha256Bytes(guide)]])files.set(key,{body,customMetadata:{sha256:hash}});
 db.prepare("INSERT INTO artifact_versions(id,custom_activity_id,version_number,status,story_r2_key,story_sha256,player_r2_key,player_sha256,guide_r2_key,guide_sha256,pack_format_version) VALUES('original','activity',1,'published','original/story.json',?,'original/player.pdf',?,'original/guide.pdf',?,2)").run(storyHash,await sha256Bytes(player),await sha256Bytes(guide));
 const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:'owner',exp:Math.floor(Date.now()/1000)+3600});
 const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
 const call=async(path='',method='GET',body,extra={})=>handleProductionApi(new Request(`${env.PUBLIC_ORIGIN}/api/v1/orders/order${path}`,{method,headers:{...headers,...extra,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env);
 const start=(body,key=crypto.randomUUID())=>call('/editions','POST',body,{'Idempotency-Key':key});
 const view=async()=>{const response=await call('/editions');assert.equal(response.status,200,await response.clone().text());return response.json();};
 const process=async(job=jobs.shift())=>{const before=modelCalls;await productionWorker.queue({messages:[{body:job,ack(){},retry(){throw Error('A bounded candidate must not replay the model');}}]},env);assert.ok(modelCalls-before<=1,'one provider call per queue message');};
 const drain=async()=>{for(let n=0;jobs.length&&n<25;n++)await process();assert.equal(jobs.length,0);};
 const download=(role,version='')=>handleProductionApi(new Request(`${env.PUBLIC_ORIGIN}/api/v1/files/order/${role}?paper=${paper}${version?'&version='+version:''}`,{headers}),env);
 return {db,env,files,jobs,call,start,view,process,drain,spec,story,player,guide,download,modelCalls:()=>modelCalls};
}
const qa=(name,data)=>{mkdirSync('tmp/post-delivery-qa',{recursive:true});writeFileSync(`tmp/post-delivery-qa/${name}.json`,JSON.stringify(data));};
const local={kind:'checkpoint',stageNumber:2,feedback:'Help younger readers follow the instructions one step at a time.'};

test('post-delivery checkpoint feedback creates exact PDFs and atomic idempotent replacement, keeping all earlier versions',async()=>{
 const f=await fixture(),before=await f.view();assert.equal(before.available,true);assert.equal(before.rights.checkpointLeft,3);assert.equal(before.rights.wholeLeft,2);
 qa('current',before);
 const expires=f.db.prepare('SELECT revision_expires_at,access_expires_at FROM entitlements').get(),activity=f.db.prepare('SELECT story_spec_json FROM custom_activities').get();
 const key=crypto.randomUUID(),first=await f.start(local,key);assert.equal(first.status,202,await first.clone().text());const id=(await first.json()).id;
 assert.equal((await f.start(local,key)).status,202);assert.equal(f.jobs.length,1);
 assert.equal((await f.start({...local,stageNumber:3})).status,409);
 assert.equal((await f.call('/revision-previews','POST',{stageNumber:1,instruction:'Clarify the instructions.'})).status,409);
 await f.drain();assert.equal(f.modelCalls(),1);
 const ready=await f.view();assert.equal(ready.candidate.status,'ready');assert.notEqual(ready.candidate.stages[1].clue,ready.stages[1].clue);assert.equal(ready.rights.checkpointLeft,3);
 qa('checkpoint-ready',ready);
 for(const [name,body] of [['local-current-player.pdf',f.player],['local-current-guide.pdf',f.guide]])writeFileSync('tmp/post-delivery-qa/'+name,body);
 const row=f.db.prepare('SELECT * FROM delivery_editions WHERE id=?').get(id),saved=JSON.parse(f.files.get(row.story_r2_key).body);
 assert.deepEqual(saved.stages,f.story.stages,'all solved data stays exactly the same');assert.equal(verifyPrintedPuzzles(saved).length,5);
 for(const role of ['player','guide'])writeFileSync(`tmp/post-delivery-qa/local-candidate-${role}.pdf`,f.files.get(row[`${role}_r2_key`]).body);
 const preview=await f.call(`/editions/${id}/player`);assert.equal(preview.status,200);assert.equal(preview.headers.get('content-disposition').startsWith('inline'),true);
 assert.equal((await f.call(`/editions/${id}/accept`,'POST')).status,200);
 assert.equal((await f.call(`/editions/${id}/accept`,'POST')).status,200);
 const published=await f.view();qa('published',published);assert.equal(published.version,2);assert.equal(published.previewExact,true);assert.equal(published.rights.checkpointLeft,2);assert.equal(published.rights.wholeLeft,2);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,2);
 assert.deepEqual(f.db.prepare('SELECT revision_expires_at,access_expires_at FROM entitlements').get(),expires);
 assert.deepEqual(f.db.prepare('SELECT story_spec_json FROM custom_activities').get(),activity);
 const currentPdf=await f.download('player'),oldPdf=await f.download('player',1);assert.equal(currentPdf.status,200);assert.equal(oldPdf.status,200);assert.equal(await sha256Bytes(new Uint8Array(await currentPdf.arrayBuffer())),row.player_sha256);assert.deepEqual(new Uint8Array(await oldPdf.arrayBuffer()),f.player);
 assert.equal((await (await f.call()).json()).downloadVersion,2);
 const second=await f.start({...local,stageNumber:3,style:'checking'});assert.equal(second.status,202);await f.drain();assert.equal(f.modelCalls(),1,'finite preset adds no provider call');
 const secondId=(await f.view()).candidate.id;await f.call(`/editions/${secondId}/discard`,'POST');assert.equal((await f.view()).rights.checkpointLeft,2);
 assert.equal((await f.call(`/editions/${secondId}/accept`,'POST')).status,409);
});

for(const failure of ['provider','scope','storage','integrity'])test(`${failure} cannot consume a successful change or replace either published PDF`,async()=>{
 const f=await fixture({fetcher:async()=>failure==='provider'?new Response('',{status:503}):Response.json({output_text:JSON.stringify({style:failure==='scope'?'unsupported':'steps'})}),failPut:key=>failure==='storage'&&key.endsWith('guide.pdf')});
 const response=await f.start(local);assert.equal(response.status,202);const id=(await response.json()).id;await f.drain();
 if(failure==='integrity'){
  const row=f.db.prepare('SELECT * FROM delivery_editions WHERE id=?').get(id);f.files.get(row.guide_r2_key).body=new Uint8Array([37,80,68,70]);assert.equal((await f.call(`/editions/${id}/accept`,'POST')).status,503);
 }else assert.equal((await f.view()).candidate.status,'failed');
 assert.equal(f.db.prepare('SELECT revision_success_used FROM entitlements').get().revision_success_used,0);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,1);
 assert.deepEqual(f.files.get('original/player.pdf').body,f.player);assert.deepEqual(f.files.get('original/guide.pdf').body,f.guide);
});

for(const setting of ['home','classroom'])for(const paper of ['A4','Letter'])test(`whole-game ${setting}/${paper} plan approval, bounded baseline fallback, real PDFs, separate quota and preserved original state`,async()=>{
 const f=await fixture({setting,paper,fetcher:async(_url,{body})=>{
  const req=JSON.parse(body);if(req.text.format.name==='paid_adventure_plan'){
   const {spec}=JSON.parse(req.input),plan=planFixture(spec);plan.title='The Clock Keepers New Message';plan.summary='The clock keeper needs the team to recover a new missing message.';plan.stages[0].storyBeat='The clock tower keeper brings a torn letter about the missing message.';plan.stages[1].storyBeat='The clock tower courier offers conflicting accounts about the lost message.';
   return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(plan)}]}]});
  }
  throw Error('Simulated enhancement provider timeout');
 }});
 const immutable=f.db.prepare('SELECT purchase_spec_json FROM orders').get().purchase_spec_json,activity=f.db.prepare('SELECT story_spec_json FROM custom_activities').get().story_spec_json;
 const response=await f.start({kind:'whole',feedback:'Keep the clock keeper but change the story to a missing message.',gameplay:{primary:'code',secondary:['reasoning','discussion']}});assert.equal(response.status,202,await response.clone().text());const id=(await response.json()).id;
 await f.drain();let view=await f.view();assert.equal(view.candidate.status,'plan_review',JSON.stringify(view.candidate));assert.equal(view.candidate.plan.title,'The Clock Keepers New Message');if(setting==='classroom'&&paper==='A4')qa('plan-review',view);
 assert.equal(f.modelCalls(),1,'stable adult plan review does not add another editorial model gate');
 assert.equal((await f.call(`/editions/${id}/accept`,'POST')).status,409);
 assert.equal((await f.call(`/editions/${id}/confirm`,'POST')).status,202);assert.equal((await f.call(`/editions/${id}/confirm`,'POST')).status,202);await f.drain();
 view=await f.view();if(setting==='classroom'&&paper==='A4')qa('whole-ready',view);assert.equal(view.candidate.status,'ready',JSON.stringify(view.candidate));assert.equal(view.candidate.edition,'baseline');assert.equal(f.modelCalls(),2);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM custom_generation_calls').get().n,0);assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM custom_plan_requests').get().n,0);
 assert.equal((await f.call(`/editions/${id}/accept`,'POST')).status,200);assert.equal((await f.view()).rights.wholeLeft,1);assert.equal((await f.view()).rights.checkpointLeft,3);
 assert.equal(f.db.prepare('SELECT purchase_spec_json FROM orders').get().purchase_spec_json,immutable);assert.equal(f.db.prepare('SELECT story_spec_json FROM custom_activities').get().story_spec_json,activity);
 const row=f.db.prepare('SELECT * FROM delivery_editions WHERE id=?').get(id),candidateSpec=JSON.parse(row.spec_json),candidateStory=JSON.parse(f.files.get(row.story_r2_key).body);
 assert.equal(verifyPrintedPuzzles(candidateStory).length,5);assert.equal(candidateSpec.gameplay.primary,'code');
 assert.equal((await f.view()).previewExact,true);assert.equal((await f.view()).stages[0].storyContext,buildInteractiveGameView(candidateStory,candidateSpec).printedStory.stages[0].storyContext);
 if(setting==='classroom'&&paper==='A4'){mkdirSync('tmp/post-delivery-qa',{recursive:true});writeFileSync('tmp/post-delivery-qa/current-player.pdf',f.player);writeFileSync('tmp/post-delivery-qa/candidate-player.pdf',f.files.get(row.player_r2_key).body);writeFileSync('tmp/post-delivery-qa/candidate-guide.pdf',f.files.get(row.guide_r2_key).body);}
});

test('finite attempts, expired rights, stale base and a discarded compare-and-swap never spend replacement quota',async()=>{
 const f=await fixture();
 for(let i=0;i<6;i++){const response=await f.start({...local,style:i%2?'hint':'steps'});assert.equal(response.status,202);await f.drain();const id=(await response.json()).id;assert.equal((await f.call(`/editions/${id}/discard`,'POST')).status,200);}
 assert.equal((await f.start(local)).status,429);assert.equal((await f.view()).rights.checkpointLeft,3);
 const g=await fixture();g.db.prepare("UPDATE entitlements SET revision_expires_at=datetime('now','-1 day')").run();assert.equal((await g.start(local)).status,403);
 const h=await fixture();const response=await h.start({...local,style:'steps'}),id=(await response.json()).id;await h.drain();
 h.db.prepare("UPDATE artifact_versions SET story_sha256='different' WHERE id='original'").run();assert.equal((await h.call(`/editions/${id}/accept`,'POST')).status,409);assert.equal(h.db.prepare('SELECT revision_success_used FROM entitlements').get().revision_success_used,0);
});

test('reserved candidate interruptions never repeat a model call; saved baseline can finish locally',async()=>{
 const f=await fixture();const response=await f.start(local),id=(await response.json()).id;
 f.db.prepare("UPDATE delivery_editions SET status='generating',calls=1,lease_until=1 WHERE id=?").run(id);
 await productionWorker.scheduled({},f.env);assert.equal((await f.view()).candidate.status,'failed');assert.equal(f.modelCalls(),0);
 const g=await fixture();const whole=await g.start({kind:'whole',feedback:'Keep the theme but change the paper mission.'}),wid=(await whole.json()).id;
 g.jobs.length=0;g.db.prepare("UPDATE delivery_editions SET status='generating',phase='frame',calls=1,lease_until=1,work_json=? WHERE id=?").run(JSON.stringify({baseline:g.story}),wid);
 await productionWorker.scheduled({},g.env);await g.drain();assert.equal((await g.view()).candidate.status,'failed','an identical baseline is not a pretend new edition');assert.equal(g.modelCalls(),0);
});

test('exact preview source mismatch disables unsupported legacy changes and owner authorization protects candidates',async()=>{
 const f=await fixture();f.db.prepare("UPDATE artifact_versions SET player_sha256='unreproducible'").run();assert.equal((await f.view()).available,false);assert.equal((await f.start(local)).status,409);
 const anonymous=await handleProductionApi(new Request(`${f.env.PUBLIC_ORIGIN}/api/v1/orders/order/editions`),f.env);assert.equal(anonymous.status,401);
 const other=await signAccessToken(f.env.SESSION_SECRET,{scope:'session',emailHash:'other',exp:Math.floor(Date.now()/1000)+3600});const denied=await f.call('/editions','GET',undefined,{cookie:`paw_session=${other}`});assert.equal(denied.status,404);
});

test('whole-game enhancement completes every saved material and both PDFs without final AI copy review',async()=>{
 let enhanced;
 const f=await fixture({fetcher:async(_url,{body})=>{
  const request=JSON.parse(body),input=JSON.parse(request.input),name=request.text.format.name;
  if(name==='paid_adventure_plan'){
   const spec=input.spec,plan=planFixture(spec);plan.title='The Clock Keepers New Clues';
   plan.stages[0].storyBeat='The clock tower keeper brings a torn letter about the missing message.';
   plan.stages[1].storyBeat='The clock tower courier offers conflicting accounts about the lost message.';
   enhanced=(await buildBaselinePack({...spec,plan})).blueprint;
   return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(plan)}]}]});
  }
  const data=name==='story_frame'?enhanced.storyFrame:name==='blueprint_celebration'?{celebration:enhanced.celebration}:name==='blueprint_material_stage'?(()=>{
   const c=enhanced.stages[input.checkpoint-1].material.logic.context;return {material:{title:c.title,items:c.labels.map(label=>({label}))},features:c.features,word:c.word};
  })():null;
  assert.ok(data,`no unexpected audit or unbounded repair: ${name}`);return Response.json({output_text:JSON.stringify(data)});
 }});
 const response=await f.start({kind:'whole',feedback:'Keep the clock tower, but follow a different lost letter.'}),id=(await response.json()).id;
 await f.drain();assert.equal((await f.view()).candidate.status,'plan_review');await f.call(`/editions/${id}/confirm`,'POST');await f.drain();
 const ready=await f.view();assert.equal(ready.candidate.status,'ready');assert.equal(ready.candidate.edition,'enhanced');assert.equal(f.modelCalls(),7);
});

test('PDF storage recovery reuses saved candidate without another AI call and CSRF cannot publish it',async()=>{
 let rejectStorage=true;
 const f=await fixture({failPut:key=>rejectStorage&&key.endsWith('guide.pdf')});
 const response=await f.start(local),id=(await response.json()).id;await f.drain();assert.equal((await f.view()).candidate.pdfRetryAvailable,true);
 rejectStorage=false;assert.equal((await f.call(`/editions/${id}/retry`,'POST')).status,202);await f.drain();assert.equal(f.modelCalls(),1);assert.equal((await f.view()).candidate.status,'ready');
 assert.equal((await f.call(`/editions/${id}/accept`,'POST',undefined,{origin:'https://other.example'})).status,403);
 assert.equal(f.db.prepare('SELECT revision_success_used FROM entitlements').get().revision_success_used,0);
 assert.equal((await f.call(`/editions/${id}/accept`,'POST')).status,200);
 const row=f.db.prepare('SELECT * FROM delivery_editions').get();assert.equal(row.calls,1);
});

test('a malformed plan saves its checkpoint and repairs in a later message with a lifetime call cap',async()=>{
 let generated=0;
 const f=await fixture({fetcher:async(_url,{body})=>{
  const request=JSON.parse(body),input=JSON.parse(request.input),name=request.text.format.name;
  assert.ok(['paid_adventure_plan','repaired_paid_plan'].includes(name));generated++;
  if(name==='paid_adventure_plan')return Response.json({output:[{content:[{type:'output_text',text:'{}'}]}]});
  const plan=planFixture(input.spec);plan.title='The Clock Keepers Repaired Message';
  plan.stages[0].storyBeat='The clock tower keeper brings a torn letter about the missing message.';plan.stages[1].storyBeat='The clock tower courier offers conflicting accounts about the lost message.';
  return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(plan)}]}]});
 }});
 const response=await f.start({kind:'whole',feedback:'Keep the clock tower but use a different lost letter.'});assert.equal(response.status,202);await f.drain();assert.equal((await f.view()).candidate.status,'plan_review');assert.equal(generated,2);
 assert.equal(f.db.prepare('SELECT calls FROM delivery_editions').get().calls,2);
});

test('database guards serialize candidate versus legacy edits and acceptance verifies remaining rights at commit time',async()=>{
 const f=await fixture();const response=await f.start({...local,style:'steps'}),id=(await response.json()).id;await f.drain();
 assert.throws(()=>f.db.prepare("INSERT INTO revision_requests(id,order_id,stage_number,instruction,status) VALUES('r','order',1,'Clarify the instructions','queued')").run(),/EDITION_BUSY/);
 f.db.prepare('UPDATE entitlements SET revision_success_used=revision_success_limit').run();assert.equal((await f.call(`/editions/${id}/accept`,'POST')).status,403);
 assert.throws(()=>f.db.prepare("UPDATE delivery_editions SET status='published',published_version=2 WHERE id=?").run(id),/EDITION_ACCEPT_CONFLICT/);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,1);
});

test('a play-style-only whole-game request can keep its story without a needless two-scene rewrite gate',async()=>{
 const f=await fixture({fetcher:async(_url,{body})=>{
  const request=JSON.parse(body);assert.equal(request.text.format.name,'paid_adventure_plan');const {spec}=JSON.parse(request.input);
  return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(planFixture(spec))}]}]});
 }});
 assert.equal((await f.start({kind:'whole',feedback:'Keep the story exactly as it is, but make decoding the main play style.',gameplay:{primary:'code',secondary:['discussion','reasoning']}})).status,202);
 await f.drain();const result=await f.view();assert.equal(result.candidate.status,'plan_review');assert.equal(f.modelCalls(),1);
 assert.equal(result.candidate.plan.stages[0].storyBeat,f.spec.plan.stages[0].storyBeat);
 assert.notEqual(result.candidate.plan.stages[0].mechanic,f.spec.plan.stages[0].mechanic);
});
