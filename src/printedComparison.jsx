import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import './printedComparison.css';
import PrintedPdfPreview from './printedPdfPreview.jsx';
import {printedChanges,changesForRole,wordChanges} from './printedChanges.mjs';

function Passage({parts,side}){
 return <p className="printed-diff-text">{parts.filter(part=>side==='before'?part.type!=='added':part.type!=='removed').map((part,index)=>
  part.type==='removed'?<del key={index}>{part.text}</del>:part.type==='added'?<mark key={index}>{part.text}</mark>:<span key={index}>{part.text}</span>)}</p>;
}
function startPage(map,stage,role){return map?.[stage]?.[role]||1;}
function focusRange(map,entry,role,side,request){
 if(!entry)return null;
 return {id:`${entry.id}-${request}`,text:entry[side==='current'?'before':'after'],startPage:startPage(map,entry.stageNumber,role),endPage:map?.[entry.stageNumber+1]?.[role]?map[entry.stageNumber+1][role]-1:undefined};
}

function PdfPair({rootRef,candidate,currentVersion,role,zoom,setZoom,sync,setSync,narrow,single,setSingle,full,onFull,urls,pages,changePage,setCount,focuses}){
 return <div className="printed-comparison-viewer" ref={rootRef}>
  <div className="printed-comparison-tools">
   <label>PDF zoom<select value={zoom} onChange={e=>setZoom(e.target.value)}><option value="fit">Fit width</option><option value="100">100%</option><option value="150">150%</option><option value="200">200%</option></select></label>
   {candidate&&<label className="printed-sync"><input type="checkbox" checked={sync} onChange={e=>setSync(e.target.checked)}/>Sync page turns</label>}
   <button type="button" className="button-quiet" data-fullscreen-control onClick={onFull}>{full?'Close full screen':'Full screen'}</button>
  </div>
  {candidate&&narrow&&<div className="delivery-shortcuts printed-version-switch" role="group" aria-label="Version to view"><button type="button" className="button-quiet" aria-pressed={single==='current'} onClick={()=>setSingle('current')}>Original</button><button type="button" className="button-quiet" aria-pressed={single==='proposed'} onClick={()=>setSingle('proposed')}>Modified</button></div>}
  <p className="live-note">{narrow&&candidate?'Switch versions to compare the same passage at a readable size. ':'Original PDF bytes, with display-only highlights. '}At 100% or above, drag or scroll to inspect the page.</p>
  <div className={'printed-comparison-pdfs'+(!narrow&&candidate?' is-paired':'')}>
   {['current',...(candidate?['proposed']:[])].map(side=><article key={side} hidden={Boolean(narrow&&candidate&&single!==side)}>
    <h4>{side==='current'?`Original · version ${currentVersion}`:'Modified · not accepted'} · {role==='player'?'Player Pack':'Adult guide'}</h4>
    <a href={urls[side]+`#page=${pages[side]}`} target="_blank" rel="noreferrer">Open {side==='current'?'original':'modified'} PDF in a new tab</a>
    <PrintedPdfPreview url={urls[side]} label={`${side==='current'?'Original':'Modified'} ${role} PDF`} page={pages[side]} onPageChange={(number,reason)=>changePage(side,number,reason)} zoom={zoom} focus={focuses[side]} onPageCount={count=>setCount(side,count)}/>
   </article>)}
  </div>
 </div>;
}

