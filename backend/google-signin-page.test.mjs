import test from 'node:test';
import assert from 'node:assert/strict';
import {googleSignInController} from '../src/googleSignIn.mjs';

function setup({expired=false,sameNonce=false}={}){
  let time=0,callback,configCalls=0,posts=0,redirects=0,lastError='',timer;
  const controller=googleSignInController({
    now:()=>time,schedule:fn=>(timer=fn,1),cancel:()=>{},
    api:async(path)=>{
      if(path.endsWith('/config')){configCalls++;return {available:true,clientId:'fixture',nonce:sameNonce?'same':String(configCalls),expiresIn:300};}
      posts++;if(expired)throw Object.assign(Error('Sign-in expired. Please try again.'),{code:'GOOGLE_LOGIN_EXPIRED'});
      return {authenticated:true};
    },initialize:options=>{callback=options.callback;},render:()=>{},redirect:()=>redirects++,onReady:()=>{},onBusy:()=>{},onError:value=>{lastError=value;},
  });
  return {controller,setTime:n=>time=n,submit:()=>callback({credential:'fixture'}),get:()=>({configCalls,posts,redirects,lastError}),timer:()=>timer()};
}
test('a long-open account page refreshes its nonce before the five-minute expiry',async()=>{
  const t=setup();await t.controller.prepare();t.setTime(270001);await t.timer();
  assert.equal(t.get().configCalls,2);await t.submit();assert.equal(t.get().redirects,1);t.controller.stop();
});
test('returning after the browser was suspended renews configuration without submitting an expired credential',async()=>{
  const t=setup();await t.controller.prepare();t.setTime(600000);await t.submit();
  assert.deepEqual(t.get(),{configCalls:2,posts:0,redirects:0,lastError:'Your sign-in was refreshed. Please choose your Google account again.'});t.controller.stop();
});
test('a missing nonce automatically prepares a fresh sign-in and does not loop credential posts',async()=>{
  const t=setup({expired:true});await t.controller.prepare();await t.submit();
  assert.equal(t.get().posts,1);assert.equal(t.get().configCalls,2);assert.equal(t.get().redirects,0);assert.match(t.get().lastError,/was refreshed/);t.controller.stop();
});
test('focus does not repeatedly fetch a fresh attempt and an unmounted page does not redirect',async()=>{
  const t=setup();await t.controller.prepare();await t.controller.refreshIfStale();assert.equal(t.get().configCalls,1);
  t.controller.stop();await t.submit();assert.equal(t.get().posts,0);
});
