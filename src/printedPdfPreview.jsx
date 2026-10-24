import {useEffect,useRef,useState} from 'react';
import {matchPrintedPassage} from './pdfTextMatch.mjs';

let library;
async function pdfLibrary(){
 if(!library)library=Promise.all([import('pdfjs-dist/build/pdf.mjs'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  .then(([pdf,worker])=>{pdf.GlobalWorkerOptions.workerSrc=worker.default;return pdf;}).catch(error=>{library=null;throw error;});
 return library;
}

// Display-only controls operate on one already downloaded private PDF.
// Page, focus and zoom changes never fetch another edition or call AI.
export default function PrintedPdfPreview({url,label,initialPage=1,page:controlledPage,onPageChange,zoom='fit',focus,onPageCount}){
 const [pdfDocument,setPdfDocument]=useState(null),[localPage,setLocalPage]=useState(initialPage),[error,setError]=useState(''),[rendering,setRendering]=useState(true);
 const [match,setMatch]=useState(null),[locationStatus,setLocationStatus]=useState(''),[box,setBox]=useState(null),[width,setWidth]=useState(500);
 const canvas=useRef(null),scroller=useRef(null),drag=useRef(null),handlers=useRef({onPageChange,onPageCount});
 handlers.current={onPageChange,onPageCount};
 const page=Math.min(pdfDocument?.numPages||10000,Math.max(1,Number(controlledPage??localPage)||1));
 function changePage(value,reason='navigation'){
  const next=Math.max(1,Math.min(pdfDocument?.numPages||10000,value));setLocalPage(next);handlers.current.onPageChange?.(next,reason);
 }
 useEffect(()=>{if(controlledPage==null)setLocalPage(initialPage);},[initialPage,controlledPage]);
 useEffect(()=>{
  const observer=new ResizeObserver(entries=>setWidth(Math.max(160,entries[0].contentRect.width)));
  if(scroller.current)observer.observe(scroller.current);return()=>observer.disconnect();
 },[error]);
 useEffect(()=>{
  let alive=true,loading;const controller=new AbortController();setPdfDocument(null);setError('');setBox(null);setMatch(null);setRendering(true);
  (async()=>{try{
   const [pdf,response]=await Promise.all([pdfLibrary(),fetch(url,{credentials:'same-origin',signal:controller.signal})]);
   if(!response.ok)throw Error('PDF unavailable');const bytes=new Uint8Array(await response.arrayBuffer());if(!alive)return;
   loading=pdf.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:true,enableXfa:false});const result=await loading.promise;
   if(alive){setPdfDocument(result);handlers.current.onPageCount?.(result.numPages);}
  }catch(failure){if(alive&&failure.name!=='AbortError'){setError('Preview could not load. Open the original PDF using the link above.');setRendering(false);}}})();
  return()=>{alive=false;controller.abort();loading?.destroy();};
 },[url]);
 useEffect(()=>{
  setMatch(null);setBox(null);if(!pdfDocument||!focus)return;
  let alive=true;setLocationStatus('Finding the exact printed passage…');
  (async()=>{try{
   if(!focus.text){if(alive)setLocationStatus('This passage is absent from this version.');return;}
   const start=Math.max(1,focus.startPage||1),end=Math.min(pdfDocument.numPages,focus.endPage||pdfDocument.numPages),found=[];
   for(let number=start;number<=end;number++){
    const sheet=await pdfDocument.getPage(number),content=await sheet.getTextContent();if(!alive)return;
    const indices=matchPrintedPassage(content.items,focus.text);if(indices)found.push({page:number,indices,items:content.items});
   }
   if(!alive)return;
   if(found.length===1){setMatch(found[0]);changePage(found[0].page,'locate');setLocationStatus('Changed passage highlighted in the actual PDF.');}
   else setLocationStatus('An exact unique location was not found. Use the readable text comparison or open the full PDF.');
  }catch{if(alive)setLocationStatus('The passage could not be located. The text comparison above remains available.');}})();
  return()=>{alive=false;};
 },[pdfDocument,focus?.id,focus?.text,focus?.startPage,focus?.endPage]);
 useEffect(()=>{
  if(!pdfDocument)return;let alive=true,task;setRendering(true);setBox(null);
  (async()=>{try{
   const sheet=await pdfDocument.getPage(page);if(!alive)return;
   const normal=sheet.getViewport({scale:1}),scale=zoom==='fit'?width/normal.width:Number(zoom)/100*96/72,cssViewport=sheet.getViewport({scale});
   const ratio=Math.min(window.devicePixelRatio||1,2,Math.sqrt(12000000/(cssViewport.width*cssViewport.height)));
   const viewport=sheet.getViewport({scale:scale*ratio}),target=canvas.current;
   target.width=Math.ceil(viewport.width);target.height=Math.ceil(viewport.height);target.style.width=`${cssViewport.width}px`;target.style.height=`${cssViewport.height}px`;
   task=sheet.render({canvasContext:target.getContext('2d'),viewport});await task.promise;if(!alive)return;
   if(match?.page===page){
    const pdf=await pdfLibrary();if(!alive)return;
    const rectangles=match.indices.map(index=>{
     const item=match.items[index],transform=pdf.Util.transform(cssViewport.transform,item.transform);
     if(Math.abs(transform[1])>.01||Math.abs(transform[2])>.01||transform[0]<=0)return null;
     const height=Math.hypot(transform[2],transform[3]);return {left:transform[4],top:transform[5]-height,width:item.width*cssViewport.scale,height:height*1.25};
    });
    if(rectangles.length&&rectangles.every(Boolean)){
     const left=Math.max(0,Math.min(...rectangles.map(r=>r.left))-5),top=Math.max(0,Math.min(...rectangles.map(r=>r.top))-4);
     const right=Math.min(cssViewport.width,Math.max(...rectangles.map(r=>r.left+r.width))+5),bottom=Math.min(cssViewport.height,Math.max(...rectangles.map(r=>r.top+r.height))+4);
     const next={left,top,width:right-left,height:bottom-top};setBox(next);
     requestAnimationFrame(()=>{if(alive&&scroller.current)scroller.current.scrollTo({left:Math.max(0,next.width>scroller.current.clientWidth?left-20:left-(scroller.current.clientWidth-next.width)/2),top:Math.max(0,top-48)});});
    }else setLocationStatus('The passage was found; its layout cannot be highlighted reliably. Use the text comparison.');
   }
   setRendering(false);
  }catch(failure){if(alive&&failure.name!=='RenderingCancelledException'){setError('This page could not render. Open the original PDF above.');setRendering(false);}}})();
  return()=>{alive=false;task?.cancel();};
 },[pdfDocument,page,width,zoom,match]);
 function startDrag(event){
  if(event.pointerType!=='mouse'||event.button!==0)return;
  drag.current={x:event.clientX,y:event.clientY,left:event.currentTarget.scrollLeft,top:event.currentTarget.scrollTop};event.currentTarget.focus({preventScroll:true});event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault();
 }
 return <div className="printed-pdf-preview">
  <div className="printed-pdf-controls"><button type="button" disabled={!pdfDocument||page<=1} onClick={()=>changePage(page-1)} aria-label={`Previous page of ${label}`}>←</button><span>{pdfDocument?`Page ${page} of ${pdfDocument.numPages}`:'Loading PDF…'}</span><button type="button" disabled={!pdfDocument||page>=pdfDocument.numPages} onClick={()=>changePage(page+1)} aria-label={`Next page of ${label}`}>→</button></div>
  {error?<p role="alert">{error}</p>:<div className="printed-pdf-scroll" ref={scroller} tabIndex={0} role="region" aria-label={`${label}, scroll or drag to inspect`}
   onPointerDown={startDrag} onPointerMove={event=>{if(drag.current){event.currentTarget.scrollLeft=drag.current.left+drag.current.x-event.clientX;event.currentTarget.scrollTop=drag.current.top+drag.current.y-event.clientY;}}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
   <div className="printed-pdf-paper" style={{display:pdfDocument?'block':'none'}}><canvas ref={canvas} role="img" aria-label={`${label}, printed page ${page}`}/>{box&&<div className="printed-pdf-highlight" aria-hidden="true" style={box}/>}</div>
  </div>}
  {rendering&&!error&&<p className="printed-pdf-loading" role="status">Rendering printed page…</p>}{focus&&<p className="printed-pdf-location" role="status">{match&&match.page!==page?`The changed passage is on page ${match.page}. Return to that page or select the change above.`:locationStatus}</p>}
 </div>;
}
