import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {fresh,restore,checkAnswer,complete,solutions} from './model.mjs';
const d=JSON.parse(fs.readFileSync(new URL('./game.json',import.meta.url),'utf8'));
const permutations=a=>a.length?a.flatMap((v,i)=>permutations(a.filter((_,j)=>i!==j)).map(rest=>[v,...rest])):[[]];
test('three seating briefs have one joint solution and each brief is necessary',()=>{
 const maskByName=Object.fromEntries(d.guests.map(g=>[g.id,g.mask]));
 const rules=[a=>a[0]==='FOX',a=>(a.indexOf('OWL')-a.indexOf('FOX')+6)%6===1&&(a.indexOf('STAG')-a.indexOf('OWL')+6)%6===3,a=>(a.indexOf('CAT')-a.indexOf('HARE')+6)%6===1&&(a.indexOf('STAG')-a.indexOf('CAT')+6)%6===1];
 const all=permutations(d.guests.map(g=>g.id));
 assert.deepEqual(all.filter(a=>rules.every(r=>r(a.map(n=>maskByName[n])))),[d.seatSolution]);
 for(let omit=0;omit<3;omit++)assert.ok(all.filter(a=>rules.every((r,i)=>i===omit||r(a.map(n=>maskByName[n])))).length>1);
});
test('all opportunity pairs are ambiguous, triple uniquely identifies Iris',()=>{
 const sets=[d.opportunity.A.values.map(mask=>d.guests.find(g=>g.mask===mask).id),d.opportunity.B.values.map(seat=>d.seatSolution[seat-1]),d.opportunity.C.values];
 assert.deepEqual(sets[0].filter(n=>sets[1].includes(n)&&sets[2].includes(n)),['Iris']);
 for(const [i,j]of [[0,1],[0,2],[1,2]])assert.equal(sets[i].filter(n=>sets[j].includes(n)).length,2);
 assert.match(d.method,/ONE person/);assert.match(d.method,/without a handover/);assert.match(d.method,/identity/);
});
test('document checks and hiding place are independently solvable and unique',()=>{
 assert.deepEqual(d.documents.filter(n=>n.batch===d.documentRule.batch&&n.dots===d.documentRule.dots&&n.signature===true).map(n=>n.id),['N2']);
 assert.deepEqual(d.containers.filter(c=>Object.entries(d.target).every(([k,v])=>c[k]===v)).map(c=>c.id),['music']);
 for(const keys of [['symbol','lining'],['symbol','shelf'],['lining','shelf']])assert.equal(d.containers.filter(c=>keys.every(k=>c[k]===d.target[k])).length,2);
});
test('complete case requires every answer field and evidence attachment',()=>{
 let p=fresh();assert.equal(complete(p,4,solutions[4]),p);
 for(let stage=0;stage<6;stage++){assert.ok(checkAnswer(stage,solutions[stage]));for(const field of Object.keys(solutions[stage]))assert.equal(checkAnswer(stage,{...solutions[stage],[field]:'wrong'}),false,`${stage}/${field}`);p=complete(p,stage,solutions[stage],stage===3);}
 assert.deepEqual(p.completed,[0,1,2,3,4,5]);assert.deepEqual(p.assisted,[3]);assert.equal(complete(p,5,solutions[5]),p);
 assert.equal(checkAnswer(2,{...solutions[2],galleryPanel:' iris, OMAR '}),true);
});
test('saved progress is contiguous and never contains an active private view',()=>{
 for(const p of [null,'broken',{version:9,completed:[]},{version:1,completed:[0,2]}])assert.deepEqual(restore(p),fresh());
 const p=restore({version:1,completed:[0],assisted:[0,0,8],hints:[8,-2],privateRole:'C',privateCard:'C6'});assert.deepEqual(p.assisted,[0]);assert.deepEqual(p.hints,[3,0,0,0,0,0]);assert.equal(p.privateRole,undefined);assert.equal(p.privateCard,undefined);
});
test('18 unique private cards cover exactly three readers and six rounds',()=>{
 const cards=Object.values(d.cards).flat();assert.equal(cards.length,18);assert.equal(new Set(cards.map(c=>c.id)).size,18);
 for(const role of 'ABC')assert.deepEqual(d.cards[role].map(c=>c.round),[1,2,3,4,5,6]);
 assert.equal(fs.existsSync(new URL('../../public/assets/midnight-masquerade',import.meta.url)),false);
});

