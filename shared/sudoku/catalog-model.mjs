export function validateCatalog(c){
 if(!c||c.schema!==1||!/^bank-[a-f0-9]{16}$/.test(c.version)||!Number.isSafeInteger(c.publishedCount)||c.publishedCount<1||c.chapterSize!==10||c.collectionSize!==100||!Array.isArray(c.levels)||c.levels.length!==c.publishedCount)throw Error('Puzzle catalogue unavailable');
 if(c.chapterCount!==Math.ceil(c.publishedCount/c.chapterSize)||c.collectionCount!==Math.ceil(c.publishedCount/c.collectionSize))throw Error('Puzzle catalogue totals differ');
 for(const [i,p]of c.levels.entries())if(p.level!==i+1||p.id!==`v1-${String(i+1).padStart(3,'0')}`||p.chapter!==Math.floor(i/10)+1||![1,2,3,4].includes(p.rank)||'givens'in p||'solution'in p)throw Error('Puzzle catalogue order or metadata invalid');
 return c;
}
export const nextPublishedLevel=(highest,total)=>Math.min(highest+1,total);
export function collectionsFor(c){return Array.from({length:c.collectionCount},(_,i)=>({number:i+1,from:i*c.collectionSize+1,to:Math.min((i+1)*c.collectionSize,c.publishedCount)}));}
