import test from 'node:test';
import assert from 'node:assert/strict';
import {stripeKeyMode,stripeRequest,checkoutForm,validatePaidSession,verifyFixedPrice,paymentEnvironment} from './payments.mjs';

test('standard and restricted keys share their environment while client and unknown keys stay unsupported',()=>{
  for(const type of ['sk','rk'])for(const mode of ['test','live'])assert.equal(stripeKeyMode(`${type}_${mode}_fixture`),mode);
  for(const key of [undefined,null,123,{},'','pk_live_fixture','pk_test_fixture','rk_unknown_fixture','sk_org_fixture','prefix_rk_live_fixture'])assert.equal(stripeKeyMode(key),null);
});

test('restricted API authentication is sent unchanged and errors reveal no credential',async()=>{
  for(const mode of ['test','live']){
    const key=`rk_${mode}_fixture`;
    const result=await stripeRequest({STRIPE_SECRET_KEY:key},'checkout/sessions',{},async(url,init)=>{
      assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');
      assert.equal(init.headers.authorization,`Bearer ${key}`);
      return Response.json({id:'cs_fixture'});
    });
    assert.equal(result.id,'cs_fixture');
    await assert.rejects(stripeRequest({STRIPE_SECRET_KEY:key},'charges/ch_fixture',{},async()=>Response.json({error:{message:`Missing permission for ${key}`}},{status:403})),error=>{
      assert.equal(error.code,'PAYMENT_PROVIDER_ERROR');
      assert.ok(!error.message.includes(key));
      return true;
    });
  }
});


test('inclusive paid sessions reject any surcharge and preserve legacy exclusive orders',()=>{
  const order={id:'order',stripe_checkout_session_id:'cs',purchase_spec_sha256:'hash'};
  const session={id:'cs',client_reference_id:'order',metadata:{order_id:'order',spec_hash:'hash'},payment_status:'paid',currency:'usd',amount_subtotal:1499,amount_total:1499};
  const price={unit_amount:1499,tax_behavior:'inclusive'};
  assert.equal(validatePaidSession(session,order,price),true);
  for(const amount_total of [1500,1498,null,1499.5])assert.equal(validatePaidSession({...session,amount_total},order,price),false);
  assert.equal(validatePaidSession({...session,amount_total:1600},order,{...price,tax_behavior:'exclusive'}),true);
  const form=checkoutForm({orderId:'order',inlinePrice:{unitAmount:1499,name:'test'},automaticTax:false});
  assert.equal(form.get('line_items[0][price_data][tax_behavior]'),null);
  assert.equal(form.get('automatic_tax[enabled]'),'false');
});

test('live fixed prices verify identity and amount without calling Tax settings',async()=>{
  const price={stripe_price_id:'price_fixture',unit_amount:1499};
  const actual={id:'price_fixture',unit_amount:1499,currency:'usd',active:true,livemode:true,type:'one_time'};
  const verify=(patch={})=>verifyFixedPrice({STRIPE_SECRET_KEY:'rk_live_fixture'},price,async url=>{
    assert.equal(url,'https://api.stripe.com/v1/prices/price_fixture');return Response.json({...actual,...patch});
  });
  for(const tax_behavior of ['inclusive','exclusive','unspecified',null])await verify({tax_behavior});
  for(const patch of [{unit_amount:1999},{active:false},{livemode:false},{currency:'eur'},{type:'recurring'},{id:'other'}])await assert.rejects(verify(patch),{code:'OFFER_NOT_READY'});
});

