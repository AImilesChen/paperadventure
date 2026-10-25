import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {setupOwnerPromotion} from './checkout-promotions.mjs';
import {ownerPromotion as c} from './checkout-promotion-policy.mjs';
function fixture(){
 const db=new DatabaseSync(':memory:');for(const name of readdirSync(new URL('./migrations/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync(new URL('./migrations/'+name,import.meta.url),'utf8'));
 const DB={prepare:sql=>({bind:(...args)=>({first:async()=>db.prepare(sql).get(...args)||null,run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})})}),batch:async statements=>{db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}};
 db.exec("INSERT INTO price_versions(id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES('owner-coupon-price','ready_home','USD',999,'price_fixture','unknown',1)");
 let calls=[];const price={id:'price_fixture',livemode:true,active:true,type:'one_time',currency:'usd',unit_amount:999,product:'prod_fixture'};
 const coupon={id:c.couponId,livemode:true,amount_off:899,currency:'usd',duration:'once',max_redemptions:1,redeem_by:c.expiresAt,percent_off:null,applies_to:{products:['prod_fixture']},metadata:{purpose:c.id},valid:true};
 const env={DB,OWNER_PAYMENT_COUPON_SETUP:'v1',STRIPE_SECRET_KEY:'rk_live_fixture',FETCH:async(url,options)=>{calls.push({url,options});return url.endsWith('/prices/price_fixture')?Response.json(price):options.method==='POST'?Response.json(coupon):Response.json({error:{code:'resource_missing'}},{status:404});}};
 return {db,env,calls,coupon,price};
}
test('coupon setup creates only the authorized scoped discount, once, without a checkout or payment',async()=>{
 const f=fixture();await Promise.all([setupOwnerPromotion(f.env),setupOwnerPromotion(f.env)]);await setupOwnerPromotion(f.env);
 assert.equal(f.calls.length,3);assert.equal(f.db.prepare('SELECT status FROM checkout_promotions').get().status,'ready');assert.equal(f.db.prepare('SELECT setup_attempts FROM checkout_promotions').get().setup_attempts,1);
 const post=f.calls[2],form=new URLSearchParams(post.options.body);assert.equal(post.url,'https://api.stripe.com/v1/coupons');assert.equal(post.options.method,'POST');assert.equal(post.options.headers['Idempotency-Key'],c.id+'-create-v1');
 assert.equal(form.get('amount_off'),'899');assert.equal(form.get('currency'),'usd');assert.equal(form.get('duration'),'once');assert.equal(form.get('max_redemptions'),'1');assert.equal(form.get('applies_to[products][0]'),'prod_fixture');assert.equal(form.get('redeem_by'),String(c.expiresAt));
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM orders').get().n,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM checkout_promotion_redemptions').get().n,0);
 assert.equal(f.db.prepare("SELECT details_json FROM admin_action_log WHERE action='payment_check_coupon_setup'").get().details_json.includes('rk_live_fixture'),false);
});
test('missing Coupons permission is reported safely once while ordinary checkout configuration stays intact',async()=>{
 const f=fixture(),key=f.env.STRIPE_SECRET_KEY;f.env.FETCH=async(url,options)=>url.includes('/prices/')?Response.json(f.price):options.method==='POST'?Response.json({error:{message:'sensitive provider prose'}},{status:403}):Response.json({error:{code:'resource_missing'}},{status:404});
 await setupOwnerPromotion(f.env);await setupOwnerPromotion(f.env);
 const row=f.db.prepare('SELECT * FROM checkout_promotions').get();assert.equal(row.status,'permission_denied');assert.equal(row.error_code,'COUPONS_WRITE_REQUIRED');assert.equal(row.setup_attempts,1);assert.equal(f.env.STRIPE_SECRET_KEY,key);assert.equal(JSON.stringify(row).includes('sensitive'),false);
});
test('coupon setup rejects wrong prices and mismatched or broader coupons and does not run without explicit authorization',async()=>{
 for(const patch of [{amount_off:900},{livemode:false},{max_redemptions:null},{applies_to:{products:['prod_other']}},{valid:false},{metadata:{purpose:'other'}}]){
  const f=fixture();Object.assign(f.coupon,patch);await setupOwnerPromotion(f.env);assert.equal(f.db.prepare('SELECT status FROM checkout_promotions').get().status,'failed');
 }
 for(const patch of [{OWNER_PAYMENT_COUPON_SETUP:'off'},{STRIPE_SECRET_KEY:'rk_test_fixture'}]){const f=fixture();await setupOwnerPromotion({...f.env,...patch});assert.equal(f.calls.length,0);}
 const f=fixture();f.price.unit_amount=100;await setupOwnerPromotion(f.env);assert.equal(f.calls.length,1);assert.equal(f.db.prepare('SELECT status FROM checkout_promotions').get().status,'failed');
});
test('an existing coupon is verified by exact identity and never recreated',async()=>{
 const f=fixture();f.env.FETCH=async(url,options)=>{f.calls.push({url,options});if(url.includes('/prices/'))return Response.json(f.price);assert.notEqual(options.method,'POST');return Response.json(f.coupon);};
 await setupOwnerPromotion(f.env);assert.equal(f.calls.length,2);assert.equal(f.calls[1].url,'https://api.stripe.com/v1/coupons/'+c.couponId);assert.equal(f.db.prepare('SELECT status FROM checkout_promotions').get().status,'ready');
});
