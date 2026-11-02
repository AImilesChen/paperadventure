import { useState } from 'react';
import { Printer, Monitor, Backspace, Scissors, Equals } from '@phosphor-icons/react';
import { homeGamePlanning, homePrintPlan } from '../shared/home-game-planning.mjs';
import dinosaurAssets from './dinosaurPreviewAssets.json';
import christmasAssets from './christmasHomePreviewAssets.json';
import './featuredHomePreparation.css';
import './printingCalculator.css';

// Counts and handoffs follow dinosaur_home_experience.py and christmas_home_workshop.py.
const packs = {
  dinosaur: {
    ...homeGamePlanning.dinosaur,
    inventory: '4 job cards · 6 landscape tiles · 4 supply tokens · 2 markers',
    previews: [['map', 'A landscape to build'], ['backpack', 'A place for paper supplies'], ['record', 'A record of the journey']],
    materials: 'Ordinary paper, a pencil, adult-handled scissors and a flat table. All supplies and obstacles in the story are paper pieces.',
    steps: [
      ['Read and print', 'Read the Host Guide first. Print Player pages 1–15 for each team, single-sided at Actual size / 100%, in matching A4 or US Letter.'],
      ['Cut and count', 'An adult cuts 4 jobs on page 2, 6 tiles on page 8, 4 supplies on page 10 and 2 markers on page 12. Keep the map and backpack boards whole.'],
      ['Sort the missions', 'Start with pages 1–3. Prepare piles 4–5, 6–8, 9–10, 11–12 and 13. Keep the welcome on page 14 and keepsake on page 15 with the adult until the ending.'],
      ['Host one mission at a time', 'Read the scene, hand out its materials, check the paper evidence and offer a hint when needed. Rotate the four jobs after missions 1–4.'],
    ],
    table: [['ADULT SIDE', 'Host Guide, later mission piles and ending pages'], ['TEAM SIDE', 'Current mission, journey record and space for the map'], ['WITHIN REACH', 'Counted paper pieces and a pencil']],
    questions: [
      ['Can I use this at a dinosaur birthday party?', 'Yes, for a private Home gathering of 2–12 children with an additional adult host. The story is Milo’s fixed expedition, not a personalized birthday story. For 7–12 children, prepare two balanced teams of 3–6 and two complete sets.'],
      ['What if a child needs help reading or writing?', 'The adult can read scenes and tasks aloud. Children can point, move pieces or dictate while a partner writes. Review the actual materials and use the Host Guide’s reading support to judge the fit for your group.'],
      ['Do I need a dinosaur toy or real equipment?', 'No. Milo, the supplies and the landscape are printed paper materials. The game stays at the table; it does not require a real river, lamp, lock or hidden objects.'],
    ],
  },
  christmas: {
    ...homeGamePlanning.christmas,
    inventory: '4 job cards · 1 press · 3 gifts · 3 clue cards · 1 frame',
    previews: [['gifts', 'Three gifts to fold'], ['frame', 'A frame for checking'], ['village', 'A shared winter display']],
    materials: 'Ordinary paper, a pencil, an eraser, adult-handled scissors and a flat table. No real gifts, tape or glue are required.',
    steps: [
      ['Read and print', 'Read the Host Guide first. Print Player pages 1–14 for each team, single-sided at Actual size / 100%, in matching A4 or US Letter.'],
      ['Prepare the cuts', 'Cut the 4 job cards before play. The adult cuts the press, gifts, clues and frame as their missions begin. For two teams, pre-cut each separate set into covered piles. Cut the frame’s inner window; keep the village whole.'],
      ['Stage five mission piles', 'Prepare pages 4–5, 6–7, 8–9, 10–11 and 12–13. Begin with the jobs, page 3 and mission 1. Keep later piles and the reply on page 14 with the adult.'],
      ['Fold, share and check', 'Children fold BACK behind FRONT, open the gifts flat to draw and check, then stand them in the village. If thin paper slips, lay gifts face-up. Rotate jobs after missions 1–4.'],
    ],
    table: [['ADULT SIDE', 'Host Guide, covered later piles and reply page 14'], ['TEAM SIDE', 'Current mission and flat gifts for drawing and checking'], ['DISPLAY SPACE', 'Whole village board; add gifts after their checks']],
    questions: [
      ['Is this a Christmas treasure hunt?', 'It is an adult-led tabletop gift workshop. Children fold paper props, share wrapping clues, check their work and build a village display. No search around the house or real presents are required.'],
      ['Can children with different reading abilities join?', 'An adult or partner can read the clues aloud. Children can point or speak while someone helps draw or record. In a two-child team, share the first two clue cards and read the third together.'],
      ['Can we play the game again?', 'The wrapping solution stays the same. Swap jobs for another play-through and print fresh gift blanks on Player page 7 if you want to draw again. Keep all 12 pieces together and return the reply to the adult.'],
    ],
  },
};

