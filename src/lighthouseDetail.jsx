import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, DownloadSimple, Printer, Scissors, UsersThree, Lightbulb, X } from '@phosphor-icons/react';
import { lighthouse, lighthouseArt, lighthousePdfPath } from '../shared/lighthouse-game.mjs';
import { escapeProducts } from '../shared/escape-products.mjs';
import { formatUsd } from '../shared/catalog.mjs';
import { prepareLighthousePack, prepareLighthousePdf } from './lighthouseDownload.mjs';
import { trackConversionEvent } from './analytics.js';
import './lighthouseDetail.css';

const materials = [
  { id: 'journal', page: 2, title: 'Put a journal back together', label: 'READ & ARRANGE', width: 725, height: 265, alt: 'Two actual cut-out journal strips, labelled R and K, with their printed clues', description: 'Read the loose strips and discuss which events happened first. This excerpt shows two of the four strips.', discovery: 'A startup order to carry into the next repair.' },
  { id: 'modules', page: 4, title: 'Choose the power modules', label: 'COMPARE & PLACE', width: 570, height: 350, alt: 'Six actual loose power-module cards with symbols, numbers and energy bars; no cards are selected', description: 'Compare the six cards with the board’s conditions. Place your chosen modules and record the finding.', discovery: 'Powered values to keep for the final startup.' },
  { id: 'lens', page: 6, title: 'Turn a windowed paper lens', label: 'TURN & OBSERVE', width: 450, height: 475, alt: 'Actual paper lens template with three numbered cut-out windows and a centre arrow', description: 'An adult cuts the windows. Lay the frame over the matching board and turn it by hand to see what changes.', discovery: 'A direction that brings the earlier discoveries together.' },
];
const previewPath = item => `/assets/lighthouse-detail-v2/${item.id}.webp`;

function MaterialPreview({ selected, onClose }) {
  const dialog = useRef(null);
  useEffect(() => { if (selected) dialog.current?.showModal(); }, [selected]);
  return selected && <dialog ref={dialog} className="ld-preview" aria-labelledby="ld-preview-title" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) dialog.current.close(); }}>
    <div><div className="ld-preview-heading"><h2 id="ld-preview-title">{selected.title}</h2><button type="button" className="ld-close" autoFocus aria-label="Close material preview" onClick={() => dialog.current.close()}><X size={24}/></button></div>
    <img src={previewPath(selected)} alt={selected.alt} width={selected.width} height={selected.height}/><p>Actual Player Pack · page {selected.page} excerpt. Preview for inspection; print the PDF at 100% for play.</p></div>
  </dialog>;
}

