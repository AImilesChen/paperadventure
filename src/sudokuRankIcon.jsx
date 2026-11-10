import {Ranking,Timer,GridNine,Medal,ClockCountdown,CheckSquare} from '@phosphor-icons/react';
const icons={all:Ranking,speed:Timer,personal:GridNine,medal:Medal,pending:ClockCountdown,complete:CheckSquare};
export default function SudokuRankIcon({kind='all',size=24,className=''}){
 const Icon=icons[kind]||Ranking;
 return <span className={'sd-rank-glyph sd-rank-glyph-'+kind+' '+className} aria-hidden="true"><Icon size={size} weight="duotone"/></span>;
}