export function PackPurchaseFacts({ themeId }) {
  const pack = packs[themeId];
  return <div className="pack-purchase-facts"><p><strong>{pack.playerPages} Player pages</strong><span aria-hidden="true"> · </span>{pack.guidePages}-page Host Guide<span aria-hidden="true"> · </span>{pack.pieces} paper pieces per team</p><a href="#prepare-game">See printing and adult preparation ↓</a></div>;
}

export function FeaturedHostFileCard({ themeId }) {
  const pack = packs[themeId];
  const contents = themeId === 'dinosaur'
    ? ['Print inventory, 16-piece cutting list and mission handoffs', 'Rotating jobs and reading or writing support', 'Read-aloud scenes, evidence checks and graduated hints', 'Correction, no-cut fallback, final welcome and reset']
    : ['Print inventory, cutting boundaries and covered mission piles', 'Grouping, rotating jobs and reading support', 'Read-aloud scenes, physical checks and two graduated hints', 'Repair, replacement, final reply and replay'];
  return <article className="theme-file-card"><span>FOR THE ADULT HOST</span><h3>Host Guide · {pack.guidePages} pages</h3><p>Read separately to prepare and lead the five missions.</p><ul>{contents.map(item => <li key={item}>{item}</li>)}</ul></article>;
}

export function FeaturedPackMaterials({ themeId }) {
  const pack = packs[themeId], assets = themeId === 'dinosaur' ? dinosaurAssets : christmasAssets;
  return <div className="pack-material-overview"><div className="pack-material-heading"><span className="eyebrow">ACTUAL PLAYER PACK EXCERPTS</span><h3>Paper materials you can inspect before buying.</h3><p>Selected blank materials from the game, not a view of every page. Complete clues, solutions and the ending stay in the pack.</p></div><div className="pack-material-grid">{pack.previews.map(([name, title]) => {
    const item = assets[name], src = `/assets/${themeId}-home-detail-${name}.jpg`;
    return <figure key={name}><a href={src} target="_blank" rel="noopener noreferrer" aria-label={`Enlarge ${title.toLowerCase()} (opens in a new tab)`}><img src={src} alt={item.caption} width={item.width} height={item.height} loading="lazy"/><span>Enlarge material ↗</span></a><figcaption><strong>{title}</strong><span>Player Pack · A4 page {item.page}{item.excerpt ? ' excerpt' : ''}</span></figcaption></figure>;
  })}</div><p className="pack-inventory"><strong>{pack.pieces} loose pieces per team:</strong> {pack.inventory}. Keep boards and other whole pages uncut as directed.</p></div>;
}

