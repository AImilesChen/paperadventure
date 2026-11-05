import {initialState,landmarkPosition,availableLandmarks,visibleMap} from './model.mjs';
const INK='#23464d',ROAD='#31575c',PAPER='#fcf8ec',GOLD='#b66a34';
const rect=(x,y,w,h,fill,stroke='none',sw=1,extra={})=>({t:'rect',x,y,w,h,fill,stroke,sw,...extra});
const line=(x1,y1,x2,y2,stroke=INK,sw=2,extra={})=>({t:'line',x1,y1,x2,y2,stroke,sw,...extra});
const circle=(x,y,r,fill,stroke='none',sw=1,extra={})=>({t:'circle',x,y,r,fill,stroke,sw,...extra});
const txt=(x,y,text,size=20,fill=INK,anchor='start',extra={})=>({t:'text',x,y,text,size,fill,anchor,...extra});
const poly=(points,fill,stroke='none',sw=1)=>({t:'poly',points,fill,stroke,sw});
function roads(matrix,ox=0,oy=0){const outline=[],core=[],dots=[];
 for(let y=0;y<matrix.length;y++)for(let x=0;x<matrix[y].length;x++){
  const m=matrix[y][x],cx=ox+x*100+50,cy=oy+y*100+50;
  for(const [b,dx,dy]of [[1,0,-50],[2,50,0],[4,0,50],[8,-50,0]])if(m&b){outline.push(line(cx,cy,cx+dx,cy+dy,'#fffdf6',48,{cap:'butt'}));core.push(line(cx,cy,cx+dx,cy+dy,ROAD,30,{cap:'butt'}));}
  if(m)dots.push(circle(cx,cy,15,ROAD));
 }
 return [...outline,...core,...dots];
}
function building(x,y,i){const p=[];const colors=['#d4a078','#b8cbb5','#b6cbd1'];
 p.push(rect(x+5,y+10,21,24,colors[i%3],INK,.8),poly([[x+2,y+10],[x+15,y+2],[x+29,y+10]],'#9d6c54',INK,.8),rect(x+12,y+18,6,8,PAPER));return p;
}
function landmark(l,x,y,{active=false,actor=false,collected=false}={}){
 const p=[],tag={tag:l.id};
 if(actor){p.push(circle(x,y,43,'none','#bd6c30',7));}
 p.push(circle(x,y,30,l.operator!==undefined?INK:'#fffdf5',INK,3,tag));
 p.push(txt(x,y+9,l.id,26,l.operator!==undefined?'#fffdf5':INK,'middle',{weight:'bold',...tag}));
 if(l.operator!==undefined)p.push(poly([[x,y-27],[x-6,y-17],[x+6,y-17]],'#fffdf5'));
 if(collected)p.push(circle(x+24,y-25,9,'#a6bc8d',INK,2));
 return p;
}
function card(d,k,fold=false){const t=d.tiles[k],fill=['#e6eddc','#e8ded2','#dce9e8'][k],p=[];
 p.push(rect(fold?100:0,0,fold?300:400,400,fill,INK,2));
 const m=t.front.map((row,y)=>row.map((v,x)=>fold?(x===0?0:x===1?t.fold[y]:v):v));
 if(fold)p.push(rect(100,0,100,400,'#f4dcb8'));
 for(let y=0;y<4;y++)for(let x=fold?1:0;x<4;x++){
  p.push(rect(x*100+2,y*100+2,96,96,'none','#bac5b8',.8));
  if(!(fold&&x===1))p.push(...building(x*100,y*100,x+y+k));
 }
 p.push(...roads(m));
 p.push(line(100,4,100,396,'#ac592e',2,{dash:'6 5'}));
 p.push(rect(fold?107:5,4,28,30,PAPER),txt(fold?121:19,29,t.id,18,INK,'middle',{weight:'bold'}));
 p.push(txt(fold?150:80,18,'TOP',10,INK,'middle'),line(fold?150:80,30,fold?150:80,23,INK,1.5));
 p.push(fold?poly([[182,6],[194,6],[194,18]],INK):poly([[6,6],[14,6],[6,14]],INK));
 for(const l of d.landmarks.filter(l=>l.tile===k))p.push(...landmark(l,l.local[0]*100+50,l.local[1]*100+50));
 return p;
}
export function frontArt(d,k){return {w:400,h:400,ops:card(d,k,false)};}
export function backArt(d,k){const t=d.tiles[k],p=[rect(0,0,400,400,PAPER,INK,2),rect(300,0,100,400,'#f4dcb8')],matrix=Array.from({length:4},(_,y)=>[0,0,0,t.fold[y]]);
 p.push(...roads(matrix),line(300,4,300,396,'#ac592e',2,{dash:'6 5'}),txt(24,48,t.id+' BACK',30,INK,'start',{weight:'bold'}));
 p.push(txt(24,80,'TOP EDGE',18),line(160,63,160,33,INK,3),poly([[160,26],[151,40],[169,40]],INK));
 p.push(txt(24,140,'Glue blank sides together.',17),txt(24,168,'Match the TOP edges.',17),txt(24,222,'This right strip is the',17),txt(24,248,'road behind the front',17),txt(24,274,'LEFT flap.',17));
 p.push(rect(307,4,28,30,PAPER),txt(321,29,t.id,18,INK,'middle',{weight:'bold'}));
 p.push(txt(350,18,'TOP',10,INK,'middle'),line(350,30,350,23,INK,1.5));
 // Asymmetric registration: front triangle is top-left; reverse triangle top-right.
 p.push(poly([[382,6],[394,6],[394,18]],INK),circle(12,12,3,INK),circle(22,12,3,INK));
 return {w:400,h:400,ops:p};
}
export function baseArt(d,{gate=false}={}){const p=[rect(0,0,800,800,'#f5efdd',INK,2)];
 for(let y=0;y<8;y++)for(let x=0;x<8;x++)p.push(rect(x*100+2,y*100+2,96,96,'none','#c5cbbb',1));
 p.push(...roads(d.base));
 for(let k=0;k<3;k++){const [ox,oy]=d.tiles[k].origin;p.push(rect(ox*100,oy*100,400,400,'none','#67848a',3,{dash:'10 7'}),txt(ox*100+200,oy*100+230,'PLACE '+d.tiles[k].id,29,'#66776b','middle'));}
 for(const l of d.landmarks.filter(l=>l.tile===undefined&&l.id!=='E')){const [x,y]=l.pos;p.push(...landmark(l,x*100+50,y*100+50));}
 p.push(line(800,450,822,450,ROAD,30),...landmark(d.landmarks.find(l=>l.id==='E'),820,450));
 p.push(txt(580,792,'D / FIXED SQUARE',18),poly([[700,665],[718,680],[700,695],[682,680]],'#a7bead',INK,2),circle(700,680,9,'#f3c287'));
 if(!gate)p.push(rect(689,417,22,66,'#ad603f',INK,2),line(696,425,696,475,'#fff8e9',3),line(704,425,704,475,'#fff8e9',3));
 return {w:860,h:800,ops:p};
}
export function boardArt(d,s=initialState(d),{trace=null,actor=true}={}){
 const p=baseArt(d,{gate:s.gate}).ops;
 // Base landmark labels are covered naturally by the opaque physical cards.
 for(let k=0;k<3;k++)p.push({t:'group',translate:d.tiles[k].origin.map(v=>v*100),rotate:[s.tiles[k].r*90,200,200],ops:card(d,k,s.tiles[k].f)});
 // Repaint only exposed base labels. Other base labels remain underneath cards.
 for(const l of availableLandmarks(d,s).filter(l=>l.tile===undefined&&l.id!=='E')){const [x,y]=landmarkPosition(d,s,l.id);p.push(...landmark(l,x*100+50,y*100+50,{collected:l.id==='W'&&Boolean(s.clips&2)}));}
 const gateX=700;
 if(!s.gate)p.push(rect(gateX-11,417,22,66,'#ad603f',INK,2),line(gateX-4,425,gateX-4,475,'#fff8e9',3),line(gateX+4,425,gateX+4,475,'#fff8e9',3));
 if(trace?.length){const point=n=>n===64?[820,450]:[(n%8)*100+50,Math.floor(n/8)*100+50];for(let i=1;i<trace.length;i++)p.push(line(...point(trace[i-1]),...point(trace[i]),'#c36d2d',9,{dash:'12 9'}));}
 if(actor){const l=d.landmarks.find(l=>l.id===s.at),pos=s.at==='E'?[820,450]:landmarkPosition(d,s,s.at).map(v=>v*100+50);p.push(...landmark(l,...pos,{actor:true,collected:s.at==='G'&&Boolean(s.clips&1)}));}
 return {w:860,h:800,ops:p};
}
export function coverArt(){const p=[rect(0,0,900,360,'#e0ebe7')];
 p.push(poly([[70,270],[420,190],[820,270],[470,345]],'#b3c4b3',INK,4),poly([[70,270],[70,290],[470,358],[470,345]],PAPER,INK,3),poly([[470,345],[820,270],[820,288],[470,358]],'#d7c4a5',INK,3));
 p.push(poly([[100,225],[330,110],[440,195],[220,285]],'#f1ddbb',INK,3),poly([[330,110],[355,52],[580,144],[440,195]],'#eef2de',INK,3),poly([[440,195],[580,144],[790,230],[600,294]],'#bcd4d5',INK,3));
 for(const [x,y,c]of [[190,150,'#bf8862'],[360,82,'#9cbcb0'],[514,145,'#e1bb7d'],[620,204,'#aac7cd']]){
  p.push(rect(x,y,64,71,c,INK,3),poly([[x-6,y],[x+32,y-27],[x+70,y]],'#526f72',INK,3),rect(x+15,y+17,12,17,PAPER,INK,2),rect(x+38,y+17,12,17,PAPER,INK,2),rect(x+25,y+46,16,25,PAPER,INK,2));
 }
 p.push(line(230,270,430,215,PAPER,12),line(430,215,610,270,PAPER,12),circle(430,215,12,'#b66a34',INK,2));
 p.push(circle(745,82,28,'#f2d69d'),line(104,72,160,72,'#789c99',4),line(130,48,130,96,'#789c99',4));
 return {w:900,h:360,ops:p};
}
const placed=(ops,x,y,scale=1,r=0)=>({t:'group',translate:[x,y],rotate:[r,200,200],scale:[scale,scale],ops});
export function assemblyArt(d){return {w:900,h:380,ops:[
 rect(0,0,900,380,PAPER),txt(130,30,'1. Match letters / TOP',20,INK,'middle',{weight:'bold'}),placed(frontArt(d,0).ops,30,60,.5),
 txt(440,30,'2. Turn BACK over',20,INK,'middle',{weight:'bold'}),placed(backArt(d,0).ops,340,60,.5),
 line(260,158,300,158,INK,4),poly([[307,158],[294,150],[294,166]],INK),
 txt(750,30,'3. Glue blank sides',20,INK,'middle',{weight:'bold'}),rect(650,72,208,200,'#e0d7c5',INK,2),placed(frontArt(d,0).ops,644,60,.5),
 line(570,158,610,158,INK,4),poly([[617,158],[604,150],[604,166]],INK),
 txt(130,291,'A FRONT faces up',19,INK,'middle'),txt(440,291,'Keep TOP at the top',19,INK,'middle'),txt(750,291,'Align edges; dry flat',19,INK,'middle'),
 txt(450,335,'Flip the BACK left-to-right so its print faces down.',22,INK,'middle'),txt(450,365,'Place it UNDER the front: the two blank sides touch.',22,INK,'middle')
 ]};}
