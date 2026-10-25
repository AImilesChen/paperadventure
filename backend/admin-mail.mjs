import {normalizeEmail} from './security.mjs';
const q=(env,sql,...args)=>env.DB.prepare(sql).bind(...args);
const now=()=>Math.floor(Date.now()/1000);
const cloudflare=env=>env.EMAIL_PUBLIC_DESTINATIONS_READY==='true'&&typeof env.EMAIL?.send==='function';
export async function dispatchAdminReply(id,env) {
  if(!env.DB||!env.EMAIL_FROM||(!cloudflare(env)&&!env.RESEND_API_KEY))return;
  const token=crypto.randomUUID(),time=now();
  const claimed=await q(env,"UPDATE admin_replies SET lease_token=?,lease_until=?,attempts=attempts+1 WHERE id=? AND status='queued' AND attempts<8 AND lease_until<=? AND next_attempt_at<=?",token,time+120,id,time,time).run();
  if(!claimed.meta?.changes)return;
  const item=await q(env,'SELECT * FROM admin_replies WHERE id=?',id).first();
  if(!item)return;
  try {
    const recipient=normalizeEmail(item.recipient_email),replyTo=normalizeEmail(env.OPERATIONS_EMAIL||'support@paperadventure.app');
    if(!recipient||!replyTo)throw Error('configuration');
    const email={from:env.EMAIL_FROM,to:recipient,replyTo,subject:item.subject,
      text:`${item.body}\n\n—\nPaper Adventure support\nReference: ${item.source_id.slice(0,8).toUpperCase()}\nYou can reply to this email for further help.`,headers:{'X-Paper-Adventure-Reply':id}};
    if(cloudflare(env)) {
      const result=await env.EMAIL.send(email);
      if(result?.permanent_bounces?.length||result?.suppressed_recipients?.length)throw Error('delivery');
    } else {
      const {replyTo,...payload}=email;
      const result=await (env.FETCH||fetch)('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(20000),headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json','Idempotency-Key':`paw-admin-reply-${id}`},body:JSON.stringify({...payload,to:[recipient],reply_to:replyTo})});
      if(!result.ok)throw Error('delivery');
    }
    await env.DB.batch([
      q(env,"UPDATE admin_replies SET status='sent',sent_at=CURRENT_TIMESTAMP,lease_token=NULL,lease_until=0,error_code=NULL WHERE id=? AND lease_token=?",id,token),
      q(env,"INSERT INTO admin_action_log(actor_hash,action,target_kind,target_id,details_json) SELECT created_by,'reply_sent',source_kind,source_id,json_object('replyId',id) FROM admin_replies WHERE id=? AND status='sent' AND changes()=1",id),
    ]);
  } catch {
    await q(env,"UPDATE admin_replies SET status=CASE WHEN attempts>=8 THEN 'attention' ELSE 'queued' END,lease_token=NULL,lease_until=0,next_attempt_at=?,error_code='ADMIN_REPLY_FAILED' WHERE id=? AND lease_token=?",now()+300,id,token).run();
  }
}
export async function resumeAdminReplies(env) {
  const rows=await q(env,"SELECT id FROM admin_replies WHERE status='queued' AND attempts<8 AND lease_until<=? AND next_attempt_at<=? LIMIT 10",now(),now()).all();
  for(const row of rows.results||[])await dispatchAdminReply(row.id,env);
}
