// Pure spatial rules. DATA is supplied to every public entry point.
export const DIRS=[[0,-1,1,4],[1,0,2,8],[0,1,4,1],[-1,0,8,2]];
const CACHE=new WeakMap();
function memo(d){if(!CACHE.has(d))CACHE.set(d,{world:new Map(),paths:new Map(),actions:new Map()});return CACHE.get(d);}
const worldKey=s=>s.tiles.map(t=>t.r+4*Number(t.f)).join('')+':'+Number(s.gate);
export const rotatePoint=(x,y,r)=>{for(let i=0;i<r;i++)[x,y]=[3-y,x];return [x,y];};
export const rotateMask=(m,r)=>{for(let i=0;i<r;i++)m=((m<<1)&15)|(m>>3);return m;};
export function initialState(d){return {tiles:d.initial.map(t=>({...t})),at:'H',clips:0,gate:false};}
export const cloneState=s=>({tiles:s.tiles.map(t=>({...t})),at:s.at,clips:s.clips,gate:s.gate});
export const stateKey=s=>s.tiles.map(t=>t.r+4*Number(t.f)).join('')+':'+s.at+':'+s.clips+':'+Number(s.gate);
export function visibleMap(d,s){
 const cells=d.base.map((row,y)=>row.map((mask,x)=>({x,y,mask,layer:'base',tile:null,local:null})));
 for(let k=0;k<3;k++){
  const tile=d.tiles[k],t=s.tiles[k],[ox,oy]=tile.origin;
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){
   if(t.f&&x===0)continue;
   const [rx,ry]=rotatePoint(x,y,t.r),mask=t.f&&x===1?tile.fold[y]:tile.front[y][x];
   cells[oy+ry][ox+rx]={x:ox+rx,y:oy+ry,mask:rotateMask(mask,t.r),layer:t.f&&x===1?'reverse':'front',tile:tile.id,local:[x,y]};
  }
 }
 return cells;
}
export function landmarkPosition(d,s,id){
 const l=d.landmarks.find(l=>l.id===id);if(!l)return null;
 if(l.tile===undefined)return l.pos;
 const [x,y]=rotatePoint(...l.local,s.tiles[l.tile].r),[ox,oy]=d.tiles[l.tile].origin;return [x+ox,y+oy];
}
export function availableLandmarks(d,s,cells=visibleMap(d,s)){
 return d.landmarks.filter(l=>{
  if(l.id==='E')return true;
  const [x,y]=landmarkPosition(d,s,l.id),cell=cells[y]?.[x];
  return cell?.mask&&(l.layer!=='base'||cell.layer==='base');
 });
}
export function connections(d,s,cells=visibleMap(d,s)){
 const graph=new Map();
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  const a=y*8+x,edges=[];
  for(const [dx,dy,bit,opposite]of DIRS){const nx=x+dx,ny=y+dy;
   if(nx>=0&&nx<8&&ny>=0&&ny<8&&(cells[y][x].mask&bit)&&(cells[ny][nx].mask&opposite)){
    if(!s.gate&&d.gateEdge.some(([u,v])=>(u===a&&v===ny*8+nx)||(v===a&&u===ny*8+nx)))continue;
    edges.push(ny*8+nx);
   }
  }
  graph.set(a,edges);
 }
 // Outside page: a real edge extension from the gate corridor, not a teleport.
 const from=d.exitCell[1]*8+d.exitCell[0];graph.set(64,[]);
 if(cells[d.exitCell[1]][d.exitCell[0]].mask&2){graph.get(from).push(64);graph.get(64).push(from);}
 return graph;
}
export function cellPath(d,s,to){
 const key=worldKey(s)+':'+s.at+':'+to,cache=memo(d).paths;if(cache.has(key))return cache.get(key);
 const wk=worldKey(s),worlds=memo(d).world;let world=worlds.get(wk);
 if(!world){const cells=visibleMap(d,s);world={cells,visible:availableLandmarks(d,s,cells),graph:connections(d,s,cells),trees:new Map()};worlds.set(wk,world);}
 const {cells,visible,graph}=world;
 if(!visible.some(l=>l.id===s.at)||!visible.some(l=>l.id===to))return null;
 const idx=id=>id==='E'?64:(()=>{const [x,y]=landmarkPosition(d,s,id);return y*8+x;})();
 const start=idx(s.at),target=idx(to);let prev=world.trees.get(start);
 if(!prev){const queue=[start];prev=new Map([[start,null]]);for(let i=0;i<queue.length;i++)for(const v of graph.get(queue[i])||[])if(!prev.has(v)){prev.set(v,queue[i]);queue.push(v);}world.trees.set(start,prev);}
 if(!prev.has(target)){cache.set(key,null);return null;}
 const path=[];for(let v=target;v!==null;v=prev.get(v))path.unshift(v);cache.set(key,path);return path;
}
export function legalActions(d,s){
 const key=stateKey(s),cache=memo(d).actions;if(cache.has(key))return cache.get(key);
 if(s.at==='E')return [];
 const actions=availableLandmarks(d,s).filter(l=>l.id!==s.at&&cellPath(d,s,l.id)).map(l=>({type:'move',to:l.id}));
 const operator=d.landmarks.find(l=>l.id===s.at)?.operator;
 if(operator!==undefined){actions.push({type:'rotate',tile:operator},{type:'fold',tile:operator});}
 if(s.at==='G'&&!(s.clips&1))actions.push({type:'collect',item:1});
 if(s.at==='W'&&!(s.clips&2))actions.push({type:'collect',item:2});
 if(s.at==='M'&&s.clips===3&&!s.gate)actions.push({type:'install'});
 cache.set(key,actions);return actions;
}
export function act(d,s,a){
 if(!s||!a||!legalActions(d,s).some(v=>Object.keys(v).length===Object.keys(a).length&&Object.keys(v).every(k=>Object.hasOwn(a,k)&&a[k]===v[k])))throw Error('That action is not possible from this stop.');
 const n=cloneState(s);
 if(a.type==='move')n.at=a.to;
 if(a.type==='rotate')n.tiles[a.tile].r=(n.tiles[a.tile].r+1)%4;
 if(a.type==='fold')n.tiles[a.tile].f=!n.tiles[a.tile].f;
 if(a.type==='collect')n.clips|=a.item;
 if(a.type==='install')n.gate=true;
 return n;
}
export function actionText(d,s,a){
 if(a.type==='move')return 'Walk to '+d.landmarks.find(l=>l.id===a.to).name+' ['+a.to+']';
 if(a.type==='rotate')return 'Turn '+d.tiles[a.tile].id+' clockwise a quarter-turn';
 if(a.type==='fold')return (s.tiles[a.tile].f?'Open ':'Fold ')+d.tiles[a.tile].id+(s.tiles[a.tile].f?' flat':' left flap inward');
 if(a.type==='collect')return 'Take the '+(a.item===1?'leaf':'spool')+' return clasp';
 return 'Fit both return clasps to the city gate';
}
export function restoreHistory(d,raw){
 const start=initialState(d);try{
  const value=typeof raw==='string'?JSON.parse(raw):raw;
  if(value?.schema!==1||value.game!==d.id||!Array.isArray(value.actions)||value.actions.length>5000)return {states:[start],actions:[],valid:false};
  const states=[start],actions=[];for(const a of value.actions){states.push(act(d,states.at(-1),a));actions.push(a);}return {states,actions,valid:true};
 }catch{return {states:[start],actions:[],valid:false};}
}
