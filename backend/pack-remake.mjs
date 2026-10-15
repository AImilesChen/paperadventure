import { ApiError, validateGeneratedStory } from './domain.mjs';
import { aiProvider } from './openai.mjs';
import { sha256, sha256Bytes } from './security.mjs';
import { validatePlan } from '../shared/creator-plan.mjs';
import { generateBlueprint, repairBlueprint, validateBlueprint, prepareBlueprintCandidate, generateStagedCheckpoint, repairStagedCheckpoint, assembleStagedStory, auditStagedStory } from './staged-story.mjs';
import { buildGamePdf } from './pdf.mjs';

const query = (db, sql, ...values) => db.prepare(sql).bind(...values);
const nowSeconds = () => Math.floor(Date.now() / 1000);
const MAX_CALLS = 20;
const MAX_STEP_CALLS = 2;
const MAX_BLUEPRINT_CALLS = 3;
const MAX_AUDIT_CALLS = 5;
const stepLimit = (phase,spec) => phase === 'audit' ? MAX_AUDIT_CALLS : phase === 'blueprint' ? spec?.packExperienceVersion>=2?5:MAX_BLUEPRINT_CALLS : MAX_STEP_CALLS;
const MAX_RECOVERY_ROUNDS = 2;
const recoverableErrors = ['BLUEPRINT_INVALID','STAGE_INVALID','GENERATION_UPSTREAM_FAILED','GENERATION_QA_FAILED','REMAKE_STORAGE_INVALID','UNEXPECTED'];
const deterministicCheckpoint = (phase,spec) => phase === 'checkpoint' && spec.gamePackVersion === 2 && spec.packLogicVersion === 1;

async function recoverSavedBlueprint(db,orderId,spec){
  const last=await query(db,"SELECT result_json FROM custom_pack_remake_calls WHERE order_id = ? AND logic_epoch = 0 AND phase = 'blueprint' AND status = 'failed' AND result_json IS NOT NULL ORDER BY generation_round DESC,created_at DESC,id DESC LIMIT 1",orderId).first();
  if(!last?.result_json)return null;
  try{return prepareBlueprintCandidate(JSON.parse(last.result_json),spec);}
  catch{return null;}
}

function shorten(value, limit) {
  const text = String(value || '').trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const boundary = cut.lastIndexOf(' ');
  return (boundary >= limit * .75 ? cut.slice(0, boundary) : cut).trim().replace(/[,:;.!?\s]+$/, '');
}

export function remakeSpec(original) {
  if (!original?.planConfirmed || !original.plan)
    throw new ApiError(409, 'REMAKE_PLAN_MISSING', 'This order needs a reviewed plan before a new paper pack can be made.');
  const plan = original.plan;
  const prepared = {
    ...original,
    gamePackVersion: 2,
    packLogicVersion: 1,
    ...(original.packContractVersion===1?{packExperienceVersion:3,packQualityVersion:3}:{}),
    plan: {
      ...plan,
      title: shorten(plan.title, 70),
      opening: shorten(plan.opening, 350),
      roles: shorten(plan.roles, 180),
      goal: shorten(plan.goal, 180),
      stages: plan.stages?.map(stage => ({
        ...stage,
        title: shorten(stage.title, 60),
        task: shorten(stage.task, 180),
        teamwork: shorten(stage.teamwork, 150),
      })),
    },
  };
  try { prepared.plan = validatePlan(prepared.plan, prepared); }
  catch { throw new ApiError(409, 'REMAKE_PLAN_INCOMPATIBLE', 'The saved plan needs manual review before it can be remade in the paper format.'); }
  return prepared;
}

export function qualityUpgradeEligible(purchase, activity, latestFormat, hasRevision, previousRemakeSpec=null) {
  return purchase?.gamePackVersion === 2 && purchase.packContractVersion === 1 &&
    activity?.packContractVersion === 1 && latestFormat === 2 && !hasRevision &&
    (previousRemakeSpec ? (previousRemakeSpec.packQualityVersion || 0) < 3 :
      (purchase.packQualityVersion || 0) < 3 && (activity.packQualityVersion || 0) < 3);
}

