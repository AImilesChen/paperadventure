import test from 'node:test';
import assert from 'node:assert/strict';
import {stripeKeyMode,stripeRequest} from './payments.mjs';

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
