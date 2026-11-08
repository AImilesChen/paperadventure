import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Package } from '@phosphor-icons/react';
import { baySize, bayPieces, baySlides, bayMove, baySolved, bayOccupancy, solveBay, describeBayMove } from '../shared/loading-bay.mjs';
import './loadingBay.css';
import './loadingBayChallenge.css';

const rect = (piece, position) => ({ left: `${(piece.axis === 'H' ? position : piece.fixed) * (100 / baySize)}%`, top: `${(piece.axis === 'H' ? piece.fixed : position) * (100 / baySize)}%`, width: `${(piece.axis === 'H' ? piece.length : 1) * (100 / baySize)}%`, height: `${(piece.axis === 'V' ? piece.length : 1) * (100 / baySize)}%` });
const axisName = p => p.axis === 'H' ? 'horizontal' : 'vertical';
function Crate({ piece, position, children, ...props }) {
  return <button type="button" {...props} className={`lb-crate lb-${piece.id}${piece.axis === 'V' ? ' lb-vertical' : ''}${props['aria-pressed'] ? ' lb-selected' : ''}`} style={rect(piece, position)}><span>{piece.id}</span><span aria-hidden="true">{piece.axis === 'H' ? '↔' : '↕'}</span>{children}</button>;
}
function StillBoard({ positions, label }) {
  return <div className="lb-frame lb-example" role="img" aria-label={label}><div className="lb-grid">{bayPieces.map((piece,i)=><div key={piece.id} className={`lb-still lb-${piece.id}${piece.axis === 'V' ? ' lb-vertical' : ''}`} style={rect(piece,positions[i])}><span>{piece.id}</span><span>{piece.axis === 'H'?'↔':'↕'}</span></div>)}</div><div className="lb-exit"><span>EXIT</span><ArrowRight size={23}/></div></div>;
}
export function BayRules(){return <section className="lb-howto" aria-label="How to play"><p className="lb-difficulty">CHALLENGE · HOW TO PLAY</p><ul><li>↔ left/right · ↕ up/down.</li><li>No turning, overlap or jumping.</li><li><strong>Slide X out on the right.</strong></li></ul><p className="lb-help-instruction">Choose a crate, then a marked square. Numbers show distance.</p><p className="lb-shortcuts">Drag and arrow keys also work.</p><p className="lb-patience">No timer or move limit.</p></section>;}
export default function LoadingBay({ data, locked, onMove, nextHint }) {
  const [selected,setSelected]=useState(''),[preview,setPreview]=useState(null),[message,setMessage]=useState('');
  const board=useRef(null),drag=useRef(null),suppressClick=useRef(false);
  const positions=data.positions,slides=baySlides(positions),candidate=nextHint?solveBay(positions)?.[0]:null;
  useEffect(()=>{setSelected('');setPreview(null);setMessage('');},[positions]);
  const available=slides.filter(move=>move.piece===selected);
  function move(piece,to){if(locked)return;const next=bayMove(data,piece,to);if(next){onMove(next);setMessage('');}else{const p=bayPieces.find(p=>p.id===piece),i=bayPieces.indexOf(p),delta=to-positions[i];if(to<0||to+p.length>baySize)setMessage('Only X can leave, through the right-hand exit.');else{const edge=delta<0?positions[i]-1:positions[i]+p.length;const blocker=bayOccupancy(positions)?.[p.axis==='H'?p.fixed*baySize+edge:edge*baySize+p.fixed];setMessage(blocker?`Crate ${blocker} is blocking that direction. Make room first.`:'That slide is blocked. Crates cannot pass through each other.');}}}
  function select(id){if(locked)return;setSelected(id);setPreview(null);const p=bayPieces.find(p=>p.id===id);setMessage(slides.some(m=>m.piece===id)?`Crate ${id} selected. Choose a highlighted landing square.`:`Crate ${id} is blocked. Move another crate to make room.`);}
  function pointerDown(e,piece){if(locked)return;e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);drag.current={piece:piece.id,x:e.clientX,y:e.clientY,start:positions[bayPieces.indexOf(piece)]};suppressClick.current=false;}
  function pointerMove(e,piece){const d=drag.current;if(!d||d.piece!==piece.id)return;const delta=piece.axis==='H'?e.clientX-d.x:e.clientY-d.y;if(Math.abs(delta)<8)return;suppressClick.current=true;const to=d.start+Math.round(delta/(board.current.getBoundingClientRect().width/baySize));setPreview(slides.find(m=>m.piece===piece.id&&m.to===to)||null);}
  function pointerUp(e,piece){const d=drag.current;if(!d||d.piece!==piece.id)return;drag.current=null;if(suppressClick.current){const delta=piece.axis==='H'?e.clientX-d.x:e.clientY-d.y;move(piece.id,d.start+Math.round(delta/(board.current.getBoundingClientRect().width/baySize)));setPreview(null);}}
  return <div className="lb-game" data-delivered={baySolved(positions) || undefined}>
    <div className="lb-mobile-rules"><BayRules/></div>
    <div className="lb-frame"><div className="lb-grid" ref={board} role="group" aria-label="Six by six loading bay">
      {preview&&<div className="lb-preview" style={rect(bayPieces.find(p=>p.id===preview.piece),preview.to)} aria-hidden="true"/>}
      {bayPieces.map((piece,i)=><Crate key={piece.id} piece={piece} position={positions[i]} disabled={locked} aria-label={`Crate ${piece.id}, ${axisName(piece)}, ${piece.axis==='H'?'row':'column'} ${piece.fixed+1}, starts at ${positions[i]+1}`} aria-pressed={selected===piece.id} data-hint={candidate?.piece===piece.id||undefined} onClick={()=>{if(suppressClick.current){suppressClick.current=false;return;}select(piece.id);}} onKeyDown={e=>{const delta=piece.axis==='H'?{ArrowLeft:-1,ArrowRight:1}[e.key]:{ArrowUp:-1,ArrowDown:1}[e.key];if(delta){e.preventDefault();move(piece.id,positions[i]+delta);}}} onPointerDown={e=>pointerDown(e,piece)} onPointerMove={e=>pointerMove(e,piece)} onPointerUp={e=>pointerUp(e,piece)} onPointerCancel={()=>{drag.current=null;setPreview(null);}}/>)}
      {available.map(m=>{const p=bayPieces.find(p=>p.id===m.piece),delta=m.to-m.from,edge=delta<0?m.to:m.to+p.length-1,row=p.axis==='H'?p.fixed:edge,col=p.axis==='H'?edge:p.fixed;return <button key={m.to} type="button" className="lb-landing" style={{left:`${col*(100/baySize)}%`,top:`${row*(100/baySize)}%`}} aria-label={describeBayMove(m).replace(/\.$/,'')} onMouseEnter={()=>setPreview(m)} onMouseLeave={()=>setPreview(null)} onFocus={()=>setPreview(m)} onBlur={()=>setPreview(null)} onClick={()=>move(m.piece,m.to)}><span>{p.axis==='H'?(delta<0?'←':'→'):(delta<0?'↑':'↓')}{Math.abs(delta)}</span></button>;})}
    </div><div className="lb-exit"><span>EXIT</span><ArrowRight size={25}/></div></div>
    <p className="lb-status" role="status">{locked&&baySolved(positions)?'Parcel X has left the loading bay.':message||'Start by choosing any crate. Red parcel X needs to reach the exit.'}</p>
    {candidate&&<p className="lb-next-hint"><strong>Next-move hint:</strong> {describeBayMove(candidate)} The suggested crate is outlined; you make the move.</p>}
  </div>;
}
export function BayWalkthrough({ positions, fromStart = false }) {
  const key=positions.join(','),route=useMemo(()=>solveBay(positions)||[],[key]),[step,setStep]=useState(0);
  useEffect(()=>setStep(0),[key]);
  const frame=step>0?route[Math.min(step,route.length)-1]?.positions||positions:positions;
  return <section className="lb-walkthrough" aria-label="Solution demonstration"><h3>Step-by-step demonstration</h3><p>{fromStart ? 'Review from the original layout.' : 'Starts from your current layout.'} This example never moves your own crates.</p><StillBoard positions={frame} label={`Demonstration step ${step} of ${route.length}. ${step?describeBayMove(route[step-1]):'Starting position.'}`}/><p role="status"><strong>{step?`Step ${step}: ${describeBayMove(route[step-1])}`:'Starting position'}</strong></p><div className="lb-demo-actions"><button disabled={!step} onClick={()=>setStep(s=>s-1)}>Previous step</button><button disabled={step>=route.length} onClick={()=>setStep(s=>s+1)}>Next step</button><button disabled={!step} onClick={()=>setStep(0)}>Back to start</button></div></section>;
}
export function BayDelivered(){return <div className="lb-delivered"><Package size={34}/><div><strong>Parcel delivered!</strong><p>You made room, opened the exit and sent X on its way.</p></div><ArrowRight size={30} className="lb-delivery-arrow"/></div>;}
