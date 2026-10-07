import { handleApi } from './worker.mjs';

// Cloudflare-hosted design preview. It cannot create orders or access private files.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request);
    if (url.pathname === '/robots.txt') return new Response('User-agent: AhrefsSiteAudit\nAllow: /\n\nUser-agent: AhrefsBot\nAllow: /\n\nUser-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex, nofollow' } });

    let response = await env.ASSETS.fetch(request);
    if (response.status === 404 && ['GET', 'HEAD'].includes(request.method) && request.headers.get('accept')?.includes('text/html')) {
      const fallback = new URL(request.url);
      fallback.pathname = '/index.html';
      fallback.search = '';
      response = await env.ASSETS.fetch(new Request(fallback, request));
    }
    const headers = new Headers(response.headers);
    headers.set('x-robots-tag', 'noindex, nofollow');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
