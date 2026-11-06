import { ArrowRight, DownloadSimple, Printer, UsersThree, Lightbulb } from '@phosphor-icons/react';
import { escapeProducts } from '../shared/escape-products.mjs';
import { formatUsd } from '../shared/catalog.mjs';
import { lighthouse, lighthouseArt } from '../shared/lighthouse-game.mjs';
import './escapeGamesHub.css';

// Discovery copy describes the existing editions. Product identity and price come from the catalogue.
const details = {
  'seventh-carriage': {
    mechanic: 'Follow the evidence',
    pitch: 'Seven carriages left. Six arrived. Compare witness accounts, check the clocks and reconstruct the depot map to bring the missing carriage home.',
    players: '2–5 players', adult: 'Adult preparation; help as needed', prep: 'Cut pieces or use the no-cut alternative',
    action: 'Compare records and build an evidence-backed case.',
    alt: 'A vintage night train beside a rain-wet platform',
  },
  'midnight-masquerade': {
    mechanic: 'Talk to solve it',
    pitch: 'The jewel is a glass copy. Each investigator holds different clues: share what you know and work out what happened at the masked ball.',
    players: '3–6 players; 2 supported', adult: 'Plus one adult host', prep: 'Cut-and-sort packets; no-cut mode included',
    action: 'Combine private clues through conversation. Nobody needs to lie.',
    alt: 'Ornate masks and a glass jewel beneath ballroom lights',
  },
  'thirteenth-hour': {
    mechanic: 'Return to a changed scene',
    pitch: 'Wake a sleeping workshop. Unfold a lamp, reconnect the drive and return to a clock wall that has changed. Earlier discoveries matter again.',
    players: '2–5 players', adult: 'Plus one adult host', prep: 'Assemble paper mechanisms or choose no-cut mode',
    action: 'Change a scene, revisit it and use old findings on new evidence.',
    alt: 'Brass clocks and an open mechanical movement on a workbench',
  },
  'last-letter': {
    mechanic: 'Choose what happens next',
    pitch: 'A storm is coming and a sealed letter needs its recipient. Choose a route, pick a tool and decide whether to help. Your choices change the investigation.',
    players: '2–6 players', adult: 'Plus one adult host', prep: 'Print and sort sheets; no cutting required',
    action: 'Choose your route and tools within a shared story action budget.',
    alt: 'A sealed letter overlooking a harbour beneath storm clouds',
  },
  'fold-city': {
    mechanic: 'Change the map by hand',
    pitch: 'Your party is inside a city of paper streets. Turn a quarter, fold a street and uncover a route that was hidden beneath the map.',
    players: '2–4 players; one shared party', adult: 'Adult preparation and supervision', prep: 'Cutting, folding and a glue stick required',
    action: 'Physically turn and fold one shared map to create connected roads.',
    alt: 'A little paper city unfolding across a map',
  },
};
const games = escapeProducts.map(game => ({ ...game, ...details[game.id] }));

function GameCard({ game, Link }) {
  return <article className="eg-card" aria-labelledby={`eg-${game.id}`}>
    <Link className="eg-cover" to={game.path} aria-label={`Explore ${game.title}`}>
      <img src={game.image} alt={game.alt} width="1536" height="1024" loading="lazy"/>
    </Link>
    <div className="eg-card-body">
      <div className="eg-card-top"><span className="eg-mechanic">{game.mechanic}</span><strong className="eg-price">{formatUsd(game.unitAmount)}</strong></div>
      <h3 id={`eg-${game.id}`}><Link to={game.path}>{game.title}</Link></h3>
      <p className="eg-pitch">{game.pitch}</p>
      <dl className="eg-facts">
        <div><dt>Group</dt><dd>{game.players}</dd></div>
        <div><dt>Age</dt><dd>9+ design target · English</dd></div>
        <div><dt>Adult</dt><dd>{game.adult}</dd></div>
        <div><dt>Prepare</dt><dd>{game.prep}</dd></div>
      </dl>
      <Link className="button eg-card-action" to={game.path} aria-label={`See gameplay and kit for ${game.title}`}>See gameplay &amp; kit <ArrowRight size={18}/></Link>
    </div>
  </article>;
}

