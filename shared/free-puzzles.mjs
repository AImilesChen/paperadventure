import { bayPieces, bayStart, bayHints, baySolution, solveBay } from './loading-bay.mjs';
// Original Paper Adventure puzzles. Shared by the website, PDF builder and solvers.
// Design references (no upstream runtime copied): content/free-puzzles-design.md.
import { stampRecords, stampLabels, stampShapeNames, postalStops, postalClues, postalClueText } from './stamp-investigation.mjs';
export const puzzlePath = '/en/escape-room-puzzles/';
export const puzzleCategories = Object.freeze({ code: 'Codes', logic: 'Logic', route: 'Routes' });
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
    id: 'stamp-code', number: '01', category: 'code', level: 'Investigate & decode', title: 'The rain-soaked post office',
    story: 'Rain has damaged the post office key and scrambled the delivery log. Restore the code, then reconstruct the five-stop route to deliver the last letter.',
    task: 'Match the four labels to records A-D. Each row is one label encoded with one shared code; use each label once and read left to right. Then use the restored key and all five route records to order the five stops. The final stop receives the letter.',
    format: 'All five stops in order, then the final destination', answer: 'OAK MALL POOL LOOM PALM',
    transcript: 'Record A: diamond, triangle, star, cross. B: cross, triangle, diamond, star. C: star, triangle, cross. D: circle, triangle, square. Loose labels: PALM, OAK, LAMP, MAP. Each label is used once; same shape, same letter; different shapes, different letters. After restoring the key, use the second player page to reconstruct the five-stop route.',
    hints: ['Compare lengths first: a three-shape record needs a three-letter label; a four-shape record needs four letters.', 'Try a label on A, then use the same shape-letter matches to read B. Does B become one of the other labels?', 'If A were PALM, B would read MAPL, which is not a label. Try the other four-letter label, then restore the key.'],
    routeHints: ['Find the two stops that must be consecutive. Keep them together when trying different orders; then test PALM two positions before or after POOL.', 'PALM cannot be two positions before POOL while satisfying records 1 and 4. The continuous group is POOL, LOOM, PALM.', 'The three-stop group must occupy positions 3-5. Compare OAK and MALL in positions 1-2 with record 5 to choose their direction.'],
    routeClues: postalClues.map(postalClueText),
    solution: 'Stage 1: A=LAMP, B=PALM, C=MAP, D=OAK. If A were PALM, B would read MAPL, which is not a label. The restored key is diamond=L, triangle=A, star=M, cross=P, circle=O, square=K. Stage 2: record 1 decodes to MALL before PALM; record 3 says POOL immediately before LOOM. Combine POOL-LOOM with record 2. If PALM is two positions before POOL, records 1 and 4 cannot both hold. Therefore the group is POOL-LOOM-PALM. It cannot occupy positions 1-3 because MALL must precede PALM, nor positions 2-4 because OAK and MALL could not be neighbours. It occupies positions 3-5. Record 5 excludes MALL-OAK-POOL-LOOM-PALM. The only route is OAK MALL POOL LOOM PALM. Deliver the final letter to PALM.',
    payoff: 'You reconstructed OAK → MALL → POOL → LOOM → PALM. The courier reaches the palm garden and delivers the last letter.',

  },
  {
    id: 'signal-shift', number: '02', category: 'code', level: 'Discover & decode', title: 'The moon-station message',
    story: 'The moon station has lost contact with a rescue ship. Three old communication records survived. Discover their shared rule, then decode the final message to reveal the rescue meeting point.',
    task: 'All records use the same method and keep the same number of letters. Compare NOON > QRRQ, SUN > QXV and STAR > UDWV. Decode NFRG to find the original four-letter word naming the rescue meeting point.',
    format: 'One four-letter word', answer: 'DOCK',
    transcript: 'Record 1: original NOON, received QRRQ. Record 2: original SUN, received QXV. Record 3: original STAR, received UDWV. All records use the same method; letter counts stay the same. Final received message: NFRG. Find the original four-letter word naming the rescue meeting point.',
    hints: ['Try a simple explanation for record 1. Does it also work on record 2? Your rule must explain all three records.', 'Moving the letters in QXV back three places gives NUS. Compare its order with SUN. Does the same idea explain STAR and UDWV?', 'Move each received letter back three places, then reverse the whole word. For NFRG, the first step gives KCOD. Reverse those letters to find the meeting point.'],
    solution: 'The sender reverses a word, then moves every letter forward three places. NOON is unchanged by reversal, so its QRRQ record alone also fits a simple shift. SUN becomes NUS, then QXV, disproving a shift alone. STAR becomes RATS, then UDWV; merely swapping its end letters would instead give UWDV. To decode NFRG, move each letter back three places: N to K, F to C, R to O and G to D. KCOD reversed is DOCK. Enter DOCK to restore communication; the rescue ship will meet you at the dock.',
    payoff: 'Communication restored. You decoded the meeting point: the dock.'
  },
  {
    id: 'parcel-queue', number: '03', category: 'logic', level: 'Backtrack & plan', title: 'The blocked loading bay',
    story: 'The delivery van is waiting, but urgent parcel X is trapped in the loading bay. Slide the crates to make a path to the right-hand exit.',
    task: 'Horizontal crates slide left or right; vertical crates slide up or down. No turning, overlap or jumping over crates. Only X may leave, through the right-hand exit. On paper, cut out player page 5 and place the crates over the starting outlines on page 4.',
    format: 'Move X to the right-hand exit', answer: 'X reaches EXIT',
    transcript: 'Six by six grid. Starting rows: H H B B B C; J empty empty empty empty C; J empty X X D A; F F G G D A; empty empty I E E A; empty empty I empty empty empty. Repeated letters are one crate. X exits right from row 3. Follow each crate’s arrow. No turning, overlap or jumping.',
    hints: bayHints(bayStart), solution: baySolution(bayStart),
    bay: { size: 6, pieces: bayPieces, start: bayStart, solution: solveBay(bayStart) },
    payoff: 'Delivery complete. You cleared the loading bay and sent X through the exit.'
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
  if (id === 'parcel-queue') return false; // This puzzle is completed by legal board movement, never a typed answer.
  const puzzle = freePuzzles.find(p => p.id === id);
  return Boolean(puzzle && normalizePuzzleAnswer(value) === normalizePuzzleAnswer(puzzle.answer));
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
    body = text(20, 22, 'OLD RECORDS - MATCH EACH LOOSE LABEL', 13, 'font-weight="bold"');
    stampRecords.forEach((record, i) => {
      const y = 52 + i * 45;
      body += text(24, y + 5, record.id, 16, 'font-weight="bold"');
      record.shapes.forEach((shape, j) => { body += symbol(shape, 82 + j * 56, y, .78); });
      body += `<rect x="323" y="${y - 15}" width="188" height="31" rx="5" fill="white" stroke="#7997a2" stroke-dasharray="4 3"/>`;
    });
    body += text(20, 229, 'LOOSE LABELS - USE EACH ONCE', 12, 'font-weight="bold"');
    stampLabels.forEach(({word, meaning}, i) => {
      const x = 21 + i * 128;
      body += `<rect x="${x}" y="237" width="111" height="47" rx="5" fill="${pale}" stroke="#7997a2"/>${text(x + 55, 258, word, 17, 'text-anchor="middle" font-weight="bold"')}${text(x + 55, 276, meaning === 'a drawing of places' ? 'places drawing' : meaning, 11, 'text-anchor="middle"')}`;
    });
    body += text(20, 304, 'WRITE YOUR RESTORED KEY - THEN OPEN PLAYER PAGE 2', 11, 'font-weight="bold"');
    stampShapeNames.forEach((shape, i) => { body += symbol(shape, 36 + i * 86, 330, .55) + `<line x1="${53+i*86}" y1="337" x2="${79+i*86}" y2="337" stroke="${ink}"/>`; });
  } else if (id === 'signal-shift') {
    body = text(24,24,'COMPARE ALL THREE COMMUNICATION RECORDS',13,'font-weight="bold"');
    [['NOON','QRRQ'],['SUN','QXV'],['STAR','UDWV']].forEach(([original,sent],i)=>{const y=56+i*32;body+=text(24,y,String(i+1),14,'font-weight="bold"')+text(60,y,'Original: '+original,18,'font-weight="bold"')+text(300,y,'Received: '+sent,18,'font-weight="bold"');});
    body += text(24,150,'All records use the same method. Letter counts stay the same.',13);
    body += text(24,180,'ABCDEFGHIJKLMNOPQRSTUVWXYZ',16,'letter-spacing="2"');
    body += `<rect x="24" y="205" width="492" height="100" rx="7" fill="${pale}" stroke="#7997a2"/>`;
    body += text(40,230,'FINAL RECEIVED MESSAGE',13,'font-weight="bold"');
    body += text(40,265,'NFRG',27,'font-weight="bold" letter-spacing="4"');
    body += text(40,289,'Decode the original word to find the rescue meeting point.',12);
    body += text(24,334,'Your rule must explain all three records.',14);
  } else if (id === 'parcel-queue') {
    body = text(24, 25, 'SLIDE THE CRATES. GET X TO THE EXIT.', 15, 'font-weight="bold"');
    for (let r=0;r<6;r++) for(let c=0;c<6;c++) body += `<rect x="${115+c*43}" y="${48+r*43}" width="43" height="43" fill="#faf7ef" stroke="#a7a99d"/>`;
    bayPieces.forEach((p,i)=>{const x=115+(p.axis==='H'?bayStart[i]:p.fixed)*43,y=48+(p.axis==='H'?p.fixed:bayStart[i])*43,w=(p.axis==='H'?p.length:1)*43,h=(p.axis==='V'?p.length:1)*43;body+=`<rect x="${x+2}" y="${y+2}" width="${w-4}" height="${h-4}" rx="5" fill="${p.id==='X'?'#f7d7c9':pale}" stroke="${ink}"/>`+text(x+w/2,y+h/2+6,p.id+' '+(p.axis==='H'?'↔':'↕'),19,'font-weight="bold" text-anchor="middle"');});
    body += text(385,160,'EXIT >',18,'font-weight="bold"');
    body += text(270,335,'Make room, move back, then open the exit.',14,'text-anchor="middle"');
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

// Separate print evidence: no plaintext translations for encrypted records 1 and 3.
export function postalRouteSvg() {
  const shapes = Object.fromEntries(stampKey.map(([shape, letter]) => [letter, shape]));
  const coded = (word, x, y) => [...word].map((letter, i) => symbol(shapes[letter], x + i * 25, y, .52)).join('');
  let body = text(20, 25, 'FIVE STOPS - EACH ONCE', 16, 'font-weight="bold"');
  postalStops.forEach((stop, i) => { const x=20+i*104; body += `<rect x="${x}" y="40" width="96" height="54" rx="5" fill="${pale}" stroke="#7997a2"/>`+text(x+48,63,stop.word,16,'text-anchor="middle" font-weight="bold"')+text(x+48,82,['Weaving room','Swimming pool','Old oak tree','Palm garden','Shopping arcade'][i],10,'text-anchor="middle"'); });
  const rows = [
    coded('MALL',65,139)+text(170,144,'before',16)+coded('PALM',270,139)+text(42,173,'Not necessarily immediately before.',14),
    text(42,218,'Exactly one stop between PALM and POOL.',16)+text(42,246,'Either could come first.',14),
    text(42,290,'Immediately after',15)+coded('POOL',205,285)+text(304,290,', visit',15)+coded('LOOM',376,285),
    text(42,362,'OAK and MALL were next to each other.',16)+text(42,390,'Either could come first.',14),
    text(42,438,'POOL was not immediately after OAK.',16),
  ];
  rows.forEach((row,i)=>{const y=[139,214,285,358,434][i];body+=text(20,y+5,String(i+1),16,'font-weight="bold"')+row;});
  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="470" viewBox="0 0 540 470"><rect width="540" height="470" rx="9" fill="#fffdf8"/>${body}</svg>`;
}
