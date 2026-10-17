import { useState } from 'react';
import assets from './christmasHomePreviewAssets.json';
import './christmasHomeExperience.css';

function Preview({ name, eager = false, compact = false }) {
  const item = assets[name], src = `/assets/christmas-home-detail-${name}.jpg`;
  return <figure className={compact ? 'christmas-compact-preview' : undefined}><a href={src} target="_blank" rel="noopener noreferrer" aria-label={`Enlarge ${item.caption.toLowerCase()} (opens in a new tab)`}><img src={src} alt={item.caption} width={item.width} height={item.height} loading={eager ? undefined : 'lazy'} /></a><figcaption>{compact ? <>Player Pack · Page {item.page}</> : <>Player Pack source · A4 page {item.page} excerpt · {item.caption}.</>}</figcaption></figure>;
}

const foldSteps = [
  ['1 · Flat blank', 'Find the coral fold line. BACK is above it; FRONT is below. An adult cuts the dashed outside first.', 'gift-blank'],
  ['2 · Fold to stand', 'Fold BACK behind FRONT, with the ridge at the top. The printed side view shows how the FRONT slopes towards the viewer. If thin paper slips, lay the gift face-up.', 'fold-shape'],
  ['3 · Open to draw', 'Open the gift flat again. Keep FRONT facing up to draw the icon, ribbon and seal from the shared clues. Stand it again after checking.', 'gift-front'],
];

function PracticeLayout({ title, label, steps, step, setStep, statusId, children }) {
  return <div className="christmas-practice"><div className="christmas-practice-guide"><h4>{title}</h4><div className="christmas-controls christmas-step-controls" role="group" aria-label={label}>{steps.map(([text], i) => <button type="button" key={text} aria-pressed={step === i} aria-controls={statusId} onClick={() => setStep(i)}>{text}</button>)}</div></div><div className="christmas-practice-visual">{children}</div><p id={statusId} className="christmas-step-summary" role="status" aria-live="polite" aria-atomic="true">{steps[step][1]}</p></div>;
}

function FoldPractice() {
  const [step, setStep] = useState(0);
  return <PracticeLayout title="Try the three folding steps" label="Explore the gift fold" steps={foldSteps} step={step} setStep={setStep} statusId="christmas-fold-status"><div className={`christmas-fold-example step-${step}`}><Preview name={foldSteps[step][2]} eager compact /></div></PracticeLayout>;
}

const patternSteps = [
  ['1 · Icon', 'Start near the fold. The triangle in this separate printed practice is an example, not one of the game’s gift answers.'],
  ['2 · Ribbon', 'Draw the ribbon through the middle after listening to the ribbon clue. Each actual gift’s direction comes from the shared cards.'],
  ['3 · Seal', 'Add the small-circle seal in the corner agreed from the seal clue. Let every clue-holder check their part before finishing the gift.'],
];

function PatternPractice() {
  const [step, setStep] = useState(0);
  return <PracticeLayout title="Explore the three features" label="Explore the practice wrapping pattern" steps={patternSteps} step={step} setStep={setStep} statusId="christmas-pattern-status"><figure className="christmas-practice-figure"><div className="christmas-pattern-example"><img src="/assets/christmas-home-detail-practice.jpg" alt="Separate practice gift with a triangle, ribbon line and circle seal" width={assets.practice.width} height={assets.practice.height} /><div className={`christmas-pattern-focus field-${step}`} aria-hidden="true" /></div><figcaption>Printed practice · Page 9 · Not a game answer</figcaption></figure></PracticeLayout>;
}

const checkSteps = [
  ['1 · Check icon', 'Move the small window over one icon. Compare it with the shared instruction before moving on.'],
  ['2 · Check ribbon', 'Move to the ribbon and check its direction. Keep the gift flat so the mark stays visible.'],
  ['3 · Check seal', 'Look at the seal’s position. Check all three features on each gift, one gift at a time.'],
  ['4 · Repair & recheck', 'If a mark differs, erase and redraw only that mark, then check again. Once all three gifts pass, fold them to stand or lay them face-up in the village.'],
];

