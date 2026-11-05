// Original printable adventure. This module is shared by play, PDFs and tests.
export const lighthouse = Object.freeze({
  id: 'sleeping-lighthouse', version: 1, title: 'The Sleeping Lighthouse',
  hub: '/en/escape-room-games/', path: '/en/escape-room-games/the-sleeping-lighthouse/',
  play: '/en/escape-room-games/the-sleeping-lighthouse/play/',
  storageKey: 'paw-sleeping-lighthouse-v1',
  opening: 'The paper-boat festival is about to begin, but the old lighthouse is dark. Keeper Mara has left her journal, a power board and a cabinet of paper lenses. Can your team restore the light before the first lanterns drift into the bay?',
  ending: 'A warm beam sweeps across the bay. One by one, the paper boats catch its light, and the harbour fills with tiny floating lanterns. Mara waves from the quay: “You did more than find a code. You put every discovery together. The lighthouse is awake, and the festival can begin!”',
});
export const lighthouseArt = Object.freeze({
  coast: '/assets/lighthouse/coast.webp', desk: '/assets/lighthouse/desk.webp',
  power: '/assets/lighthouse/power.webp', lens: '/assets/lighthouse/lens.webp',
});
export const lighthouseLogs = Object.freeze([
  { id: 'R', text: 'After the WAVE module is steady, connect the LEAF module last.' },
  { id: 'K', text: 'Only after all three modules are connected may you turn the lens.' },
  { id: 'T', text: 'When the evening shift begins, connect the STAR module first.' },
  { id: 'M', text: 'Once the STAR module is connected, connect the WAVE module.' },
]);
export const lighthouseModules = Object.freeze([
  { symbol: 'wave', value: 6 }, { symbol: 'leaf', value: 7 }, { symbol: 'star', value: 9 },
  { symbol: 'star', value: 4 }, { symbol: 'leaf', value: 3 }, { symbol: 'wave', value: 2 },
]);
export const lighthouseSequence = ['star', 'wave', 'leaf'];
export const lensGrid = [['moon', 'leaf', 'star'], ['sun', 'moon', 'wave'], ['wave', 'leaf', 'sun']];
export const lensWindows = [[0, 0], [0, 1], [1, 2]];
export const lensDirections = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
export function lensReadings(turns) {
  let windows = lensWindows.map(p => [...p]);
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) windows = windows.map(([r, c]) => [c, 2 - r]);
  return windows.map(([r, c]) => lensGrid[r][c]);
}
export const lighthouseStages = Object.freeze([
  {
    id: 'journal', number: '01', title: 'Mend the keeper’s journal', room: 'THE KEEPER’S DESK', art: 'desk', pages: 'Player page 2',
    intro: 'The journal has come apart. Four strips describe one evening’s startup. Put the events back in order before touching the power board.',
    task: 'Arrange the four strips from first to last. Enter their corner letters in that order.',
    format: 'Four strip letters, for example ABCD', answer: 'TMRK',
    hints: ['Look for the strip that says what happens first, and the one that must wait until all three modules are connected.', 'The first action connects STAR. The next strip starts with “Once the STAR module is connected”.', 'The events are STAR first, then WAVE, then LEAF, and finally the lens. Match each event to its strip letter.'],
    solution: 'T starts the shift with STAR. M follows STAR with WAVE. R connects LEAF after WAVE. K waits until all three modules are connected before the lens turns. The strip order is T, M, R, K.',
    discovery: 'Startup order: STAR → WAVE → LEAF.',
    consequence: 'The journal is back together. You know the order of the power-board slots. Take that record downstairs to the repair room.',
  },
  {
    id: 'power', number: '02', title: 'Rebuild the power board', room: 'THE REPAIR ROOM', art: 'power', pages: 'Player pages 3–4',
    intro: 'The cabinet has three empty slots and six loose modules. Mara’s board needs exactly the right amount of energy to open the lens cabinet.',
    task: 'Choose one STAR, one WAVE and one LEAF module. Put them in the journal’s startup order. Their values must total 13, and LEAF must have more energy than WAVE.',
    format: 'Three energy digits in startup order', answer: '427',
    hints: ['Use one module of each symbol. Keep the startup order from the journal; do not sort by the numbers.', 'There are two combinations that total 13. Compare LEAF with WAVE in each combination.', 'STAR 4 + WAVE 6 + LEAF 3 totals 13 but fails the comparison. Find the other total of 13.'],
    solution: 'The only valid selection is STAR 4, WAVE 2 and LEAF 7: 4 + 2 + 7 = 13 and 7 > 2. The journal puts them in STAR–WAVE–LEAF order, so enter 427.',
    discovery: 'Powered modules: STAR 4 · WAVE 2 · LEAF 7.',
    consequence: 'The three indicators glow and the lens cabinet clicks open. Keep the module values: they belong to the final startup sequence too.',
  },
  {
    id: 'lens', number: '03', title: 'Align the paper lens', room: 'THE OBSERVATION ROOM', art: 'lens', pages: 'Player pages 5–6',
    intro: 'A paper lens has three numbered windows. Turn it over the symbol board until the view repeats the journal’s startup order.',
    task: 'Keep the square frame aligned with the board. Turn the lens a quarter-turn at a time. Read windows 1, 2 and 3; they must show STAR, WAVE, LEAF. Where does the lens arrow point?',
    format: 'NORTH, EAST, SOUTH or WEST', answer: 'EAST',
    hints: ['Keep the lens on the same side, without flipping it over. Align the square edges after each quarter-turn.', 'Read by window number, not from the top-left of the page. You are looking for STAR, then WAVE, then LEAF.', 'Starting with the arrow at NORTH, turn it one quarter-turn clockwise. Read the three numbered windows again.'],
    solution: 'At EAST, window 1 shows STAR, window 2 WAVE and window 3 LEAF. No other quarter-turn gives that sequence. Keep the lens pointing EAST.',
    discovery: 'Lens direction: EAST.',
    consequence: 'The lantern focuses into a small bright point. The final console is ready. Bring all three discoveries to the top of the tower.',
  },
  {
    id: 'finale', number: '04', title: 'Wake the lighthouse', room: 'THE STARTUP CONSOLE', art: 'coast', pages: 'Player page 7',
    intro: 'Everything is repaired. The console needs the lens direction and the three module values in the right order. This is where your discoveries work together.',
    task: 'Set the lens direction. Then enter the energy values in the journal’s startup order and start the beacon.',
    format: 'A direction and a three-digit startup sequence', answer: 'EAST + 427',
    hints: ['Open your findings. You need information from the journal, the power board and the lens.', 'Use the lens direction from the observation room. Turn the journal’s three symbols into their powered module values.', 'Set EAST. Read STAR 4, WAVE 2, LEAF 7 in journal order. Enter those three digits, then start the beacon.'],
    solution: 'Set EAST and enter 427. The journal supplies the symbol order, the power board supplies the values, and the paper lens supplies the direction. All three discoveries are needed.',
    discovery: 'The Sleeping Lighthouse is awake.', consequence: lighthouse.ending,
  },
]);

