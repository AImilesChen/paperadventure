import { t as translateUi, localHref } from "./i18n/index.mjs";import HarbourLights, { HarbourMission, HarbourRules, HarbourExplanation } from './HarbourLights.jsx';
import './puzzleLobby.css';
import { lightHints } from '../shared/harbour-lights.mjs';
import ForestLoop, { ForestRules, ForestExplanation, ForestMission } from './ForestLoop.jsx';
import { forestHints } from '../shared/forest-loop.mjs';
import ParcelEvidence, { ParcelRule, ParcelDelivered, ParcelExplanation } from './ParcelEvidence.jsx';
import LoadingBay, { BayWalkthrough, BayDelivered, BayRules } from './LoadingBay.jsx';
import { bayStart, bayHints, baySolution, checkBay } from '../shared/loading-bay.mjs';
import MoonSignal, { MoonConnected } from './MoonSignal.jsx';
import { Fragment, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ArrowCounterClockwise, Check, Lightbulb } from '@phosphor-icons/react';
import { freePuzzles, puzzleSvg, trailGrid, trailMoves, harbourNodes, harbourBridges } from '../shared/free-puzzles.mjs';
import CreditHelp, { useGameCredits } from './gameCreditHelp.jsx';
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

const shortTitles = ['Post office', 'Moon message', 'Loading bay', 'Parcel clues', 'Forest trail', 'Harbour circuit'];
const mechanics = ['Infer a code', 'Decode a message', 'Move the crates', 'Compare evidence', 'Reconstruct a route', 'Restore the circuit'];
const onlineTasks = [
'Restore the key, then reconstruct the five-stop delivery route.',
'Discover the rule in three records. Decode the final message to restore contact with the rescue ship.',
'Slide the other crates to get red parcel X out through the right-hand exit.',
'Find the parcel holding the compass and the one false copied note.',
'Reconstruct the ranger’s journey from S to E using the recovered evidence. Some places were never visited.',
'Switch all 36 navigation lights on.'];

const completionNames = { independent: 'Solved independently', hint: 'Solved with hints', solution: 'Completed after viewing solution' };
const lobbyDetails = [['Symbol decoding · Route reasoning', 'Compare old records to crack a symbol code, then rebuild the delivery route.'], ['Letter decoding', 'Adjust letter relationships to translate the moon station’s secret message.'], ['Spatial reasoning', 'Slide the blocking crates to deliver the urgent parcel through the exit.'], ['Evidence investigation', 'Compare records and notes to identify the target parcel and the false clue.'], ['Evidence · Route reconstruction', 'Inspect traces and landmarks to reconstruct the missing patrol route.'], ['Switch logic', 'Plan overlapping switch effects to restore all 36 navigation lights.']];
const controls = { 'stamp-code': 'Check delivery route', 'signal-shift': 'Check answer', 'parcel-queue': 'Delivery complete', 'shared-parcel': 'Check my judgment', 'forest-trail': 'Submit route', 'harbour-route': 'Check circuit' };

