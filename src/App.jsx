import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, ArrowUpRight, CaretDown, Check, Compass, DownloadSimple, List, Minus, PencilSimple, Plus, Printer, Sparkle, UsersThree, X } from '@phosphor-icons/react';
import { AccountPreview, AdventuresShelf, CheckoutPreview, HelpExperience, LegalExperience, OrderExperience, PricingExperience, SamplesExperience, ThemesExplorer } from './extended.jsx';
import { themes } from '../shared/catalog.mjs';
import { pageFor } from '../shared/page-manifest.mjs';
import { analyticsAvailable } from './analytics.js';
import { crossesAnalyticsBoundary } from './analytics-route.mjs';
import { CatalogPage, ThemeDetailPage, PricingPageV13 } from './productPages.jsx';
import { LiveAccount, LiveShelf, LiveOrder, LiveSamples, LiveCheckout, LiveLegal, LivePricing } from './livePages.jsx';
import { LiveCreate } from './liveCreate.jsx';
import CurrentPrivacyNotice from './privacyNotice.jsx';
import { useModalFocus } from './useModalFocus.js';

const faq = [
  ['What will I make?', 'A printable story adventure is planned to include connected puzzles, clues, hints, and an organiser guide. This prototype shows the design and creation flow; real generated files are not available here.'],
  ['Can I use my own story idea?', 'Yes. Start with a featured world or describe your own. Your choice should shape the adventure, not simply change the title.'],
  ['Is there a classroom version?', 'Yes. The classroom path asks about groups and room setup so the activity can be designed for a teacher to run.'],
  ['When would I pay?', 'A published ready-made pack would be a one-time purchase with direct file access after payment. A custom game would be generated after confirmed payment. Neither checkout is live in this preview.'],
];

function path() { return window.location.pathname; }
const isPrivateOrderRoute = route => /^\/en\/orders\/[A-Za-z0-9-]+\/$/.test(route) && route !== '/en/orders/demo/';
let pendingNavigation = '';
function navigate(to, approved = false) { const target = new URL(to, window.location.origin); if (!approved && target.pathname === '/en/create/' && (target.searchParams.has('theme') || target.searchParams.has('custom'))) { const saved = initialDraft(); const incoming = target.searchParams.get('theme') || ''; if ((saved.theme || saved.idea) && (target.searchParams.has('custom') || saved.theme !== incoming || Boolean(saved.custom))) { pendingNavigation = to; window.dispatchEvent(new Event('draft-conflict')); return; } } if (analyticsAvailable() && crossesAnalyticsBoundary(window.location.pathname, target.pathname)) { window.location.assign(target.href); return; } window.history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }
function Link({ to, children, className = '', ...props }) { return <a href={to} className={className} onClick={e => { if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) { e.preventDefault(); navigate(to); } }} {...props}>{children}</a>; }
function Brand() { return <Link to="/en/" className="brand"><span className="brand-mark"><img src="/icon.svg" alt="" width="38" height="38" /></span><span>Paper Adventure<br /><strong>Workshop</strong></span></Link>; }