export function quarterArt(d,r=0,f=false){const ops=[rect(0,0,400,400,'#f5efdd',INK,2)];
 for(let y=0;y<4;y++)for(let x=0;x<4;x++)ops.push(rect(x*100+2,y*100+2,96,96,'none','#bac5b8',1));
 ops.push({t:'group',translate:[0,0],rotate:[90*r,200,200],ops:card(d,0,f)});
 ops.push(rect(0,0,400,400,'none',GOLD,4,{dash:'9 7'}));return {w:400,h:400,ops};
}
export function foldArt(d){return {w:900,h:430,ops:[placed(quarterArt(d,0,false).ops,35,25,.75),placed(quarterArt(d,0,true).ops,530,25,.75),line(380,175,480,175,INK,4),poly([[490,175],[474,165],[474,185]],INK),txt(185,358,'Before: four columns of front',23,INK,'middle'),txt(680,358,'After: fold left column inward',23,INK,'middle'),txt(680,395,'Left = exposed base / next = reverse road',20,INK,'middle'),txt(450,425,'Dashed outer frame = original slot. Do not centre the narrower card.',20,INK,'middle')]};}
export function turnArt(d){return {w:900,h:285,ops:[0,1,2].flatMap((r,i)=>[placed(quarterArt(d,r,true).ops,35+i*300,20,.5),txt(135+i*300,250,['A0F / TOP up','A1F / TOP right','A2F / TOP down'][i],22,INK,'middle'),txt(135+i*300,280,'Same original slot',18,INK,'middle')])};}
export function localRoadArt(d,s,k){const [ox,oy]=d.tiles[k].origin,cells=visibleMap(d,s),ops=[rect(0,0,400,400,PAPER,INK,2)];
 const matrix=Array.from({length:4},(_,y)=>Array.from({length:4},(_,x)=>cells[oy+y][ox+x].mask));
 for(let y=0;y<4;y++)for(let x=0;x<4;x++)ops.push(rect(x*100,y*100,100,100,cells[oy+y][ox+x].layer==='base'?'#f5efdd':cells[oy+y][ox+x].layer==='reverse'?'#f4dcb8':'#e6eddc','#bac5b8',1));
 ops.push(...roads(matrix));for(const l of availableLandmarks(d,s)){if(l.id==='E')continue;const [x,y]=landmarkPosition(d,s,l.id);if(x>=ox&&x<ox+4&&y>=oy&&y<oy+4)ops.push(...landmark(l,(x-ox)*100+50,(y-oy)*100+50));}
 return {w:400,h:400,ops};
}
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function svgOps(ops){return ops.map(o=>{
 const style=`fill="${o.fill||'none'}" stroke="${o.stroke||'none'}" stroke-width="${o.sw||1}"${o.dash?` stroke-dasharray="${o.dash}"`:''}${o.tag?` data-stop="${o.tag}"`:''}`;
 if(o.t==='group')return `<g transform="translate(${o.translate.join(' ')}) rotate(${o.rotate.join(' ')})${o.scale?' scale('+o.scale.join(' ')+')':''}">${svgOps(o.ops)}</g>`;
 if(o.t==='rect')return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" ${style}/>`;
 if(o.t==='line')return `<line x1="${o.x1}" y1="${o.y1}" x2="${o.x2}" y2="${o.y2}" ${style} stroke-linecap="${o.cap||'round'}"/>`;
 if(o.t==='circle')return `<circle cx="${o.x}" cy="${o.y}" r="${o.r}" ${style}/>`;
 if(o.t==='poly')return `<polygon points="${o.points.map(p=>p.join(',')).join(' ')}" ${style}/>`;
 if(o.t==='text')return `<text x="${o.x}" y="${o.y}" font-family="Arial,Helvetica,sans-serif" font-size="${o.size}" font-weight="${o.weight||'normal'}" text-anchor="${o.anchor}" fill="${o.fill}"${o.tag?` data-stop="${o.tag}"`:''}>${esc(o.text)}</text>`;
 throw Error('Unknown primitive '+o.t);
}).join('');}
export const svg=art=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 ${art.w+8} ${art.h+8}" role="img" aria-label="Original Fold City paper diagram">${svgOps(art.ops)}</svg>`;