export function HomePrintingCalculator({ themeId, Link }) {
  const pack = packs[themeId];
  const [children, setChildren] = useState('4');
  const [printGuide, setPrintGuide] = useState(false);
  const [pending, setPending] = useState(false);
  const [replaceEntry, setReplaceEntry] = useState(true);
  const plan = homePrintPlan(themeId, children, printGuide);
  const ready = !pending && plan;
  function digit(value) {
    setChildren(current => replaceEntry || current.length >= 2 || current === '0' ? value : current + value);
    setReplaceEntry(false);
    setPending(true);
  }
  function edit(value) { setChildren(value); setReplaceEntry(false); setPending(true); }
  function calculate(event) { event.preventDefault(); setPending(false); setReplaceEntry(true); }
  return <div className="pack-print-card" aria-labelledby="pack-calculator-title">
    <div className="print-tool-heading"><span className="eyebrow">PAPER ADVENTURE</span><h2 id="pack-calculator-title">Game printing calculator</h2><p>Plan the paper for your {themeId === 'dinosaur' ? 'Dinosaur' : 'Christmas'} Home game.</p></div>
    <div className="print-tool-workbench">
      <form className="print-calculator-machine" aria-label="Game printing calculator" onSubmit={calculate} noValidate>
        <div className="print-machine-brand">PAPER ADVENTURE</div>
        <div className="print-machine-entry"><label htmlFor="pack-children">Children</label><input id="pack-children" aria-label="Number of children" type="number" min="2" max="12" step="1" inputMode="numeric" value={children} onChange={event => edit(event.target.value)} aria-describedby="pack-children-help" aria-invalid={!pending && !plan}/><small id="pack-children-help" className="print-machine-help">2–12 allowed,<br/>adult excluded</small></div>
        <div className="print-machine-screen"><div className="pack-calculator-result" role="status" aria-live="polite" aria-atomic="true"><p className="pack-sheet-total"><strong className={ready ? '' : 'waiting'}>{ready ? plan.totalSheets : '—'}</strong><span>sheets</span></p><p className={!pending && !plan ? 'print-display-error' : 'print-display-hint'}>{ready ? plan.teams.length === 1 ? `1 team of ${plan.children}` : `2 teams: ${plan.teams[0]} + ${plan.teams[1]}` : pending ? 'Enter 2–12, then press =' : 'Enter a whole number: 2–12'}</p></div></div>
        <fieldset className="print-machine-modes"><legend>Host Guide</legend><label className={!printGuide ? 'selected' : ''}><input type="radio" name="pack-guide" value="screen" checked={!printGuide} onChange={() => setPrintGuide(false)} aria-label="Read Host Guide on screen"/><Monitor size={27} aria-hidden="true"/><span>On screen<small>+0 sheets</small></span></label><label className={printGuide ? 'selected' : ''}><input type="radio" name="pack-guide" value="print" checked={printGuide} onChange={() => setPrintGuide(true)} aria-label="Print one Host Guide"/><Printer size={27} aria-hidden="true"/><span>Print Guide<small>+{pack.guidePages} sheets</small></span></label></fieldset>
        <div className="print-machine-keypad" role="group" aria-label="Enter number of children">{['7','8','9','4','5','6','1','2','3'].map(value => <button type="button" key={value} onClick={() => digit(value)} aria-label={`Enter ${value}`}>{value}</button>)}<button type="button" className="print-key-clear" onClick={() => edit('')} aria-label="Clear number">AC</button><button type="button" onClick={() => digit('0')} aria-label="Enter 0">0</button><button type="button" className="print-key-delete" onClick={() => edit(children.slice(0, -1))} aria-label="Delete last digit"><Backspace size={23}/></button></div>
        <button type="submit" className="print-key-equals" aria-label="Calculate printing"><Equals size={32} weight="bold" aria-hidden="true"/> Calculate</button>
      </form>
      <div className="print-receipt" role="region" aria-labelledby="print-receipt-title"><div className="print-receipt-heading"><Printer size={41} aria-hidden="true"/><div><span className="eyebrow">READY FOR YOUR PRINTER</span><h3 id="print-receipt-title">Your print list</h3></div></div>
        {ready ? <><p className="print-receipt-group">{plan.children} children · {plan.playerCopies} {plan.playerCopies === 1 ? 'team' : 'teams'}</p><dl className="print-receipt-lines"><div><dt>Player Pack<small>{plan.playerCopies} {plan.playerCopies === 1 ? 'copy' : 'copies'} × {pack.playerPages} pages</small></dt><dd>{plan.playerSheets} sheets</dd></div><div><dt>Host Guide<small>{printGuide ? 'One adult copy' : 'Read on screen'}</small></dt><dd>{plan.guideSheets} sheets</dd></div></dl><p className="print-receipt-total"><span>Total</span><strong>{plan.totalSheets} sheets</strong></p><p className="pack-cut-total"><Scissors size={28} aria-hidden="true"/><strong>{plan.pieces} cut-out pieces</strong></p></> : <div className="print-receipt-empty"><p>Your printing list will appear here.</p><p>Type 2–12 children or use the number keys, choose your Guide option, then press <strong>=</strong>.</p></div>}
        <p className="print-receipt-note">A4 or US Letter · single-sided</p>
      </div>
    </div>
    <div className="pack-calculator-footer"><details className="pack-print-reference"><summary>See one- and two-team totals</summary><p className="print-calculation-note">One PDF page per sheet. Print the Host Guide once, even for two teams. Cut-out pieces are separate from the sheet count.</p><p><strong>Player Pack · {pack.playerPages} pages</strong><br/>One complete copy per team.</p><p><strong>Host Guide · {pack.guidePages} pages</strong><br/>One adult copy, on screen or printed.</p><div className="pack-table-wrap"><table><caption>Single-sided sheets with the Host Guide on screen</caption><thead><tr><th scope="col">Children</th><th scope="col">Team sets</th><th scope="col">Sheets</th></tr></thead><tbody><tr><th scope="row">2–6</th><td>1</td><td>{pack.playerPages}</td></tr><tr><th scope="row">7–12</th><td>2</td><td>{pack.playerPages * 2}</td></tr></tbody></table></div><p className="pack-print-note">Printing one Host Guide adds {pack.guidePages} sheets: {pack.playerPages + pack.guidePages} for one team or {pack.playerPages * 2 + pack.guidePages} for two. For 7–12 children, use two balanced teams of 3–6; the adult is additional.</p></details><Link className="text-link" to="/en/help/print/">Printing help →</Link></div>
  </div>;
}

