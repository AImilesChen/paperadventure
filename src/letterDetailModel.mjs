export function letterPurchaseState(catalog, phase = 'ready') {
  if (phase === 'loading') return { status: 'loading' };
  if (phase === 'error') return { status: 'error' };
  if (!Array.isArray(catalog?.escapeGames) || !Array.isArray(catalog?.offers)) return { status: 'error' };
  const game = catalog.escapeGames.find(item => item.id === 'last-letter');
  const offer = catalog.offers.find(item => item.sku === 'ready_home');
  if (!game || !offer) return { status: 'unavailable' };
  if (typeof game.home?.readyStatus !== 'string' || typeof offer.saleEnabled !== 'boolean' || offer.currency !== 'USD' || !Number.isSafeInteger(offer.unitAmount) || offer.unitAmount < 0) return { status: 'error' };
  return { status: game.home.readyStatus === 'published' && offer.saleEnabled ? 'available' : 'unavailable', amount: offer.unitAmount };
}

// Independent teaching choices; this module contains no paid clue data or answers.
export const sampleRoutes = {
  a: { name: 'Example route A', cost: 2, evidence: 'A written record', detail: 'Your sample packet contains a written observation to compare.' },
  b: { name: 'Example route B', cost: 4, evidence: 'An on-site observation', detail: 'Your sample packet contains a visual observation to inspect.' },
};
export const sampleDeliveries = {
  direct: { name: 'Example direct delivery', cost: 2 },
  desk: { name: 'Example staffed collection', cost: 1 },
};
export const freshChoiceDemo = () => ({ route: null, helped: null, delivery: null });
export function choiceDemoView(state) {
  const route = sampleRoutes[state.route];
  const beforeDelivery = 6 - (route?.cost ?? 0) - Number(state.helped === true);
  const delivery = route && state.helped !== null ? sampleDeliveries[state.delivery] : null;
  const selectedDelivery = delivery && beforeDelivery >= delivery.cost ? delivery : null;
  return { route, beforeDelivery, remaining: beforeDelivery - (selectedDelivery?.cost ?? 0), delivery: selectedDelivery, canChooseDelivery: Boolean(route && state.helped !== null) };
}
export function changeChoiceDemo(state, event) {
  if (event.type === 'reset') return freshChoiceDemo();
  if (event.type === 'route' && sampleRoutes[event.value]) return { route: event.value, helped: null, delivery: null };
  if (event.type === 'help' && sampleRoutes[state.route] && typeof event.value === 'boolean') return { ...state, helped: event.value, delivery: null };
  const view = choiceDemoView(state);
  if (event.type === 'delivery' && view.canChooseDelivery && sampleDeliveries[event.value]?.cost <= view.beforeDelivery) return { ...state, delivery: event.value };
  return state;
}

export const investigationRoutes = {
  dock: { name: 'Dock warehouse', cost: 2, folder: 11, lamp: 12, proof: 13 },
  press: { name: 'Old newspaper office', cost: 3, folder: 14, lamp: 15, proof: 16 },
  station: { name: 'Hill signal station', cost: 4, folder: 17, lamp: 18, proof: 19 },
};
export const preparationModes = {
  open: { label: 'All choices open', summary: 'All three routes, both tools and later choices stay open.', count: '20', recommended: true },
  route: { label: 'Preset one route', summary: 'One route is prepared; both tools and later choices stay open.', count: '14' },
  tool: { label: 'Preset route + tool', summary: 'One route and one tool are prepared; help and delivery choices stay open.', count: '13' },
  fixed: { label: 'Fully fixed run', summary: 'All route, tool, help and delivery choices are set before printing.', count: '9 or 10' },
};
export const freshPreparation = () => ({ mode: 'open', route: 'dock', tool: 'folder', helped: false, delivery: 'office' });
export function preparationView(state) {
  const mode = preparationModes[state.mode];
  const route = investigationRoutes[state.route];
  if (!mode || !route || !['folder', 'lamp'].includes(state.tool) || typeof state.helped !== 'boolean' || !['home', 'office'].includes(state.delivery)) throw new Error('Invalid preparation selection');
  const fixed = state.mode === 'fixed';
  const personalAllowed = 6 - route.cost - Number(state.helped) >= 2;
  if (fixed && state.delivery === 'home' && !personalAllowed) throw new Error('This fixed run cannot afford personal delivery');
  const pages = new Set([1, 2, 3, 5, 6, 20]);
  if (!fixed || state.helped) pages.add(4);
  for (const [id, entry] of Object.entries(investigationRoutes)) {
    if (state.mode !== 'open' && id !== state.route) continue;
    if (['open', 'route'].includes(state.mode)) { pages.add(entry.folder); pages.add(entry.lamp); }
    else pages.add(entry[state.tool]);
    pages.add(entry.proof);
  }
  const finals = { home: { ordinary: 7, helped: 8 }, office: { ordinary: 9, helped: 10 } };
  if (fixed) pages.add(finals[state.delivery][state.helped ? 'helped' : 'ordinary']);
  else for (const number of [7, 8, 9, 10]) pages.add(number);
  return { ...mode, pages: [...pages].sort((a, b) => a - b), personalAllowed };
}
export function changePreparation(state, patch) {
  const next = { ...state, ...patch };
  if (next.mode === 'fixed' && next.delivery === 'home' && 6 - investigationRoutes[next.route].cost - Number(next.helped) < 2) next.delivery = 'office';
  preparationView(next);
  return next;
}