export function EscapeGamesHub({ Link }) {
  return <main className="lh-page eg-hub"><div className="lh-shell">
    <nav className="lh-breadcrumb" aria-label="Breadcrumb"><Link to="/en/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Escape adventures</span></nav>
    <header className="eg-intro">
      <span className="eyebrow">PAPER ADVENTURE · PRINT, SHARE &amp; DISCOVER</span>
      <h1>Six paper adventures.<br/>Find your way in<span className="dot">.</span></h1>
      <p>Printable escape room games for kids and families. Follow a mystery, share secret clues or reshape a paper city. Start with a complete free game, then choose a different way to play.</p>
      <div className="eg-intro-actions"><a className="button" href="#paid-adventures">Browse the five paid games <ArrowRight size={18}/></a><Link className="text-link" to={lighthouse.path}>Try the free lighthouse game <ArrowRight size={18}/></Link></div>
      <ul className="eg-series-facts"><li>1 complete free game</li><li>5 household games · US$9.99 each</li><li>English · A4 &amp; US Letter</li></ul>
    </header>

    <article className="eg-free" aria-labelledby="eg-free-title">
      <Link className="eg-free-cover" to={lighthouse.path} aria-label="Explore The Sleeping Lighthouse"><img src={lighthouseArt.cover} alt="Paper boats gather beneath an unlit lighthouse at dusk" width="1440" height="960"/></Link>
      <div className="eg-free-body"><span className="lh-free-badge">COMPLETE FREE GAME</span><h2 id="eg-free-title">The Sleeping Lighthouse</h2><p>Restore a keeper’s journal, rebuild the power board and turn a paper lens. Bring three discoveries together to light the bay.</p><ul className="eg-free-facts"><li>Ages 7–12 · adult help as needed</li><li>2–6 players</li><li>Adult-handled cutting</li></ul><Link className="text-link" to={lighthouse.path}>Explore the free adventure <ArrowRight size={18}/></Link><span className="eg-free-note">Player Pack + Adult Guide · no account or payment</span></div>
    </article>

    <section id="paid-adventures" className="eg-section" aria-labelledby="eg-paid-title">
      <div className="eg-section-heading"><div><span className="eyebrow">FIVE WAYS TO PLAY</span><h2 id="eg-paid-title">Choose your next adventure.</h2><p>Each is a complete, separate story. Start with whichever kind of teamwork your group enjoys.</p></div><a className="text-link" href="#compare-adventures">Compare how they play <ArrowRight size={18}/></a></div>
      <p className="eg-purchase-note">US$9.99 each · one-time household purchase · applicable tax included · no subscription</p>
      <div className="eg-grid">{games.map(game => <GameCard key={game.id} game={game} Link={Link}/>)}</div>
      <p className="eg-guidance">Age guidance is provisional. Physical printing and independent family playtesting have not yet been verified; preparation time and play duration have not been measured. Read the game page and preparation requirements before choosing.</p>
    </section>

    <section id="compare-adventures" className="eg-section eg-compare" aria-labelledby="eg-compare-title">
      <span className="eyebrow">FIND YOUR GROUP’S KIND OF CHALLENGE</span><h2 id="eg-compare-title">Same table. Different discoveries.</h2><p>Choose by what players actually do, as well as by the story.</p>
      <div className="eg-comparison" role="list">
        <div className="eg-comparison-row" role="listitem"><div><span className="eg-mechanic">Start free</span><h3><Link to={lighthouse.path}>The Sleeping Lighthouse</Link></h3></div><p>Arrange, compare and turn a paper lens; combine three findings in a final task.</p><p className="eg-comparison-prep">Adult-handled cutting · no glue</p></div>
        {games.map(game => <div className="eg-comparison-row" role="listitem" key={game.id}><div><span className="eg-mechanic">{game.mechanic}</span><h3><Link to={game.path}>{game.title}</Link></h3></div><p>{game.action}</p><p className="eg-comparison-prep">{game.prep}</p></div>)}
      </div>
    </section>

    <section className="eg-section eg-kit" aria-labelledby="eg-kit-title"><span className="eyebrow">FROM DOWNLOAD TO GAME NIGHT</span><h2 id="eg-kit-title">A printable kit, with help along the way.</h2><div className="eg-kit-grid">
      <div><DownloadSimple size={28} aria-hidden="true"/><h3>Get your files</h3><p>Paid games include A4 and US Letter Player Packs, a separate Adult Guide and a complete ZIP with an offline companion and start instructions. The masquerade also has separate role portfolios and a preparation map.</p></div>
      <div><Printer size={28} aria-hidden="true"/><h3>Prepare one paper size</h3><p>Print single-sided at actual size / 100%. Read the Adult Guide first, sort the materials and keep future clues and answers separate. The guide can stay on screen. Check each game’s print plan for the right sheets.</p></div>
      <div><UsersThree size={28} aria-hidden="true"/><h3>Gather your group</h3><p>Use the group sizes and adult requirements above. Some games need a separate host; others use adult help or supervision. Ordinary paper and a pencil are the starting point. Cutting and glue depend on your chosen game.</p></div>
      <div><Lightbulb size={28} aria-hidden="true"/><h3>Play with hints</h3><p>The full paper games work offline with their guides, including hints, solutions and endings. The optional companion offers help and checks. Extract paid ZIP files before opening the helper; modern desktop browsers are recommended.</p></div>
    </div></section>

    <section className="eg-section eg-help" aria-labelledby="eg-faq-title"><div><span className="eyebrow">BEFORE YOU BEGIN</span><h2 id="eg-faq-title">A few practical answers.</h2><p>New to paper adventures? The lighthouse is a complete free game, so you can see how the format works before buying.</p><Link className="text-link" to={lighthouse.path}>Start with the free game <ArrowRight size={18}/></Link></div><div className="eg-faq">
      <details><summary>Is the lighthouse really a complete free game?</summary><p>Yes. It includes the opening, three linked puzzles, a final task, hints, solutions and the ending. Download its Player Pack and Adult Guide without an account or payment.</p></details>
      <details><summary>How do I receive a paid game?</summary><p>Sign in with your adult Google account and complete the one-time purchase. After payment is confirmed, download from your order or <Link to="/en/my-adventures/">My adventures</Link>. These are digital files; no physical kit is shipped.</p></details>
      <details><summary>Do we need a screen or an internet connection to play?</summary><p>No. The paper games and Adult Guides support offline play after download. Paid ZIPs include an optional offline browser companion; the lighthouse has an optional web companion. Opening downloaded HTML on phones varies by device. A separate screen for every player is not required.</p></details>
      <details><summary>How much should I print, and do I need scissors?</summary><p>It depends on the game and preparation mode. Each product page gives its sheet counts and supplies. The railway, masquerade and clockmaker offer no-cut alternatives; the letter needs no cutting. Fold City requires cutting, folding and glue. Use one matching paper size and the supplied print plan. See <Link to="/en/help/print/">printing help</Link>.</p></details>
      <details><summary>Can I replay or print a paid game for a class?</summary><p>The US$9.99 editions are for the adult purchaser’s household, private non-commercial play and reasonable household reprinting. They do not include a classroom licence. Online re-download access lasts 12 months from confirmed payment; downloaded files remain usable within the licence. Mysteries have known answers after the first play. The letter has different choice paths, but some evidence is shared between them.</p><p>The free lighthouse may also be used with classes you teach under its stated terms. Please do not resell or republish the files.</p></details>
      <details><summary>Where can I get help with an order?</summary><p>Open <Link to="/en/my-adventures/">My adventures</Link> for purchased files, or visit the <Link to="/en/help/">Help centre</Link>. Read the <Link to="/en/refunds/">refund policy</Link> before purchasing.</p></details>
    </div></section>
    <aside className="eg-small-puzzles"><div><h2>Just looking for one small puzzle?</h2><p>Try six independent codes, logic tasks and routes in our free puzzle workshop.</p></div><Link className="text-link" to="/en/escape-room-puzzles/">Open the free puzzle cards <ArrowRight size={18}/></Link></aside>
  </div></main>;
}
