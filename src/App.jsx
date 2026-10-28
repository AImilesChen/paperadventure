import { useEffect, useRef, useState } from 'react';
import AdminConsole from './adminConsole.jsx';
import FeedbackWidget from './feedbackWidget.jsx';
import { ArrowRight, ArrowLeft, ArrowUpRight, CaretDown, Check, Compass, DownloadSimple, List, Minus, PencilSimple, Plus, Printer, Sparkle, UsersThree, Pause, Play, UserCircle, X } from '@phosphor-icons/react';
import { AccountPreview, AdventuresShelf, CheckoutPreview, HelpExperience, LegalExperience, OrderExperience, PricingExperience, SamplesExperience, ThemesExplorer } from './extended.jsx';
import { themes } from '../shared/catalog.mjs';
import { pageFor } from '../shared/page-manifest.mjs';
import { analyticsAvailable } from './analytics.js';
import { crossesAnalyticsBoundary } from './analytics-route.mjs';
import { CatalogPage, ThemeDetailPage, WorldsOverview } from './productPages.jsx';
import { LiveAccount, LiveShelf, LiveOrder, LiveSamples, LiveCheckout, LiveLegal } from './livePages.jsx';
import { LiveCreate } from './liveCreate.jsx';
import { CreatorGuide } from './creatorGuide.jsx';
import './creatorWorkspace.css';
import './funnel.css';
import { PricingGuide } from './pricingGuide.jsx';
import { HowItWorksPage } from './howItWorks.jsx';
import { HomeProductGuide } from './homeProductGuide.jsx';
import CurrentPrivacyNotice from './privacyNotice.jsx';
import { useModalFocus } from './useModalFocus.js';

const faq = [
  ['What can I download today?', 'The Celebration trial has separate Home and Classroom printable Player Packs and adult guides in A4 and US Letter. Both editions are free.'],
  ['What is inside a printable adventure game?', 'Each game has a Player Pack with story pages and connected clues, plus a separate Host or Teacher Guide with preparation, hints and answers. Offered editions include A4 and US Letter files.'],
  ['How are Home and Classroom adventures different?', 'Home games are family stories for a household group. Classroom games use different story worlds and teacher-led group missions. Celebration is the shared free theme, with a separate game for each setting.'],
  ['Can I use my own story idea?', 'Yes. Start from any featured theme or describe an idea of your own. Signed-in adults can inspect five-checkpoint plans before continuing.'],
  ['Is there a classroom version?', 'Yes. The free Celebration trial has a distinct classroom game, and custom adventure planning supports classroom groups.'],
  ['When would I pay?', 'The free Celebration trial never needs payment. Fixed packs and custom adventures are available in Stripe test mode after adult Google sign-in. Test transactions do not collect real money.'],
];

function path() { return window.location.pathname; }
const isPrivateOrderRoute = route => /^\/en\/orders\/[A-Za-z0-9-]+\/?$/.test(route) && !/^\/en\/orders\/demo\/?$/.test(route);
let pendingNavigation = '';
function navigate(to, approved = false) { const target = new URL(to, window.location.origin); if (!approved && target.pathname === '/en/create/' && (target.searchParams.has('theme') || target.searchParams.has('custom'))) { const saved = initialDraft(); const incoming = target.searchParams.get('theme') || ''; if ((saved.theme || saved.idea) && (target.searchParams.has('custom') || saved.theme !== incoming || Boolean(saved.custom))) { pendingNavigation = to; window.dispatchEvent(new Event('draft-conflict')); return; } } if (analyticsAvailable() && crossesAnalyticsBoundary(window.location.pathname, target.pathname)) { window.location.assign(target.href); return; } window.history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0, behavior: 'instant' }); }
function Link({ to, children, className = '', ...props }) { return <a href={to} className={className} onClick={e => { if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) { e.preventDefault(); navigate(to); } }} {...props}>{children}</a>; }
function Brand() { return <Link to="/en/" className="brand"><span className="brand-mark"><img src="/icon.svg" alt="" width="38" height="38" /></span><span>Paper Adventure<br /><strong>Workshop</strong></span></Link>; }