function Header({ route }) {
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => setOpen(false), [route]);
  useEffect(() => {
    let active = true;
    fetch('/api/v1/auth/session', { credentials: 'same-origin' }).then(response => response.ok ? response.json() : null)
      .then(session => { if (active) setAuthenticated(Boolean(session?.authenticated)); }).catch(() => {});
    return () => { active = false; };
  }, []);
  async function signOut() {
    try {
      const response = await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin' });
      if (response.ok) { setAuthenticated(false); setOpen(false); navigate('/en/'); }
    } catch { /* Keep the current session visible if sign-out could not be confirmed. */ }
  }
  useEffect(() => {
    const closeOnEscape = event => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);
  const accountPath = authenticated ? '/en/my-adventures/' : '/en/account/';
  const accountLabel = authenticated ? 'My adventures' : 'Sign in';
  return <header className="site-header"><div className="nav-shell"><Brand /><nav id="primary-navigation" className={open ? 'site-nav open' : 'site-nav'} aria-label="Main navigation"><Link to="/en/themes/">Story worlds</Link><Link to="/en/how-it-works/">How it works</Link><Link to="/en/samples/home/">Free sample</Link><Link to="/en/pricing/">Pricing</Link><Link to="/en/help/">Help</Link><Link className="nav-account-mobile" to={accountPath}>{accountLabel}</Link>{authenticated && <button type="button" className="nav-signout nav-account-mobile" onClick={signOut}>Sign out</button>}</nav><div className="nav-actions"><Link className="nav-login" to={accountPath}>{accountLabel}</Link>{authenticated && <button type="button" className="nav-signout" onClick={signOut}>Sign out</button>}<Link className="button button-small" to="/en/create/">Create an adventure <ArrowUpRight size={16} /></Link></div><button type="button" className="menu-toggle" aria-controls="primary-navigation" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={25} /> : <List size={25} />}</button></div></header>;
}
function Footer({ runtime }) { return <footer className="site-footer"><div className="footer-main"><div><Brand /><p>Made for curious minds and the people who bring them together.</p></div><div className="footer-links"><div><strong>Explore</strong><Link to="/en/themes/">Story worlds</Link><Link to="/en/how-it-works/">How it works</Link><Link to="/en/pricing/">Pricing</Link></div><div><strong>Support</strong><Link to="/en/help/">Help</Link><Link to="/en/samples/home/">Free sample</Link><Link to="/en/account/">Sign in</Link></div><div><strong>Legal</strong><Link to="/en/privacy/">Privacy</Link><Link to="/en/terms/">Terms</Link><Link to="/en/cookies/">Cookies</Link><Link to="/en/refunds/">Refunds</Link></div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Paper Adventure Workshop {runtime?.checkout ? '' : runtime?.sample ? '· Free trial available' : '· Design preview'}</span><span>For grown-ups planning playful adventures.</span></div></footer>; }

