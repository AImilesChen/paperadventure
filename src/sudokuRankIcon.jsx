import { useId } from 'react';
import {Ranking,Timer,GridNine,Medal,ClockCountdown,CheckSquare} from '@phosphor-icons/react';
const icons={all:Ranking,speed:Timer,personal:GridNine,medal:Medal,pending:ClockCountdown,complete:CheckSquare};
export default function SudokuRankIcon({kind='all',size=24,className=''}){
 const id=useId().replace(/:/g,'');
 if(kind==='all')return <span className={'sd-rank-glyph sd-rank-glyph-all '+className} aria-hidden="true"><svg width={size} height={size} viewBox="0 0 48 48" focusable="false">
  <defs><linearGradient id={id+'-cup'} x1="0" y1="0" x2="1" y2=".8"><stop stopColor="#fff3bc"/><stop offset=".4" stopColor="#e4b34d"/><stop offset=".7" stopColor="#ffe9a4"/><stop offset="1" stopColor="#af791f"/></linearGradient></defs>
  <path d="M13 11H7v6c0 6 4 9 10 9m18-15h6v6c0 6-4 9-10 9" fill="none" stroke="#b6812b" strokeWidth="3" strokeLinecap="round"/>
  <path d="M13 7h22v10c0 9-5 14-11 14s-11-5-11-14z" fill={'url(#'+id+'-cup)'} stroke="#a57626" strokeWidth="1.3"/>
  <path d="M17 10v8c0 4 2 7 4 8" fill="none" stroke="#fff8d8" strokeWidth="2" strokeLinecap="round" opacity=".8"/>
  <path d="M21 30h6v7h-6z" fill="#bc8a37"/><path d="M17 36h14l3 5H14z" fill={'url(#'+id+'-cup)'} stroke="#a57626" strokeWidth="1.2"/>
  <path d="M13 41h22v3H13z" fill="#285d50" rx="2"/>
  <path d="m24 12 1.5 3 3.4.5-2.4 2.4.6 3.4-3.1-1.6-3.1 1.6.6-3.4-2.4-2.4 3.4-.5z" fill="#9d6c21" opacity=".7"/>
 </svg></span>;
 const Icon=icons[kind]||Ranking;
 return <span className={'sd-rank-glyph sd-rank-glyph-'+kind+' '+className} aria-hidden="true"><Icon size={size} weight="duotone"/></span>;
}