export function LighthouseDownloads() {
  const [paper, setPaper] = useState('A4'), [busy, setBusy] = useState(''), [notice, setNotice] = useState(''), [failed, setFailed] = useState(false);
  async function download(role) {
    if (busy) return;
    setBusy(role); setNotice(''); setFailed(false);
    try {
      const file = role === 'complete' ? await prepareLighthousePack({ paper }) : await prepareLighthousePdf({ paper, role });
      const url = URL.createObjectURL(file.blob), anchor = document.createElement('a');
      anchor.href = url; anchor.download = file.filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setNotice(role === 'complete' ? 'Your complete ZIP download has started. Extract it and read START-HERE.txt first.' : 'Your PDF download has started.');
      trackConversionEvent('escape_pdf_download', { game: lighthouse.id, paper, file: role });
    } catch (error) {
      setFailed(true); setNotice(error.name === 'AbortError' || error.name === 'TimeoutError' ? 'The download timed out. Check your connection and retry, or open the PDFs below.' : 'The download could not be prepared. Please retry, or open the PDFs below.');
    } finally { setBusy(''); }
  }
  return <section className="ld-download-section" aria-labelledby="ld-download-title"><div className="lh-shell ld-download-layout">
    <div><span className="eyebrow">YOUR COMPLETE FREE GAME</span><h2 id="ld-download-title">Get the kit.<br/>Gather your crew.</h2><p>Choose one paper size. The complete ZIP contains both PDFs in that size and a short start guide.</p><ul className="ld-download-inventory"><li><strong>Player Pack · 7 pages</strong><span>Opening, journal strips, power board, module cards, paper lens and final task.</span></li><li><strong>Adult Guide · 4 pages</strong><span>Preparation, handoffs, gradual hints, explained answers, ending and certificate. Contains spoilers.</span></li><li><strong>START-HERE.txt</strong><span>Print order, supplies, first steps and a link to the optional web companion.</span></li></ul><p className="ld-print-note"><Printer size={22} aria-hidden="true"/><span><strong>7 player sheets per team.</strong> Read the guide on screen; optionally add Guide page 4 for a printed ending and certificate: 8 sheets in total.</span></p><p className="ld-small">Use matching A4 or US Letter, single-sided at actual size / 100%. Check the 30 mm calibration lines on Player pages 5 and 6.</p></div>
    <div className="ld-download-card" id="lighthouse-downloads"><span className="ld-free-label">FREE · ENGLISH · NO ACCOUNT OR PAYMENT</span><fieldset disabled={Boolean(busy)}><legend>Choose your paper size</legend>{['A4', 'Letter'].map(size => <label key={size}><input type="radio" name="lighthouse-paper" checked={paper === size} onChange={() => { setPaper(size); setNotice(''); setFailed(false); }}/>{size === 'Letter' ? 'US Letter' : size}</label>)}</fieldset>
      <button type="button" className="button ld-download-main" disabled={Boolean(busy)} onClick={() => download('complete')}><span>{busy === 'complete' ? 'Preparing your ZIP…' : 'Download complete game · ZIP'}</span><DownloadSimple size={20}/></button><p className="ld-small">Player PDF + Adult Guide PDF + start instructions<br/>{paper === 'Letter' ? 'US Letter' : 'A4'} · digital download</p>
      <div className="ld-individual"><span>Or get the PDFs separately</span><button type="button" disabled={Boolean(busy)} onClick={() => download('players')}>{busy === 'players' ? 'Preparing…' : 'Download Player Pack'}<DownloadSimple size={18}/></button><button type="button" disabled={Boolean(busy)} onClick={() => download('guide')}>{busy === 'guide' ? 'Preparing…' : 'Download Adult Guide · spoilers'}<DownloadSimple size={18}/></button></div>
      <p className={`ld-status${failed ? ' failed' : ''}`} role="status" aria-live="polite">{notice}</p><details><summary>Open PDFs directly</summary><a href={lighthousePdfPath(paper, 'players')}>Player Pack · {paper === 'Letter' ? 'US Letter' : paper}</a><a href={lighthousePdfPath(paper, 'guide')}>Adult Guide · contains answers</a></details>
    </div></div></section>;
}

