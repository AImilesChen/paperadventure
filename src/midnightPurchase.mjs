export function midnightPurchaseState(catalog, phase = 'ready') {
  if (phase === 'loading') return { status: 'loading' };
  if (phase === 'error') return { status: 'error' };
  if (!Array.isArray(catalog?.escapeGames) || !Array.isArray(catalog?.offers)) return { status: 'error' };
  const game = catalog.escapeGames.find(item => item.id === 'midnight-masquerade');
  const offer = catalog.offers.find(item => item.sku === 'ready_home');
  if (!game || !offer) return { status: 'unavailable' };
  if (typeof game.home?.readyStatus !== 'string' || typeof offer.saleEnabled !== 'boolean' || offer.currency !== 'USD' || !Number.isSafeInteger(offer.unitAmount) || offer.unitAmount < 0) return { status: 'error' };
  return { status: game.home.readyStatus === 'published' && offer.saleEnabled ? 'available' : 'unavailable', amount: offer.unitAmount };
}

// An unrelated teaching example. Never draw these records from the paid case.
export const sharingCards = [
  { id: 'A', title: 'A name and a mask', text: 'Ellis wears the raven mask.' },
  { id: 'B', title: 'A mask and an invitation', text: 'The raven mask received a silver invitation.' },
  { id: 'C', title: 'An invitation and a table', text: 'Silver invitations belong at table 2.' },
];
export function sharingResult(revealed) {
  const count = sharingCards.filter(card => revealed.includes(card.id)).length;
  return { count, answer: count === 3 ? 'Ellis belongs at table 2.' : null };
}
