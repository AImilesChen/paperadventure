import {ArrowRight} from '@phosphor-icons/react';
import './homeOverview.css';

const choices = [
  {title:'Family play',edition:'Start with a Home game',body:'Choose a story for your household, then check its team size and materials. An adult hosts, reads with younger players and checks the group’s evidence.',href:'/en/for-home/',action:'Compare Home adventures'},
  {title:'A birthday gathering',edition:'A Home game, prepared for a party',body:'The free Celebration Home game supports one or two teams. Prepare a complete paper set for each team and keep later clues with the host until they are needed.',href:'/en/occasions/birthday/',action:'Choose a birthday activity'},
  {title:'A classroom activity',edition:'Use the Classroom edition',body:'Classroom games have their own stories and Teacher Guides. Give each crew its own Player Pack and plan how you will hand out materials and review their results.',href:'/en/for-classroom/',action:'Explore Classroom adventures'},
];

export function HomePlayChoices({Link}) {
  return <section className="home-play-choices" aria-labelledby="home-choice-title">
    <h3 id="home-choice-title">Which printable adventure fits your plans?</h3>
    <div className="home-choice-grid">{choices.map(c=><article key={c.href}><h4>{c.title}</h4><strong>{c.edition}</strong><p>{c.body}</p><Link to={c.href}>{c.action}<ArrowRight size={17}/></Link></article>)}</div>
    <p className="home-choice-note">A birthday is an occasion for a Home game, rather than a third edition. Check each game page for its exact group size and preparation.</p>
  </section>;
}

const steps = [
  ['Download both parts','Open your game page and get the Player Pack plus the matching Host or Teacher Guide. Choose A4 or US Letter to match your paper; you only need one format.'],
  ['Prepare the paper sets','Read the adult guide before inviting players to the table. Print the required sets, gather pencils and prepare any pieces that need adult-handled scissors.'],
  ['Keep the guide with the adult','The guide holds the setup, hints and answers. Separate the player materials into checkpoint piles so later clues stay out of sight.'],
  ['Share clues one checkpoint at a time','Introduce the story, share the first materials and let players compare what they know. Use the guide’s prompts when a group needs help.'],
  ['Check the result and continue','Ask players to explain their evidence before moving to the next task. Follow the game’s ending instructions to bring the story to a close.'],
];

export function HomeStartGuide({Link}) {
  return <section className="home-start-guide" id="play-a-printable-adventure" aria-labelledby="home-start-title"><div className="home-section-shell home-start-layout">
    <div className="home-start-heading"><span className="eyebrow">FROM PDF TO PLAY</span><h2 id="home-start-title">How to play a printable adventure game</h2><p>Start with the complete free Celebration game to see the format. These steps explain how to prepare and host the paper activity after you have the files.</p><Link className="text-link" to="/en/guides/">Read the hosting guides<ArrowRight size={18}/></Link></div>
    <div><ol className="home-start-steps">{steps.map(([title,body])=><li key={title}><h3>{title}</h3><p>{body}</p></li>)}</ol><p className="home-start-note">Hosting a class? <Link to="/en/guides/organize-a-classroom-adventure/#printing">Work out your crew sets</Link>. Planning a party? <Link to="/en/guides/printable-birthday-party-adventures/#party-setup">Check the one- and two-team setup</Link>.</p></div>
  </div></section>;
}

export function HomeQuestions({Link,sampleReady=false}) {
  const questions=[
    ['Is there a complete free printable adventure game?',<>{sampleReady?'Yes. The Celebration Home and Classroom editions are complete free games, each with player materials and a separate adult guide. No account or payment is needed to download them.':'Celebration has separate free Home and Classroom games. Open the sample pages for the current files and availability.'} Start with the <Link to="/en/samples/home/">free Home game</Link> or the <Link to="/en/samples/classroom/">free Classroom game</Link>. Other themes and custom adventures have their own prices.</>],
    ['What ages are the printable games for?',<>The printable story adventures are designed for children aged 6–12 with an adult host or teacher. Reading demands and preparation differ by game. The adult can read a clue aloud while children compare the evidence and explain their choices. <Link to="/en/themes/">Browse the story worlds</Link> to choose a starting point.</>],
    ['Can just two children play?',<>Yes. In the free Celebration Home game, two children share four jobs: one combines Courier and Mapper, and the other combines Spotter and Keeper. Swap those job bundles after checkpoints 1–4. An adult hosts in addition to the two players. The <Link to="/en/guides/run-a-printable-adventure/#jobs">family hosting guide</Link> explains the jobs.</>],
    ['What do I need to print and prepare?',<>For the free Celebration Home game, use a printer, paper, pencils and adult-handled scissors. Download both the Player Pack and Host Guide, read the preparation section and separate the clue materials before play. Requirements vary by theme, so use the list on <Link to="/en/samples/home/#sample-prepare-heading">your game’s preparation page</Link>.</>],
    ['Should I choose A4 or US Letter?',<>Choose the file size that matches the paper in your printer: A4 is 210 × 297 mm, and US Letter is 8.5 × 11 inches. Use the same format for the Player Pack and adult guide. You only need one format; follow the printing instructions included with the game.</>],
    ['Where are the hints and answers?',<>They are in the separate Host or Teacher Guide, together with setup and ending instructions. Keep that guide with the adult and hand out player materials in checkpoint order. If a clue or printout is unclear, <Link to="/en/help/">visit the help centre</Link>.</>],
    ['How are Home and Classroom adventures different?',<>They are distinct games with different stories, materials and adult guides. The free Celebration Home game supports 2–12 children, in one or two teams. The free Classroom game supports 2–35 pupils in crews of 2–6, with a Teacher Guide. For other themes, check the <Link to="/en/for-home/">Home</Link> or <Link to="/en/for-classroom/">Classroom</Link> game page.</>],
    ['Can I create an adventure from my own story idea?',<>Yes. Choose Home or Classroom and describe your idea in the <Link to="/en/create/">custom adventure creator</Link>. An adult account is used for saved work and purchases. After payment, review and approve your five-checkpoint plan before PDF creation begins. Read <Link to="/en/how-it-works/">how custom adventures work</Link> and check <Link to="/en/pricing/">current pricing</Link> before ordering.</>],
  ];
  return <section className="home-questions" id="printable-game-questions" aria-labelledby="home-questions-title"><div className="home-section-shell home-questions-layout"><div><span className="eyebrow">BEFORE YOU PRINT</span><h2 id="home-questions-title">Questions about printable adventure games</h2><p>Practical answers about choosing, printing and hosting your first game.</p><Link className="text-link" to="/en/help/">More help<ArrowRight size={18}/></Link></div><div className="home-question-list">{questions.map(([q,a],i)=><details key={q} open={i===0}><summary>{q}</summary><div className="home-question-answer"><p>{a}</p></div></details>)}</div></div></section>;
}
