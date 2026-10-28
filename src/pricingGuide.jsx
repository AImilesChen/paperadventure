import { ArrowRight, Check, DownloadSimple, MagicWand, Package, Question, ShieldCheck } from '@phosphor-icons/react';
import { formatUsd, offers, productRights } from '../shared/catalog.mjs';
import { includedChanges } from '../shared/legal-documents.mjs';
import './pricingGuide.css';

const answers = [
  ['Is this a one-time purchase?', 'Yes. All prices are in US dollars. Pay once for each ready-made game or custom adventure. There is no subscription.'],
  ['Is the Celebration game free?', 'Yes. The complete Home and Classroom games are free, with no account or payment needed. Each includes a Player Pack and an adult guide in A4 and US Letter.'],
  ['Which edition fits my group?', 'Home games are for household groups, with a Host Guide. Classroom games have separate stories for teacher-led groups, a Teacher Guide and a licence for the purchasing teacher’s own classes.'],
  ['Can I change a ready-made game?', 'Ready-made games have a fixed story and activities. Choose a custom adventure for a new story shaped around your idea.'],
  ['What changes are included with custom?', `${includedChanges.beforeApproval} You may select a saved plan version again for free. ${includedChanges.afterDelivery} ${includedChanges.preparation}`, 'pricing-custom-changes'],
  ['How long can I download paid files?', `Online re-download is available for ${productRights.onlineRedownloadMonths} months: from confirmed payment for a ready-made game, or from first qualified delivery for a custom adventure. Keep your downloaded files to use within your Home or Classroom licence after online access ends.`],
];

function openCustomChanges() {
  const details = document.getElementById('pricing-custom-changes');
  if (details) details.open = true;
}

const changesLink = <a href="#pricing-custom-changes" onClick={openCustomChanges}>See included changes <ArrowRight size={15} aria-hidden="true" /></a>;
const comparison = [
  ['The story', 'A finished story with fixed activities', 'A new story shaped around your idea'],
  ['Files included', 'Player Pack + adult guide in A4 and US Letter', 'Player Pack + adult guide in your chosen paper size'],
  ['When you can download', 'After payment is confirmed', 'After payment, plan approval and completed game preparation'],
  ['Changes included', 'Fixed game; no story changes', <span>Plan revisions and changes after delivery. {changesLink}</span>],
  ['Online re-download', `${productRights.onlineRedownloadMonths} months from confirmed payment`, `${productRights.onlineRedownloadMonths} months from first qualified delivery`],
];

