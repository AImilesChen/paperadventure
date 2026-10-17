// Renew the short-lived sign-in attempt while the page remains open. The
// browser still has to send the HttpOnly nonce and Google must verify it.
export function googleSignInController({api,initialize,render,redirect,onReady,onBusy,onError,now=Date.now,schedule=setTimeout,cancel=clearTimeout}){
  let active=null,timer=null,stopped=false,preparing=null,submitting=false;
  const fresh=()=>active&&now()<active.expiresAt-30000;
  const arm=()=>{cancel(timer);timer=schedule(()=>refreshIfStale(),Math.max(1000,(active?.expiresAt||now())-now()-30000));};
  async function prepare(){
    if(stopped)return;
    if(preparing)return preparing;
    preparing=(async()=>{
      onReady(false);
      try{
        const config=await api('/api/v1/auth/google/config');
        if(stopped)return;
        if(!config.available||!config.clientId||!config.nonce)throw Error('Google sign-in is not available yet.');
        active={...config,expiresAt:now()+Math.min(300,Number(config.expiresIn)||300)*1000};
        initialize({client_id:config.clientId,nonce:config.nonce,callback:result=>receive(result,config.nonce)});
        render();onReady(true);arm();
      }catch(error){if(!stopped){onReady(true);onError(error.message);}}
      finally{preparing=null;}
    })();
    return preparing;
  }
  async function refreshIfStale(){
    if(stopped)return;
    if(submitting){cancel(timer);timer=schedule(refreshIfStale,5000);return;}
    if(!fresh())return prepare();
  }
  async function receive(result,nonce){
    if(stopped||submitting||!result?.credential)return;
    if(!active||nonce!==active.nonce||now()>=active.expiresAt){
      await prepare();if(!stopped)onError('Your sign-in was refreshed. Please choose your Google account again.');return;
    }
    submitting=true;onBusy(true);onError('');
    try{
      await api('/api/v1/auth/google',{method:'POST',body:JSON.stringify({credential:result.credential})});
      if(!stopped){cancel(timer);redirect();}
    }catch(error){
      if(!stopped){
        if(error.code==='GOOGLE_LOGIN_EXPIRED'){
          await prepare();onError('Your sign-in was refreshed. Please choose your Google account again.');
        }else onError(error.message);
      }
    }finally{submitting=false;if(!stopped)onBusy(false);}
  }
  return {prepare,refreshIfStale,stop(){stopped=true;cancel(timer);active=null;}};
}
