import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CaretDown } from '@phosphor-icons/react';
import './siteFooter.css';

const groups = [
  { id: 'adventures', title: 'Adventure games', links: [
    ['Home adventures', '/en/for-home/'],
    ['Classroom adventures', '/en/for-classroom/'],
    ['All story themes', '/en/themes/'],
    ['Birthday games', '/en/occasions/birthday/'],
    ['Printable escape games', '/en/escape-room-games/'],
    ['AI custom adventures', '/en/create/'],
  ] },
  { id: 'play', title: 'Play & learn', links: [
    ['Online puzzle games', '/en/escape-room-puzzles/'],
    ['Play Sudoku', '/en/sudoku/'],
    ['Sudoku levels', '/en/sudoku/levels/'],
    ['Sudoku leaderboard', '/en/sudoku/leaderboard/'],
    ['How to play Sudoku', '/en/sudoku/how-to-play/'],
    ['Sudoku techniques', '/en/sudoku/techniques/'],
  ] },
  { id: 'help', title: 'Help & resources', links: [
    ['How adventures work', '/en/how-it-works/'],
    ['Preparation & hosting guides', '/en/guides/'],
    ['Printing help', '/en/help/print/'],
    ['Help centre', '/en/help/'],
    ['Contact support', '/en/contact/'],
    ['About Paper Adventure', '/en/about/'],
  ] },
  { id: 'account', title: 'Account & purchases', links: [
    ['Account centre', '/en/account/overview/'],
    ['My games', '/en/account/games/'],
    ['AI credits', '/en/credits/'],
    ['Orders & billing', '/en/account/billing/'],
    ['Pricing', '/en/pricing/'],
  ] },
];