export function PricingGuide({ Link, catalog, checkoutMode, checkoutReady }) {
  const currentOffers = catalog?.offers?.length ? catalog.offers : offers;
  const price = sku => formatUsd(currentOffers.find(offer => offer.sku === sku)?.unitAmount ?? offers.find(offer => offer.sku === sku).unitAmount);
  const checkoutNotice = checkoutReady === false
    ? 'Purchases are temporarily unavailable. You can still download the free games.'
    : checkoutMode === 'test'
      ? 'Test checkout only. No real payment will be taken.'
      : null;

  return <main className="pricing-guide">
    <header className="pricing-guide-hero"><div className="pricing-guide-shell"><span className="eyebrow">PRICING</span><h1>Printable adventure pricing for Home &amp; Classroom<span className="dot">.</span></h1><p>Try a complete game free, choose a ready-made story, or create a custom adventure. One-time prices in US dollars. No subscription.</p></div></header>

    {checkoutNotice && <div className="pricing-guide-shell"><div className="pricing-guide-status" role="note"><ShieldCheck size={23} aria-hidden="true"/><p>{checkoutNotice}</p></div></div>}

    <section className="pricing-guide-section pricing-guide-shell" aria-labelledby="pricing-guide-options"><div className="pricing-guide-heading"><span className="eyebrow">FIND YOUR ADVENTURE</span><h2 id="pricing-guide-options">Choose your game.</h2><p>Choose Home for your household or Classroom for the classes you teach. Prices are per game, not per player.</p></div><div className="pricing-guide-cards">
      <article className="pricing-guide-card pricing-guide-card-free"><div className="pricing-guide-card-top"><span className="pricing-guide-icon"><DownloadSimple size={25} aria-hidden="true"/></span><span className="pricing-guide-label">FREE GAME</span></div><h3>Celebration adventure</h3><div className="pricing-guide-price">$0</div><p className="pricing-guide-price-note">Home and Classroom editions</p><ul><li><Check size={17} aria-hidden="true"/> Two complete story games</li><li><Check size={17} aria-hidden="true"/> Player Pack + Host or Teacher Guide</li><li><Check size={17} aria-hidden="true"/> A4 and US Letter PDFs</li></ul><p className="pricing-guide-card-small">No account or payment needed.</p><Link className="button" to="/en/samples/">Get the free games <ArrowRight size={18} aria-hidden="true"/></Link></article>
      <article className="pricing-guide-card"><div className="pricing-guide-card-top"><span className="pricing-guide-icon"><Package size={25} aria-hidden="true"/></span><span className="pricing-guide-label">READY-MADE</span></div><h3>Choose a ready-made game</h3><div className="pricing-guide-price-pair"><div><span>Home</span><strong>{price('ready_home')}</strong></div><div><span>Classroom</span><strong>{price('ready_classroom')}</strong></div></div><p className="pricing-guide-price-note">One-time purchase per game</p><ul><li><Check size={17} aria-hidden="true"/> A finished story with connected clues</li><li><Check size={17} aria-hidden="true"/> Player Pack + adult guide</li><li><Check size={17} aria-hidden="true"/> A4 and US Letter PDFs</li></ul><p className="pricing-guide-card-small">Download after payment is confirmed.</p><Link className="button" to="/en/themes/">Browse ready-made games <ArrowRight size={18} aria-hidden="true"/></Link></article>
      <article className="pricing-guide-card pricing-guide-card-custom"><div className="pricing-guide-card-top"><span className="pricing-guide-icon"><MagicWand size={25} aria-hidden="true"/></span><span className="pricing-guide-label">AI CUSTOM</span></div><h3>Create a custom adventure</h3><div className="pricing-guide-price-pair"><div><span>Home</span><strong>{price('custom_home')}</strong></div><div><span>Classroom</span><strong>{price('custom_classroom')}</strong></div></div><p className="pricing-guide-price-note">One-time purchase per adventure</p><ul><li><Check size={17} aria-hidden="true"/> A story shaped around your idea</li><li><Check size={17} aria-hidden="true"/> Review your plan after payment</li><li><Check size={17} aria-hidden="true"/> Player Pack + adult guide</li><li><Check size={17} aria-hidden="true"/> Revisions before and after delivery</li></ul><p className="pricing-guide-card-small">Approve your plan before we prepare the full game files. {changesLink}</p><Link className="button" to="/en/create/">Start a custom story <ArrowRight size={18} aria-hidden="true"/></Link></article>
    </div><p className="pricing-guide-after-cards">Home games are for household groups of up to 12. Classroom games are for teacher-led groups of up to 35.</p></section>

    <section className="pricing-guide-section pricing-guide-compare" aria-labelledby="pricing-guide-compare-title"><div className="pricing-guide-shell"><div className="pricing-guide-heading"><span className="eyebrow">COMPARE</span><h2 id="pricing-guide-compare-title">Ready-made or custom?</h2><p>Choose a finished game or have a new one created around your idea.</p></div><table><thead><tr><th scope="col">Compare</th><th scope="col">Ready-made game</th><th scope="col">AI custom adventure</th></tr></thead><tbody>{comparison.map(([label, ready, custom]) => <tr key={label}><th scope="row">{label}</th><td data-label="Ready-made">{ready}</td><td data-label="AI custom">{custom}</td></tr>)}</tbody></table></div></section>

    <section className="pricing-guide-section pricing-guide-shell" aria-labelledby="pricing-guide-rights-title"><div className="pricing-guide-heading"><span className="eyebrow">USE & ACCESS</span><h2 id="pricing-guide-rights-title">For your household or your classes.</h2></div><div className="pricing-guide-rights"><article><h3>Home edition</h3><p>For one adult purchaser and their household. Private, non-commercial play with reasonable reprinting of the purchased game.</p></article><article><h3>Classroom edition</h3><p>For one purchasing teacher’s own classes, including reasonable reprinting for those classes.</p></article></div><p className="pricing-guide-rights-note">Downloaded files remain usable within your licence after online access ends. A different game is a separate purchase. <Link to="/en/terms/">Read the full terms</Link>.</p></section>

    <section className="pricing-guide-section pricing-guide-faq" aria-labelledby="pricing-guide-faq-title"><div className="pricing-guide-shell"><div className="pricing-guide-heading"><span className="eyebrow">FAQ</span><h2 id="pricing-guide-faq-title">Questions before you buy.</h2></div><div className="pricing-guide-faq-list">{answers.map(([question, answer, id]) => <details key={question} id={id}><summary>{question}</summary><p>{answer}</p></details>)}<details><summary>How do I request a refund?</summary><p>Open your order in <Link to="/en/my-adventures/?support=refund">My adventures</Link> to request a refund review. Read our <Link to="/en/refunds/">refund policy</Link> for eligibility and terms.</p></details></div><p className="pricing-guide-help"><Question size={20} aria-hidden="true"/> Need help? <a href="mailto:support@paperadventure.app">Contact support</a>.</p></div></section>
  </main>;
}