test('new fixed-total snapshots reject both surcharges and discounts regardless of tax behavior',()=>{
  const order={id:'order',stripe_checkout_session_id:'cs',purchase_spec_sha256:'hash',purchase_spec_json:JSON.stringify({checkoutPricing:'fixed_total_v1'})};
  const session={id:'cs',client_reference_id:'order',metadata:{order_id:'order',spec_hash:'hash'},payment_status:'paid',currency:'usd',amount_subtotal:1499,amount_total:1499};
  for(const tax_behavior of ['exclusive','unknown','inclusive']){
    const price={unit_amount:1499,tax_behavior};
    assert.equal(validatePaidSession(session,order,price),true);
    for(const amount_total of [1500,1498])assert.equal(validatePaidSession({...session,amount_total},order,price),false);
  }
  const form=checkoutForm({orderId:'order',priceId:'price_fixture',automaticTax:true});
  assert.equal(form.get('automatic_tax[enabled]'),'false');
  assert.equal(form.get('allow_promotion_codes'),'false');
  assert.equal(form.get('line_items[0][tax_rates][0]'),null);
});


test('staged live selection is explicit, fail-closed and preserves the original secrets',()=>{
  const env={STRIPE_SECRET_KEY:'rk_test_old',STRIPE_WEBHOOK_SECRET:'whsec_old',STRIPE_LIVE_SECRET_KEY:'rk_live_ready',STRIPE_LIVE_WEBHOOK_SECRET:'whsec_ready'};
  assert.equal(paymentEnvironment(env),env);
  const selected=paymentEnvironment({...env,PAYMENT_CREDENTIAL_SOURCE:'staged_live'});
  assert.equal(selected.STRIPE_SECRET_KEY,'rk_live_ready');assert.equal(selected.STRIPE_WEBHOOK_SECRET,'whsec_ready');
  assert.equal(env.STRIPE_SECRET_KEY,'rk_test_old');assert.equal(env.STRIPE_WEBHOOK_SECRET,'whsec_old');
  for(const key of [undefined,'rk_test_wrong','pk_live_wrong'])assert.equal(paymentEnvironment({...env,PAYMENT_CREDENTIAL_SOURCE:'staged_live',STRIPE_LIVE_SECRET_KEY:key}).STRIPE_SECRET_KEY,undefined);
  assert.equal(paymentEnvironment({...env,PAYMENT_CREDENTIAL_SOURCE:'staged_live',STRIPE_LIVE_WEBHOOK_SECRET:undefined}).STRIPE_WEBHOOK_SECRET,undefined);
});


test('only the approved immutable promotion snapshot permits a discounted live total',()=>{
 const p={id:'owner-live-check-20261025',couponId:'paw-owner-live-check-899-20261025',subtotal:999,discount:899,total:100,currency:'USD'};
 const spec={checkoutPricing:'fixed_discount_v1',paymentMode:'live',promotion:p};
 const order={id:'order',sku:'ready_home',product_kind:'ready',amount_total:100,stripe_checkout_session_id:'cs',purchase_spec_sha256:'hash',purchase_spec_json:JSON.stringify(spec)};
 const price={unit_amount:999},session={id:'cs',livemode:true,client_reference_id:'order',metadata:{order_id:'order',spec_hash:'hash'},payment_status:'paid',currency:'usd',amount_subtotal:999,amount_total:100,total_details:{amount_discount:899,amount_tax:0,amount_shipping:0}};
 assert.equal(validatePaidSession(session,order,price),true);
 for(const patch of [{id:'other'},{couponId:'other'},{subtotal:1000},{discount:900},{total:99},{currency:'EUR'}])assert.equal(validatePaidSession(session,{...order,purchase_spec_json:JSON.stringify({...spec,promotion:{...p,...patch}})},price),false);
 for(const patch of [{sku:'custom_home'},{product_kind:'custom'},{amount_total:999}])assert.equal(validatePaidSession(session,{...order,...patch},price),false);
 for(const patch of [{amount_total:999},{amount_total:99},{amount_subtotal:100},{livemode:false},{currency:'eur'},{total_details:{amount_discount:899,amount_tax:0,amount_shipping:1}}])assert.equal(validatePaidSession({...session,...patch},order,price),false);
 assert.equal(validatePaidSession(session,{...order,purchase_spec_json:JSON.stringify({checkoutPricing:'fixed_total_v1'})},price),false);
});
