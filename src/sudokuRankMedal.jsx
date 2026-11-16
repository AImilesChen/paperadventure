import { useId } from 'react';

const finishes = {
  1: { name: 'gold', light: '#fff5c6', middle: '#e8ba51', dark: '#aa721e', ink: '#6d4715', ribbon: '#a44135', fold: '#743128' },
  2: { name: 'silver', light: '#f7fcff', middle: '#c8d7e2', dark: '#849baa', ink: '#3c5365', ribbon: '#456d89', fold: '#304e66' },
  3: { name: 'bronze', light: '#ffe5ca', middle: '#d8a170', dark: '#99603b', ink: '#6e4026', ribbon: '#3d7566', fold: '#285147' },
};

// Decorative within a labelled rank/position. Unique paint IDs also support ties.
export default function SudokuRankMedal({ rank }) {
  const id = useId().replace(/:/g, '');
  const finish = finishes[rank];
  if (!finish) return <span className="sd-rank-ordinal" aria-hidden="true">{String(rank).padStart(2, '0')}</span>;
  return <svg className={'sd-rank-medal sd-rank-medal-' + finish.name} width="44" height="54" viewBox="0 0 48 58" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={id + '-rim'} x1="0" y1="0" x2="1" y2="1"><stop stopColor={finish.light}/><stop offset=".36" stopColor={finish.middle}/><stop offset=".64" stopColor={finish.light}/><stop offset="1" stopColor={finish.dark}/></linearGradient>
      <linearGradient id={id + '-face'} x1="0" y1="0" x2=".8" y2="1"><stop stopColor={finish.light}/><stop offset=".6" stopColor={finish.middle}/><stop offset="1" stopColor={finish.light}/></linearGradient>
    </defs>
    <path d="M8 2h11l9 19-9 5z" fill={finish.ribbon}/><path d="M29 2h11L29 26l-9-5z" fill={finish.ribbon}/>
    <path d="m12 2 9 21 3-2L16 2zm20 0-9 19 3 2L36 2z" fill="#fff" opacity=".35"/>
    <path d="m19 18 5 3 5-3-5 13z" fill={finish.fold}/>
    <circle cx="24" cy="35" r="20" fill={finish.dark} opacity=".13"/>
    <circle cx="24" cy="33" r="19" fill={'url(#' + id + '-rim)'} stroke={finish.dark} strokeWidth="1.2"/>
    <circle cx="24" cy="33" r="15.3" fill={'url(#' + id + '-face)'} stroke={finish.dark} strokeWidth=".7"/>
    <path d="M10 30a14.5 14.5 0 0 1 21-10" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity=".75"/>
    <path d="M14 39c-3-4-3-9 0-12m20 12c3-4 3-9 0-12M13 36l-3-2m3-2-2-3m24 7 3-2m-3-2 2-3" fill="none" stroke={finish.ink} strokeWidth=".9" strokeLinecap="round" opacity=".5"/>
    <text x="24" y="39.5" textAnchor="middle" fill={finish.ink} fontFamily="'Nunito Sans',sans-serif" fontSize="21" fontWeight="900">{rank}</text>
    <path d="M20 46h8" stroke={finish.light} strokeWidth="1.2" strokeLinecap="round"/>
  </svg>;
}
