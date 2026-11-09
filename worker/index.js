import {retiredWeeklyTarget} from '../shared/sudoku-retirement.mjs';
export default {
  async fetch(request, env) {
    const url=new URL(request.url),target=retiredWeeklyTarget(url.pathname);
    if(target)return new Response(null,{status:308,headers:{location:new URL(target,url.origin).href,'cache-control':'no-cache','x-robots-tag':'noindex'}});
    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
