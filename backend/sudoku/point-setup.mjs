import {pointsProducts} from '../../shared/sudoku/point-products.mjs';
import {paymentEnvironment,stripeKeyMode,stripeRequest} from '../payments.mjs';
const sql=(db,s,...v)=>db.prepare(s).bind(...v);
const version='v49';
const identifier=p=>'paw_'+p.sku+'_'+version;
const validPrice=(p,x,mode,product)=>Boolean(x?.id?.startsWith('price_')&&x.active===true&&x.type==='one_time'&&x.unit_amount===p.unitAmount&&x.currency===p.currency&&x.livemode===(mode==='live')&&(typeof x.product==='string'?x.product:x.product?.id)===product);

export async function pointsPriceEnvironment(rawEnv){
 const env={...paymentEnvironment(rawEnv)},mode=stripeKeyMode(env.STRIPE_SECRET_KEY);
 if(!mode||!env.DB)return env;
 try{for(const p of pointsProducts){if(env[p.priceEnv])continue;const row=await sql(env.DB,'SELECT * FROM sudoku_point_products WHERE mode=? AND sku=?',mode,p.sku).first();if(row&&row.amount===p.unitAmount&&row.points===p.points&&row.currency===p.currency)env[p.priceEnv]=row.price_id;}}catch{/* Existing env-only configuration remains compatible before 0052. */}
 return env;
}

// Enabled only for an operator-authorized release; never handles a customer payment.
// Bounded durable lease + stable Stripe identifiers/idempotency prevent duplicate products.
export async function runPointsProductSetup(rawEnv,{now=Date.now()}={}){
 const request=rawEnv.SUDOKU_POINTS_PROVISION;
 if(!request||request==='off')return {skipped:true};
 if(!/^v49-[a-z0-9-]{1,55}$/.test(request))return {skipped:true};
 const env=paymentEnvironment(rawEnv),mode=stripeKeyMode(env.STRIPE_SECRET_KEY),id=request;
 if(!env.DB)return {skipped:true};
 await sql(env.DB,'INSERT OR IGNORE INTO sudoku_point_setup(id) VALUES(?)',id).run();
 const lease=await sql(env.DB,"UPDATE sudoku_point_setup SET attempts=attempts+1,lease_until=?,updated_at=? WHERE id=? AND status='pending' AND attempts<3 AND lease_until<?",now+180000,now,id,now).run();
 if(!lease.meta?.changes)return {skipped:true};
 let stage='credentials';
 const stripe=(path,options={})=>stripeRequest(env,path,{signal:AbortSignal.timeout(20000),...options},env.FETCH||fetch);
 const post=(path,fields,key)=>stripe(path,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','Idempotency-Key':key},body:new URLSearchParams(fields)});
 try{
  if(mode!=='live'||!env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'))throw Object.assign(Error(),{code:'LIVE_CREDENTIALS_MISSING'});
  for(const p of pointsProducts){
   const productId=identifier(p);let product;stage=p.sku+':product-read';
   try{product=await stripe('products/'+productId);}catch(e){if(e.providerStatus!==404)throw e;}
   if(!product){stage=p.sku+':product-create';product=await post('products',{id:productId,name:p.points+' Sudoku hint points',description:'One-time Sudoku hint points pack. No subscription or automatic renewal.','metadata[purpose]':'sudoku_points','metadata[sku]':p.sku,'metadata[points]':String(p.points)},productId+'-product');}
   if(product.id!==productId||product.active!==true||product.livemode!==true||product.metadata?.purpose!=='sudoku_points'||product.metadata?.sku!==p.sku)throw Object.assign(Error(),{code:'PRODUCT_MISMATCH'});
   stage=p.sku+':price-read';const found=await stripe('prices?lookup_keys%5B%5D='+productId+'&limit=10');let price=found.data?.find(x=>x.lookup_key===productId);
   if(!price){stage=p.sku+':price-create';price=await post('prices',{product:productId,currency:p.currency,unit_amount:String(p.unitAmount),lookup_key:productId,'metadata[purpose]':'sudoku_points','metadata[sku]':p.sku},productId+'-price');}
   stage=p.sku+':price-verify';price=await stripe('prices/'+encodeURIComponent(price.id));
   if(!validPrice(p,price,mode,productId))throw Object.assign(Error(),{code:'PRICE_MISMATCH'});
   await sql(env.DB,'INSERT INTO sudoku_point_products(mode,sku,product_id,price_id,amount,points,currency,verified_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(mode,sku) DO UPDATE SET product_id=excluded.product_id,price_id=excluded.price_id,amount=excluded.amount,points=excluded.points,currency=excluded.currency,verified_at=excluded.verified_at',mode,p.sku,productId,price.id,p.unitAmount,p.points,p.currency,now).run();
  }
  await sql(env.DB,"UPDATE sudoku_point_setup SET status='verified',stage='complete',error_code=NULL,lease_until=0,updated_at=? WHERE id=?",now,id).run();return {status:'verified'};
 }catch(e){const code=e.providerStatus===403?'STRIPE_PERMISSION_DENIED':e.providerStatus===401?'STRIPE_KEY_REJECTED':e.code==='PRODUCT_MISMATCH'||e.code==='PRICE_MISMATCH'||e.code==='LIVE_CREDENTIALS_MISSING'?e.code:'STRIPE_SETUP_RETRY';await sql(env.DB,"UPDATE sudoku_point_setup SET status=?,stage=?,error_code=?,lease_until=0,updated_at=? WHERE id=?",code==='STRIPE_SETUP_RETRY'?'pending':'needs_review',stage,code,now,id).run();return {status:code==='STRIPE_SETUP_RETRY'?'pending':'needs_review',stage,code};}
}
