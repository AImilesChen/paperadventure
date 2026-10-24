import { ArrowRight, Check, DownloadSimple, MagicWand, Package, Question, ShieldCheck } from '@phosphor-icons/react';
import { formatUsd, offers, productRights } from '../shared/catalog.mjs';
import { includedChanges } from '../shared/legal-documents.mjs';
import './pricingGuide.css';

const answers = [
  ['Is the Celebration game free for both settings?', 'Yes. Celebration has separate Home and Classroom v0.1 trial games. Both include a Player Pack and an adult guide in A4 and US Letter. These drafts have not yet been play-tested.'],
  ['Do I need a subscription or points?', 'No. A ready-made theme is a one-time purchase of that fixed edition. A custom adventure is a separate one-time order for a new game.'],
  ['Why does the Classroom pack cost more than Home?', 'The Classroom collection has different teacher-led worlds for 2–35 students, group clues, a Teacher Guide and a licence for the purchasing teacher’s classes. Home games are separate household stories for 2–12 players with a Host Guide. Celebration is the free example in both collections.'],
  ['Can I change a ready-made theme after buying it?', 'A ready-made pack is a fixed story and does not include AI rewrites. For a story built around your idea, choose AI custom instead.'],
  ['What changes are included with custom?', `${includedChanges.beforeApproval} You may select a saved plan version again for free. ${includedChanges.afterDelivery} ${includedChanges.preparation}`],
  ['How long can I access paid files?', 'You can re-download online for 12 months: from confirmed payment for a ready-made pack, or from first qualified delivery for a custom game. Files already downloaded remain usable within the Home or Classroom licence.'],
  ['Will Stripe charge me now?', 'If the page says Stripe test mode, only test-card payments are accepted and no real money moves. Live checkout, when enabled, charges the listed price once.'],
  ['Where can I check refund terms?', 'Read the refund policy before purchasing. Stripe test checkout takes no real payment.'],
];

const comparison = [
  ['The story', 'An existing, fixed theme', 'A new story from your choices'],
  ['What arrives', 'Player Pack + adult guide in A4 and US Letter', 'Player Pack + adult guide in your chosen paper size'],
  ['When files are ready', 'After confirmed checkout', 'After payment, plan review and approval, then generation and file checks'],
  ['Changes included', 'No AI edits', `${includedChanges.beforeApproval} ${includedChanges.afterDelivery}`],
  ['Online re-download', '12 months from confirmed payment', '12 months from first qualified delivery'],
];

