import { freshBay, cleanBay, checkBay, bayEdition } from './loading-bay.mjs';
import { freshMoon, cleanMoon, checkMoon, moonEdition } from './moon-signal.mjs';
import { freePuzzles, parcels, trailGrid, trailMoves, harbourBridges, puzzleSvg } from './free-puzzles.mjs';
import { stampEdition, stampLabels, inspectStampMatches, postalWords, inspectPostalRoute, linkedPostalPair } from './stamp-investigation.mjs';

export const workshopKey = 'paw-free-puzzle-workshop-v2';
export const workshopVersion = 2;
export const puzzleIds = freePuzzles.map(p => p.id);
// Crop the original fixed printable diagram: same shapes, patterns and stamp counts.
export function parcelPicture(id) {
  const index = parcels.findIndex(p => p.id === id);
  if (index < 0) return '';
  const x = 34 + index % 2 * 258, y = 16 + Math.floor(index / 2) * 170;
  return puzzleSvg('shared-parcel').replace('width="540" height="350" viewBox="0 0 540 350"', `width="216" height="147" viewBox="${x} ${y} 216 147"`);
}
export const initialData = id => ({
  'stamp-code': { edition: stampEdition, matches: ['', '', '', ''], verified: false, route: ['', '', '', '', ''], pair: [], notes: ['', '', '', ''], readClues: [] },
  'signal-shift': freshMoon(),
  'parcel-queue': freshBay(),
  'shared-parcel': { excluded: [], selected: '', evidence: [] },
  'forest-trail': { moves: [] },
  'harbour-route': { path: ['dock'] },
}[id]);
const letters = (v, max) => typeof v === 'string' ? v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, max) : '';
const subset = (v, allowed) => Array.isArray(v) ? [...new Set(v.filter(x => allowed.includes(x)))] : [];
export function trailInfo(moves) {
  let x = 0, y = 0;
  const visited = [{ x, y }], found = [];
  for (const direction of moves) {
    const delta = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[direction];
    if (!delta) return null;
    x += delta[0]; y += delta[1];
    if (!trailGrid[y]?.[x]) return null;
    visited.push({ x, y }); found.push(trailGrid[y][x]);
  }
  return { x, y, visited, letters: found.join('') };
}
export function bridgeBetween(a, b) { return harbourBridges.find(([x, y]) => x === a && y === b || x === b && y === a); }
export function harbourInfo(path) {
  if (!Array.isArray(path) || path[0] !== 'dock' || path.length > 13) return null;
  let code = '';
  for (let i = 1; i < path.length; i++) {
    const bridge = bridgeBetween(path[i - 1], path[i]);
    if (!bridge) return null;
    code += bridge[2];
  }
  return { code, current: path.at(-1), bridges: path.length - 1 };
}
export function cleanData(id, raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  if (id === 'stamp-code') {
    if (![3, stampEdition].includes(d.edition)) return initialData(id);
    const matches = [0, 1, 2, 3].map(i => stampLabels.some(label => label.word === d.matches?.[i]) ? d.matches[i] : '');
    const used = new Set();
    const route = [0, 1, 2, 3, 4].map(i => { const word = d.edition === stampEdition ? d.route?.[i] : ''; if (!postalWords.includes(word) || used.has(word)) return ''; used.add(word); return word; });
    return { edition: stampEdition, matches, verified: d.verified === true && inspectStampMatches(matches).ok,
      route, pair: linkedPostalPair(route, d.pair) ? [...d.pair] : [], notes: [0, 1, 2, 3].map(i => letters(d.notes?.[i], 4)), readClues: subset(d.readClues, [0, 1, 2, 3, 4]) };

  }
  if (id === 'signal-shift') return cleanMoon(d);
  if (id === 'parcel-queue') return cleanBay(d);
  if (id === 'shared-parcel') return { excluded: subset(d.excluded, ['A', 'B', 'C', 'D']), selected: ['A', 'B', 'C', 'D'].includes(d.selected) ? d.selected : '', evidence: subset(d.evidence, [0, 1, 2]) };
  if (id === 'forest-trail') { const moves = Array.isArray(d.moves) ? d.moves.slice(0, 6) : []; return { moves: trailInfo(moves) ? [...moves] : [] }; }
  if (id === 'harbour-route') return { path: harbourInfo(d.path) ? [...d.path] : ['dock'] };
  return null;
}
const no = message => ({ ok: false, message });
export function checkWorkshop(id, raw) {
  const d = cleanData(id, raw);
  if (!d) return no('Choose a puzzle first.');
  if (id === 'stamp-code') {
    const records = inspectStampMatches(d.matches);
    if (!records.ok) return records;
    if (!d.verified) return no('Check your record matches before starting the delivery route.');
    const route = inspectPostalRoute(d.route);
    if (!route.ok) return route;
  }
  if (id === 'signal-shift') return checkMoon(d);
  if (id === 'parcel-queue') return checkBay(d);
  if (id === 'shared-parcel') {
    if (!d.selected) return no('Choose a parcel after comparing the clues.');
    if (d.excluded.includes(d.selected)) return no('Your chosen parcel is also marked excluded. Review that decision first.');
    const p = parcels.find(x => x.id === d.selected);
    if (p.pattern !== 'stripes') return no('Compare the chosen wrapping with helper 1’s clue.');
    if (p.seal !== 'triangle') return no('Compare the chosen seal with helper 2’s clue.');
    if (p.stamps !== 2) return no('Count the chosen parcel’s stamps again using helper 3’s clue.');
    if (d.evidence.length !== 3) return no('Confirm how your chosen parcel matches each of the three helper clues.');
  }
  if (id === 'forest-trail') {
    if (d.moves.length !== 6) return no('Complete six moves, collecting one letter after each move.');
    const firstWrong = d.moves.findIndex((x, i) => x !== trailMoves[i]);
    if (firstWrong !== -1) return no(`Recheck direction ${firstWrong + 1}. Use Undo to return to that part of the trail.`);
    if (trailInfo(d.moves).letters !== freePuzzles.find(p => p.id === id).answer) return no('Recheck the letters collected after each move.');
  }
  if (id === 'harbour-route') {
    const route = harbourInfo(d.path);
    if (route.current !== 'beacon') return no('Your route must finish at BEACON.');
    if (route.bridges !== 3) return no('This crossing does not use exactly three bridges. Undo and compare the rules.');
    if (d.path.includes('mill')) return no('This route visits MILL, which the instructions forbid.');
    if (new Set(d.path).size !== d.path.length) return no('This route returns to a place already visited.');
    if (!d.path.includes('bell')) return no('This route misses the required stop at BELL.');
  }
  return { ok: true, message: freePuzzles.find(p => p.id === id).payoff };
}
export function freshItem(id) { return { data: initialData(id), history: [], hints: 0, viewed: false, completion: null, attempted: false, ...(id === 'stamp-code' ? { routeHints: 0, legacyCompletion: null } : {}) }; }
export function freshWorkshop() { return { version: workshopVersion, active: puzzleIds[0], items: Object.fromEntries(puzzleIds.map(id => [id, freshItem(id)])) }; }
export function restoreWorkshop(raw) {
  const state = freshWorkshop();
  if (!raw || raw.version !== workshopVersion) return state;
  state.active = puzzleIds.includes(raw.active) ? raw.active : state.active;
  for (const id of puzzleIds) {
    const source = raw.items?.[id];
    if (!source || typeof source !== 'object') continue;
    // Edition 3 keeps its archive/key; its old POOL completion is separate.
    // Older direct OAK lookup saves reset only this puzzle.
    if (id === 'stamp-code' && ![3, stampEdition].includes(source.data?.edition)) continue;
    const item = state.items[id];
    if (id === 'parcel-queue' && source.data?.edition !== bayEdition) {
      item.legacyBayCompletion = ['independent','hint','solution'].includes(source.completion) ? source.completion : null;
      continue;
    }
    if (id === 'parcel-queue' && ['independent','hint','solution'].includes(source.legacyBayCompletion)) item.legacyBayCompletion = source.legacyBayCompletion;
    if (id === 'signal-shift' && ![3, moonEdition].includes(source.data?.edition)) {
      item.legacySignalCompletion = ['independent','hint','solution'].includes(source.completion) ? source.completion : null;
      continue;
    }
    if (id === 'signal-shift') item.legacySignalCompletion = ['independent','hint','solution'].includes(source.legacySignalCompletion) ? source.legacySignalCompletion : null;
    item.data = cleanData(id, source.data);
    if (id === 'stamp-code') {
      const legacy = source.data?.edition === 3 ? { edition: 3, completion: source.data.verified && Array.isArray(source.data.letters) && inspectStampMatches(source.data.matches).ok && source.data.letters?.join('') === 'POOL' ? source.completion : null } : source.legacyCompletion;
      item.legacyCompletion = legacy?.edition === 3 && ['independent', 'hint', 'solution'].includes(legacy.completion) ? { edition: 3, completion: legacy.completion } : null;
      item.routeHints = source.data?.edition === stampEdition && Number.isInteger(source.routeHints) ? Math.max(0, Math.min(3, source.routeHints)) : 0;
    }
    item.history = Array.isArray(source.history) ? source.history.slice(-32).map(d => cleanData(id, d)) : [];
    item.hints = Number.isInteger(source.hints) ? Math.max(0, Math.min(3, source.hints)) : 0;
    item.viewed = source.viewed === true;
    item.attempted = source.attempted === true;
    if (source.completion && checkWorkshop(id, item.data).ok) item.completion = item.viewed ? 'solution' : (item.hints || item.routeHints) ? 'hint' : 'independent';
  }
  return state;
}
export function changeData(item, id, data) {
  return { ...item, data: cleanData(id, data), history: [...item.history, item.data].slice(-32), completion: null };
}
export function undoItem(item) {
  return item.history.length ? { ...item, data: item.history.at(-1), history: item.history.slice(0, -1), completion: null } : item;
}
