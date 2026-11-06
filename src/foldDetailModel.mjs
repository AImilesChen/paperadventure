export function foldPurchaseState(catalog, phase = 'ready') {
  if (phase === 'loading') return { status: 'loading' };
  if (phase === 'error') return { status: 'error' };
  if (!Array.isArray(catalog?.escapeGames) || !Array.isArray(catalog?.offers)) return { status: 'error' };
  const game = catalog.escapeGames.find(item => item.id === 'fold-city');
  const offer = catalog.offers.find(item => item.sku === 'ready_home');
  if (!game || !offer) return { status: 'unavailable' };
  if (typeof game.home?.readyStatus !== 'string' || typeof offer.saleEnabled !== 'boolean' || offer.currency !== 'USD' || !Number.isSafeInteger(offer.unitAmount) || offer.unitAmount < 0) return { status: 'error' };
  return { status: game.home.readyStatus === 'published' && offer.saleEnabled ? 'available' : 'unavailable', amount: offer.unitAmount };
}

// Standalone teaching geometry, authored for this public page.
// No map, labels, route or solution from the purchased case is imported here.
export const streetDirections = [
  { bit: 1, opposite: 4, dx: 0, dy: -1 },
  { bit: 2, opposite: 8, dx: 1, dy: 0 },
  { bit: 4, opposite: 1, dx: 0, dy: 1 },
  { bit: 8, opposite: 2, dx: -1, dy: 0 },
];
export const practiceFront = [
  [0, 0, 4, 0],
  [0, 0, 5, 0],
  [10, 10, 9, 0],
  [0, 0, 0, 0],
];
// Back roads in the uncreased, front-aligned coordinate system.
// Folding reflects the left strip onto column1, swapping east and west.
export const practiceReverseStrip = [8, 9, 10, 0];
export const freshPractice = () => ({ rotation: 0, folded: false, stop: 'start' });
export function rotateCell(x, y, rotation) {
  for (let i = 0; i < rotation; i++) [x, y] = [3 - y, x];
  return { x, y };
}
export function rotateStreet(mask, rotation) {
  for (let i = 0; i < rotation; i++) mask = ((mask << 1) & 15) | (mask >> 3);
  return mask;
}
export function reflectStreet(mask) { return (mask & 5) | ((mask & 2) << 2) | ((mask & 8) >> 2); }
export function practiceCells(state) {
  const cells = Array.from({ length: 36 }, (_, index) => ({ x: index % 6, y: Math.floor(index / 6), mask: 0, layer: 'base', exposed: false }));
  const at = (x, y) => cells[y * 6 + x];
  at(0, 3).mask = 2;
  for (let x = 1; x <= 5; x++) at(x, 1).mask = x === 1 ? 2 : x === 5 ? 8 : x === 2 ? 14 : 10;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const turned = rotateCell(x, y, state.rotation);
    const cell = at(turned.x + 1, turned.y + 1);
    if (state.folded && x === 0) { cell.exposed = true; continue; }
    const reverse = state.folded && x === 1;
    cell.mask = rotateStreet(reverse ? reflectStreet(practiceReverseStrip[y]) : practiceFront[y][x], state.rotation);
    cell.layer = reverse ? 'reverse' : 'card';
  }
  return cells;
}
export function practiceStops(state) {
  const moving = (x, y) => { const p = rotateCell(x, y, state.rotation); return { x: p.x + 1, y: p.y + 1 }; };
  return [
    { id: 'start', name: 'Start', short: 'S', x: 0, y: 3 },
    { id: 'turntable', name: 'Turntable', short: 'T', ...moving(2, 2) },
    { id: 'lookout', name: 'Lookout', short: 'L', ...moving(2, 0) },
    { id: 'goal', name: 'Destination', short: 'G', x: 5, y: 1 },
  ];
}
export function practiceView(state) {
  if (!Number.isInteger(state.rotation) || state.rotation < 0 || state.rotation > 3 || typeof state.folded !== 'boolean') throw new Error('Invalid practice map');
  const cells = practiceCells(state);
  const stops = practiceStops(state);
  const party = stops.find(stop => stop.id === state.stop);
  if (!party) throw new Error('Invalid practice position');
  const visited = new Set([party.y * 6 + party.x]);
  const queue = [...visited];
  for (let index = 0; index < queue.length; index++) {
    const cell = cells[queue[index]];
    for (const d of streetDirections) {
      const x = cell.x + d.dx, y = cell.y + d.dy;
      if (x < 0 || x > 5 || y < 0 || y > 5 || !(cell.mask & d.bit)) continue;
      const next = y * 6 + x;
      if (!visited.has(next) && (cells[next].mask & d.opposite)) { visited.add(next); queue.push(next); }
    }
  }
  const reachable = stops.filter(stop => stop.id !== state.stop && visited.has(stop.y * 6 + stop.x));
  return { cells, stops, party, reachable, visited, canChange: state.stop === 'turntable', complete: state.stop === 'goal' };
}
export function changePractice(state, action) {
  if (action.type === 'reset') return freshPractice();
  const view = practiceView(state);
  if (action.type === 'walk' && view.reachable.some(stop => stop.id === action.stop)) return { ...state, stop: action.stop };
  if (action.type === 'rotate' && view.canChange) return { ...state, rotation: (state.rotation + 1) % 4 };
  if (action.type === 'fold' && view.canChange) return { ...state, folded: !state.folded };
  return state;
}

export const roleNames = ['Reader', 'Route Planner', 'Map Handler', 'Road Checker'];
export const roleDescriptions = ['Reads the event after the party arrives.', 'Says which road connection the team wants.', 'Turns or folds at the matching turntable.', 'Traces the visible street after each change.'];
const groups = { 2: [0, 1, 0, 1], 3: [0, 0, 1, 2], 4: [0, 1, 2, 3] };
export function jobsForPlayers(count) {
  if (!groups[count]) throw new Error('Choose two, three or four players');
  return Array.from({ length: Number(count) }, (_, person) => ({ person: person + 1, jobs: roleNames.filter((_, index) => groups[count][index] === person) }));
}
export const printOptions = {
  screen: { label: 'Guide on screen', count: 10, detail: 'Print all 10 Player Pack pages. Read the separate 12-page Adult Guide on screen.' },
  paper: { label: 'Print the guide too', count: 22, detail: 'Print all 10 Player Pack pages plus all 12 Adult Guide pages in the same paper size.' },
};
