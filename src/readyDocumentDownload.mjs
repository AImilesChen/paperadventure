import {readyDocumentStem} from '../shared/ready-document-editions.mjs';
import {createDownloadZip} from './downloadZip.mjs';
export function readyDocumentUrl(orderId,role,paper,locale,edition){
 if(!['player','guide'].includes(role)||!['A4','Letter'].includes(paper)||!['en','zh'].includes(locale)||!edition)throw new Error('Choose an available PDF language, edition and paper size.');
 return `/api/v1/files/${encodeURIComponent(orderId)}/${role}?paper=${paper}&locale=${locale}&edition=${encodeURIComponent(edition)}`;
}
export async function prepareReadyLanguageDownload({orderId,paper,locale,edition,themeId='ocean',fetcher=fetch}){
 const stem=readyDocumentStem(themeId);
 const files=await Promise.all(['player','guide'].map(async role=>{
  const response=await fetcher(readyDocumentUrl(orderId,role,paper,locale,edition),{credentials:'same-origin'});
  if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error?.message||'The selected PDF files are unavailable. Retry or choose another available language.');}
  if(!response.headers.get('content-type')?.includes('application/pdf')||response.headers.get('x-paper-adventure-locale')!==locale||response.headers.get('x-paper-adventure-pack-version')!==edition)throw new Error('The PDF language or edition changed. Refresh this order and retry.');
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw new Error('A PDF could not be verified. Retry the download.');
  return {name:`${stem}-${role}-${locale}-${paper}.pdf`,data:bytes};
 }));
 return {blob:createDownloadZip(files),filename:`${stem}-${locale}-${edition}-${paper}.zip`};
}
