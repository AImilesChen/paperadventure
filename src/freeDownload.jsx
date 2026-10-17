import { useState } from 'react';
import { ArrowRight, DownloadSimple, WarningCircle } from '@phosphor-icons/react';
import { themes } from '../shared/catalog.mjs';
import { createDownloadZip } from './downloadZip.mjs';
import './freeDownload.css';

export default function FreeDownload({ Link, classroom = false, catalog }) {
  const setting = classroom ? 'classroom' : 'home';
  const label = classroom ? 'Classroom' : 'Home';
  const guide = classroom ? 'Teacher Guide' : 'Host Guide';
  const theme = themes.find(item => item.id === 'celebration');
  const story = theme.story[setting];
  const version = catalog?.themes.find(item => item.id === 'celebration')?.[setting]?.packVersion;
  const [paper, setPaper] = useState('A4');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function fetchPdf(role) {
    const response = await fetch(`/api/v1/samples/${setting}/${paper}/${role}`, { credentials: 'same-origin' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || 'The file could not be downloaded. Please try again.');
    }
    if (!response.headers.get('content-type')?.includes('application/pdf')) throw new Error('The PDF is temporarily unavailable. Please try again.');
    return response.blob();
  }
  async function download(role) {
    setBusy(role); setError(''); setNotice('');
    try {
      let blob;
      if (role === 'complete') {
        const pdfs = await Promise.all(['player', 'guide'].map(fetchPdf));
        const files = await Promise.all(pdfs.map(async (pdf, index) => ({ name: `celebration-${setting}-${index === 0 ? 'player' : 'guide'}-${paper}.pdf`, data: new Uint8Array(await pdf.arrayBuffer()) })));
        blob = createDownloadZip(files);
      } else blob = await fetchPdf(role);
      const objectUrl = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = objectUrl;
      link.download = `celebration-${setting}-${role}-${paper}.${role === 'complete' ? 'zip' : 'pdf'}`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      setNotice(role === 'complete' ? 'Your complete pack download has started. Open the ZIP to find both PDFs, then read the adult guide first.' : `Your ${role === 'player' ? 'Player Pack' : guide} download has started. You need both PDFs to run the game.`);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(''); }
  }
  return <main className="extended-page sample-download-page"><div className="sample-download-shell">
    <header className="sample-download-intro"><div><span className="eyebrow">FREE CELEBRATION GAME · {label.toUpperCase()}</span><h1>Download your free Celebration {label} game.</h1><h2>{story.title}</h2><p>{story.goal}</p><div className="sample-download-facts"><span>Ages 6–12</span><span>{classroom ? '2–35 students' : '2–12 players'}</span><span>5 checkpoints</span></div></div><figure><img src={story.image || theme.image} alt={`${story.title} story illustration`} width="800" height="600" /><figcaption>Story illustration · download the printable files below</figcaption></figure></header>
    <section className="live-panel sample-download-panel" aria-labelledby="sample-download-title"><nav className="live-tabs" aria-label="Choose edition"><Link className={!classroom ? 'active' : ''} aria-current={!classroom ? 'page' : undefined} to="/en/samples/home/">Home</Link><Link className={classroom ? 'active' : ''} aria-current={classroom ? 'page' : undefined} to="/en/samples/classroom/">Classroom</Link></nav><p className="sample-edition-explanation">{classroom ? 'A teacher-led group game with its own classroom story and materials.' : 'A family game with its own Home story and materials.'} Home and Classroom are different games; choose the setting you will use.</p>{!classroom && <div className="sample-edition-explanation"><strong>Cooperative Home edition v0.4</strong><p>Four explorer jobs across five checkpoints, with clear card handoffs or partner task swaps. Play as one team with 2–6 players, or two balanced teams with 7–12; one adult hosts in addition to the players.</p><p>Player Pack: 10 pages per team. Host Guide: 12 pages. Read guide pages 1–11 on screen; print its finale page 12 once. Recommended printing: 11 sheets for one team or 21 for two, single-sided. Use the labelled cards, cut-and-sort diagrams, numbered checkpoint instructions and optional reading support.</p></div>}{classroom && <div className="sample-edition-explanation"><strong>Adventure Club Classroom edition</strong><p>Each crew rebuilds a four-piece invitation, places three paper supplies, shares four badge clues, makes its own paper badge and checks another crew’s work.</p><p>Player Pack: 9 pages per group. Teacher Guide: 9 pages to read on screen or print once. Print one Player Pack for each group of 2–6 students, single-sided at 100% in one paper size; the guide lists every cut piece and handout step.</p></div>}<p className="live-note">Trial {version || 'draft'} · English PDF · No account or payment needed.</p><h2 id="sample-download-title">Your complete game includes two PDFs.</h2><p>Download both to get started. The Player Pack is for the children; the {guide} is for you and includes the answers.</p>
    <div className="sample-paper-choice"><h3>1. Choose your printer’s paper size</h3><div className="live-tabs" role="group" aria-label="Paper size">{['A4', 'Letter'].map(size => <button key={size} type="button" disabled={Boolean(busy)} className={paper === size ? 'active' : ''} aria-pressed={paper === size} onClick={() => { setPaper(size); setNotice(''); }}>{size === 'Letter' ? 'US Letter' : 'A4'}</button>)}</div><p><strong>A4:</strong> 210 × 297 mm. <strong>US Letter:</strong> 8.5 × 11 inches, commonly used in the US and Canada. Both contain the same game; you only need one paper size.</p></div>
    <div className="sample-bundle"><div><h3>2. Get the complete {label} game</h3><p>One ZIP containing the {paper === 'Letter' ? 'US Letter' : 'A4'} Player Pack and {guide}. Extract the ZIP before opening the PDFs.</p></div><button type="button" className="button" disabled={Boolean(busy)} onClick={() => download('complete')}>{busy === 'complete' ? 'Preparing both PDFs…' : 'Download complete game · ZIP'} <DownloadSimple size={19} /></button></div>
    <h3 className="sample-separate-heading">Prefer separate PDF files?</h3><div className="live-downloads"><div><strong>Player Pack</strong><p>Story, clues and paper activities to give to {classroom ? 'students' : 'children'}.</p><button type="button" aria-label={`Download ${setting} ${paper} Player Pack`} onClick={() => download('player')} disabled={Boolean(busy)}>{busy === 'player' ? 'Downloading…' : 'Download Player Pack'} <DownloadSimple size={17} /></button></div><div><strong>{guide}</strong><p>Preparation, hints and answers. Keep this PDF separate from the players.</p><button type="button" aria-label={`Download ${setting} ${paper} ${guide}`} onClick={() => download('guide')} disabled={Boolean(busy)}>{busy === 'guide' ? 'Downloading…' : `Download ${guide}`} <DownloadSimple size={17} /></button></div></div>{busy && <p role="status">{busy === 'complete' ? 'Fetching both PDFs for your complete pack…' : 'Fetching your PDF…'}</p>}{notice && <p className="sample-download-notice" role="status">{notice}</p>}{error && <p className="live-alert" role="alert"><WarningCircle size={18} />{error} No complete pack is saved unless both files are available.</p>}
    </section>
    <section className="sample-start-guide" aria-labelledby="sample-start-title"><span className="eyebrow">AFTER DOWNLOADING</span><h2 id="sample-start-title">3. Set up your paper adventure</h2><ol><li><strong>Read the {guide} first</strong><p>Review preparation, handout order, hints and answers before gathering the group.</p></li><li><strong>Print and prepare</strong><p>Use the selected paper size and follow the guide to prepare the player pages and paper pieces.</p></li><li><strong>Start the story</strong><p>Give out the player materials in the guide’s order. Keep the answers with the adult organiser.</p></li></ol><p className="live-note">This complete five-checkpoint trial may be refined after feedback. Found a confusing clue or print issue? <a href="mailto:support@paperadventure.app?subject=Celebration%20trial%20feedback">Tell us what happened</a> without including a child’s name or photo.</p><Link className="text-link" to={`/en/themes/celebration/${setting}/`}>See the story and pack contents <ArrowRight size={17} /></Link></section>
  </div></main>;
}
