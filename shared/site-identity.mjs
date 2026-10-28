export const siteIdentity = Object.freeze({
  name: 'Paper Adventure Workshop',
  alternateName: 'Paper Adventure',
});

export function pageDocumentTitle(page) {
  const brand = page.path === '/en/' ? siteIdentity.alternateName : siteIdentity.name;
  return `${page.title} | ${brand}`;
}
