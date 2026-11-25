// Run only in the release checkpoint job. No application data is changed.
const owner='AImilesChen',repo='paperadventure';
const expected='fe2c15e6bddfb3b51a220213521e995ec8d08530';
const tag='rollback-before-search-images-v97-20261125';
const token=process.env.GH_TOKEN;
if(!token)throw Error('Checkpoint token unavailable');
async function api(path,options={}){
 const r=await fetch(`https://api.github.com/repos/${owner}/${repo}/${path}`,{...options,headers:{authorization:`Bearer ${token}`,accept:'application/vnd.github+json','content-type':'application/json','x-github-api-version':'2022-11-28'}});
 if(r.status===404&&options.optional)return null;
 if(!r.ok)throw Error(`Checkpoint request failed: HTTP ${r.status}`);
 return r.json();
}
const branch=await api('git/ref/heads/frontend-prd-v13-2026-10-08');
if(branch.object.sha!==expected)throw Error('Production source changed; inspect it before selecting a rollback point');
let ref=await api('git/ref/tags/'+tag,{optional:true});
if(!ref)ref=await api('git/refs',{method:'POST',body:JSON.stringify({ref:'refs/tags/'+tag,sha:expected})});
const verified=await api('git/ref/tags/'+tag);
if(verified.object.type!=='commit'||verified.object.sha!==expected)throw Error('Rollback tag does not match the reviewed production source');
console.log(`Verified ${tag} -> ${expected}`);