export async function startPackRemake(order, activity, env) {
  if (!env.DB || !env.GENERATION_QUEUE || !env.PRIVATE_FILES || !aiProvider(env))
    throw new ApiError(503, 'REMAKE_NOT_READY', 'The paper-pack remake service is not ready.');
  if (order.product_kind !== 'custom' || order.status !== 'published' || !order.paid_at || activity?.status !== 'published')
    throw new ApiError(409, 'REMAKE_UNAVAILABLE', 'Only a delivered paid custom order can be remade.');
  const existing = await query(env.DB, 'SELECT status,spec_json,published_version,quality_epoch FROM custom_pack_remakes WHERE order_id = ?', order.id).first();
  if (existing?.status !== 'ready' && existing) return { status: existing.status, queued: false };
  const latest = await query(env.DB, "SELECT pack_format_version FROM artifact_versions WHERE custom_activity_id = ? AND status = 'published' ORDER BY version_number DESC LIMIT 1", activity.id).first();
  const purchase = JSON.parse(order.purchase_spec_json);
  const activitySpec = JSON.parse(activity.story_spec_json);
  const checkedPack = purchase.gamePackVersion >= 2 || latest?.pack_format_version >= 2;
  const anyRevision = checkedPack ? await query(env.DB, "SELECT id FROM revision_requests WHERE order_id = ? AND status IN ('queued','generating','published') LIMIT 1", order.id).first() : null;
  const revisionAllowance = checkedPack ? await query(env.DB, 'SELECT revision_success_used FROM entitlements WHERE order_id = ?', order.id).first() : null;
  if (checkedPack && !qualityUpgradeEligible(purchase, activitySpec, latest?.pack_format_version, Boolean(anyRevision || revisionAllowance?.revision_success_used), existing?.spec_json ? JSON.parse(existing.spec_json) : null))
    throw new ApiError(409, 'REMAKE_UNAVAILABLE', 'This pack already has the current quality rules or has been revised. Please request a quality review for this order.');
  if (!latest) throw new ApiError(409, 'REMAKE_UNAVAILABLE', 'A delivered pack is required before a remake can start.');
  const pendingRevision = checkedPack ? anyRevision : await query(env.DB, "SELECT id FROM revision_requests WHERE order_id = ? AND status IN ('queued','generating') LIMIT 1", order.id).first();
  if (pendingRevision) throw new ApiError(409, 'REVISION_IN_PROGRESS', 'Wait for the current checkpoint change before starting a full-pack remake.');
  const spec = remakeSpec(activitySpec);
  const specJson = JSON.stringify(spec);
  const specHash = await sha256(specJson);
  if (existing?.status === 'ready') {
    const changed=await query(env.DB,"UPDATE custom_pack_remakes SET status = 'queued',phase = 'blueprint',spec_json = ?,spec_sha256 = ?,blueprint_json = NULL,blueprint_sha256 = NULL,stages_json = '[]',story_json = NULL,story_sha256 = NULL,failure_count = 0,recovery_round = 0,quality_epoch = quality_epoch + 1,lease_until = NULL,error_code = NULL,error_detail = NULL,completed_at = NULL,updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'ready' AND quality_epoch = ? AND published_version = ?",specJson,specHash,order.id,existing.quality_epoch,existing.published_version).run();
    if (!changed.meta?.changes) return {status:'queued',queued:false};
    try { await env.GENERATION_QUEUE.send({ type: 'pack_remake', orderId: order.id }); }
    catch (caught) { console.error('Quality-rules rebuild queued for scheduled recovery', {orderId:order.id,message:caught?.message}); }
    return {status:'queued',queued:true};
  }
  const created = await query(env.DB, "INSERT OR IGNORE INTO custom_pack_remakes (order_id,status,spec_json,spec_sha256) VALUES (?,'queued',?,?)", order.id, specJson, specHash).run();
  if (created.meta?.changes) {
    try { await env.GENERATION_QUEUE.send({ type: 'pack_remake', orderId: order.id }); }
    catch (caught) { console.error('Remake queued for scheduled recovery', { orderId: order.id, message: caught?.message }); }
  }
  return { status: 'queued', queued: Boolean(created.meta?.changes) };
}

