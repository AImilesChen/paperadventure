import test from 'node:test';
import {purchaseConsentVersion} from '../shared/purchase-consent.mjs';
import {assertPaymentRuntime} from '../scripts/payment-runtime.mjs';
import assert from 'node:assert/strict';
import { createHmac, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import productionWorker, { handleProductionApi } from './production-worker.mjs';
import { sha256, sha256Bytes, signAccessToken, verifyAccessToken } from './security.mjs';
import { validateGeneratedStory, validatePurchase, validateSupportedRange } from './domain.mjs';
import { buildGamePdf } from './pdf.mjs';
import { productRights } from '../shared/catalog.mjs';
import { signPreview } from './creator-preview.mjs';
import { planFixture } from '../tests/fixtures/creator-plan-fixture.mjs';
import { sampleSpec, sampleStory } from '../content/custom-paper-format-sample.mjs';
import { compileControlledPuzzle, controlledStageText } from './controlled-puzzles.mjs';
import { clockSpec,clockBlueprintContext } from '../content/paper-contract-qa.mjs';
import { linkedClockContext } from '../content/linked-contract-qa.mjs';
import {clockDeliveryCopy} from '../tests/fixtures/delivery-copy-fixture.mjs';
import { prepareBlueprintCandidate,generateStagedCheckpoint,assembleStagedStory } from './staged-story.mjs';
import {ensureDeliveryCopy} from './delivery-copy-service.mjs';
import {COPY_POLICY} from './delivery-copy.mjs';
import { packRemakeView, qualityUpgradeEligible, retryPackRemake, processPackRemake } from './pack-remake.mjs';
import { createDownloadZip } from '../src/downloadZip.mjs';
import {verifyPrintedPuzzles} from './paper-proof.mjs';
import {buildBaselinePack} from './baseline-pack.mjs';
import {completePaperPlan,paperContractTypes} from '../shared/paper-contract.mjs';
async function approvedCustomInput(env,input) {
  const spec=validatePurchase({...input,creatorVersion:2,gameplay:{primary:'reasoning',secondary:[]}}).spec;
  spec.plan=planFixture(spec,spec.direction);spec.planConfirmed=true;
  spec.previewToken=await signPreview(spec.plan,spec,await sha256(`${env.SESSION_SECRET}|${input.email}`),env.SESSION_SECRET);
  return {...spec,email:input.email};
}

function database({includeThemeRecovery=true,includeSemanticRecovery=true}={}) {
  const db = new DatabaseSync(':memory:');
  for (const name of ['0001_core.sql','0002_runtime.sql','0003_revision_attempts.sql','0004_failure_notifications.sql','0005_theme_worlds.sql','0006_ready_pack_variants.sql','0007_variant_release_status.sql','0008_custom_plan_review.sql','0009_custom_delivery_recovery.sql','0010_pdf_generation_history.sql','0011_custom_story_checkpoints.sql','0012_staged_custom_generation.sql','0013_paid_pack_remakes.sql','0014_pack_remake_recovery.sql','0015_pack_remake_rounds.sql','0016_controlled_pack_epoch.sql','0017_pack_quality_epoch.sql','0018_resumable_blueprint_parts.sql','0019_quality_theme_replan.sql','0020_failed_theme_plan_retry.sql','0021_theme_plan_failure_recovery.sql','0022_theme_plan_qa_recovery.sql','0023_private_plan_checkpoints.sql','0024_scoped_semantic_plan_recovery.sql','0025_order_theme_covers.sql','0026_printed_delivery_copy.sql','0027_delivery_copy_checkpoints.sql','0028_explicit_saved_fact_repair.sql','0029_bound_delivery_copy_revision.sql','0030_scoped_material_recovery.sql','0031_scoped_blueprint_story_recovery.sql','0032_scoped_deterministic_location_recovery.sql','0033_scoped_causal_link_recovery.sql','0034_scoped_downstream_recovery.sql','0035_explicit_copy_transport_recovery.sql','0036_revision_previews.sql','0037_order_8f5d_material_recovery.sql','0038_step_delivery.sql','0039_post_delivery_editions.sql','0040_refund_evidence_guards.sql']) {
    if(name==='0021_theme_plan_failure_recovery.sql'&&!includeThemeRecovery)continue;
    if(name==='0022_theme_plan_qa_recovery.sql'&&!includeThemeRecovery)continue;
    if(name==='0024_scoped_semantic_plan_recovery.sql'&&!includeSemanticRecovery)continue;
    db.exec(readFileSync(new URL(`./migrations/${name}`, import.meta.url), 'utf8'));
  }
  const binding = {
    prepare(sql) {
      return { bind(...values) {
        const statement = db.prepare(sql);
        return {
          first: async () => statement.get(...values) || null,
          all: async () => ({ results: statement.all(...values) }),
          run: async () => ({ meta: { changes: Number(statement.run(...values).changes) } }),
        };
      } };
    },
    async batch(statements) {
      db.exec('BEGIN');
      try { const values = []; for (const statement of statements) values.push(await statement.run()); db.exec('COMMIT'); return values; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
  return { db, binding };
}

function seedReady(db) {
  db.prepare("INSERT OR IGNORE INTO theme_worlds (id,title_en,status) VALUES ('celebration','Celebration','published')").run();
  for (const [id, theme, setting, status] of [
    ['pack-h01','celebration','home','release_ready'],
    ['pack-c01','celebration','classroom','release_ready'],
    ['pack-d02','dinosaur','home','published'],
  ]) db.prepare("INSERT INTO ready_packs (id,theme_world_id,setting,version,status,licence_version) VALUES (?,?,?,'v1',?,'licence-1')").run(id,theme,setting,status);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES ('price-1','ready_home','USD',999,'price_test_1','exclusive',1)").run();
  const pdfHash = createHash('sha256').update(new Uint8Array([37,80,68,70])).digest('hex');
  for (const pack of ['pack-h01','pack-c01','pack-d02']) for (const paper of ['A4','Letter']) for (const role of ['player','guide'])
    db.prepare('INSERT INTO ready_pack_files (ready_pack_id,paper,role,r2_key,sha256,bytes) VALUES (?,?,?,?,?,?)').run(pack,paper,role,`ready/${pack}/${paper}/${role}.pdf`,pdfHash,4);
  for (const kind of ['privacy','terms','cookies','refunds']) db.prepare("INSERT INTO legal_documents (kind,version,title,effective_at,sections_json,status) VALUES (?,?,?,'2026-10-07',?,'published')").run(kind,'reviewed-test-1',kind,JSON.stringify([{ heading: 'Test only', body: 'Mock test policy.' }]));
}

const request = (path, method = 'GET', data, headers = {}) => new Request(`https://adventure.example${path}`, { method, headers: { ...(data ? { 'content-type': 'application/json' } : {}), ...headers }, body: data ? JSON.stringify(path==='/api/v1/checkout-intents'?{serviceRequest:{version:purchaseConsentVersion,requested:true},...data}:data) : undefined });
const purchase = { sku: 'ready_home', themeId: 'dinosaur', packVersion: 'v1', email: 'Adult@example.com' };
const config = binding => ({ DB: binding, PRIVATE_FILES: { get: async () => null }, RESEND_API_KEY: 're_test', EMAIL_FROM: 'hello@adventure.example', ACCOUNT_ENABLED: 'true', EMAIL_LOGIN_ENABLED: 'true', GOOGLE_CLIENT_ID: 'test-google-client.apps.googleusercontent.com', STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_WEBHOOK_SECRET: 'whsec_fake', SESSION_SECRET: 'test-session-secret', PUBLIC_ORIGIN: 'https://adventure.example', CHECKOUT_ENABLED: 'true', LEGAL_RELEASED: 'true', TAX_CONFIGURED: 'true', CUSTOM_LICENCE_VERSION: 'custom-v1', SUPPORTED_AGE_MIN: '6', SUPPORTED_AGE_MAX: '12', HOME_PLAYER_MAX: '8', CLASSROOM_STUDENT_MAX: '40' });

for(const scoped of [false,true])test(`owner can resume ${scoped?'explicit fact repair':'saved copy review'} without resetting epochs, rebuilding puzzles or replacing original files early`,async()=>{
  const {db,binding}=database(),orderId='saved-copy-fixture',owner='saved-copy-owner';
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:4,packLayoutVersion:4,packCopyVersion:1};
  const blueprint=prepareBlueprintCandidate(linkedClockContext(),spec),stages=[];
  for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{},()=>{throw Error('No generation');})).stage);
  const story=assembleStagedStory(spec,blueprint,stages),stored=JSON.stringify(spec),storyJson=JSON.stringify(story),stagesJson=JSON.stringify(stages);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('copy-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,'copy-price',1499,'USD','published',CURRENT_TIMESTAMP)").run(orderId,stored,await sha256(stored),owner);
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('copy-activity',?,'published',?)").run(orderId,stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,access_expires_at,revision_success_used) VALUES ('copy-entitlement',?,'copy-activity','active',datetime('now','+6 months'),0)").run(orderId);
  db.prepare("INSERT INTO custom_pack_remakes (order_id,status,phase,spec_json,spec_sha256,story_json,story_sha256,stages_json,error_code,logic_epoch,quality_epoch,recovery_round,published_version) VALUES (?,'failed','audit',?,?,?,?,?,'DELIVERY_COPY_INVALID',1,9,2,1)").run(orderId,stored,await sha256(stored),storyJson,await sha256(storyJson),stagesJson);
  db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,pack_format_version,player_r2_key,guide_r2_key,player_sha256,guide_sha256) VALUES ('copy-original','copy-activity',1,'published',2,'original/player.pdf','original/guide.pdf','original','original')").run();
  const jobs=[],files=new Map();let auditCalls=0;
  const complete=clockDeliveryCopy(story),draft=structuredClone(complete);
  if(scoped){draft.stages[0].facts=draft.stages[0].facts.slice(0,1);draft.stages[1].facts=draft.stages[1].facts.slice(0,1);}
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>jobs.push(job)},PRIVATE_FILES:{get:async key=>files.get(key)||null,put:async(key,body,options)=>files.set(key,{body,customMetadata:options.customMetadata})},FETCH:async(_url,{body})=>{const name=JSON.parse(body).text.format.name;if(name==='printed_fact_repair'){assert.equal(scoped,true);return Response.json({output_text:JSON.stringify({recordFacts:{checkpoint_1:complete.stages[0].facts,checkpoint_2:complete.stages[1].facts}})});}auditCalls++;assert.equal(name,'printed_copy_audit');return Response.json({output_text:JSON.stringify({pass:true,issues:[]})});}};
  await assert.rejects(()=>ensureDeliveryCopy(story,spec,orderId,env,async()=>Response.json({output_text:'{"version":1}'})));
  db.prepare('UPDATE custom_delivery_copy SET candidate_json=? WHERE order_id=?').run(JSON.stringify(draft),orderId);
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const get=()=>handleProductionApi(request(`/api/v1/orders/${orderId}`,'GET',undefined,headers),env).then(response=>response.json());
  const consent=scoped?{action:'complete_saved_facts',allowOneExtraReview:true}:undefined;
  const retryUrl=`/api/v1/orders/${orderId}/pack-remake/retry`;
  const retry=(data=consent)=>handleProductionApi(data===undefined?new Request(`https://adventure.example${retryUrl}`,{method:'POST',headers,body:''}):request(retryUrl,'POST',data,headers),env);
  const view=await get();assert.equal(view.remake.copyResumeAvailable,!scoped);assert.equal(view.remake.copyCheck.factRepairAvailable,scoped);assert.match(view.remake.failureReason,/format/);
  if(scoped){assert.equal((await retry({action:'complete_saved_facts',allowOneExtraReview:false})).status,409);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_delivery_fact_repairs').get().n,0);}
  const malformed=await handleProductionApi(new Request(`https://adventure.example${retryUrl}`,{method:'POST',headers,body:'{'}),env);
  assert.equal(malformed.status,400);assert.equal((await malformed.json()).error.code,'INVALID_JSON');assert.equal(jobs.length,0);
  if(scoped){assert.equal((await handleProductionApi(new Request(`https://adventure.example${retryUrl}`,{method:'POST',headers,body:''}),env)).status,409);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_delivery_fact_repairs').get().n,0);}
  assert.equal((await handleProductionApi(request(`/api/v1/orders/${orderId}`),env)).status,401);
  assert.equal((await handleProductionApi(request(`/api/v1/orders/${orderId}/pack-remake/retry`,'POST',undefined,{origin:env.PUBLIC_ORIGIN}),env)).status,401);
  assert.equal((await retry()).status,202);assert.equal((await retry()).status,409);assert.equal(jobs.length,1);
  const saved=db.prepare('SELECT logic_epoch,quality_epoch,recovery_round,story_json,stages_json FROM custom_pack_remakes WHERE order_id=?').get(orderId);
  assert.deepEqual({...saved},{logic_epoch:1,quality_epoch:9,recovery_round:2,story_json:storyJson,stages_json:stagesJson});
  await processPackRemake(orderId,env);
  assert.equal(auditCalls,1);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,1);
  await processPackRemake(orderId,env);await processPackRemake(orderId,env);
  assert.equal((await get()).remake.status,'ready');assert.equal(auditCalls,1);
  assert.equal(db.prepare('SELECT calls FROM custom_delivery_copy WHERE order_id=?').get(orderId).calls,2);
  if(scoped)assert.equal(db.prepare('SELECT extra_audit_calls FROM custom_delivery_fact_repairs WHERE order_id=?').get(orderId).extra_audit_calls,1);
  assert.equal(db.prepare('SELECT revision_success_used FROM entitlements WHERE order_id=?').get(orderId).revision_success_used,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_pack_remake_calls').get().n,0,'copy review uses its own ledger, with no fictitious generation call');
});

test('checkpoint comparison preserves the original and only spends a change when accepted',async()=>{
  const {db,binding}=database(),orderId='preview-order',owner='preview-owner';
  const spec={...sampleSpec,gamePackVersion:2,packLogicVersion:1};
  const stages=sampleStory.stages.map((original,index)=>{
    const puzzle=compileControlledPuzzle({number:index+1,title:original.title,material:original.material});
    return {...original,...controlledStageText(puzzle),options:puzzle.options,answerIndex:puzzle.answerIndex,material:puzzle.material};
  });
  const story=validateGeneratedStory({...sampleStory,stages},spec),stored=JSON.stringify(spec),source=JSON.stringify(story);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('preview-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,'preview-price',1499,'USD','published',CURRENT_TIMESTAMP)").run(orderId,stored,await sha256(stored),owner);
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('preview-activity',?,'published',?)").run(orderId,stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit,revision_expires_at,access_expires_at) VALUES ('preview-entitlement',?,'preview-activity','active',2,datetime('now','+20 days'),datetime('now','+6 months'))").run(orderId);
  const originalPlayer=buildGamePdf(story,spec,'player'),originalGuide=buildGamePdf(story,spec,'guide');
  db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,story_r2_key,story_sha256,player_r2_key,player_sha256,guide_r2_key,guide_sha256,pack_format_version) VALUES ('preview-original','preview-activity',1,'published','original/story.json',?,'original/player.pdf',?,'original/guide.pdf',?,2)").run(await sha256(source),await sha256Bytes(originalPlayer),await sha256Bytes(originalGuide));
  const files=new Map(),jobs=[];
  for(const [key,body,hash] of [['original/story.json',source,await sha256(source)],['original/player.pdf',originalPlayer,await sha256Bytes(originalPlayer)],['original/guide.pdf',originalGuide,await sha256Bytes(originalGuide)]])files.set(key,{body,customMetadata:{sha256:hash}});
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>jobs.push(job)},FETCH:async()=>{throw Error('A checked preview must not call a model');},PRIVATE_FILES:{get:async key=>files.get(key)||null,put:async(key,body,options)=>files.set(key,{body,customMetadata:options.customMetadata})}};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const url=`/api/v1/orders/${orderId}`;
  const read=()=>handleProductionApi(request(`${url}/revision-workspace`,'GET',undefined,headers),env).then(response=>response.json());
  const start=()=>handleProductionApi(request(`${url}/revision-previews`,'POST',{stageNumber:2,instruction:'Clarify the instructions and hint.'},headers),env);
  const decide=(id,action)=>handleProductionApi(request(`${url}/revision-previews/${id}/${action}`,'POST',undefined,headers),env);
  assert.equal((await handleProductionApi(request(`${url}/revision-workspace`),env)).status,401);
  assert.equal((await handleProductionApi(request(`${url}/revision-previews`,'POST',{stageNumber:2,instruction:'Clarify the instructions and hint.'},{origin:env.PUBLIC_ORIGIN}),env)).status,401);
  assert.equal((await read()).stages.length,5);
  assert.equal((await handleProductionApi(request(`${url}/revision-previews`,'POST',{stageNumber:2,instruction:'Make this one easier to read.',mode:'custom'},headers),env)).status,422,'old checked packs without final copy do not queue an unusable AI preview');
  const first=await start();assert.equal(first.status,202,await first.text());
  assert.equal(db.prepare('SELECT revision_success_used FROM entitlements WHERE order_id=?').get(orderId).revision_success_used,0);
  await productionWorker.queue({messages:[{body:jobs.shift(),ack(){},retry(){throw Error('unexpected preview retry');}}]},env);
  const draft=await read();assert.equal(draft.preview.status,'ready');assert.notEqual(draft.preview.candidate.hint,draft.stages[1].hint);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM artifact_versions WHERE custom_activity_id='preview-activity'").get().n,1);
  const candidate=await handleProductionApi(request(`${url}/revision-previews/${draft.preview.id}/player`,'GET',undefined,headers),env);
  assert.equal(candidate.status,200);assert.equal(candidate.headers.get('content-disposition').startsWith('inline'),true);
  assert.equal((await decide(draft.preview.id,'discard')).status,200);
  assert.equal(db.prepare('SELECT revision_success_used FROM entitlements WHERE order_id=?').get(orderId).revision_success_used,0);
  const second=await start();assert.equal(second.status,202,await second.text());
  await productionWorker.queue({messages:[{body:jobs.shift(),ack(){},retry(){throw Error('unexpected preview retry');}}]},env);
  const accepted=await read();assert.equal(accepted.preview.status,'ready');
  assert.equal((await decide(accepted.preview.id,'accept')).status,200);
  assert.equal(db.prepare('SELECT revision_success_used FROM entitlements WHERE order_id=?').get(orderId).revision_success_used,1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM artifact_versions WHERE custom_activity_id='preview-activity'").get().n,2);
  assert.equal(db.prepare("SELECT status FROM artifact_versions WHERE id='preview-original'").get().status,'published');
  assert.equal((await read()).version,2);
});

test('DeepSeek key enables generation capability without requiring an OpenAI key', async () => {
  const { binding } = database();
  const env = { ...config(binding), AI_PROVIDER: 'deepseek', DEEPSEEK_API_KEY: 'test-only',
    GENERATION_QUEUE: { send: async () => {} }, PROPOSALS_ENABLED: 'true' };
  const ready = await handleProductionApi(request('/api/v1/health'), env);
  assert.equal((await ready.json()).generation, true);
  const missing = await handleProductionApi(request('/api/v1/health'),
    { ...env, DEEPSEEK_API_KEY: undefined, OPENAI_API_KEY: 'other-key', OPENAI_MODEL: 'gpt-test' });
  assert.equal((await missing.json()).generation, false);
});

test('six public story worlds are seeded without publishing their packs', () => {
  const { db } = database();
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM theme_worlds WHERE status = 'published'").get().n, 6);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ready_packs WHERE status = 'published'").get().n, 0);
});

test('catalog follows D1 world publication without implying a pack is available', async () => {
  const { db, binding } = database();
  db.prepare("UPDATE theme_worlds SET status = 'paused' WHERE id = 'space'").run();
  const response = await handleProductionApi(request('/api/v1/catalog'), config(binding));
  assert.equal(response.status, 200);
  const catalog = await response.json();
  assert.equal(catalog.themes.length, 5);
  assert.equal(catalog.themes.some(theme => theme.id === 'space'), false);
  assert.equal(catalog.freeSampleThemeId, null);
  assert.equal(catalog.offers.every(offer => offer.saleEnabled === false), true);
});

test('pausing Celebration hides both free trial editions without affecting another paid theme', async () => {
  const { db, binding } = database();
  seedReady(db);
  db.prepare("UPDATE theme_worlds SET status = 'paused' WHERE id = 'celebration'").run();
  const env = { ...config(binding), FREE_SAMPLE_ENABLED: 'false' };
  const catalog = await handleProductionApi(request('/api/v1/catalog'), env).then(response => response.json());
  assert.equal(catalog.themes.some(theme => theme.id === 'celebration'), false);
  assert.equal(catalog.offers.find(offer => offer.sku === 'ready_home').saleEnabled, true);
  const sample = await handleProductionApi(request('/api/v1/samples/home/A4/player'), { ...env, FREE_SAMPLE_ENABLED: 'true' });
  assert.equal(sample.status, 404);
});

test('free sample checks actual R2 bytes even when custom metadata is absent', async () => {
  const { db, binding } = database();
  seedReady(db);
  const env = { ...config(binding), FREE_SAMPLE_ENABLED: 'true',
    PRIVATE_FILES: { get: async () => ({ body: new Uint8Array([37,80,68,70]) }) } };
  const catalog = await handleProductionApi(request('/api/v1/catalog'), env).then(response => response.json());
  assert.equal(catalog.freeSampleThemeId, 'celebration');
  assert.equal(catalog.themes.find(theme => theme.id === 'celebration').home.readyStatus, 'downloadable_trial');
  assert.equal(catalog.themes.find(theme => theme.id === 'celebration').classroom.freeSample, true);
  const good = await handleProductionApi(request('/api/v1/samples/home/A4/player'), env);
  assert.equal(good.status, 200);
  assert.deepEqual(new Uint8Array(await good.arrayBuffer()), new Uint8Array([37,80,68,70]));
  assert.equal((await handleProductionApi(request('/api/v1/samples/classroom/Letter/guide'), env)).status, 200);
  const bad = await handleProductionApi(request('/api/v1/samples/home/A4/player'),
    { ...env, PRIVATE_FILES: { get: async () => ({ body: new Uint8Array([37,80,68,71]) }) } });
  assert.equal(bad.status, 503);
  assert.equal((await bad.json()).error.code, 'FILE_INTEGRITY_FAILED');
  db.prepare("UPDATE ready_packs SET status = 'internal_test' WHERE id = 'pack-c01'").run();
  const incomplete = await handleProductionApi(request('/api/v1/catalog'), env).then(response => response.json());
  assert.equal(incomplete.freeSampleThemeId, null);
  assert.equal((await handleProductionApi(request('/api/v1/samples/home/A4/player'), env)).status, 404);
});

test('Celebration cannot enter paid ready-made checkout even when the sample flag is off', async () => {
  const { db, binding } = database();
  seedReady(db);
  const env = { ...config(binding), FREE_SAMPLE_ENABLED: 'false' };
  const response = await handleProductionApi(request('/api/v1/checkout-intents', 'POST',
    { ...purchase, themeId: 'celebration' }, { origin: 'https://adventure.example' }), env);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error.code, 'SAMPLE_IS_FREE');
});

test('purchase validation distinguishes ready packs from custom activity and rejects invalid groups', () => {
  assert.equal(validatePurchase(purchase).spec.kind, 'ready');
  const proposed = validatePurchase({ sku: 'custom_home', customIdea: 'A moon library', players: 4, age: '8-10', paper: 'A4', direction: 'mission', proposalTitle: 'The missing star map', proposalSummary: 'Follow a lost map through a paper observatory.' });
  assert.equal(proposed.spec.proposalTitle, 'The missing star map');
  assert.equal(proposed.spec.proposalSummary, 'Follow a lost map through a paper observatory.');
  assert.equal(validatePurchase({ sku: 'ready_classroom', themeId: 'halloween', packVersion: 'v1', variantId: 'halloween' }).spec.variantId, 'halloween');
  assert.throws(() => validatePurchase({ sku: 'ready_classroom', themeId: 'halloween', packVersion: 'v1', variantId: 'christmas' }), /story wording/);
  assert.equal(validatePurchase({ sku: 'custom_classroom', customIdea: 'A moon library', players: 20, groups: 4, age: '8-10', paper: 'A4', direction: 'mission' }).spec.kind, 'custom');
  assert.throws(() => validatePurchase({ sku: 'custom_classroom', customIdea: 'A moon library', players: 20, groups: 21, age: '8-10', paper: 'A4', direction: 'mission' }), /groups/);
  const spec = validatePurchase({ sku: 'custom_home', customIdea: 'A moon library', players: 4, age: '8-10', paper: 'A4', direction: 'mission' }).spec;
  assert.doesNotThrow(() => validateSupportedRange(spec, { SUPPORTED_AGE_MIN: '6', SUPPORTED_AGE_MAX: '12', HOME_PLAYER_MAX: '8', CLASSROOM_STUDENT_MAX: '40' }));
  assert.throws(() => validateSupportedRange({ ...spec, age: '3-5' }, { SUPPORTED_AGE_MIN: '6', SUPPORTED_AGE_MAX: '12', HOME_PLAYER_MAX: '8', CLASSROOM_STUDENT_MAX: '40' }), /supported age range/);
});

test('classroom wording choice is snapshotted and serves only its selected private files', async () => {
  const { db, binding } = database();
  seedReady(db);
  db.prepare("INSERT INTO ready_packs (id,theme_world_id,setting,version,status,licence_version) VALUES ('pack-c05','halloween','classroom','v1','published','licence-1')").run();
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES ('price-class','ready_classroom','USD',1499,'price_test_class','exclusive',1)").run();
  const bytes = new Uint8Array([37,80,68,70]);
  const digest = createHash('sha256').update(bytes).digest('hex');
  for (const paper of ['A4','Letter']) for (const role of ['player','guide']) {
    db.prepare('INSERT INTO ready_pack_files (ready_pack_id,paper,role,r2_key,sha256,bytes) VALUES (?,?,?,?,?,?)').run('pack-c05',paper,role,`base/c05/${paper}/${role}.pdf`,digest,4);
    db.prepare("INSERT INTO ready_pack_variants (ready_pack_id,variant_id,paper,role,r2_key,sha256,bytes,status) VALUES (?,?,?,?,?,?,?,'published')").run('pack-c05','halloween',paper,role,`variant/c05/${paper}/${role}.pdf`,digest,4);
  }
  let requestedKey;
  const env = { ...config(binding),
    FETCH: async (url, init) => Response.json({ id: 'cs_variant', url: 'https://checkout.stripe.com/test',
      client_reference_id: new URLSearchParams(init.body).get('client_reference_id') }),
    PRIVATE_FILES: { get: async key => { requestedKey = key; return { body: bytes }; } } };
  const catalog = await handleProductionApi(request('/api/v1/catalog'), env).then(response => response.json());
  assert.deepEqual(catalog.themes.find(theme => theme.id === 'halloween').classroom.variantIds, ['halloween']);
  const purchaseSpec = { sku: 'ready_classroom', themeId: 'halloween', packVersion: 'v1', variantId: 'halloween', email: 'adult@example.com' };
  const checkout = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', purchaseSpec,
    { 'Idempotency-Key': 'classroom-variant-001', origin: 'https://adventure.example' }), env);
  assert.equal(checkout.status, 409);
  assert.equal((await checkout.json()).error.code, 'EDITION_RETIRED');
  // Existing orders remain versioned and downloadable after the former edition closes.
  const orderId = 'order-legacy-c05';
  const specJson = JSON.stringify(purchaseSpec);
  const emailHash = await sha256(`${env.SESSION_SECRET}|adult@example.com`);
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status) VALUES (?,'ready','ready_classroom',?,?,?,?,1499,'USD','published')")
    .run(orderId, specJson, await sha256(specJson), emailHash, 'price-class');
  db.prepare("INSERT INTO entitlements (id,order_id,ready_pack_id,status,access_expires_at) VALUES ('ent-variant',?,?,'active',datetime('now','+12 months'))").run(orderId,'pack-c05');
  const token = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash, exp: Math.floor(Date.now()/1000)+3600 });
  const file = await handleProductionApi(request(`/api/v1/files/${orderId}/player?paper=Letter`, 'GET', undefined,
    { cookie: `paw_session=${token}` }), env);
  assert.equal(file.status, 200);
  assert.equal(requestedKey, 'variant/c05/Letter/player.pdf');
  db.prepare("UPDATE ready_pack_variants SET status = 'internal_test' WHERE ready_pack_id = 'pack-c05'").run();
  const unpublished = await handleProductionApi(request('/api/v1/catalog'), env).then(response => response.json());
  assert.deepEqual(unpublished.themes.find(theme => theme.id === 'halloween').classroom.variantIds, []);
  const blocked = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', purchaseSpec,
    { 'Idempotency-Key': 'classroom-variant-002', origin: 'https://adventure.example' }), env);
  assert.equal(blocked.status, 409);
  assert.equal((await blocked.json()).error.code, 'EDITION_RETIRED');
});

test('signed email access tokens expire and reject tampering', async () => {
  const token = await signAccessToken('secret', { scope: 'session', emailHash: 'abc', exp: Math.floor(Date.now()/1000) + 10 });
  assert.equal((await verifyAccessToken('secret', token)).emailHash, 'abc');
  assert.equal(await verifyAccessToken('other', token), null);
  assert.equal(await verifyAccessToken('secret', token + 'x'), null);
  assert.equal(await verifyAccessToken('secret', token, Date.now() + 20000), null);
});

test('adult session state and sign-out reflect verified access without exposing an email', async () => {
  const { binding } = database();
  const env = config(binding);
  const anonymous = await handleProductionApi(request('/api/v1/auth/session'), env).then(response => response.json());
  assert.deepEqual(anonymous, { available: true, authenticated: false });
  const token = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: 'adult-hash', exp: Math.floor(Date.now()/1000) + 3600 });
  const signedIn = await handleProductionApi(request('/api/v1/auth/session', 'GET', undefined, { cookie: `paw_session=${token}` }), env).then(response => response.json());
  assert.deepEqual(signedIn, { available: true, authenticated: true });
  const foreignLogout = await handleProductionApi(request('/api/v1/auth/logout', 'POST', undefined, { origin: 'https://elsewhere.example' }), env);
  assert.equal(foreignLogout.status, 403);
  const logout = await handleProductionApi(request('/api/v1/auth/logout', 'POST', undefined, { origin: 'https://adventure.example' }), env);
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
});

