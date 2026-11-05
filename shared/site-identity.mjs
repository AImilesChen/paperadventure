export const siteIdentity = Object.freeze({
  name: 'Paper Adventure Workshop',
  alternateName: 'Paper Adventure',
});

export function pageDocumentTitle(page) {
  const brand = ['/en/', '/en/escape-room-puzzles/'].includes(page.path) || page.path.startsWith('/en/escape-room-games/') ? siteIdentity.alternateName : siteIdentity.name;
  return `${page.title} | ${brand}`;
}
