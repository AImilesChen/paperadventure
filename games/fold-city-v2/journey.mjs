import {initialState,cloneState,stateKey,act,restoreHistory} from './model.mjs';
export function validPaperState(d,s,known){
 if(!s||!Array.isArray(s.tiles)||s.tiles.length!==3||!s.tiles.every(t=>t&&Number.isInteger(t.r)&&t.r>=0&&t.r<4&&typeof t.f==='boolean')||!Number.isInteger(s.clips)||s.clips<0||s.clips>3||typeof s.gate!=='boolean'||!d.landmarks.some(l=>l.id===s.at))return false;
 return known.has(stateKey(s));
}
export function freshJourney(d,base=initialState(d),origin='start',teamSize=4){return {base:cloneState(base),origin,teamSize,states:[cloneState(base)],actions:[]};}
export function journeyFile(d,j){return {game:d.id,schema:2,edition:2,base:cloneState(j.base),origin:j.origin,teamSize:j.teamSize,actions:j.actions};}
export function restoreJourney(d,raw,known,rescues){
 try{
  const v=typeof raw==='string'?JSON.parse(raw):raw;
  if(v?.schema===1){const old=restoreHistory(d,v);if(!old.valid)return null;return {...freshJourney(d),states:old.states,actions:old.actions};}
  if(v?.schema!==2||v.edition!==2||v.game!==d.id||![2,3,4].includes(v.teamSize)||!['start','paper','rescue'].includes(v.origin)||!validPaperState(d,v.base,known)||!Array.isArray(v.actions)||v.actions.length>5000)return null;
  if(v.origin==='start'&&stateKey(v.base)!==stateKey(initialState(d)))return null;
  if(v.origin==='rescue'&&!rescues.some(r=>stateKey(r.state)===stateKey(v.base)))return null;
  const j=freshJourney(d,v.base,v.origin,v.teamSize);
  for(const a of v.actions){j.states.push(act(d,j.states.at(-1),a));j.actions.push(a);}return j;
 }catch{return null;}
}
export function rescueFor(s,rescues){return rescues.find(r=>r.state.clips===s.clips&&r.state.gate===s.gate);}
export function jobRound(d,j){
 const visited=new Set(d.landmarks.filter(l=>l.operator!==undefined&&l.id===j.base.at).map(l=>l.id));let round=0;
 for(const a of j.actions){if(a.type==='collect')round++;if(a.type==='move'&&['CA','CB','CC'].includes(a.to)&&!visited.has(a.to)){visited.add(a.to);round++;}}return round;
}
export function jobOwners(d,size,round){return d.roles.groups[size].map(p=>(p+round)%size+1);}