test('isolated backend stage serves noindex pages and blocks robots', async () => {
  const env = { STAGE_PREVIEW: 'true', ASSETS: { fetch: async () => new Response('<h1>Stage</h1>', { headers: { 'content-type': 'text/html' } }) } };
  const page = await productionWorker.fetch(request('/en/'), env);
  assert.equal(page.headers.get('x-robots-tag'), 'noindex, nofollow');
  const robots = await productionWorker.fetch(request('/robots.txt'), env);
  assert.equal(await robots.text(), 'User-agent: *\nDisallow: /\n');
});

test('checkout requires an explicit current supply confirmation and binds its exact notice once', async () => {
  const {db,binding}=database();seedReady(db);let calls=0;
  const env={...config(binding),FETCH:async(_url,init)=>{calls++;const form=new URLSearchParams(init.body);return Response.json({id:'cs_confirmation',url:'https://checkout.stripe.com/fixture',client_reference_id:form.get('client_reference_id')});}};
  for(const serviceRequest of [null,{version:purchaseConsentVersion,requested:false},{version:'stale',requested:true}]){
    const response=await handleProductionApi(request('/api/v1/checkout-intents','POST',{...purchase,serviceRequest},{origin:env.PUBLIC_ORIGIN,'Idempotency-Key':'confirmation-test-request'}),env);
    assert.equal(response.status,400);assert.equal((await response.json()).error.code,'PURCHASE_CONFIRMATION_REQUIRED');
  }
  assert.equal(calls,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM orders').get().n,0);
  const headers={origin:env.PUBLIC_ORIGIN,'Idempotency-Key':'confirmation-test-request'};
  const result=await handleProductionApi(request('/api/v1/checkout-intents','POST',purchase,headers),env);assert.equal(result.status,201);
  assert.equal((await handleProductionApi(request('/api/v1/checkout-intents','POST',purchase,headers),env)).status,200);
  const order=db.prepare('SELECT * FROM orders').get(),spec=JSON.parse(order.purchase_spec_json),evidence=db.prepare("SELECT * FROM order_evidence WHERE event='supply_requested'").get();
  assert.equal(spec.serviceRequest.version,purchaseConsentVersion);assert.equal(spec.serviceRequest.statutoryRightsWaived,false);
  assert.equal(JSON.parse(evidence.details_json).specHash,order.purchase_spec_sha256);assert.equal(calls,1);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM order_evidence WHERE event='supply_requested'").get().n,1);
});

test('real API health and the live release gate agree on keys, flags and published policies',async()=>{
 const cases=[
  {name:'non-stage sandbox',patch:{},mode:'test'},
  {name:'test key with live flag',patch:{LIVE_PAYMENTS_ENABLED:'true'},mode:'test'},
  {name:'current sandbox path',patch:{STAGE_PREVIEW:'true',TEST_CHECKOUT_ENABLED:'true',LEGAL_RELEASED:'false',TAX_CONFIGURED:'false'},mode:'test'},
  {name:'live disabled',patch:{STRIPE_SECRET_KEY:'sk_live_fixture'},mode:'closed'},
  {name:'live complete',patch:{STRIPE_SECRET_KEY:'sk_live_fixture',LIVE_PAYMENTS_ENABLED:'true'},mode:'live'},
  {name:'live missing webhook',patch:{STRIPE_SECRET_KEY:'sk_live_fixture',LIVE_PAYMENTS_ENABLED:'true',STRIPE_WEBHOOK_SECRET:''},mode:'closed'},
  {name:'live missing secret',patch:{STRIPE_SECRET_KEY:'',LIVE_PAYMENTS_ENABLED:'true'},mode:'closed'},
  {name:'live tax not ready',patch:{STRIPE_SECRET_KEY:'sk_live_fixture',LIVE_PAYMENTS_ENABLED:'true',TAX_CONFIGURED:'false'},mode:'closed'},
  {name:'live legal release off',patch:{STRIPE_SECRET_KEY:'sk_live_fixture',LIVE_PAYMENTS_ENABLED:'true',LEGAL_RELEASED:'false'},mode:'closed'},
  {name:'live missing policy',patch:{STRIPE_SECRET_KEY:'sk_live_fixture',LIVE_PAYMENTS_ENABLED:'true'},missingPolicy:true,mode:'closed'},
  {name:'non-stage test missing policy',patch:{},missingPolicy:true,mode:'closed'},
  {name:'live key cannot use sandbox bypass',patch:{STRIPE_SECRET_KEY:'sk_live_fixture',STAGE_PREVIEW:'true',TEST_CHECKOUT_ENABLED:'true',LEGAL_RELEASED:'false',TAX_CONFIGURED:'false'},mode:'closed'},
  {name:'client key cannot enable checkout',patch:{STRIPE_SECRET_KEY:'pk_live_fixture',LIVE_PAYMENTS_ENABLED:'true'},mode:'closed'},
  {name:'unknown key cannot enable checkout',patch:{STRIPE_SECRET_KEY:'unknown_fixture',LIVE_PAYMENTS_ENABLED:'true'},mode:'closed'},
  {name:'non-string key cannot enable checkout',patch:{STRIPE_SECRET_KEY:123,LIVE_PAYMENTS_ENABLED:'true'},mode:'closed'},
 ];
 for(const keyType of ['sk','rk'])for(const item of cases){
  const {db,binding}=database();seedReady(db);if(item.missingPolicy)db.exec("DELETE FROM legal_documents WHERE kind='refunds'");
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:()=>assert.fail('Health must not enqueue')},...item.patch,FETCH:()=>assert.fail('Health must not call a provider')};
  if(keyType==='rk' && typeof env.STRIPE_SECRET_KEY==='string')env.STRIPE_SECRET_KEY=env.STRIPE_SECRET_KEY.replace(/^sk_/,'rk_');
  const response=await handleProductionApi(request('/api/v1/health'),env),health=await response.json();
  assert.equal(response.status,200,item.name);assert.equal(health.checkoutMode,item.mode,item.name);assert.equal(health.checkout,item.mode!=='closed',item.name);
  if(item.mode==='live')assert.doesNotThrow(()=>assertPaymentRuntime(health,{expectedMode:'live'}),item.name);
  else assert.throws(()=>assertPaymentRuntime(health,{expectedMode:'live'}),/declared live/,item.name);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM orders').get().n,0,item.name);
 }
});

for(const keyType of ['sk','rk'])for(const mode of ['test','live'])test(`${keyType} ${mode} checkout keeps the purchase mode, verified fulfillment and full-refund revocation`,async()=>{
  const {db,binding}=database();seedReady(db);
  if(mode==='live')db.exec("UPDATE price_versions SET tax_behavior='inclusive'");
  let form,calls=0;
  const sessionId=`cs_${mode}_fixture`,key=`${keyType}_${mode}_fixture`;
  const env={...config(binding),STRIPE_SECRET_KEY:key,LIVE_PAYMENTS_ENABLED:mode==='live'?'true':'false',FETCH:async(url,init)=>{
    if(url==='https://api.stripe.com/v1/prices/price_test_1')return Response.json({id:'price_test_1',livemode:true,active:true,type:'one_time',currency:'usd',unit_amount:999,tax_behavior:'inclusive'});
    assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');assert.equal(init.headers.authorization,`Bearer ${key}`);calls++;
    form=new URLSearchParams(init.body);
    return Response.json({id:sessionId,url:'https://checkout.stripe.com/fixture',client_reference_id:form.get('client_reference_id')});
  }};
  const response=await handleProductionApi(request('/api/v1/checkout-intents','POST',purchase,{origin:env.PUBLIC_ORIGIN,'Idempotency-Key':`key-mode-${keyType}-${mode}`}),env);
  assert.equal(response.status,201);
  const {orderId}=await response.json(),order=db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
  assert.equal(JSON.parse(order.purchase_spec_json).paymentMode,mode);assert.equal(calls,1);
  assert.equal(form.get('line_items[0][price]'),'price_test_1');assert.equal(form.get('automatic_tax[enabled]'),'false');
  const session={id:sessionId,livemode:mode==='live',client_reference_id:orderId,metadata:{order_id:orderId,spec_hash:order.purchase_spec_sha256},payment_status:'paid',currency:'usd',amount_subtotal:999,amount_total:999,payment_intent:'pi_fixture'};
  const send=async(event,badSignature=false)=>{
    const raw=JSON.stringify(event),timestamp=Math.floor(Date.now()/1000);
    const signature=createHmac('sha256',badSignature?'wrong-fixture':env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest('hex');
    return handleProductionApi(new Request('https://adventure.example/api/v1/stripe/webhook',{method:'POST',headers:{'Stripe-Signature':`t=${timestamp},v1=${signature}`},body:raw}),env);
  };
  const paid={id:'evt_paid_fixture',type:'checkout.session.completed',livemode:mode==='live',data:{object:session}};
  assert.equal((await send(paid,true)).status,400);assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(orderId).status,'pending_payment');
  assert.equal((await send(paid)).status,200);assert.equal((await send(paid).then(r=>r.json())).duplicate,true);
  assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(orderId).status,'published');assert.equal(db.prepare('SELECT COUNT(*) n FROM entitlements').get().n,1);
  const refund={id:'evt_refund_fixture',type:'charge.refunded',livemode:mode==='live',data:{object:{livemode:mode==='live',payment_intent:'pi_fixture',currency:'usd',amount:session.amount_total,amount_refunded:session.amount_total,refunded:true,refunds:{has_more:false,data:[{id:'re_fixture',amount:session.amount_total,currency:'usd',status:'succeeded',payment_intent:'pi_fixture'}]}}}};
  assert.equal((await send(refund)).status,200);assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(orderId).status,'refunded');
  assert.equal(db.prepare('SELECT status FROM entitlements WHERE order_id=?').get(orderId).status,'revoked');assert.equal(calls,1);
});

test('closed checkout fails before touching Stripe', async () => {
  const { binding } = database();
  const response = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', purchase, { 'Idempotency-Key': 'purchase-attempt-001' }), { ...config(binding), LEGAL_RELEASED: 'false' });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'CHECKOUT_NOT_READY');
});

test('JSON requests without Content-Length are still capped at 16 KiB', async () => {
  const { binding } = database();
  const oversized = new Request('https://adventure.example/api/v1/access-links', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://adventure.example' },
    body: JSON.stringify({ email: 'adult@example.com', extra: 'x'.repeat(17000) }),
  });
  const response = await handleProductionApi(oversized, config(binding));
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error.code, 'REQUEST_TOO_LARGE');
});

test('verified adults can remove a saved planning draft', async () => {
  const { db, binding } = database();
  const env = config(binding);
  const hash = await sha256(`${env.SESSION_SECRET}|adult@example.com`);
  db.prepare('INSERT INTO adult_drafts (email_hash,draft_json) VALUES (?,?)').run(hash, JSON.stringify({ themeId: 'dinosaur' }));
  const anonymous = await handleProductionApi(request('/api/v1/my-draft', 'DELETE'), env);
  assert.equal(anonymous.status, 401);
  const token = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: hash, exp: Math.floor(Date.now() / 1000) + 3600 });
  const response = await handleProductionApi(request('/api/v1/my-draft', 'DELETE', undefined, { cookie: `paw_session=${token}`, origin: 'https://adventure.example' }), env);
  assert.equal(response.status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM adult_drafts').get().n, 0);
});

test('verified Stripe payment grants only the matching ready pack and private files stay gated', async () => {
  const { db, binding } = database();
  seedReady(db);
  let checkoutInput; let emailSent = 0;
  const env = { ...config(binding), FETCH: async (url, init) => {
    if (url === 'https://api.resend.com/emails') { emailSent++; return Response.json({ id: 'email-1' }); }
    assert.match(url, /checkout\/sessions/);
    if (!init.body) return Response.json({ id: 'cs_test_001', customer_email: 'adult@example.com' });
    checkoutInput = new URLSearchParams(init.body);
    return Response.json({ id: 'cs_test_001', url: 'https://checkout.stripe.com/test', client_reference_id: checkoutInput.get('client_reference_id') });
  }, PRIVATE_FILES: { get: async () => ({ body: new Uint8Array([37,80,68,70]), customMetadata: { sha256: 'test-hash' } }) } };
  const checkout = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', purchase, { 'Idempotency-Key': 'purchase-attempt-001', origin: 'https://adventure.example' }), env);
  assert.equal(checkout.status, 201);
  const { orderId } = await checkout.json();
  assert.equal(checkoutInput.get('line_items[0][price]'), 'price_test_1');
  assert.equal(checkoutInput.get('automatic_tax[enabled]'), 'false');
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  assert.equal(JSON.parse(order.purchase_spec_json).onlineRedownloadMonths, 12);
  const session = { id: 'cs_test_001', client_reference_id: orderId, metadata: { order_id: orderId, spec_hash: order.purchase_spec_sha256 }, payment_status: 'paid', currency: 'usd', amount_subtotal: 999, amount_total: 999, payment_intent: 'pi_test_001' };
  async function sendEvent(event) {
    const raw = JSON.stringify(event);
    const timestamp = Math.floor(Date.now()/1000);
    const signature = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest('hex');
    return handleProductionApi(new Request('https://adventure.example/api/v1/stripe/webhook', { method: 'POST', headers: { 'Stripe-Signature': `t=${timestamp},v1=${signature}` }, body: raw }), env);
  }
  const mismatch = await sendEvent({ id: 'evt_bad', type: 'checkout.session.completed', data: { object: { ...session, amount_subtotal: 1499 } } });
  assert.equal(mismatch.status, 409);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM entitlements').get().n, 0);
  const event = { id: 'evt_good', type: 'checkout.session.completed', data: { object: session } };
  assert.equal((await sendEvent(event)).status, 200);
  assert.equal((await sendEvent(event).then(response => response.json())).duplicate, true);
  assert.equal(db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId).status, 'published');
  const readyEntitlement = db.prepare('SELECT ready_pack_id,access_expires_at FROM entitlements WHERE order_id = ?').get(orderId);
  assert.equal(readyEntitlement.ready_pack_id, 'pack-d02');
  assert.ok(Date.parse(`${readyEntitlement.access_expires_at.replace(' ', 'T')}Z`) > Date.now() + 360 * 86400000);
  assert.ok(Date.parse(`${readyEntitlement.access_expires_at.replace(' ', 'T')}Z`) < Date.now() + 367 * 86400000);
  await productionWorker.scheduled(null, env);
  assert.equal(emailSent, 1);
  assert.equal(db.prepare('SELECT status FROM delivery_notifications WHERE order_id = ?').get(orderId).status, 'sent');
  assert.equal((await handleProductionApi(request(`/api/v1/files/${orderId}/player`), env)).status, 401);
  const emailHash = await sha256(`${env.SESSION_SECRET}|adult@example.com`);
  const token = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash, exp: Math.floor(Date.now()/1000)+3600 });
  const file = await handleProductionApi(request(`/api/v1/files/${orderId}/player?paper=Letter`, 'GET', undefined, { cookie: `paw_session=${token}` }), env);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'application/pdf');
  const otherToken = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: 'somebody-else', exp: Math.floor(Date.now()/1000)+3600 });
  assert.equal((await handleProductionApi(request(`/api/v1/files/${orderId}/player`, 'GET', undefined, { cookie: `paw_session=${otherToken}` }), env)).status, 404);
  db.prepare("UPDATE entitlements SET access_expires_at = datetime('now','-1 day') WHERE order_id = ?").run(orderId);
  const expiredFile = await handleProductionApi(request(`/api/v1/files/${orderId}/player`, 'GET', undefined, { cookie: `paw_session=${token}` }), env);
  assert.equal(expiredFile.status, 403);
  assert.equal((await expiredFile.json()).error.code, 'ACCESS_EXPIRED');
  const expiredView = await handleProductionApi(request(`/api/v1/orders/${orderId}`, 'GET', undefined, { cookie: `paw_session=${token}` }), env);
  assert.equal((await expiredView.json()).filesReady, false);
  const refund = await sendEvent({ id: 'evt_refund', type: 'charge.refunded', livemode:false, data: { object: { livemode:false, payment_intent: 'pi_test_001', currency: 'usd', amount:999, refunded: true, amount_refunded: 999, refunds:{has_more:false,data:[{id:'re_fixture',amount:999,currency:'usd',status:'succeeded',payment_intent:'pi_test_001'}]} } } });
  assert.equal(refund.status, 200);
  assert.equal(db.prepare('SELECT status FROM entitlements WHERE order_id = ?').get(orderId).status, 'revoked');
  assert.equal((await handleProductionApi(request(`/api/v1/files/${orderId}/player`, 'GET', undefined, { cookie: `paw_session=${token}` }), env)).status, 404);
  const issue = await handleProductionApi(request(`/api/v1/orders/${orderId}/issues`, 'POST', { issueType: 'refund', description: 'The file was not usable and I need help.' }, { cookie: `paw_session=${token}`, origin: 'https://adventure.example' }), env);
  assert.equal(issue.status, 201);
  const cases = await handleProductionApi(request(`/api/v1/orders/${orderId}/issues`, 'GET', undefined, { cookie: `paw_session=${token}` }), env);
  const savedCase = (await cases.json()).cases[0];
  assert.equal(savedCase.issue_type, 'refund');
  assert.equal(savedCase.description, 'The file was not usable and I need help.');
  assert.equal((await handleProductionApi(request(`/api/v1/orders/${orderId}/issues`, 'GET', undefined, { cookie: `paw_session=${otherToken}` }), env)).status, 404);
});

test('custom checkout queues generation only after a verified paid webhook', async () => {
  const { db, binding } = database();
  seedReady(db);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES ('price-custom','custom_home','USD',1499,'price_custom_1','exclusive',1)").run();
  const queued = [];
  let checkoutForm;
  const env = { ...config(binding), OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model', GENERATION_QUEUE: { send: async item => queued.push(item) }, FETCH: async (_url, init) => {
    const form = new URLSearchParams(init.body);
    checkoutForm = form;
    return Response.json({ id: 'cs_custom_001', url: 'https://checkout.stripe.com/custom', client_reference_id: form.get('client_reference_id') });
  } };
  const input = await approvedCustomInput(env,{ sku: 'custom_home', customIdea: 'A moon library', players: 4, age: '8-10', paper: 'A4', direction: 'mission', email: 'adult@example.com' });
  const sessionToken = await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:await sha256(`${env.SESSION_SECRET}|${input.email}`),exp:Math.floor(Date.now()/1000)+3600});
  const { email: _accountEmail, ...signedInPurchase } = input;
  const checkout = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', signedInPurchase, { 'Idempotency-Key': 'custom-attempt-001', origin: 'https://adventure.example', cookie:`paw_session=${sessionToken}` }), env);
  assert.equal(checkout.status, 201);
  assert.equal(checkoutForm.get('customer_email'), null);
  const { orderId } = await checkout.json();
  assert.equal(db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId).status, 'pending_payment');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_activities').get().n, 0);
  assert.equal(queued.length, 0);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  assert.equal(order.purchaser_email_hash, await sha256(`${env.SESSION_SECRET}|adult@example.com`));
  const session = { id: 'cs_custom_001', client_reference_id: orderId, metadata: { order_id: orderId, spec_hash: order.purchase_spec_sha256 }, payment_status: 'paid', currency: 'usd', amount_subtotal: 1499, amount_total: 1499, payment_intent: 'pi_custom_001' };
  const raw = JSON.stringify({ id: 'evt_custom_001', type: 'checkout.session.completed', data: { object: session } });
  const timestamp = Math.floor(Date.now()/1000);
  const signature = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest('hex');
  const response = await handleProductionApi(new Request('https://adventure.example/api/v1/stripe/webhook', { method: 'POST', headers: { 'Stripe-Signature': `t=${timestamp},v1=${signature}` }, body: raw }), env);
  assert.equal(response.status, 200);
  assert.equal(db.prepare('SELECT status FROM custom_activities WHERE order_id = ?').get(orderId).status, 'queued');
  assert.equal(queued.length, 1);
  assert.equal(queued[0].orderId, orderId);
});

test('v3 checkout and duplicate webhook queue only the paid plan',async()=>{
  const {db,binding}=database();seedReady(db);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES ('v3-checkout-price','custom_home','USD',1499,'price_v3','exclusive',1)").run();
  const queued=[];let checkoutForm;
  const env={...config(binding),OPENAI_API_KEY:'test',OPENAI_MODEL:'test-model',GENERATION_QUEUE:{send:async value=>queued.push(value)},FETCH:async(_url,init)=>{
    const form=new URLSearchParams(init.body);checkoutForm=form;return Response.json({id:'cs_v3',url:'https://checkout.stripe.com/v3',client_reference_id:form.get('client_reference_id')});
  }};
  const input={sku:'custom_home',creatorVersion:3,customIdea:'A stopped clock tower',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:['discussion']},email:'adult@example.com'};
  const owner=await sha256(`${env.SESSION_SECRET}|${input.email}`);
  const sessionToken=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const {email:_verifiedEmail,...signedInPurchase}=input;
  const checkout=await handleProductionApi(request('/api/v1/checkout-intents','POST',signedInPurchase,{origin:env.PUBLIC_ORIGIN,cookie:`paw_session=${sessionToken}`,'Idempotency-Key':'v3-checkout-attempt-001'}),env);
  assert.equal(checkout.status,201,JSON.stringify(await checkout.clone().json()));
  assert.equal(checkoutForm.get('customer_email'),null);
  const {orderId}=await checkout.json(),order=db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  assert.equal(order.purchaser_email_hash,owner);
  assert.equal(queued.length,0);
  const session={id:'cs_v3',client_reference_id:orderId,metadata:{order_id:orderId,spec_hash:order.purchase_spec_sha256},payment_status:'paid',currency:'usd',amount_subtotal:1499,amount_total:1499,payment_intent:'pi_v3'};
  const raw=JSON.stringify({id:'evt_v3',type:'checkout.session.completed',data:{object:session}}),time=Math.floor(Date.now()/1000);
  const signature=createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(`${time}.${raw}`).digest('hex');
  const event=()=>handleProductionApi(new Request(`${env.PUBLIC_ORIGIN}/api/v1/stripe/webhook`,{method:'POST',headers:{'Stripe-Signature':`t=${time},v1=${signature}`},body:raw}),env);
  assert.equal((await event()).status,200);assert.equal((await event()).status,200);
  assert.equal(queued.length,2);assert.deepEqual(queued[0],{type:'plan',requestId:`plan-${orderId}-initial`});
  assert.deepEqual(queued[1],queued[0]);
  assert.equal(db.prepare('SELECT status FROM custom_activities WHERE order_id = ?').get(orderId).status,'queued');
  await productionWorker.scheduled(null,env);
  assert.deepEqual(queued.at(-1),queued[0]);
});

test('custom story validator requires five linked stages; PDF keeps answers out of player pack', () => {
  const spec = validatePurchase({ sku: 'custom_home', customIdea: 'The garden compass', players: 4, age: '8-10', paper: 'Letter', direction: 'mission' }).spec;
  const stages = Array.from({ length: 5 }, (_, index) => ({ title: `Stage ${index+1}`, clue: 'Choose the card with the matching route symbol.', options: ['Sun card', 'Moon card', 'Star card'], answerIndex: 0,
    explanation: 'The route symbol is the sun.', hint: 'Look at the top corner.', prerequisite: index ? `CODE-${index}` : 'START', unlock: `CODE-${index+1}` }));
  const story = validateGeneratedStory({ title: 'Garden Compass', introduction: 'A team adventure begins.', ending: 'The team celebrates.', groupInstructions: '', stages }, spec);
  const player = new TextDecoder().decode(buildGamePdf(story, spec, 'player'));
  const guide = new TextDecoder().decode(buildGamePdf(story, spec, 'guide'));
  assert.match(player, /^%PDF-1\.4/);
  assert.match(player, /Garden Compass/);
  assert.doesNotMatch(player, /Answer:/);
  assert.match(guide, /Answer: A/);
  assert.throws(() => validateGeneratedStory({ ...story, stages: story.stages.slice(1) }, spec), /five connected stages/);
});

test('paid custom queue job generates private player and guide PDFs, then publishes entitlement', async () => {
  const { db, binding } = database();
  const spec = validatePurchase({ sku: 'custom_home', customIdea: 'A garden map', players: 4, age: '8-10', paper: 'A4', direction: 'mission' }).spec;
  const specJson = JSON.stringify({ ...spec, onlineRedownloadMonths: productRights.onlineRedownloadMonths, accessPolicyVersion: productRights.version });
  const specHash = await sha256(specJson);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('custom-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status) VALUES ('order-1','custom','custom_home',?,?,?,?,1499,'USD','paid')").run(specJson,specHash,'email-hash','custom-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('activity-order-1','order-1','queued',?)").run(specJson);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit) VALUES ('ent-1','order-1','activity-order-1','active',2)").run();
  const stages = Array.from({ length: 5 }, (_, index) => ({ title: `Clue ${index + 1}`, clue: 'Choose the marker that matches the trail.', options: ['Sun marker', 'Moon marker', 'Star marker'], answerIndex: 0, explanation: 'The sun matches the trail.', hint: 'Look at the first symbol.', prerequisite: index ? `CODE-${index}` : 'START', unlock: `CODE-${index + 1}` }));
  const output = { title: 'Garden Trail', introduction: 'The group follows a friendly map.', ending: 'The group celebrates together.', groupInstructions: '', stages };
  const stored = new Map();
  const queued = [];
  let failRevisionOnce = false;
  let failGenerationOnce = true;
  const env = { ...config(binding), OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model', GENERATION_QUEUE: { send: async message => { queued.push(message); } }, FETCH: async (url, init) => {
    assert.match(url, /api\.openai\.com/);
    const name = JSON.parse(init.body).text.format.name;
    if (name === 'paper_adventure' && failGenerationOnce) { failGenerationOnce = false; return Response.json({ error: 'temporary provider failure' }, { status: 502 }); }
    if (name === 'revised_stage' && failRevisionOnce) { failRevisionOnce = false; return Response.json({ error: 'temporary provider failure' }, { status: 502 }); }
    const targetStage = name === 'revised_stage' ? JSON.parse(JSON.parse(init.body).input).stageNumber : null;
    const value = name === 'story_audit' ? { pass: true, issues: [] } : name === 'revised_stage' ? { ...stages[targetStage - 1], title: 'A gentler revised clue' } : output;
    return Response.json({ id: name === 'revised_stage' ? 'resp-2' : 'resp-1', output: [{ content: [{ type: 'output_text', text: JSON.stringify(value) }] }], usage: { input_tokens: 500, output_tokens: 800 } });
  }, PRIVATE_FILES: { put: async (key, bytes, options) => { stored.set(key, { bytes, options }); return { key }; }, get: async key => { const item = stored.get(key); return item && { body: item.bytes, customMetadata: item.options.customMetadata }; } } };
  let acknowledged = false;
  let generationRetried = false;
  await productionWorker.queue({ messages: [{ body: { orderId: 'order-1' }, ack: () => { throw new Error('Failed generation must not be acknowledged'); }, retry: () => { generationRetried = true; } }] }, env);
  assert.equal(generationRetried, true);
  assert.equal(db.prepare("SELECT status FROM custom_activities WHERE id = 'activity-order-1'").get().status, 'generating');
  await productionWorker.queue({ messages: [{ body: { orderId: 'order-1' }, ack: () => { acknowledged = true; }, retry: () => { throw new Error('The generation retry should succeed'); } }] }, env);
  assert.equal(acknowledged, true);
  assert.equal(db.prepare("SELECT status FROM orders WHERE id = 'order-1'").get().status, 'published');
  assert.equal(db.prepare("SELECT status FROM custom_activities WHERE id = 'activity-order-1'").get().status, 'published');
  const customEntitlement = db.prepare("SELECT access_expires_at,revision_expires_at FROM entitlements WHERE order_id = 'order-1'").get();
  assert.ok(Date.parse(`${customEntitlement.access_expires_at.replace(' ', 'T')}Z`) > Date.now() + 360 * 86400000);
  assert.ok(Date.parse(`${customEntitlement.access_expires_at.replace(' ', 'T')}Z`) < Date.now() + 367 * 86400000);
  assert.ok(Date.parse(`${customEntitlement.revision_expires_at.replace(' ', 'T')}Z`) < Date.now() + 31 * 86400000);
  assert.equal(db.prepare("SELECT input_tokens FROM generation_usage WHERE order_id = 'order-1' AND status = 'published'").get().input_tokens, 1000);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM generation_usage WHERE order_id = 'order-1' AND status = 'failed'").get().n, 1);
  assert.deepEqual(db.prepare("SELECT status,phase,round_number,trigger_kind FROM generation_usage WHERE order_id = 'order-1' AND status IN ('failed','published') ORDER BY attempt").all().map(row=>({...row})), [
    {status:'failed',phase:'story',round_number:1,trigger_kind:'initial'},
    {status:'published',phase:'delivered',round_number:1,trigger_kind:'automatic_retry'},
  ]);
  assert.equal(stored.size, 3);
  const player = new TextDecoder().decode(stored.get('custom/order-1/v1/player.pdf').bytes);
  assert.match(player, /^%PDF-1\.4/);
  assert.doesNotMatch(player, /Answer:/);
  const token = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: 'email-hash', exp: Math.floor(Date.now()/1000)+3600 });
  const revisionRequest = await handleProductionApi(request('/api/v1/orders/order-1/revisions', 'POST', { stageNumber: 2, instruction: 'Please make the second clue a little gentler.' }, { cookie: `paw_session=${token}`, origin: 'https://adventure.example' }), env);
  assert.equal(revisionRequest.status, 202);
  assert.equal(queued.length, 1);
  await productionWorker.queue({ messages: [{ body: queued[0], ack: () => {}, retry: () => { throw new Error('Unexpected revision retry'); } }] }, env);
  assert.equal(db.prepare("SELECT revision_success_used FROM entitlements WHERE order_id = 'order-1'").get().revision_success_used, 1);
  assert.equal(db.prepare("SELECT version_number FROM revision_requests WHERE order_id = 'order-1'").get().version_number, 2);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM artifact_versions WHERE custom_activity_id = 'activity-order-1'").get().n, 2);
  const secondRevision = await handleProductionApi(request('/api/v1/orders/order-1/revisions', 'POST', { stageNumber: 3, instruction: 'Please make the third clue easier to read aloud.' }, { cookie: `paw_session=${token}`, origin: 'https://adventure.example' }), env);
  assert.equal(secondRevision.status, 202);
  failRevisionOnce = true;
  let retried = false;
  await productionWorker.queue({ messages: [{ body: queued[1], ack: () => { throw new Error('Failed attempt must not be acknowledged'); }, retry: () => { retried = true; } }] }, env);
  assert.equal(retried, true);
  assert.equal(db.prepare("SELECT status,attempts FROM revision_requests WHERE id = ?").get(queued[1].revisionId).status, 'generating');
  assert.equal(db.prepare("SELECT attempts FROM revision_requests WHERE id = ?").get(queued[1].revisionId).attempts, 1);
  await productionWorker.queue({ messages: [{ body: queued[1], ack: () => {}, retry: () => { throw new Error('The retry should succeed'); } }] }, env);
  assert.equal(db.prepare("SELECT status,attempts FROM revision_requests WHERE id = ?").get(queued[1].revisionId).status, 'published');
  assert.equal(db.prepare("SELECT attempts FROM revision_requests WHERE id = ?").get(queued[1].revisionId).attempts, 2);
  assert.equal(db.prepare("SELECT revision_success_used FROM entitlements WHERE order_id = 'order-1'").get().revision_success_used, 2);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM artifact_versions WHERE custom_activity_id = 'activity-order-1'").get().n, 3);
  db.prepare("UPDATE entitlements SET access_expires_at = datetime('now','-1 day') WHERE order_id = 'order-1'").run();
  const expiredCustomFile = await handleProductionApi(request('/api/v1/files/order-1/player', 'GET', undefined, { cookie: `paw_session=${token}` }), env);
  assert.equal(expiredCustomFile.status, 403);
});

