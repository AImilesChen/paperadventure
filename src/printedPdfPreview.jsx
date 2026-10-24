import {useEffect,useRef,useState} from 'react';

let library;
async function pdfLibrary(){
 if(!library)library=Promise.all([import('pdfjs-dist/build/pdf.mjs'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([pdf,worker])=>{pdf.GlobalWorkerOptions.workerSrc=worker.default;return pdf;});
 return library;
}

// Render the exact private PDF bytes, rather than an HTML approximation or a
// browser-specific PDF plugin. Works in mobile and embedded browsers as well.
export default function PrintedPdfPreview({url,label,initialPage=1}){
 const [document,setDocument]=useState(null),[page,setPage]=useState(initialPage),[error,setError]=useState(''),[rendering,setRendering]=useState(true);
 const canvas=useRef(null),container=useRef(null),[width,setWidth]=useState(500);
 useEffect(()=>{const observer=new ResizeObserver(entries=>setWidth(Math.max(160,entries[0].contentRect.width)));if(container.current)observer.observe(container.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{
  let alive=true,loading;const controller=new AbortController();setDocument(null);setError('');setPage(initialPage);setRendering(true);
  (async()=>{try{
   const [pdf,response]=await Promise.all([pdfLibrary(),fetch(url,{credentials:'same-origin',signal:controller.signal})]);if(!response.ok)throw Error('PDF unavailable');
   const bytes=new Uint8Array(await response.arrayBuffer());if(!alive)return;
   loading=pdf.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:true,enableXfa:false});const result=await loading.promise;
   if(alive){setDocument(result);setPage(Math.min(Math.max(1,initialPage),result.numPages));}
  }catch(failure){if(alive&&failure.name!=='AbortError'){setError('Preview could not load. Open the original PDF using the link above.');setRendering(false);}}})();
  return()=>{alive=false;controller.abort();loading?.destroy();};
 },[url,initialPage]);
 useEffect(()=>{
  if(!document)return;let alive=true,task;setRendering(true);
  (async()=>{try{
   const sheet=await document.getPage(page);if(!alive)return;
   const ratio=Math.min(window.devicePixelRatio||1,2),normal=sheet.getViewport({scale:1}),viewport=sheet.getViewport({scale:width/normal.width*ratio});
   const target=canvas.current;target.width=viewport.width;target.height=viewport.height;
   task=sheet.render({canvasContext:target.getContext('2d'),viewport});await task.promise;if(alive)setRendering(false);
  }catch(failure){if(alive&&failure.name!=='RenderingCancelledException'){setError('This page could not render. Open the original PDF above.');setRendering(false);}}})();
  return()=>{alive=false;task?.cancel();};
 },[document,page,width]);
 return <div className="printed-pdf-preview" ref={container}>
  <div className="printed-pdf-controls"><button type="button" disabled={!document||page<=1} onClick={()=>setPage(n=>n-1)} aria-label={`Previous page of ${label}`}>←</button><span>{document?`Page ${page} of ${document.numPages}`:'Loading PDF…'}</span><button type="button" disabled={!document||page>=document.numPages} onClick={()=>setPage(n=>n+1)} aria-label={`Next page of ${label}`}>→</button></div>
  {error?<p role="alert">{error}</p>:<><canvas ref={canvas} role="img" aria-label={`${label}, printed page ${page}`} style={{width:'100%',height:'auto',display:document?'block':'none'}}/>{rendering&&<p className="printed-pdf-loading" role="status">Rendering printed page…</p>}</>}
 </div>;
}