export async function retryPackRemake(order, env) {
  if (!env.DB || !env.GENERATION_QUEUE || !env.PRIVATE_FILES || !aiProvider(env))
    throw new ApiError(503, 'REMAKE_NOT_READY', 'The paper-pack remake service is not ready.');
  if (order.product_kind !== 'custom' || order.status !== 'published' || !order.paid_at)
    throw new ApiError(409, 'REMAKE_UNAVAILABLE', 'This paid order is not eligible for a pack remake.');
  const previous=await query(env.DB,'SELECT status,phase,error_code,error_detail,blueprint_json,story_json,logic_epoch,quality_epoch,spec_json,recovery_round,published_version FROM custom_pack_remakes WHERE order_id = ?',order.id).first();
  if (!previous || previous.status!=='failed' || (previous.published_version && !previous.quality_epoch))
    throw new ApiError(409,'REMAKE_RECOVERY_UNAVAILABLE','This remake is not waiting for a recovery.');
  const savedSpec=JSON.parse(previous.spec_json);
  if (savedSpec.packLogicVersion!==1) {
    const upgraded=remakeSpec(savedSpec);
    const specJson=JSON.stringify(upgraded);
    const changed=await query(env.DB,"UPDATE custom_pack_remakes SET status = 'queued',phase = 'blueprint',spec_json = ?,spec_sha256 = ?,blueprint_json = NULL,blueprint_sha256 = NULL,stages_json = '[]',story_json = NULL,story_sha256 = NULL,failure_count = 0,recovery_round = 0,logic_epoch = 1,lease_until = NULL,error_code = NULL,error_detail = NULL,completed_at = NULL,updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'failed' AND published_version IS NULL AND logic_epoch = 0",specJson,await sha256(specJson),order.id).run();
    if (!changed.meta?.changes) throw new ApiError(409,'REMAKE_RECOVERY_UNAVAILABLE','A recovery has already started.');
    try { await env.GENERATION_QUEUE.send({type:'pack_remake',orderId:order.id}); }
    catch (caught) { console.error('Upgraded paid remake saved for queue',{orderId:order.id,message:caught?.message}); }
    return {status:'queued',recovery:true,upgraded:true};
  }
  if(previous.phase==='blueprint'&&previous.error_code==='BLUEPRINT_INVALID'&&previous.recovery_round>=MAX_RECOVERY_ROUNDS&&previous.logic_epoch===0&&savedSpec.packExperienceVersion>=2){
    const blueprint=await recoverSavedBlueprint(env.DB,order.id,savedSpec);
    if(!blueprint)throw new ApiError(409,'REMAKE_RECOVERY_UNAVAILABLE','The saved blueprint needs a quality review before generation can continue.');
    const json=JSON.stringify(blueprint);
    const changed=await query(env.DB,"UPDATE custom_pack_remakes SET status = 'queued',phase = 'checkpoint',blueprint_json = ?,blueprint_sha256 = ?,stages_json = '[]',story_json = NULL,story_sha256 = NULL,failure_count = 0,recovery_round = 0,logic_epoch = 1,lease_until = NULL,error_code = NULL,error_detail = NULL,completed_at = NULL,updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'failed' AND phase = 'blueprint' AND error_code = 'BLUEPRINT_INVALID' AND recovery_round >= ? AND logic_epoch = 0 AND published_version IS NULL",json,await sha256(json),order.id,MAX_RECOVERY_ROUNDS).run();
    if(!changed.meta?.changes)throw new ApiError(409,'REMAKE_RECOVERY_UNAVAILABLE','A recovery has already started.');
    try{await env.GENERATION_QUEUE.send({type:'pack_remake',orderId:order.id});}
    catch(caught){console.error('Saved blueprint recovery queued',{orderId:order.id,message:caught?.message});}
    return {status:'queued',recovery:true,reusedBlueprint:true};
  }
  if(previous.phase==='audit'&&previous.error_code==='GENERATION_QA_FAILED'&&previous.quality_epoch>0&&previous.blueprint_json&&!previous.story_json&&previous.recovery_round<MAX_RECOVERY_ROUNDS){
    const changed=await query(env.DB,"UPDATE custom_pack_remakes SET status = 'queued',phase = 'blueprint',blueprint_json = NULL,blueprint_sha256 = NULL,stages_json = '[]',story_json = NULL,story_sha256 = NULL,failure_count = 0,recovery_round = recovery_round + 1,recovery_count = MIN(recovery_count + 1,1),lease_until = NULL,error_code = NULL,error_detail = NULL,completed_at = NULL,updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'failed' AND phase = 'audit' AND error_code = 'GENERATION_QA_FAILED' AND quality_epoch > 0 AND recovery_round < ?",order.id,MAX_RECOVERY_ROUNDS).run();
    if(!changed.meta?.changes)throw new ApiError(409,'REMAKE_RECOVERY_UNAVAILABLE','A recovery has already started.');
    await env.DB.batch([
      query(env.DB,"UPDATE custom_pack_remake_calls SET status = 'failed',error_code = 'AUDIT_REJECTED',error_detail = ? WHERE id = (SELECT id FROM custom_pack_remake_calls WHERE order_id = ? AND quality_epoch = ? AND logic_epoch = ? AND phase = 'blueprint' AND status = 'passed' AND result_json IS NOT NULL ORDER BY generation_round DESC,created_at DESC,id DESC LIMIT 1)",String(previous.error_detail||'The full game needs a quality repair.').slice(0,500),order.id,previous.quality_epoch,previous.logic_epoch),
      query(env.DB,"UPDATE custom_pack_remake_calls SET result_json = NULL,error_code = 'AUDIT_REJECTED' WHERE order_id = ? AND quality_epoch = ? AND logic_epoch = ? AND phase = 'checkpoint' AND status = 'passed'",order.id,previous.quality_epoch,previous.logic_epoch),
    ]);
    try{await env.GENERATION_QUEUE.send({type:'pack_remake',orderId:order.id});}
    catch(caught){console.error('Paid quality repair saved for scheduled recovery',{orderId:order.id,message:caught?.message});}
    return {status:'queued',recovery:true};
  }
  const changed = await query(env.DB, "UPDATE custom_pack_remakes SET status = 'queued',failure_count = 0,recovery_round = recovery_round + 1,recovery_count = MIN(recovery_count + 1,1),lease_until = NULL,error_code = NULL,error_detail = NULL,completed_at = NULL,updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'failed' AND recovery_round < ? AND (published_version IS NULL OR quality_epoch > 0) AND (error_code IN ('BLUEPRINT_INVALID','STAGE_INVALID','GENERATION_UPSTREAM_FAILED','GENERATION_QA_FAILED','REMAKE_STORAGE_INVALID','UNEXPECTED') OR (error_code = 'REMAKE_BUDGET_EXHAUSTED' AND quality_epoch > 0))", order.id, MAX_RECOVERY_ROUNDS).run();
  if (!changed.meta?.changes) throw new ApiError(409, 'REMAKE_RECOVERY_UNAVAILABLE', 'A recovery has already started or this remake needs personal support.');
  try { await env.GENERATION_QUEUE.send({ type: 'pack_remake', orderId: order.id }); }
  catch (caught) { console.error('Paid remake recovery saved for queue', { orderId: order.id, message: caught?.message }); }
  return { status: 'queued', recovery: true };
}