test('a failed PDF write resumes from the checked story without paying for another model call', async () => {
  const { db, binding } = database();
  const base = validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'A clock tower that stopped at noon',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec;
  base.gamePackVersion=1; // Simulate a legacy paid order already in delivery.
  delete base.packContractVersion;delete base.packCopyVersion;
  const plan = planFixture(base);
  const purchase = {...base,onlineRedownloadMonths:productRights.onlineRedownloadMonths,accessPolicyVersion:productRights.version};
  const confirmed = {...purchase,plan,planConfirmed:true};
  const story = {title:plan.title,introduction:plan.opening,ending:'The team restores the clock.',groupInstructions:'',stages:plan.stages.map((stage,index)=>({
    title:stage.title,mechanic:stage.mechanic,clue:'The printed note says the sun marker is correct; moon and star do not match.',
    options:['Sun marker','Moon marker','Star marker'],answerIndex:0,explanation:'The sun marker matches the printed note.',hint:'Read the note.',
    prerequisite:index ? `CODE-${index}` : 'START',unlock:`CODE-${index+1}`,
  }))};
  const purchaseJson = JSON.stringify(purchase);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('checkpoint-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('checkpoint-order','custom','custom_home',?,?,?,?,1499,'USD','paid',CURRENT_TIMESTAMP)").run(purchaseJson,await sha256(purchaseJson),'owner-hash','checkpoint-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('checkpoint-activity','checkpoint-order','queued',?)").run(JSON.stringify(confirmed));
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,active_version,confirmed_version) VALUES ('checkpoint-order','confirmed',1,1)").run();
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit) VALUES ('checkpoint-entitlement','checkpoint-order','checkpoint-activity','active',2)").run();
  let modelCalls = 0;
  let failPdfWrite = true;
  const saved = new Map();
  const env = {...config(binding),OPENAI_API_KEY:'test',OPENAI_MODEL:'test-model',FETCH:async (_,options)=>{
    modelCalls++;
    const value = JSON.parse(options.body).text.format.name === 'story_audit' ? {pass:true,issues:[]} : story;
    return Response.json({id:`model-${modelCalls}`,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:5}});
  },PRIVATE_FILES:{put:async(key,bytes,options)=>{
    if (key.endsWith('/player.pdf') && failPdfWrite) {failPdfWrite=false;throw Error('Temporary R2 write failure');}
    saved.set(key,{bytes,options});
  },head:async key=>saved.has(key)?{customMetadata:saved.get(key).options.customMetadata}:null}};
  const job = {messages:[{body:{orderId:'checkpoint-order'},ack(){},retry(){}}]};
  await productionWorker.queue(job,env);
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='checkpoint-order'").get().status,'fulfilling');
  assert.equal(db.prepare("SELECT status,phase,input_tokens,output_tokens FROM generation_usage WHERE order_id='checkpoint-order' AND attempt=1").get().phase,'storage');
  assert.equal(db.prepare("SELECT story_json FROM custom_story_checkpoints WHERE order_id='checkpoint-order'").get().story_json.length > 100,true);
  assert.equal(modelCalls,2);
  await productionWorker.queue(job,env);
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='checkpoint-order'").get().status,'published');
  assert.equal(modelCalls,2,'PDF delivery must reuse the validated story');
  assert.equal(db.prepare("SELECT input_tokens FROM generation_usage WHERE order_id='checkpoint-order' AND attempt=1").get().input_tokens,20);
  assert.equal(db.prepare("SELECT input_tokens FROM generation_usage WHERE order_id='checkpoint-order' AND attempt=2").get().input_tokens,null);
  assert.ok(saved.has('custom/checkpoint-order/v1/player.pdf'));
  assert.ok(saved.has('custom/checkpoint-order/v1/guide.pdf'));
});

test('exhausted story quality repairs stop automatic retries and retain their billed usage', async () => {
  const { db, binding } = database();
  const spec = validatePurchase({sku:'custom_home',customIdea:'A garden map',players:4,age:'8-10',paper:'A4',direction:'mission'}).spec;
  const stored = JSON.stringify({...spec,onlineRedownloadMonths:productRights.onlineRedownloadMonths,accessPolicyVersion:productRights.version});
  const stages = Array.from({length:5},(_,index)=>({title:`Stage ${index+1}`,clue:'Choose the sun marker.',options:['Sun','Moon','Star'],answerIndex:0,explanation:'The sun matches.',hint:'Read the note.',prerequisite:index?`CODE-${index}`:'START',unlock:`CODE-${index+1}`}));
  const story = {title:'Garden route',introduction:'Follow the paper clues.',ending:'The team celebrates.',groupInstructions:'',stages};
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('qa-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('qa-order','custom','custom_home',?,?,?,?,1499,'USD','paid',CURRENT_TIMESTAMP)").run(stored,await sha256(stored),'qa-owner','qa-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('qa-activity','qa-order','queued',?)").run(stored);
  let calls = 0;
  const env = {...config(binding),OPENAI_API_KEY:'test',OPENAI_MODEL:'test-model',FETCH:async(_,options)=>{
    calls++;
    const value = JSON.parse(options.body).text.format.name === 'story_audit' ? {pass:false,issues:['Ambiguous clue.']} : story;
    return Response.json({id:`qa-${calls}`,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:5}});
  },PRIVATE_FILES:{put:async()=>{throw Error('No PDF should be written');}}};
  const job = {messages:[{body:{orderId:'qa-order'},ack(){},retry(){}}]};
  await productionWorker.queue(job,env);
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='qa-order'").get().status,'failed');
  assert.deepEqual({...db.prepare("SELECT phase,error_code,input_tokens,output_tokens FROM generation_usage WHERE order_id='qa-order'").get()},{
    phase:'story',error_code:'GENERATION_QA_FAILED',input_tokens:60,output_tokens:30,
  });
  assert.match(db.prepare("SELECT error_detail FROM generation_usage WHERE order_id='qa-order'").get().error_detail,/Ambiguous clue/);
  await productionWorker.queue(job,env);
  assert.equal(calls,6,'a terminal QA failure must not trigger another full generation');
});

test('terminal custom generation failure is visible and notifies the purchaser', async () => {
  const { db, binding } = database();
  const sent = [];
  const env = { ...config(binding), OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model',
    FETCH: async (url, init) => {
      if (url.includes('api.openai.com')) return Response.json({ error: 'provider unavailable' }, { status: 502 });
      if (url.includes('api.stripe.com')) return Response.json({ id: 'cs_failed', customer_email: 'adult@example.com' });
      if (url === 'https://api.resend.com/emails') { sent.push(JSON.parse(init.body)); return Response.json({ id: 'mail-failed' }); }
      throw new Error('Unexpected upstream request');
    },
    PRIVATE_FILES: { put: async () => { throw new Error('No file should be published'); } },
  };
  const spec = validatePurchase({ sku: 'custom_home', customIdea: 'A garden map', players: 4, age: '8-10', paper: 'A4', direction: 'mission' }).spec;
  const specJson = JSON.stringify({ ...spec, onlineRedownloadMonths: productRights.onlineRedownloadMonths, accessPolicyVersion: productRights.version });
  const hash = await sha256(`${env.SESSION_SECRET}|adult@example.com`);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('custom-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,stripe_checkout_session_id) VALUES ('order-failed','custom','custom_home',?,?,?,?,1499,'USD','paid','cs_failed')").run(specJson,await sha256(specJson),hash,'custom-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('activity-failed','order-failed','queued',?)").run(specJson);
  for (let attempt = 0; attempt < 2; attempt++) {
    await productionWorker.queue({ messages: [{ body: { orderId: 'order-failed' }, ack: () => { throw new Error('Failed work must not be acknowledged'); }, retry: () => {} }] }, env);
  }
  assert.equal(db.prepare("SELECT status FROM orders WHERE id = 'order-failed'").get().status, 'failed');
  assert.equal(db.prepare("SELECT status FROM delivery_notifications WHERE order_id = 'order-failed' AND kind = 'generation_failed'").get().status, 'pending');
  await productionWorker.scheduled(null, env);
  assert.equal(sent.length, 2);
  assert.match(sent[0].subject, /needs help/);
  assert.equal(sent[1].to[0], 'support@paperadventure.app');
  assert.match(sent[1].subject, /Paid custom delivery stopped/);
  assert.equal(db.prepare("SELECT status FROM delivery_notifications WHERE order_id = 'order-failed' AND kind = 'generation_failed'").get().status, 'sent');
});

test('paid plan attempts do not exhaust PDF retries and a failed paid order can retry delivery once', async () => {
  const {db,binding}=database();
  const owner=await sha256('test-session-secret|adult@example.com');
  const spec=validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'A clock tower that stopped at noon',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec;
  const confirmed={...spec,plan:planFixture(spec),planConfirmed:true};
  const stored=JSON.stringify(spec);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('pdf-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('pdf-order','custom','custom_home',?,?,?,?,1499,'USD','paid',CURRENT_TIMESTAMP)").run(stored,await sha256(stored),owner,'pdf-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('pdf-activity','pdf-order','queued',?)").run(JSON.stringify(confirmed));
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,active_version,confirmed_version) VALUES ('pdf-order','confirmed',1,1)").run();
  db.prepare("INSERT INTO generation_usage (order_id,attempt,model,status) VALUES ('pdf-order',1,'fixture','plan-failed'),('pdf-order',2,'fixture','plan-published')").run();
  const jobs=[];
  const env={...config(binding),OPENAI_API_KEY:'test',OPENAI_MODEL:'test-model',GENERATION_QUEUE:{send:async job=>jobs.push(job)},FETCH:async()=>Response.json({error:'provider unavailable'},{status:502}),PRIVATE_FILES:{put:async()=>{throw Error('No PDF expected');}}};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const run=()=>productionWorker.queue({messages:[{body:{orderId:'pdf-order'},ack(){throw Error('A failed job cannot be acknowledged');},retry(){}}]},env);
  await run();
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='pdf-order'").get().status,'fulfilling','a plan failure must not consume a PDF attempt');
  await run();
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='pdf-order'").get().status,'failed');
  let view=await handleProductionApi(request('/api/v1/orders/pdf-order','GET',undefined,headers),env).then(r=>r.json());
  assert.equal(view.deliveryRetryAvailable,true);
  let shelf=await handleProductionApi(request('/api/v1/my-orders','GET',undefined,headers),env).then(r=>r.json());
  assert.equal(shelf.orders.find(order=>order.id==='pdf-order').deliveryRetryAvailable,true);
  const retry=()=>handleProductionApi(request('/api/v1/orders/pdf-order/retry-delivery','POST',undefined,headers),env);
  assert.equal((await retry()).status,202);
  assert.equal(jobs.length,1);
  assert.equal((await retry()).status,404,'a queued order cannot start another retry');
  assert.equal(db.prepare("SELECT status,delivery_retry_used,delivery_retry_baseline FROM custom_activities WHERE order_id='pdf-order'").get().delivery_retry_baseline,2);
  await run();
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='pdf-order'").get().status,'fulfilling');
  await run();
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='pdf-order'").get().status,'failed');
  view=await handleProductionApi(request('/api/v1/orders/pdf-order','GET',undefined,headers),env).then(r=>r.json());
  assert.equal(view.deliveryRetryAvailable,false);
  assert.equal(view.pdfGenerationHistory.length,4);
  assert.deepEqual(view.pdfGenerationHistory.map(item=>[item.round,item.attemptInRound,item.trigger,item.status]),[
    [1,1,'initial','failed'],[1,2,'automatic_retry','failed'],
    [2,1,'customer_retry','failed'],[2,2,'automatic_retry','failed'],
  ]);
  assert.equal(view.pdfGenerationHistory[0].detailsRecorded,true);
  shelf=await handleProductionApi(request('/api/v1/my-orders','GET',undefined,headers),env).then(r=>r.json());
  assert.equal(shelf.orders.find(order=>order.id==='pdf-order').deliveryRetryAvailable,false);
});

test('the deterministic location recovery is scoped to the failed Clock Tower order',()=>{
  const {db}=database();
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_blueprint_deterministic_recovery_grants").get().n,0,
    'a migration never grants a recovery when the named failed order is absent');
  assert.throws(()=>db.prepare("INSERT INTO custom_blueprint_deterministic_recovery_grants (order_id,extra_calls,reason_code) VALUES ('missing',2,'UNPRINTED_LOCATION')").run(),/CHECK constraint failed/);
});

test('the causal link recovery is scoped to one provider-free revalidation',()=>{
  const {db}=database();
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_blueprint_causal_recovery_grants").get().n,0,
    'a migration never grants a recovery when the named failed order is absent');
  assert.throws(()=>db.prepare("INSERT INTO custom_blueprint_causal_recovery_grants (order_id,extra_calls,reason_code) VALUES ('missing',2,'PRINTED_CAUSAL_LINK')").run(),/CHECK constraint failed/);
});

test('the downstream continuation grant is scoped to four remaining calls on the Clock Tower order',()=>{
  const {db}=database();
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_generation_downstream_recovery_grants").get().n,0,
    'the migration does not grant calls when the exact exhausted order state is absent');
  assert.throws(()=>db.prepare("INSERT INTO custom_generation_downstream_recovery_grants (order_id,extra_calls,reason_code) VALUES ('missing',3,'POST_CAUSAL_PIPELINE')").run(),/CHECK constraint failed/);
  assert.throws(()=>db.prepare("INSERT INTO custom_generation_downstream_recovery_grants (order_id,extra_calls,reason_code) VALUES ('missing',4,'OTHER')").run(),/CHECK constraint failed/);
});

test('the clock-tower blueprint recovery is one order-scoped call and does not grant other orders',()=>{
  const {db}=database();
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_blueprint_recovery_grants").get().n,0,'a migration never grants a call when the named failed order is absent');
  assert.throws(()=>db.prepare("INSERT INTO custom_blueprint_recovery_grants (order_id,extra_calls,reason_code) VALUES ('missing',2,'STORY_REPAIR_ROUTING')").run(),/CHECK constraint failed/);
});

test('the repeated-action recovery reserves one call only for the unchanged failed paid order',()=>{
  const {db}=database(),orderId='8f5d8f98-694d-465f-8cef-4d80b9ad6bef';
  const migration=readFileSync(new URL('./migrations/0037_order_8f5d_material_recovery.sql',import.meta.url),'utf8');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_generation_recovery_grants').get().n,0);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('repeat-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home','{}','hash','owner','repeat-price',1499,'USD','failed',CURRENT_TIMESTAMP)").run(orderId);
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json,generation_version) VALUES ('repeat-activity',?,'failed','{}',2)").run(orderId);
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,active_version,confirmed_version) VALUES (?,'confirmed',1,1)").run(orderId);
  db.prepare("INSERT INTO generation_usage (order_id,attempt,model,status,phase,error_code) VALUES (?,1,'fixture','failed','story','STAGED_GENERATION_STOPPED')").run(orderId);
  const insert=db.prepare("INSERT INTO custom_generation_calls (id,order_id,phase,stage_number,status,model,error_code,error_detail,result_json) VALUES (?,?, 'blueprint_material',2,'failed','fixture','BLUEPRINT_INVALID',?,?)");
  insert.run('repeat-one',orderId,'Checkpoint 2 repeats a printed action from an earlier checkpoint.','{}');
  db.exec(migration);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_generation_recovery_grants').get().n,0,'one failed call is not an exhausted step');
  insert.run('repeat-two',orderId,'Checkpoint 2 repeats a printed action from an earlier checkpoint.','{}');
  db.exec(migration);db.exec(migration);
  assert.deepEqual({...db.prepare('SELECT stage_number,extra_calls,reason_code FROM custom_generation_recovery_grants WHERE order_id = ?').get(orderId)},
    {stage_number:2,extra_calls:1,reason_code:'REPEATED_ORDER_ACTION'});
  assert.equal(db.prepare('SELECT status FROM custom_activities WHERE order_id = ?').get(orderId).status,'failed','migration does not start generation');
  assert.equal(db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId).status,'failed');
});

test('a stopped printed-copy transport request offers one owner-initiated continuation without model work at click time',async()=>{
  const {db,binding}=database(),owner=await sha256('test-session-secret|adult@example.com'),jobs=[];
  const spec={...validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'An upside-down hotel mystery',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec,packCopyVersion:1};
  const stored=JSON.stringify(spec);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('copy-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('copy-order','custom','custom_home',?,?,?,?,1499,'USD','failed',CURRENT_TIMESTAMP)").run(stored,await sha256(stored),owner,'copy-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json,generation_version) VALUES ('copy-activity','copy-order','failed',?,2)").run(JSON.stringify({...spec,plan:planFixture(spec),planConfirmed:true}));
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,active_version,confirmed_version) VALUES ('copy-order','confirmed',1,1)").run();
  db.prepare("INSERT INTO generation_usage (order_id,attempt,model,status,phase,error_code) VALUES ('copy-order',1,'fixture','failed','story','STAGED_GENERATION_STOPPED')").run();
  db.prepare("INSERT INTO custom_delivery_copy (order_id,policy,source_sha256,spec_sha256,calls) VALUES ('copy-order',?,?,?,1)").run(COPY_POLICY,'source-hash','spec-hash');
  for(let stage=1;stage<=5;stage++)db.prepare("INSERT INTO custom_game_stages (order_id,stage_number,blueprint_sha256,stage_json) VALUES ('copy-order',?,'blueprint','{}')").run(stage);
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>jobs.push(job)}};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const get=path=>handleProductionApi(request(path,'GET',undefined,headers),env).then(response=>response.json());
  assert.equal((await get('/api/v1/orders/copy-order')).deliveryRetryAvailable,true);
  assert.equal((await get('/api/v1/my-orders')).orders.find(order=>order.id==='copy-order').deliveryRetryAvailable,true);
  const retry=await handleProductionApi(request('/api/v1/orders/copy-order/retry-delivery','POST',undefined,headers),env);
  assert.equal(retry.status,202);
  assert.deepEqual(jobs,[{orderId:'copy-order'}]);
  assert.deepEqual({...db.prepare('SELECT repair_calls,audit_calls FROM custom_delivery_copy_transport_recoveries').get()},{repair_calls:0,audit_calls:0});
  assert.equal(db.prepare('SELECT calls FROM custom_delivery_copy').get().calls,1);
  assert.equal((await handleProductionApi(request('/api/v1/orders/copy-order/retry-delivery','POST',undefined,headers),env)).status,404);
});

test('a stopped draft frame offers one owner-initiated continuation from its saved candidate',async()=>{
  const {db,binding}=database(),owner=await sha256('test-session-secret|adult@example.com'),jobs=[];
  const spec=validatePurchase({sku:'custom_classroom',creatorVersion:3,customIdea:'A clock tower that stopped at noon',players:4,groups:1,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec;
  const stored=JSON.stringify(spec),orderId='draft-frame-order';
  const frame={problem:'The clock tower remains silent while the town waits.',actions:['Fit signal gear','Reset tower hands','Replace bell rope'],discoveries:[
    {finding:'The signal gear is missing.',consequence:'The drive path becomes usable.',supportsAction:'signal gear'},
    {finding:'The spare gear fits the shaft.',consequence:'The gear can turn without binding.',supportsAction:'signal gear'},
    {finding:'The decoded code is 1234.',consequence:'The parts stay aligned during repair.',supportsAction:'signal gear'},
    {finding:'The upper bridge reaches the gear room.',consequence:'The replacement can reach the tower.',supportsAction:'signal gear'},
  ]};
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('frame-price','custom_classroom','USD',1999,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_classroom',?,?,?,?,1999,'USD','failed',CURRENT_TIMESTAMP)").run(orderId,stored,await sha256(stored),owner,'frame-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json,generation_version) VALUES ('frame-activity',?,'failed',?,2)").run(orderId,JSON.stringify({...spec,plan:planFixture(spec),planConfirmed:true}));
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,active_version,confirmed_version) VALUES (?,'confirmed',1,1)").run(orderId);
  db.prepare("INSERT INTO generation_usage (order_id,attempt,model,status,phase,error_code) VALUES (?,1,'fixture','failed','story','STAGED_GENERATION_STOPPED')").run(orderId);
  db.prepare("INSERT INTO custom_generation_calls (id,order_id,phase,stage_number,status,model,error_code,error_detail,result_json) VALUES ('bad-frame',?,'blueprint_frame',0,'failed','fixture','BLUEPRINT_INVALID','Checkpoint 3 finding must describe the story rather than an answer code.',?)").run(orderId,JSON.stringify({storyFrame:frame}));
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>jobs.push(job)}};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const get=path=>handleProductionApi(request(path,'GET',undefined,headers),env).then(response=>response.json());
  assert.equal((await get(`/api/v1/orders/${orderId}`)).deliveryRetryAvailable,true);
  assert.equal((await get('/api/v1/my-orders')).orders.find(order=>order.id===orderId).deliveryRetryAvailable,true);
  const retry=await handleProductionApi(request(`/api/v1/orders/${orderId}/retry-delivery`,'POST',undefined,headers),env);
  assert.equal(retry.status,202);
  assert.deepEqual(jobs,[{orderId}]);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_generation_calls WHERE order_id = ?').get(orderId).n,1,'clicking continue does not call the model');
});

test('an exhausted consequence-length failure resumes either a saved candidate or saved steps without another blueprint model call',async()=>{
  for(const missingCandidate of [false,true]){
  const {db,binding}=database(),owner=await sha256('test-session-secret|adult@example.com'),jobs=[],files=new Map();
  const context=linkedClockContext(),spec={...clockSpec,creatorVersion:3,packExperienceVersion:3,packQualityVersion:15,packLayoutVersion:4,
    onlineRedownloadMonths:12,accessPolicyVersion:productRights.version};
  const frame={problem:context.spine.problem,actions:context.stages[4].material.items.map(item=>item.label),discoveries:[
    {finding:'The signal gear is missing.',consequence:'The signal gear report supports fitting the gear.',supportsAction:'signal gear'},
    {finding:'The spare gear fits the shaft.',consequence:'The gear chamber note supports fitting the gear.',supportsAction:'signal gear'},
    {finding:'The checked order protects the teeth.',consequence:'The step "Stop the signal" prepares the gear fitting, supporting the signal gear in the upper tower.',supportsAction:'signal gear'},
    {finding:'The upper bridge reaches the gear room.',consequence:'The open Upper bridge gives the team a route for the gear, supporting the signal gear in the tower.',supportsAction:'signal gear'},
  ]};
  const candidate={...context,storyFrame:frame,celebration:'The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.'};
  const orderId='saved-consequence-order',stored=JSON.stringify(spec);
  const purchaseSpec={...spec};delete purchaseSpec.plan;delete purchaseSpec.planConfirmed;
  const purchased=JSON.stringify(purchaseSpec);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('consequence-price','custom_classroom','USD',1999,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_classroom',?,?,?,?,1999,'USD','failed',CURRENT_TIMESTAMP)").run(orderId,purchased,await sha256(purchased),owner,'consequence-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json,generation_version,delivery_retry_used) VALUES ('consequence-activity',?,'failed',?,2,1)").run(orderId,stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit) VALUES ('consequence-entitlement',?,'consequence-activity','active',2)").run(orderId);
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,active_version,confirmed_version) VALUES (?,'confirmed',1,1)").run(orderId);
  db.prepare("INSERT INTO generation_usage (order_id,attempt,model,status,phase,error_code) VALUES (?,1,'fixture','failed','story','STAGED_GENERATION_STOPPED')").run(orderId);
  if(missingCandidate){
    const saved=db.prepare("INSERT INTO custom_generation_calls (id,order_id,phase,stage_number,status,model,result_json) VALUES (?,'saved-consequence-order',?,?,'passed','fixture',?)");
    saved.run('saved-frame','blueprint_frame',0,JSON.stringify(frame));
    for(let number=1;number<=5;number++)saved.run(`saved-material-${number}`,'blueprint_material',number,JSON.stringify(context.stages[number-1]));
    saved.run('saved-closing','blueprint_closing',0,JSON.stringify(candidate.celebration));
  }
  const failed=db.prepare("INSERT INTO custom_generation_calls (id,order_id,phase,stage_number,status,model,error_code,error_detail,result_json) VALUES (?,'saved-consequence-order','blueprint',0,'failed','fixture','UNEXPECTED',?,?)");
  for(let number=1;number<=5;number++)failed.run(`failed-consequence-${number}`,
    `Checkpoint ${number%2?3:4} consequence must contain a complete sentence under 100 characters.`,missingCandidate?null:JSON.stringify(candidate));
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>jobs.push(job)},
    PRIVATE_FILES:{put:async(key,body,options)=>files.set(key,{body,customMetadata:options.customMetadata}),head:async key=>files.has(key)?{customMetadata:files.get(key).customMetadata}:null},
    FETCH:async()=>{throw Error('A saved consequence recovery must not call the blueprint provider.');}};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const view=await handleProductionApi(request(`/api/v1/orders/${orderId}`,'GET',undefined,headers),env).then(response=>response.json());
  assert.equal(view.deliveryRetryAvailable,true);
  const retry=await handleProductionApi(request(`/api/v1/orders/${orderId}/retry-delivery`,'POST',undefined,headers),env);
  assert.equal(retry.status,202);
  assert.deepEqual(jobs,[{orderId}]);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_generation_calls WHERE order_id=? AND phase='blueprint'").get(orderId).n,5);
  for(let step=0;step<4&&db.prepare('SELECT status FROM orders WHERE id=?').get(orderId).status!=='published';step++){
    const job=jobs.shift();assert.ok(job);
    await productionWorker.queue({messages:[{body:job,ack(){},retry(){throw Error('fixture should not need a queue retry');}}]},env);
  }
  assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(orderId).status,'published');
  assert.equal(db.prepare("SELECT model FROM custom_generation_calls WHERE order_id=? AND phase='blueprint' AND status='passed'").get(orderId).model,'checked-rules-v1');
  assert.equal(files.size,3);
  assert.equal((await handleProductionApi(request(`/api/v1/orders/${orderId}/retry-delivery`,'POST',undefined,headers),env)).status,404);
  }
});

test('a stopped v15 material step can resume once on the same paid order',async()=>{
  const {db,binding}=database(),owner=await sha256('test-session-secret|adult@example.com'),jobs=[];
  const spec={...validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'A clock tower that stopped at noon',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec,packPlayAllocationVersion:0,packQualityVersion:15};
  assert.equal(spec.packQualityVersion,15);
  const stored=JSON.stringify(spec);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('material-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('material-order','custom','custom_home',?,?,?,?,1499,'USD','failed',CURRENT_TIMESTAMP)").run(stored,await sha256(stored),owner,'material-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json,generation_version) VALUES ('material-activity','material-order','failed',?,2)").run(JSON.stringify({...spec,plan:planFixture(spec),planConfirmed:true}));
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,active_version,confirmed_version) VALUES ('material-order','confirmed',1,1)").run();
  db.prepare("INSERT INTO generation_usage (order_id,attempt,model,status,phase,error_code) VALUES ('material-order',1,'fixture','failed','story','STAGED_GENERATION_STOPPED')").run();
  const insert=db.prepare("INSERT INTO custom_generation_calls (id,order_id,phase,stage_number,status,model,error_code,error_detail) VALUES (?,'material-order',?,?,?,'fixture',?,?)");
  insert.run('frame','blueprint_frame',0,'passed',null,null);
  insert.run('stage-one','blueprint_material',1,'passed',null,null);
  insert.run('stage-two-first','blueprint_material',2,'failed','BLUEPRINT_INVALID','Checkpoint 2 repeats a printed action from an earlier checkpoint.');
  insert.run('stage-two-second','blueprint_material',2,'failed','BLUEPRINT_INVALID','Checkpoint 2 labels must name fictional story pieces or actions, not worksheet instructions.');
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>jobs.push(job)}};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const get=path=>handleProductionApi(request(path,'GET',undefined,headers),env).then(response=>response.json());
  assert.equal((await get('/api/v1/orders/material-order')).deliveryRetryAvailable,true);
  assert.equal((await get('/api/v1/my-orders')).orders.find(order=>order.id==='material-order').deliveryRetryAvailable,true);
  const retry=await handleProductionApi(request('/api/v1/orders/material-order/retry-delivery','POST',undefined,headers),env);
  assert.equal(retry.status,202);
  assert.deepEqual(jobs,[{orderId:'material-order'}]);
  assert.equal(db.prepare("SELECT delivery_retry_used FROM custom_activities WHERE order_id='material-order'").get().delivery_retry_used,1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_generation_calls WHERE order_id='material-order'").get().n,4,'the recovery request does not invoke the model itself');
});

