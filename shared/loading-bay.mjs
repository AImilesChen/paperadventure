export const bayEdition = 3;
export const baySize = 6;
export const bayPieces = [{"id": "X", "axis": "H", "fixed": 2, "length": 2}, {"id": "A", "axis": "V", "fixed": 5, "length": 3}, {"id": "B", "axis": "H", "fixed": 0, "length": 3}, {"id": "C", "axis": "V", "fixed": 5, "length": 2}, {"id": "D", "axis": "V", "fixed": 4, "length": 2}, {"id": "E", "axis": "H", "fixed": 4, "length": 2}, {"id": "F", "axis": "H", "fixed": 3, "length": 2}, {"id": "G", "axis": "H", "fixed": 3, "length": 2}, {"id": "H", "axis": "H", "fixed": 0, "length": 2}, {"id": "I", "axis": "V", "fixed": 2, "length": 2}, {"id": "J", "axis": "V", "fixed": 0, "length": 2}];
export const bayStart = [2, 2, 2, 0, 2, 3, 0, 2, 0, 4, 1];
export const freshBay = () => ({ edition: bayEdition, positions: [...bayStart] });
export const bayKey = positions => positions.join(',');
export function bayOccupancy(positions) {
  if (!Array.isArray(positions) || positions.length !== bayPieces.length) return null;
  const cells = Array(baySize * baySize).fill(null);
  for (let i = 0; i < bayPieces.length; i++) {
    const p = bayPieces[i], at = positions[i];
    if (!Number.isInteger(at) || at < 0 || at + p.length > baySize) return null;
    for (let n = 0; n < p.length; n++) {
      const cell = p.axis === 'H' ? p.fixed * baySize + at + n : (at + n) * baySize + p.fixed;
      if (cells[cell] !== null) return null;
      cells[cell] = p.id;
    }
  }
  return cells;
}
export function baySlides(positions) {
  const cells = bayOccupancy(positions);
  if (!cells) return [];
  const slides = [];
  bayPieces.forEach((p, i) => {
    for (const direction of [-1, 1]) for (let amount = 1; ; amount++) {
      const to = positions[i] + direction * amount;
      if (to < 0 || to + p.length > baySize) break;
      const edge = direction < 0 ? to : to + p.length - 1;
      const cell = p.axis === 'H' ? p.fixed * baySize + edge : edge * baySize + p.fixed;
      if (cells[cell] !== null && cells[cell] !== p.id) break;
      const next = [...positions]; next[i] = to;
      slides.push({ piece: p.id, from: positions[i], to, positions: next });
    }
  });
  return slides;
}
let graph;
export function bayStates() {
  if (graph) return graph;
  graph = new Map([[bayKey(bayStart), [...bayStart]]]);
  const pending = [[...bayStart]];
  for (let i = 0; i < pending.length; i++) for (const move of baySlides(pending[i])) {
    const key = bayKey(move.positions);
    if (!graph.has(key)) { graph.set(key, move.positions); pending.push(move.positions); }
  }
  return graph;
}
export const baySolved = positions => Boolean(bayOccupancy(positions)) && positions[0] === baySize - 2;
export function cleanBay(raw) {
  if (raw?.edition !== bayEdition || !bayOccupancy(raw.positions) || !bayStates().has(bayKey(raw.positions))) return freshBay();
  return { edition: bayEdition, positions: [...raw.positions] };
}
export function bayMove(raw, piece, to) {
  const data = cleanBay(raw);
  if (baySolved(data.positions)) return null;
  const move = baySlides(data.positions).find(move => move.piece === piece && move.to === to);
  return move ? { edition: bayEdition, positions: move.positions } : null;
}
let distances;
function distanceMap() {
  if (distances) return distances;
  const goals=[...bayStates().values()].filter(baySolved),pending=[...goals];
  distances=new Map(goals.map(p=>[bayKey(p),0]));
  for(let i=0;i<pending.length;i++) for(const m of baySlides(pending[i])) {
    const key=bayKey(m.positions);
    if(!distances.has(key)){distances.set(key,distances.get(bayKey(pending[i]))+1);pending.push(m.positions);}
  }
  return distances;
}
export function solveBay(positions) {
  if (!bayOccupancy(positions) || !bayStates().has(bayKey(positions))) return null;
  const distances=distanceMap(),path=[];let at=positions;
  if(!distances.has(bayKey(at)))return null;
  while(!baySolved(at)) {
    const move=baySlides(at).find(m=>distances.get(bayKey(m.positions))===distances.get(bayKey(at))-1);
    if(!move)return null;
    path.push(move);at=move.positions;
  }
  return path;
}
export function describeBayMove(move) {
  if (!move) return 'The target parcel is at the exit.';
  const p = bayPieces.find(p => p.id === move.piece), delta = move.to - move.from;
  const direction = p.axis === 'H' ? delta < 0 ? 'left' : 'right' : delta < 0 ? 'up' : 'down';
  return `Move ${p.id} ${direction} ${Math.abs(delta)} square${Math.abs(delta) === 1 ? '' : 's'}.`;
}
export function bayHints(positions) {
  const cells = bayOccupancy(positions), path = solveBay(positions) || [];
  if (!cells || !path.length) return ['The target parcel is at the exit.', 'The delivery lane is open.', 'Your parcel can leave.'];
  const blockers = [...new Set(cells.slice(2 * baySize + positions[0] + 2, 3 * baySize).filter(Boolean))];
  return [blockers.length ? `X needs a clear lane to the right. ${blockers.join(' and ')} ${blockers.length === 1 ? 'is' : 'are'} in its way. Think about which empty spaces they need.` : 'The exit lane is clear. Slide X to the far-right edge to deliver it.',
    `From your current position, start by making space with crate ${path[0].piece}. Follow its printed arrows.`,
    describeBayMove(path[0])];
}
export function checkBay(raw) {
  const data = cleanBay(raw);
  return baySolved(data.positions) ? { ok: true, message: 'Delivery complete. You cleared the loading bay and sent X through the exit.' } : { ok: false, message: 'Move the target parcel X to the right-hand exit.' };
}
export const baySolution = positions => (solveBay(positions) || []).map((move, i) => `${i + 1}. ${describeBayMove(move)}`).join(' ') || 'X has reached the exit.';
