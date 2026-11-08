// Original single-round investigation; web, print, solver and explanations share these facts.
export const parcelEdition = 3;
export const parcels = [
  { id: 'A', stamps: 2, pattern: 'stripes', ribbon: 'blue' },
  { id: 'B', stamps: 1, pattern: 'dots', ribbon: 'red' },
  { id: 'C', stamps: 3, pattern: 'dots', ribbon: 'blue' },
  { id: 'D', stamps: 4, pattern: 'stripes', ribbon: 'red' },
];
export const parcelRecipients = ['Ava', 'Ben', 'Cleo', 'Drew'];
export const parcelContents = ['map', 'key', 'clock', 'compass'];
const owner = (state, name) => state.find(p => p.recipient === name);
const content = (state, name) => state.find(p => p.content === name);
export const verifiedParcelRecords = [
  { number: 1, text: 'Ava\u0027s parcel has exactly one more stamp than the parcel holding the map.', test: s => owner(s, 'Ava').stamps === content(s, 'map').stamps + 1 },
  { number: 2, text: 'The clock is in a striped parcel.', test: s => content(s, 'clock').pattern === 'stripes' },
  { number: 3, text: 'Cleo\u0027s parcel is A or C.', test: s => ['A', 'C'].includes(owner(s, 'Cleo').id) },
  { number: 4, text: 'Drew\u0027s parcel holds the key or the clock.', test: s => ['key', 'clock'].includes(owner(s, 'Drew').content) },
];
export const parcelRecords = [
  { number: 1, label: 'I', text: 'Ava\u0027s parcel has a blue ribbon.', test: s => owner(s, 'Ava').ribbon === 'blue' },
  { number: 2, label: 'II', text: 'The map is in parcel B.', test: s => content(s, 'map').id === 'B' },
  { number: 3, label: 'III', text: 'The compass belongs to Cleo.', test: s => content(s, 'compass').recipient === 'Cleo' },
];
export const parcelHints = [
  'Start with the map. Ava\u0027s parcel must have exactly one more stamp. Which map locations are possible?',
  'Try the map in A. That puts Ava in C and Cleo in A. Cleo would hold the map. How many copied notes would then be false?',
  'The map can only be in B, putting Ava in A. Notes I and II are true, so III is false. Now combine Cleo\u0027s possible parcel with the clock and Drew records.',
];
export const parcelSteps = [
  { title: 'The map cannot be in D.', text: 'D has four stamps. Ava would need five stamps, but none of the parcels has five.' },
  { title: 'The map cannot be in C.', text: 'C has three stamps, so Ava would receive D with four. D has a red ribbon: note I would be false. The map would not be in B, so note II would also be false. Two false notes break the rule.' },
  { title: 'The map cannot be in A.', text: 'A has two stamps, so Ava would receive C with three. Cleo can only receive A or C; with C taken, Cleo would receive A and hold the map. Notes II and III would both be false. Again, that breaks the rule.' },
  { title: 'The map is in B, and Ava receives A.', text: 'B has one stamp; Ava needs exactly one more, so Ava receives A. A has a blue ribbon: note I is true. Note II is true too. Exactly one copied note is false, so note III is false: Cleo does not hold the compass.' },
  { title: 'Cleo receives C and holds the key.', text: 'Cleo can only receive A or C, and Ava already has A. C is dotted, so it cannot hold the clock. The map is in B, and the compass does not belong to Cleo. That leaves the key in C.' },
  { title: 'Drew receives D and holds the clock.', text: 'Drew holds the key or clock. Cleo has the key, so Drew has the clock. The clock needs striped wrapping: A or D. Ava has A, so Drew receives D.' },
  { title: 'The compass is in A.', text: 'The map is in B, the key in C and the clock in D. Each item occurs once, leaving the compass in A. The remaining recipient, Ben, receives B.' },
];
const permutations = values => values.length ? values.flatMap((value, i) => permutations(values.filter((_, j) => i !== j)).map(rest => [value, ...rest])) : [[]];
export function enumerateParcels() {
  return permutations(parcelRecipients).flatMap(recipients => permutations(parcelContents).map(items => parcels.map((p, i) => ({ ...p, recipient: recipients[i], content: items[i] }))));
}
export function parcelSolutions({ omitVerified = null, ignoreNotes = false } = {}) {
  return enumerateParcels().filter(state => verifiedParcelRecords.every((record, i) => i === omitVerified || record.test(state)) && (ignoreNotes || parcelRecords.filter(record => !record.test(state)).length === 1));
}
export const parcelSolution = parcelSolutions()[0];
export const parcelAnswer = { selected: parcelSolution.find(p => p.content === 'compass').id, wrongRecord: parcelRecords.find(record => !record.test(parcelSolution)).number };
export const freshParcel = () => ({ edition: parcelEdition, selected: '', wrongRecord: null, excluded: [], notes: '' });
export function cleanParcel(raw) {
  if (raw?.edition !== parcelEdition) return freshParcel();
  const excluded = Array.isArray(raw.excluded) ? [...new Set(raw.excluded.filter(id => parcels.some(p => p.id === id)))] : [];
  return { edition: parcelEdition, selected: parcels.some(p => p.id === raw.selected) && !excluded.includes(raw.selected) ? raw.selected : '', wrongRecord: [1, 2, 3].includes(raw.wrongRecord) ? raw.wrongRecord : null, excluded, notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 1600) : '' };
}
export function checkParcel(raw) {
  const data = cleanParcel(raw);
  if (!data.selected || data.wrongRecord === null) return { ok: false, message: 'Choose the parcel holding the compass and the one false copied note, then check your answer.' };
  if (data.selected !== parcelAnswer.selected || data.wrongRecord !== parcelAnswer.wrongRecord) return { ok: false, message: 'This combination does not fit all four verified records and exactly one false copied note. Check the relationships again.' };
  return { ok: true, message: 'The compass is in parcel A, for Ava. Copied note III is false.' };
}

