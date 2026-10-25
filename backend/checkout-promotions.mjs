import {ApiError} from './domain.mjs';
import {sha256,normalizeEmail} from './security.mjs';
import {requireAdmin} from './admin-identity.mjs';
import {stripeRequest,stripeKeyMode} from './payments.mjs';
import {ownerPromotion as c} from './checkout-promotion-policy.mjs';
const query=(env,sql,...args)=>env.DB.prepare(sql).bind(...args);
export async function promotionQuote(request,input,env){
 const value=input.promotionCode;
 if(value===undefined||value===null||value==='')return null;
 if(typeof value!=='string'||value.length>64)throw new ApiError(400,'PROMOTION_INVALID','This promotion code is not valid.');
 const actor=await requireAdmin(request,env);
 if(input.sku!==c.sku||stripeKeyMode(env.STRIPE_SECRET_KEY)!=='live')throw new ApiError(400,'PROMOTION_PRODUCT','This code is for one US$9.99 ready-made home game.');
 if(input.email&&normalizeEmail(input.email)!==actor.email)throw new ApiError(403,'PROMOTION_ACCOUNT','Use the email linked to your signed-in account.');
 const row=await query(env,'SELECT * FROM checkout_promotions WHERE id=?',c.id).first();
 if(!row||await sha256(value.trim().toUpperCase())!==row.code_hash)throw new ApiError(400,'PROMOTION_INVALID','This promotion code is not valid.');
 if(Math.floor(Date.now()/1000)>=c.expiresAt)throw new ApiError(409,'PROMOTION_EXPIRED','This promotion code has expired.');
 if(row.status!=='ready')throw new ApiError(503,'PROMOTION_NOT_READY','This promotion is not available yet.');
 if(await query(env,'SELECT order_id FROM checkout_promotion_redemptions WHERE promotion_id=?',c.id).first())throw new ApiError(409,'PROMOTION_USED','This one-use promotion has already been redeemed.');
 return {id:c.id,couponId:c.couponId,subtotal:c.subtotal,discount:c.discount,total:c.total,currency:c.currency};
}
export async function setupOwnerPromotion(env){
 if(env.OWNER_PAYMENT_COUPON_SETUP!=='v1'||stripeKeyMode(env.STRIPE_SECRET_KEY)!=='live')return;
 const now=Math.floor(Date.now()/1000);
 const locked=await query(env,"UPDATE checkout_promotions SET setup_attempts=setup_attempts+1,lease_until=? WHERE id=? AND status='pending' AND setup_attempts<3 AND lease_until<?",now+120,c.id,now).run();
 if(!locked.meta?.changes)return;
 let status='ready',errorCode=null,stage='price_lookup',providerStatus=null,providerCode=null,providerParam=null,checks=null;
 try{
  if(now>=c.expiresAt){status='expired';throw Error();}
  const price=await query(env,"SELECT stripe_price_id,unit_amount FROM price_versions WHERE sku=? AND sale_enabled=1 ORDER BY created_at DESC LIMIT 1",c.sku).first();
  if(price?.unit_amount!==c.subtotal||!price.stripe_price_id)throw Error();
  stage='price_read';
  const actual=await stripeRequest(env,'prices/'+encodeURIComponent(price.stripe_price_id),{signal:AbortSignal.timeout(15000)},env.FETCH||fetch);
  stage='price_verify';
  if(actual.id!==price.stripe_price_id||actual.livemode!==true||actual.active!==true||actual.currency!=='usd'||actual.type!=='one_time'||actual.unit_amount!==c.subtotal||typeof actual.product!=='string'||!/^prod_[A-Za-z0-9]+$/.test(actual.product))throw Error();
  const form=new URLSearchParams({id:c.couponId,name:'US$8.99 off — one payment check',amount_off:String(c.discount),currency:'usd',duration:'once',max_redemptions:'1',redeem_by:String(c.expiresAt),'applies_to[products][0]':actual.product,'metadata[purpose]':c.id,'expand[0]':'applies_to'});
  stage='coupon_read';
  let coupon;
  try{coupon=await stripeRequest(env,'coupons/'+encodeURIComponent(c.couponId)+'?expand[]=applies_to',{signal:AbortSignal.timeout(15000)},env.FETCH||fetch);}catch(error){if(error.providerStatus!==404)throw error;}
  stage='coupon_create';
  if(!coupon)try{coupon=await stripeRequest(env,'coupons',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','Idempotency-Key':c.id+'-create-v1'},body:form.toString(),signal:AbortSignal.timeout(15000)},env.FETCH||fetch);}
  catch(error){if(error.providerStatus!==400)throw error;try{coupon=await stripeRequest(env,'coupons/'+encodeURIComponent(c.couponId)+'?expand[]=applies_to',{signal:AbortSignal.timeout(15000)},env.FETCH||fetch);}catch{throw error;}}
  stage='coupon_verify';checks={identity:coupon.id===c.couponId,live:coupon.livemode===true,amount:coupon.amount_off===c.discount,currency:coupon.currency==='usd',duration:coupon.duration==='once',limit:coupon.max_redemptions===1,expiry:coupon.redeem_by===c.expiresAt,percentage:coupon.percent_off===null,products:coupon.applies_to?.products?.length===1&&coupon.applies_to.products[0]===actual.product,purpose:coupon.metadata?.purpose===c.id,valid:coupon.valid===true};
  if(coupon.id!==c.couponId||coupon.livemode!==true||coupon.amount_off!==c.discount||coupon.currency!=='usd'||coupon.duration!=='once'||coupon.max_redemptions!==1||coupon.redeem_by!==c.expiresAt||coupon.percent_off!==null||coupon.applies_to?.products?.length!==1||coupon.applies_to.products[0]!==actual.product||coupon.metadata?.purpose!==c.id||coupon.valid!==true)throw Error();
 }catch(error){
  providerStatus=error.providerStatus||null;providerCode=error.providerCode||null;providerParam=error.providerParam||null;
  if(status!=='expired'){status=error.providerStatus===403?'permission_denied':'failed';errorCode=error.providerStatus===403?'COUPONS_WRITE_REQUIRED':'COUPON_SETUP_FAILED';}
 }
 await env.DB.batch([
  query(env,'UPDATE checkout_promotions SET status=?,error_code=?,lease_until=0,updated_at=CURRENT_TIMESTAMP WHERE id=?',status,errorCode,c.id),
  query(env,"INSERT INTO admin_action_log(actor_hash,action,target_kind,target_id,details_json) VALUES('owner-requested-setup','payment_check_coupon_setup','promotion',?,?)",c.id,JSON.stringify({status,errorCode,stage,providerStatus,providerCode,providerParam,checks})),
 ]);
}
