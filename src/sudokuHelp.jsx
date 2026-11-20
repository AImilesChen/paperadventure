import {sudokuHelpCopy} from '../shared/sudoku/help-copy.mjs';
import { currentLocale, t as translateUi } from "./i18n/index.mjs";import { helpPrices, sudokuHelpVersion } from '../shared/sudoku/help-model.mjs';
import { useEffect, useRef, useState } from 'react';
import { Lightbulb, GridNine, Coins, CheckCircle, Crosshair, ArrowClockwise, ClockCounterClockwise } from '@phosphor-icons/react';
const modes = [{ id: 'reasoning', title: 'Thinking hint', Icon: Lightbulb, description: 'Find a useful next step.', action: 'Get a hint' }, { id: 'answer', title: 'Next-cell answer', Icon: GridNine, description: 'See which cell to fill, and why.', action: 'Show next answer' }];
const credits = (n) => translateUi("{value0} {value1}", { value0: n, value1: translateUi(n === 1 ? 'credit' : 'credits') });
export default function SudokuHelp({ balance, ready, quote, hints, hint, receipt, error, busy, blocked, finished, offline, board, onRefresh, onUnlock, onReadHint, onLocate, onCredits, onEarn }) {
  const resultRef = useRef(null),[historyOpen, setHistoryOpen] = useState(false);
  const current = hint?.board === board,validQuote = ready && quote?.version === sudokuHelpVersion && quote.board === board;
  const disabled = busy || blocked || finished || offline,placed = hint?.placement;
  const history = hints.filter((h) => h.id !== hint?.id).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const done = !current && placed && Number(board[placed.index]) === placed.digit;
  useEffect(() => {if (!hint || !receipt?.requestId) return;requestAnimationFrame(() => {const el = resultRef.current;if (!el) return;el.focus({ preventScroll: true });const r = el.getBoundingClientRect();if (r.top < 15 || r.bottom > innerHeight - 15) el.scrollIntoView({ block: 'center', behavior: 'auto' });});}, [hint?.id, hint?.tier, receipt?.requestId]);
  return <section className="sd-help-card" aria-labelledby="sd-help-title">
  <header className="sd-help-header"><div><Lightbulb size={25} aria-hidden="true" /><h3 id="sd-help-title">{translateUi("Need a hand?")}</h3></div><span className="sd-help-balance"><Coins size={18} aria-hidden="true" /><strong>{translateUi(balance)}</strong>{translateUi(" credits")}</span></header>
  {!ready && <p role="status">{translateUi("Help is being updated. Please try again shortly.")}</p>}
  {offline && <p role="status">{translateUi("Reconnect to unlock help.")}</p>}
  {error && <div className="sd-help-error" role="alert"><p>{translateUi(error)}</p><button disabled={busy || blocked || offline} onClick={onRefresh}><ArrowClockwise size={18} aria-hidden="true" />{translateUi("Retry help")}</button></div>}
  {hint && <section ref={resultRef} tabIndex={-1} className={'sd-help-result ' + (current ? 'is-current' : 'is-earlier')} aria-label={translateUi("Your Sudoku help result")}>
   <div className="sd-help-result-status">{current ? <CheckCircle size={19} aria-hidden="true" /> : <ClockCounterClockwise size={19} aria-hidden="true" />}<strong>{current ? translateUi('Your next step') : done ? translateUi('Step completed') : translateUi('Earlier board')}</strong></div>
   {current ? <>
    {receipt?.hintId === hint.id && <p className="sd-help-receipt" role="status">{receipt.charged === 0 ? translateUi('Free to view') : translateUi("{value0} charged{value1}", { value0: credits(receipt.charged), value1: receipt.replayed ? ' once' : '' })}</p>}
    <span className="sd-help-location">{placed ? translateUi("Row {value0} \xB7 column {value1}", { value0: placed.row, value1: placed.column }) : hint.target ? translateUi("Row {value0} \xB7 column {value1}", { value0: hint.target.row, value1: hint.target.column }) : translateUi('')}</span>
    <h4 className={placed ? 'sd-help-answer' : undefined}>{placed ? translateUi("{value0} = {value1}", { value0: placed.coordinate, value1: placed.digit }) : hint.target ? translateUi("Start with {value0}", { value0: hint.target.coordinate }) : translateUi('Your thinking step')}</h4>
    <p>{placed ? sudokuHelpCopy(placed.reason, currentLocale()) : sudokuHelpCopy(hint.method || hint.texts?.[0], currentLocale())}</p>
    {placed && <details className="sd-help-explanation"><summary>{translateUi("See the reasoning")}</summary><p>{sudokuHelpCopy(placed.reason, currentLocale())}</p></details>}
    {hint.target && <button className="sd-help-locate" disabled={busy || blocked} onClick={() => onLocate(hint)}><Crosshair size={20} aria-hidden="true" />{translateUi("Find ")}{translateUi(hint.target.coordinate)}{translateUi(" on the board")}</button>}
   </> : <><h4>{placed ? translateUi("{value0} = {value1}", { value0: placed.coordinate, value1: placed.digit }) : hint.target ? translateUi("Thinking hint \xB7 {value0}", { value0: hint.target.coordinate }) : translateUi('Saved help')}</h4><details className="sd-help-explanation"><summary>{translateUi("Review saved help \xB7 free")}</summary><p>{placed?.reason || sudokuHelpCopy(hint.method || hint.texts?.[0], currentLocale())}</p><p>{translateUi("This applies to an earlier board.")}</p></details></>}
  </section>}
  {!finished && <div className="sd-help-choices" role="group" aria-label={translateUi("Sudoku help options")}>{translateUi(modes.map(({ id, title, Icon, description, action }) => {
        const cost = validQuote ? quote.costs[id] : null,upgrade = cost > 0 && cost < helpPrices[id];
        return <section className={'sd-direct-help sd-direct-help-' + id} key={id}>
    <div className="sd-direct-help-heading"><Icon size={24} aria-hidden="true" /><h4>{translateUi(title)}</h4></div>
    <p>{translateUi(description)}</p>
    <button disabled={disabled || !validQuote || balance < cost} onClick={() => onUnlock(id)}>{busy ? translateUi('Working…') : cost === 0 ? translateUi('View again · free') : translateUi("{value0} \xB7 {value1}{value2}", { value0: translateUi(action), value1: credits(cost ?? helpPrices[id]), value2: upgrade ? translateUi(' more') : '' })}</button>
   </section>;
      }))}</div>}
  {!validQuote && !finished && ready && !offline && <p className="sd-help-price-state" role="status">{error ? translateUi('Refresh help to retry.') : translateUi('Checking your price…')}</p>}
  {validQuote && !finished && balance < Math.min(quote.costs.reasoning, quote.costs.answer) && <div className="sd-help-shortfall"><p>{translateUi("Not enough credits for a new hint.")}</p><button onClick={onEarn} disabled={busy || offline}>{translateUi("Earn free credits")}</button></div>}
  {!finished && <p className="sd-help-smallprint">{translateUi("Only the priced button spends credits. Purchased help is free to view again.")}</p>}
  <footer className="sd-help-footer"><button onClick={onCredits} disabled={busy || offline}>{translateUi("Get AI credits")}</button><details className="sd-help-history" open={historyOpen} onToggle={(e) => {setHistoryOpen(e.currentTarget.open);if (e.currentTarget.open && finished && !hints.length) onRefresh();}}><summary>{translateUi("Saved help (")}{translateUi(history.length)})</summary>{history.length ? history.map((h) => <article key={h.id}><span>{h.board === board ? translateUi('Current board') : translateUi('Earlier board')}</span><h4>{h.placement ? translateUi("{value0} = {value1}", { value0: h.placement.coordinate, value1: h.placement.digit }) : h.target ? translateUi("Hint \xB7 {value0}", { value0: h.target.coordinate }) : translateUi('Saved help')}</h4><button disabled={busy || blocked} onClick={() => {onReadHint(h);requestAnimationFrame(() => {resultRef.current?.focus({ preventScroll: true });resultRef.current?.scrollIntoView({ block: 'center' });});}}>{translateUi("View saved help \xB7 free")}</button></article>) : <p>{translateUi("No other saved help.")}</p>}</details></footer>
 </section>;
}
