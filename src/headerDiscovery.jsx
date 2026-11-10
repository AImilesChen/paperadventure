import {useEffect,useRef,useState} from 'react';
import {CaretDown,House,Compass,Gift,Tree,DownloadSimple,PuzzlePiece,BookOpen,Question,ArrowUpRight} from '@phosphor-icons/react';

const homeGroups=[
 {title:'Browse adventures',links:[['/en/for-home/','Home adventures','Stories for family play',House],['/en/escape-room-games/','Escape adventures','Print a complete story',Compass]]},
 {title:'For the occasion',links:[['/en/occasions/birthday/','Birthday party games','A story for the celebration',Gift],['/en/occasions/christmas/','Christmas games','A paper gift workshop',Tree]]},
 {title:'Start free',free:true,links:[['/en/samples/home/','Free Home game','Player Pack & Host Guide',DownloadSimple],['/en/escape-room-puzzles/','Free puzzles','Codes, logic & clues',PuzzlePiece]]},
];
const resourceGroups=[{title:'Explore and learn',links:[['/en/guides/','Guides','Plan, print and play',BookOpen],['/en/escape-room-puzzles/','Free puzzles','Try a fresh deduction',PuzzlePiece],['/en/help/','Help centre','Answers and support',Question]]}];
const isCurrent=(route,href)=>route===href||(href==='/en/guides/'&&route.startsWith(href))||(href==='/en/escape-room-games/'&&route.startsWith(href));

export default function HeaderDiscovery({kind,route,LinkComponent,onOpen}){
 const[open,setOpen]=useState(false),root=useRef(null),trigger=useRef(null);
 const groups=kind==='home'?homeGroups:resourceGroups,label=kind==='home'?'For home':'Resources',id=kind+'-navigation';
 const active=kind==='home'?(route.startsWith('/en/for-home')||/^\/en\/themes\/[^/]+\/home\/$/.test(route)||route.startsWith('/en/occasions/')||route==='/en/samples/home/'||route.startsWith('/en/escape-room-games/')):groups.some(g=>g.links.some(([href])=>isCurrent(route,href)));
 useEffect(()=>setOpen(false),[route]);
 useEffect(()=>{
  const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);};
  const other=e=>{if(e.detail!==kind)setOpen(false);};
  document.addEventListener('pointerdown',outside);window.addEventListener('paw-header-disclosure',other);
  return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('paw-header-disclosure',other);};
 },[kind]);
 function reveal(){setOpen(true);onOpen();window.dispatchEvent(new CustomEvent('paw-header-disclosure',{detail:kind}));window.dispatchEvent(new Event('paw-close-sudoku-menus'));}
 function keyboard(e){
  if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);trigger.current?.focus();}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();reveal();requestAnimationFrame(()=>{const links=[...root.current.querySelectorAll('.header-discovery-panel a')],at=links.indexOf(document.activeElement);links[at<0?(e.key==='ArrowDown'?0:links.length-1):(at+(e.key==='ArrowDown'?1:-1)+links.length)%links.length]?.focus();});
  }
 }
 return <div ref={root} className={'header-discovery header-discovery-'+kind} onKeyDown={keyboard} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
  <button ref={trigger} type="button" className="nav-primary-link header-discovery-trigger" aria-expanded={open} aria-controls={id} data-active={active||undefined} onClick={()=>open?setOpen(false):reveal()}>{label}<CaretDown size={15} aria-hidden="true"/></button>
  <div id={id} className="header-discovery-panel" hidden={!open} onClick={e=>{if(e.target.closest('a'))setOpen(false);}}>
   {groups.map(g=><section key={g.title} className={'header-discovery-group'+(g.free?' header-discovery-free':'')} aria-label={g.title}>
    <h2>{g.title}</h2><div>{g.links.map(([href,title,description,Icon])=><LinkComponent key={href} to={href} aria-current={isCurrent(route,href)?'page':undefined}><span className={'header-discovery-icon'+(g.free?' is-free':'')}><Icon size={22} weight="duotone" aria-hidden="true"/></span><span><strong>{title}</strong><small>{description}</small></span>{g.free&&<ArrowUpRight size={15} className="header-discovery-arrow" aria-hidden="true"/>}</LinkComponent>)}</div>
   </section>)}
  </div>
 </div>;
}
