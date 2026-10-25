import {normalizeEmail,sha256,verifyAccessToken} from './security.mjs';
import {ApiError} from './domain.mjs';

// Only the owner-designated Google login. This server-only digest is not a credential.
const administratorEmailDigests=new Set(['7b8c289eebc96543bae56647702216ec94ee95ee7dc1e6139921b9eb3e004def']);
export async function adminIdentity(request,env) {
  if(!env.SESSION_SECRET)return null;
  const token=(request.headers.get('cookie')||'').match(/(?:^|;\s*)paw_session=([^;]+)/)?.[1];
  const session=token?await verifyAccessToken(env.SESSION_SECRET,token):null;
  const email=normalizeEmail(session?.email);
  if(session?.scope!=='session'||session.provider!=='google'||!email||!/^[a-f0-9]{64}$/.test(session.googleSubjectHash||''))return null;
  if(await sha256(`${env.SESSION_SECRET}|${email}`)!==session.emailHash||!administratorEmailDigests.has(await sha256(email)))return null;
  return {email,emailHash:session.emailHash};
}
export async function requireAdmin(request,env) {
  if(!env.DB||!env.SESSION_SECRET)throw new ApiError(503,'ADMIN_UNAVAILABLE','管理服务暂时不可用。');
  const identity=await adminIdentity(request,env);
  if(!identity)throw new ApiError(403,'ADMIN_GOOGLE_REQUIRED','请使用已授权的 Google 账号重新登录管理后台。');
  return identity;
}
export async function recordGoogleProfile(env,identity) {
  const hash=await sha256(`${env.SESSION_SECRET}|${identity.email}`),subject=await sha256(identity.subject);
  const operator=administratorEmailDigests.has(await sha256(identity.email));
  await env.DB.prepare(`INSERT INTO account_profiles(email_hash,email,google_subject_hash,first_login_at,last_login_at,source,is_operator)
    VALUES(?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'google',?) ON CONFLICT(email_hash) DO UPDATE SET email=excluded.email,
    google_subject_hash=excluded.google_subject_hash,first_login_at=COALESCE(account_profiles.first_login_at,CURRENT_TIMESTAMP),last_login_at=CURRENT_TIMESTAMP,source='google',is_operator=excluded.is_operator`).bind(hash,identity.email,subject,operator?1:0).run();
  return {emailHash:hash,googleSubjectHash:subject};
}
export async function recordPurchaseEmail(env,order,email,source='checkout') {
  const normalized=normalizeEmail(email);
  if(!normalized||await sha256(`${env.SESSION_SECRET}|${normalized}`)!==order.purchaser_email_hash)return false;
  await env.DB.prepare(`INSERT INTO account_profiles(email_hash,email,source) VALUES(?,?,?) ON CONFLICT(email_hash) DO UPDATE SET email=excluded.email`).bind(order.purchaser_email_hash,normalized,source).run();
  return true;
}
