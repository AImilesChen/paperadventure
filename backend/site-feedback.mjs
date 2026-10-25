import {ApiError} from './domain.mjs';
import {normalizeEmail,sha256} from './security.mjs';
import {feedbackTypes,feedbackBrowsers,feedbackDevices,feedbackPagePath,feedbackPayloadSignature} from '../shared/feedback.mjs';
const q=(env,sql,...args)=>env.DB.prepare(sql).bind(...args);
const seconds=()=>Math.floor(Date.now()/1000);
const cloudflare=env=>env.EMAIL_PUBLIC_DESTINATIONS_READY==='true'&&typeof env.EMAIL?.send==='function';
export const feedbackReady=env=>Boolean(env.DB&&env.SESSION_SECRET&&env.EMAIL_FROM&&(cloudflare(env)||env.RESEND_API_KEY));
const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});

function validate(body) {
  if(!body||typeof body!=='object'||Array.isArray(body))throw new ApiError(400,'INVALID_FEEDBACK','Enter your feedback.');
  const message=typeof body.message==='string'?body.message.trim():'';
  if(!Object.hasOwn(feedbackTypes,body.type)||!message||message.length>2000||typeof body.wantsReply!=='boolean')throw new ApiError(400,'INVALID_FEEDBACK','Choose a type and enter a message of up to 2,000 characters.');
  const email=body.wantsReply&&typeof body.email==='string'?normalizeEmail(body.email):null;
  if(body.wantsReply&&!email)throw new ApiError(400,'INVALID_REPLY_EMAIL','Enter an email for your reply, or turn off the reply option.');
  return {type:body.type,message,wantsReply:body.wantsReply,email:email||null,pagePath:feedbackPagePath(body.pagePath),
    browserCategory:feedbackBrowsers.includes(body.browserCategory)?body.browserCategory:'Other',
    deviceCategory:feedbackDevices.includes(body.deviceCategory)?body.deviceCategory:'desktop'};
}

async function rateBucket(request,env) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const ip=request.headers.get('cf-connecting-ip')||'unknown';
  const signed=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`site-feedback:${Math.floor(seconds()/600)}:${ip}`)));
  return [...signed].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export async function submitSiteFeedback(request,body,env,context={}) {
  if(!feedbackReady(env))throw new ApiError(503,'FEEDBACK_UNAVAILABLE','Feedback is temporarily unavailable. Please email support@paperadventure.app.');
  const input=validate(body),key=request.headers.get('idempotency-key')||'';
  if(!/^[a-zA-Z0-9_-]{16,128}$/.test(key))throw new ApiError(400,'INVALID_REQUEST_KEY','Please reopen the feedback form and try again.');
  const id=await sha256(`site-feedback-id|${env.SESSION_SECRET}|${key}`),fingerprint=await sha256(feedbackPayloadSignature(input));
  try {
    const existing=await q(env,'SELECT payload_sha256 FROM site_feedback WHERE id=?',id).first();
    if(existing){
      if(existing.payload_sha256!==fingerprint)throw new ApiError(409,'FEEDBACK_CHANGED','This submission changed. Please start a new feedback submission.');
      return reply({id,saved:true},200);
    }
    const bucket=await rateBucket(request,env);
    const limit=await q(env,'INSERT INTO feedback_rate_limits(bucket,hits,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 WHERE hits<5 RETURNING hits',bucket,seconds()+86400).first();
    if(!limit)throw new ApiError(429,'FEEDBACK_LIMIT','Please wait a few minutes before sending more feedback.');
    await q(env,`INSERT OR IGNORE INTO site_feedback(id,payload_sha256,type,message,reply_email,page_path,browser_category,device_category) VALUES(?,?,?,?,?,?,?,?)`,id,fingerprint,input.type,input.message,input.email,input.pagePath,input.browserCategory,input.deviceCategory).run();
    const saved=await q(env,'SELECT payload_sha256 FROM site_feedback WHERE id=?',id).first();
    if(saved?.payload_sha256!==fingerprint)throw new ApiError(409,'FEEDBACK_CHANGED','This submission changed. Please start a new feedback submission.');
    const task=dispatchFeedbackNotification(id,env).catch(()=>{});
    if(context.waitUntil)context.waitUntil(task);else await task;
    return reply({id,saved:true},201);
  } catch(error) {
    if(error instanceof ApiError)throw error;
    // No submitted text, address, request body or provider error belongs in logs.
    throw new ApiError(503,'FEEDBACK_SAVE_FAILED','Your feedback is not confirmed yet. Please retry; your message stays in this form.');
  }
}

