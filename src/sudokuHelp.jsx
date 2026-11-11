import {helpPrices,sudokuHelpVersion} from '../shared/sudoku/help-model.mjs';
import {useEffect,useRef,useState} from 'react';
import {Lightbulb,GridNine,Coins,CheckCircle,Crosshair,ArrowClockwise,ClockCounterClockwise} from '@phosphor-icons/react';
const modes=[{id:'reasoning',title:'Thinking hint',Icon:Lightbulb,description:'Find a useful next step.',action:'Get a hint'},{id:'answer',title:'Next-cell answer',Icon:GridNine,description:'See which cell to fill, and why.',action:'Show next answer'}];
const credits=n=>`${n} ${n===1?'credit':'credits'}`;
export default function SudokuHelp({balance,ready,quote,hints,hint,receipt,error,busy,blocked,finished,offline,board,onRefresh,onUnlock,onReadHint,onLocate,onCredits,onEarn}){
 const resultRef=useRef(null),[historyOpen,setHistoryOpen]=useState(false);
 const current=hint?.board===board,validQuote=ready&&quote?.version===sudokuHelpVersion&&quote.board===board;
 const disabled=busy||blocked||finished||offline,placed=hint?.placement;
 const history=hints.filter(h=>h.id!==hint?.id).slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
 const done=!current&&placed&&Number(board[placed.index])===placed.digit;
 useEffect(()=>{if(!hint||!receipt?.requestId)return;requestAnimationFrame(()=>{const el=resultRef.current;if(!el)return;el.focus({preventScroll:true});const r=el.getBoundingClientRect();if(r.top<15||r.bottom>innerHeight-15)el.scrollIntoView({block:'center',behavior:'auto'});});},[hint?.id,hint?.tier,receipt?.requestId]);
 return <section className="sd-help-card" aria-labelledby="sd-help-title">
  <header className="sd-help-header"><div><Lightbulb size={25} aria-hidden="true"/><h3 id="sd-help-title">Need a hand?</h3></div><span className="sd-help-balance"><Coins size={18} aria-hidden="true"/><strong>{balance}</strong> credits</span></header>
  {!ready&&<p role="status">Help is being updated. Please try again shortly.</p>}
  {offline&&<p role="status">Reconnect to unlock help.</p>}
  {error&&<div className="sd-help-error" role="alert"><p>{error}</p><button disabled={busy||blocked||offline} onClick={onRefresh}><ArrowClockwise size={18} aria-hidden="true"/>Retry help</button></div>}
  {hint&&<section ref={resultRef} tabIndex={-1} className={'sd-help-result '+(current?'is-current':'is-earlier')} aria-label="Your Sudoku help result">
   <div className="sd-help-result-status">{current?<CheckCircle size={19} aria-hidden="true"/>:<ClockCounterClockwise size={19} aria-hidden="true"/>}<strong>{current?'Your next step':done?'Step completed':'Earlier board'}</strong></div>
   {current?<>
    {receipt?.hintId===hint.id&&<p className="sd-help-receipt" role="status">{receipt.charged===0?'Free to view':`${credits(receipt.charged)} charged${receipt.replayed?' once':''}`}</p>}
    <span className="sd-help-location">{placed?`Row ${placed.row} · column ${placed.column}`:hint.target?`Row ${hint.target.row} · column ${hint.target.column}`:''}</span>
    <h4 className={placed?'sd-help-answer':undefined}>{placed?`${placed.coordinate} = ${placed.digit}`:hint.target?`Start with ${hint.target.coordinate}`:'Your thinking step'}</h4>
    <p>{placed?placed.reason?.split(/(?<=\.)\s+/)[0]:hint.method||hint.texts?.[0]}</p>
    {placed&&<details className="sd-help-explanation"><summary>See the reasoning</summary><p>{placed.reason}</p></details>}
    {hint.target&&<button className="sd-help-locate" disabled={busy||blocked} onClick={()=>onLocate(hint)}><Crosshair size={20} aria-hidden="true"/>Find {hint.target.coordinate} on the board</button>}
   </>:<><h4>{placed?`${placed.coordinate} = ${placed.digit}`:hint.target?`Thinking hint · ${hint.target.coordinate}`:'Saved help'}</h4><details className="sd-help-explanation"><summary>Review saved help · free</summary><p>{placed?.reason||hint.method||hint.texts?.[0]}</p><p>This applies to an earlier board.</p></details></>}
  </section>}
  {!finished&&<div className="sd-help-choices" role="group" aria-label="Sudoku help options">{modes.map(({id,title,Icon,description,action})=>{
   const cost=validQuote?quote.costs[id]:null,upgrade=cost>0&&cost<helpPrices[id];
   return <section className={'sd-direct-help sd-direct-help-'+id} key={id}>
    <div className="sd-direct-help-heading"><Icon size={24} aria-hidden="true"/><h4>{title}</h4></div>
    <p>{description}</p>
    <button disabled={disabled||!validQuote||balance<cost} onClick={()=>onUnlock(id)}>{busy?'Working…':cost===0?'View again · free':`${action} · ${credits(cost??helpPrices[id])}${upgrade?' more':''}`}</button>
   </section>;
  })}</div>}
  {!validQuote&&!finished&&ready&&!offline&&<p className="sd-help-price-state" role="status">{error?'Refresh help to retry.':'Checking your price…'}</p>}
  {validQuote&&!finished&&balance<Math.min(quote.costs.reasoning,quote.costs.answer)&&<div className="sd-help-shortfall"><p>Not enough credits for a new hint.</p><button onClick={onEarn} disabled={busy||offline}>Earn free credits</button></div>}
  {!finished&&<p className="sd-help-smallprint">Only the priced button spends credits. Purchased help is free to view again.</p>}
  <footer className="sd-help-footer"><button onClick={onCredits} disabled={busy||offline}>Get AI credits</button><details className="sd-help-history" open={historyOpen} onToggle={e=>{setHistoryOpen(e.currentTarget.open);if(e.currentTarget.open&&finished&&!hints.length)onRefresh();}}><summary>Saved help ({history.length})</summary>{history.length?history.map(h=><article key={h.id}><span>{h.board===board?'Current board':'Earlier board'}</span><h4>{h.placement?`${h.placement.coordinate} = ${h.placement.digit}`:h.target?`Hint · ${h.target.coordinate}`:'Saved help'}</h4><button disabled={busy||blocked} onClick={()=>{onReadHint(h);requestAnimationFrame(()=>{resultRef.current?.focus({preventScroll:true});resultRef.current?.scrollIntoView({block:'center'});});}}>View saved help · free</button></article>):<p>No other saved help.</p>}</details></footer>
 </section>;
}
