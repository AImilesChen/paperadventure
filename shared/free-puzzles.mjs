// Original Paper Adventure puzzles. Shared by the website, PDF builder and solvers.
// Design references (no upstream runtime copied): content/free-puzzles-design.md.
export const puzzlePath = '/en/escape-room-puzzles/';
export const puzzleCategories = Object.freeze({ code: 'Codes', logic: 'Logic', route: 'Routes' });
export const parcelOrder = ['SUN', 'LEAF', 'STAR', 'MOON'];
export const parcels = [
  { id: 'A', pattern: 'stripes', seal: 'triangle', stamps: 1 },
  { id: 'B', pattern: 'dots', seal: 'triangle', stamps: 2 },
  { id: 'C', pattern: 'stripes', seal: 'triangle', stamps: 2 },
  { id: 'D', pattern: 'stripes', seal: 'circle', stamps: 2 },
];
export const trailGrid = [['S', 'B', 'R', 'F'], ['H', 'D', 'I', 'A'], ['N', 'G', 'E', 'T'], ['L', 'P', 'U', 'M']];
export const trailMoves = ['E', 'E', 'S', 'W', 'S', 'E'];
export const harbourNodes = [
  { id: 'dock', label: 'DOCK', x: 45, y: 166 },
  { id: 'oak', label: 'OAK', x: 165, y: 70 },
  { id: 'mill', label: 'MILL', x: 165, y: 263 },
  { id: 'bell', label: 'BELL', x: 350, y: 70 },
  { id: 'pine', label: 'PINE', x: 350, y: 263 },
  { id: 'beacon', label: 'BEACON', x: 490, y: 166 },
];
export const harbourBridges = [
  ['dock', 'oak', '2'], ['dock', 'mill', '6'], ['oak', 'bell', '5'],
  ['oak', 'pine', '4'], ['mill', 'pine', '3'],
  ['bell', 'beacon', '8'], ['pine', 'beacon', '9'],
];
export const stampKey = [['circle', 'O'], ['triangle', 'A'], ['square', 'K'], ['diamond', 'L'], ['star', 'M'], ['cross', 'P']];