const clean = value => typeof value === 'string' ? value.trim().toUpperCase().replace(/[\s-]+/g, '') : '';
const direction = value => ({ N: 'NORTH', E: 'EAST', S: 'SOUTH', W: 'WEST' })[clean(value)] || clean(value);
export function checkLighthouseAnswer(stage, input) {
  if (!Number.isInteger(stage) || stage < 0 || stage > 3) return false;
  if (stage === 3) return Boolean(input && typeof input === 'object' && direction(input.direction) === 'EAST' && clean(input.code) === '427');
  return (stage === 2 ? direction(input) : clean(input)) === lighthouseStages[stage].answer;
}
export function freshLighthouseProgress() {
  return { version: lighthouse.version, started: false, completed: 0, hints: [0, 0, 0, 0], viewed: [false, false, false, false] };
}
export function restoreLighthouseProgress(value) {
  if (!value || typeof value !== 'object' || value.version !== lighthouse.version || !Number.isInteger(value.completed) || value.completed < 0 || value.completed > 4) return freshLighthouseProgress();
  return { version: lighthouse.version, started: value.started === true || value.completed > 0, completed: value.completed,
    hints: [0, 1, 2, 3].map(i => Number.isInteger(value.hints?.[i]) ? Math.max(0, Math.min(3, value.hints[i])) : 0),
    viewed: [0, 1, 2, 3].map(i => value.viewed?.[i] === true) };
}
export function completeLighthouseStage(progress, stage, input) {
  const safe = restoreLighthouseProgress(progress);
  if (stage !== safe.completed || !checkLighthouseAnswer(stage, input)) return { progress: safe, ok: false };
  return { progress: { ...safe, started: true, completed: safe.completed + 1 }, ok: true };
}
export function lighthousePdfPath(paper, role) {
  return ['A4', 'Letter'].includes(paper) && ['players', 'guide'].includes(role) ? `/assets/lighthouse/sleeping-lighthouse-${paper}-${role}.pdf` : null;
}

