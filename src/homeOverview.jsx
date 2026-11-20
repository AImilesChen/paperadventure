import { t as translateUi, localHref } from "./i18n/index.mjs";import { ArrowRight } from '@phosphor-icons/react';
import './homeOverview.css';

const choices = [
{ title: 'Family play', edition: 'Start with a Home game', body: 'Choose a story for your household, then check its team size and materials. An adult hosts, reads with younger players and checks the group’s evidence.', href: '/en/for-home/', action: 'Compare Home adventures' },
{ title: 'A birthday gathering', edition: 'A Home game, prepared for a party', body: 'The free Celebration Home game supports one or two teams. Prepare a complete paper set for each team and keep later clues with the host until they are needed.', href: '/en/occasions/birthday/', action: 'Choose a birthday activity' },
{ title: 'A classroom activity', edition: 'Use the Classroom edition', body: 'Classroom games have their own stories and Teacher Guides. Give each crew its own Player Pack and plan how you will hand out materials and review their results.', href: '/en/for-classroom/', action: 'Explore Classroom adventures' }];


export function HomePlayChoices({ Link }) {
  return <section className="home-play-choices" aria-labelledby="home-choice-title">
    <h3 id="home-choice-title">{translateUi("Which printable adventure fits your plans?")}</h3>
    <div className="home-choice-grid">{choices.map((c) => <article key={c.href}><h4>{translateUi(c.title)}</h4><strong>{translateUi(c.edition)}</strong><p>{translateUi(c.body)}</p><Link to={localHref(c.href)}>{translateUi(c.action)}<ArrowRight size={17} /></Link></article>)}</div>
    <p className="home-choice-note">{translateUi("A birthday is an occasion for a Home game, rather than a third edition. Check each game page for its exact group size and preparation.")}</p>
  </section>;
}

const steps = [
['Download both parts', 'Open your game page and get the Player Pack plus the matching Host or Teacher Guide. Choose A4 or US Letter to match your paper; you only need one format.'],
['Prepare the paper sets', 'Read the adult guide before inviting players to the table. Print the required sets, gather pencils and prepare any pieces that need adult-handled scissors.'],
['Keep the guide with the adult', 'The guide holds the setup, hints and answers. Separate the player materials into checkpoint piles so later clues stay out of sight.'],
['Share clues one checkpoint at a time', 'Introduce the story, share the first materials and let players compare what they know. Use the guide’s prompts when a group needs help.'],
['Check the result and continue', 'Ask players to explain their evidence before moving to the next task. Follow the game’s ending instructions to bring the story to a close.']];


export function HomeStartGuide({ Link }) {
  return <section className="home-start-guide" id="play-a-printable-adventure" aria-labelledby="home-start-title"><div className="home-section-shell home-start-layout">
    <div className="home-start-heading"><span className="eyebrow">{translateUi("FROM PDF TO PLAY")}</span><h2 id="home-start-title">{translateUi("How to play a printable adventure game")}</h2><p>{translateUi("Start with the complete free Celebration game to see the format. These steps explain how to prepare and host the paper activity after you have the files.")}</p><Link className="text-link" to={localHref("/en/guides/")}>{translateUi("Read the hosting guides")}<ArrowRight size={18} /></Link></div>
    <div><ol className="home-start-steps">{steps.map(([title, body]) => <li key={title}><h3>{translateUi(title)}</h3><p>{translateUi(body)}</p></li>)}</ol><p className="home-start-note">{translateUi("Hosting a class? ")}<Link to={localHref("/en/guides/organize-a-classroom-adventure/#printing")}>{translateUi("Work out your crew sets")}</Link>{translateUi(". Planning a party? ")}<Link to={localHref("/en/guides/printable-birthday-party-adventures/#party-setup")}>{translateUi("Check the one- and two-team setup")}</Link>.</p></div>
  </div></section>;
}

