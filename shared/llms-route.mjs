// Keep machine-readable discovery outside HTML SPA fallback handling.
export async function llmsResponse(request,assets){
 const url=new URL(request.url);if(!['/llms.txt','/en/llms.txt'].includes(url.pathname))return null;
 const headers={'content-type':'text/plain; charset=utf-8','x-content-type-options':'nosniff','cache-control':'public, max-age=300',...(url.hostname==='paperadventure.app'?{}:{'x-robots-tag':'noindex'})};
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed.',{status:405,headers:{...headers,allow:'GET, HEAD'}});
 if(url.pathname==='/en/llms.txt')return new Response(null,{status:308,headers:{...headers,location:'/llms.txt'}});
 url.pathname='/llms.txt';url.search='';const r=await assets.fetch(new Request(url,{method:request.method,headers:{accept:'text/plain'}}));
 if(!r.ok||!r.headers.get('content-type')?.toLowerCase().startsWith('text/plain'))return new Response(request.method==='HEAD'?null:'Site guide unavailable.',{status:404,headers:{...headers,'cache-control':'no-store'}});
 return new Response(request.method==='HEAD'?null:r.body,{status:200,headers});
}
