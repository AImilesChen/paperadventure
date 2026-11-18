import { useEffect, useState } from 'react';
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
    <nav className="footer-directories" aria-label="Tool directories"><span>Tool directories</span><a href="https://aitop10.tools/" target="_blank" rel="noopener noreferrer">AiTop10 Tools</a><a href="https://firstlook.tools" target="_blank" rel="noopener noreferrer"><img src="https://firstlook.tools/badge/badge_dark.svg" alt="Featured on First Look" width="200" height="54" loading="lazy" style={{ display: 'block', maxWidth: '100%', height: 'auto' }} /></a><a href="https://findly.tools/paper-adventure-workshop?utm_source=paper-adventure-workshop" target="_blank" rel="noopener noreferrer"><img src="https://findly.tools/badges/findly-tools-badge-light.svg" alt="Featured on Findly.tools" width="175" height="55" loading="lazy" style={{ display: 'block', maxWidth: '100%', height: 'auto' }} /></a></nav>
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