test('a default v14 order stopped on worksheet labels offers saved-material recovery',async()=>{
  const {db,binding}=database(),owner=await sha256('test-session-secret|adult@example.com');
  const spec=validatePurchase({sku:'custom_classroom',creatorVersion:3,customIdea:'An upside-down hotel mystery',players:4,groups:1,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec;
  assert.equal(spec.packQualityVersion,14);
  const stored=JSON.stringify(spec);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('v14-price','custom_classroom','USD',1999,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('v14-order','custom','custom_classroom',?,?,?,?,1999,'USD','failed',CURRENT_TIMESTAMP)").run(stored,await sha256(stored),owner,'v14-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json,generation_version) VALUES ('v14-activity','v14-order','failed',?,2)").run(JSON.stringify({...spec,plan:planFixture(spec),planConfirmed:true}));
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,active_version,confirmed_version) VALUES ('v14-order','confirmed',1,1)").run();
  db.prepare("INSERT INTO generation_usage (order_id,attempt,model,status,phase,error_code) VALUES ('v14-order',1,'fixture','failed','story','STAGED_GENERATION_STOPPED')").run();
  const insert=db.prepare("INSERT INTO custom_generation_calls (id,order_id,phase,stage_number,status,model,error_code,error_detail) VALUES (?,'v14-order',?,?,?,'fixture',?,?)");
  insert.run('v14-frame','blueprint_frame',0,'passed',null,null);
  for(let number=1;number<=3;number++)insert.run(`v14-stage-${number}`,'blueprint_material',number,'passed',null,null);
  insert.run('v14-fourth-first','blueprint_material',4,'failed','BLUEPRINT_INVALID','Checkpoint 4 labels must name fictional story pieces or actions, not worksheet instructions.');
  insert.run('v14-fourth-second','blueprint_material',4,'failed','BLUEPRINT_INVALID','Checkpoint 4 labels must name fictional story pieces or actions, not worksheet instructions.');
  const env=config(binding),token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const response=await handleProductionApi(request('/api/v1/orders/v14-order','GET',undefined,headers),env);
  assert.equal(response.status,200);
  assert.equal((await response.json()).deliveryRetryAvailable,true);
});

test('free proposal endpoint returns two short directions and enforces an IP budget', async () => {
  const { binding } = database();
  const env = { ...config(binding), LEGACY_PROPOSALS_ENABLED: 'true', OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model', FETCH: async () => Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ proposals: [{ id: 'mystery', title: 'Lost note', summary: 'Follow a missing note.' }, { id: 'mission', title: 'Shared map', summary: 'Rebuild a map together.' }] }) }] }], usage: { input_tokens: 90, output_tokens: 60 } }) };
  const input = { themeId: 'celebration', setting: 'home', players: 4, age: '8-10', paper: 'A4' };
  const anonymous = await handleProductionApi(request('/api/v1/proposals', 'POST', input, { 'cf-connecting-ip': '203.0.113.7', origin: 'https://adventure.example' }), env);
  assert.equal(anonymous.status, 401);
  const session = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: await sha256(`${env.SESSION_SECRET}|adult@example.com`), exp: Math.floor(Date.now()/1000)+3600 });
  const call = () => handleProductionApi(request('/api/v1/proposals', 'POST', input, { 'cf-connecting-ip': '203.0.113.7', origin: 'https://adventure.example', cookie: `paw_session=${session}` }), env);
  assert.equal((await call()).status, 200);
  assert.equal((await call()).status, 200);
  const limited = await call();
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error.code, 'PROPOSAL_LIMIT');
});

for(const keyType of ['sk','rk'])test(`Stripe ${keyType} sandbox checkout accepts any matching Google account and uses inline test prices without legal release`, async () => {
  const { db, binding } = database();
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES ('sandbox-home','custom_home','USD',1499,NULL,'exclusive',1)").run();
  let form; let sessionCount = 0;
  const env = { ...config(binding), STAGE_PREVIEW: 'true', TEST_CHECKOUT_ENABLED: 'true', CHECKOUT_ENABLED: 'false',
    LEGAL_RELEASED: 'false', TAX_CONFIGURED: 'false',
    STRIPE_SECRET_KEY: `${keyType}_test_fixture`,
    OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model', GENERATION_QUEUE: { send: async () => {} },
    FETCH: async (_url, init) => { assert.equal(init.headers.authorization,`Bearer ${keyType}_test_fixture`);form = new URLSearchParams(init.body); return Response.json({ id: 'cs_test_sandbox_' + (++sessionCount), url: 'https://checkout.stripe.com/test', client_reference_id: form.get('client_reference_id') }); } };
  const health = await handleProductionApi(request('/api/v1/health'), env);
  assert.equal((await health.json()).checkoutMode, 'test');
  const input = await approvedCustomInput(env,{ sku: 'custom_home', customIdea: 'A moon library', players: 4, age: '8-10', paper: 'A4', direction: 'mission', email: 'adult@example.com' });
  const headers = { 'Idempotency-Key': 'sandbox-attempt-001', origin: 'https://adventure.example' };
  const anonymous = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', input, headers), env);
  assert.equal(anonymous.status, 403);
  const token = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: await sha256(`${env.SESSION_SECRET}|adult@example.com`), exp: Math.floor(Date.now()/1000)+3600 });
  const checkout = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', input, { ...headers, cookie: `paw_session=${token}` }), env);
  assert.equal(checkout.status, 201);
  assert.equal((await checkout.json()).mode, 'stripe_test');
  assert.equal(JSON.parse(db.prepare('SELECT purchase_spec_json FROM orders LIMIT 1').get().purchase_spec_json).paymentMode,'test');
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '1499');
  assert.equal(form.get('line_items[0][price]'), null);
  assert.equal(form.get('automatic_tax[enabled]'), 'false');
  const { email: _sandboxEmail, ...signedInPurchase } = input;
  const directCheckout = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', signedInPurchase,
    { ...headers, 'Idempotency-Key': 'sandbox-direct-with-session', cookie: `paw_session=${token}` }), env);
  assert.equal(directCheckout.status, 201);
  assert.equal(form.get('customer_email'), null);
  const otherToken = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: await sha256(`${env.SESSION_SECRET}|other@example.com`), exp: Math.floor(Date.now()/1000)+3600 });
  const mismatched = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', input,
    { ...headers, 'Idempotency-Key': 'sandbox-attempt-mismatch', cookie: `paw_session=${otherToken}` }), env);
  assert.equal(mismatched.status, 403);
  assert.equal((await mismatched.json()).error.code, 'ACCOUNT_EMAIL_MISMATCH');
});

test('public test catalogue and first-page previews allow any adult account to buy fixed packs', async () => {
  const { db, binding } = database();
  db.prepare("INSERT INTO ready_packs (id,theme_world_id,setting,version,status,licence_version) VALUES ('stage-d02','dinosaur','home','v0.1','internal_test','draft-not-approved')").run();
  for (const paper of ['A4','Letter']) for (const role of ['player','guide'])
    db.prepare('INSERT INTO ready_pack_files (ready_pack_id,paper,role,r2_key,sha256,bytes) VALUES (?,?,?,?,?,?)').run('stage-d02',paper,role,`internal/draft-ready/dinosaur/home/${paper}/${role}.pdf`,'0'.repeat(64),4);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES ('sandbox-ready-home','ready_home','USD',999,NULL,'exclusive',1)").run();
  let form; let sessionCount = 0;
  const env = { ...config(binding), STAGE_PREVIEW: 'true', TEST_CHECKOUT_ENABLED: 'true', CHECKOUT_ENABLED: 'false',
    LEGAL_RELEASED: 'false', TAX_CONFIGURED: 'false',
    OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model', GENERATION_QUEUE: { send: async () => {} },
    FETCH: async (_url, init) => { form = new URLSearchParams(init.body); return Response.json({ id: 'cs_ready_sandbox_' + (++sessionCount), url: 'https://checkout.stripe.com/test-ready', client_reference_id: form.get('client_reference_id') }); } };
  const publicCatalog = await handleProductionApi(request('/api/v1/catalog'), env).then(response => response.json());
  assert.equal(publicCatalog.themes.find(theme => theme.id === 'dinosaur').home.readyStatus, 'test_ready');
  assert.equal(publicCatalog.offers.find(offer => offer.sku === 'ready_home').saleEnabled, true);
  assert.equal(publicCatalog.offers.find(offer => offer.sku === 'custom_home').saleEnabled, false);
  assert.equal((await handleProductionApi(request('/api/v1/test-packs'), env)).status, 200);
  const token = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: await sha256(`${env.SESSION_SECRET}|adult@example.com`), exp: Math.floor(Date.now()/1000)+3600 });
  const cookie = { cookie: `paw_session=${token}` };
  const privateCatalog = await handleProductionApi(request('/api/v1/test-packs', 'GET', undefined, cookie), env).then(response => response.json());
  const anonymousPreview = await handleProductionApi(request('/api/v1/test-pack-previews/dinosaur/home'), env);
  assert.equal(anonymousPreview.status, 404);
  let previewKey;
  env.PRIVATE_FILES = { get: async key => { previewKey = key; return { body: new Uint8Array([0xff,0xd8,...new Uint8Array(10000)]) }; } };
  const preview = await handleProductionApi(request('/api/v1/test-pack-previews/dinosaur/home'), env);
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get('content-type'), 'image/jpeg');
  assert.match(preview.headers.get('cache-control'), /public/);
  assert.equal(previewKey, 'internal/draft-previews/dinosaur/home/v0.1-p1.jpg');
  const openingPage = await handleProductionApi(request('/api/v1/test-pack-previews/dinosaur/home/2'), env);
  assert.equal(openingPage.status, 200);
  assert.equal(previewKey, 'internal/draft-previews/dinosaur/home/v0.1-p2.jpg');

  assert.deepEqual(privateCatalog.packs, [{ themeId: 'dinosaur', setting: 'home', version: 'v0.1', variantIds: [] }]);
  const input = { sku: 'ready_home', themeId: 'dinosaur', packVersion: 'v0.1', email: 'adult@example.com' };
  const wrongVersion = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', { ...input, packVersion: 'v9' }, { ...cookie, origin: 'https://adventure.example', 'Idempotency-Key': 'sandbox-ready-wrong' }), env);
  assert.equal(wrongVersion.status, 503);
  const checkout = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', input, { ...cookie, origin: 'https://adventure.example', 'Idempotency-Key': 'sandbox-ready-correct' }), env);
  assert.equal(checkout.status, 201);
  assert.equal((await checkout.json()).mode, 'stripe_test');
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '999');
  assert.equal(form.get('automatic_tax[enabled]'), 'false');
  const otherEmail = 'another.adult@example.com';
  const otherToken = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: await sha256(`${env.SESSION_SECRET}|${otherEmail}`), exp: Math.floor(Date.now()/1000)+3600 });
  const otherCheckout = await handleProductionApi(request('/api/v1/checkout-intents', 'POST',
    { ...input, email: otherEmail },
    { origin: 'https://adventure.example', 'Idempotency-Key': 'sandbox-ready-other-adult', cookie: `paw_session=${otherToken}` }), env);
  assert.equal(otherCheckout.status, 201);
  assert.equal((await otherCheckout.json()).mode, 'stripe_test');
});

test('adult email link can be used once and creates a private order session', async () => {
  const { binding } = database();
  let link;
  const env = { ...config(binding), FETCH: async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails');
    link = JSON.parse(init.body).text.match(/https:\/\/\S+/)[0];
    return Response.json({ id: 'email-1' });
  } };
  const sent = await handleProductionApi(request('/api/v1/access-links', 'POST', { email: 'ADULT@example.com' }, { origin: 'https://adventure.example', 'cf-connecting-ip': '203.0.113.8' }), env);
  assert.equal(sent.status, 200);
  assert.ok(link.includes('/api/v1/auth/verify?token='));
  const verified = await handleProductionApi(new Request(link), env);
  assert.equal(verified.status, 303);
  assert.match(verified.headers.get('set-cookie'), /HttpOnly/);
  assert.equal((await handleProductionApi(new Request(link), env)).status, 401);
  const cookie = verified.headers.get('set-cookie').split(';')[0];
  const orders = await handleProductionApi(request('/api/v1/my-orders', 'GET', undefined, { cookie }), env);
  assert.equal(orders.status, 200);
  assert.deepEqual((await orders.json()).orders, []);
});

test('Cloudflare Email binding delivers a one-use sign-in link without a Resend key', async () => {
  const { binding } = database();
  const sentMessages = [];
  const env = { ...config(binding), RESEND_API_KEY: undefined, EMAIL_FROM: 'support@paperadventure.app', EMAIL_PUBLIC_DESTINATIONS_READY: 'true',
    EMAIL: { send: async message => { sentMessages.push(message); return { messageId: 'cf-test-1' }; } },
    FETCH: async () => { throw new Error('Resend must not be called when Cloudflare Email is bound'); } };
  const unconfigured = await handleProductionApi(request('/api/v1/health'), { ...env, GOOGLE_CLIENT_ID: undefined });
  assert.equal((await unconfigured.json()).account, false);
  const health = await handleProductionApi(request('/api/v1/health'), env);
  assert.equal((await health.json()).account, true);
  const sent = await handleProductionApi(request('/api/v1/access-links', 'POST', { email: 'ADULT@example.com' },
    { origin: 'https://adventure.example', 'cf-connecting-ip': '203.0.113.9' }), env);
  assert.equal(sent.status, 200);
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].from, 'support@paperadventure.app');
  assert.equal(sentMessages[0].to, 'adult@example.com');
  const link = sentMessages[0].text.match(/https:\/\/\S+/)[0];
  assert.equal((await handleProductionApi(new Request(link), env)).status, 303);
  assert.equal((await handleProductionApi(new Request(link), env)).status, 401);
});

test('stage account gate permits only the configured delivery-test inbox', async () => {
  const { binding } = database();
  const sentMessages = [];
  const env = { ...config(binding), ACCOUNT_ENABLED: 'false', EMAIL_LOGIN_ENABLED: 'false', ACCOUNT_TEST_EMAIL: 'support@paperadventure.app', RESEND_API_KEY: undefined,
    EMAIL_FROM: 'support@paperadventure.app', EMAIL_PUBLIC_DESTINATIONS_READY: 'true',
    EMAIL: { send: async message => { sentMessages.push(message); return { messageId: 'stage-test-1' }; } } };
  const state = await handleProductionApi(request('/api/v1/auth/session'), env).then(response => response.json());
  assert.deepEqual(state, { available: false, authenticated: false });
  const blocked = await handleProductionApi(request('/api/v1/access-links', 'POST', { email: 'adult@example.com' },
    { origin: 'https://adventure.example', 'cf-connecting-ip': '203.0.113.10' }), env);
  assert.equal(blocked.status, 503);
  const allowed = await handleProductionApi(request('/api/v1/access-links', 'POST', { email: 'support@paperadventure.app' },
    { origin: 'https://adventure.example', 'cf-connecting-ip': '203.0.113.10' }), env);
  assert.equal(allowed.status, 200);
  assert.equal(sentMessages.length, 1);
});
test('Google sign-in config creates a short-lived nonce and rejects missing or invalid credentials', async () => {
  const { binding } = database();
  const env = config(binding);
  const disabled = await handleProductionApi(request('/api/v1/auth/google/config'), { ...env, ACCOUNT_ENABLED: 'false' });
  assert.deepEqual(await disabled.json(), { available: false });
  const configResponse = await handleProductionApi(request('/api/v1/auth/google/config'), env);
  const google = await configResponse.json();
  assert.equal(google.available, true);
  assert.equal(google.clientId, env.GOOGLE_CLIENT_ID);
  assert.match(google.nonce, /^[a-f0-9]{32}$/);
  assert.equal(google.expiresIn,300);
  const again=await handleProductionApi(request('/api/v1/auth/google/config','GET',undefined,{cookie:'paw_google_nonce='+google.nonce}),env);
  assert.equal((await again.json()).nonce,google.nonce,'a second account tab reuses the valid HttpOnly browser nonce');
  assert.match(configResponse.headers.get('set-cookie'), /HttpOnly.*SameSite=Lax/);
  const missingNonce = await handleProductionApi(request('/api/v1/auth/google', 'POST', { credential: 'invalid' },
    { origin: 'https://adventure.example' }), env);
  assert.equal(missingNonce.status, 403);
  const invalidCredential = await handleProductionApi(request('/api/v1/auth/google', 'POST', { credential: 'invalid' },
    { origin: 'https://adventure.example', cookie: 'paw_google_nonce=' + google.nonce }), env);
  assert.equal(invalidCredential.status, 401);
});



