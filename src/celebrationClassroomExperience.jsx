import { useState } from 'react';
import { ArrowRight, ChatCircleText, CheckCircle, PencilSimple, UsersThree } from '@phosphor-icons/react';
import './celebrationClassroomExperience.css';

const parts = [
  { label: 'Welcome', title: 'Rebuild the Club welcome', image: 'jobs', page: 2, alt: 'Four actual rotating team jobs and the five-mission crew record', body: 'The teacher reads the opening scene. The crew joins the scattered invitation, then uses its message to place paper supplies on the welcome-table mat.', detail: 'These first two missions set the scene for making the Club’s first badge.' },
  { label: 'Share clues', title: 'Four separate clues become one plan', image: 'plan', page: 6, alt: 'Actual blank badge blueprint with spaces for positions and supporting evidence', body: 'The four badge clues are dealt separately. Each holder shares their information, and the crew writes or draws a plan on this blank blueprint.', detail: 'A teammate must be able to point to the clue behind each detail before the group moves on.' },
  { label: 'Make', title: 'Try the symbols, then draw the badge', image: 'symbols', page: 7, alt: 'Nine labelled symbol pieces from the actual Player Pack, with no selected solution', body: 'Use the blueprint to try the printed symbol pieces. Check each choice against a clue, then draw or write the final design on the display badge.', detail: 'The badge can stay flat or fold into a table tent. It is a desk display; no pin or glue is needed.' },
  { label: 'Peer check', title: 'Welcome another crew with a friendly review', image: 'review', page: 9, alt: 'Actual four-point peer-check sheet and space for helpful feedback', body: 'Pass the badge and all four clue cards to the next crew in a circle. Reviewers compare each feature with its clue and return any mismatch for a friendly repair.', detail: 'With one crew, the teacher reviews. After the Club welcome, every pupil can say or show how they helped.' },
];
const jobs = [
  ['Story Reader', 'Read the player steps and invite the crew’s ideas.'],
  ['Prop Mover', 'Move paper pieces after the group agrees.'],
  ['Team Recorder', 'Write or draw the shared plan and results.'],
  ['Evidence Checker', 'Point to the printed clue behind a decision.'],
];

export function CelebrationStoryOpening() {
  return <section id="story-opening" className="theme-detail-section" aria-labelledby="badge-story-heading">
    <div className="theme-detail-heading"><span className="eyebrow">YOUR CREW’S WELCOME MISSION</span><h2 id="badge-story-heading">The Club is opening. Its invitation is scattered.</h2><p>A gust has scattered the Adventure Club invitation before its first welcome ceremony. Your students become a crew who rebuilds the message, prepares the welcome table and makes the Club’s first paper display badge together.</p></div>
    <div className="badge-opening-grid"><article><ChatCircleText size={28} aria-hidden="true" /><h3>A welcome made together</h3><p>Four separate clues describe the badge. Each holder contributes information, the crew makes one shared plan, and another crew checks the result before the Club opens.</p><p className="badge-story-finish">The ending is a shared welcome: show the finished badge and name or demonstrate your contribution.</p></article><article><h3>What happens in your classroom?</h3><ul><li><strong>At a table:</strong> join paper, arrange supplies, share clues, draw and review.</li><li><strong>In crews of 2–6:</strong> students rotate four jobs and work with one complete set.</li><li><strong>With a teacher:</strong> hear each scene and receive the next mission’s materials after a checked result.</li></ul><p>Up to 35 pupils can play in separate crews. Paper, pencils and adult-prepared pieces support the whole story.</p></article></div>
  </section>;
}

