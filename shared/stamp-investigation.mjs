// One authored investigation shared by the browser, print diagram and solver tests.
export const stampEdition = 4;
export const stampRecords = [
  { id: 'A', shapes: ['diamond', 'triangle', 'star', 'cross'] },
  { id: 'B', shapes: ['cross', 'triangle', 'diamond', 'star'] },
  { id: 'C', shapes: ['star', 'triangle', 'cross'] },
  { id: 'D', shapes: ['circle', 'triangle', 'square'] },
];
export const stampLabels = [
  { word: 'PALM', meaning: 'a palm tree' },
  { word: 'OAK', meaning: 'an oak tree' },
  { word: 'LAMP', meaning: 'a light' },
  { word: 'MAP', meaning: 'a drawing of places' },
];
export const stampShapeNames = ['circle', 'triangle', 'square', 'diamond', 'star', 'cross'];
export const stampLetters = ['O', 'A', 'K', 'L', 'M', 'P'];
export const stampRules = [
  'The same shape always means the same letter. Different shapes mean different letters.',
  'Use each loose label exactly once. Read each record from left to right.',
];
export function inspectStampMatches(matches) {
  if (!Array.isArray(matches) || matches.length !== stampRecords.length) return { ok: false, message: 'Give each of the four records one label before checking.' };
  if (matches.some(word => !stampLabels.some(label => label.word === word))) return { ok: false, message: 'Give each of the four records one label before checking.' };
  if (new Set(matches).size !== 4) return { ok: false, message: 'Each loose label can be used only once. Review the labels on your records.' };
  const key = {}, reverse = {};
  for (let row = 0; row < stampRecords.length; row++) {
    const record = stampRecords[row], word = matches[row];
    if (record.shapes.length !== word.length) return { ok: false, message: `Record ${record.id} has ${record.shapes.length} shapes. Its label needs the same number of letters.` };
    for (let column = 0; column < word.length; column++) {
      const shape = record.shapes[column], letter = word[column];
      if (key[shape] && key[shape] !== letter) return { ok: false, message: `The ${shape} has different letters in your records. Compare the records that share this shape.` };
      if (reverse[letter] && reverse[letter] !== shape) return { ok: false, message: 'Two different shapes have the same letter in your records. Recheck your hypothesis.' };
      key[shape] = letter; reverse[letter] = shape;
    }
  }
  return { ok: true, key, message: 'All four records agree. You restored the key. Use the key to investigate the missing delivery route.' };
}

// Bank order is deliberately different from the answer.
export const postalStops = [
  { word: 'LOOM', place: 'Weaving room' }, { word: 'POOL', place: 'Swimming pool' },
  { word: 'OAK', place: 'Old oak tree' }, { word: 'PALM', place: 'Palm garden' },
  { word: 'MALL', place: 'Shopping arcade' },
];
export const postalWords = postalStops.map(stop => stop.word);
export const postalClues = [
  { parts: [{ word: 'MALL' }, ' was visited before ', { word: 'PALM' }, ', but not necessarily immediately before it.'] },
  { parts: ['Exactly one stop was between PALM and POOL. Either could come first.'] },
  { parts: ['Immediately after ', { word: 'POOL' }, ', the courier visited ', { word: 'LOOM' }, '.'] },
  { parts: ['OAK and MALL were next to each other. Either could come first.'] },
  { parts: ['POOL was not the stop immediately after OAK.'] },
];
export const postalClueText = clue => clue.parts.map(part => typeof part === 'string' ? part : part.word).join('');
export const postalTests = [
  p => p.MALL < p.PALM,
  p => Math.abs(p.PALM - p.POOL) === 2,
  p => p.LOOM === p.POOL + 1,
  p => Math.abs(p.OAK - p.MALL) === 1,
  p => p.POOL !== p.OAK + 1,
];
export function inspectPostalRoute(route) {
  if (!Array.isArray(route) || route.length !== 5 || route.some(word => !postalWords.includes(word)) || new Set(route).size !== 5) return { ok: false, message: 'Place all five different stops on the route, using each once.' };
  const positions = Object.fromEntries(route.map((word, index) => [word, index]));
  const broken = postalTests.findIndex(test => !test(positions));
  return broken < 0 ? { ok: true, destination: route.at(-1) } : { ok: false, clue: broken + 1, message: `Your route does not satisfy record ${broken + 1}. Compare it with that record; no positions have been marked correct.` };
}
export function linkedPostalPair(route, pair) {
  return Array.isArray(pair) && pair.length === 2 && pair[0] !== pair[1] && pair.every(word => postalWords.includes(word)) && route.indexOf(pair[0]) >= 0 && route.indexOf(pair[1]) === route.indexOf(pair[0]) + 1;
}
export function movePostalStop(route, word, target, pair = []) {
  if (!postalWords.includes(word) || !Number.isInteger(target) || target < 0 || target > 4) return [...route];
  if (pair.includes(word) && linkedPostalPair(route, pair)) {
    const rest = route.filter(stop => !pair.includes(stop));
    rest.splice(Math.min(target, 3), 0, ...pair);
    return rest;
  }
  const next = [...route], from = next.indexOf(word);
  if (from >= 0) next[from] = next[target];
  next[target] = word;
  return next;
}
