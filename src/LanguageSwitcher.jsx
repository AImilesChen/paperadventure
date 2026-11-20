import {t as translateUi} from "./i18n/index.mjs";
import { useEffect, useState } from 'react';
import { LOCALES, routeLocale, switchLanguage } from '../shared/locale.mjs';
import { prepareSudokuLeave } from './sudoku-leave.mjs';
export default function LanguageSwitcher() {
  const location = window.location,locale = routeLocale(location.pathname);const [suffix, setSuffix] = useState({ search: '', hash: '' });
  useEffect(() => {const sync = () => setSuffix({ search: window.location.search || '', hash: window.location.hash || '' });sync();window.addEventListener('popstate', sync);window.addEventListener('hashchange', sync);window.addEventListener('paw:route-location', sync);return () => {window.removeEventListener('popstate', sync);window.removeEventListener('hashchange', sync);window.removeEventListener('paw:route-location', sync);};}, []);
  return <nav className="language-switcher" aria-label={translateUi(locale === 'zh' ? '语言' : 'Language')}>{Object.entries(LOCALES).map(([code, info]) => <a key={code} href={switchLanguage(location.pathname, suffix.search, suffix.hash, code)} lang={info.html} hrefLang={info.html} aria-current={locale === code ? 'true' : undefined} onClick={async (event) => {if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;event.preventDefault();if (code === locale) return;const destination = event.currentTarget.href;if (await prepareSudokuLeave()) window.location.assign(destination);}}>{info.label}</a>)}</nav>;
}