export const freePuzzles = Object.freeze([
  {
    id: 'stamp-code', number: '01', category: 'code', level: 'Start here', title: 'The secret stamp',
    story: 'A travelling post office has one parcel without an address. Its three stamps name the tree where it belongs.',
    task: 'Use the stamp key. Read the three large symbols from left to right. Which tree is the delivery point?',
    format: 'A three-letter word', answer: 'OAK',
    transcript: 'Key: circle = O; triangle = A; square = K; diamond = L; star = M; cross = P. Message: circle, triangle, square.',
    hints: ['Each shape stands for one letter. All the letters you need are in the key.', 'Match the circle first, then the triangle, then the square.', 'Write the three matching letters in the same order as the large stamps.'],
    solution: 'The circle gives O, the triangle A and the square K. Together they spell OAK: the parcel belongs at the oak tree.',
    payoff: 'The parcel finally has a delivery point: the oak tree.',
  },
  {
    id: 'signal-shift', number: '02', category: 'code', level: 'One more step', title: 'The moon-station message',
    story: 'The moon station has sent a short message. Every original letter was moved three places forward in the alphabet.',
    task: 'Decode the message using the two alphabet rows. Which colour star should the crew check?',
    format: 'A colour word', answer: 'RED',
    transcript: 'Original letters: ABCDEFGHIJKLMNOPQRSTUVWXYZ. Sent letters: DEFGHIJKLMNOPQRSTUVWXYZABC. Message: FKHFN WKH UHG VWDU.',
    hints: ['Find a sent letter in the lower row. Read the original letter directly above it.', 'F becomes C, K becomes H and H becomes E. The first word begins CHE.', 'Decode the whole message, then answer with only the colour it names.'],
    solution: 'Moving each sent letter back three places gives CHECK THE RED STAR. The requested colour is RED.',
    payoff: 'The crew knows which star marker to inspect.',
  },
  {
    id: 'parcel-queue', number: '03', category: 'logic', level: 'Start here', title: 'The delivery queue',
    story: 'Four parcels need to leave in the right order. The courier remembers three clues, but the queue has become mixed up.',
    task: 'Arrange SUN, LEAF, STAR and MOON from first to last. Which parcel goes last?',
    format: 'A parcel name', answer: 'MOON',
    clues: ['SUN goes first.', 'STAR is immediately before MOON.', 'LEAF is not last.'],
    transcript: 'Available parcels: SUN, LEAF, STAR, MOON. SUN is first. STAR is immediately before MOON. LEAF is not last.',
    hints: ['Put SUN in the first position before trying the other parcels.', 'Keep STAR and MOON together, in that order. Try the two places where that pair could fit.', 'If STAR and MOON were second and third, LEAF would be last. That breaks a clue.'],
    solution: 'SUN must be first. STAR–MOON cannot occupy positions two and three, because that leaves LEAF last. The only order is SUN, LEAF, STAR, MOON. MOON goes last.',
    payoff: 'The courier can load the parcels in the correct order.',
  },
  {
    id: 'shared-parcel', number: '04', category: 'logic', level: 'Share the clues', title: 'The right parcel',
    story: 'Three helpers each remember a different detail about a missing parcel. Compare all three clues with the four parcels.',
    task: 'Which parcel matches every clue? On paper, give one clue card to each player or take turns reading them aloud.',
    format: 'One letter: A, B, C or D', answer: 'C',
    clues: ['Helper 1: It has stripes.', 'Helper 2: It has a triangle seal.', 'Helper 3: It has exactly two stamps.'],
    transcript: 'Parcel A: stripes, triangle seal, one stamp. B: dots, triangle seal, two stamps. C: stripes, triangle seal, two stamps. D: stripes, circle seal, two stamps.',
    hints: ['A parcel must satisfy all three helpers, not just one of them.', 'Cross out B because its wrapping has dots. Compare the seals and stamp counts on the others.', 'A has too few stamps and D has the wrong seal. Which parcel is left?'],
    solution: 'C has stripes, a triangle seal and two stamps. A fails the stamp clue, B fails the wrapping clue and D fails the seal clue. Only C matches all three.',
    payoff: 'The helpers agree on a parcel using their combined evidence.',
  },
  {
    id: 'forest-trail', number: '05', category: 'route', level: 'Start here', title: 'The forest trail',
    story: 'A ranger left a six-step trail to a meeting place. Every square visited after the start contributes one letter.',
    task: 'Start at S in the top-left square. Move one square per arrow: east, east, south, west, south, east. What place do the six letters spell?',
    format: 'A six-letter word', answer: 'BRIDGE',
    transcript: 'Four rows, left to right: S B R F / H D I A / N G E T / L P U M. Start at the top-left S. Move E, E, S, W, S, E. Collect the letter after each move; do not collect S.',
    hints: ['East is right, south is down and west is left. Each move travels exactly one square.', 'Your first two moves land on B and R. Write those down in that order.', 'After B and R, move down, left, down and right. Keep one letter from every landing square.'],
    solution: 'The six landing squares give B, R, I, D, G and E. They spell BRIDGE. The starting S is not part of the message.',
    payoff: 'The ranger’s meeting place is the bridge.',
  },
  {
    id: 'harbour-route', number: '06', category: 'route', level: 'One more step', title: 'The harbour crossing',
    story: 'A messenger needs to get from the dock to the beacon. Three instructions narrow the crossing down to one route.',
    task: 'Follow the rules and read the bridge numbers in travel order. What three-digit code does the route give?',
    format: 'Three digits', answer: '258',
    clues: ['Start at DOCK and finish at BEACON.', 'Cross exactly three bridges and visit BELL.', 'Do not visit MILL or return to a place you already visited.'],
    transcript: 'Bridges connect DOCK–OAK (2), DOCK–MILL (6), OAK–BELL (5), OAK–PINE (4), MILL–PINE (3), BELL–BEACON (8), PINE–BEACON (9). Only named stops are junctions.',
    hints: ['Because MILL is forbidden, the first bridge must go from DOCK to OAK.', 'You must visit BELL and use only three bridges in total. Compare OAK’s two onward choices.', 'The route is DOCK → OAK → BELL → BEACON. Read the numbers on those three bridges in order.'],
    solution: 'Avoiding MILL forces DOCK–OAK. To visit BELL within three bridges, continue OAK–BELL–BEACON. The bridge numbers are 2, 5 and 8, giving 258.',
    payoff: 'The messenger reaches the beacon by the only route that fits all the instructions.',
  },
]);