export default function PrintedComparison({workspace,candidate,orderId,guideLabel='Adult guide',stageNumber=1}){
 const candidateReady=candidate?.status==='ready';
 const diff=useMemo(()=>candidateReady?printedChanges(workspace.stages,candidate.stages,{kind:candidate.kind,stageNumber:candidate.stageNumber}):{changed:[],unchanged:[]},[workspace.stages,candidate]);
 const firstRole=changesForRole(diff.changed,'player').length||!changesForRole(diff.changed,'guide').length?'player':'guide';
 const [role,setRole]=useState(firstRole),[focusEntry,setFocusEntry]=useState(changesForRole(diff.changed,firstRole)[0]||null),[request,setRequest]=useState(0);
 const [showPdf,setShowPdf]=useState(!candidateReady),[zoom,setZoom]=useState('fit'),[sync,setSync]=useState(true),[single,setSingle]=useState('proposed'),[full,setFull]=useState(false),[viewerWidth,setViewerWidth]=useState(0);
 const selectedStage=focusEntry?.stageNumber||candidate?.stageNumber||stageNumber;
 const [pages,setPages]=useState({current:startPage(workspace.checkpointPages,selectedStage,firstRole),proposed:startPage(candidate?.checkpointPages,selectedStage,firstRole)});
 const counts=useRef({current:1000,proposed:1000}),viewerRef=useRef(null),dialogRef=useRef(null),openButton=useRef(null),previousFocus=useRef(null),id=useId();
 const currentVersion=candidateReady?candidate.baseVersion:workspace.version;
 const urls={current:`/api/v1/files/${orderId}/${role}?paper=${workspace.paper}&version=${currentVersion}&view=1`,proposed:`/api/v1/orders/${orderId}/editions/${candidate?.id}/${role}`};
 const visibleChanges=changesForRole(diff.changed,role),visibleUnchanged=changesForRole(diff.unchanged,role),narrow=viewerWidth<900;
 const focuses={current:focusRange(workspace.checkpointPages,focusEntry,role,'current',request),proposed:focusRange(candidate?.checkpointPages,focusEntry,role,'proposed',request)};
 useEffect(()=>{
  if(!showPdf||!viewerRef.current)return;const observer=new ResizeObserver(entries=>setViewerWidth(entries[0].contentRect.width));observer.observe(viewerRef.current);return()=>observer.disconnect();
 },[showPdf,full]);
 useEffect(()=>{
  if(!candidateReady)setPages({current:startPage(workspace.checkpointPages,stageNumber,role),proposed:1});
 },[candidateReady,stageNumber,role,workspace.checkpointPages]);
 useEffect(()=>{
  if(!full||!dialogRef.current)return;const dialog=dialogRef.current;dialog.showModal();
  const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{dialog.close();document.body.style.overflow=oldOverflow;requestAnimationFrame(()=>{if(previousFocus.current?.isConnected)previousFocus.current.focus();else (viewerRef.current?.querySelector('[data-fullscreen-control]')||openButton.current)?.focus();});};
 },[full]);
 function switchRole(next){
  const entry=changesForRole(diff.changed,next)[0]||null,stage=entry?.stageNumber||candidate?.stageNumber||stageNumber;
  setRole(next);setFocusEntry(entry);setRequest(n=>n+1);counts.current={current:1000,proposed:1000};
  setPages({current:startPage(workspace.checkpointPages,stage,next),proposed:startPage(candidate?.checkpointPages,stage,next)});
 }
 function jump(entry){
  const next=entry.role==='both'?role:entry.role;setRole(next);setFocusEntry(entry);setRequest(n=>n+1);setShowPdf(true);
  setPages({current:startPage(workspace.checkpointPages,entry.stageNumber,next),proposed:startPage(candidate?.checkpointPages,entry.stageNumber,next)});
  requestAnimationFrame(()=>viewerRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
 }
 function changePage(side,number,reason){
  setPages(previous=>{
   const next={...previous,[side]:number},other=side==='current'?'proposed':'current';
   if(sync&&candidateReady&&reason==='navigation')next[other]=Math.max(1,Math.min(counts.current[other],previous[other]+number-previous[side]));return next;
  });
 }
 function setCount(side,count){counts.current[side]=count;setPages(previous=>previous[side]>count?{...previous,[side]:count}:previous);}
 const viewer=<PdfPair rootRef={viewerRef} candidate={candidateReady} currentVersion={currentVersion} role={role} zoom={zoom} setZoom={setZoom} sync={sync} setSync={setSync} narrow={narrow} single={single} setSingle={setSingle} full={full} onFull={()=>{if(!full)previousFocus.current=document.activeElement;setFull(value=>!value);}} urls={urls} pages={pages} changePage={changePage} setCount={setCount} focuses={focuses}/>;
 return <div className="printed-comparison">
  <h3>{candidateReady?candidate.kind==='checkpoint'?`What changed in checkpoint ${candidate.stageNumber}?`:'Checkpoint text changes':'Review your current printed game'}</h3>
  {candidateReady&&<p>Original version {currentVersion} → proposed version. <strong>{diff.changed.length} checkpoint text {diff.changed.length===1?'field changed':'fields changed'}.</strong>{candidate.kind==='whole'&&' Review the complete PDFs for the opening, ending and all printed materials.'}</p>}
  <div className="delivery-shortcuts" role="group" aria-label="Document changes">{[['player','Player Pack'],['guide',guideLabel]].map(([value,label])=><button type="button" className="button-quiet" aria-pressed={role===value} key={value} onClick={()=>switchRole(value)}>{label}{candidateReady?` · ${changesForRole(diff.changed,value).length} changed`:''}</button>)}</div>
  {candidateReady&&<>
   <p className="printed-change-legend"><span><del>Removed</del> from the original</span><span><mark>Added</mark> in the modification</span></p>
   {visibleChanges.length>0?<div className="printed-change-list">{visibleChanges.map(entry=>{
    const parts=wordChanges(entry.before,entry.after);
    return <section className="printed-change-card" key={entry.id} aria-labelledby={`${id}-${entry.id}`}>
     <h4 id={`${id}-${entry.id}`}>Checkpoint {entry.stageNumber} · {entry.label}</h4>
     <div className="printed-text-pair"><div><strong>Original · version {currentVersion}</strong><Passage parts={parts} side="before"/></div><div><strong>Modified · not accepted</strong><Passage parts={parts} side="after"/></div></div>
     <button type="button" className="button-quiet" onClick={()=>jump(entry)}>Show checkpoint {entry.stageNumber} {entry.label.toLowerCase()} in PDFs</button>
    </section>;
   })}</div>:<p className="printed-no-changes">No checkpoint text changed in this document.{candidate.kind==='whole'?' Check the complete PDF for other game content.':' Its original wording is retained.'}</p>}
   {visibleUnchanged.length>0&&<details className="printed-unchanged"><summary>Unchanged checkpoint text ({visibleUnchanged.length})</summary>{visibleUnchanged.map(entry=><div key={entry.id}><strong>Checkpoint {entry.stageNumber} · {entry.label} · unchanged</strong><p className="printed-diff-text">{entry.before||'No printed text in this field.'}</p></div>)}</details>}
   {candidate.kind==='checkpoint'&&<p className="live-note">This wording change keeps the printed puzzle pieces, rules, choices and answers.</p>}
  </>}
  <button ref={openButton} type="button" className="button-quiet printed-expand-pdf" aria-expanded={showPdf} aria-controls={`${id}-pdf`} onClick={()=>setShowPdf(value=>!value)}>{showPdf?'Hide PDF inspection':'Inspect actual PDFs · zoom and full screen'}</button>
  {showPdf&&!full&&<div id={`${id}-pdf`}>{viewer}</div>}
  {full&&createPortal(<dialog ref={dialogRef} className="delivery-editor printed-comparison-dialog" aria-labelledby={`${id}-fullscreen`} onCancel={event=>{event.preventDefault();setFull(false);}}><h3 id={`${id}-fullscreen`}>Inspect actual {role==='player'?'Player Pack':guideLabel} PDFs</h3>{viewer}</dialog>,document.body)}
  {candidateReady&&<p id="printed-comparison-effect" className="printed-accept-effect">Accepting uses one {candidate.kind==='checkpoint'?'checkpoint change':'whole-game remake'} and switches both PDFs together. Changed checkpoint text: {diff.changed.length?diff.changed.map(entry=>`checkpoint ${entry.stageNumber} ${entry.label.toLowerCase()}`).join('; '):'none in this summary; review the complete PDFs'}. Earlier versions stay in download history.</p>}
 </div>;
}
