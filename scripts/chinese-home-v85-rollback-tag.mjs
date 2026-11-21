import assert from 'node:assert/strict';
const repo='AImilesChen/paperadventure',branch='frontend-prd-v13-2026-10-08';
const expected='a801fa8da808e950f22a3f6cfd115e789e63940d',tag='rollback-before-v85-20261121';
assert.equal(process.env.GITHUB_ACTIONS,'true');assert.ok(process.env.GH_TOKEN);
async function api(path,method='GET',body){
 const r=await fetch(`https://api.github.com/repos/${repo}/${path}`,{method,headers:{Authorization:`Bearer ${process.env.GH_TOKEN}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 return {status:r.status,data:await r.json()};
}
let result=await api(`git/ref/tags/${tag}`);
if(result.status===404&&process.argv.includes('--create')){
 const current=await api(`git/ref/heads/${branch}`);assert.equal(current.status,200);assert.equal(current.data.object.sha,expected,'Production source changed; inspect latest head before creating checkpoint.');
 result=await api('git/refs','POST',{ref:`refs/tags/${tag}`,sha:expected});assert.equal(result.status,201);
 result=await api(`git/ref/tags/${tag}`);
}
assert.equal(result.status,200);assert.equal(result.data.object.type,'commit');assert.equal(result.data.object.sha,expected);
console.log(`Verified refs/tags/${tag} -> ${expected}. Keep all user data; rollback only this release's scoped delta.`);