function InteractiveCard({ puzzle, index, item, active, ready, update, edit, check, feedback, notify, restart, chooseNext, credits }) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const routePhase = index === 0 && item.data.verified && !archiveOpen;
  const [resetOpen, setResetOpen] = useState(false);
  const heading = useRef(null);
  const printedReference = useRef(null);
  const [routeSelection, setRouteSelection] = useState('');
  const [clearRouteOpen, setClearRouteOpen] = useState(false);
  useEffect(() => {setRouteSelection('');}, [item.data]);
  function removeSelected() {
    if (!ready || item.completion || !routeSelection) return;
    edit({ ...item.data, route: item.data.route.map((word) => routeSelection === word ? '' : word), pair: [] });
    setRouteSelection('');notify('');
  }
  function reviewArchive() {
    setClearRouteOpen(false);
    setArchiveOpen(true);
    requestAnimationFrame(() => {heading.current?.focus({ preventScroll: true });heading.current?.closest('article')?.scrollIntoView({ block: 'start', behavior: 'instant' });});
  }

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 701px)');
    const fitReference = () => {if (printedReference.current) printedReference.current.open = !['stamp-code', 'signal-shift', 'parcel-queue'].includes(puzzle.id) && desktop.matches;};
    fitReference();desktop.addEventListener('change', fitReference);
    return () => desktop.removeEventListener('change', fitReference);
  }, []);
  const helpField = index === 0 && routePhase ? 'routeHints' : 'hints';
  const helpCount = item[helpField] || 0;
  const helpPuzzle = index === 5 ? { ...puzzle, hints: lightHints(item.data) } : index === 4 ? { ...puzzle, hints: forestHints(item.data) } : index === 2 ? { ...puzzle, hints: bayHints(item.completion ? bayStart : item.data.positions), solution: baySolution(item.completion ? bayStart : item.data.positions) } : helpField === 'routeHints' ? { ...puzzle, hints: puzzle.routeHints } : puzzle;
  function moveBay(next) {
    if (!ready || item.completion) return;
    const result = checkBay(next);
    if (!item.attempted) trackConversionEvent('puzzle_attempt', { puzzle: puzzle.id });
    if (result.ok) trackConversionEvent('puzzle_solved', { puzzle: puzzle.id, assistance: item.viewed ? 'solution' : item.hints ? 'hint' : 'none' });
    update((current) => ({ ...changeData(current, puzzle.id, next), attempted: true, completion: result.ok ? current.viewed ? 'solution' : current.hints ? 'hint' : 'independent' : null }));
  }
  const ToolWrapper = [2, 4, 5].includes(index) ? 'aside' : Fragment;
  const sceneProps = { data: item.data, edit, notify, id: puzzle.id, locked: !ready || Boolean(item.completion) };
  return <article className={`puzzle-card${index === 0 ? ` pw-stamp-case pw-stacked-case pw-postal-visual${routePhase ? ' pw-route-case' : ''}` : index === 1 ? ' pw-moon-case' : index === 2 ? ' pw-bay-case' : index === 3 ? ' pw-parcel-case' : index === 4 ? ' pw-forest-case' : index === 5 ? ' pw-harbour-lights' : ''}`} id={puzzle.id} hidden={!active} aria-labelledby={`${puzzle.id}-title`}>
    <div className="pw-layout"><div className="pw-brief"><header className="pw-card-heading">{index > 3 && <span className="puzzle-number">{translateUi(puzzle.number)}</span>}<div>{index === 3 && <p className="pv-stage-label">{translateUi("GAME 04 \xB7 THE MISCOPIED PARCEL RECORDS")}</p>}{index === 2 && <p className="pv-stage-label">{translateUi("GAME 03 \xB7 THE BLOCKED LOADING BAY")}</p>}{index === 1 && <p className="pv-stage-label">{translateUi("GAME 02 \xB7 MOON SIGNAL RESCUE")}</p>}{index === 0 && <p className="pv-stage-label">{translateUi("GAME 01 \xB7 POST OFFICE \xB7 STAGE ")}{routePhase ? 2 : 1}{translateUi(" OF 2")}</p>}{index > 3 && <span className="puzzle-category">{translateUi(mechanics[index])} · {translateUi(puzzle.level)}</span>}<h2 id={`${puzzle.id}-title`} ref={heading} tabIndex={-1}>{index === 0 ? routePhase ? translateUi('What is the correct five-stop route?') : translateUi('Which word matches each stamp record?') : index === 1 ? translateUi('What does the final message say?') : index === 2 ? translateUi('Can you clear the loading bay?') : index === 3 ? translateUi('Which parcel holds the compass?') : translateUi(puzzle.title)}</h2></div>{index === 0 && <ol className="si-stages" aria-label={translateUi("Investigation stages")}><li aria-current={!routePhase ? 'step' : undefined}><button aria-label={translateUi("Review first-stage records")} disabled={!ready || !routePhase || Boolean(item.completion)} onClick={reviewArchive}><span>1</span>{translateUi(" Match records")}{routePhase && <small>✓</small>}</button></li><li aria-current={routePhase ? 'step' : undefined}><span>2</span>{translateUi(" Restore route")}</li></ol>}</header>
      {index === 0 ? <><p className="si-premise">{routePhase ? translateUi('Start at the post office. It does not count as one of the five stops. Visit each place exactly once; deliver the letter at stop 5.') : translateUi('Each row is one of these four words written in symbols. The word labels have been shuffled.')}</p>{!routePhase && <ul className="si-core-rules" aria-label={translateUi("Puzzle rules")}><li><strong>{translateUi("One shared code:")}</strong>{translateUi(" same shape, same letter; different shapes, different letters.")}</li><li><strong>{translateUi("Use each word once.")}</strong>{translateUi(" Read left to right.")}</li></ul>}</> : <p className="pw-task">{translateUi(onlineTasks[index])}</p>}
      {index === 0 && routePhase && <><PostalHowToPlay /><PostalPocketKey code={inspectStampMatches(item.data.matches).key} /><PostalRecords code={inspectStampMatches(item.data.matches).key} errorClue={Number(feedback?.match(/record (\d+)/)?.[1])} /></>}
      {index === 3 && <ParcelRule />}{index === 4 && <ForestMission />}{index === 5 && <HarbourMission />}
      {index !== 3 && puzzle.clues && <ol className="puzzle-clue-cards">{puzzle.clues.map((clue) => <li key={clue}>{translateUi(clue)}</li>)}</ol>}


    </div><div className="pw-play-area"><span className="pw-play-label">{translateUi("YOUR PLAY SPACE")}</span><fieldset className="pw-game-controls" disabled={!ready || Boolean(item.completion)}><legend className="pw-sr-only">{translateUi(mechanics[index])}{translateUi(" controls")}</legend>
      {index === 0 ? <StampInvestigation {...sceneProps} showRoute={routePhase} onVerified={() => setArchiveOpen(true)} onContinue={() => {setArchiveOpen(false);notify('');heading.current?.focus();}} routeSelected={routeSelection} onRouteSelect={setRouteSelection} onUndo={() => update(undoItem)} canUndo={ready && Boolean(item.history.length)} onRestart={() => setResetOpen(true)} /> : index === 1 ? <MoonSignal {...sceneProps} onSubmit={check} /> : index === 2 ? <LoadingBay {...sceneProps} onMove={moveBay} nextHint={helpCount >= 3 && !item.completion} /> : index === 3 ? <ParcelEvidence {...sceneProps} /> : index === 4 ? <ForestLoop {...sceneProps} item={item} update={update} /> : <HarbourLights {...sceneProps} item={item} update={update} checked={Boolean(feedback)} />}
    </fieldset>
    <ToolWrapper {...index === 5 ? { className: 'hl-sidebar', 'aria-label': 'Circuit rules and tools' } : index === 4 ? { className: 'fl-sidebar', 'aria-label': 'Forest rules and help' } : index === 2 ? { className: "lb-sidebar", "aria-label": "Rules and game tools" } : {}}>{index === 2 && <BayRules />}{index === 4 && <ForestRules />}{index === 5 && <HarbourRules />}
    <div className="pw-actions" hidden={index === 0 && !routePhase}>
      {index !== 2 && <button className="pw-check" disabled={!ready || Boolean(item.completion) || index === 4 && (!item.startedAt || item.data.path.at(-1) !== 'E') || index === 1 && !item.data.answer || index === 3 && (!item.data.selected || item.data.wrongRecord === null)} onClick={check}>{item.completion ? <><Check size={18} />{translateUi(" Completed")}</> : translateUi(controls[puzzle.id])}</button>}
      {(index !== 0 || routePhase) && <>
        {![4, 5].includes(index) && <button disabled={!ready || !item.history.length || Boolean(item.completion) && index !== 2} onClick={() => update(undoItem)}><ArrowCounterClockwise size={18} />{translateUi(" Undo")}</button>}
        {index === 0 && routeSelection && item.data.route.includes(routeSelection) && <button className="pr-remove-selected" disabled={!ready || Boolean(item.completion)} onClick={removeSelected}>{translateUi("Remove ")}{translateUi(routeSelection)}</button>}
        {index === 0 && routePhase ? <button disabled={!ready || !item.data.route.some(Boolean)} onClick={() => setClearRouteOpen(true)}>{translateUi("Clear route")}</button> : <button disabled={!ready} aria-label={translateUi("Restart puzzle")} onClick={() => setResetOpen(true)}>{index === 2 ? translateUi('Restart') : translateUi('Restart puzzle')}</button>}
      </>}
    </div>
    <p role="status" className={`pw-feedback ${item.completion ? 'success' : ''}`}>{item.completion ? translateUi("{value0}. {value1}", { value0: completionNames[item.completion], value1: puzzle.payoff }) : translateUi(feedback)}</p>
    {index === 0 && clearRouteOpen && <div className="pw-confirm" role="group" aria-label={translateUi("Confirm clear route")}><p>{translateUi("Clear the five route positions? Your restored key and unlocked help stay available.")}</p><button onClick={() => {edit({ ...item.data, route: ['', '', '', '', ''], pair: [] });setClearRouteOpen(false);setRouteSelection('');requestAnimationFrame(() => document.getElementById('postal-route-title')?.focus({ preventScroll: true }));}}>{translateUi("Clear this route")}</button><button onClick={() => setClearRouteOpen(false)}>{translateUi("Keep route")}</button></div>}
    {item.completion && <div className="pw-celebration"><strong>{index === 0 ? translateUi('Delivery recorded') : translateUi('Discovery recorded')}</strong>{index === 0 && <PostalDelivery route={item.data.route} />}{index === 1 && <MoonConnected />}{index === 2 && <BayDelivered />}{index === 3 && <ParcelDelivered />}<p>{item.completion === 'solution' ? translateUi('You completed this puzzle after opening its explanation. Try it again later without the solution.') : translateUi('Your actions fit the clues. Tell someone how you worked it out.')}</p><button className="pw-check" onClick={chooseNext}>{index === 5 ? translateUi('Choose another puzzle') : translateUi('Try the next puzzle')} <ArrowRight size={18} /></button><a href="#print-puzzles">{translateUi("Get the printable sheets")}</a></div>}
    {resetOpen && <div className="pw-confirm" role="group" aria-label={translateUi("Confirm puzzle restart")}><p>{translateUi("Clear this puzzle\u2019s moves, hints and completion? The other five puzzles stay saved.")}</p><button onClick={() => {restart();setResetOpen(false);heading.current?.focus();}}>{translateUi("Restart this puzzle")}</button><button onClick={() => setResetOpen(false)}>{translateUi("Keep playing")}</button></div>}
    {index < 6 && <h3 className="pv-help-title">{translateUi("Need a hint?")}</h3>}
    <CreditHelp renderSolution={index === 5 ? () => <HarbourExplanation /> : index === 4 ? () => <ForestExplanation /> : index === 3 ? () => <ParcelExplanation /> : index === 2 ? () => <BayWalkthrough positions={item.completion ? bayStart : item.data.positions} fromStart={Boolean(item.completion)} /> : undefined} puzzle={helpPuzzle} item={{ ...item, hints: helpCount }} credits={credits} grant={(kind) => {
            update((current) => kind === 'solution' ? { ...current, viewed: current.completion ? current.viewed : true, [helpField]: 3 } : { ...current, [helpField]: Math.max(current[helpField] || 0, Number(kind.split('-')[1])) });
            if (kind !== 'solution') trackConversionEvent('puzzle_hint_open', { puzzle: puzzle.id });
          }} />
    </ToolWrapper>
    </div></div>
    {index === 5 && item.legacyHarbourCompletion && <p className="hl-legacy">{translateUi("Your earlier harbour result is kept separately. This switch circuit is new; your other five games stay saved.")}</p>}
    {index === 4 && item.legacyForestCompletion && <p className="fl-legacy">{translateUi("Your earlier letter-trail result is kept separately. This rescue challenge is new; your other five games stay saved.")}</p>}
    {index === 3 && item.legacyParcelCompletion && <p className="pr-legacy">{translateUi("Your earlier parcel result is kept separately. This hidden-ledger investigation is new; your other games stay saved.")}</p>}
    {index === 2 && item.legacyBayCompletion && <p className="pr-legacy">{translateUi("Your earlier result is saved separately. This harder loading-bay layout is new; your other games stay saved.")}</p>}
    {index === 1 && item.legacySignalCompletion && <p className="pr-legacy">{translateUi("You completed an earlier Moon message. This scrambled-message investigation is new; your other saved games are kept.")}</p>}
    {index === 0 && item.legacyCompletion && <p className="pr-legacy">{translateUi("Earlier edition: completed the POOL delivery. The five-stop route is a new challenge.")}</p>}
  </article>;
}

