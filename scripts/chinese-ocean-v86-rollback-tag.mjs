import assert from 'node:assert/strict';
const repo='AImilesChen/paperadventure',branch='frontend-prd-v13-2026-10-08';
const expected='c34d1c1d289a4576dc0d1fc9ca756770ac263733',tag='rollback-before-v86-20261121';
assert.equal(process.env.GITHUB_ACTIONS,'true');assert.ok(process.env.GH_TOKEN);
async function api(path,method='GET',body){
 const r=await fetch(`https://api.github.com/repos/${repo}/${path}`,{method,headers:{Authorization:`Bearer ${process.env.GH_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});return {status:r.status,data:await r.json()};
}
let r=await api(`git/ref/tags/${tag}`);
if(r.status===404&&process.argv.includes('--create')){
 const current=await api(`git/ref/heads/${branch}`);assert.equal(current.status,200);assert.equal(current.data.object.sha,expected,'Production branch changed; inspect before checkpoint.');
 r=await api('git/refs','POST',{ref:`refs/tags/${tag}`,sha:expected});assert.equal(r.status,201);r=await api(`git/ref/tags/${tag}`);
}
assert.equal(r.status,200);assert.equal(r.data.object.type,'commit');assert.equal(r.data.object.sha,expected);
console.log(`Verified refs/tags/${tag} -> ${expected}; retain all orders, English files and additive schema.`);
