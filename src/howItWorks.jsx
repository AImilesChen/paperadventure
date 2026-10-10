import { useState } from 'react';
import { ArrowRight, CheckCircle, DownloadSimple, PencilSimple, Sparkle, UsersThree } from '@phosphor-icons/react';
import './howItWorks.css';

const questions = [
  ['Is there a complete game I can try for free?', 'Yes. The Celebration Home and Classroom trial editions include a Player Pack and a separate adult guide. The packs include preparation instructions, team jobs, five checkpoints, hints and answers.'],
  ['Do I need to buy anything else to play?', 'Start with the paper files and pencils. Check the chosen theme page and adult guide for any optional cutting or setup. A bought gift, lock or special prop is not required for the free Celebration story.'],
  ['Can I use a Home pack with a class?', 'Choose the Classroom edition for a group you teach. Home and Classroom have separate stories, guidance and usage rights.'],
  ['Where do paid files appear?', 'Sign in with Google and open My adventures. A ready-made pack appears after confirmed checkout; a custom pack appears after generation and file checks finish. The order page shows its current status.'],
  ['What if a custom game is delayed?', 'The order page shows whether the game is still being prepared or needs support review. You can contact support@paperadventure.app with your order details.'],
];

const pathSteps = {
  home: [
    'Choose a Home edition for a household activity, then download the files in a paper size your printer supports.',
    'An adult keeps the Host Guide, prepares the clues and gives the Player Pack to the group.',
    'Play the checkpoints together. The guide holds hints and answers when the group needs them.',
  ],
  classroom: [
    'Choose a Classroom edition for the class you teach and check the edition-specific group setup.',
    'The teacher keeps the Teacher Guide and prints Player Pack pages for the student groups.',
    'Students work through the checkpoints; the teacher guides the shared story and checks answers.',
  ],
};

