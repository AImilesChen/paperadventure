// Product facts shared by the React preview and the Cloudflare API scaffold.
// Publication remains disabled until real packs, checkout, tax, and legal gates pass.
export const catalogVersion = '2026-10-08-v1.3-rights';

// Owner-confirmed product policy. Consumer-facing legal text and enforcement
// still require review before any sale or public download is enabled.
export const productRights = Object.freeze({
  version: '2026-10-08-owner-confirmed',
  onlineRedownloadMonths: 12,
  readyAccessStarts: 'payment_confirmed',
  customAccessStarts: 'first_qualified_delivery',
  downloadedFilesUsableWithinLicenceAfterOnlinePeriod: true,
  home: 'One adult purchaser and their household for private, non-commercial activities; reasonable reprinting of the purchased version.',
  classroom: 'One purchasing teacher in classes they directly teach; reasonable printing for those classes.',
  legalReviewPending: true,
});

export const offers = Object.freeze([
  { sku: 'ready_home', kind: 'ready', setting: 'home', currency: 'USD', unitAmount: 999, revisionLimit: 0, saleEnabled: false },
  { sku: 'ready_classroom', kind: 'ready', setting: 'classroom', currency: 'USD', unitAmount: 1499, revisionLimit: 0, saleEnabled: false },
  { sku: 'custom_home', kind: 'custom', setting: 'home', currency: 'USD', unitAmount: 1499, revisionLimit: 2, revisionDays: 30, saleEnabled: false },
  { sku: 'custom_classroom', kind: 'custom', setting: 'classroom', currency: 'USD', unitAmount: 1999, revisionLimit: 2, revisionDays: 30, saleEnabled: false },
]);

// Planned stories explain what each setting would contain. They are not
// evidence of a finished, tested or downloadable game pack.
export const themeStories = Object.freeze({
  celebration: {
    home: { code: 'H01', title: 'The Missing Birthday Chest', goal: 'Follow Fenn the fox\'s clues to a celebration envelope.', image: '/assets/celebration-home-v0.1.jpg', imageCaption: 'Fenn the fox Home story concept; the printable materials remain internal drafts.', beats: ['Choose the right letter', 'Repair the route', 'Share label clues', 'Decode a message', 'Find the matching parcel'] },
    classroom: { code: 'C01', title: 'The Adventure Club\'s First Badge', goal: 'Each group earns a paper badge by solving an invitation and sharing role clues.', image: '/assets/celebration-classroom-v0.1.jpg', imageCaption: 'Adventure Club classroom concept; the printable materials remain internal drafts.', beats: ['Find the invitation', 'Trace the team route', 'Share equipment clues', 'Arrange badge pieces', 'Complete the badge'] },
  },
  dinosaur: {
    home: { code: 'H02', title: 'The Little Dinosaur\'s Way Home', goal: 'Help a friendly dinosaur follow paper clues back to the correct camp.', beats: ['Match footprints', 'Repair the map', 'Share supply clues', 'Read the signposts', 'Find the camp'] },
    classroom: { code: 'C02', title: 'The Dinosaur Research Station Mix-up', goal: 'Sort the station\'s mixed-up records and explain the route with evidence.', beats: ['Sort observation cards', 'Match footprints', 'Combine location clues', 'Order the time strips', 'Submit a conclusion'] },
  },
  space: {
    home: { code: 'H03', title: 'The Lost Space Signal', goal: 'Find a lost robot probe and send back a pretend paper message.', beats: ['Find the real signal', 'Repair the star map', 'Calibrate paper cards', 'Decode the message', 'Restore contact'] },
    classroom: { code: 'C03', title: 'Restart the Star Station', goal: 'Each group uses shared clues to restore its paper communication station.', beats: ['Separate signal from noise', 'Complete the star map', 'Choose paper equipment', 'Translate the signal', 'Record the restart'] },
  },
  forest: {
    home: { code: 'H04', title: 'The Forest Post Office Mystery', goal: 'Help the forest post carrier deliver a mislabelled parcel to a story character.', beats: ['Identify the mail batch', 'Order delivery records', 'Share parcel clues', 'Repair the address', 'Deliver the parcel'] },
    classroom: { code: 'C04', title: 'The Forest Postal Investigators', goal: 'Build a group evidence trail for a wrongly sorted paper parcel.', beats: ['Check the mail batch', 'Order the records', 'Combine role clues', 'Match the map', 'Write the evidence'] },
  },
  halloween: {
    home: { code: 'H05', title: 'The Missing Pumpkin Light', goal: 'Recover four paper seals to relight a friendly story-world pumpkin.', beats: ['Meet the messenger', 'Repair the festival map', 'Find the right parcel', 'Decode the reply', 'Arrange four seals'] },
    classroom: { code: 'C05', title: 'The Autumn Festival Crew', goal: 'Each group prepares a friendly paper festival and checks its opening plan.', image: '/assets/autumn-classroom-v0.1.jpg', imageCaption: 'Neutral autumn classroom draft; the organiser can choose festival wording before publication.', beats: ['Find the invitation', 'Repair the festival map', 'Share decoration clues', 'Read the plan', 'Complete the opening'] },
  },
  christmas: {
    home: { code: 'H06', title: 'The Christmas Delivery Office', goal: 'Sort story gift cards and complete the final paper delivery.', beats: ['Check the labels', 'Match gift cards', 'Share route clues', 'Decode a note', 'Complete delivery'] },
    classroom: { code: 'C06', title: 'The Winter Gift Sorting Station', goal: 'Each group sorts pretend gifts and checks a paper departure plan.', image: '/assets/winter-classroom-v0.1.jpg', imageCaption: 'Winter visual option; the organiser chooses the wording.', beats: ['Check the batch', 'Match destinations', 'Combine sorting rules', 'Check the route', 'Finish the manifest'] },
  },
});

export const themes = Object.freeze([
  { id: 'celebration', title: 'Celebration', kicker: 'A little magic for a big day', image: '/assets/celebration.png', tag: 'Party favourite' },
  { id: 'dinosaur', title: 'Dinosaur', kicker: 'Follow the clues to a lost world', image: '/assets/dinosaur.png', tag: 'Curious explorers' },
  { id: 'space', title: 'Space', kicker: 'A mission among the stars', image: '/assets/space.png', tag: 'Out of this world' },
  { id: 'forest', title: 'Forest', kicker: 'Discover what the trees are hiding', image: '/assets/forest.png', tag: 'Nature lovers' },
  { id: 'halloween', title: 'Halloween', kicker: 'A friendly pumpkin festival mystery', image: '/assets/halloween-friendly-v0.1.jpg', tag: 'Seasonal' },
  { id: 'christmas', title: 'Christmas', kicker: 'A festive quest to share', image: '/assets/christmas.png', tag: 'Seasonal' },
].map(theme => Object.freeze({
  ...theme,
  story: Object.freeze(themeStories[theme.id]),
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
    productRights,
    offers,
    themes,
  };
}
