export function clockPurchaseState(catalog, phase = 'ready') {
  if (phase === 'loading') return { status: 'loading' };
  if (phase === 'error') return { status: 'error' };
  if (!Array.isArray(catalog?.escapeGames) || !Array.isArray(catalog?.offers)) return { status: 'error' };
  const game = catalog.escapeGames.find(item => item.id === 'thirteenth-hour');
  const offer = catalog.offers.find(item => item.sku === 'ready_home');
  if (!game || !offer) return { status: 'unavailable' };
  if (typeof game.home?.readyStatus !== 'string' || typeof offer.saleEnabled !== 'boolean' || offer.currency !== 'USD' || !Number.isSafeInteger(offer.unitAmount) || offer.unitAmount < 0) return { status: 'error' };
  return { status: game.home.readyStatus === 'published' && offer.saleEnabled ? 'available' : 'unavailable', amount: offer.unitAmount };
}

// Teaching readings only. Neither state is a set of clues from the paid case.
export const workshopDemo = {
  before: { label: 'BEFORE · DRIVE OFF', readings: [4, 8, 12] },
  after: { label: 'AFTER · DRIVE ON', readings: [7, 10, 1] },
};
export const preparationModes = {
  standard: { label: 'Standard', pages: [1,2,3,4,5,6,7,8,9,11,12], pagesLabel: '1–9, 11–12', materials: 'Ordinary paper, pencil and adult-handled scissors.', operation: 'Fold the lamp, slide the connected strip behind the flat wall frame and adjust the loose selection wheels.', cutting: '17 cut pieces and five window openings.', preparation: 'Keep the wall frame flat. Follow the supplied layer diagram: backing, wheels, cover. No glue, tape, brad, lock or real clock is required.' },
  noCut: { label: 'No-cut', pages: [1,2,4,6,7,9,10,11,12], pagesLabel: '1, 2, 4, 6, 7, 9, 10, 11, 12', materials: 'Ordinary paper, pencil and three spare opaque cover sheets. No scissors.', operation: 'Cover future views, compare the labelled BEFORE and AFTER views on page 10, and circle the chosen wheel settings.', cutting: 'No cutting or window assembly.', preparation: 'An adult still prepares the covered views, checks findings and controls each reveal. Keep the BEFORE and AFTER views at the same place on the table.' },
};