export async function packRemakeView(db, orderId) {
  const row = await query(db, 'SELECT status,phase,stages_json,blueprint_json,story_json,spec_json,published_version,error_code,error_detail,recovery_round,logic_epoch,quality_epoch,created_at,updated_at,completed_at FROM custom_pack_remakes WHERE order_id = ?', orderId).first();
  if (!row) return null;
  const stages = JSON.parse(row.stages_json || '[]');
  const spec=JSON.parse(row.spec_json);
  const upgradeAvailable=row.status==='failed'&&!row.published_version&&spec.packLogicVersion!==1;
  const savedBlueprintAvailable=row.status==='failed'&&row.phase==='blueprint'&&row.error_code==='BLUEPRINT_INVALID'&&row.recovery_round>=MAX_RECOVERY_ROUNDS&&row.logic_epoch===0&&!row.published_version&&spec.packExperienceVersion>=2&&Boolean(await recoverSavedBlueprint(db,orderId,spec));
  const reviewPrefix = 'The completed game did not pass its quality check: ';
  return {
    status: row.status,
    phase: row.phase,
    blueprintReady: Boolean(row.blueprint_json),
    completedStages: stages.map(stage => stage.number),
    currentStage: [1,2,3,4,5].find(number => !stages.some(stage => stage.number === number)) || null,
    storyReady: Boolean(row.story_json),
    publishedVersion: row.published_version || null,
    failureReason: row.status === 'failed' ? row.error_code === 'REMAKE_BUDGET_EXHAUSTED' ? 'Earlier quality-review repairs used up this run\'s generation allowance. Your saved blueprint can continue on this paid order without another checkout.' : row.phase === 'blueprint' ? 'The game blueprint did not match the approved play rules. No new checkpoints or PDFs were published.' : row.phase === 'checkpoint' ? /Answer explanation is required and must be under/i.test(row.error_detail || '') ? 'The generated adult answer explanation was longer than the printable guide allows. Earlier checkpoints were saved.' : 'A new checkpoint did not pass generation checks. Saved earlier work remains on this order.' : row.phase === 'audit' ? row.error_detail?.startsWith(reviewPrefix) ? `The quality review found: ${row.error_detail.slice(reviewPrefix.length,300)} The new PDFs were not published.` : 'The complete game did not pass its quality review. No new PDFs were published.' : 'The replacement PDF files did not pass delivery checks. Your original PDFs remain available.' : null,
    recoveryAvailable: upgradeAvailable || savedBlueprintAvailable || row.status === 'failed' && row.recovery_round < MAX_RECOVERY_ROUNDS && (recoverableErrors.includes(row.error_code) || row.error_code === 'REMAKE_BUDGET_EXHAUSTED' && row.quality_epoch > 0),
    upgradeAvailable,
    recoveryCount: row.recovery_round,
    startedAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || null,
  };
}

