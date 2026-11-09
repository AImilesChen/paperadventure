import {useEffect,useRef,useState} from 'react';
import {CaretDown,Play,SquaresFour,Trophy,BookOpen,Lightbulb} from '@phosphor-icons/react';
import {sudokuLinks,sudokuSection} from '../shared/sudoku-navigation.mjs';
import './sudoku-navigation.css';
const icons={play:Play,levels:SquaresFour,ranks:Trophy,rules:BookOpen,techniques:Lightbulb};
export function SudokuDisclosure({route,global=false,onOpen=()=>{}}){
 const[open,setOpen]=useState(false),root=useRef(null),trigger=useRef(null);
 const current=sudokuSection(route),id=global?'sudoku-global-links':'sudoku-learning-links';
 useEffect(()=>setOpen(false),[route]);
 useEffect(()=>{function outside(e){if(!root.current?.contains(e.target))setOpen(false);}function close(){setOpen(false);}document.addEventListener('pointerdown',outside);window.addEventListener('paw-close-sudoku-menus',close);return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('paw-close-sudoku-menus',close);};},[]);
 function keyboard(e){if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);trigger.current?.focus();}else if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();setOpen(true);onOpen();requestAnimationFrame(()=>{const links=[...root.current.querySelectorAll('.sd-nav-panel a')];const at=links.indexOf(document.activeElement);links[at<0?(e.key==='ArrowDown'?0:links.length-1):(at+(e.key==='ArrowDown'?1:-1)+links.length)%links.length]?.focus();});}}
 return <div ref={root} className={global?'sd-global-menu':'sd-learn-menu'} onKeyDown={keyboard} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
  {global&&<a href="/en/sudoku/" className="nav-primary-link sd-global-title" aria-current={current==='play'?'page':undefined} data-active={Boolean(current)}>Sudoku adventure</a>}
  <button ref={trigger} type="button" className={global?'sd-global-toggle':'sd-learn-toggle'} aria-label={global?'Sudoku adventure menu':undefined} aria-expanded={open} aria-controls={id} data-active={!global&&['rules','techniques'].includes(current)} onClick={()=>{setOpen(o=>!o);onOpen();}}>{!global&&'Learn'}<CaretDown size={14} aria-hidden="true"/></button>
  <div id={id} className="sd-nav-panel" hidden={!open} onClick={e=>{if(e.target.closest('a'))setOpen(false);}}>
   {(global?['Play','Learn']:['Learn']).map(group=><div key={group} className="sd-nav-group"><span className="sd-nav-group-title">{group}</span>{sudokuLinks.filter(l=>l.group===group).map(l=>{const Icon=icons[l.icon];return <a key={l.id} href={l.href} aria-current={current===l.id?'page':undefined}><span className={'sd-menu-icon sd-menu-icon-'+l.id}><Icon size={21} aria-hidden="true"/></span><span><strong>{l.title}</strong><small>{l.description}</small></span></a>;})}</div>)}
  </div>
 </div>;
}
export function SudokuSectionHeader({route,title='Sudoku adventure'}){const current=sudokuSection(route);return <header className="sd-header sd-section-header"><h1>{title}</h1><nav aria-label="Sudoku navigation">{sudokuLinks.filter(l=>l.group==='Play').map(l=><a key={l.id} href={l.href} aria-current={current===l.id?'page':undefined}>{l.id==='play'?'Play':l.id==='levels'?'Levels':l.title}</a>)}<SudokuDisclosure route={route}/></nav></header>;}
