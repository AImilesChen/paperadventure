// Match only a unique complete printed passage. Ambiguous or absent passages
// get no guessed highlight. PDF.js supplies these items from the actual bytes.
export const normalisePrintedText=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/\s+/g,' ').trim();
export function matchPrintedPassage(items,passage){
 const needle=normalisePrintedText(passage);if(!needle)return null;
 let text='';const spans=[];
 items.forEach((item,index)=>{
  const value=normalisePrintedText(item.str);if(!value)return;
  if(text)text+=' ';const start=text.length;text+=value;spans.push({index,start,end:text.length});
 });
 const start=text.indexOf(needle);
 if(start<0||text.indexOf(needle,start+1)>=0)return null;
 const end=start+needle.length;
 // Do not match a field as part of another word.
 if(start&&/[\p{L}\p{N}]/u.test(text[start-1])&&/[\p{L}\p{N}]/u.test(needle[0])||
  end<text.length&&/[\p{L}\p{N}]/u.test(text[end])&&/[\p{L}\p{N}]/u.test(needle.at(-1)))return null;
 return spans.filter(span=>span.end>start&&span.start<end).map(span=>span.index);
}