export default function SiteFooter({ Link, Brand, runtime }) {
  const [compact, setCompact] = useState(false);
  const [expanded, setExpanded] = useState([]);
  const directoryViewport = useRef(null);
  useEffect(() => {
    const viewport = directoryViewport.current;
    const track = viewport?.firstElementChild;
    if (!viewport || !track) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = null;
    let previousTime = 0;
    let remainder = 0;
    let direction = 1;
    let pauseUntil = 0;
    let visible = false;
    let hovered = false;
    let focused = false;
    let maximum = 0;
    const tick = time => {
      if (previousTime && time >= pauseUntil) {
        remainder += Math.min(time - previousTime, 64) * 0.024;
        const pixels = Math.floor(remainder);
        if (pixels) {
          remainder -= pixels;
          const next = Math.max(0, Math.min(maximum, viewport.scrollLeft + direction * pixels));
          viewport.scrollLeft = next;
          if (next === maximum || next === 0) {
            direction *= -1;
            pauseUntil = time + 1200;
          }
        }
      }
      previousTime = time;
      frame = window.requestAnimationFrame(tick);
    };
    const sync = () => {
      const running = maximum > 1 && visible && !hovered && !focused && !document.hidden && !reducedMotion.matches;
      if (running && frame === null) frame = window.requestAnimationFrame(tick);
      if (!running && frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
        previousTime = 0;
        remainder = 0;
      }
    };
    const measure = () => {
      maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      viewport.dataset.overflow = String(maximum > 1);
      sync();
    };
    const enter = event => { if (event.pointerType !== 'touch') hovered = true; sync(); };
    const leave = () => { hovered = false; sync(); };
    const focus = () => { focused = true; sync(); };
    const blur = event => { focused = viewport.contains(event.relatedTarget); sync(); };
    const manual = () => { pauseUntil = performance.now() + 4000; };
    const resize = new ResizeObserver(measure);
    resize.observe(viewport);
    resize.observe(track);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    intersection.observe(viewport);
    viewport.addEventListener('pointerenter', enter);
    viewport.addEventListener('pointerleave', leave);
    viewport.addEventListener('focusin', focus);
    viewport.addEventListener('focusout', blur);
    viewport.addEventListener('pointerdown', manual, { passive: true });
    viewport.addEventListener('wheel', manual, { passive: true });
    document.addEventListener('visibilitychange', sync);
    reducedMotion.addEventListener('change', sync);
    measure();
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      viewport.removeEventListener('pointerenter', enter);
      viewport.removeEventListener('pointerleave', leave);
      viewport.removeEventListener('focusin', focus);
      viewport.removeEventListener('focusout', blur);
      viewport.removeEventListener('pointerdown', manual);
      viewport.removeEventListener('wheel', manual);
      document.removeEventListener('visibilitychange', sync);
      reducedMotion.removeEventListener('change', sync);
    };
  }, []);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const update = () => { setCompact(query.matches); setExpanded([]); };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return <footer id="site-footer" className="site-footer paw-footer">
    <div className="footer-main">
      <div className="footer-brand-intro">
        <Brand />
        <p>Printable adventures for home and classrooms, plus online Sudoku and puzzles.</p>
        <Link className="footer-free-game" to="/en/samples/home/">Try a free game <ArrowRight size={19} aria-hidden="true" /></Link>
      </div>
      <nav className="footer-links" aria-label="Footer navigation">
        {groups.map(group => <details className="footer-group" key={group.id} open={!compact || expanded.includes(group.id)}>
          <summary tabIndex={compact ? 0 : -1} onClick={event => {
            event.preventDefault();
            if (compact) setExpanded(current => current.includes(group.id) ? current.filter(id => id !== group.id) : [...current, group.id]);
          }}><h2>{group.title}</h2><CaretDown size={20} aria-hidden="true" /></summary>
          <ul>{group.links.map(([label, to]) => <li key={to}><Link to={to}>{label}</Link></li>)}</ul>
        </details>)}
      </nav>
    </div>
    <nav className="footer-directories" aria-label="Tool directories"><span>Tool directories</span><div className="footer-directory-viewport" ref={directoryViewport} tabIndex={0} aria-label="Tool directory links"><div className="footer-directory-track"><a href="https://aitop10.tools/" target="_blank" rel="noopener noreferrer">AiTop10 Tools</a><a href="https://firstlook.tools" target="_blank" rel="noopener noreferrer"><img src="https://firstlook.tools/badge/badge_dark.svg" alt="Featured on First Look" width="200" height="54" loading="lazy" style={{ display: 'block', maxWidth: '100%', height: 'auto' }} /></a><a href="https://findly.tools/paper-adventure-workshop?utm_source=paper-adventure-workshop" target="_blank" rel="noopener noreferrer"><img src="https://findly.tools/badges/findly-tools-badge-light.svg" alt="Featured on Findly.tools" width="175" height="55" loading="lazy" style={{ display: 'block', maxWidth: '100%', height: 'auto' }} /></a><a href="https://saastool.site/item/paper-adventure-workshop?utm_source=paperadventure.app" target="_blank" rel="noopener"><img src="https://saastool.site/badges/saastool-light.svg" alt="Featured on SaaSTool.site" height="54" loading="lazy" style={{ display: 'block', maxWidth: '100%', width: 'auto' }} /></a><a href="https://www.tinyshelf.co" title="Featured on TinyShelf"><img src="https://www.tinyshelf.co/badge/tinyshelf-badge-dark-f4d1216a.svg" alt="Featured on TinyShelf" width="216" height="64" /></a><a href="https://launchpadly.co/startup/paper-adventure-workshop?ref=badge" target="_blank" rel="noopener noreferrer" data-launchpadly-badge="paper-adventure-workshop" data-launchpadly-badge-variant="listed-on"><img src="https://launchpadly.co/embed/badges/startup/paper-adventure-workshop.svg?variant=listed-on" alt="Launchpadly Startup Directory" width="260" height="48" style={{ display: 'block', border: 0 }} /></a></div></div></nav>
    <div className="footer-bottom">
      <span className="footer-copyright">© {new Date().getFullYear()} Paper Adventure Workshop {runtime?.checkout ? '' : runtime?.sample ? '· Free trial available' : '· Design preview'}</span>
      <nav className="footer-policies" aria-label="Policies and privacy">
        <Link to="/en/privacy/">Privacy</Link>
        <Link to="/en/terms/">Terms</Link>
        <Link to="/en/refunds/">Refunds</Link>
        <Link to="/en/cookies/">Cookies</Link>
        <span id="privacy-choices-slot" />
      </nav>
    </div>
  </footer>;
}