test('full creator previews sign both plans, failed attempts refund quota, and saved plans verify', async()=>{
  const {binding}=database();
  const input={creatorVersion:2,customIdea:'A journey mystery',setting:'home',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:['discussion']}};
  let fail=true;
  const env={...config(binding),LEGACY_PROPOSALS_ENABLED:'true',DEEPSEEK_API_KEY:'test-only',AI_PROVIDER:'deepseek',FETCH:async(_,init)=>{
    if(fail)return new Response('unavailable',{status:502});
    const spec=JSON.parse(JSON.parse(init.body).input);
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({proposals:[planFixture(spec),planFixture(spec,'mission')]})}]}]});
  }};
  const owner=await sha256(`${env.SESSION_SECRET}|adult@example.com`);
  const session=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${session}`,origin:env.PUBLIC_ORIGIN,'cf-connecting-ip':'203.0.113.7'};
  const call=()=>handleProductionApi(request('/api/v1/proposals','POST',input,headers),env);
  assert.equal((await call()).status,502);
  assert.equal((await handleProductionApi(request('/api/v1/proposals','GET',undefined,headers),env).then(r=>r.json())).remaining,2);
  fail=false;const result=await call();assert.equal(result.status,200);const body=await result.json();assert.equal(body.remaining,1);
  const plan=body.proposals[0];assert.equal(plan.stages.length,5);assert.ok(plan.previewToken);
  const draft={...input,direction:plan.id,plan,previewToken:plan.previewToken};
  const saved=await handleProductionApi(request('/api/v1/my-draft','PUT',draft,headers),env);assert.equal(saved.status,200);
  const tampered=await handleProductionApi(request('/api/v1/my-draft','PUT',{...draft,players:5},headers),env);assert.equal(tampered.status,409);
  const restored=await handleProductionApi(request('/api/v1/my-draft','GET',undefined,headers),env).then(r=>r.json());assert.equal(restored.draft.plan.title,plan.title);
});

test('concurrent preview requests reserve the same account allowance atomically',async()=>{
  const {binding}=database();
  const env={...config(binding),LEGACY_PROPOSALS_ENABLED:'true',DEEPSEEK_API_KEY:'test-only',AI_PROVIDER:'deepseek',FETCH:async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({proposals:[{id:'mystery',title:'First',summary:'First plan'},{id:'mission',title:'Second',summary:'Second plan'}]})}]}]})};
  const session=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:'test-owner',exp:Math.floor(Date.now()/1000)+3600});
  const input={customIdea:'A paper journey',setting:'home',players:4,age:'8-10',paper:'A4'};
  const statuses=await Promise.all(Array.from({length:3},()=>handleProductionApi(request('/api/v1/proposals','POST',input,{cookie:`paw_session=${session}`,origin:env.PUBLIC_ORIGIN,'cf-connecting-ip':'203.0.113.7'}),env).then(r=>r.status)));
  assert.deepEqual(statuses.sort(),[200,200,429]);
});

test('paid v3 plan is reviewed before PDFs and only successful changes spend allowance',async()=>{
  const {db,binding}=database();
  const owner=await sha256('test-session-secret|adult@example.com');
  const spec=validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'The clock tower stopped at noon',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec;
  const stored=JSON.stringify({...spec,onlineRedownloadMonths:12});
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('v3-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status) VALUES ('v3-order','custom','custom_home',?,?,?,?,1499,'USD','paid')").run(stored,await sha256(stored),owner,'v3-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('v3-activity','v3-order','queued',?)").run(stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit) VALUES ('v3-ent','v3-order','v3-activity','active',2)").run();
  db.prepare("INSERT INTO custom_plan_orders (order_id,status) VALUES ('v3-order','queued')").run();
  db.prepare("INSERT INTO custom_plan_requests (id,order_id,kind,status) VALUES ('v3-initial','v3-order','initial','queued')").run();
  let providerCalls=0,failAudit=true;
  const queued=[];
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture-model',GENERATION_QUEUE:{send:async job=>queued.push(job)},FETCH:async(_url,init)=>{
    providerCalls++;
    const sent=JSON.parse(init.body),name=sent.text.format.name;
    if(name==='paid_plan_audit')return failAudit?new Response('fixture audit unavailable',{status:502}):Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({pass:true,issues:[]})}]}]});
    assert.equal(name,'paid_adventure_plan');
    const input=JSON.parse(sent.input),plan=input.kind==='targeted'?structuredClone(input.previousPlan):planFixture(input.spec);
    if(input.kind==='full'){plan.stages[1].task+=' Check the clock face.';plan.stages[2].task+=' Ask the keeper.';plan.stages[1].scene='Beside the clock tower face';plan.stages[2].scene='At the clock tower paper desk';plan.stages[1].storyBeat='The clock keeper brings conflicting accounts of why the noon bell fell silent.';plan.stages[2].storyBeat='The apprentice brings a coded message about the stalled bell mechanism.';}
    if(input.kind==='targeted'){if(plan.premise)plan.premise+=' The clock has a paper dial.';else plan.opening+=' The clock has a paper dial.';}
    return Response.json({id:'response-plan',output:[{content:[{type:'output_text',text:JSON.stringify(plan)}]}],usage:{input_tokens:100,output_tokens:150}});
  }};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN,'Idempotency-Key':'paid-plan-change-0001'};
  const post=(body,key='paid-plan-change-0001')=>handleProductionApi(request('/api/v1/orders/v3-order/plan','POST',body,{...headers,'Idempotency-Key':key}),env);
  await productionWorker.queue({messages:[{body:{orderId:'v3-order'},ack(){},retry(){throw Error('unexpected retry');}}]},env);
  assert.equal(providerCalls,0,'PDF job must stop before plan approval');
  failAudit=false;
  await productionWorker.queue({messages:[{body:{type:'plan',requestId:'v3-initial'},ack(){},retry(){throw Error('unexpected retry');}}]},env);
  assert.equal(db.prepare("SELECT active_version FROM custom_plan_orders WHERE order_id='v3-order'").get().active_version,1);
  assert.equal(db.prepare("SELECT status FROM custom_activities WHERE order_id='v3-order'").get().status,'queued');
  assert.equal((await post({action:'rework',feedback:'Make the middle checkpoints less repetitive.'})).status,202);
  assert.equal((await post({action:'rework',feedback:'Make the middle checkpoints less repetitive.'})).status,200,'network retry reuses the same job');
  const requestId=queued.at(-1).requestId;
  failAudit=true;
  await productionWorker.queue({messages:[{body:{type:'plan',requestId},ack(){throw Error('failed audit cannot ack');},retry(){}}]},env);
  assert.equal(db.prepare("SELECT full_used FROM custom_plan_orders WHERE order_id='v3-order'").get().full_used,0);
  const checkpoint=db.prepare('SELECT checkpoint_json,plan_valid,provider_calls FROM custom_plan_work WHERE request_id=?').get(requestId);
  assert.equal(checkpoint.plan_valid,1);assert.equal(checkpoint.provider_calls,2);
  assert.ok(JSON.parse(checkpoint.checkpoint_json).candidate);
  const beforeResumeCalls=providerCalls;
  failAudit=false;
  await productionWorker.queue({messages:[{body:{type:'plan',requestId},ack(){},retry(){throw Error('unexpected retry');}}]},env);
  assert.equal(providerCalls-beforeResumeCalls,1,'redelivery only repeats the failed audit');
  assert.equal(db.prepare("SELECT full_used FROM custom_plan_orders WHERE order_id='v3-order'").get().full_used,1);
  assert.equal((await post({action:'edit',scope:'opening',feedback:'Please mention the paper clock earlier.'},'paid-plan-change-0002')).status,202);
  await productionWorker.queue({messages:[{body:queued.at(-1),ack(){},retry(){throw Error('unexpected retry');}}]},env);
  const viewed=await handleProductionApi(request('/api/v1/orders/v3-order','GET',undefined,headers),env).then(r=>r.json());
  assert.equal(viewed.gamePackVersion,2,'new paid orders identify the paper-material format');
  assert.equal(viewed.planReview.targetedUsed,1);assert.equal(viewed.planReview.versions.length,3);
  assert.equal((await post({action:'select',version:1},'paid-plan-select-0001')).status,200);
  assert.equal((await post({action:'confirm',version:1},'paid-plan-confirm-0001')).status,200);
  assert.equal(db.prepare("SELECT confirmed_version FROM custom_plan_orders WHERE order_id='v3-order'").get().confirmed_version,1);
  assert.equal(JSON.parse(db.prepare("SELECT story_spec_json FROM custom_activities WHERE order_id='v3-order'").get().story_spec_json).plan.title,viewed.planReview.versions[0].plan.title);
  assert.equal(queued.at(-1).orderId,'v3-order');
  assert.equal((await post({action:'rework',feedback:'Try again after approval.'},'paid-plan-change-0003')).status,409);
});

test('two old theme-plan failures gain one bounded correction without losing original PDFs',async()=>{
  const {db,binding}=database({includeThemeRecovery:false}),owner='theme-correction-owner',queued=[];
  const purchase=validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'Journey to the West with the Monkey King',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec;
  purchase.packQualityVersion=13;
  const oldPlan=planFixture(purchase);delete oldPlan.themeAnchors;delete oldPlan.storySceneVersion;for(const stage of oldPlan.stages)delete stage.storyBeat;
  const oldSpec={...purchase,plan:oldPlan,planConfirmed:true},stored=JSON.stringify(purchase);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('theme-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('theme-order','custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(stored,await sha256(stored),owner,'theme-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('theme-activity','theme-order','published',?)").run(JSON.stringify(oldSpec));
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit,access_expires_at) VALUES ('theme-entitlement','theme-order','theme-activity','active',2,datetime('now','+6 months'))").run();
  db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,pack_format_version,player_r2_key,guide_r2_key) VALUES ('theme-artifact','theme-activity',1,'published',2,'old/player.pdf','old/guide.pdf')").run();
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,active_version,confirmed_version) VALUES ('theme-order','confirmed',1,1)").run();
  db.prepare("INSERT INTO custom_plan_versions (order_id,version_number,plan_json,request_kind) VALUES ('theme-order',1,?,'initial')").run(JSON.stringify(oldPlan));
  let providerMode='upstream';
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',PRIVATE_FILES:{},GENERATION_QUEUE:{send:async job=>queued.push(job)},FETCH:async(_url,init)=>{
    if(providerMode==='upstream')return new Response('fixture provider error',{status:502});
    const payload=JSON.parse(init.body),input=JSON.parse(payload.input);
    const value=payload.text.format.name==='paid_plan_audit'?providerMode==='audit'?{pass:false,issues:[{code:'THEME_WEAK',fields:['premise'],reason:'The plan does not carry the purchased mythology into the events.',evidence:[{field:'premise',quote:input.plan.premise}]}]}:{pass:true,issues:[]}:(()=>{const plan=planFixture(input.spec);plan.premise='The Journey to the West companions search a mountain shrine for their missing travel document.';plan.stages[0].scene='At the Journey to the West shrine';plan.stages[1].scene='At the Journey to the West mountain path';return plan;})();
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:10}});
  }};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN,'Idempotency-Key':'free-theme-correction-0001'};
  const post=(body,key='free-theme-correction-0001')=>handleProductionApi(request('/api/v1/orders/theme-order/plan','POST',body,{...headers,'Idempotency-Key':key}),env);
  const view=()=>handleProductionApi(request('/api/v1/orders/theme-order','GET',undefined,headers),env).then(response=>response.json());
  assert.equal((await view()).themePlanRepairAvailable,true);
  assert.equal((await post({action:'quality_replan'})).status,202);
  assert.equal((await post({action:'quality_replan'})).status,200,'the same request is idempotent');
  assert.equal((await view()).themePlanRepairAvailable,false);
  await productionWorker.queue({messages:[{body:queued.shift(),ack(){},retry(){}}]},env);
  assert.equal(db.prepare("SELECT quality_replan_used FROM custom_plan_orders WHERE order_id='theme-order'").get().quality_replan_used,0);
  assert.equal((await view()).planReview.themeReplanAttempts,1);
  assert.equal((await view()).planReview.themeReplanFailureCode,'PLAN_UPSTREAM_FAILED');
  assert.equal(db.prepare("SELECT error_code,error_detail FROM generation_usage WHERE order_id='theme-order' AND status='plan-failed'").get().error_detail,'provider_calls=1');
  assert.equal((await view()).themePlanRepairAvailable,true);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,1,'failed correction leaves original PDF available');
  db.prepare("UPDATE custom_plan_orders SET quality_replan_used = 1 WHERE order_id = 'theme-order'").run();
  db.exec(readFileSync(new URL('./migrations/0020_failed_theme_plan_retry.sql', import.meta.url),'utf8'));
  assert.equal((await view()).themePlanRepairAvailable,true,'migration recovers previously stuck orders');
  assert.equal((await post({action:'quality_replan'},'free-theme-correction-0002')).status,202);
  await productionWorker.queue({messages:[{body:queued.shift(),ack(){},retry(){}}]},env);
  assert.equal((await view()).planReview.themeReplanAttempts,2);
  assert.equal((await view()).themePlanRepairAvailable,false,'two failed provider attempts stop the old self-service route');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,1);
  db.exec(readFileSync(new URL('./migrations/0021_theme_plan_failure_recovery.sql', import.meta.url),'utf8'));
  assert.equal((await view()).themePlanRepairAvailable,true,'the migration grants one explicit post-fix attempt');
  providerMode='audit';
  assert.equal((await post({action:'quality_replan'},'free-theme-correction-0003')).status,202);
  await productionWorker.queue({messages:[{body:queued.shift(),ack(){throw Error('failed audit cannot ack');},retry(){}}]},env);
  assert.equal((await view()).planReview.themeReplanFailureCode,'PLAN_QA_THEME_WEAK');
  const failureView=await view();
  assert.equal(failureView.planReview.progress.phase,'failed');assert.equal(failureView.planReview.progress.candidateSaved,true);
  assert.equal(failureView.planReview.progress.providerCalls,4);
  assert.doesNotMatch(JSON.stringify(failureView.planReview.progress),/"reason"|"evidence"|"quote"/,'private audit explanation and quotations never enter public progress');
  assert.doesNotMatch(JSON.stringify(failureView.planReview.progress),/candidate_json|checkpoint_json|premise|candidate":/,'private candidate stays out of the public progress object');
  assert.equal((await view()).themePlanRepairAvailable,false,'the old recovery grant is consumed by the QA mismatch');
  db.exec(readFileSync(new URL('./migrations/0022_theme_plan_qa_recovery.sql', import.meta.url),'utf8'));
  assert.equal((await view()).themePlanRepairAvailable,true,'the QA migration grants one explicit aligned-rule attempt');
  providerMode='success';
  assert.equal((await post({action:'quality_replan'},'free-theme-correction-0004')).status,202);
  await productionWorker.queue({messages:[{body:queued.shift(),ack(){},retry(){throw Error('unexpected plan retry');}}]},env);
  const reviewed=await view();
  assert.equal(reviewed.planReview.status,'review');
  assert.equal(reviewed.planReview.fullUsed,0);
  assert.deepEqual(reviewed.plan.themeAnchors,['Journey to the West']);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,1,'original PDF remains published while the new plan waits');
  assert.equal((await post({action:'confirm',version:2})).status,202);
  assert.equal(queued.at(-1)?.type,'pack_remake');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,1,'approval queues replacement; it does not publish unchecked PDFs');
  assert.equal(db.prepare("SELECT full_used,quality_replan_used FROM custom_plan_orders WHERE order_id='theme-order'").get().quality_replan_used,1);
  assert.equal((await post({action:'quality_replan'},'free-theme-correction-0005')).status,409,'a fifth full-plan generation is blocked');
});

test('the explicitly scoped old-theme recovery is manual, one-use and preserves original files on success or failure',async()=>{
  for(const succeeds of [true,false]){
    const {db,binding}=database({includeSemanticRecovery:false}),orderId='79bb86c7-93b0-4088-ba7a-4a04cd1b2f34',owner='scoped-recovery-fixture';
    const spec=validatePurchase({sku:'custom_classroom',creatorVersion:3,customIdea:'Journey to the West',players:12,groups:3,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec;
    spec.packQualityVersion=13;const oldPlan=planFixture(spec);delete oldPlan.themeAnchors;delete oldPlan.storySceneVersion;for(const stage of oldPlan.stages)delete stage.storyBeat;
    const stored=JSON.stringify(spec),oldStory=JSON.stringify({...spec,plan:oldPlan,planConfirmed:true});
    for(const id of [orderId,'unrelated-order']){
      db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES (?,'custom_classroom','USD',1999,'exclusive',1)").run('price-'+id);
      db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_classroom',?,?,?,?,1999,'USD','published',CURRENT_TIMESTAMP)").run(id,stored,await sha256(stored),owner,'price-'+id);
      db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES (?,?,'published',?)").run('activity-'+id,id,oldStory);
      db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit,access_expires_at) VALUES (?,?,?,'active',2,datetime('now','+6 months'))").run('ent-'+id,id,'activity-'+id);
      db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,pack_format_version,player_r2_key,guide_r2_key) VALUES (?,?,1,'published',2,'original/player.pdf','original/guide.pdf')").run('artifact-'+id,'activity-'+id);
      db.prepare("INSERT INTO custom_plan_orders (order_id,status,active_version,confirmed_version,quality_replan_recovery_grant,quality_replan_qa_grant) VALUES (?,'confirmed',1,1,1,1)").run(id);
      db.prepare("INSERT INTO custom_plan_versions (order_id,version_number,plan_json,request_kind) VALUES (?,1,?,'initial')").run(id,JSON.stringify(oldPlan));
      for(let n=1;n<=4;n++){
        db.prepare("INSERT INTO custom_plan_requests (id,order_id,kind,base_version,status,attempts) VALUES (?,?,'full',1,'failed',1)").run('old-'+id+'-'+n,id);
        db.prepare("INSERT INTO generation_usage (order_id,attempt,model,status,error_code) VALUES (?,?,'fixture','plan-failed','PLAN_THEME_ANCHORS')").run(id,n);
      }
    }
    const migration=readFileSync(new URL('./migrations/0024_scoped_semantic_plan_recovery.sql',import.meta.url),'utf8');
    db.exec(migration);
    assert.equal(db.prepare('SELECT semantic_recovery_remaining AS n FROM custom_plan_orders WHERE order_id=?').get(orderId).n,1);
    assert.equal(db.prepare("SELECT semantic_recovery_remaining AS n FROM custom_plan_orders WHERE order_id='unrelated-order'").get().n,0);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_plan_requests WHERE status='queued'").get().n,0,'migration never starts work');
    const queued=[];let calls=0,queueUnavailable=true;
    const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',PRIVATE_FILES:{},GENERATION_QUEUE:{send:async job=>{if(queueUnavailable)throw Error('fixture queue unavailable');queued.push(job);}},FETCH:async(_url,init)=>{
      calls++;const payload=JSON.parse(init.body),input=JSON.parse(payload.input);
      const plan=planFixture(input.spec);plan.premise='The Monkey King must recover a missing message at a mountain shrine.';
      const value=payload.text.format.name==='paid_plan_audit'?succeeds?{pass:true,issues:[]}:{pass:false,issues:[{code:'THEME_WEAK',fields:['premise'],reason:'The plan does not carry the purchased mythology into the events.',evidence:[{field:'premise',quote:input.plan.premise}]}]}:plan;
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]});
    }};
    const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
    const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
    const view=()=>handleProductionApi(request(`/api/v1/orders/${orderId}`,'GET',undefined,headers),env).then(r=>r.json());
    const post=key=>handleProductionApi(request(`/api/v1/orders/${orderId}/plan`,'POST',{action:'quality_replan'},{...headers,'Idempotency-Key':key}),env);
    assert.equal((await view()).themePlanRecoveryAvailable,true);assert.equal((await view()).themePlanRepairAvailable,true);assert.equal(calls,0);
    assert.equal((await post('queue-failed-recovery-0001')).status,500);
    assert.equal((await view()).themePlanRecoveryAvailable,true,'a queue failure before model work returns the unused recovery');
    queueUnavailable=false;
    const attempts=await Promise.all([post('manual-recovery-attempt-0001'),post('manual-recovery-attempt-0002')]);
    assert.deepEqual(attempts.map(r=>r.status).sort(),[202,409]);assert.equal(queued.length,1);assert.equal(calls,0);
    const winningKey=attempts[0].status===202?'manual-recovery-attempt-0001':'manual-recovery-attempt-0002';
    assert.equal((await post(winningKey)).status,200,'same-key retry returns the existing request regardless of concurrent ordering');
    assert.equal((await view()).themePlanRecoveryAvailable,false);
    await productionWorker.queue({messages:[{body:queued.shift(),ack(){},retry(){}}]},env);
    assert.ok(calls<=5);assert.equal((await view()).filesReady,true);assert.equal(queued.length,0,'only plan work runs before approval');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,2,'both orders retain just their original PDF pair');
    assert.equal((await view()).planReview.status,succeeds?'review':'confirmed');
    assert.equal((await post('manual-recovery-attempt-0003')).status,409,'the one-use recovery cannot be spent twice');
    db.exec(migration.slice(migration.indexOf('UPDATE custom_plan_orders')));
    assert.equal(db.prepare('SELECT semantic_recovery_remaining AS n FROM custom_plan_orders WHERE order_id=?').get(orderId).n,0,'later requests cannot regrant the old-rule recovery');
  }
});

test('an unapproved location-only replacement repairs the saved request once without new grants or PDF work',async()=>{
  for(const auditPasses of [true,false,'format']){
    const {db,binding}=database(),orderId='scene-repair-order',owner='scene-owner';
    const spec=validatePurchase({sku:'custom_classroom',creatorVersion:3,customIdea:'Journey to the West',players:4,groups:1,age:'8-10',paper:'A4',gameplay:{primary:'discussion',secondary:['reasoning']}}).spec;
    const oldPlan=planFixture(spec);delete oldPlan.storySceneVersion;for(const stage of oldPlan.stages)delete stage.storyBeat;
    const stored=JSON.stringify(spec),oldStory=JSON.stringify({...spec,plan:oldPlan,planConfirmed:true});
    db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('scene-price','custom_classroom','USD',1999,'exclusive',1)").run();
    db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_classroom',?,?,?,'scene-price',1999,'USD','published',CURRENT_TIMESTAMP)").run(orderId,stored,await sha256(stored),owner);
    db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('scene-activity',?,'published',?)").run(orderId,oldStory);
    db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit,access_expires_at) VALUES ('scene-ent',?,'scene-activity','active',2,datetime('now','+6 months'))").run(orderId);
    db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,pack_format_version,player_r2_key,guide_r2_key) VALUES ('scene-artifact','scene-activity',1,'published',2,'original/player.pdf','original/guide.pdf')").run();
    db.prepare("INSERT INTO custom_plan_orders (order_id,status,active_version,confirmed_version,quality_replan_used) VALUES (?,'review',2,1,1)").run(orderId);
    for(const version of [1,2])db.prepare("INSERT INTO custom_plan_versions (order_id,version_number,plan_json,request_kind) VALUES (?,?,?,'full')").run(orderId,version,JSON.stringify(oldPlan));
    db.prepare("INSERT INTO custom_plan_requests (id,order_id,kind,base_version,result_version,status,attempts) VALUES ('scene-request',?,'full',1,2,'published',1)").run(orderId);
    const checkpoint=JSON.stringify({candidate:oldPlan,valid:true,audit:{pass:true,issues:[]},correctionUsed:false});
    db.prepare("INSERT INTO custom_plan_work (request_id,order_id,context_sha256,checkpoint_json,phase,candidate_saved,plan_valid,audit_passed,provider_calls) VALUES ('scene-request',?,'old-policy',?,'ready',1,1,1,2)").run(orderId,checkpoint);
    const queued=[];let calls=0,queueFails=false;
    const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',PRIVATE_FILES:{},GENERATION_QUEUE:{send:async job=>{if(queueFails)throw Error('fixture queue unavailable');queued.push(job);}},FETCH:async(_url,init)=>{
      calls++;const sent=JSON.parse(init.body);
      assert.ok(['repaired_paid_plan','paid_plan_format_repair','paid_plan_audit'].includes(sent.text.format.name),'never request a fresh plan');
      const candidate=planFixture(spec);
      if(auditPasses==='format'&&calls===1)candidate.stages[1].storyBeat='PRIVATE STORY '.repeat(14)+'.';
      const value=sent.text.format.name==='paid_plan_format_repair'?{scene2_storyBeat:candidate.stages[1].storyBeat}:sent.text.format.name==='paid_plan_audit'?auditPasses?{pass:true,issues:[]}:{pass:false,issues:[{code:'THEME_WEAK',fields:['scene1','scene2','scene3'],reason:'The saved events do not carry the purchased mythology.',evidence:[{field:'scene1',quote:candidate.stages[0].scene}]}]}:candidate;
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]});
    }};
    const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
    const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
    const post=(body,extra={})=>handleProductionApi(request(`/api/v1/orders/${orderId}/plan`,'POST',body,{...headers,...extra}),env);
    const view=()=>handleProductionApi(request(`/api/v1/orders/${orderId}`,'GET',undefined,headers),env).then(r=>r.json());
    assert.equal((await view()).planReview.storySceneRepairAvailable,true);assert.equal(calls,0);
    assert.equal((await post({action:'confirm',version:2})).status,409,'location-only plan cannot start paid PDF generation');
    assert.equal((await post({action:'repair_story_scenes',version:1})).status,409,'stale version is rejected');
    assert.equal((await post({action:'repair_story_scenes',version:2},{cookie:''})).status,401,'owner authentication is required');
    db.prepare("UPDATE custom_plan_work SET provider_calls = 4 WHERE request_id = 'scene-request'").run();
    assert.equal((await view()).planReview.storySceneRepairAvailable,false);
    assert.equal((await post({action:'repair_story_scenes',version:2})).status,409,'remaining request budget is enforced');
    db.prepare("UPDATE custom_plan_work SET provider_calls = 2 WHERE request_id = 'scene-request'").run();
    queueFails=true;
    assert.equal((await post({action:'repair_story_scenes',version:2})).status,500);
    assert.equal((await view()).planReview.storySceneRepairAvailable,true,'failed enqueue returns unused repair');
    queueFails=false;
    const started=await Promise.all([post({action:'repair_story_scenes',version:2}),post({action:'repair_story_scenes',version:2})]);
    assert.ok(started.some(r=>r.status===202));assert.equal(queued.length,1);assert.equal(calls,0);
    assert.equal((await post({action:'repair_story_scenes',version:2})).status,200,'repeated click reuses queued request');
    await productionWorker.queue({messages:[{body:queued.shift(),ack(){},retry(){}}]},env);
    if(auditPasses==='format'){
      assert.equal(calls,1,'the format failure happens before the independent audit');
      const failed=await view();
      assert.deepEqual(failed.planReview.progress.formatIssue,{field:'storyBeat',rule:'length',stage:2,length:197,limit:180});
      assert.equal(failed.qualityUpgradeAvailable,false,'a rejected replacement cannot expose a full-pack upgrade');
      assert.equal(failed.planReview.formatResumeAvailable,true);assert.equal(failed.planReview.formatResumeCalls,2);
      assert.doesNotMatch(JSON.stringify(failed),/PRIVATE STORY/,'failed candidate prose remains private');
      const remake=await handleProductionApi(request(`/api/v1/orders/${orderId}/pack-remake`,'POST',{},headers),env);
      assert.equal(remake.status,409);assert.equal((await remake.json()).error.code,'REPLACEMENT_PLAN_NOT_APPROVED');assert.equal(calls,1);
      const retryRemake=await handleProductionApi(request(`/api/v1/orders/${orderId}/pack-remake/retry`,'POST',{},headers),env);
      assert.equal(retryRemake.status,409);assert.equal(calls,1);
      assert.equal((await post({action:'resume_saved_plan',version:2},{cookie:''})).status,401);
      assert.equal((await post({action:'resume_saved_plan',version:1})).status,409);
      const bound=db.prepare("SELECT context_sha256 FROM custom_plan_work WHERE request_id='scene-request'").get().context_sha256;
      db.prepare("UPDATE custom_plan_work SET context_sha256='wrong-context' WHERE request_id='scene-request'").run();
      assert.equal((await post({action:'resume_saved_plan',version:2})).status,409,'saved work cannot cross a request context');
      db.prepare("UPDATE custom_plan_work SET context_sha256=? WHERE request_id='scene-request'").run(bound);
      db.prepare("UPDATE custom_plan_work SET provider_calls=4 WHERE request_id='scene-request'").run();
      assert.equal((await view()).planReview.formatResumeAvailable,false);
      assert.equal((await post({action:'resume_saved_plan',version:2})).status,409);
      db.prepare("UPDATE custom_plan_work SET provider_calls=3 WHERE request_id='scene-request'").run();
      queueFails=true;
      assert.equal((await post({action:'resume_saved_plan',version:2})).status,500);
      assert.equal((await view()).planReview.formatResumeAvailable,true,'enqueue failure returns the unused continuation');
      assert.equal((await view()).planReview.progress.failureCode,'PLAN_PRINT_FIT');
      queueFails=false;
      const resumed=await Promise.all([post({action:'resume_saved_plan',version:2}),post({action:'resume_saved_plan',version:2})]);
      assert.ok(resumed.some(r=>r.status===202));assert.equal(queued.length,1);assert.equal(calls,1);
      assert.equal((await post({action:'resume_saved_plan',version:2})).status,200);
      await productionWorker.queue({messages:[{body:queued.shift(),ack(){},retry(){}}]},env);
      assert.equal(calls,3,'one exact-field repair and one audit; no fresh plan generation');
      assert.equal(db.prepare("SELECT provider_calls FROM custom_plan_work WHERE request_id='scene-request'").get().provider_calls,5);
      const checked=await view();assert.equal(checked.planReview.activeVersion,3);assert.equal(checked.planReview.confirmedVersion,1);
      assert.equal(checked.planReview.formatResumeAvailable,false);
      assert.equal((await post({action:'resume_saved_plan',version:3})).status,409);
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_plan_requests').get().n,1);
      assert.equal(db.prepare('SELECT full_used FROM custom_plan_orders').get().full_used,0);
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,1);assert.equal(queued.length,0);
      assert.equal(db.prepare('SELECT story_spec_json FROM custom_activities').get().story_spec_json,oldStory);
      continue;
    }
    assert.equal(calls,2,'one scene repair plus one independent audit');
    assert.equal(db.prepare("SELECT provider_calls FROM custom_plan_work WHERE request_id='scene-request'").get().provider_calls,4);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_plan_requests').get().n,1,'no new plan request or grant');
    assert.equal(db.prepare('SELECT full_used,targeted_used FROM custom_plan_orders').get().full_used,0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,1);
    assert.equal(db.prepare('SELECT story_spec_json FROM custom_activities').get().story_spec_json,oldStory);
    assert.equal((await view()).filesReady,true);assert.equal(queued.length,0,'new plan still requires adult approval');
    const result=await view();assert.equal(result.planReview.storySceneRepairAvailable,false);
    if(auditPasses){assert.equal(result.planReview.activeVersion,3);assert.equal(result.planReview.storyScenesRequired,false);assert.ok(result.planReview.versions[2].plan.stages.every(stage=>stage.storyBeat));}
    else{assert.equal(result.planReview.confirmedVersion,1);assert.equal(result.planReview.activeVersion,2);}
    assert.equal((await post({action:'repair_story_scenes',version:result.planReview.activeVersion})).status,409,'repair cannot be started twice');
    assert.doesNotMatch(JSON.stringify(result),/checkpoint_json|context_sha256|sceneRepairUsed/);
  }
});

test('staged paid generation resumes at a failed checkpoint without regenerating saved work',async()=>{
  const {db,binding}=database();
  const purchase=validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'A clock tower that stopped at noon',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec;
  purchase.gamePackVersion=1; // Resume an order approved before interactive paper materials existed.
  delete purchase.packStepDeliveryVersion;
  delete purchase.packContractVersion;delete purchase.packCopyVersion;
  const plan=planFixture(purchase);
  const spec={...purchase,plan,planConfirmed:true,onlineRedownloadMonths:12};
  const stored=JSON.stringify(purchase),storySpec=JSON.stringify(spec);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('staged-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('staged-order','custom','custom_home',?,?,?,?,1499,'USD','paid',CURRENT_TIMESTAMP)").run(stored,await sha256(stored),'owner-hash','staged-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json,generation_version) VALUES ('staged-activity','staged-order','queued',?,2)").run(storySpec);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit) VALUES ('staged-entitlement','staged-order','staged-activity','active',2)").run();
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,confirmed_version) VALUES ('staged-order','confirmed',1)").run();
  const calls=[];const queued=[];const saved=new Map();let failThird=true,rejectFourth=true,failFirstPdf=true,queueRetries=0;
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture-model',GENERATION_QUEUE:{send:async job=>queued.push(job)},
    PRIVATE_FILES:{put:async(key,bytes,options)=>{if(key.endsWith('/player.pdf')&&failFirstPdf){failFirstPdf=false;throw new Error('Temporary PDF storage failure');}saved.set(key,{bytes,options});},head:async key=>saved.get(key)&&{customMetadata:saved.get(key).options.customMetadata}},
    FETCH:async(_url,init)=>{
      const payload=JSON.parse(init.body),name=payload.text.format.name;
      const input=JSON.parse(payload.input);calls.push([name,input.stageNumber||0]);
      if(name==='game_checkpoint'&&input.stageNumber===3&&failThird){failThird=false;return new Response('Temporary failure',{status:502});}
      const value=name==='game_blueprint'?{ending:'The team repairs the paper clock and celebrates together.',groupInstructions:'',stages:Array.from({length:5},(_,index)=>({question:`Which record completes checkpoint ${index+1}?`,evidence:`The correct record has symbol ${index+1}.`,options:[`Symbol ${index+1}`,`Old symbol ${index+1}`,`Other symbol ${index+1}`],answerIndex:0,unlock:`CLOCK-${index+1}`}))}
        :name==='game_checkpoint'?{clue:`${input.blueprintCheckpoint.question} ${input.blueprintCheckpoint.evidence} The other records have old or other symbols.`,explanation:'The first choice matches the numbered symbol in the printed evidence.',hint:'Compare the symbols in the records.'}
        :rejectFourth?(rejectFourth=false,{pass:false,issues:[{stageNumber:4,reason:'The fourth clue needs a clearer printed fact.'}]}):{pass:true,issues:[]};
      return Response.json({id:`response-${calls.length}`,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:20}});
    }};
  const process=()=>productionWorker.queue({messages:[{body:{orderId:'staged-order'},ack(){},retry(){queueRetries++;}}]},env);
  const initialToken=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:'owner-hash',exp:Math.floor(Date.now()/1000)+3600});
  const initialView=await handleProductionApi(request('/api/v1/orders/staged-order','GET',undefined,{cookie:`paw_session=${initialToken}`}),env).then(response=>response.json());
  assert.equal(initialView.generationProgress.phase,'blueprint');
  assert.equal(initialView.generationProgress.currentStage,null);
  await process();
  assert.deepEqual(db.prepare('SELECT stage_number FROM custom_game_stages WHERE order_id = ? ORDER BY stage_number').all('staged-order').map(row=>row.stage_number),[1,2]);
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='staged-order'").get().status,'fulfilling');
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:'owner-hash',exp:Math.floor(Date.now()/1000)+3600});
  const view=await handleProductionApi(request('/api/v1/orders/staged-order','GET',undefined,{cookie:`paw_session=${token}`}),env).then(response=>response.json());
  assert.equal(view.gamePackVersion,1,'a previously approved paid order keeps its original pack format');
  assert.deepEqual(view.revisionRequests,[]);
  assert.equal(view.generationProgress.phase,'checkpoint');assert.equal(view.generationProgress.currentStage,3);
  await process();
  assert.deepEqual(db.prepare('SELECT stage_number FROM custom_game_stages WHERE order_id = ? ORDER BY stage_number').all('staged-order').map(row=>row.stage_number),[1,2,3,5]);
  assert.equal(db.prepare("SELECT status FROM custom_activities WHERE id='staged-activity'").get().status,'generating');
  await process();
  assert.equal(db.prepare("SELECT status FROM custom_activities WHERE id='staged-activity'").get().status,'queued');
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM custom_story_checkpoints WHERE order_id='staged-order'").get().count,1);
  const storyCalls=calls.length;
  await process();
  assert.equal(queueRetries,1,'a temporary PDF storage failure should retry delivery');
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='staged-order'").get().status,'fulfilling');
  assert.equal(calls.length,storyCalls,'PDF retry cannot ask the model to regenerate the saved game');
  await process();
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='staged-order'").get().status,'published');
  assert.equal(calls.filter(([name])=>name==='game_blueprint').length,1);
  assert.equal(calls.filter(([name,number])=>name==='game_checkpoint'&&number===1).length,1);
  assert.equal(calls.filter(([name,number])=>name==='game_checkpoint'&&number===2).length,1);
  assert.equal(calls.filter(([name,number])=>name==='game_checkpoint'&&number===3).length,2);
  assert.equal(calls.filter(([name,number])=>name==='game_checkpoint'&&number===4).length,2);
  assert.equal(calls.filter(([name,number])=>name==='game_checkpoint'&&number===5).length,1);
  assert.equal(calls.filter(([name])=>name==='staged_story_audit').length,2);
  assert.equal(saved.size,3);
  const callCount=calls.length;await process();assert.equal(calls.length,callCount,'a duplicate queue message cannot spend more tokens');
  assert.equal(queued.length,3);
});

test('a paid legacy pack remakes on the same order and keeps the old download until the new files pass',async()=>{
  const {db,binding}=database();
  const owner='paid-legacy-owner';
  const original={...sampleSpec,gamePackVersion:1};
  const purchase=JSON.stringify(original);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('remake-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('legacy-order','custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(purchase,await sha256(purchase),owner,'remake-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('legacy-activity','legacy-order','published',?)").run(purchase);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit,revision_expires_at,access_expires_at) VALUES ('legacy-entitlement','legacy-order','legacy-activity','active',2,datetime('now','+20 days'),datetime('now','+6 months'))").run();
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,confirmed_version) VALUES ('legacy-order','confirmed',1)").run();
  const files=new Map();
  for(const role of ['player','guide']) {
    const bytes=buildGamePdf(sampleStory,original,role),sha=createHash('sha256').update(bytes).digest('hex');
    files.set(`custom/legacy-order/v1/${role}.pdf`,{bytes,sha});
    if(role==='player') db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,player_r2_key,player_sha256) VALUES ('legacy-artifact','legacy-activity',1,'published',?,?)").run(`custom/legacy-order/v1/${role}.pdf`,sha);
    else db.prepare("UPDATE artifact_versions SET guide_r2_key = ?,guide_sha256 = ? WHERE id = 'legacy-artifact'").run(`custom/legacy-order/v1/${role}.pdf`,sha);
  }
  const queue=[];const calls=[];let failFirstNewPdf=true,failFirstAudit=true;
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture-model',
    GENERATION_QUEUE:{send:async job=>queue.push(job)},
    PRIVATE_FILES:{put:async(key,body,options)=>{if(key.includes('paper-remake/player.pdf')&&failFirstNewPdf){failFirstNewPdf=false;throw new Error('Temporary replacement storage failure');}files.set(key,{bytes:typeof body==='string'?new TextEncoder().encode(body):body,sha:options.customMetadata.sha256});},get:async key=>{const file=files.get(key);return file&&{body:file.bytes,customMetadata:{sha256:file.sha}};}},
    FETCH:async(_url,init)=>{
      const payload=JSON.parse(init.body),name=payload.text.format.name,input=JSON.parse(payload.input);
      calls.push([name,input.stageNumber||0]);
      const value=name==='game_blueprint'?{ending:sampleStory.ending,groupInstructions:'',stages:sampleStory.stages.map((stage,index)=>({question:stage.clue,evidence:stage.clue,options:stage.options,answerIndex:stage.answerIndex,unlock:stage.unlock,material:{...stage.material,items:stage.material.items.slice(0,index===1&&!input.candidate?3:['order_tiles','symbol_key'].includes(stage.material.type)?4:3)}}))}
        :name==='game_checkpoint'?{clue:sampleStory.stages[input.stageNumber-1].clue,explanation:sampleStory.stages[input.stageNumber-1].explanation,hint:sampleStory.stages[input.stageNumber-1].hint}
        :failFirstAudit?(failFirstAudit=false,{pass:false,issues:[{stageNumber:1,reason:'Stage 1 answer leaks because an option repeats a printed card.'}]}):{pass:true,issues:[]};
      return Response.json({id:`remake-${calls.length}`,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:20}});
    }};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const view=()=>handleProductionApi(request('/api/v1/orders/legacy-order','GET',undefined,headers),env).then(response=>response.json());
  const download=()=>handleProductionApi(request('/api/v1/files/legacy-order/player?paper=A4','GET',undefined,headers),env);
  assert.equal((await view()).gamePackVersion,1);
  const oldPdf=new Uint8Array(await (await download()).arrayBuffer());
  assert.equal((await handleProductionApi(request('/api/v1/orders/legacy-order/pack-remake','POST',undefined,{origin:env.PUBLIC_ORIGIN}),env)).status,401);
  assert.equal((await handleProductionApi(request('/api/v1/orders/legacy-order/pack-remake','POST',undefined,headers),env)).status,202);
  assert.equal((await handleProductionApi(request('/api/v1/orders/legacy-order/pack-remake','POST',undefined,headers),env)).status,200);
  assert.equal(queue.length,1,'repeat clicks do not start another model run');
  assert.equal((await view()).remake.status,'queued');
  for(let step=0;step<17 && (await view()).remake.status!=='ready';step++) {
    const job=queue.shift();assert.equal(job?.type,'pack_remake');
    let retries=0;await productionWorker.queue({messages:[{body:job,ack(){},retry(){retries++;}}]},env);
    assert.equal(retries,0);
    if((await view()).remake.status!=='ready') assert.deepEqual(new Uint8Array(await (await download()).arrayBuffer()),oldPdf,'old PDF stays available until replacement is complete');
  }
  const completed=await view();
  assert.equal(completed.remake.status,'ready');
  assert.equal(completed.gamePackVersion,2);
  assert.equal(completed.checkedPuzzleRevision,true);
  const unsupportedChange=await handleProductionApi(request('/api/v1/orders/legacy-order/revisions','POST',{stageNumber:1,instruction:'Replace this puzzle with a maze.'},headers),env);
  assert.equal(unsupportedChange.status,422,'unsupported changes fail before queueing or consuming a revision');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM revision_requests WHERE order_id='legacy-order'").get().n,0);
  const supportedChange=await handleProductionApi(request('/api/v1/orders/legacy-order/revisions','POST',{stageNumber:1,instruction:'Clarify the printed instructions and hint without changing the story.'},headers),env);
  assert.equal(supportedChange.status,202);
  assert.equal(queue.at(-1).type,'revision');
  assert.equal(completed.amountTotal,1499,'remake does not create a second charge');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,2);
  assert.equal(db.prepare("SELECT pack_format_version FROM artifact_versions WHERE version_number=1").get().pack_format_version,1);
  assert.equal(db.prepare("SELECT pack_format_version FROM artifact_versions WHERE version_number=2").get().pack_format_version,2);
  assert.equal(calls.length,2,'a rejected blueprint gets one repair; checked puzzle steps and PDF retries use no more model calls');
  assert.notDeepEqual(new Uint8Array(await (await download()).arrayBuffer()),oldPdf,'downloads switch only after checked publication');
  const originalDownload=await handleProductionApi(request('/api/v1/files/legacy-order/player?paper=A4&version=1','GET',undefined,headers),env);
  assert.deepEqual(new Uint8Array(await originalDownload.arrayBuffer()),oldPdf,'the earlier pack can still be downloaded by its owner');
});

test('a delivered pre-quality checked pack offers one free upgrade on its paid order',async()=>{
  const {db,binding}=database(),owner='quality-upgrade-owner';
  const purchase=JSON.stringify(clockSpec);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('quality-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('quality-order','custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(purchase,await sha256(purchase),owner,'quality-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('quality-activity','quality-order','published',?)").run(purchase);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit,revision_expires_at,access_expires_at) VALUES ('quality-entitlement','quality-order','quality-activity','active',2,datetime('now','+20 days'),datetime('now','+6 months'))").run();
  const original=new TextEncoder().encode('%PDF- original quality fixture');
  const originalHash=createHash('sha256').update(original).digest('hex');
  db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,pack_format_version,player_r2_key,guide_r2_key,player_sha256,guide_sha256) VALUES ('quality-artifact','quality-activity',1,'published',2,'original/player.pdf','original/guide.pdf',?,?)").run(originalHash,originalHash);
  const queue=[],files=new Map([['original/player.pdf',{body:original,customMetadata:{sha256:originalHash}}],['original/guide.pdf',{body:original,customMetadata:{sha256:originalHash}}]]);
  const context=linkedClockContext();
  const storyFrame={problem:context.spine.problem,actions:context.stages[4].material.items.map(item=>item.label),discoveries:[
    {finding:'The signal gear is missing.',consequence:'The missing noon mark points to the gear.',supportsAction:'signal gear'},
    {finding:'The spare gear fits the shaft.',consequence:'The gear can turn without binding.',supportsAction:'signal gear'},
    {finding:'The checked order protects the teeth.',consequence:'The wheel stays aligned during repair.',supportsAction:'signal gear'},
    {finding:'The upper bridge reaches the gear room.',consequence:'The upper bridge can carry the part.',supportsAction:'signal gear'},
  ]};
  const materialContext=structuredClone(context);delete materialContext.spine;
  materialContext.stages[0].material.title='The ancient bell tower and its secret collection of detailed reports';
  materialContext.celebration='The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.';
  let blueprintCalls=0,failedMaterialTwo=false;const blueprintProviderCalls=[];
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>queue.push(job)},
    PRIVATE_FILES:{get:async key=>files.get(key)||null,put:async(key,body,options)=>files.set(key,{body,customMetadata:options.customMetadata})},
    FETCH:async(_url,init)=>{const body=JSON.parse(init.body),name=body.text.format.name,input=JSON.parse(body.input);blueprintProviderCalls.push({name,checkpoint:input.checkpoint||0});if(name==='story_frame')blueprintCalls++;if(name==='blueprint_material_stage'&&input.checkpoint===2&&!failedMaterialTwo){failedMaterialTwo=true;return Response.json({error:{message:'temporary material failure'}},{status:502});}const units=input.evidenceUnits||[],scene=number=>units.find(unit=>unit.id===`checkpoint_${number}_scene`),proof=name==='printed_copy_audit'&&units.length?{problemToAction:{evidenceId:scene(1).id,quote:scene(1).text.slice(0,20),explanation:'The first printed scene introduces the missing signal gear.'},discoveries:[1,2,3,4].map(stageNumber=>({stageNumber,evidenceId:scene(stageNumber).id,quote:scene(stageNumber).text.slice(0,20),supportsAction:'fit the signal gear',explanation:'This printed clue supports fitting the signal gear.'})),chronology:units.filter(unit=>unit.kind==='sequence').map(unit=>unit.stageNumber).filter((number,index,all)=>all.indexOf(number)===index).map(stageNumber=>({stageNumber,consistent:true,explanation:'The consequence follows the printed order of the tiles.'}))}:null;const value=name==='printed_copy_repair'?clockDeliveryCopy(input.source):name==='story_frame'?storyFrame:name==='blueprint_material_stage'?materialContext.stages[input.checkpoint-1]:name==='blueprint_celebration'?{celebration:materialContext.celebration}:name==='grounded_discoveries'?{consequences:storyFrame.discoveries.map(({consequence})=>consequence)}:{pass:true,issues:[],...(proof?{causalProof:proof}:{})};return Response.json({id:'quality-fixture',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:10}});}};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const view=()=>handleProductionApi(request('/api/v1/orders/quality-order','GET',undefined,headers),env).then(response=>response.json());
  assert.equal((await view()).qualityUpgradeAvailable,true);
  assert.equal((await handleProductionApi(request('/api/v1/orders/quality-order/pack-remake','POST',undefined,headers),env)).status,202);
  assert.equal((await handleProductionApi(request('/api/v1/orders/quality-order/pack-remake','POST',undefined,headers),env)).status,200);
  assert.deepEqual(queue,[{type:'pack_remake',orderId:'quality-order'}]);
  const saved=db.prepare("SELECT spec_json,status FROM custom_pack_remakes WHERE order_id='quality-order'").get();
  assert.equal(JSON.parse(saved.spec_json).packExperienceVersion,3);
  assert.equal(saved.status,'queued');
  assert.equal((await view()).qualityUpgradeAvailable,false);
  assert.equal((await view()).remake.status,'queued');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,1,'original pack remains published until replacement checks finish');
  const download=(suffix='')=>handleProductionApi(request(`/api/v1/files/quality-order/player?paper=A4${suffix}`,'GET',undefined,headers),env);
  const firstJob=queue.shift();assert.equal(firstJob?.type,'pack_remake');
  await productionWorker.queue({messages:[{body:firstJob,ack(){},retry(){throw Error('a failed material should resume from its saved parts');}}]},env);
  const partial=await view();
  assert.equal(partial.remake.blueprintStepsCompleted,2,'the story frame and first material are visible as saved progress');
  assert.equal(partial.remake.blueprintStepTotal,8);
  assert.equal(partial.remake.savedSteps,2);
  assert.equal(partial.remake.totalSteps,15);
  assert.deepEqual(new Uint8Array(await (await download()).arrayBuffer()),original);
  for(let step=0;step<12 && (await view()).remake.status!=='ready';step++){
    const job=queue.shift();assert.equal(job?.type,'pack_remake');
    await productionWorker.queue({messages:[{body:job,ack(){},retry(){throw Error('checked remake should not need queue-level retry');}}]},env);
    if((await view()).remake.status!=='ready')assert.deepEqual(new Uint8Array(await (await download()).arrayBuffer()),original);
  }
  const delivered=await view();
  assert.equal(delivered.remake.status,'ready');
  assert.equal(delivered.remake.publishedVersion,2,'new checked pack must publish a new artifact, not relabel the old one');
  assert.equal(delivered.contentReviewPassed,true,'the order distinguishes content review from PDF availability');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,2);
  assert.notDeepEqual(new Uint8Array(await (await download()).arrayBuffer()),original);
  assert.deepEqual(new Uint8Array(await (await download('&version=1')).arrayBuffer()),original);
  assert.equal(blueprintCalls,1);
  assert.equal(blueprintProviderCalls.filter(call=>call.name==='blueprint_material_stage'&&call.checkpoint===1).length,1,'a saved first material is reused after the second material fails');
  assert.equal(blueprintProviderCalls.filter(call=>call.name==='blueprint_material_stage'&&call.checkpoint===2).length,2,'only the failed second material is requested again');
  const earlierPack=new Uint8Array(await (await download()).arrayBuffer());
  const earlierSpec={...JSON.parse(saved.spec_json),packQualityVersion:14,packLayoutVersion:3};
  const earlierJson=JSON.stringify(earlierSpec);
  const staleBlueprint='{}';
  db.prepare("UPDATE custom_pack_remakes SET spec_json = ?,spec_sha256 = ?,blueprint_json = ?,blueprint_sha256 = ? WHERE order_id = 'quality-order'").run(earlierJson,await sha256(earlierJson),staleBlueprint,await sha256(staleBlueprint));
  assert.equal((await view()).qualityUpgradeAvailable,true,'an already delivered pack can receive the current PDF layout on the same order');
  assert.equal((await handleProductionApi(request('/api/v1/orders/quality-order/pack-remake','POST',undefined,headers),env)).status,202);
  assert.equal((await view()).qualityUpgradeAvailable,false);
  assert.equal(db.prepare("SELECT quality_epoch,published_version FROM custom_pack_remakes WHERE order_id='quality-order'").get().quality_epoch,1);
  const closingRefresh=JSON.parse(db.prepare("SELECT story_json FROM custom_pack_remakes WHERE order_id='quality-order'").get().story_json);
  const closingDigits=closingRefresh.stages.slice(0,4).map(stage=>String(stage.material.logic.resultDigit)).join('');
  assert.match(closingDigits,/^[1-3]{4}$/);
  assert.match(closingRefresh.ending,new RegExp(`form code ${closingDigits},`),'the no-charge closing refresh keeps all four stored result digits');
  const staleClosing={...closingRefresh,ending:closingRefresh.ending.replace(`form code ${closingDigits},`,'form code ,')};
  const staleClosingJson=JSON.stringify(staleClosing);
  db.prepare("UPDATE custom_pack_remakes SET story_json=?,story_sha256=? WHERE order_id='quality-order'").run(staleClosingJson,await sha256(staleClosingJson));
  for(let step=0;step<12 && (await view()).remake.status!=='ready';step++){
    assert.deepEqual(new Uint8Array(await (await download()).arrayBuffer()),earlierPack,'published files remain available during the layout refresh');
    const job=queue.shift();assert.equal(job?.type,'pack_remake');
    await productionWorker.queue({messages:[{body:job,ack(){},retry(){throw Error('quality rebuild should not need queue-level retry');}}]},env);
  }
  assert.equal((await view()).remake.status,'ready');
  assert.equal((await view()).remake.publishedVersion,3);
  assert.match(JSON.parse(db.prepare("SELECT story_json FROM custom_pack_remakes WHERE order_id='quality-order'").get().story_json).ending,new RegExp(`form code ${closingDigits},`),'publication repairs a stale saved ending before storing or rendering it');
  assert.equal((await view()).qualityUpgradeAvailable,false,'the same layout refresh cannot be claimed twice');
  assert.equal(blueprintCalls,1,'a layout-only refresh reuses the checked story and makes no model call');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1,'quality rebuild creates no checkout');
  assert.deepEqual(new Uint8Array(await (await download('&version=2')).arrayBuffer()),earlierPack);
  const refreshedPdf=new TextDecoder().decode(await (await download()).arrayBuffer());
  assert.match(refreshedPdf,new RegExp(`form code ${closingDigits},`),'the refreshed Player PDF prints the checked code in its ending');

  const versionlessSpec=JSON.parse(db.prepare("SELECT spec_json FROM custom_pack_remakes WHERE order_id='quality-order'").get().spec_json);delete versionlessSpec.packLayoutVersion;
  const versionlessJson=JSON.stringify(versionlessSpec);
  db.prepare("UPDATE custom_pack_remakes SET status='failed',phase='blueprint',spec_json=?,spec_sha256=?,error_code='BLUEPRINT_INVALID',error_detail='A saved blueprint was checked before PDF rendering.',recovery_round=2 WHERE order_id='quality-order'").run(versionlessJson,await sha256(versionlessJson));
  const failedView=await packRemakeView(binding,'quality-order');
  assert.equal(failedView.layoutRecoveryAvailable,true);
  assert.equal(failedView.recoveryAvailable,true,'layout recovery does not consume or depend on AI recovery rounds');
  const paidOrder=db.prepare("SELECT * FROM orders WHERE id='quality-order'").get();
  assert.deepEqual(await retryPackRemake(paidOrder,env),{status:'queued',recovery:true,layoutOnly:true});
  assert.equal(db.prepare("SELECT phase FROM custom_pack_remakes WHERE order_id='quality-order'").get().phase,'pdf');
  await productionWorker.queue({messages:[{body:queue.shift(),ack(){},retry(){throw Error('layout recovery should finish from the saved story');}}]},env);
  assert.equal((await view()).remake.publishedVersion,4);
  assert.equal(blueprintCalls,1,'recovering a misclassified layout refresh still makes no model call');

  db.prepare("UPDATE custom_pack_remakes SET status='failed',phase='blueprint',error_code='BLUEPRINT_INVALID',error_detail='A saved blueprint was checked before PDF rendering.',recovery_round=2 WHERE order_id='quality-order'").run();
  await productionWorker.scheduled({},env);
  assert.deepEqual({...db.prepare("SELECT status,phase FROM custom_pack_remakes WHERE order_id='quality-order'").get()},{status:'queued',phase:'pdf'});
  assert.deepEqual(queue,[{type:'pack_remake',orderId:'quality-order'}]);
  await productionWorker.queue({messages:[{body:queue.shift(),ack(){},retry(){throw Error('scheduled layout recovery should finish from the saved story');}}]},env);
  assert.equal((await view()).remake.publishedVersion,5);
  assert.equal(blueprintCalls,1,'scheduled layout recovery makes no model call');

  const publishedPdf=new Uint8Array(await (await download()).arrayBuffer());
  const preV13={...JSON.parse(db.prepare("SELECT spec_json FROM custom_pack_remakes WHERE order_id='quality-order'").get().spec_json),packQualityVersion:12};
  const preV13Json=JSON.stringify(preV13);
  db.prepare("UPDATE custom_pack_remakes SET spec_json=?,spec_sha256=? WHERE order_id='quality-order'").run(preV13Json,await sha256(preV13Json));
  assert.equal((await view()).qualityUpgradeAvailable,true);
  assert.equal((await handleProductionApi(request('/api/v1/orders/quality-order/pack-remake','POST',undefined,headers),env)).status,202);
  const newQuality=db.prepare("SELECT phase,story_json,blueprint_json,stages_json,published_version FROM custom_pack_remakes WHERE order_id='quality-order'").get();
  assert.equal(newQuality.phase,'blueprint','content-rule upgrades must rebuild the story, not just its PDF closing');
  assert.equal(newQuality.story_json,null);
  assert.equal(newQuality.blueprint_json,null);
  assert.equal(newQuality.stages_json,'[]');
  assert.equal(newQuality.published_version,5);
  assert.deepEqual(new Uint8Array(await (await download()).arrayBuffer()),publishedPdf,'the last published pack remains downloadable while the new content is checked');
  assert.equal(blueprintCalls,1,'starting the no-charge rebuild alone does not call the model');
});

test('quality v7 saves a blueprint and earlier checkpoint while repairing one rejected paper context',async()=>{
  const {db,binding}=database(),orderId='semantic-repair-order';
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:7,packLayoutVersion:4};
  const specJson=JSON.stringify(spec),context=linkedClockContext();
  const storyFrame={problem:context.spine.problem,actions:context.stages[4].material.items.map(item=>item.label),discoveries:[
    {finding:'The signal gear is missing.',consequence:'The missing noon mark points to the gear.',supportsAction:'signal gear'},
    {finding:'The spare gear fits the shaft.',consequence:'The gear can turn without binding.',supportsAction:'signal gear'},
    {finding:'The checked order protects the teeth.',consequence:'The wheel stays aligned during repair.',supportsAction:'signal gear'},
    {finding:'The upper bridge reaches the gear room.',consequence:'The upper bridge can carry the part.',supportsAction:'signal gear'},
  ]};
  const materialContext=structuredClone(context);delete materialContext.spine;
  materialContext.celebration='The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.';
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('semantic-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(orderId,specJson,await sha256(specJson),'semantic-owner','semantic-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('semantic-activity',?,'published',?)").run(orderId,specJson);
  db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,pack_format_version) VALUES ('semantic-original','semantic-activity',1,'published',2)").run();
  db.prepare("INSERT INTO custom_pack_remakes (order_id,status,phase,spec_json,spec_sha256,published_version) VALUES (?,'queued','blueprint',?,?,1)").run(orderId,specJson,await sha256(specJson));
  const calls=[],queue=[];let rejected=false,negativeReviewed=false;
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>queue.push(job)},PRIVATE_FILES:{get:async()=>null,put:async()=>{}},
    FETCH:async(_url,init)=>{
      const request=JSON.parse(init.body),name=request.text.format.name,input=JSON.parse(request.input);calls.push(name);
      let value;
      if(name==='story_frame')value=storyFrame;
      else if(name==='game_blueprint')value=materialContext;
      else if(name==='paper_checkpoint_semantics'){
        value=input.checkpoint===1&&!negativeReviewed?(negativeReviewed=true,{pass:false,issues:[{stageNumber:1,reason:'A feature has answer NO for the second note.'}]})
          :input.checkpoint===2&&!rejected?(rejected=true,{pass:false,issues:[{stageNumber:2,reason:'The printed finding uses a feature that cannot describe every record.'}]}):{pass:true,issues:[]};
      }else if(name==='checkpoint_material_repair'){
        value=structuredClone(materialContext.stages[1]);value.material.title='Checked tower records';
      }else throw Error(`Unexpected provider call ${name}`);
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:10}});
    }};
  await processPackRemake(orderId,env);
  assert.equal((await packRemakeView(binding,orderId)).blueprintReady,true,'blueprint is saved before any editorial audit');
  await processPackRemake(orderId,env);
  const first=db.prepare('SELECT stages_json FROM custom_pack_remakes WHERE order_id=?').get(orderId).stages_json;
  assert.equal(JSON.parse(first).length,1);
  assert.equal(negativeReviewed,true,'a negative record answer receives a second semantic review');
  await processPackRemake(orderId,env);
  let view=await packRemakeView(binding,orderId);
  assert.equal(view.phase,'repair');assert.deepEqual(view.completedStages,[1]);assert.equal(view.problemStage,2);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,1);
  await processPackRemake(orderId,env);
  view=await packRemakeView(binding,orderId);
  assert.equal(view.phase,'checkpoint');assert.deepEqual(view.completedStages,[1]);
  assert.equal(db.prepare('SELECT stages_json FROM custom_pack_remakes WHERE order_id=?').get(orderId).stages_json,first,'the first checkpoint survives the repair');
  await processPackRemake(orderId,env);
  view=await packRemakeView(binding,orderId);
  assert.deepEqual(view.completedStages,[1,2]);
  assert.equal(calls.filter(name=>name==='story_frame').length,1);
  assert.equal(calls.filter(name=>name==='game_blueprint').length,1);
  assert.equal(calls.filter(name=>name==='checkpoint_material_repair').length,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,1,'the original artifact remains published');
  assert.ok(queue.length>=5);
});

test('a delivered quality-v15 pack without causal review can start one same-order update without generation on click',async()=>{
  const {db,binding}=database(),orderId='causal-upgrade-order',owner='causal-upgrade-owner';
  const spec={...clockSpec,packQualityVersion:15,packLayoutVersion:4,packCopyVersion:1};
  const stored=JSON.stringify(spec),original=new TextEncoder().encode('%PDF- original delivered pack');
  const hash=createHash('sha256').update(original).digest('hex'),queue=[];
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('causal-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,'causal-price',1499,'USD','published',CURRENT_TIMESTAMP)").run(orderId,stored,await sha256(stored),owner);
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('causal-activity',?,'published',?)").run(orderId,stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,access_expires_at) VALUES ('causal-entitlement',?,'causal-activity','active',datetime('now','+6 months'))").run(orderId);
  db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,pack_format_version,player_r2_key,guide_r2_key,player_sha256,guide_sha256) VALUES ('causal-artifact','causal-activity',1,'published',2,'original/player.pdf','original/guide.pdf',?,?)").run(hash,hash);
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>queue.push(job)},PRIVATE_FILES:{get:async()=>({body:original,customMetadata:{sha256:hash}})},FETCH:async()=>{throw Error('Starting an update must not call a provider');}};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const view=()=>handleProductionApi(request(`/api/v1/orders/${orderId}`,'GET',undefined,headers),env).then(response=>response.json());
  assert.equal((await view()).qualityUpgradeAvailable,true);
  assert.equal((await handleProductionApi(request(`/api/v1/orders/${orderId}/pack-remake`,'POST',undefined,headers),env)).status,202);
  assert.deepEqual(queue,[{type:'pack_remake',orderId}]);
  assert.equal(JSON.parse(db.prepare('SELECT spec_json FROM custom_pack_remakes WHERE order_id=?').get(orderId).spec_json).packCausalVersion,1);
  assert.equal((await view()).qualityUpgradeAvailable,false);
  assert.equal((await view()).remake.status,'queued');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,1);
  const download=await handleProductionApi(request(`/api/v1/files/${orderId}/player?paper=A4`,'GET',undefined,headers),env);
  assert.deepEqual(new Uint8Array(await download.arrayBuffer()),original);
});

test('current quality and revised checked packs cannot start the free full-pack upgrade',()=>{
  assert.equal(qualityUpgradeEligible(clockSpec,clockSpec,2,false),true);
  assert.equal(qualityUpgradeEligible({...clockSpec,packQualityVersion:3},clockSpec,2,false),true);
  assert.equal(qualityUpgradeEligible(clockSpec,{...clockSpec,packQualityVersion:3},2,false),true);
  assert.equal(qualityUpgradeEligible({...clockSpec,packQualityVersion:10,packLayoutVersion:4},{...clockSpec,packQualityVersion:10,packLayoutVersion:4},2,false),true);
  assert.equal(qualityUpgradeEligible({...clockSpec,packQualityVersion:11,packLayoutVersion:4},{...clockSpec,packQualityVersion:11,packLayoutVersion:4},2,false),true);
  assert.equal(qualityUpgradeEligible({...clockSpec,packQualityVersion:12,packLayoutVersion:4},{...clockSpec,packQualityVersion:12,packLayoutVersion:4},2,false),true);
  assert.equal(qualityUpgradeEligible({...clockSpec,packQualityVersion:13,packLayoutVersion:4},{...clockSpec,packQualityVersion:13,packLayoutVersion:4},2,false),true);
  assert.equal(qualityUpgradeEligible(clockSpec,clockSpec,2,false,{...clockSpec,packExperienceVersion:2}),true);
  assert.equal(qualityUpgradeEligible(clockSpec,clockSpec,2,false,{...clockSpec,packQualityVersion:3}),true);
  assert.equal(qualityUpgradeEligible(clockSpec,clockSpec,2,false,{...clockSpec,packQualityVersion:5,packLayoutVersion:3}),true);
  assert.equal(qualityUpgradeEligible(clockSpec,clockSpec,2,false,{...clockSpec,packQualityVersion:9,packLayoutVersion:4}),true);
  assert.equal(qualityUpgradeEligible(clockSpec,clockSpec,2,false,{...clockSpec,packQualityVersion:10,packLayoutVersion:4}),true);
  assert.equal(qualityUpgradeEligible(clockSpec,clockSpec,2,false,{...clockSpec,packQualityVersion:11,packLayoutVersion:4}),true);
  assert.equal(qualityUpgradeEligible(clockSpec,clockSpec,2,false,{...clockSpec,packQualityVersion:12,packLayoutVersion:4}),true);
  assert.equal(qualityUpgradeEligible(clockSpec,clockSpec,2,false,{...clockSpec,packQualityVersion:14,packLayoutVersion:4,packCopyVersion:1}),true,'a published pack without causal review can be updated');
  assert.equal(qualityUpgradeEligible(clockSpec,clockSpec,2,false,{...clockSpec,packQualityVersion:15,packLayoutVersion:4,packCopyVersion:1,packCausalVersion:1}),false);
  assert.equal(qualityUpgradeEligible(clockSpec,clockSpec,2,true),false);
  assert.equal(qualityUpgradeEligible(clockSpec,clockSpec,1,false),false);
});

test('superseded checked checkpoints do not exhaust the next blueprint repair',async()=>{
  const {db,binding}=database(),orderId='audit-repair-order';
  const spec={...clockSpec,packExperienceVersion:2,packQualityVersion:3};
  const specJson=JSON.stringify(spec),blueprint=prepareBlueprintCandidate(clockBlueprintContext,spec);
  const blueprintJson=JSON.stringify(blueprint);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('audit-repair-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(orderId,specJson,await sha256(specJson),'audit-repair-owner','audit-repair-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('audit-repair-activity',?,'published',?)").run(orderId,specJson);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,access_expires_at) VALUES ('audit-repair-entitlement',?,'audit-repair-activity','active',datetime('now','+6 months'))").run(orderId);
  db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,pack_format_version) VALUES ('audit-repair-original','audit-repair-activity',2,'published',2)").run();
  db.prepare("INSERT INTO custom_pack_remakes (order_id,status,phase,spec_json,spec_sha256,blueprint_json,blueprint_sha256,published_version,logic_epoch,quality_epoch) VALUES (?,'queued','checkpoint',?,?,?,?,2,1,1)").run(orderId,specJson,await sha256(specJson),blueprintJson,await sha256(blueprintJson));
  for(let cycle=1;cycle<=2;cycle++){
    db.prepare("INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,error_code,generation_round,logic_epoch,quality_epoch) VALUES (?,?, 'blueprint',0,'failed','fixture','AUDIT_REJECTED',1,1,1)").run(`repair-blueprint-${cycle}`,orderId);
    for(let stage=1;stage<=5;stage++)db.prepare("INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,error_code,generation_round,logic_epoch,quality_epoch) VALUES (?,?, 'checkpoint',?,'passed','checked-rules-v1','AUDIT_REJECTED',1,1,1)").run(`repair-stage-${cycle}-${stage}`,orderId,stage);
    db.prepare("INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,error_code,generation_round,logic_epoch,quality_epoch) VALUES (?,?, 'audit',0,'failed','fixture','GENERATION_QA_FAILED',1,1,1)").run(`repair-audit-${cycle}`,orderId);
  }
  db.prepare("INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,result_json,generation_round,logic_epoch,quality_epoch) VALUES ('repair-blueprint-3',?,'blueprint',0,'passed','fixture',?,1,1,1)").run(orderId,blueprintJson);
  const queue=[],files=new Map();
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>queue.push(job)},
    PRIVATE_FILES:{put:async(key,body,options)=>files.set(key,{body,customMetadata:options.customMetadata}),get:async key=>files.get(key)||null},
    FETCH:async(_url,init)=>{assert.equal(JSON.parse(init.body).text.format.name,'staged_story_audit');return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({pass:true,issues:[]})}]}]});}};
  queue.push({type:'pack_remake',orderId});
  for(let step=0;step<8;step++){
    const job=queue.shift();assert.ok(job,'saved work must advance without a second checkout');
    await productionWorker.queue({messages:[{body:job,ack(){},retry(){throw Error('queue retry is not needed');}}]},env);
    if(db.prepare('SELECT status FROM custom_pack_remakes WHERE order_id=?').get(orderId).status==='ready')break;
  }
  assert.equal(db.prepare('SELECT status FROM custom_pack_remakes WHERE order_id=?').get(orderId).status,'ready');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_pack_remake_calls WHERE order_id=? AND phase='checkpoint' AND stage_number=1").get(orderId).n,3);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM artifact_versions WHERE custom_activity_id='audit-repair-activity'").get().n,2);
  assert.ok(files.has(`custom/${orderId}/v3-paper-remake/player.pdf`));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders WHERE id=?').get(orderId).n,1);
});

test('a paid quality remake checks story semantics before saving any checkpoint and reuses that audit',async()=>{
  const {db,binding}=database(),orderId='preflight-remake-order';
  const spec={...clockSpec,packExperienceVersion:2,packQualityVersion:3};
  const specJson=JSON.stringify(spec);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('preflight-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(orderId,specJson,await sha256(specJson),'preflight-owner','preflight-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('preflight-activity',?,'published',?)").run(orderId,specJson);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,access_expires_at) VALUES ('preflight-entitlement',?,'preflight-activity','active',datetime('now','+6 months'))").run(orderId);
  db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,pack_format_version) VALUES ('preflight-original','preflight-activity',2,'published',2)").run();
  db.prepare("INSERT INTO custom_pack_remakes (order_id,status,phase,spec_json,spec_sha256,published_version,logic_epoch,quality_epoch) VALUES (?,'queued','blueprint',?,?,2,1,1)").run(orderId,specJson,await sha256(specJson));
  db.prepare("INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,error_code,error_detail,generation_round,logic_epoch,quality_epoch) VALUES ('preflight-older-review',?,'audit',0,'failed','fixture','GENERATION_QA_FAILED','Checkpoint 4: an earlier candidate had a contradictory witness',1,1,1)").run(orderId);
  const queue=[],files=new Map(),calls=[];let firstAudit=true;
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>queue.push(job)},
    PRIVATE_FILES:{put:async(key,body,options)=>files.set(key,{body,customMetadata:options.customMetadata}),get:async key=>files.get(key)||null},
    FETCH:async(_url,init)=>{
      const request=JSON.parse(init.body),name=request.text.format.name;calls.push(name);
      const value=name==='game_blueprint'?clockBlueprintContext:name==='paper_context_repair'?structuredClone(clockBlueprintContext.stages[4]):
        name==='staged_story_audit'&&firstAudit?(firstAudit=false,{pass:false,issues:[{stageNumber:5,reason:'The final action does not follow the selected findings.'}]}):{pass:true,issues:[]};
      return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:10}});
    }};
  const process=async()=>{const job=queue.shift();assert.ok(job);await productionWorker.queue({messages:[{body:job,ack(){},retry(){throw Error('unexpected retry');}}]},env);};
  queue.push({type:'pack_remake',orderId});
  await process();
  assert.equal(db.prepare('SELECT blueprint_json FROM custom_pack_remakes WHERE order_id=?').get(orderId).blueprint_json,null);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_pack_remake_calls WHERE order_id=? AND phase='checkpoint'").get(orderId).n,0);
  await process();
  assert.ok(db.prepare('SELECT blueprint_json FROM custom_pack_remakes WHERE order_id=?').get(orderId).blueprint_json);
  for(let i=0;i<7&&db.prepare('SELECT status FROM custom_pack_remakes WHERE order_id=?').get(orderId).status!=='ready';i++)await process();
  assert.equal(db.prepare('SELECT status FROM custom_pack_remakes WHERE order_id=?').get(orderId).status,'ready');
  assert.deepEqual(calls,['game_blueprint','staged_story_audit','paper_context_repair','staged_story_audit']);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_pack_remake_calls WHERE order_id=? AND phase='audit'").get(orderId).n,3);
  assert.ok(files.has(`custom/${orderId}/v3-paper-remake/player.pdf`));
});

test('a stopped quality upgrade can resume after the model-call budget fix without another payment',async()=>{
  const {db,binding}=database(),orderId='budget-recovery-order',specJson=JSON.stringify({...clockSpec,packExperienceVersion:2,packQualityVersion:3});
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('budget-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(orderId,specJson,await sha256(specJson),'budget-owner','budget-price');
  db.prepare("INSERT INTO custom_pack_remakes (order_id,status,phase,spec_json,spec_sha256,published_version,error_code,quality_epoch) VALUES (?,'failed','checkpoint',?,?,2,'REMAKE_BUDGET_EXHAUSTED',1)").run(orderId,specJson,await sha256(specJson));
  assert.equal((await packRemakeView(binding,orderId)).recoveryAvailable,true);
  const queue=[];
  const result=await retryPackRemake({id:orderId,product_kind:'custom',status:'published',paid_at:'2026-10-15'},
    {...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>queue.push(job)}});
  assert.equal(result.status,'queued');
  assert.equal(db.prepare('SELECT recovery_round FROM custom_pack_remakes WHERE order_id=?').get(orderId).recovery_round,1);
  assert.deepEqual(queue,[{type:'pack_remake',orderId}]);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders WHERE id=?').get(orderId).n,1);
});

test('an audit-stopped quality upgrade repairs its saved blueprint instead of auditing the same rejected game again',async()=>{
  const {db,binding}=database(),orderId='audit-recovery-order',specJson=JSON.stringify({...clockSpec,packExperienceVersion:2,packQualityVersion:3});
  const blueprintJson=JSON.stringify(prepareBlueprintCandidate(clockBlueprintContext,JSON.parse(specJson)));
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('audit-recovery-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(orderId,specJson,await sha256(specJson),'audit-recovery-owner','audit-recovery-price');
  db.prepare("INSERT INTO custom_pack_remakes (order_id,status,phase,spec_json,spec_sha256,blueprint_json,blueprint_sha256,stages_json,published_version,error_code,error_detail,logic_epoch,quality_epoch,recovery_round) VALUES (?,'failed','audit',?,?,?,?,?,2,'GENERATION_QA_FAILED','The completed game did not pass its quality check: Checkpoint 1: printed properties need review.',1,1,1)").run(orderId,specJson,await sha256(specJson),blueprintJson,await sha256(blueprintJson),JSON.stringify([{number:1}]));
  db.prepare("INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,result_json,generation_round,logic_epoch,quality_epoch) VALUES ('audit-recovery-blueprint',?,'blueprint',0,'passed','fixture',?,2,1,1)").run(orderId,blueprintJson);
  db.prepare("INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,result_json,generation_round,logic_epoch,quality_epoch) VALUES ('audit-recovery-stage',?,'checkpoint',1,'passed','checked-rules-v1','{}',2,1,1)").run(orderId);
  const queue=[],env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>queue.push(job)}};
  const result=await retryPackRemake({id:orderId,product_kind:'custom',status:'published',paid_at:'2026-10-15'},env);
  assert.equal(result.status,'queued');
  const saved=db.prepare('SELECT status,phase,blueprint_json,stages_json,recovery_round FROM custom_pack_remakes WHERE order_id=?').get(orderId);
  assert.deepEqual({...saved},{status:'queued',phase:'blueprint',blueprint_json:null,stages_json:'[]',recovery_round:2});
  const oldBlueprint=db.prepare("SELECT status,result_json,error_code FROM custom_pack_remake_calls WHERE id='audit-recovery-blueprint'").get();
  assert.equal(oldBlueprint.status,'failed');
  assert.equal(oldBlueprint.error_code,'AUDIT_REJECTED');
  assert.equal(oldBlueprint.result_json,blueprintJson,'the rejected candidate remains private for a targeted repair');
  assert.equal(db.prepare("SELECT result_json FROM custom_pack_remake_calls WHERE id='audit-recovery-stage'").get().result_json,null);
  assert.deepEqual(queue,[{type:'pack_remake',orderId}]);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders WHERE id=?').get(orderId).n,1);
});

test('quality v7 manual recovery keeps a saved blueprint and checkpoints after an audit failure',async()=>{
  const {db,binding}=database(),orderId='v7-audit-recovery',specJson=JSON.stringify({...clockSpec,packExperienceVersion:3,packQualityVersion:7});
  const blueprintJson=JSON.stringify({saved:'validated-blueprint'});
  const stagesJson=JSON.stringify([{number:1}]);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('v7-audit-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(orderId,specJson,await sha256(specJson),'v7-audit-owner','v7-audit-price');
  db.prepare("INSERT INTO custom_pack_remakes (order_id,status,phase,spec_json,spec_sha256,blueprint_json,blueprint_sha256,stages_json,error_code,error_detail,logic_epoch,quality_epoch,recovery_round) VALUES (?,'failed','audit',?,?,?,?,?,'GENERATION_QA_FAILED','The completed game did not pass its quality check: Checkpoint 2: story link needs repair.',1,1,0)").run(orderId,specJson,await sha256(specJson),blueprintJson,await sha256(blueprintJson),stagesJson);
  const queue=[],env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>queue.push(job)}};
  await retryPackRemake({id:orderId,product_kind:'custom',status:'published',paid_at:'2026-10-15'},env);
  const row=db.prepare('SELECT status,phase,blueprint_json,stages_json,recovery_round FROM custom_pack_remakes WHERE order_id=?').get(orderId);
  assert.deepEqual({...row},{status:'queued',phase:'audit',blueprint_json:blueprintJson,stages_json:stagesJson,recovery_round:1});
  assert.deepEqual(queue,[{type:'pack_remake',orderId}]);
});

test('an exhausted blueprint remake reuses its saved candidate and publishes a new pack without another blueprint call',async()=>{
  const {db,binding}=database(),owner='saved-blueprint-owner',spec={...clockSpec,packExperienceVersion:2};
  const stored=JSON.stringify(spec),original=new TextEncoder().encode('%PDF- earlier paid pack');
  const originalHash=createHash('sha256').update(original).digest('hex');
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('saved-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('saved-order','custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(stored,await sha256(stored),owner,'saved-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('saved-activity','saved-order','published',?)").run(stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,access_expires_at) VALUES ('saved-entitlement','saved-order','saved-activity','active',datetime('now','+6 months'))").run();
  db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,pack_format_version,player_r2_key,guide_r2_key,player_sha256,guide_sha256) VALUES ('saved-artifact','saved-activity',1,'published',2,'earlier/player.pdf','earlier/guide.pdf',?,?)").run(originalHash,originalHash);
  db.prepare("INSERT INTO custom_pack_remakes (order_id,status,phase,spec_json,spec_sha256,error_code,recovery_round,logic_epoch) VALUES ('saved-order','failed','blueprint',?,?,'BLUEPRINT_INVALID',2,0)").run(stored,await sha256(stored));
  const candidate=structuredClone(clockBlueprintContext);
  candidate.stages[2].material.items[3].label='Heard noon chime';
  db.prepare("INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,result_json,error_code,generation_round,logic_epoch) VALUES ('saved-call','saved-order','blueprint',0,'failed','fixture',?,'BLUEPRINT_INVALID',3,0)").run(JSON.stringify(candidate));
  const queue=[],files=new Map([['earlier/player.pdf',{body:original,customMetadata:{sha256:originalHash}}],['earlier/guide.pdf',{body:original,customMetadata:{sha256:originalHash}}]]);
  const names=[];
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>queue.push(job)},PRIVATE_FILES:{get:async key=>files.get(key)||null,put:async(key,body,options)=>files.set(key,{body,customMetadata:options.customMetadata})},FETCH:async(_url,init)=>{const name=JSON.parse(init.body).text.format.name;names.push(name);assert.equal(name,'staged_story_audit');return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({pass:true,issues:[]})}]}]});}};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const view=()=>handleProductionApi(request('/api/v1/orders/saved-order','GET',undefined,headers),env).then(response=>response.json());
  assert.equal((await view()).remake.recoveryAvailable,true);
  const retry=await handleProductionApi(request('/api/v1/orders/saved-order/pack-remake/retry','POST',undefined,headers),env);
  assert.equal(retry.status,202,await retry.text());
  assert.equal(db.prepare("SELECT phase,logic_epoch FROM custom_pack_remakes WHERE order_id='saved-order'").get().phase,'checkpoint');
  assert.equal(db.prepare("SELECT logic_epoch FROM custom_pack_remakes WHERE order_id='saved-order'").get().logic_epoch,1);
  for(let step=0;step<12&&(await view()).remake.status!=='ready';step++){
    const job=queue.shift();assert.equal(job?.type,'pack_remake');
    await productionWorker.queue({messages:[{body:job,ack(){},retry(){throw Error('saved blueprint recovery should not need queue retry');}}]},env);
    if((await view()).remake.status!=='ready')assert.equal(db.prepare("SELECT COUNT(*) AS n FROM artifact_versions WHERE custom_activity_id='saved-activity'").get().n,1);
  }
  assert.equal((await view()).remake.status,'ready');
  assert.equal((await view()).remake.publishedVersion,2);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM artifact_versions WHERE custom_activity_id='saved-activity'").get().n,2);
  assert.equal(names.includes('game_blueprint'),false);
  assert.equal(db.prepare("SELECT status FROM custom_pack_remake_calls WHERE id='saved-call'").get().status,'failed','the original diagnostic history is retained');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
});

test('an original checked pack can publish a checkpoint revision without a remake or model call',async()=>{
  const {db,binding}=database(),owner='checked-original-owner';
  const spec={...sampleSpec,creatorVersion:3,packLogicVersion:1};
  const stored=JSON.stringify(spec);
  const stages=sampleStory.stages.map((original,index)=>{
    const puzzle=compileControlledPuzzle({number:index+1,title:original.title,material:original.material});
    return {...original,...controlledStageText(puzzle),options:puzzle.options,answerIndex:puzzle.answerIndex,material:puzzle.material};
  });
  const story=validateGeneratedStory({...sampleStory,stages},spec),storyJson=JSON.stringify(story),storyHash=await sha256(storyJson);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('checked-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('checked-order','custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(stored,await sha256(stored),owner,'checked-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('checked-activity','checked-order','published',?)").run(stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit,revision_expires_at,access_expires_at) VALUES ('checked-entitlement','checked-order','checked-activity','active',2,datetime('now','+20 days'),datetime('now','+6 months'))").run();
  db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,story_r2_key,story_sha256,pack_format_version) VALUES ('checked-artifact','checked-activity',1,'published','original/story.json',?,2)").run(storyHash);
  const queue=[],files=new Map([['original/story.json',{body:storyJson,customMetadata:{sha256:storyHash}}]]);
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>queue.push(job)},FETCH:async()=>{throw Error('Checked revisions cannot call a model');},PRIVATE_FILES:{get:async key=>files.get(key),put:async(key,body,options)=>files.set(key,{body,...options})}};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const response=await handleProductionApi(request('/api/v1/orders/checked-order/revisions','POST',{stageNumber:2,instruction:'Clarify the instructions and hint.'},{cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN}),env);
  assert.equal(response.status,202,await response.text());
  await productionWorker.queue({messages:[{body:queue[0],ack(){},retry(){throw Error('A valid checked revision must publish');}}]},env);
  assert.equal(db.prepare("SELECT status FROM revision_requests WHERE order_id='checked-order'").get().status,'published');
  assert.equal(db.prepare("SELECT revision_success_used FROM entitlements WHERE order_id='checked-order'").get().revision_success_used,1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_pack_remakes").get().n,0);
  assert.ok(files.has('custom/checked-order/v2/player.pdf'));
  assert.ok(files.has('custom/checked-order/v2/guide.pdf'));
});

test('a failed paid remake can recover twice without paying again or reusing exhausted model calls',async()=>{
  const {db,binding}=database(),owner='recovery-owner';
  const purchase=JSON.stringify({...sampleSpec,gamePackVersion:1});
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('old-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('remake-failed','custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(purchase,await sha256(purchase),owner,'old-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('old-activity','remake-failed','published',?)").run(purchase);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,access_expires_at) VALUES ('old-entitlement','remake-failed','old-activity','active',datetime('now','+6 months'))").run();
  const specJson=JSON.stringify({...sampleSpec,packLogicVersion:1});
  db.prepare("INSERT INTO custom_pack_remakes (order_id,status,phase,spec_json,spec_sha256,error_code,failure_count) VALUES ('remake-failed','failed','blueprint',?,?,'BLUEPRINT_INVALID',2)").run(specJson,await sha256(specJson));
  for(let i=1;i<=2;i++) db.prepare("INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,error_code) VALUES (?, 'remake-failed','blueprint',0,'failed','fixture','BLUEPRINT_INVALID')").run(`old-blueprint-${i}`);
  const queued=[];
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture-model',GENERATION_QUEUE:{send:async job=>queued.push(job)},PRIVATE_FILES:{get:async()=>null},
    FETCH:async()=>Response.json({id:'recovered-blueprint',output:[{content:[{type:'output_text',text:JSON.stringify({ending:sampleStory.ending,groupInstructions:'',stages:sampleStory.stages.map(stage=>({question:stage.clue,evidence:stage.clue,options:stage.options,answerIndex:stage.answerIndex,unlock:stage.unlock,material:{...stage.material,items:stage.material.items.slice(0,['order_tiles','symbol_key'].includes(stage.material.type)?4:3)}}))})}]}],usage:{input_tokens:10,output_tokens:20}})};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const retry=()=>handleProductionApi(request('/api/v1/orders/remake-failed/pack-remake/retry','POST',undefined,headers),env);
  assert.equal((await retry()).status,202);
  assert.equal((await retry()).status,409,'the same paid order allows only one recovery request');
  assert.equal(db.prepare("SELECT recovery_count,status FROM custom_pack_remakes WHERE order_id='remake-failed'").get().recovery_count,1);
  await productionWorker.queue({messages:[{body:queued.shift(),ack(){},retry(){throw Error('queue job should not retry');}}]},env);
  assert.equal(db.prepare("SELECT round_number,status FROM custom_pack_remake_calls WHERE order_id='remake-failed' ORDER BY round_number DESC LIMIT 1").get().round_number,2);
  assert.equal(db.prepare("SELECT status,phase FROM custom_pack_remakes WHERE order_id='remake-failed'").get().phase,'checkpoint');
  db.prepare("UPDATE custom_pack_remakes SET status='failed',error_code='STAGE_INVALID' WHERE order_id='remake-failed'").run();
  assert.equal((await retry()).status,202,'a later checkpoint validation failure can resume the same paid order');
  assert.equal(db.prepare("SELECT recovery_round,status FROM custom_pack_remakes WHERE order_id='remake-failed'").get().recovery_round,2);
  assert.equal((await retry()).status,409,'a queued recovery cannot be submitted twice');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
});

test('an exhausted old paid remake can restart once with checked puzzles and no second payment',async()=>{
  const {db,binding}=database(),owner='upgrade-owner';
  const purchase=JSON.stringify({...sampleSpec,gamePackVersion:1});
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('upgrade-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('upgrade-order','custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(purchase,await sha256(purchase),owner,'upgrade-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('upgrade-activity','upgrade-order','published',?)").run(purchase);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,access_expires_at) VALUES ('upgrade-entitlement','upgrade-order','upgrade-activity','active',datetime('now','+6 months'))").run();
  const oldSpec=JSON.stringify({...sampleSpec,gamePackVersion:2});
  db.prepare("INSERT INTO custom_pack_remakes (order_id,status,phase,spec_json,spec_sha256,blueprint_json,blueprint_sha256,stages_json,error_code,recovery_round) VALUES ('upgrade-order','failed','audit',?,?,?,?,'[]','GENERATION_QA_FAILED',2)").run(oldSpec,await sha256(oldSpec),'{"old":"blueprint"}','old-hash');
  db.prepare("INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,result_json,generation_round) VALUES ('old-upgrade-call','upgrade-order','blueprint',0,'passed','fixture',?,3)").run(JSON.stringify({old:'result'}));
  const queued=[];
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture-model',GENERATION_QUEUE:{send:async job=>queued.push(job)},PRIVATE_FILES:{get:async()=>null}};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const retry=()=>handleProductionApi(request('/api/v1/orders/upgrade-order/pack-remake/retry','POST',undefined,headers),env);
  const upgradedResponse=await retry();
  assert.equal(upgradedResponse.status,202,await upgradedResponse.text());
  const saved=db.prepare("SELECT status,phase,spec_json,blueprint_json,recovery_round,logic_epoch FROM custom_pack_remakes WHERE order_id='upgrade-order'").get();
  assert.equal(saved.status,'queued');assert.equal(saved.phase,'blueprint');assert.equal(saved.blueprint_json,null);
  assert.equal(saved.recovery_round,0);assert.equal(saved.logic_epoch,1);assert.equal(JSON.parse(saved.spec_json).packLogicVersion,1);
  assert.equal(db.prepare("SELECT result_json,logic_epoch FROM custom_pack_remake_calls WHERE id='old-upgrade-call'").get().logic_epoch,0);
  assert.ok(db.prepare("SELECT result_json FROM custom_pack_remake_calls WHERE id='old-upgrade-call'").get().result_json,'older call history remains available for support');
  assert.deepEqual(queued,[{type:'pack_remake',orderId:'upgrade-order'}]);
  assert.equal((await retry()).status,409);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
});

test('a failed V2 quality remake migrates to V3 on the same paid order even when logic version is current',async()=>{
  const {db,binding}=database(),orderId='stale-experience-order';
  const priceId='stale-experience-price',activityId='stale-experience-activity';
  const savedSpec={...clockSpec,packExperienceVersion:2,packQualityVersion:3};
  const savedJson=JSON.stringify(savedSpec);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES (?,'custom_home','USD',1499,'exclusive',1)").run(priceId);
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(orderId,savedJson,await sha256(savedJson),'stale-owner',priceId);
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES (?,?,'published',?)").run(activityId,orderId,savedJson);
  db.prepare("INSERT INTO custom_pack_remakes (order_id,status,phase,spec_json,spec_sha256,published_version,error_code,recovery_round,logic_epoch,quality_epoch) VALUES (?,'failed','blueprint',?,?,2,'BLUEPRINT_INVALID',2,1,3)").run(orderId,savedJson,await sha256(savedJson));
  db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,story_r2_key,story_sha256,pack_format_version) VALUES ('stale-original',?,2,'published','original/story.json','original-hash',2)").run(activityId);
  const queued=[];
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture-model',GENERATION_QUEUE:{send:async job=>queued.push(job)},PRIVATE_FILES:{get:async()=>null}};
  const order=db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);

  const result=await retryPackRemake(order,env);

  assert.deepEqual(result,{status:'queued',recovery:true,upgraded:true});
  const saved=db.prepare('SELECT status,phase,spec_json,published_version,recovery_round,logic_epoch,quality_epoch,blueprint_json,stages_json FROM custom_pack_remakes WHERE order_id=?').get(orderId);
  const upgraded=JSON.parse(saved.spec_json);
  assert.equal(upgraded.packExperienceVersion,3);
  assert.equal(upgraded.packQualityVersion,14);
  assert.equal(upgraded.packLayoutVersion,4);
  assert.equal(saved.status,'queued');assert.equal(saved.phase,'blueprint');
  assert.equal(saved.published_version,2,'the downloadable original stays published during the upgrade');
  assert.equal(saved.recovery_round,0);assert.equal(saved.logic_epoch,1);assert.equal(saved.quality_epoch,4);
  assert.equal(saved.blueprint_json,null);assert.equal(saved.stages_json,'[]');
  assert.equal(db.prepare("SELECT status FROM artifact_versions WHERE id='stale-original'").get().status,'published');
  assert.deepEqual(queued,[{type:'pack_remake',orderId}]);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders WHERE id=?').get(orderId).n,1);
});

test('a failed paid first plan offers one free recovery without another checkout or spending edits',async()=>{
  const {db,binding}=database();
  const owner=await sha256('test-session-secret|adult@example.com');
  const spec=validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'A clock tower that stopped at noon',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec;
  const stored=JSON.stringify(spec);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('recovery-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status) VALUES ('recovery-order','custom','custom_home',?,?,?,?,1499,'USD','paid')").run(stored,await sha256(stored),owner,'recovery-price');
  db.prepare("INSERT INTO custom_plan_orders (order_id,status) VALUES ('recovery-order','needs_help')").run();
  db.prepare("INSERT INTO custom_plan_requests (id,order_id,kind,status,attempts) VALUES ('recovery-initial','recovery-order','initial','failed',3)").run();
  const queued=[];
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture-model',GENERATION_QUEUE:{send:async job=>queued.push(job)},FETCH:async(_url,options)=>{
    const payload=JSON.parse(options.body);
    const value=payload.text.format.name==='paid_plan_audit'?{pass:true,issues:[]}:planFixture(spec);
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]});
  }};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const get=()=>handleProductionApi(request('/api/v1/orders/recovery-order','GET',undefined,headers),env).then(response=>response.json());
  const post=()=>handleProductionApi(request('/api/v1/orders/recovery-order/plan','POST',{action:'retry_initial'},headers),env);
  assert.equal((await get()).planReview.retryAvailable,true);
  assert.equal((await post()).status,202);
  assert.equal((await post()).status,409,'a second click cannot queue another request');
  assert.equal((await get()).planReview.status,'queued');
  assert.equal(queued.length,1);
  await productionWorker.queue({messages:[{body:queued[0],ack(){},retry(){throw Error('unexpected retry');}}]},env);
  const viewed=await get();
  assert.equal(viewed.planReview.status,'review');
  assert.equal(viewed.planReview.versions.length,1);
  assert.equal(viewed.planReview.fullUsed,0);
  assert.equal(viewed.planReview.targetedUsed,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM orders WHERE id='recovery-order'").get().count,1);
});


test('contract delivery repairs one rejected context, then retries PDF storage without more AI calls',async()=>{
  const {db,binding}=database();
  const stored=JSON.stringify({...clockSpec,onlineRedownloadMonths:12,accessPolicyVersion:productRights.version});
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('contract-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('contract-order','custom','custom_home',?,?,?,?,1499,'USD','paid',CURRENT_TIMESTAMP)").run(stored,await sha256(stored),'contract-owner','contract-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json,generation_version) VALUES ('contract-activity','contract-order','queued',?,2)").run(stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit) VALUES ('contract-entitlement','contract-order','contract-activity','active',2)").run();
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,confirmed_version) VALUES ('contract-order','confirmed',1)").run();
  const calls=[],files=new Map();let reject=true,storageFails=true;
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async()=>{}},
    PRIVATE_FILES:{put:async(key,bytes,options)=>{if(storageFails){storageFails=false;throw Error('Temporary storage failure');}files.set(key,{bytes,options});},head:async key=>files.has(key)?{customMetadata:files.get(key).options.customMetadata}:null},
    FETCH:async(url,request)=>{
      const body=JSON.parse(request.body),name=body.text.format.name;calls.push(name);
      let value;
      if(name==='game_blueprint')value=clockBlueprintContext;
      else if(name==='paper_context_repair'){
        assert.equal(JSON.parse(body.input).checkpoint.number,3);
        value=structuredClone(clockBlueprintContext.stages[2]);value.material.items[0].label='Pause noon signal';
      }else if(name==='staged_story_audit')value=reject?(reject=false,{pass:false,issues:[{stageNumber:3,reason:'Clarify the first clock repair step.'}]}):{pass:true,issues:[]};
      else throw Error('Unexpected model request: '+name);
      return Response.json({id:'contract-'+calls.length,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:20}});
    }};
  const process=()=>productionWorker.queue({messages:[{body:{orderId:'contract-order'},ack(){},retry(){}}]},env);
  for(let i=0;i<8&&db.prepare("SELECT status FROM orders WHERE id='contract-order'").get().status!=='published';i++)await process();
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='contract-order'").get().status,'published');
  assert.deepEqual(calls,['game_blueprint','staged_story_audit','paper_context_repair','staged_story_audit']);
  assert.equal(files.size,3);
  const stages=db.prepare("SELECT stage_json FROM custom_game_stages WHERE order_id='contract-order' ORDER BY stage_number").all().map(row=>JSON.parse(row.stage_json));
  assert.equal(stages.length,5);assert.equal(stages[2].material.items[0].label,'Pause noon signal');
  assert.deepEqual(stages[4].material.logic.previousDigits,['3','1','2','3']);
  const count=calls.length;await process();assert.equal(calls.length,count);
});

test('a new paid order publishes the checked baseline without a final copy model call',async()=>{
  const {db,binding}=database(),orderId='playable-baseline-order';
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:4,packLayoutVersion:4,
    packCopyVersion:1,packCausalVersion:1,packPlayableReviewVersion:1,packDeliveryPolicyVersion:2,
    onlineRedownloadMonths:12,accessPolicyVersion:productRights.version};
  const stored=JSON.stringify(spec),specHash=await sha256(stored);
  const blueprint=prepareBlueprintCandidate(linkedClockContext(),spec),blueprintJson=JSON.stringify(blueprint),blueprintHash=await sha256(blueprintJson);
  const stages=[];
  for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{},()=>{throw Error('No checkpoint model call');})).stage);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('baseline-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,?,1499,'USD','paid',CURRENT_TIMESTAMP)").run(orderId,stored,specHash,'baseline-owner','baseline-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json,generation_version) VALUES ('baseline-activity',?,'queued',?,2)").run(orderId,stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit) VALUES ('baseline-entitlement',?,'baseline-activity','active',2)").run(orderId);
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,confirmed_version) VALUES (?,'confirmed',1)").run(orderId);
  db.prepare('INSERT INTO custom_game_blueprints (order_id,spec_sha256,blueprint_sha256,blueprint_json) VALUES (?,?,?,?)').run(orderId,specHash,blueprintHash,blueprintJson);
  for(const stage of stages)db.prepare('INSERT INTO custom_game_stages (order_id,stage_number,blueprint_sha256,stage_json) VALUES (?,?,?,?)').run(orderId,stage.number,blueprintHash,JSON.stringify(stage));
  const queue=[{orderId}],files=new Map();let copyCalls=0;
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>queue.push(job)},
    PRIVATE_FILES:{put:async(key,bytes,options)=>files.set(key,{bytes,options}),head:async key=>files.has(key)?{customMetadata:files.get(key).options.customMetadata}:null},
    FETCH:async()=>{copyCalls++;throw Error('No final copy model call is allowed');}};
  for(let step=0;step<3&&db.prepare('SELECT status FROM orders WHERE id=?').get(orderId).status!=='published';step++){
    const job=queue.shift();assert.ok(job);
    await productionWorker.queue({messages:[{body:job,ack(){},retry(){throw Error('The saved baseline should publish');}}]},env);
  }
  assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(orderId).status,'published');
  assert.equal(db.prepare('SELECT phase,calls FROM custom_delivery_copy WHERE order_id=?').get(orderId).phase,'baseline_ready');
  assert.equal(copyCalls,0,'the five checked checkpoints publish without another model call');
  assert.equal(files.size,3);
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:'baseline-owner',exp:Math.floor(Date.now()/1000)+3600});
  const view=await handleProductionApi(request(`/api/v1/orders/${orderId}`,'GET',undefined,{cookie:`paw_session=${token}`}),env).then(response=>response.json());
  assert.equal(view.deliveryCheckKind,'puzzle_and_pdf');
  assert.equal(view.contentReviewPassed,false,'the page must not claim an independent content review');
});

test('quality v15 reserves every first stage call and publishes both PDFs plus the complete ZIP after old retries',async()=>{
  const {db,binding}=database(),orderId='reserved-stage-order';
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:15,packLayoutVersion:4,onlineRedownloadMonths:12,accessPolicyVersion:productRights.version};
  delete spec.packCopyVersion;
  const stored=JSON.stringify(spec);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('reserved-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,?,1499,'USD','paid',CURRENT_TIMESTAMP)").run(orderId,stored,await sha256(stored),'reserved-owner','reserved-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json,generation_version) VALUES ('reserved-activity',?,'queued',?,2)").run(orderId,stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit) VALUES ('reserved-entitlement',?,'reserved-activity','active',2)").run(orderId);
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,confirmed_version) VALUES (?,'confirmed',1)").run(orderId);
  const history=db.prepare("INSERT INTO custom_generation_calls (id,order_id,phase,stage_number,status,model,error_code) VALUES (?,?, 'blueprint',5,'failed','fixture','BLUEPRINT_INVALID')");
  for(let index=0;index<18;index++)history.run(`historical-${index}`,orderId);
  const context=linkedClockContext(),storyFrame={problem:context.spine.problem,actions:context.stages[4].material.items.map(item=>item.label),discoveries:[
    {finding:'The signal gear is missing.',consequence:'The missing noon mark points to the gear.',supportsAction:'signal gear'},
    {finding:'The spare gear fits the shaft.',consequence:'The gear can turn without binding.',supportsAction:'signal gear'},
    {finding:'The checked order protects the teeth.',consequence:'The wheel stays aligned during repair.',supportsAction:'signal gear'},
    {finding:'The upper bridge reaches the gear room.',consequence:'The upper bridge can carry the part.',supportsAction:'signal gear'},
  ]};
  const materialContext=structuredClone(context);delete materialContext.spine;
  materialContext.celebration='The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.';
  const queue=[{orderId}],files=new Map(),providerNames=[];
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>queue.push(job)},
    PRIVATE_FILES:{put:async(key,body,options)=>files.set(key,{body,customMetadata:options.customMetadata}),head:async key=>files.has(key)?{customMetadata:files.get(key).customMetadata}:null},
    FETCH:async(_url,init)=>{const body=JSON.parse(init.body),name=body.text.format.name,input=JSON.parse(body.input);providerNames.push(name);
      const value=name==='story_frame'?storyFrame:name==='blueprint_material_stage'?materialContext.stages[input.checkpoint-1]:name==='blueprint_celebration'?{celebration:materialContext.celebration}:name==='grounded_discoveries'?{consequences:storyFrame.discoveries.map(({consequence})=>consequence)}:null;
      assert.ok(value,`unexpected provider request ${name}`);
      return Response.json({id:`reserved-${providerNames.length}`,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:10}});
    }};
  for(let step=0;step<4&&db.prepare('SELECT status FROM orders WHERE id=?').get(orderId).status!=='published';step++){
    const job=queue.shift();assert.ok(job,'the saved order should continue to its PDF step');
    await productionWorker.queue({messages:[{body:job,ack(){},retry(){throw Error('fixture should not need a queue retry');}}]},env);
  }
  assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(orderId).status,'published');
  const savedMaterial=JSON.parse(db.prepare("SELECT result_json FROM custom_generation_calls WHERE order_id=? AND phase='blueprint_material' AND stage_number=1 AND status='passed'").get(orderId).result_json);
  assert.ok(savedMaterial.material.title.length<=45,'the playable title is shortened before the saved blueprint');
  assert.equal(providerNames.filter(name=>name==='staged_story_audit').length,0,'quality v15 completes its final audit without a provider request');
  assert.equal(db.prepare("SELECT model FROM custom_generation_calls WHERE order_id=? AND phase='audit'").get(orderId).model,'checked-rules-v1');
  const artifact=db.prepare("SELECT player_r2_key,guide_r2_key FROM artifact_versions WHERE custom_activity_id='reserved-activity' AND status='published'").get();
  const player=new Uint8Array(files.get(artifact.player_r2_key).body),guide=new Uint8Array(files.get(artifact.guide_r2_key).body);
  assert.equal(new TextDecoder().decode(player.slice(0,5)),'%PDF-');
  assert.equal(new TextDecoder().decode(guide.slice(0,5)),'%PDF-');
  const zip=new Uint8Array(await createDownloadZip([{name:'player-A4.pdf',data:player},{name:'guide-A4.pdf',data:guide}]).arrayBuffer());
  assert.equal(new DataView(zip.buffer,zip.byteOffset,zip.byteLength).getUint32(0,true),0x04034b50);
  assert.match(new TextDecoder().decode(zip),/player-A4\.pdf[\s\S]*guide-A4\.pdf/);
});

test('quality v8 repairs an ending without rebuilding five saved paid checkpoints',async()=>{
  const {db,binding}=database(),orderId='v8-ending-order',owner='v8-owner';
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:8,packLayoutVersion:4,onlineRedownloadMonths:12,accessPolicyVersion:productRights.version};
  const stored=JSON.stringify(spec);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('v8-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,?,1499,'USD','paid',CURRENT_TIMESTAMP)").run(orderId,stored,await sha256(stored),owner,'v8-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json,generation_version) VALUES (?,?,'queued',?,2)").run('v8-activity',orderId,stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit) VALUES (?,?,'v8-activity','active',2)").run('v8-entitlement',orderId);
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,confirmed_version) VALUES (?,'confirmed',1)").run(orderId);
  const context=linkedClockContext(),frame={problem:context.spine.problem,actions:context.stages[4].material.items.map(item=>item.label),discoveries:[
    {finding:'The signal gear is missing.',consequence:'The missing noon mark points to the gear.',supportsAction:'signal gear'},
    {finding:'The spare gear fits the shaft.',consequence:'The gear can turn without binding.',supportsAction:'signal gear'},
    {finding:'The checked order protects the teeth.',consequence:'The wheel stays aligned during repair.',supportsAction:'Fit signal gear'},
    {finding:'The upper bridge reaches the gear room.',consequence:'The upper bridge can carry the part.',supportsAction:'signal gear'},
  ]};
  const material={celebration:'The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.',stages:context.stages};
  const files=new Map(),calls=[];let reject=true;
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async()=>{}},
    PRIVATE_FILES:{put:async(key,bytes,options)=>files.set(key,{bytes,options}),head:async key=>files.has(key)?{customMetadata:files.get(key).options.customMetadata}:null},
    FETCH:async(_url,request)=>{
      const body=JSON.parse(request.body),name=body.text.format.name,input=JSON.parse(body.input);calls.push(name);
      const value=name==='story_frame'?frame:name==='blueprint_material_stage'?material.stages[input.checkpoint-1]:name==='blueprint_celebration'?{celebration:material.celebration}:name==='grounded_discoveries'
        ?{consequences:frame.discoveries.map(({consequence})=>consequence)}:name==='closing_repair'
        ?{celebration:'The repaired gear spins and the noon bell rings across the square. Pip cheers, thanks the team, and sets out on the journey.'}
        :name==='staged_story_adjudication'?{pass:false,issues:[{stageNumber:0,reason:'The ending needs a concrete noon-bell result.'}]}
        :name==='staged_story_audit'?reject?(reject=false,{pass:false,issues:[{stageNumber:0,reason:'The ending needs a concrete noon-bell result.'}]}):{pass:true,issues:[]}
        :null;
      assert.ok(value,`unexpected provider request ${name}`);
      return Response.json({id:`v8-${calls.length}`,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:20}});
    }};
  const process=()=>productionWorker.queue({messages:[{body:{orderId},ack(){},retry(){throw Error('Unexpected queue retry');}}]},env);
  for(let step=0;step<4&&db.prepare('SELECT status FROM orders WHERE id=?').get(orderId).status!=='published';step++)await process();
  assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(orderId).status,'published');
  assert.deepEqual(calls,['story_frame','blueprint_material_stage','blueprint_material_stage','blueprint_material_stage','blueprint_material_stage','blueprint_celebration','grounded_discoveries','staged_story_audit','staged_story_adjudication','closing_repair','staged_story_audit']);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_generation_calls WHERE order_id=? AND phase='checkpoint'").get(orderId).n,5);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
  assert.equal(files.size,3);
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const view=await handleProductionApi(request(`/api/v1/orders/${orderId}`,'GET',undefined,{cookie:`paw_session=${token}`}),env).then(response=>response.json());
  assert.equal(view.contentReviewPassed,true);
});

test('a failed assembly rechecks saved material and replaces only the stale step within one bounded assembly recovery',async()=>{
  const {db,binding}=database(),orderId='saved-material-order';
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:8,onlineRedownloadMonths:12,accessPolicyVersion:productRights.version};
  const stored=JSON.stringify(spec),context=linkedClockContext();
  const frame={problem:context.spine.problem,actions:context.stages[4].material.items.map(item=>item.label),discoveries:[
    {finding:'The signal gear is missing.',consequence:'The missing noon mark points to the gear.',supportsAction:'signal gear'},
    {finding:'The spare gear fits the shaft.',consequence:'The gear can turn without binding.',supportsAction:'signal gear'},
    {finding:'The checked order protects the teeth.',consequence:'The wheel stays aligned during repair.',supportsAction:'Fit signal gear'},
    {finding:'The upper bridge reaches the gear room.',consequence:'The upper bridge can carry the part.',supportsAction:'signal gear'},
  ]};
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('saved-material-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,'saved-material-price',1499,'USD','paid',CURRENT_TIMESTAMP)").run(orderId,stored,await sha256(stored),'saved-material-owner');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json,generation_version) VALUES ('saved-material-activity',?,'queued',?,2)").run(orderId,stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status) VALUES ('saved-material-entitlement',?,'saved-material-activity','active')").run(orderId);
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,confirmed_version) VALUES (?,'confirmed',1)").run(orderId);
  const savedCall=db.prepare("INSERT INTO custom_generation_calls (id,order_id,phase,stage_number,status,model,result_json,error_code,error_detail) VALUES (?,?,?,?,'passed','fixture',?,NULL,NULL)");
  savedCall.run('saved-frame',orderId,'blueprint_frame',0,JSON.stringify(frame));
  for(let number=1;number<=5;number++){
    const material=structuredClone(context.stages[number-1]);
    if(number===1)material.features=['Mentions answer','Names result'];
    savedCall.run(`saved-material-${number}`,orderId,'blueprint_material',number,JSON.stringify(material));
  }
  savedCall.run('saved-closing',orderId,'blueprint_closing',0,JSON.stringify('The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.'));
  for(let attempt=1;attempt<=5;attempt++)db.prepare("INSERT INTO custom_generation_calls (id,order_id,phase,stage_number,status,model,result_json,error_code,error_detail) VALUES (?,?,'blueprint',0,'failed','fixture','{}','BLUEPRINT_INVALID','Checkpoint 1 needs two concrete, distinct printed record facts')").run(`failed-assembly-${attempt}`,orderId);
  const calls=[];
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async()=>{}},FETCH:async(_url,request)=>{
    const body=JSON.parse(request.body),name=body.text.format.name,input=JSON.parse(body.input);calls.push(name);
    const value=name==='blueprint_material_stage'?context.stages[input.checkpoint-1]
      :name==='grounded_discoveries'?{consequences:frame.discoveries.map(({consequence})=>consequence)}
      :name==='staged_story_audit'?{pass:true,issues:[]}:null;
    assert.ok(value,`unexpected provider request ${name}`);
    return Response.json({id:`saved-material-${calls.length}`,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:10}});
  }};
  await productionWorker.queue({messages:[{body:{orderId},ack(){},retry(){throw Error('unexpected queue retry');}}]},env);
  assert.equal(db.prepare("SELECT error_code FROM custom_generation_calls WHERE id='saved-material-1'").get().error_code,'SAVED_STEP_INVALID');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_generation_calls WHERE order_id=? AND phase='blueprint_material' AND stage_number=1").get(orderId).n,2);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_generation_calls WHERE order_id=? AND phase='blueprint_material' AND stage_number=2").get(orderId).n,1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_generation_calls WHERE order_id=? AND phase='blueprint' AND stage_number=0").get(orderId).n,6);
  assert.deepEqual(calls.slice(0,2),['blueprint_material_stage','grounded_discoveries']);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_game_blueprints WHERE order_id=?').get(orderId).n,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_game_stages WHERE order_id=?').get(orderId).n,5);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
});

test('a same-order remake resumes past a failed assembly by replacing its one stale saved material',async()=>{
  const {db,binding}=database(),orderId='remake-saved-material';
  const spec={...clockSpec,packExperienceVersion:3,packQualityVersion:8,onlineRedownloadMonths:12,accessPolicyVersion:productRights.version};
  const stored=JSON.stringify(spec),context=linkedClockContext();
  const frame={problem:context.spine.problem,actions:context.stages[4].material.items.map(item=>item.label),discoveries:[
    {finding:'The signal gear is missing.',consequence:'The missing noon mark points to the gear.',supportsAction:'signal gear'},
    {finding:'The spare gear fits the shaft.',consequence:'The gear can turn without binding.',supportsAction:'signal gear'},
    {finding:'The checked order protects the teeth.',consequence:'The wheel stays aligned during repair.',supportsAction:'Fit signal gear'},
    {finding:'The upper bridge reaches the gear room.',consequence:'The upper bridge can carry the part.',supportsAction:'signal gear'},
  ]};
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('remake-saved-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,'remake-saved-price',1499,'USD','published',CURRENT_TIMESTAMP)").run(orderId,stored,await sha256(stored),'remake-saved-owner');
  db.prepare("INSERT INTO custom_pack_remakes (order_id,status,phase,spec_json,spec_sha256,logic_epoch,quality_epoch,recovery_round) VALUES (?,'queued','blueprint',?,?,1,9,0)").run(orderId,stored,await sha256(stored));
  const savedCall=db.prepare("INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,result_json,logic_epoch,quality_epoch,generation_round) VALUES (?,?,?,?,'passed','fixture',?,1,9,1)");
  savedCall.run('remake-frame',orderId,'blueprint_frame',0,JSON.stringify(frame));
  for(let number=1;number<=5;number++){
    const material=structuredClone(context.stages[number-1]);
    if(number===1)material.features=['Mentions answer','Names result'];
    savedCall.run(`remake-material-${number}`,orderId,'blueprint_material',number,JSON.stringify(material));
  }
  savedCall.run('remake-closing',orderId,'blueprint_closing',0,JSON.stringify('The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.'));
  for(let attempt=1;attempt<=5;attempt++)db.prepare("INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,result_json,error_code,error_detail,logic_epoch,quality_epoch,generation_round) VALUES (?,?,'blueprint',0,'failed','fixture','{}','BLUEPRINT_INVALID','Checkpoint 1 needs two concrete, distinct printed record facts',1,9,1)").run(`remake-failed-${attempt}`,orderId);
  const calls=[];
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async()=>{}},FETCH:async(_url,request)=>{
    const body=JSON.parse(request.body),name=body.text.format.name,input=JSON.parse(body.input);calls.push(name);
    const value=name==='blueprint_material_stage'?context.stages[input.checkpoint-1]
      :name==='grounded_discoveries'?{consequences:frame.discoveries.map(({consequence})=>consequence)}:null;
    assert.ok(value,`unexpected provider request ${name}`);
    return Response.json({id:`remake-saved-${calls.length}`,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:10}});
  }};
  await processPackRemake(orderId,env);
  assert.equal(db.prepare("SELECT error_code FROM custom_pack_remake_calls WHERE id='remake-material-1'").get().error_code,'SAVED_STEP_INVALID');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_pack_remake_calls WHERE order_id=? AND phase='blueprint_material' AND stage_number=1").get(orderId).n,2);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_pack_remake_calls WHERE order_id=? AND phase='blueprint_material' AND stage_number=2").get(orderId).n,1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_pack_remake_calls WHERE order_id=? AND phase='blueprint' AND stage_number=0").get(orderId).n,6);
  assert.deepEqual(calls,['blueprint_material_stage','grounded_discoveries']);
  assert.ok(db.prepare('SELECT blueprint_json FROM custom_pack_remakes WHERE order_id=?').get(orderId).blueprint_json);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
});


async function stepDeliveryFixture({failPhase=null,dropSend=false,failStorage=false,gameplay=null,variants=false,narrative=false,materialNarrative=false}={}){
  const {db,binding}=database(),orderId='step-delivery-order',owner='step-delivery-owner';
  const spec={...clockSpec,sku:'custom_home',kind:'custom',packExperienceVersion:3,packQualityVersion:14,packLayoutVersion:4,
    packCopyVersion:1,packDeliveryPolicyVersion:2,packResilientDeliveryVersion:1,packStepDeliveryVersion:1,
    onlineRedownloadMonths:12,accessPolicyVersion:productRights.version};
  if(narrative)spec.packNarrativeBindingVersion=1;
  if(materialNarrative)spec.packMaterialNarrativeVersion=1;
  if(gameplay){spec.gameplay=gameplay;spec.packPlayAllocationVersion=1;if(variants)spec.packPuzzleVariantVersion=1;spec.plan=completePaperPlan(clockSpec.plan,gameplay,14,1,spec);}
  const stored=JSON.stringify(spec),hash=await sha256(stored);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('step-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES (?,'custom','custom_home',?,?,?,'step-price',1499,'USD','paid',CURRENT_TIMESTAMP)").run(orderId,stored,hash,owner);
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json,generation_version) VALUES ('step-activity',?,'queued',?,2)").run(orderId,stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status) VALUES ('step-entitlement',?,'step-activity','active')").run(orderId);
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,confirmed_version) VALUES (?,'confirmed',1)").run(orderId);
  const context=linkedClockContext(),frame={problem:context.spine.problem,actions:context.stages[4].material.items.map(item=>item.label),discoveries:[
    {finding:'The signal gear is missing.',consequence:'The missing noon mark points to the gear.',supportsAction:'signal gear'},
    {finding:'The spare gear fits the shaft.',consequence:'The gear can turn without binding.',supportsAction:'signal gear'},
    {finding:'The checked order protects the teeth.',consequence:'The wheel stays aligned during repair.',supportsAction:'Fit signal gear'},
    {finding:'The upper bridge reaches the gear room.',consequence:'The upper bridge can carry the part.',supportsAction:'signal gear'},
  ]};
  let celebration='The fitted gear turns and the noon bell rings across the town. Pip smiles, thanks the team, and begins the journey home.';
  if(gameplay){
    const {blueprint}=await buildBaselinePack(spec);
    Object.assign(frame,blueprint.storyFrame);celebration=blueprint.celebration;
    context.stages=blueprint.stages.map(stage=>{
      const c=stage.material.logic.context;
      return {material:{title:c.title,items:c.labels.map(label=>({label}))},features:c.features,word:c.word};
    });
  }
  const pending=[],files=new Map(),calls=[],perMessage=[];let retries=0;
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',
    GENERATION_QUEUE:{send:async job=>{if(dropSend){dropSend=false;throw Error('simulated dispatch interruption');}pending.push(job);}},
    PRIVATE_FILES:{put:async(key,bytes,options)=>{if(failStorage&&key.endsWith('player.pdf')){failStorage=false;throw Error('simulated storage interruption');}files.set(key,{bytes,customMetadata:options.customMetadata});},head:async key=>files.get(key),get:async key=>files.get(key)?{body:files.get(key).bytes}:null},
    FETCH:async(_url,init)=>{
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_generation_baselines').get().n,1,'a proven baseline exists before the first model call');
      const body=JSON.parse(init.body),name=body.text.format.name,input=JSON.parse(body.input);calls.push({name,checkpoint:input.checkpoint});
      if(failPhase==='all'||failPhase===name&&input.checkpoint===2)throw new DOMException('simulated provider timeout','TimeoutError');
      if(failPhase==='invalid_material'&&name==='blueprint_material_stage'&&input.checkpoint===2)return Response.json({output_text:JSON.stringify({material:{title:'Invalid sheet',items:[]}})});
      const value=name==='story_frame'?frame:name==='blueprint_material_stage'?context.stages[input.checkpoint-1]:name==='blueprint_celebration'?{celebration}:null;
      assert.ok(value,`no final AI audit or whole-pack assembly should run: ${name}`);
      return Response.json({output_text:JSON.stringify(value),usage:{input_tokens:1,output_tokens:1}});
    }};
  const process=async(job={orderId})=>{
    const before=calls.length;
    await productionWorker.queue({messages:[{body:job,ack(){},retry(){retries++;pending.push(job);}}]},env);
    perMessage.push(calls.length-before);assert.ok(calls.length-before<=1,'one model request per queue message');
  };
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`};
  const view=()=>handleProductionApi(request(`/api/v1/orders/${orderId}`,'GET',undefined,headers),env).then(r=>r.json());
  const drain=async()=>{for(let i=0;i<45&&db.prepare('SELECT status FROM orders WHERE id=?').get(orderId).status!=='published';i++){
    if(!pending.length)await productionWorker.scheduled({},env);
    assert.ok(pending.length,'a saved step has a continuation or scheduled recovery');await process(pending.shift());
  }assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(orderId).status,'published');};
  return {db,spec,orderId,env,pending,files,calls,perMessage,process,view,drain,headers,get retries(){return retries;}};
}

