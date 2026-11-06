import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowClockwise, Check, DownloadSimple, Lightbulb, Printer, SealCheck, Notebook, Lock, ArrowCounterClockwise } from '@phosphor-icons/react';
import { lighthouse, lighthouseArt, lighthouseStages, lighthouseLogs, lighthouseModules, lighthouseModuleSvg, lighthousePowerSvg, lighthouseLensBoardSvg, lighthouseLensMaskSvg, lighthouseLensPreviewSvg, lensDirections, lensReadings, freshLighthouseProgress, restoreLighthouseProgress, completeLighthouseStage, lighthousePdfPath } from '../shared/lighthouse-game.mjs';
import { trackConversionEvent } from './analytics.js';
import './lighthouseGame.css';

const measure = (name, properties = {}) => trackConversionEvent(name, { game: lighthouse.id, ...properties });
function Drawing({ markup, label, className = '' }) { return <div className={`lh-drawing ${className}`} role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: markup }}/>; }
function Breadcrumb({ Link, play = false }) { return <nav className="lh-breadcrumb" aria-label="Breadcrumb"><Link to="/en/">Home</Link><span>/</span><Link to={lighthouse.hub}>Escape adventures</Link>{play && <><span>/</span><Link to={lighthouse.path}>The Sleeping Lighthouse</Link></>}</nav>; }

export { EscapeGamesHub } from './escapeGamesHub.jsx';
export { LighthouseDownloads, LighthouseDetail } from './lighthouseDetail.jsx';

function LensViewer() {
  const [turns, setTurns] = useState(0);
  return <div className="lh-lens-viewer"><Drawing markup={lighthouseLensPreviewSvg(turns)} label={`Lens preview at ${lensDirections[turns]}: numbered windows show ${lensReadings(turns).join(', ')}`}/><button type="button" className="lh-secondary" onClick={() => setTurns(value => (value + 1) % 4)}>Turn lens a quarter-turn <ArrowClockwise size={20}/></button><p role="status">Arrow points {lensDirections[turns]}. Read windows 1, 2, 3.</p><p className="lh-small">This preview mirrors the paper lens. Compare the numbered windows with your journal finding.</p></div>;
}
function StageMaterials({ stage }) {
  if (stage === 0) return <div className="lh-log-grid">{lighthouseLogs.map(strip => <article key={strip.id}><span className="lh-strip-letter">{strip.id}</span><p>{strip.text}</p></article>)}</div>;
  if (stage === 1) return <><Drawing markup={lighthousePowerSvg()} label="Three slots in journal order. Total energy must be 13; LEAF must be greater than WAVE."/><div className="lh-module-grid">{lighthouseModules.map(module => <Drawing key={module.symbol + module.value} markup={lighthouseModuleSvg(module)} label={`${module.symbol} module, energy ${module.value}`}/>)}</div></>;
  if (stage === 2) return <LensViewer/>;
  return <div className="lh-console-art"><div className="lh-console-lights"><span/><span/><span/></div><Notebook size={32}/><strong>KEEPER’S STARTUP CONSOLE</strong><p>Journal order + powered values + lens direction</p></div>;
}

