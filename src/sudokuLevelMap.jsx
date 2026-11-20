import { t as translateUi, localHref } from "./i18n/index.mjs";import { useEffect, useId, useRef, useState } from 'react';
import { CaretDown, CheckCircle, LockSimple, Play, Sparkle } from '@phosphor-icons/react';
import { publicCatalog } from '../shared/sudoku/catalog.mjs';
import { roadmapFor, techniqueStages } from '../shared/sudoku/level-roadmap.mjs';
import { collectionsFor } from '../shared/sudoku/catalog-model.mjs';
import './sudoku-levels.css';

export default function SudokuLevelMap({ progress, catalog = publicCatalog, blocked = false, guideHref = '/en/sudoku/levels/#sd-levels-explained' }) {
  const [expanded, setExpanded] = useState(false),[selectedCollection, setSelectedCollection] = useState(null),mapId = useId(),firstExtra = useRef(null);
  const highest = progress?.highest || 0,total = catalog.publishedCount,chapter = Math.floor(Math.min(highest, total - 1) / 10) + 1;
  const currentCollection = Math.floor((Math.min(highest + 1, total) - 1) / catalog.collectionSize) + 1;
  const collections = collectionsFor(catalog),collection = collections.find((c) => c.number === (selectedCollection ?? currentCollection)) || collections[0];
  const availableChapters = roadmapFor(catalog).filter((c) => c.from >= collection.from && c.from <= collection.to);
  const activeChapter = availableChapters.find((c) => c.number === chapter);
  const chapters = activeChapter ? [activeChapter, ...availableChapters.filter((c) => c.number !== chapter)] : availableChapters;
  const previewCount = Math.min(5, chapters.length),canExpand = chapters.length > previewCount;
  useEffect(() => {if (expanded) firstExtra.current?.focus();}, [expanded]);
  return <section className="sd-levels-map" aria-labelledby="sd-map-title">
  <div className="sd-levels-section-heading"><div><span className="sd-eyebrow">{translateUi("YOUR SUDOKU ROUTE")}</span><h2 id="sd-map-title" tabIndex={-1}>{highest === total ? translateUi('Your completed trail') : translateUi('Choose your next level')}</h2></div><a href={localHref(guideHref)}>{translateUi("How progression works ")}<span aria-hidden="true">↓</span></a></div>
  <div className="sd-collection-browser"><div><label htmlFor={mapId + '-collection'}>{translateUi("Puzzle collection")}</label><select id={mapId + '-collection'} value={collection.number} onChange={(e) => {setSelectedCollection(Number(e.target.value));setExpanded(false);}}>{collections.map((c) => <option key={c.number} value={c.number}>{translateUi("Collection ")}{translateUi(c.number)} · {translateUi(c.from)}–{translateUi(c.to)}{c.number === currentCollection ? translateUi(' · Current') : translateUi('')}</option>)}</select></div><p>{translateUi("Showing levels ")}{translateUi(collection.from)}–{translateUi(collection.to)}{translateUi(" of ")}{translateUi(total)}{translateUi(" published puzzles. Clear each earlier level to unlock the next.")}</p>{collection.number !== currentCollection && <button type="button" onClick={() => {setSelectedCollection(null);setExpanded(false);}}>{translateUi("Back to my collection")}</button>}</div>
  <div className="sd-map-legend"><span><Play size={14} aria-hidden="true" />{translateUi("Available to play")}</span><span><CheckCircle size={15} aria-hidden="true" />{translateUi("Cleared")}</span><span><LockSimple size={14} aria-hidden="true" />{translateUi("Clear earlier levels to unlock")}</span></div>
  <div className="sd-chapter-map" id={mapId} data-expanded={expanded} aria-label={translateUi("Published chapter map")}>
   {translateUi(chapters.map((c, index) => {
        const count = progress ? Object.keys(progress.completions).filter((n) => Number(n) >= c.from && Number(n) <= c.to).length : 0;
        const current = c.number === chapter,tone = c.stages[0].tone;
        return <details className={'sd-chapter sd-tone-' + tone + (current ? ' sd-current-chapter' : '')} key={c.number} open={current || index === 0} hidden={!expanded && index >= previewCount}>
     <summary ref={index === previewCount ? firstExtra : null}><span className="sd-chapter-number" aria-hidden="true">{translateUi(String(c.number).padStart(2, '0'))}</span><span className="sd-chapter-copy"><span className="sd-chapter-kicker">{translateUi("Chapter ")}{translateUi(c.number)}{translateUi(" \xB7 Levels ")}{translateUi(c.from)}–{translateUi(c.to)}{current && progress && highest < total ? translateUi(' · Your chapter') : translateUi('')}</span><strong>{translateUi(c.title)}</strong><span className="sd-chapter-technique">{translateUi(c.techniques)}</span><span className="sd-chapter-description">{translateUi(c.description)}</span></span><span className="sd-chapter-status">{progress ? translateUi("{value0} / {value1} cleared", { value0: count, value1: c.to - c.from + 1 }) : translateUi("{value0} puzzles", { value0: c.to - c.from + 1 })}<CaretDown size={18} aria-hidden="true" /></span></summary>
     <div className="sd-chapter-inside">{current && <p>{blocked ? translateUi('Review your saved boards before choosing a level.') : progress ? highest === total ? translateUi('Every level is available to revisit. Replays keep your first-clear record.') : translateUi('Clear earlier levels to unlock the next. Replays keep your first-clear record.') : translateUi('Explore the chapters while your saved place loads, or choose Play Sudoku to continue.')}</p>}
      <div className="sd-level-grid">{translateUi(catalog.levels.slice(c.from - 1, c.to).map((p) => {
                const preview = !progress,completed = progress?.completions[p.level],locked = blocked || preview || p.level > highest + 1;
                const status = blocked ? 'Review' : preview ? 'Preview' : completed ? 'Cleared' : locked ? 'Locked' : 'Play';
                const label = translateUi("Level {value0}, {value1}, {value2}", { value0: p.level, value1: status.toLowerCase(), value2: techniqueStages[p.rank - 1].title });
                const Icon = completed ? CheckCircle : preview ? null : locked ? LockSimple : Play;
                const body = <>{Icon && <Icon size={14} aria-hidden="true" />}<span>{translateUi(p.level)}</span><small>{translateUi(status)}</small></>;
                const className = 'sd-level-tile ' + (preview ? 'preview' : completed ? 'cleared' : locked ? 'locked' : 'available');
                return locked ? <span key={p.id} className={className} aria-label={translateUi(label)} aria-disabled="true">{translateUi(body)}</span> : <a key={p.id} href={localHref('/en/sudoku/play/?level=' + p.level)} className={className} aria-label={translateUi(label)}>{translateUi(body)}</a>;
              }))}</div>
     </div>
    </details>;
      }))}
  </div>
  {canExpand && <div className="sd-chapter-browser"><button type="button" aria-expanded={expanded} aria-controls={mapId} onClick={() => setExpanded((value) => !value)}>{expanded ? translateUi('Show fewer chapters') : translateUi('View all chapters')}<CaretDown size={17} aria-hidden="true" /></button></div>}
   <aside className="sd-chapter-coming-soon" aria-labelledby={mapId + '-future-title'}><span className="sd-future-icon" aria-hidden="true"><Sparkle size={25} /></span><div><h3 id={mapId + '-future-title'}>{translateUi("More puzzles ahead")}</h3><p>{translateUi("New puzzles join this same adventure after validation. Your cleared levels and points stay with you.")}</p></div></aside>
 </section>;
}
