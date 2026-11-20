import './languageSwitcher.css';
import { useEffect, useRef, useState } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';
import { LOCALES, routeLocale, switchLanguage } from '../shared/locale.mjs';
import { prepareSudokuLeave } from './sudoku-leave.mjs';
const star = 'M0-1 .225-.309 .951-.309 .363.118 .588.809 0 .382-.588.809-.363.118-.951-.309-.225-.309Z';
function CountryFlag({ code }) {
  return <svg className="language-flag" viewBox="0 0 30 20" width="24" height="16" aria-hidden="true" focusable="false">
    {code === 'zh' ? <>
      <path fill="#de2910" d="M0 0h30v20H0z" />
      <g fill="#ffde00"><path d={star} transform="translate(5 5) scale(3)" />
        {[[10,2,23],[12,4,46],[12,7,70],[10,9,21]].map(([x,y,r]) => <path key={y} d={star} transform={`translate(${x} ${y}) rotate(${r})`} />)}
      </g>
    </> : <>
      <path fill="#fff" d="M0 0h30v20H0z" />
      {[0,2,4,6,8,10,12].map(row => <path key={row} fill="#b22234" d={`M0 ${row*20/13}h30v${20/13}H0z`} />)}
      <path fill="#3c3b6e" d="M0 0h12v10.77H0z" />
      <g fill="#fff">{Array.from({length:9},(_,row) => Array.from({length:row%2 ? 5 : 6},(_,col) => <path key={`${row}-${col}`} d={star} transform={`translate(${(row%2 ? 2 : 1)+col*2} ${.9+row*1.12}) scale(.47)`} />))}</g>
    </>}
  </svg>;
}

export default function LanguageSwitcher({ onOpen = () => {} }) {
  const location = window.location, locale = routeLocale(location.pathname);
  const [suffix, setSuffix] = useState({ search: '', hash: '' });
  const [open, setOpen] = useState(false);
  const root = useRef(null), trigger = useRef(null);
  const label = locale === 'zh' ? '选择语言' : 'Choose language';
  useEffect(() => {
    const sync = () => setSuffix({ search: window.location.search || '', hash: window.location.hash || '' });
    sync();
    for (const event of ['popstate','hashchange','paw:route-location']) window.addEventListener(event, sync);
    return () => {for (const event of ['popstate','hashchange','paw:route-location']) window.removeEventListener(event, sync);};
  }, []);
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const outside = event => {if (!root.current?.contains(event.target)) setOpen(false);};
    const other = event => {if (event.detail !== 'language') setOpen(false);};
    document.addEventListener('pointerdown', outside);
    window.addEventListener('paw-header-disclosure', other);
    return () => {document.removeEventListener('pointerdown', outside);window.removeEventListener('paw-header-disclosure', other);};
  }, []);
  function reveal() {
    setOpen(true);onOpen();
    window.dispatchEvent(new CustomEvent('paw-header-disclosure', { detail: 'language' }));
    window.dispatchEvent(new Event('paw-close-sudoku-menus'));
  }
  function keyboard(event) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();reveal();
      requestAnimationFrame(() => {
        const links = [...root.current.querySelectorAll('.language-options a')];
        const at = links.indexOf(document.activeElement), step = event.key === 'ArrowDown' ? 1 : -1;
        links[at < 0 ? step === 1 ? 0 : links.length - 1 : (at + step + links.length) % links.length]?.focus();
      });
    }
  }
  return <div className="language-switcher" ref={root} onKeyDown={keyboard} onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);}}>
    <button ref={trigger} type="button" className="language-trigger" aria-label={label} aria-expanded={open} aria-controls="language-options" onClick={() => open ? setOpen(false) : reveal()}>
      <CountryFlag code={locale} /><span className="language-label-full">{LOCALES[locale].label}</span><span className="language-label-short" aria-hidden="true">{locale === 'zh' ? '中文' : 'EN'}</span><CaretDown size={14} aria-hidden="true" />
    </button>
    <nav id="language-options" className="language-options" aria-label={label} hidden={!open}>
      {Object.entries(LOCALES).map(([code, info]) => <a key={code} href={switchLanguage(location.pathname, suffix.search, suffix.hash, code)} lang={info.html} hrefLang={info.html} aria-current={locale === code ? 'true' : undefined} onClick={async event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (code === locale) {setOpen(false);trigger.current?.focus();return;}
        const destination = event.currentTarget.href;
        if (await prepareSudokuLeave()) {setOpen(false);window.location.assign(destination);}
      }}><CountryFlag code={code} /><span>{info.label}</span>{locale === code && <Check size={16} weight="bold" aria-hidden="true" />}</a>)}
    </nav>
  </div>;
}
