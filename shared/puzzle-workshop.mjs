import { freshForest,cleanForest,checkForest,forestEdition } from './forest-loop.mjs';
import { freshParcel, cleanParcel, checkParcel, parcelEdition, parcelSvg } from './parcel-evidence.mjs';
import { freshBay, cleanBay, checkBay, bayEdition } from './loading-bay.mjs';
import { freshMoon, cleanMoon, checkMoon, moonEdition } from './moon-signal.mjs';
import { freePuzzles, trailGrid, trailMoves, harbourBridges } from './free-puzzles.mjs';
import { stampEdition, stampLabels, inspectStampMatches, postalWords, inspectPostalRoute, linkedPostalPair } from './stamp-investigation.mjs';

export const workshopKey = 'paw-free-puzzle-workshop-v2';
export const workshopVersion = 2;
export const puzzleIds = freePuzzles.map(p => p.id);
export const parcelPicture = parcelSvg;
export const initialData = id => ({
  'stamp-code': { edition: stampEdition, matches: ['', '', '', ''], verified: false, route: ['', '', '', '', ''], pair: [], notes: ['', '', '', ''], readClues: [] },
  'signal-shift': freshMoon(),
  'parcel-queue': freshBay(),
  'shared-parcel': freshParcel(),
  'forest-trail': freshForest(),
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
  if (id === 'shared-parcel') return cleanParcel(d);
  if (id === 'forest-trail') return cleanForest(d);
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
  if (id === 'shared-parcel') return checkParcel(d);
  if (id === 'forest-trail') return checkForest(d);
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
export function freshItem(id) { return { data: initialData(id), history: [], hints: 0, viewed: false, completion: null, attempted: false, ...(id === 'forest-trail' ? {redo:[],legacyForestCompletion:null,startedAt:null,finishedAt:null} : {}), ...(id === 'stamp-code' ? { routeHints: 0, legacyCompletion: null } : {}) }; }
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
    if (id === 'forest-trail') {
      item.legacyForestCompletion = ['independent','hint','solution'].includes(source.legacyForestCompletion) ? source.legacyForestCompletion : null;
      if(source.data?.edition !== forestEdition) {
        item.legacyForestCompletion = ['independent','hint','solution'].includes(source.completion) ? source.completion : item.legacyForestCompletion;
        continue;
      }
      item.startedAt = Number.isFinite(source.startedAt) && source.startedAt > 0 && source.startedAt <= Date.now() ? source.startedAt : null;
      item.finishedAt = Number.isFinite(source.finishedAt) && source.finishedAt >= item.startedAt && source.finishedAt <= Date.now() && source.completion ? source.finishedAt : null;
      item.redo = Array.isArray(source.redo) ? source.redo.slice(-128).map(cleanForest) : [];
    }

    if (id === 'shared-parcel' && source.data?.edition !== parcelEdition) {
      item.legacyParcelCompletion = ['independent', 'hint', 'solution'].includes(source.completion) ? source.completion : ['independent', 'hint', 'solution'].includes(source.legacyParcelCompletion) ? source.legacyParcelCompletion : null;
      continue;
    }
    if (id === 'shared-parcel' && ['independent', 'hint', 'solution'].includes(source.legacyParcelCompletion)) item.legacyParcelCompletion = source.legacyParcelCompletion;

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
    item.history = Array.isArray(source.history) ? source.history.slice(id === 'forest-trail' ? -128 : -32).map(d => cleanData(id, d)) : [];
    item.hints = Number.isInteger(source.hints) ? Math.max(0, Math.min(3, source.hints)) : 0;
    item.viewed = source.viewed === true;
    item.attempted = source.attempted === true;
    if (source.completion && checkWorkshop(id, item.data).ok) item.completion = item.viewed ? 'solution' : (item.hints || item.routeHints) ? 'hint' : 'independent';
  }
  return state;
}
export function changeData(item, id, data) {
  return { ...item, data: cleanData(id, data), history: [...item.history, item.data].slice(id === 'forest-trail' ? -128 : -32), ...(id === 'forest-trail' ? {redo:[]} : {}), completion: null };
}
export function undoItem(item) {
  return item.history.length ? { ...item, data: item.history.at(-1), history: item.history.slice(0, -1), completion: null } : item;
}
