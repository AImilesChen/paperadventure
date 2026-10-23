import {buildBaselinePack} from './baseline-pack.mjs';
import {validateGeneratedStory} from './domain.mjs';
import {validateBlueprint} from './staged-story.mjs';
import {verifyPrintedPuzzles} from './paper-proof.mjs';
import {sha256} from './security.mjs';
import {ensureDeliveryCopy} from './delivery-copy-service.mjs';

const query=(db,sql,...values)=>db.prepare(sql).bind(...values);
export const STEP_SAVED=Symbol('step saved');

export async function ensureBaseline(orderId,spec,specHash,env){
  let row=await query(env.DB,'SELECT spec_sha256,pack_json FROM custom_generation_baselines WHERE order_id = ?',orderId).first();
  if(row&&row.spec_sha256!==specHash)throw Object.assign(Error('The baseline belongs to another approved plan.'),{code:'STORY_CHECKPOINT_MISMATCH'});
  if(!row){
    let pack;
    try{pack=await buildBaselinePack(spec);}
    catch(cause){throw Object.assign(Error('The approved plan could not form a proven baseline.',{cause}),{code:'BASELINE_INVALID'});}
    await query(env.DB,'INSERT OR IGNORE INTO custom_generation_baselines (order_id,spec_sha256,pack_json) VALUES (?,?,?)',orderId,specHash,JSON.stringify(pack)).run();
    row=await query(env.DB,'SELECT spec_sha256,pack_json FROM custom_generation_baselines WHERE order_id = ?',orderId).first();
  }
  if(row?.spec_sha256!==specHash)throw Object.assign(Error('The baseline binding changed.'),{code:'STORY_CHECKPOINT_MISMATCH'});
  return row;
}

export async function enqueueNextStep(orderId,activityId,env){
  // Persist eligibility before send. The existing cron recovers a failed send.
  await query(env.DB,"UPDATE custom_activities SET status = 'queued',lease_until = NULL,pipeline_failures = 0 WHERE id = ? AND status = 'generating'",activityId).run();
  try{await env.GENERATION_QUEUE.send({orderId});}
  catch{console.error('Saved generation step awaits scheduled dispatch',{orderId,code:'QUEUE_SEND_FAILED'});}
}

export async function activateBaseline(orderId,activityId,spec,specHash,code,env){
  const row=await query(env.DB,'SELECT spec_sha256,pack_json FROM custom_generation_baselines WHERE order_id = ?',orderId).first();
  if(!row||row.spec_sha256!==specHash)return false;
  // Never rewrite a story already bound for delivery, or an existing artifact.
  if(await query(env.DB,'SELECT order_id FROM custom_story_checkpoints WHERE order_id = ?',orderId).first())return false;
  const state=await query(env.DB,'SELECT delivery_mode FROM custom_generation_baselines WHERE order_id = ?',orderId).first();
  if(state.delivery_mode!=='baseline'&&await query(env.DB,'SELECT order_id FROM custom_delivery_copy WHERE order_id = ?',orderId).first())return false;
  const pack=JSON.parse(row.pack_json),blueprint=validateBlueprint(pack.blueprint,spec);
  const story=validateGeneratedStory(pack.story,spec);
  verifyPrintedPuzzles(story);
  const bpJson=JSON.stringify(blueprint),bpHash=await sha256(bpJson);
  // Keep provider fragments and failures in custom_generation_calls. Only the
  // unpublished derived checkpoint tables switch to the verified base edition.
  await env.DB.batch([
    query(env.DB,'DELETE FROM custom_game_stages WHERE order_id = ?',orderId),
    query(env.DB,'INSERT INTO custom_game_blueprints (order_id,spec_sha256,blueprint_sha256,blueprint_json) VALUES (?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET spec_sha256=excluded.spec_sha256,blueprint_sha256=excluded.blueprint_sha256,blueprint_json=excluded.blueprint_json',orderId,specHash,bpHash,bpJson),
    ...story.stages.map(stage=>query(env.DB,'INSERT INTO custom_game_stages (order_id,stage_number,blueprint_sha256,stage_json) VALUES (?,?,?,?)',orderId,stage.number,bpHash,JSON.stringify(stage))),
    query(env.DB,"UPDATE custom_generation_baselines SET delivery_mode = 'baseline',error_code = ?,updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND spec_sha256 = ?",code,orderId,specHash),
  ]);
  // Policy v2 performs proof and PDF preflight locally; no model review.
  await ensureDeliveryCopy(story,spec,orderId,env,()=>{throw Error('A baseline must not call a provider.');});
  const storyJson=JSON.stringify(story);
  await env.DB.batch([
    query(env.DB,'INSERT INTO custom_game_audits (order_id,story_sha256) VALUES (?,?) ON CONFLICT(order_id) DO UPDATE SET story_sha256=excluded.story_sha256',orderId,await sha256(storyJson)),
    query(env.DB,'INSERT INTO custom_story_checkpoints (order_id,spec_sha256,story_json,response_id) VALUES (?,?,?,NULL)',orderId,specHash,storyJson),
  ]);
  await enqueueNextStep(orderId,activityId,env);
  return true;
}
