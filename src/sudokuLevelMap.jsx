import {useEffect,useId,useRef,useState} from 'react';
import {CaretDown,CheckCircle,LockSimple,Play,Sparkle} from '@phosphor-icons/react';
import {publicCatalog} from '../shared/sudoku/catalog.mjs';
import {roadmapFor,techniqueStages} from '../shared/sudoku/level-roadmap.mjs';
import {collectionsFor} from '../shared/sudoku/catalog-model.mjs';
import './sudoku-levels.css';

export default function SudokuLevelMap({progress,catalog=publicCatalog,blocked=false,guideHref='/en/sudoku/levels/#sd-levels-explained'}) {
 const [expanded,setExpanded]=useState(false),[selectedCollection,setSelectedCollection]=useState(null),mapId=useId(),firstExtra=useRef(null);
 const highest=progress?.highest||0,total=catalog.publishedCount,chapter=Math.floor(Math.min(highest,total-1)/10)+1;
 const currentCollection=Math.floor((Math.min(highest+1,total)-1)/catalog.collectionSize)+1;
 const collections=collectionsFor(catalog),collection=collections.find(c=>c.number===(selectedCollection??currentCollection))||collections[0];
 const availableChapters=roadmapFor(catalog).filter(c=>c.from>=collection.from&&c.from<=collection.to);
 const activeChapter=availableChapters.find(c=>c.number===chapter);
 const chapters=activeChapter?[activeChapter,...availableChapters.filter(c=>c.number!==chapter)]:availableChapters;
 const previewCount=Math.min(5,chapters.length),canExpand=chapters.length>previewCount;
 useEffect(()=>{if(expanded)firstExtra.current?.focus();},[expanded]);
 return <section className="sd-levels-map" aria-labelledby="sd-map-title">
  <div className="sd-levels-section-heading"><div><span className="sd-eyebrow">YOUR SUDOKU ROUTE</span><h2 id="sd-map-title" tabIndex={-1}>{highest===total?'Your completed trail':'Choose your next level'}</h2></div><a href={guideHref}>How progression works <span aria-hidden="true">↓</span></a></div>
  <div className="sd-collection-browser"><div><label htmlFor={mapId+'-collection'}>Puzzle collection</label><select id={mapId+'-collection'} value={collection.number} onChange={e=>{setSelectedCollection(Number(e.target.value));setExpanded(false);}}>{collections.map(c=><option key={c.number} value={c.number}>Collection {c.number} · {c.from}–{c.to}{c.number===currentCollection?' · Current':''}</option>)}</select></div><p>Showing levels {collection.from}–{collection.to} of {total} published puzzles. Clear each earlier level to unlock the next.</p>{collection.number!==currentCollection&&<button type="button" onClick={()=>{setSelectedCollection(null);setExpanded(false);}}>Back to my collection</button>}</div>
  <div className="sd-map-legend"><span><Play size={14} aria-hidden="true"/>Available to play</span><span><CheckCircle size={15} aria-hidden="true"/>Cleared</span><span><LockSimple size={14} aria-hidden="true"/>Clear earlier levels to unlock</span></div>
  <div className="sd-chapter-map" id={mapId} data-expanded={expanded} aria-label="Published chapter map">
   {chapters.map((c,index)=>{
    const count=progress?Object.keys(progress.completions).filter(n=>Number(n)>=c.from&&Number(n)<=c.to).length:0;
    const current=c.number===chapter,tone=c.stages[0].tone;
    return <details className={'sd-chapter sd-tone-'+tone+(current?' sd-current-chapter':'')} key={c.number} open={current||index===0} hidden={!expanded&&index>=previewCount}>
     <summary ref={index===previewCount?firstExtra:null}><span className="sd-chapter-number" aria-hidden="true">{String(c.number).padStart(2,'0')}</span><span className="sd-chapter-copy"><span className="sd-chapter-kicker">Chapter {c.number} · Levels {c.from}–{c.to}{current&&progress&&highest<total?' · Your chapter':''}</span><strong>{c.title}</strong><span className="sd-chapter-technique">{c.techniques}</span><span className="sd-chapter-description">{c.description}</span></span><span className="sd-chapter-status">{progress?`${count} / ${c.to-c.from+1} cleared`:`${c.to-c.from+1} puzzles`}<CaretDown size={18} aria-hidden="true"/></span></summary>
     <div className="sd-chapter-inside">{current&&<p>{blocked?'Review your saved boards before choosing a level.':progress?highest===total?'Every level is available to revisit. Replays keep your first-clear record.':'Clear earlier levels to unlock the next. Replays keep your first-clear record.':'Explore the chapters while your saved place loads, or choose Play Sudoku to continue.'}</p>}
      <div className="sd-level-grid">{catalog.levels.slice(c.from-1,c.to).map(p=>{
       const preview=!progress,completed=progress?.completions[p.level],locked=blocked||preview||p.level>highest+1;
       const status=blocked?'Review':preview?'Preview':completed?'Cleared':locked?'Locked':'Play';
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
   <aside className="sd-chapter-coming-soon" aria-labelledby={mapId+'-future-title'}><span className="sd-future-icon" aria-hidden="true"><Sparkle size={25}/></span><div><h3 id={mapId+'-future-title'}>More puzzles ahead</h3><p>New puzzles join this same adventure after validation. Your cleared levels and points stay with you.</p></div></aside>
 </section>;
}