export default function PuzzleWorkshop() {
  const [state, setState] = useState(freshWorkshop);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [resume, setResume] = useState(null);
  const [storage, setStorage] = useState('loading');
  const [feedback, setFeedback] = useState({});
  const [clearOpen, setClearOpen] = useState(false);
  const [round, setRound] = useState(0);
  const [stampUpdated, setStampUpdated] = useState(false);
  const accountCredits = useGameCredits(ready);
  const credits = { ...accountCredits, saveForLeave: () => {try {localStorage.setItem(workshopKey, JSON.stringify(state));return true;} catch {setStorage('unavailable');return false;}} };
  const title = useRef(null);
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    let restored = freshWorkshop();
    try {const raw = localStorage.getItem(workshopKey);if (raw) {try {const parsed = JSON.parse(raw);restored = restoreWorkshop(parsed);setStampUpdated(parsed?.version === 2 && Boolean(parsed.items?.['stamp-code']) && parsed.items['stamp-code'].data?.edition !== stampEdition);} catch {setStorage('recovered');}}}
    catch {setStorage('unavailable');}
    const requested = window.location.hash.slice(1);
    if (freePuzzles.some((p) => p.id === requested)) {restored.active = requested;setPlaying(true);requestAnimationFrame(() => document.getElementById(requested + '-title')?.focus());}
    if (Object.values(restored.items).some((i) => i.history.length || i.attempted || i.hints || i.viewed)) setResume(restored.active);
    setState(restored);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {localStorage.setItem(workshopKey, JSON.stringify(state));setStorage((current) => current === 'recovered' ? current : 'saved');}
    catch {setStorage('unavailable');}
  }, [state, ready]);
  useEffect(() => {function navigateHash() {const id = window.location.hash.slice(1);if (freePuzzles.some((p) => p.id === id)) {setPlaying(true);setState((old) => ({ ...old, active: id }));requestAnimationFrame(() => document.getElementById(id + '-title')?.focus());} else if (id === 'puzzle-directory') setPlaying(false);}window.addEventListener('hashchange', navigateHash);return () => window.removeEventListener('hashchange', navigateHash);}, []);
  function update(id, transform) {setFeedback((old) => ({ ...old, [id]: '' }));setState((old) => ({ ...old, items: { ...old.items, [id]: transform(old.items[id]) } }));}
  function select(id, focus = false) {
    trackConversionEvent('puzzle_select', { puzzle: id });setPlaying(true);setResume(id);
    setState((old) => ({ ...old, active: id }));
    window.history.replaceState(window.history.state, '', `#${id}`);
    if (focus) requestAnimationFrame(() => {document.getElementById('puzzle-play')?.scrollIntoView({ block: 'start', behavior: 'instant' });document.getElementById(`${id}-title`)?.focus({ preventScroll: true });});
  }
  function check(id) {
    const item = state.items[id],result = checkWorkshop(id, item.data);
    setFeedback((old) => ({ ...old, [id]: result.message }));
    if (!item.attempted) trackConversionEvent('puzzle_attempt', { puzzle: id });
    const assistance = item.viewed ? 'solution' : item.hints || item.routeHints ? 'hint' : 'none';
    if (result.ok && !item.completion) trackConversionEvent('puzzle_solved', { puzzle: id, assistance });
    setState((old) => ({ ...old, items: { ...old.items, [id]: { ...old.items[id], attempted: true, completion: result.ok ? item.viewed ? 'solution' : item.hints || item.routeHints ? 'hint' : 'independent' : null } } }));
  }
  function directory() {setPlaying(false);window.history.replaceState(window.history.state, '', '#puzzle-directory');requestAnimationFrame(() => {document.getElementById('puzzle-directory')?.scrollIntoView({ block: 'start' });document.getElementById('pick-' + state.active)?.focus({ preventScroll: true });});}
  function gameCard(p, i, compact = false) {const item = state.items[p.id],started = item.history.length || item.attempted || item.hints || item.viewed;return <article className="lobby-card" key={p.id}><div className="lobby-preview" role="img" aria-label={translateUi("{value0} initial puzzle preview", { value0: shortTitles[i] })} dangerouslySetInnerHTML={{ __html: puzzleSvg(p.id) }} /><div className="lobby-card-body"><span className="lobby-tag">{translateUi(p.number)} · {translateUi(lobbyDetails[i][0])}</span><h3>{translateUi(shortTitles[i])}</h3><p>{translateUi(lobbyDetails[i][1])}</p><span className="lobby-state">{translateUi(p.level)} · {item.completion ? translateUi('✓ Completed') : started ? translateUi('◐ In progress') : translateUi('○ Not started')}</span><button id={compact ? undefined : 'pick-' + p.id} disabled={!ready} onClick={() => select(p.id, true)}>{item.completion ? translateUi('Review challenge') : started ? translateUi('Continue challenge') : translateUi('Start challenge')}<span className="pw-sr-only"> · {translateUi(shortTitles[i])}</span></button></div></article>;}
  const completed = Object.values(state.items).filter((i) => i.completion).length;
  const activeIndex = freePuzzles.findIndex((p) => p.id === state.active);
  const activePuzzle = freePuzzles[activeIndex];
  return <section id="try-puzzles" className="pw-workshop pw-entry-workshop puzzle-shell" aria-labelledby="pw-title">
    <div className="lobby-intro"><span className="lobby-tag">{translateUi("SIX FREE CHALLENGES \xB7 NO ACCOUNT NEEDED")}</span><h1 id="pw-title">{translateUi("Free escape room puzzles")}</h1><p>{translateUi("Six puzzles. Six ways to solve. Play free with a first hint in each game. Deeper hints and explained answers use optional shared AI credits. Your moves save in this browser.")}</p>{ready && resume && <div className="lobby-resume">{translateUi("Last played: ")}<strong>{translateUi(shortTitles[freePuzzles.findIndex((p) => p.id === resume)])}</strong><button onClick={() => select(resume, true)}>{translateUi("Continue last game")}</button></div>}</div>
    <p className="sd-lobby-link"><a href={localHref("/en/sudoku/")}>{translateUi("New: Sudoku adventure \xB7 progressive levels, thinking hints and a leaderboard \u2192")}</a></p>
    <section id="puzzle-directory" className="lobby-directory" aria-labelledby="lobby-title"><div className="lobby-heading"><div><h2 id="lobby-title">{translateUi("Choose your challenge")}</h2><p>{translateUi("All six games are independent. Explore them in any order.")}</p></div><span>{translateUi(completed)}{translateUi(" of 6 completed")}</span></div><div className="lobby-grid">{translateUi(freePuzzles.map((p, i) => gameCard(p, i)))}</div></section>
    <div id="puzzle-play" hidden={!playing}>
    <header className="pw-entry-toolbar" ref={title} tabIndex={-1}>
      <div className="pw-entry-heading"><button className="lobby-back" onClick={directory}>{translateUi("\u2190 All 6 games")}</button><p>{translateUi("Progress saves as you play")}</p></div>
      <nav className="pw-entry-picker" aria-label={translateUi("Puzzle navigation")}><button aria-label={translateUi("Previous puzzle")} disabled={!ready || activeIndex === 0} onClick={() => select(freePuzzles[activeIndex - 1].id, true)}><ArrowLeft size={18} /></button><label><span className="pw-sr-only">{translateUi("Choose a puzzle")}</span><select disabled={!ready} value={state.active} onChange={(e) => select(e.target.value, true)}>{freePuzzles.map((p, i) => <option key={p.id} value={p.id}>{translateUi(p.number)} · {translateUi(shortTitles[i])}{state.items[p.id].completion ? translateUi(' · solved') : translateUi('')}</option>)}</select></label><button aria-label={translateUi("Next puzzle")} disabled={!ready || activeIndex === freePuzzles.length - 1} onClick={() => select(freePuzzles[activeIndex + 1].id, true)}><ArrowRight size={18} /></button></nav>
      <div className="pw-entry-progress" role="status"><strong>{translateUi(completed)}/6</strong><span>{translateUi("solved")}</span></div><a className="pw-entry-print" href="#print-puzzles">{translateUi("Print PDFs")}</a>
    </header>
    <div className="pw-game-stack">{freePuzzles.map((puzzle, index) => <InteractiveCard credits={credits} key={`${puzzle.id}-${state.items[puzzle.id].revision || 0}-${round}`} puzzle={puzzle} index={index} item={state.items[puzzle.id]} ready={ready} active={playing && state.active === puzzle.id} update={(transform) => update(puzzle.id, transform)} edit={(data) => update(puzzle.id, (item) => changeData(item, puzzle.id, data))} check={() => check(puzzle.id)} feedback={feedback[puzzle.id] || ''} notify={(message) => setFeedback((old) => ({ ...old, [puzzle.id]: message }))} restart={() => {update(puzzle.id, (old) => ({ ...freshItem(puzzle.id), ...(puzzle.id === 'stamp-code' ? { legacyCompletion: old.legacyCompletion } : puzzle.id === 'harbour-route' ? { legacyHarbourCompletion: old.legacyHarbourCompletion } : puzzle.id === 'forest-trail' ? { legacyForestCompletion: old.legacyForestCompletion } : puzzle.id === 'shared-parcel' ? { legacyParcelCompletion: old.legacyParcelCompletion } : {}), revision: (old.revision || 0) + 1 }));requestAnimationFrame(() => document.getElementById(`${puzzle.id}-title`)?.focus());}} chooseNext={() => select(freePuzzles[(index + 1) % 6].id, true)} />)}</div>
    <div className="pw-case-context"><strong>{translateUi("About this case \xB7 ")}{translateUi(activePuzzle.title)}</strong><p>{translateUi(activePuzzle.story)}</p></div>
    <section className="lobby-recommend" aria-label={translateUi("Other challenges")}><h2>{state.items[state.active].completion ? translateUi('What will you try next?') : translateUi('Try a different challenge')}</h2><p>{translateUi("Your current progress stays saved. Choose another way to solve.")}</p><div className="lobby-grid lobby-pair">{translateUi(freePuzzles.map((p, i) => ({ p, i })).filter(({ p }) => p.id !== state.active).sort((a, b) => Boolean(state.items[a.p.id].completion) - Boolean(state.items[b.p.id].completion) || (a.p.category === activePuzzle.category) - (b.p.category === activePuzzle.category)).slice(0, 2).map(({ p, i }) => gameCard(p, i, true)))}</div><button onClick={directory}>{translateUi("View all 6 games")}</button></section>
    </div>
    {stampUpdated && <p className="si-edition-note">{translateUi("Puzzle 1 now has a five-stop route. Valid record matches and the restored key are kept; an earlier POOL completion is recorded separately. Your other five saved puzzles are kept.")}</p>}
    <div className="pw-storage"><p role="status">{!ready ? translateUi('Loading saved progress…') : storage === 'unavailable' ? translateUi('Browser saving is unavailable. You can keep playing, but progress may be lost when you leave or reload.') : storage === 'recovered' ? translateUi('An unreadable save was reset. New progress is saved in this browser.') : translateUi('Progress saves automatically in this browser, including moves and hints. It does not sync to other devices.')}</p><button disabled={!ready} onClick={() => setClearOpen(true)}>{translateUi("Clear saved progress")}</button></div>
    {clearOpen && <div className="pw-confirm"><p>{translateUi("Clear all six puzzles, hints and completion records in this browser?")}</p><button onClick={() => {setPlaying(false);setResume(null);setState(freshWorkshop());setRound((n) => n + 1);setFeedback({});setClearOpen(false);window.history.replaceState(window.history.state, '', '#puzzle-directory');title.current?.focus();}}>{translateUi("Clear all progress")}</button><button onClick={() => setClearOpen(false)}>{translateUi("Keep progress")}</button></div>}
    <p className="pw-small pw-storage-note">{translateUi("Your moves stay on this device. Account help unlocks use the shared AI credits wallet; your board stays in this browser. Prefer paper? Matching player sheets and a separate answer guide are below.")}</p>
  </section>;
}
