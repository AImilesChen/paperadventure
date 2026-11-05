import fs from 'node:fs';import assert from 'node:assert/strict';
import {initialState,stateKey,legalActions,act,actionText,cellPath,landmarkPosition,visibleMap} from './model.mjs';
import {solve,explore} from './solver.mjs';
const d=JSON.parse(fs.readFileSync(new URL('./game.json',import.meta.url))),ex=explore(d),lookup=new Map(ex.states.map((s,i)=>[stateKey(s),i])),reverse=ex.states.map(()=>[]);
ex.edges.forEach((es,i)=>es.forEach(k=>reverse[lookup.get(k)].push(i)));
const goals=ex.states.map((s,i)=>s.at==='E'?i:-1).filter(i=>i>=0),queue=[...goals],distance=new Map(goals.map(i=>[i,0]));
for(let p=0;p<queue.length;p++)for(const i of reverse[queue[p]])if(!distance.has(i)){distance.set(i,distance.get(queue[p])+1);queue.push(i);}
assert.equal(distance.size,ex.states.length,'Reachable state cannot finish');
const policy={};for(let i=0;i<ex.states.length;i++)if(ex.states[i].at!=='E'){
 const s=ex.states[i],a=legalActions(d,s).find(a=>distance.get(lookup.get(stateKey(act(d,s,a))))===distance.get(i)-1);assert.ok(a);policy[stateKey(s)]=a;
}
const routes={};for(const [name,ban]of Object.entries({gardenFirst:(s,a)=>a.type==='collect'&&a.item===2&&!(s.clips&1),binderyFirst:(s,a)=>a.type==='collect'&&a.item===1&&!(s.clips&2)})){
 const sol=solve(d,{ban});assert.ok(sol);let s=initialState(d);routes[name]=sol.actions.map((a,i)=>{const before=s,text=actionText(d,s,a);s=act(d,s,a);return {step:i+1,action:a,text,before,after:s,path:a.type==='move'?cellPath(d,before,a.to):null};});assert.equal(s.at,'E');
}
const forbidden={allFolds:(_,a)=>a.type==='fold',allTurns:(_,a)=>a.type==='rotate',gardenFold:(_,a)=>a.type==='fold'&&a.tile===0,binderyFold:(_,a)=>a.type==='fold'&&a.tile===1,gateFold:(_,a)=>a.type==='fold'&&a.tile===2};
const necessity={};for(const [key,ban]of Object.entries(forbidden)){necessity[key]=solve(d,{ban})===null;assert.ok(necessity[key],key+' is cosmetic');}
for(const s of ex.states){
 const map=visibleMap(d,s);for(const l of d.landmarks.filter(l=>l.operator!==undefined)){const [x,y]=landmarkPosition(d,s,l.id);assert.equal(map[y][x].layer,'front');}
 if(s.at==='E')assert.equal(s.clips,3);
}
const report={status:'passed',reachableStates:ex.states.length,allReachableStatesCanFinish:distance.size===ex.states.length,goalStates:goals.length,shortestActions:distance.get(0),bothCollectionOrders:true,necessity,routes};
fs.writeFileSync(new URL('./policy.json',import.meta.url),JSON.stringify(policy)+'\n');fs.writeFileSync(new URL('./solutions.json',import.meta.url),JSON.stringify(routes,null,2)+'\n');
fs.writeFileSync(new URL('./reachable.json',import.meta.url),JSON.stringify(ex.states.map(stateKey))+'\n');
const rescues=[{id:'start',label:'No clasps',state:initialState(d)},{id:'leaf',label:'Leaf carried',state:routes.gardenFirst[10].after},{id:'spool',label:'Spool carried',state:routes.binderyFirst[12].after},{id:'both',label:'Both carried',state:routes.gardenFirst[20].after},{id:'installed',label:'Both installed',state:routes.gardenFirst[26].after}];
for(const r of rescues)assert.ok(lookup.has(stateKey(r.state)));
fs.writeFileSync(new URL('./rescues.json',import.meta.url),JSON.stringify(rescues,null,2)+'\n');
fs.mkdirSync('tmp/fold-city-v2-qa',{recursive:true});fs.writeFileSync('tmp/fold-city-v2-qa/model-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,routes:Object.fromEntries(Object.entries(routes).map(([k,v])=>[k,v.length]))},null,2));