function Header({ route }) {
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(null);
  const [administrator,setAdministrator]=useState(false);
  const [accountOpen,setAccountOpen]=useState(false);
  const accountRef=useRef(null);
  const accountTrigger=useRef(null);
  useEffect(() => {setOpen(false);setAccountOpen(false);}, [route]);
  useEffect(() => {
    let active = true;
    fetch('/api/v1/auth/session', { credentials: 'same-origin' }).then(response => response.ok ? response.json() : null)
      .then(session => { if (active){setAuthenticated(Boolean(session?.authenticated));setAdministrator(Boolean(session?.admin));} }).catch(() => { if (active) setAuthenticated(false); });
    return () => { active = false; };
  }, []);
  async function signOut() {
    try {
      const response = await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin' });
      if (response.ok) { setAuthenticated(false);setAdministrator(false); setOpen(false);setAccountOpen(false); navigate('/en/'); }
    } catch { /* Keep the current session visible if sign-out could not be confirmed. */ }
  }
  useEffect(() => {
    const closeOnEscape = event => {
      if(event.key==='Escape'){
        if(accountOpen){setAccountOpen(false);accountTrigger.current?.focus();}
        else if(open){setOpen(false);document.querySelector('.menu-toggle')?.focus();}
      }
    };
    const closeOutside=event=>{if(!accountRef.current?.contains(event.target))setAccountOpen(false);};
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown',closeOutside);
    return () => {window.removeEventListener('keydown', closeOnEscape);window.removeEventListener('pointerdown',closeOutside);};
  }, [accountOpen,open]);
  return <header className={route === '/en/' ? 'site-header home-header' : 'site-header'}><div className="nav-shell"><Brand />
    <nav id="primary-navigation" className={open ? 'site-nav open' : 'site-nav'} aria-label="Main navigation" onClick={event=>{if(event.target.closest('a'))setOpen(false);}}>
      <Link to="/en/for-home/" className="nav-primary-link" aria-current={(route.startsWith("/en/for-home") || /^\/en\/themes\/[^/]+\/home\/$/.test(route)) ? "page" : undefined}>For home</Link>
      <Link to="/en/for-classroom/" className="nav-primary-link" aria-current={(route.startsWith("/en/for-classroom") || /^\/en\/themes\/[^/]+\/classroom\/$/.test(route)) ? "page" : undefined}>For classrooms</Link>
      <Link to="/en/create/" className="nav-primary-link" aria-current={route.startsWith("/en/create") ? "page" : undefined}>AI custom adventure</Link>
      <Link to="/en/how-it-works/" className="nav-primary-link" aria-current={route.startsWith("/en/how-it-works") ? "page" : undefined}>How it works</Link>
      <Link to="/en/pricing/" className="nav-primary-link" aria-current={route.startsWith("/en/pricing") ? "page" : undefined}>Pricing</Link>
      <Link className="nav-create-mobile" to="/en/create/">Create with AI <ArrowUpRight size={16} /></Link>
    </nav>
    <div className="nav-actions">
      {authenticated ? <div className="header-account" ref={accountRef} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setAccountOpen(false);}}>
        <button type="button" className="header-account-trigger" ref={accountTrigger} aria-label="Account" aria-expanded={accountOpen} aria-controls="account-navigation" onClick={()=>{setAccountOpen(value=>!value);setOpen(false);}}>
          <UserCircle size={22} aria-hidden="true"/><span>Account</span><CaretDown size={13} aria-hidden="true"/>
        </button>
        {accountOpen&&<nav id="account-navigation" className="header-account-panel" aria-label="Account navigation" onClick={event=>{if(event.target.closest('a'))setAccountOpen(false);}}>
          <Link to="/en/my-adventures/">My adventures <ArrowUpRight size={16} aria-hidden="true"/></Link>
          {administrator&&<a href="/admin/">管理后台 <ArrowUpRight size={16} aria-hidden="true"/></a>}
          <button type="button" className="header-account-signout" onClick={signOut}>Sign out</button>
        </nav>}
      </div> : <Link className="header-signin" to="/en/account/">{authenticated===null?'Account':'Sign in'}</Link>}
      <Link className={route === '/en/' ? 'header-create-secondary' : 'button button-small'} to="/en/create/">Create with AI <ArrowUpRight size={16} /></Link>
    </div>
    <button type="button" className="menu-toggle" aria-controls="primary-navigation" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => {setOpen(!open);setAccountOpen(false);}}>{open ? <X size={25} /> : <List size={25} />}</button>
  </div></header>;
}
function Footer({ runtime }) { return <footer className="site-footer"><div className="footer-main"><div><Brand /><p>Made for curious minds and the people who bring them together.</p></div><div className="footer-links"><div><strong>Explore</strong><Link to="/en/for-home/">Home adventures</Link><Link to="/en/for-classroom/">Classroom adventures</Link><Link to="/en/themes/">All themes</Link><Link to="/en/create/">AI custom adventures</Link><Link to="/en/pricing/">Pricing</Link></div><div><strong>Support</strong><Link to="/en/help/">Help</Link><Link to="/en/samples/home/">Free sample</Link><Link to="/en/account/">Sign in</Link></div><div><strong>Legal</strong><Link to="/en/privacy/">Privacy</Link><Link to="/en/terms/">Terms</Link><Link to="/en/cookies/">Cookies</Link><Link to="/en/refunds/">Refunds</Link></div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Paper Adventure Workshop {runtime?.checkout ? '' : runtime?.sample ? '· Free trial available' : '· Design preview'}</span><span>For grown-ups planning playful adventures.</span></div></footer>; }