// Code-native extension of the printable diagram system. Written colour names survive grayscale printing.
export function parcelDrawing(p) {
  const ink = '#153e54';
  let body = `<rect x="5" y="5" width="210" height="122" rx="6" fill="#fbf5e8" stroke="${ink}" stroke-width="2"/>`;
  for (let row = 0; row < 3; row++) for (let n = 0; n < 8; n++) {
    if (p.pattern === 'dots') body += `<circle cx="${18 + n * 26}" cy="${49 + row * 27}" r="3" fill="#8c9ba0"/>`;
    else if (row === 0) body += `<path d="M${18 + n * 26} 40v75" stroke="#8c9ba0" stroke-width="3"/>`;
  }
  body += `<path d="M82 6h26v120H82z" fill="${p.ribbon === 'blue' ? '#316a99' : '#ad3425'}"/>`;
  // Stamp pairs remain countable up to four without crowding the corner.
  for (let s = 0; s < p.stamps; s++) body += `<rect x="${149 + 28 * (s % 2)}" y="${14 + 32 * Math.floor(s / 2)}" width="21" height="25" fill="white" stroke="${ink}" stroke-width="1.5" stroke-dasharray="3 2"/>`;
  body += `<rect x="13" y="12" width="35" height="25" rx="3" fill="white"/><text x="30" y="31" font-family="Arial,sans-serif" font-size="22" font-weight="bold" text-anchor="middle" fill="${ink}">${p.id}</text>`;
  body += `<rect x="135" y="99" width="72" height="21" rx="3" fill="white"/><text x="171" y="114" font-family="Arial,sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="${ink}">${p.ribbon.toUpperCase()}</text>`;
  return body;
}
export function parcelSvg(id) {
  const parcel = parcels.find(p => p.id === id);
  return parcel ? `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="132" viewBox="0 0 220 132">${parcelDrawing(parcel)}</svg>` : '';
}
export function parcelSheetSvg() {
  const body = parcels.map((p, i) => `<g transform="translate(${5 + i * 134} 5)"><g transform="scale(.58)">${parcelDrawing(p)}</g><text x="64" y="100" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#153e54">${p.stamps} ${p.stamps === 1 ? 'stamp' : 'stamps'}</text><text x="64" y="120" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#153e54">${p.pattern}</text><text x="64" y="140" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#153e54">${p.ribbon} ribbon</text></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="160" viewBox="0 0 540 160">${body}</svg>`;
}