function CheckPractice() {
  const [step, setStep] = useState(0);
  return <PracticeLayout title="Check one mark at a time" label="Explore checking and repair" steps={checkSteps} step={step} setStep={setStep} statusId="christmas-check-status"><figure className="christmas-practice-figure"><div className={`christmas-check-stage field-${step}`}><img className="christmas-check-pattern" src="/assets/christmas-home-detail-practice.jpg" alt="Independent printed practice pattern beneath the check frame" width={assets.practice.width} height={assets.practice.height} /><img className="christmas-check-frame" src="/assets/christmas-home-detail-frame.jpg" alt="Actual quality frame, with its small inner window shown open" width={assets.frame.width} height={assets.frame.height} /></div><figcaption>Frame: page 11 · Practice: page 9 · Not a game answer</figcaption></figure></PracticeLayout>;
}

const demos = [
  { label: 'Fold the gifts', title: 'Fold a blank, then open it to draw.', body: 'Fold BACK behind FRONT, open flat to draw, then stand the gifts after checking. An adult handles the cutting.' },
  { label: 'Share the wrapping plan', title: 'Share three clues to agree each pattern.', body: 'Read every clue aloud before drawing. Combine the recipient, ribbon and seal instructions for each gift.' },
  { label: 'Check and repair', title: 'Check one mark, repair and recheck.', body: 'Move the frame over one mark at a time. Compare with the clues, repair what differs and check again.' },
];

function MaterialLink({ name, label, thumbnail = false }) {
  const item = assets[name];
  return <a className="christmas-material-link" href={`/assets/christmas-home-detail-${name}.jpg`} target="_blank" rel="noopener noreferrer" aria-label={`View ${item.caption.toLowerCase()} (opens in a new tab)`}>{thumbnail && <img src={`/assets/christmas-home-detail-${name}.jpg`} alt="" width={item.width} height={item.height} loading="lazy" />}<span><strong>{label}</strong><small>Player Pack · Page {item.page}</small></span></a>;
}

function MaterialStrip({ demo }) {
  return <aside className="christmas-material-strip" aria-label="Actual Player Pack materials"><span>REAL MATERIALS</span><div className="christmas-material-links">{demo === 0 ? <MaterialLink name="gifts" label="Three gift blanks" thumbnail /> : demo === 1 ? <><MaterialLink name="who-title" label="Who receives it" /><MaterialLink name="ribbon-title" label="Ribbon direction" /><MaterialLink name="seal-title" label="Seal position" /></> : <MaterialLink name="frame" label="Adult-cut quality frame" thumbnail />}</div></aside>;
}

export function ChristmasHeroMaterial() {
  return <figure className="christmas-hero-material"><a href="/assets/christmas-home-detail-gift-front.jpg" target="_blank" rel="noopener noreferrer" aria-label="Enlarge the undecorated gift front (opens in a new tab)"><img src="/assets/christmas-home-detail-gift-front.jpg" alt="Actual undecorated paper gift front" width={assets['gift-front'].width} height={assets['gift-front'].height} /></a><figcaption>Fold, decorate and check together.<br />Player Pack page 7 excerpt.</figcaption></figure>;
}

export function ChristmasStoryOpening() {
  return <section id="story-opening" className="theme-detail-section" aria-labelledby="christmas-story-heading"><div className="theme-detail-heading"><span className="eyebrow">THE WINTER MESSENGER NEEDS A GIFT CREW</span><h2 id="christmas-story-heading">A winter gust. Three paper gifts. A village waiting.</h2><p>A rush of winter wind has flattened the office’s star press. Owl, Fox and Rabbit need three paper gifts for their winter village. Your family opens the paper workshop, makes the gifts and shares the wrapping instructions before checking the final display.</p></div><div className="christmas-opening-grid"><article><h3>Keep making the same three gifts</h3><p>Fold them, open them to draw, check their marks and place them in the village. Each finished piece carries forward to the next mission.</p><p>The star press is a folded paper stand beside the gifts. All story gifts and the friends’ reply are printed materials.</p></article><article><h3>A family workshop at your table</h3><ul><li><strong>2–6 children per team:</strong> share four rotating jobs.</li><li><strong>One additional adult host:</strong> cut, read scenes, offer hints and check the work.</li><li><strong>7–12 children:</strong> two balanced teams with two complete sets.</li></ul><p>Use ordinary paper, a pencil, an eraser and adult-handled scissors. No real gift, tape or glue is needed.</p></article></div></section>;
}

