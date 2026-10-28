import { ArrowRight, DownloadSimple, Printer, UsersThree, Stack } from '@phosphor-icons/react';
import { guides, guideFor } from '../shared/guides.mjs';
import { themes } from '../shared/catalog.mjs';
import './guides.css';

function Cards({ Link, items = guides }) {
  return <div className="guide-cards">{items.map(guide => <article key={guide.slug}><Link to={guide.path} className="guide-card-image"><img src={guide.image} alt={guide.alt} loading="lazy" width="600" height="400" /></Link><div><span className="eyebrow">{guide.category}</span><h2><Link to={guide.path}>{guide.title}</Link></h2><p>{guide.summary}</p><Link to={guide.path} className="text-link">Read the guide <ArrowRight size={17}/></Link></div></article>)}</div>;
}
export function GuidesHub({ Link }) {
  return <main className="guides-page"><header className="guides-intro"><span className="eyebrow">PRINT · PREPARE · PLAY</span><h1>Make your first adventure easy to run<span className="dot">.</span></h1><p>Practical guides for parents and teachers, illustrated with real pages from our free Celebration games. Choose your group and see what to prepare.</p></header><section className="guide-shell" aria-label="Adventure guides"><Cards Link={Link}/><div className="guide-next"><div><h2>Start with the complete free game</h2><p>Player Pack and a separate adult guide, in A4 or US Letter. No account needed.</p></div><Link className="button" to="/en/samples/home/">Get the Home game <DownloadSimple size={18}/></Link><Link className="button-quiet" to="/en/samples/classroom/">Get the Classroom game <ArrowRight size={18}/></Link></div></section></main>;
}
function Figure({ src, alt, caption, width = 910, height = 1287 }) {
  return <figure className="guide-figure"><a href={src} target="_blank" rel="noopener noreferrer" aria-label={`Enlarge: ${alt} (opens in a new tab)`}><img src={src} alt={alt} width={width} height={height} loading="lazy"/></a><figcaption>{caption} Select the image to enlarge.</figcaption></figure>;
}
function Section({ id, title, children }) { return <section id={id} className="guide-section"><h2>{title}</h2>{children}</section>; }
function HomeGuide() {
  return <>
    <p className="guide-answer">For 2–6 children aged 6–12, prepare one complete Celebration Home Player Pack, give everyone a working job, and release one checkpoint at a time. An adult hosts in addition to the players. The game is a cooperative paper story played at a table.</p>
    <Section id="prepare" title="1. Print one complete set for your team">
      <p>In <em>The Missing Birthday Chest</em>, the team helps Fenn the fox deliver a birthday parcel. The complete free Home game has five connected checkpoints and a story ending. Download the Player Pack and Host Guide in the same paper size, A4 or US Letter.</p>
      <div className="guide-facts"><div><Printer size={22}/><strong>10 Player pages</strong><span>Print once per team, single-sided at Actual size / 100%.</span></div><div><Stack size={22}/><strong>12-page Host Guide</strong><span>Read pages 1–11 on screen. Print finale page 12 once.</span></div><div><UsersThree size={22}/><strong>11 sheets total</strong><span>For one team using the screen guide. Printing the full guide uses 22 sheets.</span></div></div>
      <p>Have pencils and adult-handled scissors ready. Keep task panels and boards intact when cutting the separate pieces. Make five numbered piles; optional envelopes help keep them in order. Hold Player page 10 and the finale letters back until the final parcel has been checked.</p>
      <p>For 7–12 children, make two balanced teams of 3–6. Each needs its own ten-page Player Pack. Print the finale sheet once: 20 Player sheets + 1 finale sheet = 21 sheets. Mark the backs of the sets A/B before cutting so their evidence stays separate.</p>
    </Section>
    <Section id="jobs" title="2. Give each child a way to contribute">
      <p>Use the four printed job cards. Jobs rotate after checkpoints 1–4 so the same child does not always read or write.</p>
      <dl className="guide-jobs">{[['Courier', 'Reads the task or symbols, shares a clue and reports the team’s choice.'], ['Spotter', 'Checks details and route joins; helps look up letters.'], ['Mapper', 'Arranges or draws the route and records the agreed result.'], ['Keeper', 'Checks conditions and keeps solved evidence for the ending.']].map(([name, body]) => <div key={name}><dt>{name}</dt><dd>{body}</dd></div>)}</dl>
      <div className="guide-table-wrap"><table><caption>Sharing four jobs in a small team</caption><thead><tr><th scope="col">Players</th><th scope="col">How to share and rotate</th></tr></thead><tbody><tr><th scope="row">2</th><td>Courier + Mapper; Spotter + Keeper. Swap the two bundles.</td></tr><tr><th scope="row">3</th><td>Courier; Spotter; Mapper + Keeper. Pass the three bundles clockwise.</td></tr><tr><th scope="row">4</th><td>One job each. Pass all four cards clockwise.</td></tr><tr><th scope="row">5–6</th><td>Pair Courier for five players; pair Courier and Spotter for six. Partners alternate doing and checking.</td></tr></tbody></table></div>
    </Section>
    <Section id="handout" title="3. Keep the shared board; separate the clues">
      <p>At the letter checkpoint, hand Courier, Spotter and Keeper one clue each. Keep the common letter board visible. Each holder shares their clue while Mapper compares the conditions and records the team’s decision. Giving everyone the full sheet would remove this reason to talk.</p>
      <div className="guide-figure-pair"><Figure src="/assets/celebration-home-detail-handout-cut.jpg" alt="Retained letter board and three separately cut clue cards" width={380} height={491} caption="Home Host Guide, A4 page 4 excerpt: the board stays intact."/><Figure src="/assets/celebration-home-detail-handout-share.jpg" alt="Three clue holders comparing their information on one board" width={381} height={491} caption="Home Host Guide, A4 page 4 excerpt: separate clues, shared decision."/></div>
      <p>Use the Host Guide to check the team’s explanation before releasing the next pile. Keep solved evidence with the team trail: later checkpoints and the ending depend on what the team has already found.</p>
    </Section>
    <Section id="hints" title="4. Help the conversation before giving a hint">
      <p>If one player takes over, invite each clue holder to read, point or explain before the team agrees. An adult can read with a child; a child can dictate while Mapper writes. The jobs should make participation possible, rather than test reading speed.</p>
      <ol><li>Ask the team to restate the current task.</li><li>Ask each holder what their printed clue contributes.</li><li>Use the next hint in the Host Guide if they are still stuck.</li><li>Check the result with the adult answers, then hand over the next materials.</li></ol>
      <p>No real chest, gift, lock, phone or hunt around the house is needed. Read the complete Host Guide before inviting the children to play; this checklist complements its task-by-task instructions.</p>
    </Section>
  </>;
}
function ClassroomGuide() {
  return <>
    <p className="guide-answer">For 20–35 pupils, divide the class into crews of 2–6 and prepare one complete Player Pack per crew. In the free Celebration Classroom game, pupils rebuild an invitation, share four badge clues and make a display badge that another crew reviews.</p>
    <Section id="crews" title="1. Plan crews before printing">
      <p><em>The Adventure Club’s First Badge</em> supports up to 35 pupils in separate crews. The examples below keep each crew within the 2–6 pupil range; other balanced arrangements within that range also work.</p>
      <div className="guide-table-wrap"><table><caption>Example grouping and Player Pack print counts</caption><thead><tr><th scope="col">Pupils</th><th scope="col">Example crews</th><th scope="col">Player sheets</th></tr></thead><tbody>{[[20, '4 crews of 5', 36], [24, '4 crews of 6', 36], [30, '5 crews of 6', 45], [35, '5 crews of 6 + 1 crew of 5', 54]].map(([count, crews, pages]) => <tr key={count}><th scope="row">{count}</th><td>{crews}</td><td>{pages}</td></tr>)}</tbody></table></div>
      <p>For example, 24 pupils could also work in six crews of four, which needs 54 Player sheets. Choose the crew size for your space and pupils, then multiply nine pages by the number of crews.</p>
      <div className="guide-crew-map" role="img" aria-label="Example arrangement for 24 pupils: four crews, six pupils in each crew">{[1,2,3,4].map(n => <div key={n}><strong>Crew {n}</strong><span>● ● ●<br/>● ● ●</span><small>1 complete Player Pack</small></div>)}</div><p className="guide-caption">Setup illustration: one possible arrangement for 24 pupils, not a required seating plan.</p>
    </Section>
    <Section id="printing" title="2. Give each crew a complete paper set">
      <p>The Player Pack has nine pages per crew. The separate nine-page Teacher Guide can be read on screen or printed once for the teacher. If printing the guide, add nine sheets to the table totals. Download both PDFs in the same paper size and print single-sided at Actual size / 100%.</p>
      <p>Keep each crew’s invitation, welcome-table materials, four badge clues, blueprint, symbols, display badge and review sheet together. Prepare the cuts before play, then keep the next mission’s pieces with you until the current result is checked. Paper and pencils support the activity; the badge stays flat or folds into a table tent, with no pin or glue needed.</p>
      <Figure src="/assets/celebration-classroom-preview-plan.jpg" alt="Blank badge blueprint with places to record positions and evidence" caption="Actual Classroom A4 Player Pack, page 6: a blank planning sheet, with the answer held back."/>
    </Section>
    <Section id="classroom-jobs" title="3. Separate the four jobs from the four clues">
      <dl className="guide-jobs">{[['Story Reader', 'Reads the steps and invites ideas.'], ['Prop Mover', 'Moves the pieces after the crew agrees.'], ['Team Recorder', 'Writes or draws the shared plan and results.'], ['Evidence Checker', 'Points to the printed clue behind a decision.']].map(([job, body]) => <div key={job}><dt>{job}</dt><dd>{body}</dd></div>)}</dl>
      <p>Rotate jobs after each mission. Two or three pupils can combine jobs; in crews of five or six, partners share Reading or Moving and each contributes before rotating.</p>
      <p>The four badge clue cards are information to share, separate from these job titles. Deal the clues separately and ask holders to explain what they know. The crew checks each proposed badge feature against a clue before putting it on the blueprint.</p>
    </Section>
    <Section id="review" title="4. Run the five missions, then review together">
      <ol><li><strong>Rebuild the invitation.</strong> Read the opening scene and let crews join its scattered pieces.</li><li><strong>Set the welcome table.</strong> Use the invitation to place the printed supplies on the mat.</li><li><strong>Pool the badge clues.</strong> Compare all four clues and record one plan on the blank blueprint.</li><li><strong>Make the badge.</strong> Try the symbols, check against the evidence, then draw or write the design.</li><li><strong>Welcome and review.</strong> Pass the badge and all four clue cards to the next crew in a circle. Use the review sheet and return mismatches for a friendly repair.</li></ol>
      <Figure src="/assets/celebration-classroom-preview-review.jpg" alt="Blank peer review checklist and helpful feedback area" caption="Actual Classroom A4 Player Pack, page 9: the next crew checks the badge against the clues."/>
      <p>With only one crew, the teacher reviews. Finish by inviting each pupil to say or show how they helped. Read the Teacher Guide before the session for the full handoffs, hints and answers; this article is a planning aid, not a replacement.</p>
    </Section>
  </>;
}
function BirthdayGuide({ Link }) {
  return <>
    <p className="guide-answer">A printable birthday adventure gives children one shared story to work through at a table. Start with the complete free Celebration Home game for ages 6–12, or choose an existing Home theme that matches their interests. An adult guides the story and hands out the materials.</p>
    <Section id="choose" title="1. Choose the story before choosing decorations">
      <p>The free <em>Missing Birthday Chest</em> is the birthday-specific story: children help Fenn deliver his parcel by sharing clues across five checkpoints. If your group prefers dinosaurs, space or forest mysteries, those existing Home games offer other settings. They are separate fixed stories, not personalized birthday editions.</p>
      <div className="guide-theme-grid">{['celebration','dinosaur','space','forest'].map(id => { const theme = themes.find(t => t.id === id); return <article key={id}><img src={theme.story.home.image || theme.image} alt={theme.title + ' Home story artwork'} width="800" height="600" loading="lazy"/><div><span className="eyebrow">{id === 'celebration' ? 'FREE CELEBRATION GAME' : theme.title.toUpperCase() + ' HOME GAME'}</span><h3>{theme.story.home.title}</h3><p>{theme.story.home.goal}</p><Link className="text-link" to={`/en/themes/${id}/home/`}>See the game and materials <ArrowRight size={17}/></Link></div></article>; })}</div>
      <p>Check a game’s materials and preparation on its detail page before choosing it. The free pack lets you inspect a complete game before deciding whether another theme suits your group.</p>
    </Section>
    <Section id="party-setup" title="2. Set up a table for each team">
      <p>For the free Celebration Home game, 2–6 children play as one team. For 7–12, make two balanced teams of 3–6 with a complete set each. The adult host is in addition to the players. Arrange enough space for the common board and paper evidence to stay visible.</p>
      <ul><li><strong>One team:</strong> ten Player sheets and one finale sheet, with the Host Guide read on screen.</li><li><strong>Two teams:</strong> twenty Player sheets and one finale sheet. Keep the sets separate and mark their backs before cutting.</li><li><strong>On the table:</strong> pencils and only the current checkpoint’s materials. The adult prepares cuts and holds answers and later piles.</li></ul>
      <Figure src="/assets/celebration-home-detail-record.jpg" alt="Blank evidence trail with spaces for the five birthday delivery checkpoints" width={1202} height={711} caption="Celebration Home Player Pack, page 3 excerpt: each team keeps its own shared paper trail."/>
    </Section>
    <Section id="party-flow" title="3. Let the story provide the party activity">
      <p>Read the opening from the Host Guide, share the four working jobs and give out the first pile. After each checked checkpoint, rotate the jobs and move to the next pile. Ask quieter players to share their clue or point to the evidence before the team agrees.</p>
      <p>This is a cooperative tabletop game, with paper route pieces, separate clues and a shared ending. You do not need to hide objects around the house, buy a lock or supply a real birthday chest. Keep any food or cake break separate from the paper materials.</p>
      <p>If a team gets stuck, use the Host Guide’s hints in order. With two teams, check each team’s own evidence and keep its materials together. Leave room in your party plan for setup, reading and pauses so each team can work at its own pace.</p>
    </Section>
    <Section id="take-home" title="4. Check these before guests arrive">
      <ul><li>Download and open both PDFs, choose A4 or US Letter, and check a test print at 100%.</li><li>Read the Host Guide and prepare five numbered material piles per team.</li><li>Cut only the indicated pieces; keep boards and task panels intact.</li><li>Keep the finale letters and final Player page with the adult until their handoff.</li><li>Plan who will read with younger players and who can record dictated answers.</li></ul>
      <p>For detailed job combinations and clue handouts, use our <Link to="/en/guides/run-a-printable-adventure/">step-by-step Home hosting guide</Link>. If you are planning a class celebration instead, use the <Link to="/en/guides/organize-a-classroom-adventure/">Classroom crew guide</Link> and its distinct Adventure Club game.</p>
    </Section>
  </>;
}
export function GuideArticle({ Link, route }) {
  const guide = guideFor(route);
  const classroom = guide.slug === 'organize-a-classroom-adventure';
  return <main className="guides-page"><header className="guides-intro guide-article-intro"><nav aria-label="Breadcrumb"><Link to="/en/">Home</Link><span aria-hidden="true">/</span><Link to="/en/guides/">Guides</Link></nav><span className="eyebrow">{guide.category}</span><h1>{guide.title}<span className="dot">.</span></h1><p>{guide.summary}</p><p className="guide-byline">By Paper Adventure Workshop · Updated <time dateTime={guide.date}>28 October 2026</time></p></header><div className="guide-reading-layout guide-shell"><aside className="guide-contents"><nav aria-label="On this page"><strong>IN THIS GUIDE</strong>{guide.sections.map(([id, label]) => <a key={id} href={'#' + id}>{label}</a>)}</nav><p>Based on the actual Celebration Player Pack and adult guide.</p></aside><article className="guide-article">{classroom ? <ClassroomGuide/> : guide.slug === 'run-a-printable-adventure' ? <HomeGuide/> : <BirthdayGuide Link={Link}/>}<div className="guide-next"><h2>Open the complete free {classroom ? 'Classroom' : 'Home'} game</h2><p>Choose A4 or US Letter and download the Player Pack with its separate {classroom ? 'Teacher' : 'Host'} Guide.</p><Link className="button" to={`/en/samples/${classroom ? 'classroom' : 'home'}/`}>Get the free game <DownloadSimple size={18}/></Link><Link className="text-link" to={classroom ? '/en/for-classroom/' : '/en/for-home/'}>Explore more {classroom ? 'Classroom' : 'Home'} stories <ArrowRight size={17}/></Link></div><section className="guide-related"><h2>Plan your next session</h2><Cards Link={Link} items={guides.filter(item => item.slug !== guide.slug)}/></section></article></div></main>;
}
export function GuideLinks({ Link, setting }) {
  const items = setting === 'classroom' ? [guides[1]] : setting === 'home' ? [guides[0], guides[2]] : guides;
  return <section className="guide-context-links" aria-label="Preparation guides"><h2>Ready to plan your game?</h2><p>See the real materials, group setup and preparation before you print.</p>{items.map(item => <Link key={item.slug} className="text-link" to={item.path}>{item.title} <ArrowRight size={17}/></Link>)}</section>;
}
export function HalloweenOccasion({ Link }) {
  return <main className="guides-page"><header className="guides-intro"><span className="eyebrow">HALLOWEEN AT HOME</span><h1>A paper-shadow adventure for Halloween<span className="dot">.</span></h1><p>Step into <em>The Missing Pumpkin Light</em>: spot torn posters, make four paper shadows and help Pip prepare the festival ending. A cooperative Home story for ages 6–12.</p></header><section className="guide-shell guide-seasonal"><img src="/assets/halloween.png" alt="Halloween story world artwork" width="800" height="600"/><div><h2>Print the story. Build the little theatre.</h2><p>The fixed Home pack contains a Player Pack and a separate Host Guide, in A4 and US Letter. Explore the actual theatre materials, preparation and current purchase options on the game page.</p><Link className="button" to="/en/themes/halloween/home/">See the Halloween game <ArrowRight size={18}/></Link><p>Prefer to try a complete game first? <Link to="/en/samples/home/">Download the free Celebration Home adventure</Link>.</p></div></section><div className="guide-shell"><GuideLinks Link={Link} setting="home"/></div></main>;
}