export function LighthouseDetail({ Link }) {
  const [selected, setSelected] = useState(null);
  const recommendations = escapeProducts.filter(p => ['seventh-carriage', 'fold-city'].includes(p.id));
  return <main className="lh-page ld-page"><div className="lh-shell">
    <nav className="lh-breadcrumb" aria-label="Breadcrumb"><Link to="/en/">Home</Link><span aria-hidden="true">/</span><Link to={lighthouse.hub}>Escape adventures</Link><span aria-hidden="true">/</span><span aria-current="page">The Sleeping Lighthouse</span></nav>
    <section className="ld-hero" aria-labelledby="ld-title"><div className="ld-hero-heading"><span className="lh-free-badge">COMPLETE FREE PRINTABLE GAME</span><h1 id="ld-title">The Sleeping<br/>Lighthouse<span className="dot">.</span></h1></div>
      <figure><img src={lighthouseArt.cover} alt="A lighthouse beside a twilight bay with small paper boats on the water" width="1536" height="1024" fetchPriority="high"/><figcaption>A coastal mystery for your table.</figcaption></figure>
      <div className="ld-hero-copy"><p className="ld-lead">Restore a journal, rebuild the power board and turn a paper lens to bring light back to the bay.</p><ul className="ld-hero-facts"><li>Ages 7–12 suggested</li><li>2–6 players per team</li><li>English · A4 &amp; US Letter</li><li>Adult help and cutting</li></ul>
      <div className="ld-hero-actions"><a className="button" href="#lighthouse-downloads">Download the free game <DownloadSimple size={19}/></a><a className="text-link" href="#lighthouse-materials">See how it plays <ArrowRight size={18}/></a></div><p className="ld-small">Complete story, hints and ending · no account or payment</p><Link className="ld-prepared-link" to={lighthouse.play}>Already printed? Open the companion <ArrowUpRight size={17}/></Link></div>
    </section>

    <section className="ld-section" id="lighthouse-materials" aria-labelledby="ld-material-title"><div className="ld-section-heading"><span className="eyebrow">ACTUAL PLAYER PACK EXCERPTS</span><h2 id="ld-material-title">Clues to hold.<br/>Discoveries to share.</h2><p>This is what players handle: loose clues, matching cards and a windowed frame. These are cropped excerpts from the actual game PDFs.</p></div>
      <div className="ld-material-grid">{materials.map(item => <article key={item.id}><button type="button" className={`ld-material-image ld-material-${item.id}`} onClick={() => setSelected(item)} aria-label={`Enlarge ${item.title.toLowerCase()} material preview`}><img src={previewPath(item)} alt={item.alt} width={item.width} height={item.height} loading="lazy"/><span>Enlarge material <ArrowUpRight size={16}/></span></button><div><span className="eyebrow">{item.label} · PLAYER PAGE {item.page}</span><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div><p className="ld-small ld-preview-note">Selected materials, not every clue. Print the supplied PDFs for play; website preview images are not to scale.</p>
    </section>
  </div>

  <section className="ld-story"><div className="lh-shell"><div><span className="eyebrow">YOUR MISSION</span><h2>A festival waiting<br/>for its beacon.</h2></div><div><p>{lighthouse.opening}</p><p>Your team is the repair crew. Keep each discovery: bringing them together is how you finish the story.</p></div></div></section>

  <div className="lh-shell"><section className="ld-section" aria-labelledby="ld-journey-title"><div className="ld-section-heading"><span className="eyebrow">THREE DISCOVERIES. ONE FINAL TASK.</span><h2 id="ld-journey-title">Every repair leads somewhere.</h2><p>Follow one connected adventure, with an adult checking each finding and revealing the next materials.</p></div><ol className="ld-journey">{materials.map((item, i) => <li key={item.id}><span className="ld-step-number">0{i + 1}</span><h3>{item.title}</h3><p>{item.discovery}</p></li>)}<li><span className="ld-step-number">04</span><h3>Wake the lighthouse</h3><p>Combine your journal, power and lens findings in the final startup.</p></li></ol></section></div>

  <LighthouseDownloads/>

  <div className="lh-shell"><section className="ld-section" id="lighthouse-prepare" aria-labelledby="ld-prepare-title"><div className="ld-section-heading"><span className="eyebrow">FOR THE ADULT</span><h2 id="ld-prepare-title">A little preparation.<br/>A shared adventure.</h2><p>Ordinary paper, a printer, a pencil, an eraser, adult-handled scissors and a flat table. No glue, lock, pin or transparent sheet is needed.</p></div>
    <ol className="ld-prepare-grid"><li><Lightbulb size={26} aria-hidden="true"/><h3>1. Read the guide</h3><p>Start with Adult Guide page 1. Keep its hints, answers and ending away from the player pile. Decide who will read and help check discoveries.</p></li><li><Printer size={26} aria-hidden="true"/><h3>2. Print one matching set</h3><p>Print Player pages 1–7 in one paper size, single-sided at 100%. Check both 30 mm lines. Keep the guide on screen, or print it separately.</p></li><li><Scissors size={26} aria-hidden="true"/><h3>3. Cut and check</h3><p>An adult cuts four journal strips on page 2, six complete module cards on page 4, and the lens square plus three windows on page 6. Retain its numbers and arrow; check it fits page 5.</p></li><li><UsersThree size={26} aria-hidden="true"/><h3>4. Release each repair</h3><p>Start with pages 1–2. After each checked discovery, hand over pages 3–4, then 5–6, then 7. Keep later piles covered. Save all findings on Player page 1.</p></li></ol>
    <div className="ld-group-grid"><article><span className="eyebrow">AT HOME</span><h3>Make space for every player.</h3><p>Gather 2–6 players. Share reading, placing pieces, turning the lens and recording discoveries; swap duties at the next repair. An adult can read aloud or write a dictated finding.</p></article><article><span className="eyebrow">IN YOUR CLASSROOM</span><h3>One independent set per team.</h3><p>Use the same game in groups of 2–6. Print seven player sheets per team and prepare a separate set of pieces for each. Keep the guide with the teacher and plan how to check groups before releasing the next pages.</p></article></div>
    <p className="ld-small ld-age-note">Age guidance is provisional. Physical printing and independent family or classroom playtesting have not yet been verified; preparation time and play duration have not been measured.</p>
  </section>

  <section className="ld-section ld-faq-layout" aria-labelledby="ld-faq-title"><div><span className="eyebrow">BEFORE YOU BEGIN</span><h2 id="ld-faq-title">A few practical answers.</h2><p>Download, prepare and then play. The paper kit carries the adventure; the companion is optional.</p><Link className="text-link" to="/en/help/print/">Printing help <ArrowRight size={18}/></Link></div><div className="ld-faq">
    <details><summary>Is this the whole game, or just a sample?</summary><p>It is the complete free game: the opening, three linked puzzles, final startup, gradual hints, explained solutions, ending and certificate. No chapter requires payment.</p></details>
    <details><summary>Do we need a screen or internet to play?</summary><p>The paper game works offline after download. The adult uses the separate guide to check findings and offer hints. The optional web companion needs internet to open; it is not an offline file in the ZIP. No separate screen for each player is required.</p></details>
    <details><summary>Does the companion remember our progress?</summary><p>It saves milestones in the same browser when local storage is available. It does not need an account or upload your answers. Keep paper findings if browser storage is blocked, or if you want to continue on another device.</p></details>
    <details><summary>Do we need colour printing or special equipment?</summary><p>Colour is optional: symbols, words and numbers carry the clues. Use one matching paper size at 100%, check the calibration lines and have an adult prepare the inner lens windows. No glue, lock, transparent film or pin is required.</p></details>
    <details><summary>Can younger players join?</summary><p>The suggested age is 7–12 with adult help as needed. Read the materials first to judge the fit. An adult or partner can read aloud, help compare values or write a spoken finding. There is no required timer.</p></details>
    <details><summary>May I print it for my family or class?</summary><p>Yes, for your household or the classes you teach. Use one full player set per team and keep the Paper Adventure credit. Do not resell or republish the files; share this page instead. Classroom use is the same game, not a separate edition.</p></details>
    <details><summary>Can we play it again?</summary><p>Yes. Keep the cut pieces together, swap responsibilities or print a fresh set. The story, clues and answers stay the same, so the mystery is familiar after the first play.</p></details>
  </div></section>

  <section className="ld-ready" aria-labelledby="ld-ready-title"><div><span className="eyebrow">YOUR CREW IS ALMOST READY</span><h2 id="ld-ready-title">The lanterns are waiting.</h2><p>Have the player sheets and adult guide ready before opening the companion.</p></div><div><Link className="button" to={lighthouse.play} onClick={() => trackConversionEvent('escape_start_click', { game: lighthouse.id })}>Materials ready? Open companion <ArrowRight size={18}/></Link><a className="text-link" href="#lighthouse-downloads">Still need the kit? Download it free <DownloadSimple size={18}/></a></div></section>

  <section className="ld-section ld-next" aria-labelledby="ld-next-title"><div className="ld-next-heading"><div><span className="eyebrow">AFTER THE LIGHTHOUSE</span><h2 id="ld-next-title">Another way to discover.</h2><p>Two separate household adventures, with different kinds of teamwork.</p></div><Link className="text-link" to={lighthouse.hub}>Compare all six games <ArrowRight size={18}/></Link></div><div className="ld-next-grid">{recommendations.map(game => <article key={game.id}><Link className="ld-next-image" to={game.path} aria-label={`Explore ${game.title}`}><img src={game.image} alt={game.id === 'fold-city' ? 'A detailed folded-paper city model' : 'A vintage train on a rain-wet platform'} width="1536" height="1024" loading="lazy"/></Link><div><span className="eyebrow">{game.id === 'fold-city' ? 'TURN & FOLD THE MAP' : 'FOLLOW THE EVIDENCE'}</span><h3>{game.title}</h3><p>{formatUsd(game.unitAmount)} · paid household game</p><Link className="text-link" to={game.path}>See gameplay &amp; kit <ArrowRight size={18}/></Link></div></article>)}</div></section>
  </div><MaterialPreview selected={selected} onClose={() => setSelected(null)}/></main>;
}