function ThemeGallery({ full = false, sampleReady = false }) {
  const track = useRef(null);
  const section = useRef(null);
  const [onScreen, setOnScreen] = useState(false);
  const [entered, setEntered] = useState(false);
  const worldsFor = audience => themes.filter(theme => theme.availableSettings?.includes(audience));
  const resumeTimer = useRef(null);
  const [bounds, setBounds] = useState({ left: false, right: true });
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [touchPaused, setTouchPaused] = useState(false);
  const [setting, setSetting] = useState('home');
  const paused = hovering || focusWithin || touchPaused;
  const galleryThemes = worldsFor(setting);
  useEffect(() => {
    if (full) return;
    const observer = new IntersectionObserver(([entry]) => { setOnScreen(entry.isIntersecting); if (entry.isIntersecting) setEntered(true); }, { threshold: 0.05 });
    if (section.current) observer.observe(section.current);
    return () => observer.disconnect();
  }, [full]);
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
  }, [setting]);
  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) setPlaying(false);
    const update = event => { if (event.matches) setPlaying(false); };
    motion.addEventListener('change', update);
    return () => motion.removeEventListener('change', update);
  }, []);
  const scroll = (direction, wrap = false) => {
    const element = track.current;
    if (!element) return;
    const firstCard = element.querySelector('.theme-card');
    const gap = parseFloat(window.getComputedStyle(element).gap) || 0;
    const step = (firstCard?.getBoundingClientRect().width || element.clientWidth) + gap;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (wrap && element.scrollLeft >= element.scrollWidth - element.clientWidth - 4) element.scrollTo({ left: 0, behavior });
    else element.scrollBy({ left: direction * step, behavior });
  };
  useEffect(() => {
    if (full || !playing || paused || !onScreen) return;
    const element = track.current;
    let frame, previous = 0, position = element.scrollLeft;
    const animate = time => {
      if (document.visibilityState !== 'visible') { previous = 0; frame = requestAnimationFrame(animate); return; }
      const cards = element.querySelectorAll('.theme-card');
      const cycle = cards[galleryThemes.length]?.offsetLeft - cards[0]?.offsetLeft;
      if (previous && cycle > 0) {
        position += Math.min(time - previous, 50) * 0.024;
        if (position >= cycle) position -= cycle;
        element.scrollLeft = position;
      }
      previous = time;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [full, playing, paused, onScreen, setting]);
  const pauseForTouch = () => { window.clearTimeout(resumeTimer.current); setTouchPaused(true); };
  const resumeAfterTouch = () => { window.clearTimeout(resumeTimer.current); resumeTimer.current = window.setTimeout(() => setTouchPaused(false), 8000); };
  return <section ref={section} className={full ? 'themes-section themes-full' : `themes-section theme-marquee ${entered ? 'is-entered' : ''}`} id="themes" aria-labelledby="theme-gallery-heading" aria-roledescription="carousel">
    <div className="section-heading"><div><span className="eyebrow"><Sparkle size={17} weight="fill" /> PICK A THEME</span><h2 id="theme-gallery-heading">Themes & activities<span className="dot">.</span></h2><p>Browse distinct Home and Classroom story worlds. Celebration has a free game in each collection.</p></div><div className="gallery-controls">{!full && <><span className="gallery-status">{!playing ? 'Auto-scroll off' : paused ? 'Paused while viewing cards' : 'Auto-scroll on'}</span><button type="button" className="gallery-play-toggle" aria-label={playing ? 'Pause automatic theme scrolling' : 'Resume automatic theme scrolling'} aria-pressed={!playing} onClick={() => setPlaying(value => !value)}>{playing ? <Pause size={17} weight="bold" /> : <Play size={17} weight="bold" />}<span>{playing ? 'Pause' : 'Play'}</span></button></>}<button type="button" aria-label="Scroll themes left" disabled={!bounds.left} onClick={() => { pauseForTouch(); resumeAfterTouch(); scroll(-1); }}><ArrowLeft size={22} /></button><button type="button" aria-label="Scroll themes right" disabled={!bounds.right} onClick={() => { pauseForTouch(); resumeAfterTouch(); scroll(1); }}><ArrowRight size={22} /></button></div></div>
    <div className="theme-audience-switch" role="group" aria-label="Choose where to play"><button type="button" aria-pressed={setting === "home"} className={setting === "home" ? "active" : ""} onClick={() => { setSetting("home"); track.current?.scrollTo({ left: 0, behavior: "auto" }); }}>Home adventures <span>{worldsFor('home').length} games</span></button><button type="button" aria-pressed={setting === "classroom"} className={setting === "classroom" ? "active" : ""} onClick={() => { setSetting("classroom"); track.current?.scrollTo({ left: 0, behavior: "auto" }); }}>Classroom adventures <span>{worldsFor('classroom').length} games</span></button></div>
    <div className="theme-track" ref={track} role="group" aria-label="Theme cards" onTouchStart={pauseForTouch} onTouchEnd={resumeAfterTouch} onTouchCancel={resumeAfterTouch} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)} onFocusCapture={() => setFocusWithin(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false); }}>{(full ? galleryThemes : [...galleryThemes, ...galleryThemes]).map((theme, i) => <Link key={`${theme.id}-${i}`} aria-hidden={i >= galleryThemes.length ? true : undefined} tabIndex={i >= galleryThemes.length ? -1 : undefined} data-loop-copy={i >= galleryThemes.length ? "true" : undefined} className="theme-card" to={`/en/themes/${theme.id}/${setting}/`}><div className="theme-image-wrap"><img src={theme.story[setting].image || theme.image} alt={`${theme.title} ${setting} story artwork`} width="800" height="600" decoding="async" loading={i < 3 ? 'eager' : 'lazy'} /><span className="theme-tag">{theme.id === 'celebration' ? sampleReady ? setting === 'home' ? 'Free Home printable' : 'Free Classroom printable' : 'Free trial theme' : (setting === 'home' ? 'Home story pack' : 'Classroom story pack')}</span></div><div className="theme-card-copy"><div><h3>{theme.story[setting].title}</h3><p>{theme.title} world</p></div><span className="theme-arrow"><ArrowUpRight size={20} /></span></div><p className="theme-mission">{theme.story[setting].goal}</p><span className="theme-use">{theme.id === 'celebration' && sampleReady ? `Explore free ${setting} game` : 'Explore this theme'} <ArrowRight size={17} /></span></Link>)}</div>
    <div className="gallery-bottom"><Link className="text-link" to={setting === "home" ? "/en/for-home/" : "/en/for-classroom/"}>See all {galleryThemes.length} {setting} adventures <ArrowRight size={18} /></Link><Link className="custom-link" to={`/en/create/?custom=1&setting=${setting}`}><PencilSimple size={18} /> Have another idea? Start your own story <ArrowRight size={17} /></Link></div>
  </section>;
}
function Home({ sampleReady = false }) { return <main className="home-funnel">
  <section className="hero"><div className="hero-copy"><span className="eyebrow"><Sparkle size={17} weight="fill" /> PRINTABLE STORIES, SHARED ADVENTURES</span><h1>Printable adventure games for kids. <em>Play together.</em></h1><p className="hero-lede">Print the story, share the clues and solve five connected missions together. Start with a complete free game for your family or classroom.</p><div className="hero-actions"><Link to="/en/samples/home/" className="button button-large">{sampleReady ? 'Try a complete game free' : 'Explore the Celebration trial'} <DownloadSimple size={20} /></Link><Link to="/en/themes/" className="secondary-link">Browse game themes <ArrowRight size={20} /></Link></div>{sampleReady && <p className="hero-free-note">No account needed · Printable PDF · A4 &amp; US Letter</p>}<div className="hero-facts" aria-label="What you can find here"><span><strong>Ages 6–12</strong> story play</span><span><strong>Home + Classroom</strong> games</span></div></div><div className="hero-visual"><img src="/assets/hero-workshop.png" width="1316" height="1195" fetchPriority="high" alt="A handmade paper adventure world with a friendly otter, maps and clues" /></div></section>
  <ThemeGallery sampleReady={sampleReady} />
  <section className="sample-spotlight" aria-labelledby="sample-spotlight-heading"><div className="sample-spotlight-intro"><div><span className="eyebrow">{sampleReady ? "TWO COMPLETE FREE PRINTABLES" : "CELEBRATION TRIAL"}</span><h2 id="sample-spotlight-heading">One celebration. Two ways to play<span className="dot">.</span></h2><p>{sampleReady ? 'Download printable player pages and a separate grown-up guide in A4 or US Letter.' : 'Explore the two stories and their printable game plans while the trial files are being prepared.'}</p></div><span className="sample-price">{sampleReady ? <>FREE<br /><small>both editions</small></> : <>2<br /><small>editions</small></>}</span></div><div className="sample-spotlight-grid"><article className="sample-spotlight-card"><img src="/assets/celebration-home-v0.1.jpg" alt="Fenn the fox Celebration Home adventure artwork" loading="lazy" /><div><span className="sample-setting">FOR FAMILIES</span><h3>The Missing Birthday Chest</h3><p>Follow Fenn the fox through five connected paper clues to find the celebration parcel.</p><Link to="/en/samples/home/" className="text-link">{sampleReady ? "Get the Home game" : "Explore the Home game"} <ArrowRight size={18} /></Link></div></article><article className="sample-spotlight-card"><img src="/assets/celebration-classroom-v0.1.jpg" alt="Adventure Club Celebration Classroom artwork" loading="lazy" /><div><span className="sample-setting">FOR TEACHERS</span><h3>The Adventure Club’s First Badge</h3><p>Rebuild the invitation, make a paper display badge, then welcome another crew.</p><Link to="/en/samples/classroom/" className="text-link">{sampleReady ? "Get the Classroom game" : "Explore the Classroom game"} <ArrowRight size={18} /></Link></div></article></div><p className="sample-spotlight-note">{sampleReady ? 'Both trial editions are ready to download. No payment or subscription.' : 'Explore both trial editions while the printable files are being prepared.'}</p></section>
  <HomeProductGuide Link={Link} sampleReady={sampleReady} />
  <section className="steps-section"><div className="section-heading"><div><span className="eyebrow">CREATE SOMETHING NEW</span><h2>Want a story of your own<span className="dot">?</span></h2><p>Start from one of the themes above or describe a world nobody has seen yet.</p></div><Link to="/en/how-it-works/" className="text-link">How custom adventures work <ArrowRight size={18} /></Link></div><div className="steps-grid"><article><span className="step-number">01</span><div className="step-icon"><Compass size={30} weight="duotone" /></div><h3>Choose a world</h3><p>Pick an illustrated theme or describe your own idea.</p></article><article><span className="step-number">02</span><div className="step-icon"><UsersThree size={30} weight="duotone" /></div><h3>Tell us your group</h3><p>Plan for your household or your classroom.</p></article><article><span className="step-number">03</span><div className="step-icon"><Printer size={30} weight="duotone" /></div><h3>Preview a direction</h3><p>Choose paper play styles and inspect a five-checkpoint plan before deciding to continue.</p></article></div><Link to="/en/create/" className="button home-create-link">Create your own adventure <ArrowUpRight size={18} /></Link></section>
  <section className="two-paths"><div><span className="eyebrow">MADE FOR YOUR MOMENT</span><h2>Two settings.<br />Different adventures<span className="dot">.</span></h2><p>Home packs are household mysteries for 2–12 players. Classroom packs use different teacher-led worlds and group clues for 2–35 students. Celebration has a free edition for each setting.</p></div><div className="path-cards"><Link to="/en/for-home/" className="path-card"><span className="path-icon">⌂</span><span><strong>Home adventure games</strong><small>Household stories, a Host Guide and a free Celebration game</small></span><ArrowUpRight size={23} /></Link><Link to="/en/for-classroom/" className="path-card"><span className="path-icon">✦</span><span><strong>Classroom adventure games</strong><small>Different group missions, a Teacher Guide and a free Celebration game</small></span><ArrowUpRight size={23} /></Link></div></section>
  <section className="faq-preview"><div><span className="eyebrow">A FEW GOOD QUESTIONS</span><h2>Wondering how it works?</h2></div><div className="faq-list">{faq.slice(0, 4).map(([q,a]) => <FaqItem key={q} q={q} a={a} />)}<Link to="/en/help/" className="text-link">More questions <ArrowRight size={18} /></Link></div></section><section className="last-cta"><Sparkle size={27} weight="fill" /><h2>Every great adventure starts with a little idea.</h2><Link to="/en/create/" className="button button-large">Create My Adventure <ArrowUpRight size={22} /></Link></section>
</main>; }
function PageIntro({ eyebrow, title, body, children }) { return <section className="page-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{body && <p>{body}</p>}{children}</section>; }
function NotFoundPage() { return <main><PageIntro eyebrow="PAGE NOT FOUND" title="That page isn't here." body="The address may have changed. You can return to the story worlds or start from the homepage." /><div className="inline-cta"><Link className="button" to="/en/themes/">Browse story worlds <ArrowRight size={18} /></Link><Link className="text-link" to="/en/">Go to homepage <ArrowRight size={18} /></Link></div></main>; }
function ThemesPage() { return <main><PageIntro eyebrow="THE IDEA SHELF" title="Where will your story begin?" body="These illustrated worlds are starting points. Your own idea is welcome too." /><ThemeGallery full sampleReady={false} /><div className="inline-cta"><div><h2>Something else in mind?</h2><p>Describe a favourite place, creature, or curiosity.</p></div><Link className="button" to="/en/create/?custom=1">Make my own world <ArrowUpRight size={19} /></Link></div></main>; }
const initialDraft = () => { try { const value = JSON.parse(localStorage.getItem('paw-draft') || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; } };
const emptyDraft = () => ({ theme: '', custom: false, idea: '', setting: '', players: '', age: '', place: '', reading: '', paper: '', groups: '', materials: '', direction: '' });
function SetupExtras({ draft, change }) {
  const [open, setOpen] = useState(false);
  return <div className="setup-extras"><button className="disclosure" onClick={() => setOpen(!open)} aria-expanded={open}><span><PencilSimple size={20} /> Reading, printing & materials</span><span>{open ? '−' : '+'}</span></button>{open && <div className="setup-extras-body"><p>Optional details help show how the finished creator would respect practical limits.</p><div className="form-grid"><label>Reading support<select value={draft.reading || ''} onChange={e => change('reading', e.target.value)}><option value="">Choose later</option><option value="Read aloud">Adult reads aloud</option><option value="Short text">Shorter player text</option><option value="Independent">Independent readers</option></select></label><label>Paper size<select value={draft.paper || ''} onChange={e => change('paper', e.target.value)}><option value="">Choose later</option><option value="A4">A4</option><option value="US Letter">US Letter</option></select></label><label className="wide">Materials or space limits<input maxLength={180} value={draft.materials || ''} onChange={e => change('materials', e.target.value)} placeholder="e.g. paper only, no hiding places" /></label></div></div>}</div>;
}
function CreatePage({ unavailable = false }) {
  return <main className="extended-page live-page creator-workspace"><header id="start" className="creator-heading creator-hero"><div className="creator-hero-copy"><span className="eyebrow">AI CUSTOM ADVENTURE</span><h1>Create a custom printable adventure for your group.</h1><p>Shape your idea into an English printable adventure for children aged 6–12. Choose story details and play styles, then inspect a free format example before ordering a personal plan.</p></div><figure className="creator-hero-art"><img src="/assets/custom-adventure-workshop-v1.jpg" alt="Paper story cards and a hand drawing a branching adventure map" width="1448" height="1086" fetchPriority="high" decoding="async" /><figcaption>Story-making illustration · your delivery is printable PDFs.</figcaption></figure></header><section className="custom-create-loading custom-create-shell" aria-live="polite"><h2>Your idea starts here</h2><p>{unavailable ? 'The creator is temporarily unavailable. Please try again later.' : 'Loading your creative workspace…'}</p><Link to="/en/themes/">Browse ready-made games</Link></section><CreatorGuide Link={Link} /></main>;
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
  const [queryReady, setQueryReady] = useState(false);
  useEffect(() => setQueryReady(true), []);
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
    const indexableHere = ['paperadventure.app', 'localhost', '127.0.0.1'].includes(window.location.hostname) && Boolean(page?.indexable);
    let robots = document.querySelector('meta[name="robots"]');
    if (indexableHere) robots?.remove();
    else {
      if (!robots) {
        robots = document.createElement('meta');
        robots.name = 'robots';
        document.head.appendChild(robots);
      }
      robots.content = 'noindex';
    }
    if (!page) {
      document.title = `${route==='/admin'||route.startsWith('/admin/')?'管理后台':isPrivateOrderRoute(route) ? 'Your order' : 'Page not found'} | Paper Adventure Workshop`;
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
  else if (route.startsWith('/en/themes/') && route !== '/en/themes/') page = <ThemeDetailPage Link={Link} themeId={route.split('/')[3]} selectedSetting={['home', 'classroom'].includes(route.split('/')[4]) ? route.split('/')[4] : queryReady ? new URLSearchParams(routeLocation.split('?')[1] || '').get('setting') : null} catalog={runtimeCatalog} runtime={runtime} />;
  else if (route.startsWith('/en/themes')) page = <WorldsOverview Link={Link} catalog={runtimeCatalog} />;
  else if (route.startsWith('/en/for-home')) page = <CatalogPage key={route} Link={Link} initialSetting="home" catalog={runtimeCatalog} />;
  else if (route.startsWith('/en/for-classroom')) page = <CatalogPage key={route} Link={Link} initialSetting="classroom" catalog={runtimeCatalog} />;
  else if (route.startsWith('/en/occasions/halloween')) page = <ThemesExplorer Link={Link} themes={themes} initialCategory="Seasonal" />;
  else if (route.startsWith('/en/how-it-works')) page = <HowItWorksPage Link={Link} catalog={runtimeCatalog} checkoutMode={runtime?.checkoutMode} />;
  else if (route.startsWith('/en/create')) page = queryReady ? <LiveCreate key={window.location.search} Link={Link} checkoutReady={Boolean(runtime?.checkout)} checkoutMode={runtime?.checkoutMode} runtimeOffers={runtimeCatalog?.offers} /> : <CreatePage key={window.location.search} unavailable={Boolean(runtime)} />;
  else if (route.startsWith('/en/samples/classroom')) page = runtimeCatalog?.themes.find(theme => theme.id === 'celebration')?.classroom.freeSample ? <LiveSamples Link={Link} classroom catalog={runtimeCatalog} /> : <SamplesExperience Link={Link} classroom />;
  else if (route.startsWith('/en/samples')) page = runtimeCatalog?.themes.find(theme => theme.id === 'celebration')?.home.freeSample ? <LiveSamples Link={Link} catalog={runtimeCatalog} /> : <SamplesExperience Link={Link} />;
  else if (route.startsWith('/en/pricing')) page = <PricingGuide Link={Link} catalog={runtimeCatalog} checkoutMode={runtime?.checkoutMode} checkoutReady={runtime?.checkout} />;
  else if (route.startsWith('/en/help')) page = <HelpExperience Link={Link} topic={route.split('/')[3] || ''} />;
  else if (route.startsWith('/en/my-adventures')) page = runtime?.account ? <LiveShelf Link={Link} /> : <AdventuresShelf Link={Link} />;
  else if (route.startsWith('/en/checkout')) page = runtime?.checkout ? <LiveCheckout Link={Link} catalog={runtimeCatalog} checkoutMode={runtime.checkoutMode} /> : <CheckoutPreview key={routeLocation} Link={Link} />;
  else if (isPrivateOrderRoute(route)) page = <LiveOrder Link={Link} orderId={route.split('/')[3]} />;
  else if (route === '/en/orders/demo/') page = <OrderExperience Link={Link} />;
  else if (route.startsWith('/en/account')) page = runtime?.account ? <LiveAccount Link={Link} /> : <AccountPreview Link={Link} />;
  else if (route === '/en/privacy/') page = runtime?.legal ? <LiveLegal key="privacy" kind="privacy" /> : <CurrentPrivacyNotice />;
   else if (['/en/terms/', '/en/cookies/', '/en/refunds/'].includes(route)) page = runtime?.legal ? <LiveLegal key={route} kind={route.split('/')[2]} /> : <LegalExperience Link={Link} kind={route.split('/')[2]} />;
  else page = <NotFoundPage />;
  if(route==='/admin'||route.startsWith('/admin/'))return <AdminConsole/>;
  return <><Header route={route} />{page}<Footer runtime={runtime} /><FeedbackWidget enabled={runtime?.feedback===true&&runtime?.feedbackNotice===true} Link={Link}/>{conflictTo && <div className="modal-backdrop" role="presentation"><div ref={conflictDialogRef} tabIndex={-1} className="draft-modal" role="dialog" aria-modal="true" aria-labelledby="draft-dialog-title"><span className="eyebrow">SAVED DRAFT</span><h2 id="draft-dialog-title">Start a new adventure?</h2><p>You already have an idea saved in this browser. Choosing the new world will replace that draft.</p><div className="modal-actions"><button className="button-quiet" onClick={dismissConflict}>Keep my draft</button><button className="button" onClick={() => { const to = conflictTo; pendingNavigation = ''; setConflictTo(''); navigate(to, true); }}>Use new world <ArrowRight size={18} /></button></div></div></div>}</>;
}