export function HomeQuestions({ Link, sampleReady = false }) {
  const questions = [
  ['Is there a complete free printable adventure game?', <>{sampleReady ? translateUi('Yes. The Celebration Home and Classroom editions are complete free games, each with player materials and a separate adult guide. No account or payment is needed to download them.') : translateUi('Celebration has separate free Home and Classroom games. Open the sample pages for the current files and availability.')}{translateUi(" Start with the ")}<Link to={localHref("/en/samples/home/")}>{translateUi("free Home game")}</Link>{translateUi(" or the ")}<Link to={localHref("/en/samples/classroom/")}>{translateUi("free Classroom game")}</Link>{translateUi(". Other themes and custom adventures have their own prices.")}</>],
  ['What ages are the printable games for?', <>{translateUi("The printable story adventures are designed for children aged 6\u201312 with an adult host or teacher. Reading demands and preparation differ by game. The adult can read a clue aloud while children compare the evidence and explain their choices. ")}<Link to={localHref("/en/themes/")}>{translateUi("Browse the story worlds")}</Link>{translateUi(" to choose a starting point.")}</>],
  ['Can just two children play?', <>{translateUi("Yes. In the free Celebration Home game, two children share four jobs: one combines Courier and Mapper, and the other combines Spotter and Keeper. Swap those job bundles after checkpoints 1\u20134. An adult hosts in addition to the two players. The ")}<Link to={localHref("/en/guides/run-a-printable-adventure/#jobs")}>{translateUi("family hosting guide")}</Link>{translateUi(" explains the jobs.")}</>],
  ['What do I need to print and prepare?', <>{translateUi("For the free Celebration Home game, use a printer, paper, pencils and adult-handled scissors. Download both the Player Pack and Host Guide, read the preparation section and separate the clue materials before play. Requirements vary by theme, so use the list on ")}<Link to={localHref("/en/samples/home/#sample-prepare-heading")}>{translateUi("your game\u2019s preparation page")}</Link>.</>],
  ['Should I choose A4 or US Letter?', <>{translateUi("Choose the file size that matches the paper in your printer: A4 is 210 \xD7 297 mm, and US Letter is 8.5 \xD7 11 inches. Use the same format for the Player Pack and adult guide. You only need one format; follow the printing instructions included with the game.")}</>],
  ['Where are the hints and answers?', <>{translateUi("They are in the separate Host or Teacher Guide, together with setup and ending instructions. Keep that guide with the adult and hand out player materials in checkpoint order. If a clue or printout is unclear, ")}<Link to={localHref("/en/help/")}>{translateUi("visit the help centre")}</Link>.</>],
  ['How are Home and Classroom adventures different?', <>{translateUi("They are distinct games with different stories, materials and adult guides. The free Celebration Home game supports 2\u201312 children, in one or two teams. The free Classroom game supports 2\u201335 pupils in crews of 2\u20136, with a Teacher Guide. For other themes, check the ")}<Link to={localHref("/en/for-home/")}>{translateUi("Home")}</Link>{translateUi(" or ")}<Link to={localHref("/en/for-classroom/")}>{translateUi("Classroom")}</Link>{translateUi(" game page.")}</>],
  ['Can I create an adventure from my own story idea?', <>{translateUi("Yes. Choose Home or Classroom and describe your idea in the ")}<Link to={localHref("/en/create/")}>{translateUi("custom adventure creator")}</Link>{translateUi(". An adult account is used for saved work and purchases. After payment, review and approve your five-checkpoint plan before PDF creation begins. Read ")}<Link to={localHref("/en/how-it-works/")}>{translateUi("how custom adventures work")}</Link>{translateUi(" and check ")}<Link to={localHref("/en/pricing/")}>{translateUi("current pricing")}</Link>{translateUi(" before ordering.")}</>]];

  return <section className="home-questions" id="printable-game-questions" aria-labelledby="home-questions-title"><div className="home-section-shell home-questions-layout"><div><span className="eyebrow">{translateUi("BEFORE YOU PRINT")}</span><h2 id="home-questions-title">{translateUi("Questions about printable adventure games")}</h2><p>{translateUi("Practical answers about choosing, printing and hosting your first game.")}</p><Link className="text-link" to={localHref("/en/help/")}>{translateUi("More help")}<ArrowRight size={18} /></Link></div><div className="home-question-list">{questions.map(([q, a], i) => <details key={q} open={i === 0}><summary>{translateUi(q)}</summary><div className="home-question-answer"><p>{translateUi(a)}</p></div></details>)}</div></div></section>;
}
