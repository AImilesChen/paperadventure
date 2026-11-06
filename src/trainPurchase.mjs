export function trainPurchaseState(catalog, phase = 'ready') {
  if (phase === 'loading') return { status: 'loading' };
  if (phase === 'error') return { status: 'error' };
  if (!Array.isArray(catalog?.escapeGames) || !Array.isArray(catalog?.offers)) return { status: 'error' };
  const game = catalog.escapeGames.find(item => item.id === 'seventh-carriage');
  const offer = catalog.offers.find(item => item.sku === 'ready_home');
  if (!game || !offer) return { status: 'unavailable' };
  if (typeof game.home?.readyStatus !== 'string' || typeof offer.saleEnabled !== 'boolean' || offer.currency !== 'USD' || !Number.isSafeInteger(offer.unitAmount) || offer.unitAmount < 0) return { status: 'error' };
  return { status: game.home.readyStatus === 'published' && offer.saleEnabled ? 'available' : 'unavailable', amount: offer.unitAmount };
}
