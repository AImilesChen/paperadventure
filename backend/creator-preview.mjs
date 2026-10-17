import { ApiError, requireText } from './domain.mjs';
import { contextKey, validatePlan, mechanicById } from '../shared/creator-plan.mjs';
import { sha256, signAccessToken, verifyAccessToken } from './security.mjs';

export function creatorFields(input) {
  if (input.creatorVersion == null) return {};
  if (![2,3].includes(input.creatorVersion)) throw new ApiError(400,'INVALID_SPEC','Update your adventure setup before continuing.');
  const primary = input.gameplay?.primary || 'reasoning';
  const secondary = input.gameplay?.secondary || [];
  if (!mechanicById(primary) || !Array.isArray(secondary) || secondary.length > 2 || new Set(secondary).size !== secondary.length || secondary.some(id=>id===primary || !mechanicById(id))) throw new ApiError(400,'INVALID_SPEC','Choose one main style and up to two different supporting styles.');
  if (input.language && input.language !== 'en') throw new ApiError(400,'INVALID_SPEC','Custom PDFs currently use English.');
  const optional = (value,label,max) => value ? requireText(value,label,max) : '';
  return {creatorVersion:input.creatorVersion,language:'en',storyLocation:optional(input.storyLocation,'Story location',180),mood:optional(input.mood,'Story mood',80),
    gameplay:{primary,secondary:[...secondary].sort(),request:optional(input.gameplay?.request,'Play request',180)},
    ...(input.creatorVersion === 2 ? {previewToken:optional(input.previewToken,'Preview verification',1200),plan:input.plan || null,planConfirmed:input.planConfirmed === true} : {})};
}

export async function signPreview(plan, spec, owner, secret) {
  return signAccessToken(secret,{scope:'creator-preview',owner,emailHash:owner,contextHash:await sha256(contextKey(spec)),
    planHash:await sha256(JSON.stringify(plan)),exp:Math.floor(Date.now()/1000)+30*86400});
}

// Verify the selected plan against the server signature and the complete setup.
// Only the authenticated owner can renew an unchanged expired draft proof.
export async function confirmPreview(spec, owner, secret, renew = false) {
  if (spec.creatorVersion !== 2 || !owner) throw new ApiError(409,'PREVIEW_REQUIRED','Sign in and review a five-checkpoint preview before checkout.');
  let plan;
  try { plan = validatePlan(spec.plan,spec); }
  catch { throw new ApiError(409,'PREVIEW_REQUIRED','Generate and choose a valid five-checkpoint plan.'); }
  const proof = await verifyAccessToken(secret,spec.previewToken,renew ? 0 : Date.now());
  if (!proof || proof.scope !== 'creator-preview' || proof.owner !== owner || proof.contextHash !== await sha256(contextKey(spec)) || proof.planHash !== await sha256(JSON.stringify(plan))) throw new ApiError(409,'PREVIEW_STALE','Your setup or preview changed. Update and confirm the preview before checkout.');
  if (plan.id !== spec.direction) throw new ApiError(409,'PREVIEW_STALE','Select the direction shown in your confirmed plan.');
  spec.plan = plan; spec.proposalTitle = plan.title; spec.proposalSummary = plan.summary;
  if (renew) spec.previewToken = await signPreview(plan,spec,owner,secret);
  return spec;
}