export function ChristmasCooperativePlay() {
  const [demo, setDemo] = useState(0), current = demos[demo];
  return <section id="crew-play" className="theme-detail-section" aria-labelledby="christmas-play-heading"><div className="theme-detail-heading"><span className="eyebrow">SEE THE PAPER GIFT WORKSHOP IN ACTION</span><h2 id="christmas-play-heading">Fold, share and check before the display.</h2><p>Choose an action, explore its steps and see what changes. Real Player Pack materials are linked below each demonstration.</p></div><div className="christmas-demo"><div className="christmas-controls christmas-demo-controls" role="group" aria-label="Explore three gift workshop examples">{demos.map((item, i) => <button type="button" key={item.label} aria-pressed={demo === i} aria-controls="christmas-demo-description" onClick={() => setDemo(i)}><span>{i + 1}</span>{item.label}</button>)}</div><div id="christmas-demo-description" className="christmas-demo-intro" role="status" aria-live="polite" aria-atomic="true"><h3>{current.title}</h3><p>{current.body}</p></div>{demo === 0 ? <FoldPractice /> : demo === 1 ? <PatternPractice /> : <CheckPractice />}<MaterialStrip demo={demo} /></div></section>;
}

export function ChristmasFamilyPlay() {
  return <section id="family-play" className="theme-detail-section" aria-labelledby="christmas-family-heading"><div className="theme-detail-heading"><span className="eyebrow">FOUR ROTATING WORKSHOP JOBS</span><h2 id="christmas-family-heading">Every child makes, shares or checks.</h2><p>The adult cuts the materials and guides each scene. Children share the four jobs, exchanging cards or bundles after missions 1–4.</p></div><dl className="christmas-jobs">{[['Storyteller','Read the new scene or ask the adult to read. Invite every child to say what the crew should do next.'],['Maker','Fold, draw or place one piece at a time. Pass the next hand action to a teammate.'],['Clue Keeper','Find the current prop or clue, hear all three wrapping cards and recall who receives each gift.'],['Checker','Compare the result with Finished when, name one part to repair and show the work to the adult.']].map(([job,body]) => <div key={job}><dt>{job}</dt><dd>{body}</dd></div>)}</dl><div className="christmas-sharing"><div><h3>Share and rotate the jobs</h3><ul><li><strong>2 children:</strong> Storyteller + Clue Keeper and Maker + Checker; exchange both bundles.</li><li><strong>3:</strong> combine Storyteller + Clue Keeper; rotate the three bundles.</li><li><strong>4:</strong> one job each; rotate all four.</li><li><strong>5–6:</strong> pair Maker and/or Checker. Partners alternate hand actions and spoken checks, then rotate.</li><li><strong>7–12:</strong> two balanced teams of 3–6 with separate complete sets. The adult checks both before either starts the next mission.</li></ul></div><div><h3>Hear all three wrapping cards</h3><p>Give the three cards to different children where possible. Every holder reads their whole clue aloud. These are shared information sources; keep them available for checking and final placement.</p><p><strong>With two children:</strong> give Clues 1 and 2 to different children and read Clue 3 together.</p><p>Children may point or speak while a partner or adult helps with reading and drawing. Reading speed and handwriting do not decide whether the crew finishes.</p></div></div></section>;
}

export function ChristmasCrewOutcome() {
  return <section id="crew-finish" className="theme-detail-section" aria-labelledby="christmas-finish-heading"><div className="theme-detail-heading"><span className="eyebrow">WHAT YOUR FAMILY COMPLETES</span><h2 id="christmas-finish-heading">Three checked gifts, one shared winter display.</h2><p>Use the shared WHO clue to place every finished gift with its story friend. Explain the evidence, keep the decorated fronts visible and invite the adult to read the held-back reply.</p></div><div className="christmas-outcome-grid"><article><span>MAKE & KEEP</span><h3>Three decorated paper gifts</h3><p>Keep the blanks your team folded and drew with the agreed icon, ribbon and seal.</p></article><article><span>CHECK & DISPLAY</span><h3>A winter village scene</h3><p>Place the checked gifts and star stand together. Lay thin paper face-up if it will not stand.</p></article><article><span>FINISH THE STORY</span><h3>A friends’ paper reply</h3><p>Hear the printed ending and name or point to one contribution you made. The scene and reply are paper keepsakes.</p></article></div><div className="christmas-village-preview"><Preview name="village" /><p className="christmas-source-note">The real display board is shown empty. Gift-to-friend matches, completed patterns and the reply stay inside the adventure.</p></div></section>;
}