export function CelebrationCooperativePlay() {
  const [part, setPart] = useState(0);
  const current = parts[part];
  const source = `/assets/celebration-classroom-preview-${current.image}.jpg`;
  return <section id="crew-play" className="theme-detail-section" aria-labelledby="badge-play-heading">
    <div className="theme-detail-heading"><span className="eyebrow">SEE HOW IT PLAYS</span><h2 id="badge-play-heading">Share the clues. Make a badge. Welcome another crew.</h2><p>Explore four parts of the experience below. The complete game has five connected missions, with two opening tasks leading into planning, making and peer review.</p></div>
    <div className="badge-demo"><div className="badge-part-controls" role="group" aria-label="Explore the Club badge experience">{parts.map((item, index) => <button type="button" key={item.label} aria-pressed={part === index} aria-controls="badge-part-description" onClick={() => setPart(index)}><span>{index + 1}</span>{item.label}</button>)}</div>
      <div className="badge-demo-grid"><figure><a href={source} target="_blank" rel="noopener noreferrer" aria-label={`Enlarge the actual ${current.image} page (opens in a new tab)`}><img src={source} alt={current.alt} width="910" height="1287" /></a><figcaption>Actual A4 Player Pack · page {current.page} · select the image to enlarge.</figcaption></figure><div id="badge-part-description" className="badge-part-description" role="status" aria-live="polite" aria-atomic="true"><span className="eyebrow">{current.label.toUpperCase()}</span><h3>{current.title}</h3><p>{current.body}</p><p className="badge-part-detail">{current.detail}</p><p className="badge-answer-note">The clue cards and completed design are held back here so the crew can discover the answers during play.</p></div></div>
    </div>
    <div className="badge-collaboration"><div><UsersThree size={27} aria-hidden="true" /><h3>Four jobs, with a contribution for every pupil</h3></div><dl>{jobs.map(([name, action]) => <div key={name}><dt>{name}</dt><dd>{action}</dd></div>)}</dl><p>Jobs rotate after each mission. Two or three pupils may combine jobs; with five or six, partners share Reading or Moving and each speaks or moves before rotating. The four badge clues are information to share, separate from these job titles.</p></div>
  </section>;
}

export function CelebrationCrewOutcome() {
  return <section id="crew-finish" className="theme-detail-section" aria-labelledby="badge-finish-heading">
    <div className="theme-detail-heading"><span className="eyebrow">WHAT YOUR CREW COMPLETES</span><h2 id="badge-finish-heading">A desk badge they can explain—and a welcome they share.</h2><p>Each crew makes one badge from the shared evidence. The final review gives pupils a reason to listen to another group, make a friendly repair and recognise each person’s contribution.</p></div>
    <div className="badge-outcome-grid"><article><PencilSimple size={27} aria-hidden="true" /><h3>A plan with supporting clues</h3><p>The crew’s blueprint records what belongs where and which clue supports each choice.</p></article><article><UsersThree size={27} aria-hidden="true" /><h3>A paper desktop display</h3><p>The team draws or writes its checked design on the badge. Keep it flat or fold it into a standing table tent.</p></article><article><CheckCircle size={27} aria-hidden="true" /><h3>A review and shared Club welcome</h3><p>Another crew checks the four features, offers helpful feedback and returns any mismatch for repair before the closing welcome.</p></article></div>
  </section>;
}

export function CelebrationDesignIntent() {
  return <section className="theme-detail-section" aria-labelledby="badge-intent-heading"><div className="theme-detail-heading"><span className="eyebrow">THE IDEA BEHIND THE ADVENTURE</span><h2 id="badge-intent-heading">Give the welcome something everyone helps make.</h2><p>The Club opening links five paper tasks into a shared purpose. A badge gives the crew a visible result, and the evidence check makes the welcome a conversation between groups.</p></div><div className="theme-reasons-grid"><article><span>LISTEN &amp; PLAN</span><p>Separately held clues give pupils a reason to listen, ask questions and agree on one design.</p></article><article><span>MAKE &amp; EXPLAIN</span><p>Paper pieces and a shared blueprint connect decisions with something the crew can show.</p></article><article><span>REVIEW &amp; WELCOME</span><p>Comparing another crew’s badge with its clues provides a concrete way to practise helpful feedback.</p></article></div><p className="badge-intent-note">This is a teacher-led Club welcome with a shared desk display. The printable materials supply the story and clues; children need no digital account.</p></section>;
}

export function CelebrationSourcePreviews({ Link }) {
  return <div className="badge-pack-preview"><div><span className="eyebrow">REAL PLAYER PACK PAGES</span><h3>Inspect the plan and peer-check sheet</h3><p>These actual A4 pages show the blank blueprint and friendly review. The complete free download includes the Player Pack and Teacher Guide in A4 and US Letter.</p><Link className="text-link" to="/en/samples/classroom/">Open the free Classroom files <ArrowRight size={17} aria-hidden="true" /></Link></div><div className="badge-pack-page-grid">{[['plan', 'Blank shared blueprint', 6], ['review', 'Peer check and Club welcome', 9]].map(([name, caption, page]) => <figure key={name}><a href={`/assets/celebration-classroom-preview-${name}.jpg`} target="_blank" rel="noopener noreferrer" aria-label={`Enlarge ${caption.toLowerCase()} (opens in a new tab)`}><img src={`/assets/celebration-classroom-preview-${name}.jpg`} alt={`${caption}, actual A4 Player Pack page ${page}`} width="910" height="1287" loading="lazy" /></a><figcaption>{caption} · page {page}</figcaption></figure>)}</div></div>;
}
