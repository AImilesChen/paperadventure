import ForestLoop, {ForestRules,ForestExplanation,ForestMission} from './ForestLoop.jsx';
import {forestHints} from '../shared/forest-loop.mjs';
import ParcelEvidence, { ParcelRule, ParcelDelivered, ParcelExplanation } from './ParcelEvidence.jsx';
import LoadingBay, { BayWalkthrough, BayDelivered, BayRules } from './LoadingBay.jsx';
import { bayStart, bayHints, baySolution, checkBay } from '../shared/loading-bay.mjs';
import MoonSignal, { MoonConnected } from './MoonSignal.jsx';
import { Fragment, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ArrowCounterClockwise, Check, Lightbulb } from '@phosphor-icons/react';
import { freePuzzles, puzzleSvg, trailGrid, trailMoves, harbourNodes, harbourBridges } from '../shared/free-puzzles.mjs';
import CreditHelp, { useCreditPreview } from './puzzleCreditPreview.jsx';
import { stampEdition, inspectStampMatches } from '../shared/stamp-investigation.mjs';
import StampInvestigation from './stampInvestigation.jsx';
import { PostalRecords, PostalHowToPlay, PostalPocketKey, PostalDelivery } from './PostalRoute.jsx';
import { workshopKey, freshWorkshop, freshItem, restoreWorkshop, changeData, undoItem, checkWorkshop, trailInfo, harbourInfo, bridgeBetween } from '../shared/puzzle-workshop.mjs';
import { trackConversionEvent } from './analytics.js';
import './puzzleWorkshop.css';
import './puzzleFirstScreen.css';
import './stampHierarchy.css';
import './postalRoute.css';
import './postalVisual.css';
import './puzzleStacked.css';
import './moonSignal.css';

const shortTitles = ['Post office', 'Moon message', 'Loading bay', 'Parcel clues', 'Forest trail', 'Harbour route'];
const mechanics = ['Infer a code', 'Decode a message', 'Move the crates', 'Compare evidence', 'Reconstruct a route', 'Plan a crossing'];
const onlineTasks = [
  'Restore the key, then reconstruct the five-stop delivery route.',
  'Discover the rule in three records. Decode the final message to restore contact with the rescue ship.',
  'Slide the other crates to get red parcel X out through the right-hand exit.',
  'Find the parcel holding the compass and the one false copied note.',
  'Reconstruct the ranger’s journey from S to E using the recovered evidence. Some places were never visited.',
  'Build a route from DOCK to BEACON using all three rules below.',
];
const completionNames = { independent: 'Solved independently', hint: 'Solved with hints', solution: 'Completed after viewing solution' };
const controls = { 'stamp-code': 'Check delivery route', 'signal-shift': 'Check answer', 'parcel-queue': 'Delivery complete', 'shared-parcel': 'Check my judgment', 'forest-trail': 'Submit route', 'harbour-route': 'Check crossing' };