export function ChristmasDesignIntent() {
  return <section className="theme-detail-section" aria-labelledby="christmas-intent-heading"><div className="theme-detail-heading"><span className="eyebrow">THE IDEA BEHIND THE ADVENTURE</span><h2 id="christmas-intent-heading">The story gives every paper action a purpose.</h2><p>One winter workshop connects making, spoken information and careful repair. The same three gifts move from blank paper to a shared village scene.</p></div><div className="theme-reasons-grid"><article><span>MAKE SOMETHING TOGETHER</span><p>Folding and drawing create the pieces used in later missions.</p></article><article><span>LISTEN BEFORE DRAWING</span><p>Three separate cards make the wrapping plan depend on shared information.</p></article><article><span>REPAIR BEFORE DISPLAYING</span><p>The small frame window helps the crew focus on one mark and try again.</p></article></div><p className="christmas-source-note">The game has one fixed wrapping solution. For replay, swap jobs; print fresh gift blanks on page 7 if you want to draw again.</p></section>;
}

export function ChristmasSourcePreviews() {
  return <div className="christmas-pack-preview"><span className="eyebrow">REAL PLAYER PACK MATERIALS</span><h3>A paper stand and a guide to the fold.</h3><p>These excerpts show the workshop’s physical materials. The complete clue text, check answers and final reply are kept in the game.</p><div className="christmas-pack-page-grid"><Preview name="press" /><Preview name="fold-guide" /></div></div>;
}

export function ChristmasHostFileCard() {
  return <article className="theme-file-card"><span>FOR THE ADULT HOST</span><h3>Host Guide</h3><p>Read separately to prepare and lead the five workshop missions.</p><ul><li>Print inventory, cutting boundaries and covered mission piles</li><li>Exact grouping, rotating jobs and reading support</li><li>Read-aloud scenes, physical acceptance checks and two graduated hints</li><li>Repair, replacement, final reply and replay instructions</li></ul></article>;
}

export function ChristmasPreparation() {
  return <section className="theme-detail-section theme-prep" aria-labelledby="theme-prep-heading"><div><span className="eyebrow">BEFORE YOU PLAY</span><h2 id="theme-prep-heading">Prepare the workshop. Keep the reply for the end.</h2></div><div><p>Print single-sided in one paper size, A4 or US Letter, at Actual size / 100%. Use ordinary paper, a pencil, an eraser and adult-handled scissors. The Host Guide can stay on screen.</p><div className="theme-print-specs"><div><strong>14 Player pages + 8 Host Guide pages</strong><span>Print 14 Player sheets for one team of 2–6 children, or 28 for two teams of 7–12. One adult Guide serves both teams; the adult is outside the player count.</span></div><div><strong>12 loose pieces per team</strong><span>Four jobs, one star press, three gift blanks, three wrapping clue cards and one quality frame. Keep the drawing guide, village board and reply whole.</span></div><div><strong>Adult cuts; children fold</strong><span>Before play, cut the four job cards. During each mission the adult cuts its prop: press, gifts, clues and the frame’s outer edge plus inner window. Children fold coral lines. For two teams, pre-cut separate sets into covered numbered piles.</span></div><div><strong>Five piles and a held-back reply</strong><span>Prepare pages 4–5, 6–7, 8–9, 10–11 and 12–13 as five mission piles. Start with jobs, page 3 and mission 1 only; keep later piles and reply page 14 with the adult.</span></div><div><strong>Fold, open, draw and check</strong><span>FRONT is below the fold. Fold BACK behind it with the ridge on top, then open flat to draw and check. After acceptance, stand the gifts or lay slippery paper face-up in the village.</span></div></div><p>The gifts and ending are paper props. No real gift, physical delivery, tape, glue or child account is required.</p><p className="theme-prep-note">Preparation and play time will be added after physical print and real-family checks.</p></div></section>;
}
