import {initialState,stateKey,legalActions,act} from './model.mjs';
export function solve(d,{start=initialState(d),ban=()=>false,goal=s=>s.at==='E',max=250000}={}){
 const queue=[start],parents=[-1],moves=[null],seen=new Set([stateKey(start)]);
 for(let i=0;i<queue.length;i++){
  const s=queue[i];if(goal(s)){
   const steps=[];for(let j=i;parents[j]>=0;j=parents[j])steps.unshift(moves[j]);
   return {actions:steps,visited:seen.size,states:queue.slice(0,i+1)};
  }
  for(const a of legalActions(d,s)){if(ban(s,a))continue;const n=act(d,s,a),key=stateKey(n);if(seen.has(key))continue;seen.add(key);queue.push(n);parents.push(i);moves.push(a);}
  if(queue.length>max)throw Error('Solver state limit exceeded');
 }
 return null;
}
export function explore(d){
 const queue=[initialState(d)],seen=new Set([stateKey(queue[0])]),edges=[];
 for(let i=0;i<queue.length;i++){
  const row=[];for(const a of legalActions(d,queue[i])){const n=act(d,queue[i],a),key=stateKey(n);row.push(key);if(!seen.has(key)){seen.add(key);queue.push(n);}}
  edges.push(row);
 }
 return {states:queue,edges};
}
