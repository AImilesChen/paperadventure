import {pointsProducts} from '../../shared/credits/products.mjs';
import {stripeRequest,paymentEnvironment,stripeKeyMode} from '../payments.mjs';
import {approvedLiveCreditPrices,creditPriceReviewId} from './approved-prices.mjs';
// GET-only provider verification. Never creates a product, checkout or payment.
export async function verifyApprovedCreditPrices(rawEnv,{clock=()=>Date.now()}={}){
 const env=paymentEnvironment(rawEnv),db=env.DB;
 if(!db||env.AI_CREDITS_PRICE_REVIEW!=='true'||stripeKeyMode(env.STRIPE_SECRET_KEY)!=='live')return{skipped:true};
 const at=clock();
 await db.prepare('INSERT OR IGNORE INTO sudoku_point_setup(id,updated_at) VALUES(?,?)').bind(creditPriceReviewId,at).run();
 const prior=await db.prepare('SELECT * FROM sudoku_point_setup WHERE id=?').bind(creditPriceReviewId).first();
 if(prior.status==='verified'||prior.status==='needs_review')return{status:prior.status};
 const lease=await db.prepare("UPDATE sudoku_point_setup SET attempts=attempts+1,lease_until=?,stage='read-approved-prices',updated_at=? WHERE id=? AND lease_until<? AND status='pending' AND attempts<3").bind(at+120000,at,creditPriceReviewId,at).run();
 if(!lease.meta?.changes)return{skipped:true};
 try{
  const rows=[];
  for(const product of pointsProducts){
   const id=approvedLiveCreditPrices[product.sku];
   const price=await stripeRequest(env,'prices/'+encodeURIComponent(id),{},env.FETCH||fetch);
   const productId=typeof price.product==='string'?price.product:price.product?.id;
   if(price.id!==id||price.livemode!==true||price.active!==true||price.type!=='one_time'||price.recurring||price.currency!==product.currency||price.unit_amount!==product.unitAmount||!/^prod_[A-Za-z0-9]+$/.test(productId||''))throw Object.assign(Error('Price mismatch'),{reviewCode:'PRICE_MISMATCH'});
   rows.push(db.prepare('INSERT INTO sudoku_point_products(mode,sku,product_id,price_id,amount,points,currency,verified_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(mode,sku) DO UPDATE SET product_id=excluded.product_id,price_id=excluded.price_id,amount=excluded.amount,points=excluded.points,currency=excluded.currency,verified_at=excluded.verified_at').bind('live',product.sku,productId,id,product.unitAmount,product.points,product.currency,at));
  }
  rows.push(db.prepare("UPDATE sudoku_point_setup SET status='verified',stage='both-prices-read-verified',error_code=NULL,lease_until=0,updated_at=? WHERE id=?").bind(at,creditPriceReviewId));
  await db.batch(rows);return{status:'verified'};
 }catch(e){
  const code=e.reviewCode||(e.providerStatus===403?'STRIPE_PERMISSION_DENIED':e.providerStatus===404?'PRICE_NOT_FOUND':'PRICE_VERIFICATION_RETRY');
  await db.prepare("UPDATE sudoku_point_setup SET status=?,stage='read-approved-prices',error_code=?,lease_until=0,updated_at=? WHERE id=?").bind(code==='PRICE_VERIFICATION_RETRY'?'pending':'needs_review',code,at,creditPriceReviewId).run();
  return{status:code==='PRICE_VERIFICATION_RETRY'?'pending':'needs_review',code};
 }
}
