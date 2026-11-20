import {basePath} from './locale.mjs';
export const siteIdentity = Object.freeze({
  name: 'Paper Adventure Workshop',
  alternateName: 'Paper Adventure',
});

export function pageDocumentTitle(page) {
  const pathname=basePath(page.path);const brand = ['/en/', '/en/escape-room-puzzles/'].includes(pathname) || pathname.startsWith('/en/escape-room-games/') ? siteIdentity.alternateName : siteIdentity.name;
  return `${page.title} | ${brand}`;
}
