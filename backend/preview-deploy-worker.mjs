import { handleApi } from './worker.mjs';
import { pageFor } from '../shared/page-manifest.mjs';

const publicHost = 'paperadventure.app';
const publicIconPaths = new Set(['/favicon.ico', '/icon.svg', '/icon-512.png', '/apple-touch-icon.png', '/favicon-16.png', '/favicon-32.png']);
const publicRobots = 'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: https://paperadventure.app/sitemap.xml\n';
const previewRobots = 'User-agent: *\nDisallow: /\n';

// The same Worker serves the public site and preview aliases. Only the canonical
// public host may expose the declared content pages to search engines.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return env.BACKEND_STAGE?.fetch ? env.BACKEND_STAGE.fetch(request) : handleApi(request);
    const isPublicHost = url.hostname === publicHost;
    if (url.pathname === '/robots.txt') return new Response(isPublicHost ? publicRobots : previewRobots, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        ...(isPublicHost ? {} : { 'x-robots-tag': 'noindex' }),
      },
    });
    if (url.pathname === '/') {
      url.pathname = '/en/';
      return Response.redirect(url.toString(), 308);
    }

    const isPrivateOrder = /^\/en\/orders\/[A-Za-z0-9-]+\/?$/.test(url.pathname) && url.pathname !== '/en/orders/demo/';
    const isAdmin=/^\/admin(?:\/|$)/.test(url.pathname);
    const canServeShell = ['GET', 'HEAD'].includes(request.method);
    let response = (isPrivateOrder||isAdmin) && canServeShell ? null : await env.ASSETS.fetch(request);
    if (((isPrivateOrder||isAdmin) && canServeShell) || (response?.status === 404 && canServeShell && request.headers.get('accept')?.includes('text/html'))) {
      const fallback = new URL(request.url);
      fallback.pathname = '/app-shell.txt';
      fallback.search = '';
      response = await env.ASSETS.fetch(new Request(fallback, request));
      if (response.ok) {
        const shellHeaders = new Headers(response.headers);
        shellHeaders.set('content-type', 'text/html; charset=utf-8');
        shellHeaders.set('cache-control', 'no-cache');
        response = new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, headers: shellHeaders });
      }
    }
    const headers = new Headers(response.headers);
    if(isAdmin){headers.set('cache-control','private, no-store');headers.set('referrer-policy','no-referrer');headers.set('x-frame-options','DENY');headers.set('content-security-policy',"frame-ancestors 'none'; base-uri 'self'");}
    const isPublicIcon = publicIconPaths.has(url.pathname) && response.headers.get('content-type')?.toLowerCase().startsWith('image/');
    if (isPublicHost && response.ok && (pageFor(url.pathname)?.indexable || isPublicIcon)) headers.delete('x-robots-tag');
    else headers.set('x-robots-tag', 'noindex');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
