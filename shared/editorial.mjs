import {guides} from './guides.mjs';

// Fixed editorial dates: change only after a substantive page revision.
const revisedGuides=new Set(['run-a-printable-adventure','organize-a-classroom-adventure']);
export function editorialFor(path){
 const guide=guides.find(g=>g.path===path);
 if(guide)return {published:guide.date,modified:revisedGuides.has(guide.slug)?'2026-11-13':guide.date};
 if(path==='/en/sudoku/how-to-play/')return {modified:'2026-11-10'};
 if(/^\/en\/sudoku\/techniques\/(single-candidate|hidden-single|locked-candidates|naked-pair)\/$/.test(path))return {published:'2026-11-10',modified:'2026-11-13'};
 return null;
}
export const publisherDetails=Object.freeze({
 description:'Printable story adventures for families and classrooms, online escape puzzles and progressive Sudoku.',
 email:'support@paperadventure.app',
 aboutPath:'/en/about/',
 contactPath:'/en/contact/',
 // Add only independently verified profiles belonging to this brand.
 profiles:[],
});
export const displayEditorialDate=value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z'));