export function LighthousePlay({ Link }) {
  const [progress, setProgress] = useState(freshLighthouseProgress), [loaded, setLoaded] = useState(false), [storageNotice, setStorageNotice] = useState('');
  const [active, setActive] = useState(0), [answer, setAnswer] = useState(''), [finalDirection, setFinalDirection] = useState(''), [notice, setNotice] = useState(''), [correctNotice, setCorrectNotice] = useState(false), [resetOpen, setResetOpen] = useState(false), [solutionOpen, setSolutionOpen] = useState(false);
  const milestone = useRef(null), heading = useRef(null), roomHeading = useRef(null);
  const stage = lighthouseStages[active];
  useEffect(() => {
    try { const raw = localStorage.getItem(lighthouse.storageKey); const saved = raw ? restoreLighthouseProgress(JSON.parse(raw)) : freshLighthouseProgress(); setProgress(saved); setActive(Math.min(saved.completed, 3)); }
    catch { setStorageNotice('Saved progress is unavailable. You can still play; keep your paper findings to resume manually.'); }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(lighthouse.storageKey, JSON.stringify(restoreLighthouseProgress(progress))); }
    catch { setStorageNotice('This browser cannot save progress. Keep your paper findings; progress lasts only while this page stays open.'); }
  }, [progress, loaded]);
  useEffect(() => {
    if (loaded && progress.started && progress.completed < 4 && roomHeading.current) {
      roomHeading.current.focus({ preventScroll: true });
      roomHeading.current.closest('.lh-room')?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [active, loaded, progress.started]);
  function start() { setProgress(p => ({ ...p, started: true })); measure('escape_game_start'); }
  function selectStage(index) { setActive(index); setAnswer(''); setFinalDirection(''); setNotice(''); setCorrectNotice(false); setSolutionOpen(false); }
  function showHint() { setProgress(p => ({ ...p, hints: p.hints.map((n, i) => i === active ? Math.min(3, n + 1) : n) })); measure('escape_hint_open', { stage: stage.id }); }
  function toggleSolution() {
    if (!solutionOpen && progress.completed <= active) setProgress(p => ({ ...p, viewed: p.viewed.map((v, i) => i === active ? true : v) }));
    setSolutionOpen(value => !value);
  }
  function check(event) {
    event.preventDefault();
    if (!answer.trim() || active === 3 && !finalDirection) { setCorrectNotice(false); setNotice(active === 3 ? 'Choose a lens direction and enter your three module values.' : 'Enter your finding first. The expected format is shown above.'); return; }
    const result = completeLighthouseStage(progress, active, active === 3 ? { code: answer, direction: finalDirection } : answer);
    if (!result.ok) { setCorrectNotice(false); setNotice('That does not fit all the clues yet. Check your materials or open one hint.'); return; }
    setProgress(result.progress); setCorrectNotice(true); setNotice(progress.viewed[active] ? 'Finding checked with the solution viewed.' : 'Finding checked. Your repair is complete.');
    measure('escape_stage_complete', { stage: stage.id, assistance: progress.viewed[active] ? 'solution' : progress.hints[active] ? 'hint' : 'none' });
    if (active === 3) measure('escape_game_complete', { assistance: progress.viewed.some(Boolean) ? 'solution' : progress.hints.some(Boolean) ? 'hint' : 'none' });
    window.setTimeout(() => {
      if (active === 3) { milestone.current?.focus({ preventScroll: true }); milestone.current?.closest('.lh-ending')?.scrollIntoView({ block: 'start', behavior: 'instant' }); }
      else milestone.current?.focus();
    }, 0);
  }
  function reset() { setProgress(freshLighthouseProgress()); selectStage(0); setResetOpen(false); heading.current?.focus(); }
  const finished = progress.completed === 4, checked = progress.completed > active;
  return <main className="lh-page lh-play"><div className="lh-shell"><Breadcrumb Link={Link} play/><header className="lh-play-heading"><div><span className="eyebrow">PAPER ADVENTURE · FREE PRINT-AND-PLAY</span><h1 ref={heading} tabIndex={-1}>The Sleeping Lighthouse</h1></div><a className="text-link" href={lighthouse.path + '#lighthouse-downloads'}><Printer size={18}/> Get the kit</a></header>{storageNotice && <p className="lh-storage-notice" role="status">{storageNotice}</p>}
    {!loaded ? <p role="status">Checking saved progress…</p> : !progress.started ? <section className="lh-opening"><div className="lh-opening-image"><img src={lighthouseArt.coast} alt="The unlit lighthouse above the paper-boat bay" width="1440" height="960"/></div><div><span className="eyebrow">A LETTER FROM KEEPER MARA</span><h2>The bay needs its beacon.</h2><p>{lighthouse.opening}</p><div className="lh-opening-prep"><strong>Before you start</strong><p>Print the seven player sheets. An adult prepares the cut pieces and reads the separate guide. This companion checks your discoveries; the guide also supports play without a screen.</p><a className="text-link" href={lighthouse.path + '#lighthouse-downloads'}>Get the materials <DownloadSimple size={18}/></a></div><button className="button" onClick={start}>Enter the keeper’s study <ArrowRight size={18}/></button></div></section> : finished ? <section className="lh-ending"><div className="lh-ending-image"><img src={lighthouseArt.coast} alt="The lighthouse above the harbour, now restored for the festival" width="1440" height="960"/><span className="lh-beam"/><span className="lh-lantern-glow"/><div className="lh-ending-badge"><SealCheck size={30}/> BEACON RESTORED</div></div><div className="lh-ending-copy" ref={milestone} tabIndex={-1}><span className="eyebrow">ALL FOUR TASKS COMPLETE</span><h2>You woke the lighthouse.</h2><p>{lighthouse.ending}</p><p className="lh-small">{progress.viewed.some(Boolean) ? 'You used the solution for part of this adventure. Read the explanations together and see how the discoveries connect.' : 'Your journal order, energy values and lens direction came together in one final startup.'}</p><p>The Adult Guide’s final page contains the ending and a blank team certificate.</p><div className="lh-hero-actions"><a className="button" href={lighthouse.path + '#lighthouse-downloads'}>Open the printable kit <DownloadSimple size={18}/></a><Link className="text-link" to="/en/escape-room-puzzles/">Try the free puzzle workshop <ArrowRight size={18}/></Link></div><button className="lh-reset" onClick={() => setResetOpen(true)}>Start this adventure again</button></div></section> : <>
      <nav className="lh-stage-nav" aria-label="Adventure checkpoints">{lighthouseStages.map((item, i) => <button key={item.id} disabled={i > progress.completed} aria-current={active === i ? 'step' : undefined} onClick={() => selectStage(i)}><span>{progress.completed > i ? <Check size={17}/> : i + 1}</span><strong>{['Journal', 'Power board', 'Paper lens', 'Final startup'][i]}</strong>{i > progress.completed && <Lock size={14}/>}</button>)}</nav>
      <div className="lh-play-layout"><section className="lh-room"><figure className="lh-room-scene"><img src={lighthouseArt[stage.art]} alt={stage.room.toLowerCase() + ' story scene'} width="1440" height="960"/><figcaption>{stage.number} / {stage.room}</figcaption></figure><div className="lh-room-content"><span className="eyebrow">{stage.pages}</span><h2 ref={roomHeading} tabIndex={-1}>{stage.title}</h2><p>{stage.intro}</p><p className="lh-current-task"><strong>Your task</strong> {stage.task}</p><details className="lh-materials" open><summary>View the matching player materials</summary><StageMaterials key={stage.id} stage={active}/></details>
        {checked ? <div className="lh-milestone" ref={milestone} tabIndex={-1}><span className="eyebrow"><Check size={18}/> FINDING SAVED</span><h3>{stage.discovery}</h3><p>{stage.consequence}</p>{notice && <p className="lh-small">{notice}</p>}<button className="button" onClick={() => selectStage(progress.completed)}>Continue to {lighthouseStages[progress.completed].title.toLowerCase()} <ArrowRight size={18}/></button></div> : <form className="lh-check-form" onSubmit={check}><label htmlFor="lh-answer">{active === 3 ? 'Startup sequence' : 'Your finding'}<span>{stage.format}</span></label>{active === 3 && <label htmlFor="lh-final-direction">Lens direction<select id="lh-final-direction" value={finalDirection} onChange={e => { setFinalDirection(e.target.value); setNotice(''); }}><option value="">Choose a direction</option>{lensDirections.map(d => <option key={d} value={d}>{d}</option>)}</select></label>}{active === 2 ? <select id="lh-answer" value={answer} onChange={e => { setAnswer(e.target.value); setNotice(''); }} aria-describedby="lh-check-status"><option value="">Choose the lens arrow direction</option>{lensDirections.map(d => <option key={d} value={d}>{d}</option>)}</select> : <input id="lh-answer" value={answer} maxLength={20} autoComplete="off" spellCheck={false} inputMode={active === 0 ? 'text' : 'numeric'} aria-describedby="lh-check-status" data-clarity-mask="true" onChange={e => { setAnswer(e.target.value); setNotice(''); }}/>}<button className="button" type="submit">{active === 3 ? 'Start the beacon' : 'Check this finding'} <ArrowRight size={18}/></button><p id="lh-check-status" role="status" className={correctNotice ? 'correct' : ''}>{notice}</p></form>}
        <div className="lh-help"><button className="lh-hint" disabled={progress.hints[active] >= 3} onClick={showHint}><Lightbulb size={19}/>{progress.hints[active] >= 3 ? 'All three hints shown' : `Show hint ${progress.hints[active] + 1} of 3`}</button>{progress.hints[active] > 0 && <ol aria-live="polite">{stage.hints.slice(0, progress.hints[active]).map((hint, i) => <li key={i}><strong>Hint {i + 1}</strong><p>{hint}</p></li>)}</ol>}<button className="lh-solution-button" aria-expanded={solutionOpen} aria-controls="lh-solution" onClick={toggleSolution}>{solutionOpen ? 'Hide the explanation' : 'Reveal the solution and explanation'}</button><div id="lh-solution" hidden={!solutionOpen}><p>{stage.solution}</p></div></div>
      </div></section><aside className="lh-findings"><div><span className="eyebrow"><Notebook size={19}/> YOUR FIELD NOTES</span><h2>Keep your discoveries.</h2><p className="lh-small">The final startup needs findings from all three rooms.</p><progress max="4" value={progress.completed} aria-label="Completed adventure tasks"/><p className="lh-small">{progress.completed} of 4 tasks checked</p><ol>{lighthouseStages.slice(0, 3).map((item, i) => <li key={item.id} className={progress.completed > i ? 'earned' : ''}><strong>{['Startup order', 'Powered modules', 'Lens direction'][i]}</strong><p>{progress.completed > i ? item.discovery : 'Awaiting your discovery.'}</p></li>)}</ol><a className="text-link" href={lighthouse.path + '#lighthouse-downloads'}>Printing and preparation <ArrowRight size={16}/></a><button className="lh-reset" onClick={() => setResetOpen(true)}><ArrowCounterClockwise size={16}/> Restart adventure</button></div></aside></div>
    </>}{resetOpen && <section className="lh-reset-confirm" role="region" aria-label="Confirm restart"><h2>Start from the beginning?</h2><p>This clears this game’s saved progress and hints in this browser.</p><button className="lh-secondary" onClick={() => setResetOpen(false)}>Keep my adventure</button><button className="button" onClick={reset}>Clear progress and restart</button></section>}</div></main>;
}
