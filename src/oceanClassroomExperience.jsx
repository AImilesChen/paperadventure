import { ArrowRight, ChatCircleText, Compass, FileText, UsersThree } from '@phosphor-icons/react';
import './oceanClassroomExperience.css';

const roles = [
  ['Chart Maker', 'Assemble and mark the sea chart.'],
  ['Survey Observer', 'Position the frame and invite everyone to share a sighting.'],
  ['Log Keeper', 'Record the crew’s drawing, corrections and report.'],
  ['Evidence Checker', 'Trace each conclusion back to a printed clue.'],
];

export function OceanStoryOpening() {
  return <section id="story-opening" className="theme-detail-section ocean-story-opening" aria-labelledby="ocean-story-heading">
    <div className="theme-detail-heading">
      <span className="eyebrow">YOUR CREW’S MISSION</span>
      <h2 id="ocean-story-heading">A scattered chart. An unfinished survey. Your crew.</h2>
      <p>Aboard a fictional research ship, the survey chart has come apart and one square still needs investigating. The captain needs a reliable report, and your students are the crew who will put it together.</p>
    </div>
    <div className="ocean-story-grid">
      <div className="ocean-story-scene">
        <Compass size={30} aria-hidden="true" />
        <h3>Step into the story</h3>
        <p>Rebuild the chart, follow the captain’s position notes and listen to three crew sightings. Then check the copied log against your evidence before writing a report the captain can trust.</p>
        <p className="ocean-story-stakes">The mission is complete when the crew can explain its findings using the map and original observations.</p>
      </div>
      <div className="ocean-story-format">
        <h3>What happens in your classroom?</h3>
        <ul>
          <li><strong>At the table:</strong> students move paper pieces, talk, draw and write.</li>
          <li><strong>In small crews:</strong> 2–6 students share jobs; a class of up to 35 plays in separate groups.</li>
          <li><strong>With a teacher:</strong> you read each scene, hand out its materials and check the crew’s evidence.</li>
        </ul>
        <p>All clues are in the pack. Children need no screens or prior marine knowledge.</p>
      </div>
    </div>
  </section>;
}

export function OceanCooperativePlay() {
  return <section id="crew-play" className="theme-detail-section" aria-labelledby="ocean-play-heading">
    <div className="theme-detail-heading">
      <span className="eyebrow">SEE HOW IT PLAYS</span>
      <h2 id="ocean-play-heading">One chart. Three sightings. Everyone’s evidence.</h2>
      <p>The crew shares the same map, but the three observation slips are dealt separately. Students must listen to one another before they can complete their survey drawing.</p>
    </div>
    <div className="ocean-play-grid">
      <figure className="ocean-paper-preview">
        <a href="/assets/ocean-classroom-preview-chart.jpg" target="_blank" rel="noopener noreferrer" aria-label="Enlarge the actual four chart quarters, opens in a new tab">
          <img src="/assets/ocean-classroom-preview-chart.jpg" alt="Actual A4 Player Pack page with four separate sea-chart quarters and matching edge marks" width="910" height="1287" loading="lazy" />
        </a>
        <figcaption><strong>1. Build the shared chart</strong><span>Actual Player Pack page 3. Fit the paper quarters by their edge marks. Select the image to enlarge.</span></figcaption>
      </figure>
      <div className="ocean-share-explanation">
        <ChatCircleText size={30} aria-hidden="true" />
        <h3>2. Compare what each person knows</h3>
        <p>One slip supplies a count. Another adds a landmark and a position. The third describes a different feature and its position.</p>
        <p><strong>No single slip contains the whole drawing.</strong> Each holder reads their own observation; the crew combines all three and checks before marking the board.</p>
        <div className="ocean-play-bridge"><ArrowRight size={22} aria-hidden="true" /><span>Shared observations become a drawing the crew can explain.</span></div>
        <small>The observation answers stay in the game. These previews show the materials, not the solved survey.</small>
      </div>
      <figure className="ocean-paper-preview">
        <a href="/assets/ocean-classroom-preview-survey.jpg" target="_blank" rel="noopener noreferrer" aria-label="Enlarge the actual blank observation plotting board, opens in a new tab">
          <img src="/assets/ocean-classroom-preview-survey.jpg" alt="Actual A4 Player Pack page with a blank observation plotting board for the crew’s combined drawing" width="910" height="1287" loading="lazy" />
        </a>
        <figcaption><strong>3. Draw from the evidence</strong><span>Actual Player Pack page 7. The crew fills this blank board using its separate sightings. Select the image to enlarge.</span></figcaption>
      </figure>
    </div>
    <div className="ocean-crew-jobs">
      <div><UsersThree size={25} aria-hidden="true" /><h3>A real job for every crew member</h3></div>
      <dl>{roles.map(([name, action]) => <div key={name}><dt>{name}</dt><dd>{action}</dd></div>)}</dl>
      <p>Pass jobs after each mission. Smaller crews combine jobs; larger crews share a moving or reading job with a partner who checks. The Teacher Guide explains the arrangements.</p>
    </div>
  </section>;
}

export function OceanCrewOutcome() {
  return <section id="crew-finish" className="theme-detail-section ocean-crew-outcome" aria-labelledby="ocean-finish-heading">
    <div className="theme-detail-heading">
      <span className="eyebrow">WHAT YOUR CREW COMPLETES</span>
      <h2 id="ocean-finish-heading">A report they can show—and explain.</h2>
      <p>By the end, each group has made its own record of the expedition. The final task asks students to write from evidence, with the teacher checking their conclusion.</p>
    </div>
    <div className="ocean-outcome-grid">
      <article><Compass size={27} aria-hidden="true" /><h3>An assembled chart and survey drawing</h3><p>The rebuilt map, a marked survey square and a drawing based on all three observations.</p></article>
      <article><FileText size={27} aria-hidden="true" /><h3>A corrected ship’s log</h3><p>The crew checks the copied entries, records its corrections and points to the original evidence.</p></article>
      <article><ChatCircleText size={27} aria-hidden="true" /><h3>A crew-written captain’s report</h3><p>Students explain their findings in their own words and check the report against their map and log.</p></article>
    </div>
  </section>;
}

export function OceanDesignIntent() {
  return <section className="theme-detail-section ocean-design-intent" aria-labelledby="ocean-intent-heading">
    <div className="theme-detail-heading">
      <span className="eyebrow">THE IDEA BEHIND THE ADVENTURE</span>
      <h2 id="ocean-intent-heading">Make a discovery together, then back it up.</h2>
      <p>The research-ship setting connects five paper actions into one investigation. Each crew member contributes evidence, and the final report gives that evidence a purpose.</p>
    </div>
    <div className="theme-reasons-grid">
      <article><span>MAP &amp; POSITION</span><p>Assembling the chart and following position notes gives students a concrete reason to use direction and spatial language.</p></article>
      <article><span>LISTEN &amp; COLLABORATE</span><p>Separate sightings create a reason to ask questions, share information and check another person’s interpretation.</p></article>
      <article><span>CHECK &amp; EXPLAIN</span><p>Repairing a copied log and writing an original report gives students opportunities to compare sources and explain a conclusion.</p></article>
    </div>
    <p className="ocean-intent-note">All sightings and sea-chart details belong to this fictional story. The pack supplies the evidence; no specialist marine knowledge is needed.</p>
  </section>;
}