export function FeaturedHomePreparation({ themeId, Link }) {
  const pack = packs[themeId];
  return <>
    <section id="prepare-game" className="theme-detail-section pack-calculator-section" aria-labelledby="pack-calculator-title"><HomePrintingCalculator key={themeId} themeId={themeId} Link={Link}/></section>
    <section className="theme-detail-section pack-preparation" aria-labelledby="theme-prep-heading"><div className="theme-detail-heading"><span className="eyebrow">PRINT, SET OUT, HOST</span><h2 id="theme-prep-heading">Know what to prepare before everyone arrives.</h2><p>{pack.materials}</p></div>
      <div className="pack-preparation-grid">
      <div className="pack-host-steps"><h3>Your adult preparation checklist</h3><ol>{pack.steps.map(([title, body], index) => <li key={title}><span aria-hidden="true">0{index + 1}</span><div><h4>{title}</h4><p>{body}</p></div></li>)}</ol></div></div>
      <div className="pack-table-setup"><div><span className="eyebrow">SET OUT THE TABLE</span><h3>A space for the team. Later clues with the adult.</h3><p>For two teams, repeat the team area and keep each set separate. Check both teams before moving to the next mission.</p></div><figure><div className="pack-table-zones">{pack.table.map(([title, body]) => <div key={title}><strong>{title}</strong><span>{body}</span></div>)}</div><figcaption>Table setup schematic · positions are suggestions, not an included game board.</figcaption></figure></div>
    </section>
    <section className="theme-detail-section pack-practical-questions" aria-labelledby="pack-questions-heading"><div className="theme-detail-heading"><span className="eyebrow">BEFORE YOU CHOOSE</span><h2 id="pack-questions-heading">A few practical questions.</h2></div><div>{pack.questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
  </>;
}
