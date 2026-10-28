import { ArrowRight, ArrowUpRight } from '@phosphor-icons/react';
import './homeProductGuide.css';

export function HomeProductGuide({ Link, sampleReady = false }) {
  return <section className="home-product-guide" aria-labelledby="home-product-guide-title">
    <div className="home-product-shell">
      <div className="home-product-heading"><div><span className="eyebrow">WHAT YOU ACTUALLY PLAY</span><h2 id="home-product-guide-title">Real pages. Shared discoveries<span className="dot">.</span></h2></div><p>Paper Adventure games pair a Player Pack with a separate adult guide. Here are actual excerpts from the free Celebration Home game: a shared evidence record and the host’s clue handoff.</p></div>
      <div className="home-product-layout">
        <figure className="home-material-card"><a className="home-material-image" href="/assets/celebration-home-detail-record.jpg" target="_blank" rel="noopener noreferrer" aria-label="Enlarge the blank Player Pack evidence record (opens in a new tab)"><img src="/assets/celebration-home-detail-record.jpg" alt="Actual blank record for five Celebration Home checkpoints, with no filled answers" width="1202" height="711" loading="lazy"/><span>Enlarge the page <ArrowUpRight size={16}/></span></a><figcaption><span className="eyebrow">PLAYER PACK · PAGE 3 EXCERPT</span><h3>Print the Player Pack</h3><p>Compare clues and keep one agreed record through five checkpoints. The team uses this evidence at the ending.</p></figcaption></figure>
        <figure className="home-material-card"><a className="home-material-image" href="/assets/celebration-home-detail-handout-cut.jpg" target="_blank" rel="noopener noreferrer" aria-label="Enlarge the Host Guide clue-handoff excerpt (opens in a new tab)"><img src="/assets/celebration-home-detail-handout-cut.jpg" alt="Actual Host Guide illustration showing a retained letter board and three separate clue cards" width="380" height="491" loading="lazy"/><span>Enlarge the page <ArrowUpRight size={16}/></span></a><figcaption><span className="eyebrow">HOST GUIDE · PAGE 4 EXCERPT</span><h3>Keep the adult guide</h3><p>The adult deals the clue cards, keeps the common board intact, and uses the guide’s hints and answers.</p></figcaption></figure>
      </div>
      <div className="home-play-example"><div><span className="eyebrow">ONE MOMENT IN THE HOME STORY</span><h3>Different clues. One team decision.</h3><p>At the letter checkpoint, everyone has a reason to contribute.</p></div><ol><li><strong>Share separate clues</strong><p>Courier, Spotter and Keeper each receive one clue and explain what they know.</p></li><li><strong>Compare together</strong><p>The group checks every condition against the common board before agreeing.</p></li><li><strong>Record the evidence</strong><p>Mapper writes the team’s choice, and the adult checks the explanation before the next pile.</p></li></ol></div>
      <div className="home-product-bottom"><p>Player Pack and adult-guide PDFs come in A4 and US Letter.</p><div><Link className="text-link" to="/en/samples/home/">{sampleReady ? 'Try the complete free Home game' : 'Explore the Home game'} <ArrowRight size={18}/></Link><Link className="text-link" to="/en/guides/run-a-printable-adventure/">See the hosting guide <ArrowRight size={18}/></Link></div></div>
    </div>
  </section>;
}