const ink = '#153e54', pale = '#edf5f5', coral = '#ad3425';
const txt = (x, y, value, size = 16, attrs = '') => `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${size}" fill="${ink}" ${attrs}>${value}</text>`;
export function lighthouseSymbol(name, x, y, size = 20, colour = ink) {
  const style = `fill="none" stroke="${colour}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"`;
  const shapes = {
    star: `<path d="M0 -17L5 -6 17 -5 8 4 10 16 0 10 -10 16 -8 4 -17 -5 -5 -6Z" ${style}/>`,
    wave: `<path d="M-18 -8Q-9 -18 0 -8T18 -8M-18 2Q-9 -8 0 2T18 2M-18 12Q-9 2 0 12T18 12" ${style}/>`,
    leaf: `<path d="M-13 14Q-22 -12 16 -17Q22 12 -13 14ZM-13 14L10 -9" ${style}/>`,
    moon: `<path d="M7 -17A18 18 0 1 0 15 12A19 19 0 0 1 7 -17Z" ${style}/>`,
    sun: `<circle r="9" ${style}/><path d="M0 -21V-15M0 15V21M-21 0H-15M15 0H21M-15 -15L-11 -11M11 11L15 15M-15 15L-11 11M11 -11L15 -15" ${style}/>`,
  };
  return `<g transform="translate(${x} ${y}) scale(${size / 20})">${shapes[name] || ''}</g>`;
}
const svg = (body, w = 540, h = 360) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
export function lighthouseModuleSvg(module) {
  let body = `<rect x="12" y="12" width="156" height="126" rx="10" fill="white" stroke="${ink}" stroke-width="2"/><path d="M42 138v13M90 138v13M138 138v13" stroke="${ink}" stroke-width="5"/>`;
  body += lighthouseSymbol(module.symbol, 45, 47, 21) + txt(115, 60, module.value, 39, 'text-anchor="middle" font-weight="bold"');
  body += txt(90, 91, module.symbol.toUpperCase(), 17, 'text-anchor="middle" font-weight="bold"');
  for (let n = 0; n < module.value; n++) body += `<rect x="${26 + n * 14}" y="108" width="10" height="13" rx="2" fill="${ink}"/>`;
  return svg(body, 180, 160);
}
export function lighthousePowerSvg() {
  let body = `<rect x="15" y="15" width="510" height="330" rx="14" fill="${pale}" stroke="${ink}" stroke-width="2"/>${txt(270, 48, 'LIGHTHOUSE POWER BOARD', 19, 'text-anchor="middle" font-weight="bold"')}`;
  for (let i = 0; i < 3; i++) body += `<rect x="${40 + i * 170}" y="78" width="120" height="143" rx="9" fill="white" stroke="${ink}" stroke-dasharray="6 4"/>${txt(100 + i * 170, 114, 'SLOT ' + (i + 1), 15, 'text-anchor="middle"')}${txt(100 + i * 170, 185, '?', 42, 'text-anchor="middle"')}`;
  body += txt(270, 257, 'Use the journal’s symbol order.', 17, 'text-anchor="middle"');
  body += txt(270, 289, 'Total energy = 13', 20, 'text-anchor="middle" font-weight="bold"');
  body += txt(270, 320, 'LEAF energy must be greater than WAVE.', 16, 'text-anchor="middle"');
  return svg(body);
}
export function lighthouseLensBoardSvg() {
  let body = txt(210, 27, 'NORTH', 15, 'text-anchor="middle" font-weight="bold"') + txt(210, 402, 'SOUTH', 15, 'text-anchor="middle" font-weight="bold"') + txt(20, 215, 'W', 19, 'text-anchor="middle" font-weight="bold"') + txt(400, 215, 'E', 19, 'text-anchor="middle" font-weight="bold"');
  lensGrid.forEach((row, r) => row.forEach((name, c) => { body += `<rect x="${60 + c * 100}" y="${60 + r * 100}" width="100" height="100" fill="white" stroke="#779eaa"/>${lighthouseSymbol(name, 110 + c * 100, 110 + r * 100, 25)}`; }));
  body += `<rect x="60" y="60" width="300" height="300" fill="none" stroke="${ink}" stroke-width="3"/>`;
  return svg(body, 420, 420);
}
export function lighthouseLensMaskSvg() {
  let body = `<rect x="60" y="60" width="300" height="300" fill="${pale}" stroke="${ink}" stroke-width="2" stroke-dasharray="5 4"/><path d="M210 178L198 195H222ZM210 195V218" fill="${coral}" stroke="${coral}" stroke-width="3"/>${txt(210, 241, 'ARROW', 10, 'text-anchor="middle"')}${txt(210, 383, 'CUT THE OUTER SQUARE AND THREE WINDOWS', 11, 'text-anchor="middle"')}`;
  lensWindows.forEach(([r, c], i) => { body += `<rect x="${78 + c * 100}" y="${78 + r * 100}" width="64" height="64" fill="white" stroke="${ink}" stroke-dasharray="4 3"/>${txt(110 + c * 100, 74 + r * 100, i + 1, 13, 'text-anchor="middle" font-weight="bold"')}${txt(110 + c * 100, 111 + r * 100, 'CUT OUT', 8, 'text-anchor="middle"')}`; });
  return svg(body, 420, 420);
}
export function lighthouseLensPreviewSvg(turns = 0) {
  const rotation = ((turns % 4) + 4) % 4;
  let windows = lensWindows.map(p => [...p]);
  for (let i = 0; i < rotation; i++) windows = windows.map(([r, c]) => [c, 2 - r]);
  const holes = windows.map(([r, c]) => `<rect x="${78 + c * 100}" y="${78 + r * 100}" width="64" height="64" fill="black"/>`).join('');
  const numbers = windows.map(([r, c], i) => txt(110 + c * 100, 74 + r * 100, i + 1, 13, 'text-anchor="middle" font-weight="bold"').replace(`fill="${ink}"`, 'fill="white"')).join('');
  const board = lighthouseLensBoardSvg().replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return svg(`${board}<defs><mask id="lighthouse-lens-holes"><rect x="60" y="60" width="300" height="300" fill="white"/>${holes}</mask></defs><rect x="60" y="60" width="300" height="300" fill="${ink}" mask="url(#lighthouse-lens-holes)"/>${numbers}<g transform="rotate(${rotation * 90} 210 210)"><path d="M210 178L198 195H222ZM210 195V225" fill="#f4bb68" stroke="#f4bb68" stroke-width="3"/></g>`, 420, 420);
}
