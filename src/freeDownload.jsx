import { useEffect, useRef, useState } from 'react';
import { ArrowRight, DownloadSimple, WarningCircle } from '@phosphor-icons/react';
import { themes } from '../shared/catalog.mjs';
import { prepareSampleDownload } from './sampleDownload.mjs';
import { trackConversionEvent } from './analytics.js';
import HomeFreeSample from './homeFreeSample.jsx';
import './freeDownload.css';

export default function FreeDownload({ Link, classroom = false }) {
  const setting = classroom ? 'classroom' : 'home';
  const label = classroom ? 'Classroom' : 'Home';
  const guide = classroom ? 'Teacher Guide' : 'Host Guide';
  const theme = themes.find(item => item.id === 'celebration');
  const story = theme.story[setting];
  const [paper, setPaper] = useState('A4');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const activeRequest = useRef(null);
  const lastRole = useRef('complete');
  const recordedDownloads = useRef(new Set());
  useEffect(() => {
    setBusy(''); setError(''); setNotice('');
    return () => {
      activeRequest.current?.controller.abort();
      activeRequest.current = null;
    };
  }, [setting]);

  async function download(role) {
    if (activeRequest.current) return;
    const request = { controller: new AbortController(), setting, paper };
    activeRequest.current = request;
    lastRole.current = role;
    setBusy(role); setError(''); setNotice('');
    try {
      const { blob, filename } = await prepareSampleDownload({ setting, paper, role, signal: request.controller.signal });
      if (activeRequest.current !== request) return;
      const objectUrl = URL.createObjectURL(blob), link = document.createElement('a');
      try {
        link.href = objectUrl; link.download = filename;
        document.body.appendChild(link); link.click();
      } finally {
        link.remove(); setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      }
      setNotice(role === 'complete' ? 'Your download has started. Open the ZIP for both PDFs and read the adult guide first.' : `Your ${role === 'player' ? 'Player Pack' : guide} download has started. You need both PDFs to run the game.`);
      // The complete pair was prepared and handed to the browser. Disk saving
      // cannot be verified. Repeat downloads in this view count only once.
      const key = `${setting}:${paper}`;
      if (role === 'complete' && !recordedDownloads.current.has(key)) {
        recordedDownloads.current.add(key);
        trackConversionEvent('sample_download_success', { setting, paper });
      }
    } catch (failure) {
      if (activeRequest.current === request && failure.name !== 'AbortError') setError(failure.message);
    } finally {
      if (activeRequest.current === request) { activeRequest.current = null; setBusy(''); }
    }
  }

  return <main className={`extended-page sample-download-page${classroom ? '' : ' home-free-page'}`}><div className="sample-download-shell">
    <nav className="sample-edition-tabs live-tabs" aria-label="Choose edition">
      <Link className={!classroom ? 'active' : ''} aria-current={!classroom ? 'page' : undefined} to="/en/samples/home/">For home</Link>
      <Link className={classroom ? 'active' : ''} aria-current={classroom ? 'page' : undefined} to="/en/samples/classroom/">For classrooms</Link>
    </nav>
    <section className="sample-download-top" id={classroom ? undefined : 'sample-download'} aria-labelledby="sample-download-title" tabIndex={classroom ? undefined : -1}>
      <header className="sample-download-intro">
        <span className="eyebrow">PAPER ADVENTURE · {label.toUpperCase()}</span>
        <h1 id="sample-download-title">{classroom ? 'Your free printable adventure.' : 'Free printable adventure game for kids.'}</h1>
        <h2>{story.title}</h2><p>{classroom ? story.goal : 'A complete, cooperative paper game from Paper Adventure for ages 6–12. Share clues, rebuild a route and help Fenn the fox deliver his birthday chest.'}</p>
        <div className="sample-download-facts"><span>Ages 6–12</span><span>{classroom ? '2–35 students' : '2–12 children'}</span><span>5 checkpoints</span></div>
        <p className="sample-free-note">No account or payment needed. English PDFs.{!classroom && ' An additional adult hosts.'}</p>
      </header>
      <div className="live-panel sample-download-panel" aria-label="Download your free game" aria-busy={Boolean(busy)}>
        <div className="sample-paper-choice"><h3>Choose your paper size</h3><div className="live-tabs" role="group" aria-label="Paper size">{['A4', 'Letter'].map(size => <button key={size} type="button" disabled={Boolean(busy)} className={paper === size ? 'active' : ''} aria-pressed={paper === size} onClick={() => { setPaper(size); setNotice(''); setError(''); }}>{size === 'Letter' ? 'US Letter' : 'A4'}</button>)}</div></div>
        <div className="sample-bundle"><h2>Get the complete game</h2><p>Player Pack + {guide} · {paper === 'Letter' ? 'US Letter' : 'A4'}</p><button type="button" className="button" disabled={Boolean(busy)} onClick={() => download('complete')}>{busy === 'complete' ? 'Preparing your download…' : 'Download complete game · ZIP'} <DownloadSimple size={19} /></button><small>Open the ZIP to find both PDFs. Read the {guide} first.</small></div>
        <div className="sample-download-feedback" aria-live="polite">{busy && <p role="status">{busy === 'complete' ? 'Preparing both PDFs…' : 'Preparing your PDF…'}</p>}{notice && <p className="sample-download-notice" role="status">{notice}</p>}</div>
        {error && <div className="sample-download-error" role="alert"><p><WarningCircle size={18} />{error}</p><p>No incomplete ZIP has been downloaded.</p><button type="button" className="button-quiet" disabled={Boolean(busy)} onClick={() => download(lastRole.current)}>Try download again</button></div>}
        <details className="sample-individual-files"><summary>Download individual PDFs</summary><div className="live-downloads"><div><strong>Player Pack</strong><p>Story, clues and paper activities for {classroom ? 'students' : 'children'}.</p><button type="button" aria-label={`Download ${setting} ${paper} Player Pack`} onClick={() => download('player')} disabled={Boolean(busy)}>{busy === 'player' ? 'Preparing…' : 'Download Player Pack'} <DownloadSimple size={17} /></button></div><div><strong>{guide}</strong><p>Preparation, hints and answers for the adult.</p><button type="button" aria-label={`Download ${setting} ${paper} ${guide}`} onClick={() => download('guide')} disabled={Boolean(busy)}>{busy === 'guide' ? 'Preparing…' : `Download ${guide}`} <DownloadSimple size={17} /></button></div></div></details>
      </div>
    </section>
    {!classroom ? <HomeFreeSample Link={Link} story={story} /> : <><section className="sample-preparation" aria-labelledby="sample-prep-title">
      <figure><img src={story.image || theme.image} alt={`${story.title} story illustration`} width="800" height="600" loading="lazy" /><figcaption>Story illustration · printable activities are in your download.</figcaption></figure>
      <div><span className="eyebrow">BEFORE YOU PLAY</span><h2 id="sample-prep-title">A little preparation, then a shared story.</h2>
        <p>Home and Classroom are different games. Choose the edition for your group, and use the same paper size for both PDFs.</p>
        {!classroom ? <><p>Play as one team with 2–6 players, or two balanced teams with 7–12. One adult hosts in addition to the players. Four explorer jobs rotate across five checkpoints.</p><p>Player Pack: 10 pages per team. Host Guide: 12 pages. Read guide pages 1–11 on screen; print its finale page 12 once. Recommended printing: 11 sheets for one team or 21 for two, single-sided.</p></> : <><p>Each crew rebuilds a four-piece invitation, places three paper supplies, shares four badge clues, makes a paper badge and checks another crew’s work.</p><p>Player Pack: 9 pages per group of 2–6 students. Teacher Guide: 9 pages to read on screen or print once. Print one Player Pack per group, single-sided at 100%.</p></>}
        <p className="sample-paper-help"><strong>A4:</strong> 210 × 297 mm. <strong>US Letter:</strong> 8.5 × 11 inches. Both contain the same game; you only need one size.</p>
        <Link className="text-link" to={`/en/themes/celebration/${setting}/`}>See the story and pack contents <ArrowRight size={17} /></Link>
      </div>
    </section>
    <section className="sample-start-guide" aria-labelledby="sample-start-title"><span className="eyebrow">AFTER DOWNLOADING</span><h2 id="sample-start-title">Set up your paper adventure</h2><ol><li><strong>Read the {guide} first</strong><p>Review preparation, handout order, hints and answers before gathering the group.</p></li><li><strong>Print and prepare</strong><p>Follow the guide to prepare the player pages and paper pieces.</p></li><li><strong>Start the story</strong><p>Give out the player materials in order. Keep the answers with the adult organiser.</p></li></ol><p className="live-note">Found a confusing clue or print issue? <a href="mailto:support@paperadventure.app?subject=Celebration%20trial%20feedback">Tell us what happened</a> without including a child’s name or photo.</p></section></>}
    <section className="sample-next-game"><div><span className="eyebrow">KEEP EXPLORING</span><h2>Find your next story.</h2><p>Explore more ready-made adventures for your {classroom ? 'classroom' : 'family'}.</p></div><Link className="button-quiet" to={`/en/for-${setting}/`}>Browse {label} game themes <ArrowRight size={18} /></Link></section>
  </div></main>;
}
