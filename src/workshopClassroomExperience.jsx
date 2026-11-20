import { t as translateUi, localHref } from "./i18n/index.mjs";import { useState } from 'react';
import { ArrowRight, ChatCircleText, FileText, Hammer, UsersThree } from '@phosphor-icons/react';
import './workshopClassroomExperience.css';

const demoSteps = [
{ label: 'The flat track', title: 'Start with the printed pieces', body: 'The teacher cuts the outer track and the plain calibration card. The two long dotted lines stay intact: they are fold lines.', detail: 'The printed sheet becomes the path. Students build with the materials supplied in the pack.' },
{ label: 'Fold the rails', title: 'Fold both side strips upwards', body: 'The Builder folds the two side strips on the dotted lines, leaving the middle lane flat. The Tester places the plain card at START, printed side up and DISPLAY EDGE first.', detail: 'A child can lightly hold a leaning rail while a partner moves the card.' },
{ label: 'Slide the card', title: 'Move the plain card to DISPLAY', body: 'The Tester slides the calibration card between the rails. If it catches, the crew checks the folds and tries again without bending the card.', detail: 'This is the plain fit check. Later, students use separate design notes to make their own message and test it.' }];


const jobs = [
['Scene Reader', 'Read the player steps after the teacher’s scene.'],
['Builder', 'Join the plan, fold the channel and draw the message.'],
['Tester', 'Predict, slide the cards and describe what happens.'],
['Recorder', 'Write or draw the crew’s evidence and trial results.'],
['Checker', 'Compare the work with the original plan and notes.'],
['Presenter', 'Show the finished relay and explain a possible repair.']];


export function WorkshopStoryOpening() {
  return <section id="story-opening" className="theme-detail-section" aria-labelledby="workshop-story-heading">
    <div className="theme-detail-heading">
      <span className="eyebrow">{translateUi("YOUR INVENTION CREW\u2019S MISSION")}</span>
      <h2 id="workshop-story-heading">{translateUi("Mira\u2019s showcase needs a working paper relay.")}</h2>
      <p>{translateUi("The invention showcase opens soon, but Mira\u2019s blueprint has fallen into three pieces. Her message display still needs a path\u2014and a message that can travel along it. Your students become the crew who rebuilds, makes and tests the exhibit.")}</p>
    </div>
    <div className="workshop-opening-grid">
      <article className="workshop-opening-scene"><Hammer size={29} aria-hidden="true" /><h3>{translateUi("From a torn plan to a demonstration")}</h3><p>{translateUi("Join the blueprint, fold a paper channel and combine three separately held design notes to make one message card. Rehearse with trial cards, record what goes wrong and show your own message to the visitors.")}</p><p className="workshop-mission-finish">{translateUi("Finish by demonstrating the relay and explaining one sample fault and a possible repair.")}</p></article>
      <article className="workshop-opening-format"><h3>{translateUi("What students actually do")}</h3><ul><li><strong>{translateUi("With their hands:")}</strong>{translateUi(" join, fold, draw and slide paper.")}</li><li><strong>{translateUi("With their crew:")}</strong>{translateUi(" share requirements, predict results and check evidence.")}</li><li><strong>{translateUi("With a teacher:")}</strong>{translateUi(" hear each scene and receive one mission\u2019s materials at a time.")}</li></ul><p>{translateUi("Crews of 2\u20136 use complete sets. Up to 35 students can work in separate crews, with the teacher guiding the class through the story.")}</p></article>
    </div>
  </section>;
}

function WorkshopRelayDemo() {
  const [step, setStep] = useState(0);
  const current = demoSteps[step];
  return <div className="workshop-demo">
    <div className="workshop-demo-controls" role="group" aria-label={translateUi("Choose a paper relay demonstration step")}>
      {demoSteps.map((item, index) => <button key={item.label} type="button" aria-pressed={index === step} aria-controls="workshop-demo-description" onClick={() => setStep(index)}><span>{translateUi(index + 1)}</span>{translateUi(item.label)}</button>)}
    </div>
    <div className="workshop-demo-grid">
      <figure className="workshop-model-figure">
        <div className="workshop-model-stage" data-stage={step} aria-hidden="true">
          <div className="workshop-relay-plane">
            <img className="workshop-model-left" src="/assets/workshop-relay-left-rail.png" alt="" width="127" height="1445" />
            <img className="workshop-model-lane" src="/assets/workshop-relay-lane.png" alt="" width="407" height="1445" />
            <img className="workshop-model-right" src="/assets/workshop-relay-right-rail.png" alt="" width="127" height="1445" />
            <img className="workshop-model-card" src="/assets/workshop-relay-calibration.png" alt="" width="339" height="382" />
          </div>
        </div>
        <figcaption>{translateUi("On-screen illustration using the actual printable track and plain calibration card. The classroom game is played with paper.")}</figcaption>
      </figure>
      <div id="workshop-demo-description" className="workshop-demo-description" role="status" aria-live="polite" aria-atomic="true">
        <span className="eyebrow">{translateUi("STEP ")}{translateUi(step + 1)}{translateUi(" OF 3")}</span><h3>{translateUi(current.title)}</h3><p>{translateUi(current.body)}</p><p className="workshop-demo-detail">{translateUi(current.detail)}</p><a className="text-link" href="/assets/workshop-classroom-preview-pieces.jpg" target="_blank" rel="noopener noreferrer">{translateUi("Inspect the actual printable page ")}<ArrowRight size={17} aria-hidden="true" /><span className="workshop-sr-only">{translateUi(" (opens in a new tab)")}</span></a>
      </div>
    </div>
  </div>;
}

