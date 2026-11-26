const repo='AImilesChen/paperadventure';
const commit='2f0569a4e0777114521bb351d4146596e219cd76';
const tag='rollback-before-halloween-occasion-v98-20261126';
const token=process.env.GH_TOKEN;
if(!token)throw Error('Checkpoint token unavailable');
async function gitApi(path,{optional=false,...options}={}){
  const response=await fetch('https://api.github.com/repos/'+repo+'/git/'+path,{...options,headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json','content-type':'application/json'}});
  if(optional&&response.status===404)return null;
  if(!response.ok)throw Error('Checkpoint request failed: HTTP '+response.status);
  return response.json();
}
const production=await gitApi('ref/heads/frontend-prd-v13-2026-10-08');
if(production.object.sha!==commit)throw Error('Production branch changed');
if(!await gitApi('ref/tags/'+tag,{optional:true}))await gitApi('refs',{method:'POST',body:JSON.stringify({ref:'refs/tags/'+tag,sha:commit})});
const checkpoint=await gitApi('ref/tags/'+tag);
if(checkpoint.object.type!=='commit'||checkpoint.object.sha!==commit)throw Error('Incorrect rollback tag');
console.log('Verified '+tag+' at '+commit);
