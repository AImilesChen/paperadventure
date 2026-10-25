import test from 'node:test';
import assert from 'node:assert/strict';
import {runLivePricePreflight,livePrices} from './live-payment-release.mjs';

test('release preflight only reads the four agreed live Prices, saves no secret and never buys',async()=>{
 for(const fail of [false,true]){
  let row,calls=0;
  const env={PAYMENT_RELEASE_PREFLIGHT:'release-test-v1',STRIPE_LIVE_SECRET_KEY:'rk_live_fixture',STRIPE_LIVE_WEBHOOK_SECRET:'whsec_fixture',
   DB:{prepare(sql){return {bind(...args){return {first:async()=>row?{id:row[0]}:null,run:async()=>{row=args;}}}}}},
   FETCH:async(url,init)=>{
    calls++;assert.equal(init.method,undefined);const p=livePrices.find(x=>url==='https://api.stripe.com/v1/prices/'+x.stripe_price_id);assert.ok(p);
    return Response.json({id:p.stripe_price_id,active:!fail,livemode:true,type:'one_time',currency:'usd',unit_amount:p.unit_amount});
   }};
  assert.equal(await runLivePricePreflight(env),true);assert.equal(row[3],fail?'live_price_mismatch':'live_prices_verified');
  assert.equal(calls,fail?1:4);assert.ok(!JSON.stringify(row).includes('rk_live_fixture'));const before=calls;
  await runLivePricePreflight(env);assert.equal(calls,before);
 }
 assert.equal(await runLivePricePreflight({}),false);
});
