import { useState } from 'react';
import { ArrowRight, DownloadSimple, Printer, PuzzlePiece } from '@phosphor-icons/react';
import { puzzlePdfPath, puzzleSvg } from '../shared/free-puzzles.mjs';
import { trackConversionEvent } from './analytics.js';
import './freePuzzles.css';
import PuzzleWorkshop from './puzzleWorkshop.jsx';

function PdfDownloads() {
  const [paper, setPaper] = useState('A4');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function download(kind) {
    if (busy) return;
    setBusy(kind); setError('');
    try {
      const response = await fetch(puzzlePdfPath(paper, kind));
      if (!response.ok || !(response.headers.get('content-type') || '').includes('pdf')) throw new Error('file');
      const blob = await response.blob();
      if (await blob.slice(0, 5).text() !== '%PDF-') throw new Error('invalid-pdf');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `Paper-Adventure-Free-Puzzles-${paper}-${kind}.pdf`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      trackConversionEvent('puzzle_pdf_download', { paper, file: kind });
    } catch { setError('The PDF could not be prepared. Please try again, or use the direct PDF links below.'); }
    finally { setBusy(''); }
  }
  return <section className="puzzle-downloads puzzle-shell" id="print-puzzles" aria-labelledby="puzzle-print-title">
    <div><span className="eyebrow"><Printer size={18}/> TAKE IT TO THE TABLE</span><h2 id="puzzle-print-title">Print the clues.<br/>Keep the answers separate.</h2><p>Nine player sheets for six puzzles: the post office uses two pages; the loading bay includes a board and cut-out crates; the forest investigation has a map and a separate evidence sheet. The separate twelve-page Adult Guide has preparation notes, all hints and explained answers.</p><p>Print one player set per team, single-sided at 100%. For puzzle 3, an adult cuts out the crates on player page 5; use them on the board on page 4. Prepare a pencil and scissors. Puzzle 4 has verified records and copied notes; no cutting is needed. Read the guide on screen or print it once.</p></div>
    <div className="puzzle-download-panel"><fieldset><legend>Choose your paper</legend><div>{['A4', 'Letter'].map(size => <label key={size}><input type="radio" name="puzzle-paper" checked={paper === size} onChange={() => { setPaper(size); setError(''); }} disabled={Boolean(busy)}/>{size === 'A4' ? 'A4' : 'US Letter'}</label>)}</div></fieldset><button className="button" disabled={Boolean(busy)} onClick={() => download('players')}>{busy === 'players' ? 'Preparing PDF…' : 'Download player puzzles'} <DownloadSimple size={19}/></button><button className="puzzle-guide-button" disabled={Boolean(busy)} onClick={() => download('guide')}>{busy === 'guide' ? 'Preparing PDF…' : 'Download Adult Guide · answers'} <DownloadSimple size={18}/></button><p role="status" className="puzzle-download-error">{error}</p><small>Free · English PDFs · No account needed</small><details><summary>Open the PDFs directly</summary><a href={puzzlePdfPath(paper, 'players')}>Player sheets ({paper === 'Letter' ? 'US Letter' : paper})</a><a href={puzzlePdfPath(paper, 'guide')}>Adult Guide ({paper === 'Letter' ? 'US Letter' : paper})</a></details></div>
  </section>;
}