test('new-order steps survive a lost dispatch, publish both PDFs, and ignore duplicate messages',async()=>{
  const f=await stepDeliveryFixture({dropSend:true,failStorage:true});
  await f.process();
  assert.equal(f.calls.length,1);assert.equal(f.pending.length,0);
  const partial=await f.view();
  assert.equal(partial.generationProgress.blueprintStepsCompleted,1);
  assert.equal(partial.generationProgress.stepState,'queued');
  assert.ok(!JSON.stringify(partial.generationProgress).includes('signal gear'),'progress never contains story candidates');
  await f.drain();
  assert.equal(f.retries,1,'storage failure retries only PDF delivery');
  assert.equal(f.files.size,3);assert.equal(f.calls.filter(x=>x.name==='story_frame').length,1);
  assert.equal((await f.view()).generationProgress.phase,'delivered');
  assert.equal(f.db.prepare('SELECT delivery_mode FROM custom_generation_baselines').get().delivery_mode,'enhanced');
  const count=f.calls.length;await f.process();assert.equal(f.calls.length,count);
  for(const role of ['player','guide']){
    const r=await handleProductionApi(request(`/api/v1/files/${f.orderId}/${role}?paper=A4`,'GET',undefined,f.headers),f.env);
    assert.equal(r.status,200);assert.ok((await r.text()).startsWith('%PDF-'));
  }
});

