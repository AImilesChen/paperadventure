// Product facts shared by the React preview and the Cloudflare API scaffold.
// Publication remains disabled until real packs, checkout, tax, and legal gates pass.
export const catalogVersion = '2026-10-07-v1.3';

export const offers = Object.freeze([
  { sku: 'ready_home', kind: 'ready', setting: 'home', currency: 'USD', unitAmount: 999, revisionLimit: 0, saleEnabled: false },
  { sku: 'ready_classroom', kind: 'ready', setting: 'classroom', currency: 'USD', unitAmount: 1499, revisionLimit: 0, saleEnabled: false },
  { sku: 'custom_home', kind: 'custom', setting: 'home', currency: 'USD', unitAmount: 1499, revisionLimit: 2, revisionDays: 30, saleEnabled: false },
  { sku: 'custom_classroom', kind: 'custom', setting: 'classroom', currency: 'USD', unitAmount: 1999, revisionLimit: 2, revisionDays: 30, saleEnabled: false },
]);

export const themes = Object.freeze([
  { id: 'celebration', title: 'Celebration', kicker: 'A little magic for a big day', image: '/assets/celebration.png', tag: 'Party favourite' },
  { id: 'dinosaur', title: 'Dinosaur', kicker: 'Follow the clues to a lost world', image: '/assets/dinosaur.png', tag: 'Curious explorers' },
  { id: 'space', title: 'Space', kicker: 'A mission among the stars', image: '/assets/space.png', tag: 'Out of this world' },
  { id: 'forest', title: 'Forest', kicker: 'Discover what the trees are hiding', image: '/assets/forest.png', tag: 'Nature lovers' },
  { id: 'halloween', title: 'Halloween', kicker: 'A mystery with playful chills', image: '/assets/halloween.png', tag: 'Seasonal' },
  { id: 'christmas', title: 'Christmas', kicker: 'A festive quest to share', image: '/assets/christmas.png', tag: 'Seasonal' },
].map(theme => Object.freeze({
  ...theme,
  home: Object.freeze({ readyStatus: 'not_published', freeSample: false }),
  classroom: Object.freeze({ readyStatus: 'not_published', freeSample: false }),
})));

export function formatUsd(unitAmount) {
  return `US$${(unitAmount / 100).toFixed(2)}`;
}

export function offerFor(kind, setting) {
  return offers.find(offer => offer.kind === kind && offer.setting === setting) ?? null;
}

export function publicCatalog() {
  return {
    version: catalogVersion,
    publicationState: 'development_preview',
    freeSampleThemeId: null,
    freeSampleCandidateThemeId: 'celebration',
    offers,
    themes,
  };
}