function HarbourBoard({ data, edit, notify }) {
  const info = harbourInfo(data.path);
  function go(node) {
    if (!bridgeBetween(info.current, node)) { notify(`There is no bridge from ${info.current.toUpperCase()} to ${node.toUpperCase()}. Choose a connected stop.`); return; }
    if (data.path.length >= 13) { notify('Undo a move or restart this crossing before adding more stops.'); return; }
    edit({ path: [...data.path, node] });
  }
  return <div>
    <p className="pw-instruction">Click a connected stop to cross its bridge. Bridge numbers join your code automatically. All connected stops remain available so you can test your own route.</p>
    <div className="pw-harbour-map"><svg viewBox="0 0 540 330" role="img" aria-label="Bridge map. The same bridges and numbers are listed below.">{harbourBridges.map(([a, b, digit]) => { const p = harbourNodes.find(n => n.id === a), q = harbourNodes.find(n => n.id === b); const used = data.path.some((node, i) => i > 0 && (data.path[i - 1] === a && node === b || data.path[i - 1] === b && node === a)); return <g key={digit}><line x1={p.x} y1={p.y} x2={q.x} y2={q.y} className={used ? 'used' : ''}/><rect x={(p.x + q.x) / 2 - 13} y={(p.y + q.y) / 2 - 13} width="26" height="26" rx="5"/><text x={(p.x + q.x) / 2} y={(p.y + q.y) / 2 + 6} textAnchor="middle">{digit}</text></g>; })}</svg>{harbourNodes.map(node => <button key={node.id} style={{ left: `${node.x / 540 * 100}%`, top: `${node.y / 330 * 100}%` }} className={info.current === node.id ? 'current' : ''} aria-label={`Go to ${node.label}${info.current === node.id ? ', current stop' : ''}`} aria-current={info.current === node.id ? 'location' : undefined} onClick={() => go(node.id)}>{node.label}</button>)}</div>
    <details className="pw-bridge-list"><summary>Read all bridge connections</summary><ul>{harbourBridges.map(([a, b, digit]) => <li key={digit}>{a.toUpperCase()} ↔ {b.toUpperCase()}: bridge {digit}</li>)}</ul></details>
    <div className="pw-collected" aria-live="polite"><strong>Bridge code: {info.code || '—'}</strong><span>{info.bridges} bridges crossed</span><small>{data.path.map(n => n.toUpperCase()).join(' → ')}</small></div>
  </div>;
}

