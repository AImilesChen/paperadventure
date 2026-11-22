import {basePath, localePath, routeLocale} from './locale.mjs';
import {retiredWeeklyTarget} from './sudoku-retirement.mjs';
import {pageFor} from './page-manifest.mjs';

// Only normalize navigable URLs on the canonical production host. Local and
// preview hosts, API calls and non-GET methods keep their existing behavior.
export function canonicalRedirect(request) {
  const url = new URL(request.url);
  if (url.hostname !== 'paperadventure.app' || !['GET', 'HEAD'].includes(request.method) || /^\/api(?:\/|$)/.test(url.pathname)) return null;
  const before = url.href;
  url.protocol = 'https:';
  if (url.pathname === '/') url.pathname = '/en/';
  if (/^\/(en|zh)$/.test(url.pathname)) url.pathname += '/';
  if (!url.pathname.endsWith('/') && pageFor(url.pathname+'/')) url.pathname += '/';
  const route = basePath(url.pathname), locale = routeLocale(url.pathname);
  if (route === '/en/sudoku/points/' || route === '/en/sudoku/points') url.pathname = localePath('/en/credits/', locale);
  const retired = retiredWeeklyTarget(route);
  if (retired) {url.pathname = localePath(retired, locale);url.search='';}
  if (url.href === before) return null;
  return new Response(null, {status:308, headers:{location:url.href, 'cache-control':'no-cache',...(retired||route==='/en/sudoku/points/'?{'x-robots-tag':'noindex'}:{})}});
}