export function HowItWorksPage({ Link, catalog, checkoutMode }) {
  const [setting, setSetting] = useState('home');
  const celebration = catalog?.themes?.find(theme => theme.id === 'celebration');
  const freeReady = Boolean(celebration?.home?.freeSample && celebration?.classroom?.freeSample);

  return <main className="how-guide">
    <section className="how-guide-hero" aria-labelledby="how-guide-title">
      <div className="how-guide-shell how-guide-hero-grid">
        <div className="how-guide-hero-copy">
          <span className="eyebrow"><Sparkle size={17} /> A GUIDE TO GETTING STARTED</span>
          <h1 id="how-guide-title">How printable story adventures work<span className="dot">.</span></h1>
          <p>Choose a ready-made game or build a new story from your idea. We will show you what is inside the files, how to prepare them and what happens before your group starts playing.</p>
          <div className="how-guide-actions"><Link className="button" to="/en/themes/">Explore ready-made themes <ArrowRight size={19} /></Link><Link className="how-guide-text-link" to="/en/create/">Create your own adventure <ArrowRight size={18} /></Link></div>
          <p className="how-guide-hero-note">The Celebration Home and Classroom trial games are free to download. Other editions show their current availability on their theme pages.</p>
        </div>
        <div className="how-guide-visual" role="group" aria-label="Real pages from the free Celebration Home Player Pack">
          <figure className="how-guide-paper how-guide-paper-cover"><img src="/assets/celebration-home-player-cover-example.jpg" alt="Cover page of the free Celebration Home Player Pack" width="637" height="900" fetchPriority="high" /><figcaption>Player Pack cover</figcaption></figure>
          <figure className="how-guide-paper how-guide-paper-clue"><img src="/assets/celebration-home-player-page2-example.jpg" alt="First paper activity in the free Celebration Home Player Pack" width="637" height="900" fetchPriority="high" /><figcaption>First paper activity</figcaption></figure>
          <p>Celebration Home example pages · download the current complete edition below</p>
        </div>
      </div>
    </section>

    {checkoutMode === 'test' && <div className="how-guide-test-note how-guide-shell" role="note"><strong>Stripe test mode is active.</strong> You can explore checkout with test-card details; no real charge is taken. Prices and availability are shown on the relevant product page.</div>}

    <section className="how-guide-section how-guide-shell" aria-labelledby="how-guide-paths">
      <div className="how-guide-heading"><span className="eyebrow">TWO WAYS TO BEGIN</span><h2 id="how-guide-paths">Pick the path that suits your group.</h2><p>Both paths end with printable player pages and an adult guide. The difference is whether the story already exists or is made from your choices.</p></div>
      <div className="how-guide-path-grid">
        <article className="how-guide-path-card"><div className="how-guide-path-icon"><DownloadSimple size={28} /></div><span className="how-guide-path-label">READY-MADE GAME</span><h3>Choose a story that is ready to inspect.</h3><p>Browse the Home or Classroom collection, then choose its story world and see the contents and current availability. The paid worlds differ across the two collections; Celebration has separate free files for both.</p><ol><li>Choose an edition</li><li>Review its pages and licence</li><li>Download the free trial or follow the offered checkout</li></ol><Link to="/en/themes/">Explore themes <ArrowRight size={17} /></Link></article>
        <article className="how-guide-path-card how-guide-path-card-custom"><div className="how-guide-path-icon"><PencilSimple size={28} /></div><span className="how-guide-path-label">AI CUSTOM GAME</span><h3>Start with a story idea of your own.</h3><p>Pick a world or describe a new one. A signed-in adult can request two short story directions up to twice a day for free. A complete game is generated only after checkout.</p><ol><li>Set your story and group</li><li>Preview and choose a direction</li><li>Follow the order while files are generated and checked</li></ol><Link to="/en/create/">See the creator <ArrowRight size={17} /></Link></article>
      </div>
    </section>

    <section className="how-guide-section how-guide-inside" aria-labelledby="how-guide-files"><div className="how-guide-shell how-guide-inside-grid"><div><span className="eyebrow">INSIDE THE FILES</span><h2 id="how-guide-files">Two parts, with different jobs.</h2><p>A printable adventure separates what players see from what the adult needs to run the game. The pages pictured above come from the current free Celebration Home edition. Each theme has its own story, props and adult instructions.</p><Link className="how-guide-text-link" to="/en/samples/">Inspect the free Celebration files <ArrowRight size={18} /></Link></div><div className="how-guide-file-cards"><article><span><UsersThree size={25} /></span><h3>Player Pack</h3><p>Story pages, paper clues and spaces where players can record what they discover. Give these pages to the group as directed by the adult guide.</p></article><article><span><CheckCircle size={25} /></span><h3>Host or Teacher Guide</h3><p>Preparation, checkpoint guidance, hints and answers for the adult organiser. Keep this guide away from players.</p></article><p>Ready-made packs offer A4 and US Letter files. For a custom game, choose the paper size during setup; its two PDFs are delivered in that size.</p></div></div></section>

    <section className="how-guide-section how-guide-shell" aria-labelledby="how-guide-play"><div className="how-guide-heading"><span className="eyebrow">FROM FILES TO PLAY</span><h2 id="how-guide-play">A simple setup for a shared story.</h2><p>The exact clues and preparation belong to the game you choose. These are the steps common to both paths.</p></div><ol className="how-guide-play-steps"><li><strong>01</strong><div><h3>Choose and get the right edition</h3><p>Start with Home or Classroom. Download the free trial, or use the checkout offered for a published pack or custom game.</p></div></li><li><strong>02</strong><div><h3>Print the matching files</h3><p>Use the paper size shown in your order. Keep the adult guide separate from player pages.</p></div></li><li><strong>03</strong><div><h3>Prepare the space and clues</h3><p>Read the guide first, gather the listed materials and decide how to hand out pages. An adult leads the activity.</p></div></li><li><strong>04</strong><div><h3>Play through the checkpoints</h3><p>Let the group solve together. Use the guide for hints, answer checks and the story's ending.</p></div></li></ol></section>

    <section className="how-guide-section how-guide-setting" aria-labelledby="how-guide-setting-title"><div className="how-guide-shell how-guide-setting-grid"><div><span className="eyebrow">HOME OR CLASSROOM</span><h2 id="how-guide-setting-title">Choose the setting before you print.</h2><p>Home and Classroom are separate editions. Select the one that matches who will organise and use the game.</p><div className="how-guide-setting-switch" aria-label="Setting guidance"><button type="button" aria-pressed={setting === 'home'} onClick={() => setSetting('home')}>For home</button><button type="button" aria-pressed={setting === 'classroom'} onClick={() => setSetting('classroom')}>For classroom</button></div></div><div className="how-guide-setting-panel"><h3>{setting === 'home' ? 'A household adventure' : 'A teacher-led group adventure'}</h3><ol>{pathSteps[setting].map(step => <li key={step}>{step}</li>)}</ol><Link to={setting === 'home' ? '/en/for-home/' : '/en/for-classroom/'}>Browse {setting === 'home' ? 'Home' : 'Classroom'} adventures <ArrowRight size={17} /></Link></div></div></section>

    <section className="how-guide-section how-guide-shell" aria-labelledby="how-guide-delivery"><div className="how-guide-heading"><span className="eyebrow">DELIVERY & ACCESS</span><h2 id="how-guide-delivery">Know when your files are ready.</h2></div><div className="how-guide-delivery-grid"><article><h3>Free Celebration trial</h3><p>The Home and Classroom v0.1 Player Packs and adult guides are available from the free sample page. They are labelled as drafts that still need real-group play checks.</p><Link to="/en/samples/">See free files <ArrowRight size={17} /></Link></article><article><h3>Ready-made paid edition</h3><p>After a confirmed checkout, the purchased edition appears in My adventures with its Player Pack and adult guide. Check the theme page for its current release status.</p><Link to="/en/pricing/">Review prices and rights <ArrowRight size={17} /></Link></article><article><h3>AI custom edition</h3><p>After checkout, the order page follows generation and file checks. Download starts when the files are ready; if the process needs help, the order shows a support state.</p><Link to="/en/create/">Plan a custom story <ArrowRight size={17} /></Link></article></div><p className="how-guide-access-note">Paid orders are tied to a Google account. Online re-download is available for 12 months under the applicable Home or Classroom licence; the start date differs for ready-made and custom orders. See <Link to="/en/pricing/">pricing and rights</Link> for details.</p></section>

    <section className="how-guide-section how-guide-faq" aria-labelledby="how-guide-faq-title"><div className="how-guide-shell"><div className="how-guide-heading"><span className="eyebrow">GOOD TO KNOW</span><h2 id="how-guide-faq-title">Questions before you start.</h2></div><div className="how-guide-faq-grid">{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div><p className="how-guide-support">Need help with an order? <a href="mailto:support@paperadventure.app">Contact Paper Adventure support</a>.</p></div></section>

    <section className="how-guide-final how-guide-shell"><div><span className="eyebrow">READY WHEN YOU ARE</span><h2>Start with a story your group can share.</h2><p>{freeReady ? 'You can download the free Celebration trial now, or begin a custom story idea.' : 'Explore the Celebration trial and see the current download options, or begin a custom story idea.'}</p></div><div><Link className="button" to="/en/samples/">Try the free game <ArrowRight size={18} /></Link><Link className="how-guide-text-link" to="/en/create/">Make a custom adventure <ArrowRight size={18} /></Link></div></section>
  </main>;
}