export function WorkshopCooperativePlay() {
  return <section id="crew-play" className="theme-detail-section" aria-labelledby="workshop-play-heading">
    <div className="theme-detail-heading"><span className="eyebrow">{translateUi("SEE HOW IT PLAYS")}</span><h2 id="workshop-play-heading">{translateUi("Fold a path. Slide a card. Explain what happens.")}</h2><p>{translateUi("The paper relay is a channel with two raised side rails. Students move a card by hand from START to DISPLAY, then use the same path to test their designs. Choose each step below to see the basic action.")}</p></div>
    <WorkshopRelayDemo />
    <div className="workshop-cooperation-grid">
      <article><ChatCircleText size={27} aria-hidden="true" /><h3>{translateUi("Three notes make one message")}</h3><p>{translateUi("Different pupils hold the symbol, count and direction requirements. They must share all three before the Builder can draw the crew\u2019s message. With two pupils, the teacher supplies the third note after both pupils share.")}</p></article>
      <article><FileText size={27} aria-hidden="true" /><h3>{translateUi("Observe before deciding")}</h3><p>{translateUi("The crew predicts what each sample will do, then physically tests it. Students record both fit and direction and explain a possible repair. The test samples stay separate from their own final message.")}</p></article>
    </div>
    <div className="workshop-jobs"><div className="workshop-jobs-heading"><UsersThree size={27} aria-hidden="true" /><h3>{translateUi("Six jobs, shared by crews of 2\u20136")}</h3></div><dl>{jobs.map(([name, action]) => <div key={name}><dt>{translateUi(name)}</dt><dd>{translateUi(action)}</dd></div>)}</dl><p>{translateUi("Jobs rotate after each mission. Smaller crews combine jobs; the final Checker is always a different pupil from the Recorder. The Teacher Guide gives the assignments and handout order.")}</p></div>
  </section>;
}

export function WorkshopCrewOutcome() {
  return <section id="crew-finish" className="theme-detail-section" aria-labelledby="workshop-finish-heading">
    <div className="theme-detail-heading"><span className="eyebrow">{translateUi("WHAT YOUR CREW COMPLETES")}</span><h2 id="workshop-finish-heading">{translateUi("A working exhibit, with evidence behind it.")}</h2><p>{translateUi("Each crew finishes with its own paper relay, a message it has drawn and a record of its trials. Students demonstrate the result and explain their reasoning to another pupil.")}</p></div>
    <div className="workshop-outcome-grid"><article><h3>{translateUi("A folded paper channel")}</h3><p>{translateUi("A path built from the joined blueprint and checked with the plain calibration card.")}</p></article><article><h3>{translateUi("The crew\u2019s own message")}</h3><p>{translateUi("A hand-drawn card checked against all three design notes, ready to travel to the display.")}</p></article><article><h3>{translateUi("A trial record and peer check")}</h3><p>{translateUi("Predictions, observations, a sample fault and a proposed repair, followed by a demonstration.")}</p></article></div>
  </section>;
}

export function WorkshopDesignIntent() {
  return <section className="theme-detail-section" aria-labelledby="workshop-intent-heading">
    <div className="theme-detail-heading"><span className="eyebrow">{translateUi("THE IDEA BEHIND THE ADVENTURE")}</span><h2 id="workshop-intent-heading">{translateUi("Make it, try it, then support your explanation.")}</h2><p>{translateUi("Mira\u2019s showcase gives the crew a reason to build something another person can inspect. The same paper path links making, shared design requirements, testing and presentation.")}</p></div>
    <div className="theme-reasons-grid"><article><span>{translateUi("BUILD & CHECK")}</span><p>{translateUi("The joined blueprint becomes a folded object. Students compare the printed plan with what they have made.")}</p></article><article><span>{translateUi("PREDICT & TEST")}</span><p>{translateUi("Moving real paper cards gives the crew something observable to compare with its predictions.")}</p></article><article><span>{translateUi("EXPLAIN & REVIEW")}</span><p>{translateUi("The trial record supports the final presentation, and a different pupil checks the original evidence.")}</p></article></div>
    <p className="workshop-source-note">{translateUi("This is one fixed paper invention with a guided story. The printable pack supplies the parts, design notes and trials; ordinary paper and pencils are enough during play.")}</p>
  </section>;
}

export function WorkshopSourcePreviews() {
  return <div className="workshop-source-previews"><div><span className="eyebrow">{translateUi("REAL PLAYER PACK PAGES")}</span><h3>{translateUi("See the materials and the recording sheet")}</h3><p>{translateUi("These are actual pages 7 and 11 of the A4 Player Pack: the flat track and plain fit card, followed by the blank trial record. The message-design answers remain in the game.")}</p></div><div className="workshop-source-page-grid">{[['pieces', 'Track and plain calibration card', 'The actual printable track with two dotted fold lines and a separate plain calibration card'], ['trial-record', 'Blank trial and repair record', 'The blank trial sheet with prediction, fit, direction and proposed repair fields']].map(([name, caption, alt]) => <figure key={name}><a href={localHref(`/assets/workshop-classroom-preview-${name}.jpg`)} target="_blank" rel="noopener noreferrer" aria-label={translateUi("Enlarge {value0} (opens in a new tab)", { value0: caption.toLowerCase() })}><img src={`/assets/workshop-classroom-preview-${name}.jpg`} alt={translateUi(alt)} width="910" height="1287" loading="lazy" /></a><figcaption>{translateUi(caption)}{translateUi(" \xB7 A4 edition")}</figcaption></figure>)}</div></div>;
}