async function recordCall(remake, phase, stageNumber, produce, env) {
  const db = env.DB;
  const spec=JSON.parse(remake.spec_json);
  const round = remake.recovery_round + 1;
  const deterministic = deterministicCheckpoint(phase,spec);
  const cached = await query(db, "SELECT result_json FROM custom_pack_remake_calls WHERE order_id = ? AND quality_epoch = ? AND logic_epoch = ? AND phase = ? AND stage_number = ? AND status = 'passed' AND result_json IS NOT NULL ORDER BY generation_round DESC,created_at DESC,id DESC LIMIT 1", remake.order_id, remake.quality_epoch, remake.logic_epoch, phase, stageNumber).first();
  if (cached) return JSON.parse(cached.result_json);
  const stepCount = await query(db, 'SELECT COUNT(*) AS n FROM custom_pack_remake_calls WHERE order_id = ? AND quality_epoch = ? AND logic_epoch = ? AND phase = ? AND stage_number = ? AND generation_round = ?', remake.order_id, remake.quality_epoch, remake.logic_epoch, phase, stageNumber, round).first();
  const total = await query(db, "SELECT COUNT(*) AS n FROM custom_pack_remake_calls WHERE order_id = ? AND quality_epoch = ? AND logic_epoch = ? AND generation_round = ? AND model != 'checked-rules-v1'", remake.order_id, remake.quality_epoch, remake.logic_epoch, round).first();
  if ((!deterministic && stepCount.n >= stepLimit(phase,spec)) || (!deterministic && total.n >= MAX_CALLS))
    throw new ApiError(422, 'REMAKE_BUDGET_EXHAUSTED', 'The safe model-call limit was reached. Your original game remains available.');
  const id = crypto.randomUUID();
  await query(db, "INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,round_number,generation_round,logic_epoch,quality_epoch) VALUES (?,?,?,?,'started',?,?,?,?,?)", id, remake.order_id, phase, stageNumber, deterministic?'checked-rules-v1':aiProvider(env).model, Math.min(round,2), round, remake.logic_epoch, remake.quality_epoch).run();
  try {
    const result = await produce();
    await query(db, "UPDATE custom_pack_remake_calls SET status = 'passed',result_json = ?,response_id = ?,input_tokens = ?,output_tokens = ?,completed_at = CURRENT_TIMESTAMP WHERE id = ?", JSON.stringify(result.value), result.responseId || null, result.usage?.input_tokens ?? null, result.usage?.output_tokens ?? null, id).run();
    return result.value;
  } catch (caught) {
    const code = typeof caught?.code === 'string' && /^[A-Z0-9_]{1,60}$/.test(caught.code) ? caught.code : 'UNEXPECTED';
    const candidateJson = caught?.candidate ? JSON.stringify(caught.candidate) : null;
    await query(db, "UPDATE custom_pack_remake_calls SET status = 'failed',result_json = ?,response_id = ?,input_tokens = ?,output_tokens = ?,error_code = ?,error_detail = ?,completed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'started'", candidateJson?.length <= 40000 ? candidateJson : null, caught?.responseId || null, caught?.usage?.input_tokens ?? null, caught?.usage?.output_tokens ?? null, code, String(caught?.message || 'Unknown failure').slice(0, 1000), id).run();
    throw caught;
  }
}

async function queueNext(orderId, env) {
  try { await env.GENERATION_QUEUE.send({ type: 'pack_remake', orderId }); }
  catch (caught) { console.error('Remake progress saved; scheduled recovery will continue', { orderId, message: caught?.message }); }
}

function checkedPdf(bytes, expectedPages, label) {
  const text = new TextDecoder().decode(bytes);
  const count=Number(text.match(/\/Count (\d+)/)?.[1]);
  const validCount=label==='Adult guide'?count>=expectedPages&&count<=expectedPages+5:count===expectedPages;
  if (!text.startsWith('%PDF-') || !validCount || bytes.length < 1000)
    throw new ApiError(422, 'REMAKE_PDF_INVALID', `${label} did not pass the complete-page check.`);
}