function ThemeGallery({ full = false }) {
  const track = useRef(null);
  const [bounds, setBounds] = useState({ left: false, right: true });
  useEffect(() => {
    const update = () => {
      const element = track.current;
      if (!element) return;
      setBounds({ left: element.scrollLeft > 2, right: element.scrollLeft + element.clientWidth < element.scrollWidth - 2 });
    };
    update();
    const element = track.current;
    element?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { element?.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);
  const scroll = direction => track.current?.scrollBy({ left: direction * Math.max(320, track.current.clientWidth * .68), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return <section className={full ? 'themes-section themes-full' : 'themes-section'} id="themes"><div className="section-heading"><div><span className="eyebrow"><Sparkle size={17} weight="fill" /> A WORLD TO EXPLORE</span><h2>Choose a Story World<span className="dot">.</span></h2><p>Explore a world, then choose a finished pack or a custom setup.</p></div><div className="gallery-controls"><button aria-label="Scroll themes left" disabled={!bounds.left} onClick={() => scroll(-1)}><ArrowLeft size={22} /></button><button aria-label="Scroll themes right" disabled={!bounds.right} onClick={() => scroll(1)}><ArrowRight size={22} /></button></div></div><div className="theme-track" ref={track}>{themes.map((theme, i) => <Link key={theme.id} className="theme-card" to={`/en/themes/${theme.id}/`}><div className="theme-image-wrap"><img src={theme.image} alt={`${theme.title} paper-art story world`} width="800" height="600" decoding="async" loading={i < 3 ? 'eager' : 'lazy'} /><span className="theme-tag">{theme.tag}</span></div><div className="theme-card-copy"><div><h3>{theme.title}</h3><p>{theme.kicker}</p></div><span className="theme-arrow"><ArrowUpRight size={20} /></span></div><span className="theme-use">Explore this world <ArrowRight size={17} /></span></Link>)}</div><div className="gallery-bottom"><Link className="text-link" to="/en/themes/">View all themes <ArrowRight size={18} /></Link><Link className="custom-link" to="/en/create/?custom=1"><PencilSimple size={18} /> Have your own idea? Create a custom world <ArrowRight size={17} /></Link></div></section>;
}

function Home({ sampleReady = false }) { return <><main><section className="hero"><div className="hero-copy"><span className="eyebrow"><Sparkle size={17} weight="fill" /> STORIES ARE BETTER TOGETHER</span><h1>Turn their ideas into an adventure they solve <em>together.</em></h1><p className="hero-lede">Choose a ready-made printable game, or create a new one around your story idea, players, and space.</p><div className="hero-actions"><Link to="/en/themes/" className="button button-large">Explore story worlds <ArrowUpRight size={22} /></Link><Link to="/en/samples/home/" className="secondary-link">{sampleReady ? "Download the free Celebration sample" : "Preview the free Celebration sample"} <ArrowRight size={20} /></Link></div><p className="hero-note"><Check size={17} weight="bold" /> One free Celebration theme · Home and Classroom editions · no points or subscription</p></div><div className="hero-visual"><img src="/assets/hero-workshop.png" width="1316" height="1195" fetchPriority="high" alt="A handmade paper adventure world with a friendly otter, maps and clues" /><span className="hero-sticker"><Sparkle size={19} weight="fill" /> Made for little explorers</span></div></section><ThemeGallery /><section className="steps-section"><div className="section-heading"><div><span className="eyebrow">SIMPLE TO BEGIN</span><h2>From a little idea to a big adventure<span className="dot">.</span></h2></div><Link to="/en/how-it-works/" className="text-link">How it works <ArrowRight size={18} /></Link></div><div className="steps-grid"><article><span className="step-number">01</span><div className="step-icon"><Compass size={30} weight="duotone" /></div><h3>Pick your world</h3><p>Choose a story theme or dream up something entirely your own.</p></article><article><span className="step-number">02</span><div className="step-icon"><UsersThree size={30} weight="duotone" /></div><h3>Tell us your setup</h3><p>Share who will play and where, at home or in the classroom.</p></article><article><span className="step-number">03</span><div className="step-icon"><Printer size={30} weight="duotone" /></div><h3>Bring it to life</h3><p>Review a story direction, then get ready for a printable adventure.</p></article></div></section><section className="two-paths"><div><span className="eyebrow">MADE FOR YOUR MOMENT</span><h2>One good story.<br />Two ways to play<span className="dot">.</span></h2><p>Make a rainy afternoon feel extraordinary, or give a whole classroom a shared mission.</p></div><div className="path-cards"><Link to="/en/create/?setting=home" className="path-card"><span className="path-icon">⌂</span><span><strong>For home</strong><small>Family play, parties, and days worth remembering</small></span><ArrowUpRight size={23} /></Link><Link to="/en/create/?setting=classroom" className="path-card"><span className="path-icon">✦</span><span><strong>For the classroom</strong><small>Group adventures planned around how you teach</small></span><ArrowUpRight size={23} /></Link></div></section><section className="faq-preview"><div><span className="eyebrow">A FEW GOOD QUESTIONS</span><h2>Wondering how it works?</h2></div><div className="faq-list">{faq.slice(0, 3).map(([q,a]) => <FaqItem key={q} q={q} a={a} />)}<Link to="/en/help/" className="text-link">More questions <ArrowRight size={18} /></Link></div></section><section className="last-cta"><Sparkle size={27} weight="fill" /><h2>Every great adventure starts with a little idea.</h2><Link to="/en/create/" className="button button-large">Create My Adventure <ArrowUpRight size={22} /></Link></section></main></>; }

function PageIntro({ eyebrow, title, body, children }) { return <section className="page-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{body && <p>{body}</p>}{children}</section>; }
function NotFoundPage() { return <main><PageIntro eyebrow="PAGE NOT FOUND" title="That page isn't here." body="The address may have changed. You can return to the story worlds or start from the homepage." /><div className="inline-cta"><Link className="button" to="/en/themes/">Browse story worlds <ArrowRight size={18} /></Link><Link className="text-link" to="/en/">Go to homepage <ArrowRight size={18} /></Link></div></main>; }
function ThemesPage() { return <main><PageIntro eyebrow="THE IDEA SHELF" title="Where will your story begin?" body="These illustrated worlds are starting points. Your own idea is welcome too." /><ThemeGallery full /><div className="inline-cta"><div><h2>Something else in mind?</h2><p>Describe a favourite place, creature, or curiosity.</p></div><Link className="button" to="/en/create/?custom=1">Make my own world <ArrowUpRight size={19} /></Link></div></main>; }
function HowPage() { return <main><PageIntro eyebrow="HOW IT WORKS" title="Make room for a story they can step into." body="A few thoughtful choices help shape an adventure for your players and your space." /><div className="detail-steps">{[['01','Choose a story world','Browse a featured theme or describe your own idea. A theme is an invitation, not a fixed story.'],['02','Set the scene','Tell us whether you are playing at home or with a class, plus a few practical details.'],['03','Pick a direction','Preview short story directions before deciding whether to continue.'],['04','Prepare to play','The planned paid experience will include printable player pages and a separate organiser guide.']].map(([n,h,p]) => <article key={n}><span>{n}</span><div><h2>{h}</h2><p>{p}</p></div></article>)}</div><div className="inline-cta"><div><h2>Ready to start?</h2><p>Your first choices take only a moment.</p></div><Link className="button" to="/en/create/">Create My Adventure <ArrowUpRight size={19} /></Link></div></main>; }

const initialDraft = () => { try { const value = JSON.parse(localStorage.getItem('paw-draft') || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; } };
const emptyDraft = () => ({ theme: '', custom: false, idea: '', setting: '', players: '', age: '', place: '', reading: '', paper: '', groups: '', materials: '', direction: '' });
function SetupExtras({ draft, change }) {
  const [open, setOpen] = useState(false);
  return <div className="setup-extras"><button className="disclosure" onClick={() => setOpen(!open)} aria-expanded={open}><span><PencilSimple size={20} /> Reading, printing & materials</span><span>{open ? '−' : '+'}</span></button>{open && <div className="setup-extras-body"><p>Optional details help show how the finished creator would respect practical limits.</p><div className="form-grid"><label>Reading support<select value={draft.reading || ''} onChange={e => change('reading', e.target.value)}><option value="">Choose later</option><option value="Read aloud">Adult reads aloud</option><option value="Short text">Shorter player text</option><option value="Independent">Independent readers</option></select></label><label>Paper size<select value={draft.paper || ''} onChange={e => change('paper', e.target.value)}><option value="">Choose later</option><option value="A4">A4</option><option value="US Letter">US Letter</option></select></label><label className="wide">Materials or space limits<input maxLength={180} value={draft.materials || ''} onChange={e => change('materials', e.target.value)} placeholder="e.g. paper only, no hiding places" /></label></div></div>}</div>;
}
function CreatePage() {
  const [draft, setDraft] = useState(emptyDraft);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  useEffect(() => {
    // Query choices and saved drafts are browser-only. Loading them after the
    // first render keeps direct links consistent with pre-rendered HTML.
    const query = new URLSearchParams(window.location.search);
    const prefTheme = themes.find(t => t.id === query.get('theme'))?.id || '';
    const prefSetting = ['home','classroom'].includes(query.get('setting')) ? query.get('setting') : '';
    const saved = prefTheme || query.has('custom') || prefSetting ? {} : initialDraft();
    setDraft({ theme: prefTheme || saved.theme || '', custom: query.has('custom') || Boolean(saved.custom), idea: saved.idea || '', setting: prefSetting || saved.setting || '', players: saved.players || '', age: saved.age || '', place: saved.place || '', reading: saved.reading || '', paper: saved.paper || '', groups: saved.groups || '', materials: saved.materials || '', direction: saved.direction || '' });
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) { try { localStorage.setItem('paw-draft', JSON.stringify(draft)); } catch { /* The preview still works when local storage is disabled. */ } } }, [draft, loaded]);
  const change = (key, value) => { setDraft(d => ({ ...d, groups: key === 'setting' && value === 'home' ? '' : d.groups, [key]: value, direction: ['theme','setting','players','age','place','groups','reading','paper','materials'].includes(key) ? '' : d.direction })); setError(''); };
  const next = () => {
    if (step === 1 && !draft.theme && !draft.idea.trim()) { setError('Choose a world or describe your idea to continue.'); return; }
    if (step === 2) {
      const players = Number(draft.players);
      const groups = Number(draft.groups);
      if (!draft.setting || !draft.age.trim()) { setError('Choose a setting and add the age range to continue.'); return; }
      if (!Number.isInteger(players) || players < 2) { setError('Enter at least two players as a whole number.'); return; }
      if (draft.setting === 'classroom' && (!Number.isInteger(groups) || groups < 1 || groups > players)) { setError('Enter a whole number of groups between one and the number of students.'); return; }
    }
    if (step === 3 && !draft.direction) { setError('Choose a story direction to continue.'); return; }
    setError('');
    setStep(s => Math.min(4, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const selected = themes.find(t => t.id === draft.theme);
  return <main className="create-main"><div className="create-header"><Link to="/en/" className="back-link"><ArrowLeft size={18} /> Back to home</Link><span className="eyebrow">CREATE YOUR ADVENTURE</span><h1>Let's make a story worth stepping into.</h1><p>A few details to get the idea moving. This is an interactive design preview.</p></div><div className="wizard"><div className="stepper" aria-label="Creation progress">{['Story world','Your setup','Story direction','Review'].map((label, i) => <button key={label} type="button" disabled={i + 1 > step} className={step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''} onClick={() => { if (i + 1 < step) setStep(i + 1); }}><span>{step > i + 1 ? <Check size={16} weight="bold" /> : i + 1}</span>{label}</button>)}</div><div className="wizard-body">{step === 1 && <><span className="eyebrow">STEP 01 / 04</span><h2>What kind of world are we entering?</h2><p>Pick a spark from the shelf or start from your own imagination.</p><div className="choice-grid">{themes.map(t => <button key={t.id} type="button" aria-pressed={draft.theme === t.id && !draft.custom} className={draft.theme === t.id && !draft.custom ? 'world-choice selected' : 'world-choice'} onClick={() => { setDraft(d => ({ ...d, theme: t.id, custom: false, idea: '', direction: '' })); setError(''); }}><img src={t.image} alt="" /><strong>{t.title}</strong></button>)}</div><label className="field-label" htmlFor="idea">Or describe your own idea</label><textarea id="idea" maxLength={400} placeholder="For example, an underwater library guarded by friendly sea creatures…" value={draft.idea} onChange={e => { setDraft(d => ({ ...d, idea: e.target.value, custom: true, theme: '', direction: '' })); setError(''); }} /><p className="small-muted">Please leave out children's names and other personal details.</p></>}{step === 2 && <><span className="eyebrow">STEP 02 / 04</span><h2>Who is the adventure for?</h2><p>Choose the setting that matches your players. There is no default.</p><div className="setting-grid"><button type="button" aria-pressed={draft.setting === 'home'} className={draft.setting === 'home' ? 'setting-choice selected' : 'setting-choice'} onClick={() => change('setting','home')}><UsersThree size={30} /><strong>At home</strong><small>Family, friends, or a party</small></button><button type="button" aria-pressed={draft.setting === 'classroom'} className={draft.setting === 'classroom' ? 'setting-choice selected' : 'setting-choice'} onClick={() => change('setting','classroom')}><Printer size={30} /><strong>In the classroom</strong><small>Students and small groups</small></button></div><div className="form-grid"><label>Number of players or students<input type="number" inputMode="numeric" min="2" step="1" value={draft.players} onChange={e => change('players',e.target.value)} placeholder="e.g. 6" /></label>{draft.setting === 'classroom' && <label>Number of groups<input type="number" inputMode="numeric" min="1" step="1" value={draft.groups || ''} onChange={e => change('groups', e.target.value)} placeholder="e.g. 4" /></label>}<label>Age range<input maxLength={40} value={draft.age} onChange={e => change('age',e.target.value)} placeholder="e.g. 7–9 years" /></label><label className="wide">Where will you play? <span>(optional)</span><input maxLength={180} value={draft.place} onChange={e => change('place',e.target.value)} placeholder="e.g. living room, classroom tables" /></label></div><SetupExtras draft={draft} change={change} /></>}{step === 3 && <><span className="eyebrow">STEP 03 / 04</span><h2>Choose a story direction.</h2><p>These example directions demonstrate how a short proposal could work. No story has been generated yet.</p><div className="direction-list">{[['mystery','The curious mystery',`Follow connected evidence in ${draft.custom ? 'your world' : selected?.title || 'your world'} to solve a missing-message mystery together. Planned materials: printed clue cards.`],['mission','The shared mission',`Share different pieces of information to restore a route together. No one player holds every answer. Planned materials: printed role cards.`]].map(([id,title,body]) => <button key={id} type="button" aria-pressed={draft.direction === id} className={draft.direction === id ? 'direction-choice selected' : 'direction-choice'} onClick={() => change('direction',id)}><span className="radio-dot" /><span><strong>{title}</strong><small>{body}</small></span><ArrowUpRight size={20} /></button>)}</div></>}{step === 4 && <><span className="eyebrow">STEP 04 / 04</span><h2>Here is your starting point.</h2><p>Review your choices. A real checkout and full adventure generation are outside this design prototype.</p><div className="review-card"><div><span>Story world</span><strong>{draft.custom ? draft.idea || 'Your own idea' : selected?.title || 'Your own idea'}</strong></div><div><span>Setting</span><strong>{draft.setting === 'classroom' ? 'Classroom' : 'Home'}</strong></div><div><span>Players</span><strong>{draft.players || '—'} · ages {draft.age || '—'}</strong></div><div><span>Reading & print</span><strong>{draft.reading || 'Choose later'} · {draft.paper || 'Choose later'}</strong></div><div><span>Direction</span><strong>{draft.direction === 'mission' ? 'The shared mission' : 'The curious mystery'}</strong></div></div><div className="prototype-notice"><Sparkle size={22} /><div><strong>Design preview</strong><p>Payment, automated generation, printable files, and account recovery are not connected here.</p></div></div></>}{error && <p className="form-error" role="alert">{error}</p>}<div className="wizard-actions">{step > 1 && <button className="button-quiet" onClick={() => setStep(s => s - 1)}><ArrowLeft size={18} /> Back</button>}{step < 4 ? <button className="button" onClick={next}>{step === 2 ? 'Preview Story Ideas' : step === 3 ? 'Choose This Story' : 'Continue'} <ArrowRight size={18} /></button> : <Link className="button" to="/en/checkout/demo/">Preview checkout <ArrowRight size={18} /></Link>}</div></div></div></main>;
}

function SamplesPage({ classroom }) { return <main><PageIntro eyebrow="SAMPLE MATERIALS" title={classroom ? 'A classroom adventure, step by step.' : 'See what an adventure could contain.'} body="A finished, tested sample pack is being prepared. This page previews the intended structure without presenting fictional files as ready to download." /><div className="sample-layout"><div className="sample-paper"><span>EXAMPLE STRUCTURE</span><h2>{classroom ? 'The classroom mission' : 'The family quest'}</h2><p>A connected story with clues, cooperative moments, and a clear ending.</p><div className="sample-lines"><i /><i /><i /><i /></div></div><div className="sample-copy"><h2>Made for the people running it, too.</h2><ul><li><Check size={20} /> A clear start and setup guide</li><li><Check size={20} /> Player pages and connected clues</li><li><Check size={20} /> Hints and answers for the organiser</li><li><Check size={20} /> A shared story ending</li></ul><p className="muted">The items above describe the planned product format. They are not downloadable materials in this prototype.</p><div className="sample-tabs"><Link className={!classroom ? 'active' : ''} to="/en/samples/home/">Home sample</Link><Link className={classroom ? 'active' : ''} to="/en/samples/classroom/">Classroom sample</Link></div><Link className="button" to="/en/create/">Start creating <ArrowRight size={18} /></Link></div></div></main>; }
function PricingPage() { return <main><PageIntro eyebrow="PRICING" title="The right adventure for your group." body="The home and classroom editions are both part of the planned launch. Final prices will be confirmed before checkout opens." /><div className="price-grid">{[['Home adventure','For families, parties, and small groups','Home play setup','Separate organiser guide'],['Classroom adventure','For teachers planning group play','Classroom group setup','Teacher-facing running guide']].map(([title,body,a,b]) => <article key={title}><span className="eyebrow">{title.toUpperCase()}</span><h2>{title}</h2><p>{body}</p><strong className="price-tbd">Price to be confirmed</strong><ul><li><Check size={19} /> {a}</li><li><Check size={19} /> {b}</li><li><Check size={19} /> Printable materials planned</li></ul><Link className="button" to={`/en/create/?setting=${title.startsWith('Home') ? 'home' : 'classroom'}`}>Start with this setting <ArrowRight size={18} /></Link></article>)}</div><p className="page-note">No payment is collected in this prototype.</p></main>; }
function FaqItem({ q, a }) { const [open, setOpen] = useState(false); return <div className="faq-item"><button aria-expanded={open} onClick={() => setOpen(!open)}><span>{q}</span>{open ? <Minus size={20} /> : <Plus size={20} />}</button>{open && <p>{a}</p>}</div>; }
function HelpPage() { return <main><PageIntro eyebrow="HERE TO HELP" title="Good questions make better adventures." body="Answers about the planned experience and what this design prototype includes." /><div className="help-layout"><h2>Frequently asked questions</h2><div className="faq-list">{faq.map(([q,a]) => <FaqItem key={q} q={q} a={a} />)}</div></div></main>; }
function MyAdventuresPage() { const draft = initialDraft(); return <main><PageIntro eyebrow="MY ADVENTURES" title="Your adventure shelf." body="In this prototype, a draft is saved only in this browser. Accounts and order retrieval are not connected." /><div className="shelf-card"><div className="step-icon"><PencilSimple size={28} /></div><div><h2>{draft.theme || draft.idea ? 'Your saved idea' : 'Your shelf is ready for its first story.'}</h2><p>{draft.theme ? `${draft.theme[0].toUpperCase()}${draft.theme.slice(1)} world` : draft.idea || 'Start with a world, then make it yours.'}</p></div><Link className="button" to="/en/create/">{draft.theme || draft.idea ? 'Continue draft' : 'Start creating'} <ArrowRight size={18} /></Link></div></main>; }
function OrderPage() { const [state, setState] = useState(0); const states = [['Proposal selected','Your story direction is chosen. In the real product, payment would be a separate confirmed step.'],['Payment pending','A production checkout would clearly show the final price and terms before charging.'],['Creating adventure','After successful payment, the adventure would be generated and checked.'],['Files ready','Player materials and an organiser guide would become available once verified.']]; return <main><PageIntro eyebrow="ORDER FLOW DEMO" title="What happens after you choose." body="Explore the planned order states. This is a visual demonstration; there is no payment, generation, or download." /><div className="order-demo"><div className="order-progress">{states.map(([name],i) => <button key={name} onClick={() => setState(i)} className={state === i ? 'active' : ''}><span>{i + 1}</span>{name}</button>)}</div><div className="order-status"><span className="eyebrow">DEMO STATE {state + 1} OF 4</span><h2>{states[state][0]}</h2><p>{states[state][1]}</p><div className="prototype-notice"><DownloadSimple size={22} /><div><strong>Preview only</strong><p>No real order or printable file exists in this prototype.</p></div></div><button className="button" onClick={() => setState((state + 1) % 4)}>Next state <ArrowRight size={18} /></button></div></div></main>; }
function LegalPage({ kind }) { const title = { privacy:'Privacy Policy', terms:'Terms of Use', cookies:'Cookie Notice', refunds:'Refund Policy' }[kind] || 'Legal information'; return <main><PageIntro eyebrow="LEGAL INFORMATION" title={title} body="This policy is under legal review and is not yet published for production use." /><div className="legal-notice"><h2>Policy in preparation</h2><p>The site’s legal and compliance draft exists separately for review. This prototype intentionally does not display unfinished policy text as final terms.</p><Link className="text-link" to="/en/help/">Visit Help <ArrowRight size={18} /></Link></div></main>; }

export function App() {
  const [routeLocation, setRouteLocation] = useState(() => `${path()}${window.location.search}`);
  const route = routeLocation.split('?')[0];
  const [runtime, setRuntime] = useState(null);
  const [runtimeCatalog, setRuntimeCatalog] = useState(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch('/api/v1/health').then(response => response.json()), fetch('/api/v1/catalog').then(response => response.json())])
      .then(([health, catalog]) => { if (!cancelled && health.status === 'configured_runtime') { setRuntime(health); setRuntimeCatalog(catalog); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { const sync = () => setRouteLocation(`${path()}${window.location.search}`); window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync); }, []);
  useEffect(() => {
    const page = pageFor(route);
    if (!page) {
      document.title = `${isPrivateOrderRoute(route) ? 'Your order' : 'Page not found'} | Paper Adventure Workshop`;
      document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex,nofollow');
      document.querySelector('link[rel="canonical"]')?.remove();
      return;
    }
    let canonical = document.querySelector('link[rel="canonical"]');
    const origin = canonical ? new URL(canonical.href).origin : window.location.origin;
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    const url = `${origin}${page.path}`;
    document.title = `${page.title} | Paper Adventure Workshop`;
    for (const [selector, value] of [
      ['meta[name="description"]', page.description],
      ['meta[property="og:title"]', document.title],
      ['meta[property="og:description"]', page.description],
      ['meta[property="og:url"]', url],
    ]) document.querySelector(selector)?.setAttribute('content', value);
    canonical?.setAttribute('href', url);
    const structured = document.querySelector('script[type="application/ld+json"]');
    if (structured) structured.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'WebPage', name: page.title,
      description: page.description, url,
      isPartOf: { '@type': 'WebSite', name: 'Paper Adventure Workshop', url: origin },
    });
  }, [route]);
  const [conflictTo, setConflictTo] = useState('');
  const dismissConflict = () => { pendingNavigation = ''; setConflictTo(''); };
  const conflictDialogRef = useModalFocus(Boolean(conflictTo), dismissConflict);
  useEffect(() => { const show = () => setConflictTo(pendingNavigation); window.addEventListener('draft-conflict', show); return () => window.removeEventListener('draft-conflict', show); }, []);
  let page;
  if (route !== '/' && !pageFor(route) && !isPrivateOrderRoute(route)) page = <NotFoundPage />;
  else if (route === '/en/' || route === '/') page = <Home sampleReady={Boolean(runtime?.sample)} />;
  else if (route.startsWith('/en/themes/') && route !== '/en/themes/') page = <ThemeDetailPage Link={Link} themeId={route.split('/')[3]} catalog={runtimeCatalog} runtime={runtime} />;
  else if (route.startsWith('/en/themes')) page = <CatalogPage Link={Link} catalog={runtimeCatalog} />;
  else if (route.startsWith('/en/for-classroom')) page = <CatalogPage Link={Link} initialSetting="classroom" catalog={runtimeCatalog} />;
  else if (route.startsWith('/en/occasions/halloween')) page = <ThemesExplorer Link={Link} themes={themes} initialCategory="Seasonal" />;
  else if (route.startsWith('/en/how-it-works')) page = <HowPage />;
  else if (route.startsWith('/en/create')) page = runtime?.proposals ? <LiveCreate key={window.location.search} Link={Link} checkoutReady={runtime.checkout} /> : <CreatePage key={window.location.search} />;
  else if (route.startsWith('/en/samples/classroom')) page = runtimeCatalog?.themes.find(theme => theme.id === 'celebration')?.classroom.freeSample ? <LiveSamples Link={Link} classroom catalog={runtimeCatalog} /> : <SamplesExperience Link={Link} classroom />;
  else if (route.startsWith('/en/samples')) page = runtimeCatalog?.themes.find(theme => theme.id === 'celebration')?.home.freeSample ? <LiveSamples Link={Link} catalog={runtimeCatalog} /> : <SamplesExperience Link={Link} />;
  else if (route.startsWith('/en/pricing')) page = runtime?.checkout && runtimeCatalog ? <LivePricing Link={Link} catalog={runtimeCatalog} /> : <PricingPageV13 Link={Link} catalog={runtimeCatalog} runtime={runtime} />;
  else if (route.startsWith('/en/help')) page = <HelpExperience Link={Link} topic={route.split('/')[3] || ''} />;
  else if (route.startsWith('/en/my-adventures')) page = runtime?.account ? <LiveShelf Link={Link} /> : <AdventuresShelf Link={Link} />;
  else if (route.startsWith('/en/checkout')) page = runtime?.checkout ? <LiveCheckout Link={Link} catalog={runtimeCatalog} /> : <CheckoutPreview key={routeLocation} Link={Link} />;
  else if (route.startsWith('/en/orders')) page = runtime?.account && route.split('/')[3] && route.split('/')[3] !== 'demo' ? <LiveOrder Link={Link} orderId={route.split('/')[3]} /> : <OrderExperience Link={Link} />;
  else if (route.startsWith('/en/account')) page = runtime?.account ? <LiveAccount Link={Link} /> : <AccountPreview Link={Link} />;
  else if (route === '/en/privacy/') page = <CurrentPrivacyNotice />;
   else if (['/en/terms/', '/en/cookies/', '/en/refunds/'].includes(route)) page = runtime?.legal ? <LiveLegal kind={route.split('/')[2]} /> : <LegalExperience Link={Link} kind={route.split('/')[2]} />;
  else page = <NotFoundPage />;
  return <><Header route={route} />{page}<Footer runtime={runtime} />{conflictTo && <div className="modal-backdrop" role="presentation"><div ref={conflictDialogRef} tabIndex={-1} className="draft-modal" role="dialog" aria-modal="true" aria-labelledby="draft-dialog-title"><span className="eyebrow">SAVED DRAFT</span><h2 id="draft-dialog-title">Start a new adventure?</h2><p>You already have an idea saved in this browser. Choosing the new world will replace that draft.</p><div className="modal-actions"><button className="button-quiet" onClick={dismissConflict}>Keep my draft</button><button className="button" onClick={() => { const to = conflictTo; pendingNavigation = ''; setConflictTo(''); navigate(to, true); }}>Use new world <ArrowRight size={18} /></button></div></div></div>}</>;
}