export function PricingGuide({ Link, catalog, checkoutMode, checkoutReady }) {
  const currentOffers = catalog?.offers?.length ? catalog.offers : offers;
  const price = sku => formatUsd(currentOffers.find(offer => offer.sku === sku)?.unitAmount ?? offers.find(offer => offer.sku === sku).unitAmount);
  const checkoutNotice = checkoutMode === 'test'
    ? <><strong>Stripe test mode is active.</strong> These are US-dollar test prices. Test-card checkout does not move real money.</>
    : checkoutMode === 'live'
      ? <><strong>Live checkout is active.</strong> Pay the listed price once.</>
      : checkoutReady === false
        ? <><strong>Checkout is currently unavailable.</strong> You can still explore the free Celebration games and compare the listed options.</>
        : <><strong>Check current availability.</strong> Each theme page shows its purchase status; you will see the final amount before any live payment.</>;

  return <main className="pricing-guide">
    <header className="pricing-guide-hero"><div className="pricing-guide-shell"><span className="eyebrow">PRICING & RIGHTS</span><h1>Printable adventure pricing for Home &amp; Classroom<span className="dot">.</span></h1><p>Start with a free Celebration game, choose a ready-made theme, or create a new story with AI. Every paid option is a one-time order in US dollars—no subscription or points.</p></div></header>

    <div className="pricing-guide-shell"><div className="pricing-guide-status" role="note"><ShieldCheck size={23} aria-hidden="true"/><p>{checkoutNotice}</p></div></div>

    <section className="pricing-guide-section pricing-guide-shell" aria-labelledby="pricing-guide-options"><div className="pricing-guide-heading"><span className="eyebrow">CHOOSE YOUR PATH</span><h2 id="pricing-guide-options">Three clear ways to begin.</h2><p>Choose Home for a household or Classroom for the classes you teach. Prices are per game or theme, not per player.</p></div><div className="pricing-guide-cards">
      <article className="pricing-guide-card pricing-guide-card-free"><div className="pricing-guide-card-top"><span className="pricing-guide-icon"><DownloadSimple size={25} aria-hidden="true"/></span><span className="pricing-guide-label">FREE TRIAL</span></div><h3>Celebration adventure</h3><div className="pricing-guide-price">$0</div><p className="pricing-guide-price-note">Home and Classroom editions</p><ul><li><Check size={17} aria-hidden="true"/> Two separate story games</li><li><Check size={17} aria-hidden="true"/> Player Pack + Host or Teacher Guide</li><li><Check size={17} aria-hidden="true"/> A4 and US Letter PDFs</li></ul><p className="pricing-guide-card-small">Version 0.1 drafts; not yet play-tested. No AI generation included.</p><Link className="button" to="/en/samples/">Get the free games <ArrowRight size={18} aria-hidden="true"/></Link></article>
      <article className="pricing-guide-card"><div className="pricing-guide-card-top"><span className="pricing-guide-icon"><Package size={25} aria-hidden="true"/></span><span className="pricing-guide-label">READY-MADE</span></div><h3>Pick an existing theme</h3><div className="pricing-guide-price-pair"><div><span>Home</span><strong>{price('ready_home')}</strong></div><div><span>Classroom</span><strong>{price('ready_classroom')}</strong></div></div><p className="pricing-guide-price-note">One-time price per fixed theme edition</p><ul><li><Check size={17} aria-hidden="true"/> Story and clues already written</li><li><Check size={17} aria-hidden="true"/> Player Pack + adult guide</li><li><Check size={17} aria-hidden="true"/> A4 and US Letter PDFs</li></ul><p className="pricing-guide-card-small">Download after confirmed checkout. AI rewrites are not included.</p><Link className="button" to="/en/themes/">Browse ready-made themes <ArrowRight size={18} aria-hidden="true"/></Link></article>
      <article className="pricing-guide-card pricing-guide-card-custom"><div className="pricing-guide-card-top"><span className="pricing-guide-icon"><MagicWand size={25} aria-hidden="true"/></span><span className="pricing-guide-label">AI CUSTOM</span></div><h3>Make a new story</h3><div className="pricing-guide-price-pair"><div><span>Home</span><strong>{price('custom_home')}</strong></div><div><span>Classroom</span><strong>{price('custom_classroom')}</strong></div></div><p className="pricing-guide-price-note">One-time price per new adventure</p><ul><li><Check size={17} aria-hidden="true"/> Review one personal plan after payment</li><li><Check size={17} aria-hidden="true"/> Player Pack + adult guide</li><li><Check size={17} aria-hidden="true"/> 2 reworks + 3 edits before approval</li></ul><p className="pricing-guide-card-small">Approve a plan before full PDF generation. Three successful checkpoint changes and two successful whole-game remakes within 30 days of first delivery are also included.</p><Link className="button" to="/en/create/">Start a custom story <ArrowRight size={18} aria-hidden="true"/></Link></article>
    </div><p className="pricing-guide-after-cards">The five paid Classroom worlds are different from the five paid Home worlds. Classroom packs are designed for teacher-led groups of up to 35 students; Home packs are for household groups of up to 12. Free format examples require no AI generation. View each theme page for current purchase availability.</p></section>

    <section className="pricing-guide-section pricing-guide-compare" aria-labelledby="pricing-guide-compare-title"><div className="pricing-guide-shell"><div className="pricing-guide-heading"><span className="eyebrow">AT A GLANCE</span><h2 id="pricing-guide-compare-title">Ready-made or custom?</h2><p>Both give your group a printable game. The difference is whether you choose a finished story or ask us to create one.</p></div><table><thead><tr><th scope="col">Compare</th><th scope="col">Ready-made theme</th><th scope="col">AI custom adventure</th></tr></thead><tbody>{comparison.map(([label, ready, custom]) => <tr key={label}><th scope="row">{label}</th><td data-label="Ready-made">{ready}</td><td data-label="AI custom">{custom}</td></tr>)}</tbody></table></div></section>

    <section className="pricing-guide-section pricing-guide-shell" aria-labelledby="pricing-guide-rights-title"><div className="pricing-guide-heading"><span className="eyebrow">USE & ACCESS</span><h2 id="pricing-guide-rights-title">Choose the licence that fits your group.</h2></div><div className="pricing-guide-rights"><article><h3>Home edition</h3><p>{productRights.home}</p></article><article><h3>Classroom edition</h3><p>{productRights.classroom}</p></article></div><p className="pricing-guide-rights-note">Paid orders belong to the purchasing Google account. Online re-download lasts {productRights.onlineRedownloadMonths} months; files downloaded during that period remain usable within the purchased licence. A second theme or a different custom story needs a new order.</p></section>

    <section className="pricing-guide-section pricing-guide-faq" aria-labelledby="pricing-guide-faq-title"><div className="pricing-guide-shell"><div className="pricing-guide-heading"><span className="eyebrow">QUESTIONS BEFORE YOU CHOOSE</span><h2 id="pricing-guide-faq-title">The details, without the fine-print maze.</h2></div><div className="pricing-guide-faq-list">{answers.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div><p className="pricing-guide-help"><Question size={20} aria-hidden="true"/> Need help with a purchase? <a href="mailto:support@paperadventure.app">Contact Paper Adventure support</a>.</p></div></section>
  </main>;
}


