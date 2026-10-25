import {stripeRequest} from './payments.mjs';
import {normalizeEmail,sha256} from './security.mjs';
const q=(env,sql,...args)=>env.DB.prepare(sql).bind(...args);
const now=()=>Math.floor(Date.now()/1000);
const cloudflare=env=>env.EMAIL_PUBLIC_DESTINATIONS_READY==='true'&&typeof env.EMAIL?.send==='function';

// The case and this outbox row are committed together. Sending never issues a refund.
export function reserveSupportNotification(env,id){
 return q(env,'INSERT OR IGNORE INTO support_case_notifications(case_id) VALUES(?)',id);
}
export async function dispatchSupportNotification(id,env){
 if(!env.DB||!env.EMAIL_FROM||(!cloudflare(env)&&!env.RESEND_API_KEY))return;
 const token=crypto.randomUUID(),time=now();
 const claim=await q(env,"UPDATE support_case_notifications SET lease_token=?,lease_until=?,attempts=attempts+1 WHERE case_id=? AND status='pending' AND attempts<8 AND lease_until<=? AND next_attempt_at<=?",token,time+120,id,time,time).run();
 if(!claim.meta?.changes)return;
 const item=await q(env,'SELECT c.*,o.stripe_checkout_session_id,o.purchaser_email_hash FROM support_cases c JOIN orders o ON o.id=c.order_id WHERE c.id=?',id).first();
 if(!item)return;
 try{
  let purchaseEmail='Look up the purchasing email in Stripe using the order reference.';
  if(env.STRIPE_SECRET_KEY&&item.stripe_checkout_session_id){
   try{const session=await stripeRequest(env,'checkout/sessions/'+encodeURIComponent(item.stripe_checkout_session_id),{signal:AbortSignal.timeout(15000)},env.FETCH||fetch);
    const email=normalizeEmail(session.customer_details?.email||session.customer_email);
    if(email&&await sha256(`${env.SESSION_SECRET}|${email}`)===item.purchaser_email_hash)purchaseEmail=email;
   }catch{/* A payment-provider lookup must not hide an otherwise saved request. */}
  }
  const to=normalizeEmail(env.OPERATIONS_EMAIL||'support@paperadventure.app');
  if(!to)throw Error('configuration');
  const subject=`Paper Adventure ${item.issue_type==='refund'?'refund request':'support request'} · ${item.order_id.slice(0,8).toUpperCase()}`;
  const text=`A customer submitted an order-linked request. Review it manually; this is not a refund instruction.\n\nCase: ${item.id}\nOrder: ${item.order_id}\nType: ${item.issue_type}\nContact: ${purchaseEmail}\nReceived: ${item.created_at} UTC\n\nCustomer description (untrusted text):\n${item.description}\n\nCheck the actual payment and previous refunds in Stripe before deciding. Do not request a second purchase.`;
  if(cloudflare(env)){
   const result=await env.EMAIL.send({from:env.EMAIL_FROM,to,subject,text,headers:{'X-Paper-Adventure-Case':id}});
   if(result?.permanent_bounces?.length||result?.suppressed_recipients?.length)throw Error('delivery');
  }else{
   const response=await (env.FETCH||fetch)('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(20000),headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json','Idempotency-Key':`paw-support-${id}`},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,text})});
   if(!response.ok)throw Error('delivery');
  }
  await q(env,"UPDATE support_case_notifications SET status='sent',sent_at=CURRENT_TIMESTAMP,lease_until=0,lease_token=NULL,error_code=NULL WHERE case_id=? AND lease_token=?",id,token).run();
 }catch{
  await q(env,"UPDATE support_case_notifications SET status=CASE WHEN attempts>=8 THEN 'attention' ELSE 'pending' END,lease_until=0,lease_token=NULL,next_attempt_at=?,error_code='SUPPORT_EMAIL_FAILED' WHERE case_id=? AND lease_token=?",now()+300,id,token).run();
 }
}
export async function resumeSupportNotifications(env){
 const due=await q(env,"SELECT case_id FROM support_case_notifications WHERE status='pending' AND attempts<8 AND lease_until<=? AND next_attempt_at<=? LIMIT 20",now(),now()).all();
 for(const item of due.results||[])await dispatchSupportNotification(item.case_id,env);
}