export function normalizePuzzleAnswer(value) {
  return typeof value === 'string' ? value.trim().toUpperCase().replace(/[\s-]+/g, '') : '';
}
export function checkPuzzleAnswer(id, value) {
  const puzzle = freePuzzles.find(p => p.id === id);
  return Boolean(puzzle && normalizePuzzleAnswer(value) === puzzle.answer);
}
export function puzzlePdfPath(paper, kind) {
  if (!['A4', 'Letter'].includes(paper) || !['players', 'guide'].includes(kind)) return null;
  return `/assets/free-puzzles/paper-adventure-puzzles-${paper}-${kind}.pdf`;
}

// All SVG content comes from the fixed data above, never player input.
const ink = '#153e54', red = '#ad3425', pale = '#e9f5f8';
const text = (x, y, s, size = 18, attrs = '') => `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${size}" fill="${ink}" ${attrs}>${s}</text>`;
function symbol(name, x, y, scale = 1) {
  const attrs = `fill="none" stroke="${ink}" stroke-width="3" stroke-linejoin="round"`;
  const shapes = {
    circle: `<circle cx="0" cy="0" r="14" ${attrs}/>`,
    triangle: `<path d="M0 -16L16 13H-16Z" ${attrs}/>`,
    square: `<rect x="-14" y="-14" width="28" height="28" ${attrs}/>`,
    diamond: `<path d="M0 -18L15 0 0 18 -15 0Z" ${attrs}/>`,
    star: `<path d="M0 -17L5 -6 17 -5 8 4 10 16 0 10 -10 16 -8 4 -17 -5 -5 -6Z" ${attrs}/>`,
    cross: `<path d="M-14 0H14M0 -14V14" ${attrs}/>`,
  };
  return `<g transform="translate(${x} ${y}) scale(${scale})">${shapes[name]}</g>`;
}
export function puzzleSvg(id) {
  let body = '';
  if (id === 'stamp-code') {
    body = text(24, 30, 'STAMP KEY', 13, 'font-weight="bold"');
    stampKey.forEach(([shape, letter], i) => {
      const x = 53 + i * 86;
      body += `<rect x="${x - 29}" y="44" width="58" height="94" rx="6" fill="white" stroke="#7997a2"/>${symbol(shape, x, 74)}${text(x, 119, letter, 23, 'text-anchor="middle" font-weight="bold"')}`;
    });
    body += text(24, 183, 'DELIVERY STAMPS · READ LEFT TO RIGHT', 13, 'font-weight="bold"');
    ['circle', 'triangle', 'square'].forEach((shape, i) => { const x = 163 + i * 110; body += `<rect x="${x - 37}" y="205" width="74" height="74" rx="8" fill="${pale}" stroke="${ink}" stroke-dasharray="4 3"/>${symbol(shape, x, 242, 1.25)}`; });
    body += text(270, 322, 'Which tree is the delivery point?', 17, 'text-anchor="middle"');
  } else if (id === 'signal-shift') {
    body = text(24, 30, 'DECODER · A WAS SENT AS D', 13, 'font-weight="bold"');
    ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ'].forEach((row, r) => {
      body += text(24, 65 + r * 77, 'Original', 12) + text(24, 95 + r * 77, 'Sent', 12);
      [...row].forEach((letter, i) => { const x = 103 + i * 32; const shifted = String.fromCharCode(65 + (letter.charCodeAt(0) - 65 + 3) % 26); body += text(x, 65 + r * 77, letter, 18, 'text-anchor="middle" font-weight="bold"') + text(x, 95 + r * 77, shifted, 18, 'text-anchor="middle"'); });
    });
    body += `<rect x="24" y="215" width="492" height="93" rx="8" fill="${pale}" stroke="#7997a2"/>${text(270, 250, 'FKHFN WKH', 24, 'text-anchor="middle" font-weight="bold"')}${text(270, 284, 'UHG VWDU', 24, 'text-anchor="middle" font-weight="bold"')}`;
  } else if (id === 'parcel-queue') {
    body = text(24, 30, 'PARCELS TO ARRANGE', 13, 'font-weight="bold"');
    ['MOON', 'SUN', 'LEAF', 'STAR'].forEach((label, i) => {
      const x = 24 + i * 128;
      body += `<rect x="${x}" y="55" width="108" height="95" rx="7" fill="${pale}" stroke="${ink}"/><path d="M${x + 54} 56V94M${x + 1} 94H${x + 107}" stroke="#7997a2"/>${text(x + 54, 125, label, 18, 'text-anchor="middle" font-weight="bold"')}`;
      body += `<rect x="${x}" y="220" width="108" height="65" rx="7" fill="white" stroke="${ink}" stroke-dasharray="5 4"/>${text(x + 54, 310, ['FIRST', 'SECOND', 'THIRD', 'LAST'][i], 13, 'text-anchor="middle"')}`;
    });
    body += text(270, 190, 'Use all three clues to fill the queue.', 17, 'text-anchor="middle"');
  } else if (id === 'shared-parcel') {
    parcels.forEach((p, i) => {
      const x = 38 + (i % 2) * 258, y = 20 + Math.floor(i / 2) * 170;
      body += `<rect x="${x}" y="${y}" width="208" height="139" rx="6" fill="white" stroke="${ink}" stroke-width="2"/>`;
      for (let n = 0; n < 7; n++) body += p.pattern === 'stripes' ? `<path d="M${x + 14 + n * 28} ${y + 48}v71" stroke="#7997a2" stroke-width="3"/>` : `<circle cx="${x + 15 + n * 28}" cy="${y + 66}" r="4" fill="#7997a2"/><circle cx="${x + 15 + n * 28}" cy="${y + 104}" r="4" fill="#7997a2"/>`;
      body += `<rect x="${x + 70}" y="${y + 66}" width="65" height="58" rx="6" fill="white"/>${symbol(p.seal, x + 103, y + 94)}${text(x + 15, y + 30, p.id, 23, 'font-weight="bold"')}`;
      for (let s = 0; s < p.stamps; s++) body += `<rect x="${x + 136 + s * 31}" y="${y + 13}" width="23" height="27" fill="${pale}" stroke="${ink}" stroke-dasharray="2 2"/>`;
    });
  } else if (id === 'forest-trail') {
    body = text(28, 31, 'ONE SQUARE PER MOVE', 13, 'font-weight="bold"');
    trailGrid.forEach((row, r) => row.forEach((letter, c) => { const x = 27 + c * 67, y = 48 + r * 67; body += `<rect x="${x}" y="${y}" width="67" height="67" fill="${r === 0 && c === 0 ? '#d5e8dd' : 'white'}" stroke="#7997a2"/>${text(x + 33.5, y + 43, letter, 26, 'text-anchor="middle" font-weight="bold"')}`; }));
    body += text(326, 78, 'START AT S', 17, 'font-weight="bold"') + text(326, 115, 'N = up', 17) + text(326, 145, 'E = right', 17) + text(326, 175, 'S = down', 17) + text(326, 205, 'W = left', 17) + text(326, 257, 'E  E  S', 24, 'font-weight="bold"') + text(326, 293, 'W  S  E', 24, 'font-weight="bold"');
  } else if (id === 'harbour-route') {
    harbourBridges.forEach(([a, b, n]) => {
      const from = harbourNodes.find(p => p.id === a), to = harbourNodes.find(p => p.id === b);
      const x = (from.x + to.x) / 2, y = (from.y + to.y) / 2;
      body += `<path d="M${from.x} ${from.y}L${to.x} ${to.y}" stroke="#7997a2" stroke-width="4"/><circle cx="${x}" cy="${y}" r="14" fill="white" stroke="${ink}"/>${text(x, y + 6, n, 17, 'text-anchor="middle" font-weight="bold"')}`;
    });
    harbourNodes.forEach(p => { body += `<rect x="${p.x - 37}" y="${p.y - 22}" width="74" height="44" rx="8" fill="${p.id === 'dock' || p.id === 'beacon' ? '#d5e8dd' : 'white'}" stroke="${ink}" stroke-width="2"/>${text(p.x, p.y + 5, p.label, 13, 'text-anchor="middle" font-weight="bold"')}`; });
    body += text(270, 332, 'Only named stops are junctions.', 15, 'text-anchor="middle"');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="350" viewBox="0 0 540 350">${body}</svg>`;
}