export default function FreePuzzles({ Link }) {
  return <main className="free-puzzles-page puzzle-game-first">
    <PuzzleWorkshop/>
    <div className="puzzle-intro-strip"><div className="puzzle-shell"><strong>Small puzzles. Real discoveries.</strong><p>Designed for children aged 6–12 with adult help as needed. Each puzzle stands alone; these sheets are not a complete escape-room kit and need no real locks.</p></div></div>
    <div className="puzzle-print-band"><PdfDownloads/></div>
    <section className="puzzle-hosting puzzle-shell" aria-labelledby="puzzle-hosting-title"><div><span className="eyebrow">PLAY TOGETHER</span><h2 id="puzzle-hosting-title">Turn a few clues into a shared activity.</h2><p>Choose a starting puzzle, share the materials and let players explain how they found the answer. A correct guess is a reason to ask “How do you know?”</p><Link className="text-link" to="/en/guides/">Read the preparation guides <ArrowRight size={18}/></Link></div><ol><li><strong>Start with one clear task.</strong><p>Choose a puzzle that suits your group. The forest patrol is a route-planning challenge; solve it together if needed. Read the instructions aloud for younger players.</p></li><li><strong>Share the detective work.</strong><p>In puzzle 4, read the verified records and copied notes aloud. Compare hypotheses and explain which note must be false.</p></li><li><strong>Help without spoiling the discovery.</strong><p>Reveal one hint, then give the group time to try it. Keep the Adult Guide out of the players’ pile.</p></li></ol></section>
    <div className="puzzle-shell"><div className="puzzle-resource-link"><p><strong>Ready for a connected story?</strong> Restore The Sleeping Lighthouse in a complete free printable adventure.</p><Link className="text-link" to="/en/escape-room-games/the-sleeping-lighthouse/">Explore the free escape adventure <ArrowRight size={17}/></Link></div></div>
    <section className="puzzle-next-band"><div className="puzzle-shell"><div className="puzzle-section-title"><div><span className="eyebrow">READY FOR A WHOLE STORY?</span><h2>Go from one puzzle to a paper adventure.</h2><p>Our complete games connect five checkpoints through a story, with player materials and a separate adult guide.</p></div></div><div className="puzzle-game-grid">{[
      ['celebration-home-v0.1.jpg', 'FREE HOME GAME', 'The Missing Birthday Chest', 'Share clues and help Fenn the fox complete a birthday delivery.', '/en/samples/home/', 'Get the complete free game'],
      ['space.png', 'EXPLORE A HOME GAME', 'The Lost Space Signal', 'Inspect the printable materials for a tabletop space rescue.', '/en/themes/space/home/', 'Explore the space story'],
      ['celebration-classroom-v0.1.jpg', 'FREE CLASSROOM GAME', 'The Adventure Club’s First Badge', 'Choose a teacher-led story with shared crew missions.', '/en/samples/classroom/', 'Get the free Classroom game'],
    ].map(([image, tag, title, description, to, label]) => <article key={to}><img src={`/assets/${image}`} alt={`${title} story illustration`} width="800" height="600" loading="lazy"/><div><span className="eyebrow">{tag}</span><h3>{title}</h3><p>{description}</p><Link className="text-link" to={to} onClick={() => trackConversionEvent('puzzle_game_click', { destination: to.includes('space') ? 'space' : to.includes('classroom') ? 'classroom' : 'home' })}>{label} <ArrowRight size={17}/></Link></div></article>)}</div></div></section>
    <section className="puzzle-faq puzzle-shell" aria-labelledby="puzzle-faq-title"><span className="eyebrow">BEFORE YOU BEGIN</span><h2 id="puzzle-faq-title">About these free printable puzzles.</h2>{[
      ['Are all six puzzles really free?', 'Yes. All six games are free to play, with a free first hint and no account needed to start. Deeper online hints and explained answers use optional shared AI credits. Both paper sizes and the separate Adult Guide remain free downloads. Other complete games have their own purchase options.'],
      ['Are these a complete escape-room game?', 'No. They are six independent escape-room-style puzzles. You can use them separately or as a short sequence, but they do not include a connected six-part story, timer or physical lock system. Choose a complete adventure above for five connected story checkpoints.'],
      ['Can younger children join in?', 'An adult can read the clues, explain the decoder example and write down dictated answers. Choose a puzzle together and inspect its instructions first. Inspect the sheets first to judge the fit for your group; reading and puzzle experience vary.'],
      ['Where are the hints and answers?', 'Each online puzzle has a free first hint. Deeper hints and the explained answer use shared AI credits, with the cost shown before unlocking. Browser progress keeps your moves; account help unlocks remain available on the same game version. The downloadable twelve-page Adult Guide includes the same hints and explanations. Player PDFs contain no answer key.'],
      ['Can I print them for my family or class?', 'Yes. Print copies for your own household or the classes you teach. Keep the Paper Adventure credit. Please do not resell or republish the PDF files; share this page link instead.'],
    ].map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
  </main>;
}