export async function dispatchFeedbackNotification(id,env) {
  if(!feedbackReady(env))return;
  const time=seconds(),token=crypto.randomUUID();
  const claim=await q(env,"UPDATE site_feedback SET notification_lease_token=?,notification_lease_until=?,notification_attempts=notification_attempts+1 WHERE id=? AND notification_status='pending' AND notification_attempts<8 AND notification_lease_until<=? AND notification_next_at<=?",token,time+120,id,time,time).run();
  if(!claim.meta?.changes)return;
  const item=await q(env,'SELECT * FROM site_feedback WHERE id=?',id).first();
  if(!item)return;
  try {
    const to=normalizeEmail(env.OPERATIONS_EMAIL||'support@paperadventure.app');
    if(!to)throw Error('configuration');
    const email={from:env.EMAIL_FROM,to,subject:`[Paper Adventure Feedback] ${feedbackTypes[item.type]} · ${id.slice(0,8).toUpperCase()}`,
      text:`A visitor submitted website feedback. This is not an order, refund instruction or live chat.\n\nReference: ${id}\nType: ${feedbackTypes[item.type]}\nReceived: ${item.created_at} UTC\nReply email: ${item.reply_email||'Anonymous — no reply email supplied'}\nPage: ${item.page_path}\nBrowser: ${item.browser_category}\nDevice: ${item.device_category}\n\nVisitor message (untrusted text):\n${item.message}`,
      ...(item.reply_email?{replyTo:item.reply_email}:{}),headers:{'X-Paper-Adventure-Feedback':id}};
    if(cloudflare(env)) {
      // Cloudflare Workers EmailMessageBuilder uses replyTo, not a custom Reply-To header.
      const result=await env.EMAIL.send(email);
      if(result?.permanent_bounces?.length||result?.suppressed_recipients?.length)throw Error('delivery');
    } else {
      const {replyTo,...rest}=email;
      const response=await (env.FETCH||fetch)('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(20000),headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json','Idempotency-Key':`paw-feedback-${id}`},body:JSON.stringify({...rest,to:[to],...(replyTo?{reply_to:replyTo}:{})})});
      if(!response.ok)throw Error('delivery');
    }
    await q(env,"UPDATE site_feedback SET notification_status='sent',notified_at=CURRENT_TIMESTAMP,notification_lease_until=0,notification_lease_token=NULL,notification_error_code=NULL WHERE id=? AND notification_lease_token=?",id,token).run();
  } catch {
    await q(env,"UPDATE site_feedback SET notification_status=CASE WHEN notification_attempts>=8 THEN 'attention' ELSE 'pending' END,notification_lease_until=0,notification_lease_token=NULL,notification_next_at=?,notification_error_code='FEEDBACK_EMAIL_FAILED' WHERE id=? AND notification_lease_token=?",seconds()+300,id,token).run();
  }
}

export async function resumeFeedbackNotifications(env) {
  await q(env,'DELETE FROM feedback_rate_limits WHERE expires_at<?',seconds()).run();
  const rows=await q(env,"SELECT id FROM site_feedback WHERE notification_status='pending' AND notification_attempts<8 AND notification_lease_until<=? AND notification_next_at<=? LIMIT 10",seconds(),seconds()).all();
  for(const row of rows.results||[])await dispatchFeedbackNotification(row.id,env);
}