async function publishRemadeFiles(remake, order, env) {
  const db = env.DB;
  const spec = JSON.parse(remake.spec_json);
  const story = validateGeneratedStory(JSON.parse(remake.story_json), spec);
  const storyJson = JSON.stringify(story);
  const storyHash = await sha256(storyJson);
  if (storyHash !== remake.story_sha256) throw new ApiError(422, 'REMAKE_STORY_CHANGED', 'The checked story changed before PDF delivery.');
  const activity = await query(db, "SELECT id FROM custom_activities WHERE order_id = ? AND status = 'published'", order.id).first();
  if (!activity) throw new ApiError(409, 'REMAKE_SOURCE_MISSING', 'The original files are unavailable.');
  const prior = await query(db, "SELECT version_number,pack_format_version FROM artifact_versions WHERE custom_activity_id = ? AND status = 'published' ORDER BY version_number DESC LIMIT 1", activity?.id).first();
  if (!prior) throw new ApiError(409, 'REMAKE_SOURCE_MISSING', 'The original files are unavailable.');
  const version = prior.version_number + 1;
  const prefix = `custom/${order.id}/v${version}-paper-remake`;
  const player = buildGamePdf(story, spec, 'player');
  const guide = buildGamePdf(story, spec, 'guide');
  checkedPdf(player, 12, 'Player Pack');
  checkedPdf(guide, 7, 'Adult guide');
  const playerHash = await sha256Bytes(player);
  const guideHash = await sha256Bytes(guide);
  await Promise.all([
    env.PRIVATE_FILES.put(`${prefix}/player.pdf`, player, { httpMetadata: { contentType: 'application/pdf' }, customMetadata: { sha256: playerHash } }),
    env.PRIVATE_FILES.put(`${prefix}/guide.pdf`, guide, { httpMetadata: { contentType: 'application/pdf' }, customMetadata: { sha256: guideHash } }),
    env.PRIVATE_FILES.put(`${prefix}/story.json`, storyJson, { httpMetadata: { contentType: 'application/json' }, customMetadata: { sha256: storyHash } }),
  ]);
  const [savedPlayer, savedGuide] = await Promise.all([
    env.PRIVATE_FILES.get(`${prefix}/player.pdf`), env.PRIVATE_FILES.get(`${prefix}/guide.pdf`),
  ]);
  if (!savedPlayer || !savedGuide || savedPlayer.customMetadata?.sha256 !== playerHash || savedGuide.customMetadata?.sha256 !== guideHash)
    throw new ApiError(503, 'REMAKE_STORAGE_INVALID', 'The replacement files did not pass storage checks.');
  const [playerBytes, guideBytes] = await Promise.all([
    new Response(savedPlayer.body).arrayBuffer(), new Response(savedGuide.body).arrayBuffer(),
  ]);
  if (await sha256Bytes(new Uint8Array(playerBytes)) !== playerHash || await sha256Bytes(new Uint8Array(guideBytes)) !== guideHash)
    throw new ApiError(503, 'REMAKE_STORAGE_INVALID', 'The replacement files did not pass the final checksum.');
  await db.batch([
    query(db, "INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,player_r2_key,guide_r2_key,player_sha256,guide_sha256,story_r2_key,story_sha256,pack_format_version) VALUES (?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, 2)", `artifact-${order.id}-${version}`, activity.id, version, `${prefix}/player.pdf`, `${prefix}/guide.pdf`, playerHash, guideHash, `${prefix}/story.json`, storyHash),
    query(db, "UPDATE custom_pack_remakes SET status = 'ready',phase = 'delivered',published_version = ?,lease_until = NULL,error_code = NULL,error_detail = NULL,completed_at = CURRENT_TIMESTAMP,updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'generating'", version, order.id),
    query(db,"UPDATE custom_delivery_incidents SET status = 'resolved' WHERE order_id = ?",order.id),
    query(db, "UPDATE entitlements SET access_expires_at = CASE WHEN access_expires_at < datetime('now','+12 months') THEN datetime('now','+12 months') ELSE access_expires_at END, revision_expires_at = datetime('now','+30 days') WHERE order_id = ? AND status = 'active'", order.id),
    query(db, "INSERT INTO delivery_notifications (order_id,kind,status,attempts) VALUES (?,'files_ready','pending',0) ON CONFLICT(order_id,kind) DO UPDATE SET status = 'pending',attempts = 0,sent_at = NULL", order.id),
  ]);
}

