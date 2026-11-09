import {useEffect,useId,useRef,useState} from 'react';
import {CaretDown,CheckCircle,LockSimple,Play,Sparkle} from '@phosphor-icons/react';
import {levelCatalog} from '../shared/sudoku/catalog.mjs';
import {chapterRoadmap,techniqueStages} from '../shared/sudoku/level-roadmap.mjs';
import './sudoku-levels.css';

export default function SudokuLevelMap({progress,blocked=false,guideHref='/en/sudoku/levels/#sd-levels-explained'}) {
 const [expanded,setExpanded]=useState(false),mapId=useId(),firstExtra=useRef(null);
 const highest=progress?.highest||0,chapter=Math.floor(Math.min(highest,99)/10)+1;
 const chapters=[chapterRoadmap[chapter-1],...chapterRoadmap.filter(c=>c.number!==chapter)];
 const previewCount=Math.min(5,chapters.length),canExpand=chapters.length>previewCount;
 useEffect(()=>{if(expanded)firstExtra.current?.focus();},[expanded]);
 return <section className="sd-levels-map" aria-labelledby="sd-map-title">
  <div className="sd-levels-section-heading"><div><span className="sd-eyebrow">YOUR 100-LEVEL ROUTE</span><h2 id="sd-map-title" tabIndex={-1}>{highest===100?'Your completed trail':'Choose your next level'}</h2></div><a href={guideHref}>How progression works <span aria-hidden="true">↓</span></a></div>
  <div className="sd-map-legend"><span><Play size={14} aria-hidden="true"/>Available to play</span><span><CheckCircle size={15} aria-hidden="true"/>Cleared</span><span><LockSimple size={14} aria-hidden="true"/>Clear earlier levels to unlock</span></div>
  <div className="sd-chapter-map" id={mapId} data-expanded={expanded} aria-label="100-level chapter map">
   {chapters.map((c,index)=>{
    const count=progress?Object.keys(progress.completions).filter(n=>Number(n)>=c.from&&Number(n)<=c.to).length:0;
    const current=c.number===chapter,tone=c.stages[0].tone;
    return <details className={'sd-chapter sd-tone-'+tone+(current?' sd-current-chapter':'')} key={c.number} open={current} hidden={!expanded&&index>=previewCount}>
     <summary ref={index===previewCount?firstExtra:null}><span className="sd-chapter-number" aria-hidden="true">{String(c.number).padStart(2,'0')}</span><span className="sd-chapter-copy"><span className="sd-chapter-kicker">Chapter {c.number} · Levels {c.from}–{c.to}{current&&progress&&highest<100?' · Your chapter':''}</span><strong>{c.title}</strong><span className="sd-chapter-technique">{c.techniques}</span><span className="sd-chapter-description">{c.description}</span></span><span className="sd-chapter-status">{progress?`${count} / 10 cleared`:'10 puzzles'}<CaretDown size={18} aria-hidden="true"/></span></summary>
     <div className="sd-chapter-inside">{current&&<p>{blocked?'Review your saved boards before choosing a level.':progress?highest===100?'Every level is available to revisit. Replays keep your first-clear record.':'Clear earlier levels to unlock the next. Replays keep your first-clear record.':'Explore the chapters while your saved place loads, or choose Play Sudoku to continue.'}</p>}
      <div className="sd-level-grid">{levelCatalog.slice(c.from-1,c.to).map(p=>{
       const preview=!progress,completed=progress?.completions[p.level],locked=blocked||preview||p.level>highest+1;
       const status=blocked?'Review':preview?'Preview':completed?(completed.assisted?'Helped':'Solo'):locked?'Locked':'Play';
       const label=`Level ${p.level}, ${status.toLowerCase()}, ${techniqueStages[p.rank-1].title}`;
       const Icon=completed?CheckCircle:preview?null:locked?LockSimple:Play;
       const body=<>{Icon&&<Icon size={14} aria-hidden="true"/>}<span>{p.level}</span><small>{status}</small></>;
       const className='sd-level-tile '+(preview?'preview':completed?'cleared':locked?'locked':'available');
       return locked?<span key={p.id} className={className} aria-label={label} aria-disabled="true">{body}</span>:<a key={p.id} href={'/en/sudoku/play/?level='+p.level} className={className} aria-label={label}>{body}</a>;
      })}</div>
     </div>
    </details>;
   })}
  </div>
  {canExpand&&<div className="sd-chapter-browser"><button type="button" aria-expanded={expanded} aria-controls={mapId} onClick={()=>setExpanded(value=>!value)}>{expanded?'Show fewer chapters':'View all chapters'}<CaretDown size={17} aria-hidden="true"/></button></div>}
   <aside className="sd-chapter-coming-soon" aria-labelledby={mapId+'-future-title'}><span className="sd-future-icon" aria-hidden="true"><Sparkle size={25}/></span><div><h3 id={mapId+'-future-title'}>More puzzles ahead</h3><p>Enjoy the current 100-level adventure. Check back for future additions.</p></div></aside>
 </section>;
}