test('provider timeouts exhaust only the failing step and deliver the approved-theme baseline',async()=>{
  for(const failPhase of ['all','blueprint_material_stage','invalid_material']){
    const f=await stepDeliveryFixture({failPhase});await f.process();await f.drain();
    assert.equal(f.db.prepare('SELECT delivery_mode FROM custom_generation_baselines').get().delivery_mode,'baseline');
    const story=JSON.parse(f.db.prepare('SELECT story_json FROM custom_story_checkpoints').get().story_json);
    assert.equal(story.deliveryEdition,'baseline');assert.equal(story.title,f.spec.plan.title);
    assert.equal(story.introduction,f.spec.plan.opening);assert.equal(verifyPrintedPuzzles(story).length,5);
    assert.ok(f.files.size===3);assert.ok(f.calls.length<=5,'fallback does not reset or expand the call budget');
    assert.equal(f.calls.filter(x=>x.name==='story_frame').length,failPhase==='all'?2:1);
    if(failPhase!=='all')assert.equal(f.calls.filter(x=>x.name==='blueprint_material_stage'&&x.checkpoint===1).length,1);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM custom_generation_calls WHERE status='failed'").get().n,2,'original failures remain recorded');
    const ready=await f.view();assert.equal(ready.filesReady,true);assert.equal(ready.generationProgress.deliveryEdition,'baseline');
  }
});

