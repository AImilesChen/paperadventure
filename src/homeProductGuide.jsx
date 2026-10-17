import { ArrowRight, BookOpenText, Printer, UsersThree } from '@phosphor-icons/react';
import './homeProductGuide.css';

export function HomeProductGuide({ Link, sampleReady = false }) {
  return <section className="home-product-guide" aria-labelledby="home-product-guide-title">
    <div className="home-product-shell">
      <div className="home-product-heading">
        <div>
          <span className="eyebrow">WHAT YOU ACTUALLY PLAY</span>
          <h2 id="home-product-guide-title">A printable story adventure, from first clue to final reveal<span className="dot">.</span></h2>
        </div>
        <p>These are paper-based adventure games for ages 6–12. An adult prepares the pages, then children solve connected clues together. Choose a ready-made Home or Classroom story, or shape a custom one around your own idea.</p>
      </div>
      <div className="home-product-layout">
        <div className="home-product-details">
          <article><span className="home-product-icon"><Printer size={25} /></span><div><h3>Print the Player Pack</h3><p>Story pages, clues and spaces to record discoveries give players a clear next step at each of five checkpoints.</p></div></article>
          <article><span className="home-product-icon"><BookOpenText size={25} /></span><div><h3>Keep the adult guide</h3><p>The separate Host or Teacher Guide explains setup, the clue sequence, hints and answers. Players do not need to see it.</p></div></article>
          <article><span className="home-product-icon"><UsersThree size={25} /></span><div><h3>Play in your setting</h3><p>Home stories suit a household group. Classroom stories give a teacher a distinct group mission with shared clues and guidance.</p></div></article>
          <p className="home-product-format">Offered editions provide Player Pack and adult-guide PDFs in both A4 and US Letter sizes. Print the size that matches your paper.</p>
          <div className="home-product-links"><Link className="text-link" to="/en/how-it-works/">See the play process <ArrowRight size={17} /></Link><Link className="text-link" to="/en/samples/">Explore the free Celebration games <ArrowRight size={17} /></Link></div>
        </div>
        <div className="home-product-paper-stack">
          <div className="home-paper home-paper-player"><span className="home-paper-kicker">PLAYER PACK · EXAMPLE LAYOUT</span><strong>Follow the next clue</strong><p>Read the story. Compare what you found. Mark your answer on the page.</p><div className="home-paper-clue"><span>01</span><span>02</span><span>03</span></div><span className="home-paper-line" /><span className="home-paper-line short" /></div>
          <div className="home-paper home-paper-adult"><span className="home-paper-kicker">HOST / TEACHER GUIDE</span><strong>Ready to guide the game</strong><div className="home-guide-row"><span>Prepare</span><i /></div><div className="home-guide-row"><span>Gentle hint</span><i /></div><div className="home-guide-row"><span>Answer & next step</span><i /></div></div>
          <p>{sampleReady ? 'Illustrative page layout. Open the free Celebration games to see the actual files.' : 'Illustrative page layout. Finished files may vary.'}</p>
        </div>
      </div>
    </div>
  </section>;
}