function InteractiveCard({ puzzle, index, item, active, ready, update, edit, check, feedback, notify, restart, chooseNext, creditPreview, credits }) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const routePhase = index === 0 && item.data.verified && !archiveOpen;
  const [resetOpen, setResetOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [solutionConfirm, setSolutionConfirm] = useState(false);
  const heading = useRef(null);
  const printedReference = useRef(null);
  const [routeSelection, setRouteSelection] = useState('');
  const [clearRouteOpen, setClearRouteOpen] = useState(false);
  useEffect(() => { setRouteSelection(''); }, [item.data]);
  function removeSelected() {
    if (!ready || item.completion || !routeSelection) return;
    edit({ ...item.data, route: item.data.route.map(word => routeSelection === word ? '' : word), pair: [] });
    setRouteSelection(''); notify('');
  }
  function reviewArchive() {
    setClearRouteOpen(false);
    setArchiveOpen(true);
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); heading.current?.closest('article')?.scrollIntoView({ block: 'start', behavior: 'instant' }); });
  }

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 701px)');
    const fitReference = () => { if (printedReference.current) printedReference.current.open = !['stamp-code','signal-shift','parcel-queue'].includes(puzzle.id) && desktop.matches; };
    fitReference(); desktop.addEventListener('change', fitReference);
    return () => desktop.removeEventListener('change', fitReference);
  }, []);
  function showSolution() {
    update(current => ({ ...current, viewed: current.completion ? current.viewed : true }));
    setSolutionOpen(true); setSolutionConfirm(false);
  }
  const helpField = index === 0 && routePhase ? 'routeHints' : 'hints';
  const helpCount = item[helpField] || 0;
  const helpPuzzle = index === 4 ? { ...puzzle, hints: forestHints(item.data) } : index === 2 ? { ...puzzle, hints: bayHints(item.completion ? bayStart : item.data.positions), solution: baySolution(item.completion ? bayStart : item.data.positions) } : helpField === 'routeHints' ? { ...puzzle, hints: puzzle.routeHints } : puzzle;
  function moveBay(next) {
    if (!ready || item.completion) return;
    const result = checkBay(next);
    if (!item.attempted) trackConversionEvent('puzzle_attempt', { puzzle: puzzle.id });
    if (result.ok) trackConversionEvent('puzzle_solved', { puzzle: puzzle.id, assistance: item.viewed ? 'solution' : item.hints ? 'hint' : 'none' });
    update(current => ({ ...changeData(current, puzzle.id, next), attempted: true, completion: result.ok ? current.viewed ? 'solution' : current.hints ? 'hint' : 'independent' : null }));
  }
  const ToolWrapper = [2,4].includes(index) ? 'aside' : Fragment;
  const sceneProps = { data: item.data, edit, notify, id: puzzle.id, locked: !ready || Boolean(item.completion) };
  return <article className={`puzzle-card${index === 0 ? ` pw-stamp-case pw-stacked-case pw-postal-visual${routePhase ? ' pw-route-case' : ''}` : index === 1 ? ' pw-moon-case' : index === 2 ? ' pw-bay-case' : index === 3 ? ' pw-parcel-case' : index === 4 ? ' pw-forest-case' : ''}`} id={puzzle.id} hidden={!active} aria-labelledby={`${puzzle.id}-title`}>
    <div className="pw-layout"><div className="pw-brief"><header className="pw-card-heading">{index > 3 && <span className="puzzle-number">{puzzle.number}</span>}<div>{index === 3 && <p className="pv-stage-label">GAME 04 · THE MISCOPIED PARCEL RECORDS</p>}{index === 2 && <p className="pv-stage-label">GAME 03 · THE BLOCKED LOADING BAY</p>}{index === 1 && <p className="pv-stage-label">GAME 02 · MOON SIGNAL RESCUE</p>}{index === 0 && <p className="pv-stage-label">GAME 01 · POST OFFICE · STAGE {routePhase ? 2 : 1} OF 2</p>}{index > 3 && <span className="puzzle-category">{mechanics[index]} · {puzzle.level}</span>}<h2 id={`${puzzle.id}-title`} ref={heading} tabIndex={-1}>{index === 0 ? (routePhase ? 'What is the correct five-stop route?' : 'Which word matches each stamp record?') : index === 1 ? 'What does the final message say?' : index === 2 ? 'Can you clear the loading bay?' : index === 3 ? 'Which parcel holds the compass?' : puzzle.title}</h2></div>{index === 0 && <ol className="si-stages" aria-label="Investigation stages"><li aria-current={!routePhase ? 'step' : undefined}><button aria-label="Review first-stage records" disabled={!ready || !routePhase || Boolean(item.completion)} onClick={reviewArchive}><span>1</span> Match records{routePhase && <small>✓</small>}</button></li><li aria-current={routePhase ? 'step' : undefined}><span>2</span> Restore route</li></ol>}</header>
      {index === 0 ? <><p className="si-premise">{routePhase ? 'Start at the post office. It does not count as one of the five stops. Visit each place exactly once; deliver the letter at stop 5.' : 'Each row is one of these four words written in symbols. The word labels have been shuffled.'}</p>{!routePhase && <ul className="si-core-rules" aria-label="Puzzle rules"><li><strong>One shared code:</strong> same shape, same letter; different shapes, different letters.</li><li><strong>Use each word once.</strong> Read left to right.</li></ul>}</> : <p className="pw-task">{onlineTasks[index]}</p>}
      {index === 0 && routePhase && <><PostalHowToPlay/><PostalPocketKey code={inspectStampMatches(item.data.matches).key}/><PostalRecords code={inspectStampMatches(item.data.matches).key} errorClue={Number(feedback?.match(/record (\d+)/)?.[1])}/></>}
      {index === 3 && <ParcelRule/>}{index === 4 && <ForestMission/>}
      {index !== 3 && puzzle.clues && <ol className="puzzle-clue-cards">{puzzle.clues.map(clue => <li key={clue}>{clue}</li>)}</ol>}
      {index === 5 && <><details className="pw-story"><summary>Story & mission</summary><p>{puzzle.story}</p><p>{puzzle.task}</p></details><details className="pw-reference" ref={printedReference}><summary>Printable diagram & text description</summary><div className="puzzle-board" role="img" aria-label={puzzle.transcript} dangerouslySetInnerHTML={{ __html: puzzleSvg(puzzle.id) }}/><p className="pw-small">{puzzle.transcript}</p></details></>}

    </div><div className="pw-play-area"><span className="pw-play-label">YOUR PLAY SPACE</span><fieldset className="pw-game-controls" disabled={!ready || Boolean(item.completion)}><legend className="pw-sr-only">{mechanics[index]} controls</legend>
      {index === 0 ? <StampInvestigation {...sceneProps} showRoute={routePhase} onVerified={() => setArchiveOpen(true)} onContinue={() => { setArchiveOpen(false); notify(''); heading.current?.focus(); }} routeSelected={routeSelection} onRouteSelect={setRouteSelection} onUndo={() => update(undoItem)} canUndo={ready && Boolean(item.history.length)} onRestart={() => setResetOpen(true)}/> : index === 1 ? <MoonSignal {...sceneProps} onSubmit={check}/> : index === 2 ? <LoadingBay {...sceneProps} onMove={moveBay} nextHint={helpCount >= 3 && !item.completion}/> : index === 3 ? <ParcelEvidence {...sceneProps}/> : index === 4 ? <ForestLoop {...sceneProps} item={item} update={update}/> : <HarbourBoard {...sceneProps}/>}
    </fieldset>
    <ToolWrapper {...(index === 4 ? {className:'fl-sidebar', 'aria-label':'Forest rules and help'} : index === 2 ? {className:"lb-sidebar", "aria-label":"Rules and game tools"} : {})}>{index === 2 && <BayRules/>}{index === 4 && <ForestRules/>}
    <div className="pw-actions" hidden={index === 0 && !routePhase}>
      {index !== 2 && <button className="pw-check" disabled={!ready || Boolean(item.completion) || (index === 4 && (!item.startedAt || item.data.path.at(-1) !== 'E')) || (index === 1 && !item.data.answer) || (index === 3 && (!item.data.selected || item.data.wrongRecord === null))} onClick={check}>{item.completion ? <><Check size={18}/> Completed</> : controls[puzzle.id]}</button>}
      {(index !== 0 || routePhase) && <>
        {index !== 4 && <button disabled={!ready || !item.history.length || (Boolean(item.completion) && index !== 2)} onClick={() => update(undoItem)}><ArrowCounterClockwise size={18}/> Undo</button>}
        {index === 0 && routeSelection && item.data.route.includes(routeSelection) && <button className="pr-remove-selected" disabled={!ready || Boolean(item.completion)} onClick={removeSelected}>Remove {routeSelection}</button>}
        {index === 0 && routePhase ? <button disabled={!ready || !item.data.route.some(Boolean)} onClick={() => setClearRouteOpen(true)}>Clear route</button> : <button disabled={!ready} aria-label="Restart puzzle" onClick={() => setResetOpen(true)}>{index === 2 ? 'Restart' : 'Restart puzzle'}</button>}
      </>}
    </div>
    <p role="status" className={`pw-feedback ${item.completion ? 'success' : ''}`}>{item.completion ? `${completionNames[item.completion]}. ${puzzle.payoff}` : feedback}</p>
    {index === 0 && clearRouteOpen && <div className="pw-confirm" role="group" aria-label="Confirm clear route"><p>Clear the five route positions? Your restored key and unlocked help stay available.</p><button onClick={() => { edit({ ...item.data, route: ['', '', '', '', ''], pair: [] }); setClearRouteOpen(false); setRouteSelection(''); requestAnimationFrame(() => document.getElementById('postal-route-title')?.focus({ preventScroll: true })); }}>Clear this route</button><button onClick={() => setClearRouteOpen(false)}>Keep route</button></div>}
    {item.completion && <div className="pw-celebration"><strong>{index === 0 ? 'Delivery recorded' : 'Discovery recorded'}</strong>{index === 0 && <PostalDelivery route={item.data.route}/>}{index === 1 && <MoonConnected/>}{index === 2 && <BayDelivered/>}{index === 3 && <ParcelDelivered/>}<p>{item.completion === 'solution' ? 'You completed this puzzle after opening its explanation. Try it again later without the solution.' : 'Your actions fit the clues. Tell someone how you worked it out.'}</p><button className="pw-check" onClick={chooseNext}>{index === 5 ? 'Choose another puzzle' : 'Try the next puzzle'} <ArrowRight size={18}/></button><a href="#print-puzzles">Get the printable sheets</a></div>}
    {resetOpen && <div className="pw-confirm" role="group" aria-label="Confirm puzzle restart"><p>Clear this puzzle’s moves, hints and completion? The other five puzzles stay saved.</p><button onClick={() => { restart(); setResetOpen(false); setSolutionOpen(false); setSolutionConfirm(false); heading.current?.focus(); }}>Restart this puzzle</button><button onClick={() => setResetOpen(false)}>Keep playing</button></div>}
    {index < 5 && <h3 className="pv-help-title">Need a hint?</h3>}
    {creditPreview ? <CreditHelp renderSolution={index === 4 ? () => <ForestExplanation/> : index === 3 ? () => <ParcelExplanation/> : index === 2 ? () => <BayWalkthrough positions={item.completion ? bayStart : item.data.positions} fromStart={Boolean(item.completion)}/> : undefined} puzzle={helpPuzzle} item={{ ...item, hints: helpCount }} credits={credits} grant={kind => {
      update(current => kind === 'solution' ? { ...current, viewed: current.completion ? current.viewed : true, ...([3,4].includes(index) ? { hints: 3 } : {}) } : { ...current, [helpField]: Math.max(current[helpField] || 0, Number(kind.split('-')[1])) });
      if (kind !== 'solution') trackConversionEvent('puzzle_hint_open', { puzzle: puzzle.id });
    }}/> : <>
    <div className="pw-help"><button disabled={!ready || helpCount >= 3 || Boolean(item.completion)} onClick={() => { update(current => ({ ...current, [helpField]: Math.min(3, (current[helpField] || 0) + 1) })); trackConversionEvent('puzzle_hint_open', { puzzle: puzzle.id }); }}><Lightbulb size={18}/>{helpCount >= 3 ? 'All hints shown' : `Show hint ${helpCount + 1} of 3`}</button><button aria-expanded={solutionOpen || solutionConfirm} aria-controls={`${puzzle.id}-solution`} disabled={!ready} onClick={() => { if (solutionOpen) setSolutionOpen(false); else if (item.completion || item.viewed) showSolution(); else setSolutionConfirm(true); }}>{solutionOpen ? 'Hide explanation' : item.completion ? 'Read explanation' : 'Reveal solution'}</button></div>
    {helpCount > 0 && <ol className="puzzle-hints">{helpPuzzle.hints.slice(0, helpCount).map((hint, i) => <li key={i}><strong>Hint {i + 1}</strong><p>{hint}</p></li>)}</ol>}
    {solutionConfirm && <div className="pw-confirm"><p>This reveals the answer. Completing afterwards will be marked “after viewing solution”.</p><button onClick={showSolution}>Show solution</button><button onClick={() => setSolutionConfirm(false)}>Keep solving</button></div>}
    </>}
    </ToolWrapper>
    <div className="puzzle-solution" id={`${puzzle.id}-solution`} hidden={!solutionOpen}><p>{![3,4].includes(index) && <><strong>{puzzle.answer}.</strong> </>}{helpPuzzle.solution}</p>{index === 2 && <BayWalkthrough positions={item.completion ? bayStart : item.data.positions} fromStart={Boolean(item.completion)}/>} {index === 3 && <ParcelExplanation/>}{index === 4 && <ForestExplanation/>}<p className="pw-small">The explanation does not fill or complete the puzzle for you.</p></div>
    </div></div>
    {index === 4 && item.legacyForestCompletion && <p className="fl-legacy">Your earlier letter-trail result is kept separately. This rescue challenge is new; your other five games stay saved.</p>}
    {index === 3 && item.legacyParcelCompletion && <p className="pr-legacy">Your earlier parcel result is kept separately. This hidden-ledger investigation is new; your other games stay saved.</p>}
    {index === 2 && item.legacyBayCompletion && <p className="pr-legacy">Your earlier result is saved separately. This harder loading-bay layout is new; your other games stay saved.</p>}
    {index === 1 && item.legacySignalCompletion && <p className="pr-legacy">You completed an earlier Moon message. This scrambled-message investigation is new; your other saved games are kept.</p>}
    {index === 0 && item.legacyCompletion && <p className="pr-legacy">Earlier edition: completed the POOL delivery. The five-stop route is a new challenge.</p>}
  </article>;
}