test('an interrupted reserved call consumes the existing attempt budget and can resume',async()=>{
  const f=await stepDeliveryFixture();
  f.db.prepare("INSERT INTO custom_generation_calls (id,order_id,phase,stage_number,status,model) VALUES ('interrupted',?,'blueprint_frame',0,'started','fixture')").run(f.orderId);
  await f.process();
  assert.equal(f.db.prepare("SELECT error_code FROM custom_generation_calls WHERE id='interrupted'").get().error_code,'STEP_INTERRUPTED');
  await f.drain();assert.equal(f.calls.filter(x=>x.name==='story_frame').length,1);
});

test('an approved-spec mismatch cannot activate a fallback or call the provider',async()=>{
  const f=await stepDeliveryFixture();await f.process();
  f.db.prepare("UPDATE custom_generation_baselines SET spec_sha256='another-approved-plan'").run();
  await f.process();assert.equal(f.calls.length,1);
  assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'failed');
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM custom_story_checkpoints').get().n,0);
});

test('an invalid baseline stops once before reserving any model work',async()=>{
  const f=await stepDeliveryFixture();
  const invalid={...f.spec,plan:{...f.spec.plan,stages:[]}};
  f.db.prepare('UPDATE custom_activities SET story_spec_json=?').run(JSON.stringify(invalid));
  await f.process();
  assert.equal(f.calls.length,0);assert.equal(f.pending.length,0);
  assert.equal(f.db.prepare('SELECT status FROM orders').get().status,'failed');
  assert.equal(f.db.prepare('SELECT error_code FROM custom_delivery_incidents').get().error_code,'BASELINE_INVALID');
});

test('a final preflight failure after all five checkpoints delivers the proven baseline without AI review',async()=>{
  const f=await stepDeliveryFixture();await f.process();
  for(let i=0;i<35&&f.db.prepare('SELECT COUNT(*) AS n FROM custom_game_stages').get().n<5;i++){
    assert.ok(f.pending.length);await f.process(f.pending.shift());
  }
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM custom_game_stages').get().n,5);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM custom_story_checkpoints').get().n,0);
  const row=f.db.prepare('SELECT stage_json FROM custom_game_stages WHERE stage_number=1').get();
  const stage=JSON.parse(row.stage_json);stage.material.items[0].detail='A malformed enhancement that cannot prove a unique answer.';
  f.db.prepare('UPDATE custom_game_stages SET stage_json=? WHERE stage_number=1').run(JSON.stringify(stage));
  const count=f.calls.length;await f.process(f.pending.shift());
  assert.equal(f.calls.length,count,'the final check and fallback make no model call');
  assert.equal(f.db.prepare('SELECT error_code FROM custom_generation_baselines').get().error_code,'PACK_PREFLIGHT_INVALID');
  await f.drain();assert.equal(f.files.size,3);
  const story=JSON.parse(f.db.prepare('SELECT story_json FROM custom_story_checkpoints').get().story_json);
  assert.equal(verifyPrintedPuzzles(story).length,5);assert.equal(story.deliveryEdition,'baseline');
});


test('selected main and both supporting styles survive stepped enhancement and provider-failure baseline delivery',async()=>{
  for(const failPhase of [null,'all']){
    const f=await stepDeliveryFixture({gameplay:{primary:'code',secondary:['discussion','sequence']},failPhase});
    await f.process();await f.drain();
    const story=JSON.parse(f.db.prepare('SELECT story_json FROM custom_story_checkpoints').get().story_json);
    assert.deepEqual(story.stages.map(stage=>stage.material.type),paperContractTypes(f.spec.plan));
    assert.deepEqual(story.stages.map(stage=>stage.mechanic),['code','discussion','code','sequence','finale']);
    assert.equal(verifyPrintedPuzzles(story).length,5);
    assert.equal(f.db.prepare('SELECT delivery_mode FROM custom_generation_baselines').get().delivery_mode,failPhase?'baseline':'enhanced');
    assert.equal(f.files.size,3);
    assert.ok(f.perMessage.every(count=>count<=1));
    assert.ok(!f.calls.some(call=>/audit/.test(call.name)));
  }
});


test('finite puzzle variants keep the same approved formats through enhancement, fallback and PDF storage retry',async()=>{
  for(const failPhase of [null,'all']){
    const f=await stepDeliveryFixture({gameplay:{primary:'discussion',secondary:['sequence','code']},variants:true,failPhase,failStorage:true});
    await f.process();await f.drain();
    const story=JSON.parse(f.db.prepare('SELECT story_json FROM custom_story_checkpoints').get().story_json);
    assert.deepEqual(story.stages.map(stage=>stage.material.logic.context.variant),f.spec.plan.puzzleVariants);
    assert.equal(new Set(story.stages.filter(stage=>stage.mechanic==='discussion').map(stage=>stage.material.logic.variant.used)).size,2);
    assert.equal(verifyPrintedPuzzles(story).length,5);
    assert.equal(f.files.size,3);assert.equal(f.retries,1);
    assert.equal(f.db.prepare('SELECT delivery_mode FROM custom_generation_baselines').get().delivery_mode,failPhase?'baseline':'enhanced');
    assert.ok(f.perMessage.every(count=>count<=1));
    const calls=f.calls.length;await f.process();assert.equal(f.calls.length,calls);
  }
});

test('theme-bound papers publish through enhancement, provider timeouts and storage retry without new model gates',async()=>{
  for(const failPhase of [null,'all']){
    const f=await stepDeliveryFixture({gameplay:{primary:'code',secondary:['sequence','reasoning']},variants:true,narrative:true,failPhase,failStorage:true});
    await f.process();await f.drain();
    const story=JSON.parse(f.db.prepare('SELECT story_json FROM custom_story_checkpoints').get().story_json);
    assert.equal(verifyPrintedPuzzles(story).length,5);assert.equal(f.files.size,3);assert.equal(f.retries,1);
    assert.equal(f.db.prepare('SELECT delivery_mode FROM custom_generation_baselines').get().delivery_mode,failPhase?'baseline':'enhanced');
    for(const [key,value] of f.files)if(key.endsWith('.pdf')){
      const pdf=[...new TextDecoder().decode(value.bytes).matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map(match=>match[1].replace(/\\([\\()])/g,'$1')).join(' ');
      if(failPhase)assert.ok(pdf.includes('Review all four paper records')||key.endsWith('player.pdf'));
      if(key.endsWith('player.pdf'))assert.ok(pdf.includes('decoded label'),'the new narrative presentation reaches stored PDFs');
    }
    assert.ok(f.perMessage.every(count=>count<=1));assert.ok(!f.calls.some(call=>/audit|review/.test(call.name)));
    const calls=f.calls.length;await f.process();assert.equal(f.calls.length,calls);
  }
});

test('material-bound narration reaches stored enhanced and baseline PDFs without changing queue budgets or storage recovery',async()=>{
  for(const failPhase of [null,'all']){
    const f=await stepDeliveryFixture({gameplay:{primary:'code',secondary:['sequence','reasoning']},variants:true,narrative:true,materialNarrative:true,failPhase,failStorage:true});
    await f.process();await f.drain();
    const story=JSON.parse(f.db.prepare('SELECT story_json FROM custom_story_checkpoints').get().story_json);
    assert.equal(verifyPrintedPuzzles(story).length,5);assert.equal(f.files.size,3);assert.equal(f.retries,1);
    assert.equal(f.db.prepare('SELECT delivery_mode FROM custom_generation_baselines').get().delivery_mode,failPhase?'baseline':'enhanced');
    for(const role of ['player','guide']){
      const stored=[...f.files].find(([key])=>key.endsWith(`${role}.pdf`))[1].bytes;
      assert.deepEqual(stored,buildGamePdf(story,f.spec,role),'stored bytes match the shared printable view');
      const pdf=[...new TextDecoder().decode(stored).matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map(match=>match[1].replace(/\\([\\()])/g,'$1')).join(' ');
      assert.ok(pdf.includes('The team decodes a label using the printed key'));
      assert.ok(pdf.includes('The four checked paper records supply the saved digits')||role==='player');
      const response=await handleProductionApi(request(`/api/v1/files/${f.orderId}/${role}?paper=A4`,'GET',undefined,f.headers),f.env);
      assert.equal(response.status,200);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),stored);
    }
    assert.ok(f.perMessage.every(count=>count<=1));assert.ok(!f.calls.some(call=>/audit|review/.test(call.name)));
    assert.ok(f.calls.length<=(failPhase?2:6),'same six enhancement steps or two failed-frame attempts');
    const calls=f.calls.length;await f.process();assert.equal(f.calls.length,calls);
  }
});
