// Read-only differences of the hash-verified printed views returned by the
// workspace API. Customer feedback is never used to invent a change summary.
export const printedFields=[
 {key:'title',label:'Checkpoint title',role:'both'},
 {key:'storyContext',label:'Story moment',role:'both'},
 {key:'task',label:'Player task',role:'player'},
 {key:'clue',label:'Reading guidance',role:'player'},
 {key:'hint',label:'Adult hint',role:'guide'},
];
export function printedChanges(current=[],candidate=[],{kind='whole',stageNumber}={}){
 const changed=[],unchanged=[];
 for(const next of candidate){
  if(kind==='checkpoint'&&next.number!==stageNumber)continue;
  const before=current.find(item=>item.number===next.number);if(!before)continue;
  for(const field of printedFields){
   const oldText=String(before[field.key]||''),newText=String(next[field.key]||'');
   const entry={id:`${next.number}-${field.key}`,stageNumber:next.number,...field,before:oldText,after:newText};
   if(oldText===newText)unchanged.push(entry);else changed.push(entry);
  }
 }
 return {changed,unchanged};
}
export const changesForRole=(changes,role)=>changes.filter(item=>item.role===role||item.role==='both');

// Preserve every character, including spaces and punctuation, on each side.
// A bounded LCS keeps highlights deterministic and avoids quadratic work for
// unusually long old documents. React renders these as text, never as HTML.
export function wordChanges(before,after){
 const tokens=text=>String(text).match(/\s+|[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s]/gu)||[];
 const a=tokens(before),b=tokens(after);
 if(a.length>512||b.length>512)return [{type:'removed',text:before},{type:'added',text:after}];
 const rows=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)rows[i][j]=a[i]===b[j]?rows[i+1][j+1]+1:Math.max(rows[i+1][j],rows[i][j+1]);
 const parts=[];const append=(type,text)=>{if(parts.at(-1)?.type===type)parts.at(-1).text+=text;else parts.push({type,text});};
 let i=0,j=0;
 while(i<a.length||j<b.length){
  if(i<a.length&&j<b.length&&a[i]===b[j]){append('same',a[i]);i++;j++;}
  else if(j<b.length&&(i===a.length||rows[i][j+1]>rows[i+1][j]))append('added',b[j++]);
  else append('removed',a[i++]);
 }
 return parts;
}
