import {lightRules,lightTranscript,lightSvg} from './harbour-lights.mjs';
import { forestRules,forestTranscript,forestSvg } from './forest-loop.mjs';
import { bayPieces, bayStart, bayHints, baySolution, solveBay } from './loading-bay.mjs';
// Original Paper Adventure puzzles. Shared by the website, PDF builder and solvers.
// Design references (no upstream runtime copied): content/free-puzzles-design.md.
import { stampRecords, stampLabels, stampShapeNames, postalStops, postalClues, postalClueText } from './stamp-investigation.mjs';
export const puzzlePath = '/en/escape-room-puzzles/';
export const puzzleCategories = Object.freeze({ code: 'Codes', logic: 'Logic', route: 'Routes' });
import { parcels, parcelSheetSvg, parcelRecords, verifiedParcelRecords, parcelHints, parcelSteps, parcelSolution } from './parcel-evidence.mjs';
export { parcels } from './parcel-evidence.mjs';
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
    id: 'shared-parcel', number: '04', category: 'logic', level: 'Reconstruct the hidden ledger', title: 'The miscopied parcel records',
    story: 'Four sealed parcels have lost their recipient and contents labels. All four verified records are true. Exactly one of three copied notes is false. Restore the relationships to find the compass.',
    task: 'Find the parcel holding the compass and the one false copied note. Each of Ava, Ben, Cleo and Drew receives one parcel; map, key, clock and compass each occur once. All four verified records are true; copied notes I, II and III have exactly two true notes and one false note.',
    format: 'Compass in parcel: ____    False copied note (I, II or III): ____', answer: 'A / note III',
    clues: parcelRecords.map(record => record.text), verified: verifiedParcelRecords.map(record => record.text), steps: parcelSteps, ledger: parcelSolution,
    transcript: parcels.map(p => `Parcel ${p.id}: ${p.stamps} ${p.stamps === 1 ? 'stamp' : 'stamps'}, ${p.pattern}, ${p.ribbon} ribbon.`).join(' '),
    hints: parcelHints,
    solution: 'A / note III. Parcel A holds Ava\u0027s compass. B holds Ben\u0027s map, C holds Cleo\u0027s key, and D holds Drew\u0027s clock. Copied notes I and II are true; III is false because the compass belongs to Ava, not Cleo.',
    payoff: 'The compass is in parcel A, for Ava. Copied note III is false.',
  },
  {
    id:'forest-trail',number:'05',category:'route',level:'Think deeper',title:'The missing ranger footprints',
    story:'The ranger’s log is lost. A boot sample, torn sketches and a camera frame survive. Use these recovered materials to reconstruct the journey and rescue.',
    task:'Start at S and finish at E without revisiting a place. You do not have to visit every place. Use all recovered evidence.',
    format:'Write the route that explains all evidence.',answer:'S B R A X C D T Z W E',transcript:forestTranscript(),
    hints:['Observe the boot sample depth and map terrain badges.','Match the sketch landmarks; use the absence of grass in the complete sample.','The map and evidence together identify terrain order, consecutive sketches and a bridge crossing after rescue.'],
    solution:'S B R A X C D T Z W E. Match the traces to the map, interpret the sketches and identify the photographed bridge. Full reasoning follows.',
    payoff:'Route restored. Your journey explains all four exhibits and follows every road rule.',
  },
  {
    id: 'harbour-route', number: '06', category: 'logic', level: 'Think deeper', title: 'The fog harbour circuit',
    story: 'The harbour control panel is scrambled. Each switch changes several navigation lights at once.',
    task: 'Restore all 36 navigation lights to ON. Each switch flips itself and its direct neighbours. Choose Check circuit when ready.',
    format: 'Record the switches you press; calculate the resulting ON/OFF board.', answer: 'All 36 navigation lights ON',
    transcript: lightTranscript(),
    hints: ['Look at overlapping switch effects, not just dark lights.', 'Two presses of one switch cancel. Record a tentative press plan.', 'The complete guide shows an initial-board restoration plan, with the affected lights at every step.'],
    solution: 'Track switch parity and overlapping effects. The four worked stages show a complete restoration from the printed initial board.',
    payoff: 'Circuit restored. All 36 navigation lights are on.',

  },
]);

export function normalizePuzzleAnswer(value) {
  return typeof value === 'string' ? value.trim().toUpperCase().replace(/[\s-]+/g, '') : '';
}
export function checkPuzzleAnswer(id, value) {
  if (['parcel-queue','forest-trail','harbour-route'].includes(id)) return false; // This puzzle is completed by legal board movement, never a typed answer.
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
    return parcelSheetSvg();
  } else if (id === 'forest-trail') {
    return forestSvg();
  } else if (id === 'harbour-route') {
    return lightSvg();
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