export async function processPackRemake(orderId, env) {
  if (!env.DB || !env.GENERATION_QUEUE || !env.PRIVATE_FILES || !aiProvider(env)) return;
  const db = env.DB;
  const remake = await query(db, "SELECT * FROM custom_pack_remakes WHERE order_id = ? AND status IN ('queued','generating')", orderId).first();
  if (!remake) return;
  const order = await query(db, "SELECT id,status,paid_at FROM orders WHERE id = ? AND product_kind = 'custom'", orderId).first();
  if (!order || order.status !== 'published' || !order.paid_at) return;
  const lease = await query(db, "UPDATE custom_pack_remakes SET status = 'generating',lease_until = ?,updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND (status = 'queued' OR (status = 'generating' AND COALESCE(lease_until,0) < ?))", nowSeconds() + 900, orderId, nowSeconds()).run();
  if (!lease.meta?.changes) return;
  const spec = JSON.parse(remake.spec_json);
  let phase = 'blueprint', stageNumber = 0;
  try {
    if (!remake.blueprint_json) {
      const blueprint = validateBlueprint(await recordCall(remake, 'blueprint', 0, async () => {
        const prior = await query(db, "SELECT result_json,error_detail FROM custom_pack_remake_calls WHERE order_id = ? AND quality_epoch = ? AND logic_epoch = ? AND phase = 'blueprint' AND stage_number = 0 AND status = 'failed' AND result_json IS NOT NULL ORDER BY generation_round DESC,created_at DESC,id DESC LIMIT 1", orderId,remake.quality_epoch,remake.logic_epoch).first();
        // Audit reports are about different candidates. Replaying older issues against the
        // newest candidate can undo a corrected checkpoint and make repairs oscillate.
        const result = prior ? await repairBlueprint(spec, JSON.parse(prior.result_json), prior.error_detail, env, env.FETCH || fetch)
          : await generateBlueprint(spec, env, env.FETCH || fetch);
        if (spec.packContractVersion === 1 && spec.packExperienceVersion >= 2) {
          try {
            const previewStages = [];
            for (let number = 1; number <= 5; number++) {
              const preview = await generateStagedCheckpoint(spec, result.blueprint, number, previewStages.at(-1) || null, env, env.FETCH || fetch);
              previewStages.push(preview.stage);
            }
            const previewStory = assembleStagedStory(spec, result.blueprint, previewStages);
            const storyHash = await sha256(JSON.stringify(previewStory));
            const proof = await recordCall(remake, 'audit', 0, async () => {
              const checked = await auditStagedStory(previewStory, spec, result.blueprint, env, env.FETCH || fetch);
              return { value: { storyHash }, usage: checked.usage, responseId: checked.responseId };
            }, env);
            if (proof.storyHash !== storyHash) throw new ApiError(422, 'GENERATION_QA_FAILED', 'The checked game changed during blueprint review.');
          } catch (caught) {
            if (caught.code === 'GENERATION_QA_FAILED') {
              caught.code = 'BLUEPRINT_INVALID';
              caught.candidate = result.blueprint;
            }
            throw caught;
          }
        }
        return { value: result.blueprint, usage: result.usage, responseId: result.responseId };
      }, env), spec);
      const blueprintJson = JSON.stringify(blueprint);
      await query(db, "UPDATE custom_pack_remakes SET blueprint_json = ?,blueprint_sha256 = ?,status = 'queued',phase = 'checkpoint',lease_until = NULL,failure_count = 0,updated_at = CURRENT_TIMESTAMP WHERE order_id = ?", blueprintJson, await sha256(blueprintJson), orderId).run();
      await queueNext(orderId, env);
      return;
    }
    const blueprint = validateBlueprint(JSON.parse(remake.blueprint_json), spec);
    if (await sha256(JSON.stringify(blueprint)) !== remake.blueprint_sha256) throw new ApiError(422, 'REMAKE_BLUEPRINT_CHANGED', 'The saved blueprint changed.');
    const stages = JSON.parse(remake.stages_json || '[]');
    const next = stages.length + 1;
    if (next <= 5) {
      phase = 'checkpoint'; stageNumber = next;
      const previous = stages.at(-1) || null;
      const stage = await recordCall(remake, phase, next, async () => {
        const prior = await query(db, "SELECT result_json,error_detail FROM custom_pack_remake_calls WHERE order_id = ? AND quality_epoch = ? AND logic_epoch = ? AND phase = 'checkpoint' AND stage_number = ? AND generation_round = ? AND status = 'failed' AND result_json IS NOT NULL ORDER BY created_at DESC,id DESC LIMIT 1", orderId, remake.quality_epoch, remake.logic_epoch, next, remake.recovery_round + 1).first();
        const result = prior ? await repairStagedCheckpoint(spec, blueprint, next, previous, JSON.parse(prior.result_json), prior.error_detail, env, env.FETCH || fetch)
          : await generateStagedCheckpoint(spec, blueprint, next, previous, env, env.FETCH || fetch);
        return { value: result.stage, usage: result.usage, responseId: result.responseId };
      }, env);
      const updated = [...stages, stage];
      await query(db, "UPDATE custom_pack_remakes SET stages_json = ?,status = 'queued',phase = ?,lease_until = NULL,failure_count = 0,updated_at = CURRENT_TIMESTAMP WHERE order_id = ?", JSON.stringify(updated), next === 5 ? 'audit' : 'checkpoint', orderId).run();
      await queueNext(orderId, env);
      return;
    }
    if (!remake.story_json) {
      phase = 'audit'; stageNumber = 0;
      const story = assembleStagedStory(spec, blueprint, stages);
      const storyJson = JSON.stringify(story);
      const storyHash = await sha256(storyJson);
      const proof = await recordCall(remake, phase, 0, async () => {
        const result = await auditStagedStory(story, spec, blueprint, env, env.FETCH || fetch);
        return { value: { storyHash }, usage: result.usage, responseId: result.responseId };
      }, env);
      if (proof.storyHash !== storyHash) throw new ApiError(422, 'GENERATION_QA_FAILED', 'The game differs from the checked blueprint.');
      await query(db, "UPDATE custom_pack_remakes SET story_json = ?,story_sha256 = ?,status = 'queued',phase = 'pdf',lease_until = NULL,failure_count = 0,updated_at = CURRENT_TIMESTAMP WHERE order_id = ?", storyJson, storyHash, orderId).run();
      await queueNext(orderId, env);
      return;
    }
    phase = 'pdf'; stageNumber = 0;
    await publishRemadeFiles(remake, order, env);
  } catch (caught) {
    const code = typeof caught?.code === 'string' && /^[A-Z0-9_]{1,60}$/.test(caught.code) ? caught.code : 'UNEXPECTED';
    const total = await query(db, "SELECT COUNT(*) AS n FROM custom_pack_remake_calls WHERE order_id = ? AND quality_epoch = ? AND logic_epoch = ? AND generation_round = ? AND model != 'checked-rules-v1'", orderId, remake.quality_epoch, remake.logic_epoch, remake.recovery_round + 1).first();
    const step = await query(db, 'SELECT COUNT(*) AS n FROM custom_pack_remake_calls WHERE order_id = ? AND quality_epoch = ? AND logic_epoch = ? AND phase = ? AND stage_number = ? AND generation_round = ?', orderId, remake.quality_epoch, remake.logic_epoch, phase, stageNumber, remake.recovery_round + 1).first();
    let retry = total.n < MAX_CALLS && (deterministicCheckpoint(phase,spec) || step.n < stepLimit(phase,spec)) && remake.failure_count < 2 && !['REMAKE_BLUEPRINT_CHANGED','REMAKE_STORY_CHANGED','REMAKE_SOURCE_MISSING','REMAKE_BUDGET_EXHAUSTED'].includes(code);
    if (deterministicCheckpoint(phase,spec) && code === 'GENERATION_INVALID') retry = false;
    if (code === 'GENERATION_QA_FAILED') {
      const failedStage = caught.stageNumber;
      retry = retry && failedStage >= 1 && failedStage <= 5;
      if (retry) {
        const blueprintIssue = spec.packContractVersion===1 || /material|card|option|choice|answer leak|printed piece/i.test(caught.message);
        if (blueprintIssue) {
          await db.batch([
            query(db, "UPDATE custom_pack_remake_calls SET status = 'failed',error_code = 'AUDIT_REJECTED',error_detail = ? WHERE id = (SELECT id FROM custom_pack_remake_calls WHERE order_id = ? AND quality_epoch = ? AND logic_epoch = ? AND phase = 'blueprint' AND status = 'passed' AND result_json IS NOT NULL ORDER BY generation_round DESC,created_at DESC,id DESC LIMIT 1)", String(caught.message).slice(0,500), orderId,remake.quality_epoch,remake.logic_epoch),
            query(db, "UPDATE custom_pack_remake_calls SET result_json = NULL,error_code = 'AUDIT_REJECTED' WHERE order_id = ? AND quality_epoch = ? AND logic_epoch = ? AND phase = 'checkpoint' AND status = 'passed'", orderId,remake.quality_epoch,remake.logic_epoch),
            query(db, "UPDATE custom_pack_remakes SET blueprint_json = NULL,blueprint_sha256 = NULL,stages_json = '[]',story_json = NULL,story_sha256 = NULL WHERE order_id = ?", orderId),
          ]);
          phase = 'blueprint';
        } else {
          const stages = JSON.parse(remake.stages_json || '[]').slice(0, failedStage - 1);
          await db.batch([
            query(db, 'UPDATE custom_pack_remakes SET stages_json = ? WHERE order_id = ?', JSON.stringify(stages), orderId),
            query(db, "UPDATE custom_pack_remake_calls SET result_json = NULL,error_code = 'AUDIT_REJECTED' WHERE order_id = ? AND quality_epoch = ? AND logic_epoch = ? AND phase = 'checkpoint' AND stage_number >= ? AND status = 'passed'", orderId,remake.quality_epoch,remake.logic_epoch, failedStage),
          ]);
          phase = 'checkpoint';
        }
      }
    }
    console.error('Paid pack remake step stopped', { orderId, phase, stageNumber, code, retry });
    await query(db, "UPDATE custom_pack_remakes SET status = ?,phase = ?,lease_until = NULL,failure_count = failure_count + 1,error_code = ?,error_detail = ?,updated_at = CURRENT_TIMESTAMP,completed_at = CASE WHEN ? = 'failed' THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE order_id = ?", retry ? 'queued' : 'failed', phase, code, String(caught?.message || 'Unknown failure').slice(0, 1000), retry ? 'queued' : 'failed', orderId).run();
    if(!retry)await query(db,"INSERT INTO custom_delivery_incidents (order_id,phase,error_code) VALUES (?,?,?) ON CONFLICT(order_id) DO UPDATE SET phase = excluded.phase,error_code = excluded.error_code,status = 'open',alert_status = 'pending',alert_attempts = 0,alerted_at = NULL",orderId,phase,code).run();
    if (retry) await queueNext(orderId, env);
  }
}