export default function PuzzleWorkshop() {
  const [state, setState] = useState(freshWorkshop);
  const [ready, setReady] = useState(false);
  const [storage, setStorage] = useState('loading');
  const [feedback, setFeedback] = useState({});
  const [clearOpen, setClearOpen] = useState(false);
  const [round, setRound] = useState(0);
  const [stampUpdated, setStampUpdated] = useState(false);
  const [creditPreview, setCreditPreview] = useState(false);
  const credits = useCreditPreview(creditPreview, ready, state);
  useEffect(() => { if (import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(window.location.hostname)) setCreditPreview(true); }, []);
  const title = useRef(null);
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    let restored = freshWorkshop();
    try { const raw = localStorage.getItem(workshopKey); if (raw) { try { const parsed = JSON.parse(raw); restored = restoreWorkshop(parsed); setStampUpdated(parsed?.version === 2 && Boolean(parsed.items?.['stamp-code']) && parsed.items['stamp-code'].data?.edition !== stampEdition); } catch { setStorage('recovered'); } } }
    catch { setStorage('unavailable'); }
    const requested = window.location.hash.slice(1);
    if (freePuzzles.some(p => p.id === requested)) restored.active = requested;
    setState(restored);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(workshopKey, JSON.stringify(state)); setStorage(current => current === 'recovered' ? current : 'saved'); }
    catch { setStorage('unavailable'); }
  }, [state, ready]);
  function update(id, transform) { setFeedback(old => ({ ...old, [id]: '' })); setState(old => ({ ...old, items: { ...old.items, [id]: transform(old.items[id]) } })); }
  function select(id, focus = false) {
    setState(old => ({ ...old, active: id }));
    window.history.replaceState(window.history.state, '', `#${id}`);
    if (focus) requestAnimationFrame(() => { document.getElementById('try-puzzles')?.scrollIntoView({ block: 'start', behavior: 'instant' }); document.getElementById(`${id}-title`)?.focus({ preventScroll: true }); });
  }
  function check(id) {
    const item = state.items[id], result = checkWorkshop(id, item.data);
    setFeedback(old => ({ ...old, [id]: result.message }));
    if (!item.attempted) trackConversionEvent('puzzle_attempt', { puzzle: id });
    const assistance = item.viewed ? 'solution' : (item.hints || item.routeHints) ? 'hint' : 'none';
    if (result.ok && !item.completion) trackConversionEvent('puzzle_solved', { puzzle: id, assistance });
    setState(old => ({ ...old, items: { ...old.items, [id]: { ...old.items[id], attempted: true, completion: result.ok ? item.viewed ? 'solution' : (item.hints || item.routeHints) ? 'hint' : 'independent' : null } } }));
  }
  const completed = Object.values(state.items).filter(i => i.completion).length;
  const activeIndex = freePuzzles.findIndex(p => p.id === state.active);
  const activePuzzle = freePuzzles[activeIndex];
  return <section id="try-puzzles" className="pw-workshop pw-entry-workshop puzzle-shell" aria-labelledby="pw-title">
    <header className="pw-entry-toolbar" ref={title} tabIndex={-1}>
      <div className="pw-entry-heading"><h1 id="pw-title">Free escape room puzzles</h1><p>For kids · Play online or print</p></div>
      <nav className="pw-entry-picker" aria-label="Puzzle navigation"><button aria-label="Previous puzzle" disabled={!ready || activeIndex === 0} onClick={() => select(freePuzzles[activeIndex - 1].id, true)}><ArrowLeft size={18}/></button><label><span className="pw-sr-only">Choose a puzzle</span><select disabled={!ready} value={state.active} onChange={e => select(e.target.value)}>{freePuzzles.map((p, i) => <option key={p.id} value={p.id}>{p.number} · {shortTitles[i]}{state.items[p.id].completion ? ' · solved' : ''}</option>)}</select></label><button aria-label="Next puzzle" disabled={!ready || activeIndex === freePuzzles.length - 1} onClick={() => select(freePuzzles[activeIndex + 1].id, true)}><ArrowRight size={18}/></button></nav>
      <div className="pw-entry-progress" role="status"><strong>{completed}/6</strong><span>solved</span></div><a className="pw-entry-print" href="#print-puzzles">Print PDFs</a>
    </header>
    <div className="pw-game-stack">{freePuzzles.map((puzzle, index) => <InteractiveCard creditPreview={creditPreview} credits={credits} key={`${puzzle.id}-${state.items[puzzle.id].revision || 0}-${round}`} puzzle={puzzle} index={index} item={state.items[puzzle.id]} ready={ready} active={state.active === puzzle.id} update={transform => update(puzzle.id, transform)} edit={data => update(puzzle.id, item => changeData(item, puzzle.id, data))} check={() => check(puzzle.id)} feedback={feedback[puzzle.id] || ''} notify={message => setFeedback(old => ({ ...old, [puzzle.id]: message }))} restart={() => { update(puzzle.id, old => ({ ...freshItem(puzzle.id), ...(puzzle.id === 'stamp-code' ? { legacyCompletion: old.legacyCompletion } : puzzle.id === 'forest-trail' ? { legacyForestCompletion: old.legacyForestCompletion } : puzzle.id === 'shared-parcel' ? { legacyParcelCompletion: old.legacyParcelCompletion } : {}), revision: (old.revision || 0) + 1 })); requestAnimationFrame(() => document.getElementById(`${puzzle.id}-title`)?.focus()); }} chooseNext={() => select(freePuzzles[(index + 1) % 6].id, true)}/>)}</div>
    <div className="pw-case-context"><strong>About this case · {activePuzzle.title}</strong><p>{activePuzzle.story}</p></div>
    {stampUpdated && <p className="si-edition-note">Puzzle 1 now has a five-stop route. Valid record matches and the restored key are kept; an earlier POOL completion is recorded separately. Your other five saved puzzles are kept.</p>}
    <div className="pw-storage"><p role="status">{!ready ? 'Loading saved progress…' : storage === 'unavailable' ? 'Browser saving is unavailable. You can keep playing, but progress may be lost when you leave or reload.' : storage === 'recovered' ? 'An unreadable save was reset. New progress is saved in this browser.' : 'Progress saves automatically in this browser, including moves and hints. It does not sync to other devices.'}</p><button disabled={!ready} onClick={() => setClearOpen(true)}>Clear saved progress</button></div>
    {clearOpen && <div className="pw-confirm"><p>Clear all six puzzles, hints and completion records in this browser?</p><button onClick={() => { setState(freshWorkshop()); setRound(n => n + 1); setFeedback({}); setClearOpen(false); window.history.replaceState(window.history.state, '', '#stamp-code'); title.current?.focus(); }}>Clear all progress</button><button onClick={() => setClearOpen(false)}>Keep progress</button></div>}
    <p className="pw-small pw-storage-note">Your moves stay on this device. Puzzle event counts use fixed puzzle IDs and help-use labels, not typed answers. Prefer paper? Matching player sheets and a separate answer guide are below.</p>
  </section>;
}
