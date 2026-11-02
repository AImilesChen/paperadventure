// Public preparation facts from the six fixed Home editions, not custom orders.
export const homeGamePlanning = {
  celebration: {
    playerPages: 10, guidePages: 12, pieces: 21,
    play: 'Share clues, connect routes and decode a birthday key.',
    prepare: '10 Player pages/team · 21 game pieces, plus adult finale letters.',
    occasion: 'A birthday gathering or family mystery.',
  },
  dinosaur: {
    playerPages: 15, guidePages: 10, pieces: 16,
    play: 'Build a landscape, choose paper supplies and help Milo find a route.',
    prepare: '15 Player pages/team · 16 cut-out pieces/team.',
    occasion: 'A family table or dinosaur birthday party.',
  },
  space: {
    playerPages: 14, guidePages: 10, pieces: 24,
    play: 'Connect signals, share separate clues and send a paper reply.',
    prepare: '14 Player pages/team · 24 cut-out pieces/team.',
    occasion: 'A space party or family signal mystery.',
  },
  forest: {
    playerPages: 16, guidePages: 10, pieces: 19,
    play: 'Sort mail, repair a label and question paper forest residents.',
    prepare: '16 Player pages/team · 19 pieces/team; the host plays the residents.',
    occasion: 'Family play with a post-office story.',
  },
  halloween: {
    playerPages: 15, guidePages: 10, pieces: 17,
    play: 'Make paper actors, inspect clues and bring back the pumpkin light.',
    prepare: '15 Player pages/team · 17 loose pieces/team; adult-cut slots and windows.',
    occasion: 'A family Halloween paper adventure.',
  },
  christmas: {
    playerPages: 14, guidePages: 8, pieces: 12,
    play: 'Fold paper gifts, share wrapping clues and build a village display.',
    prepare: '14 Player pages/team · 12 cut-out pieces/team.',
    occasion: 'A family Christmas gift workshop.',
  },
};

// Only these editions use the complete-pack calculation below. Celebration
// needs an extra adult finale sheet even when its Guide is read on screen.
const calculatorThemes = new Set(['dinosaur', 'christmas']);
export function homePrintPlan(themeId, children, printGuide = false) {
  if (!calculatorThemes.has(themeId) || !['string', 'number'].includes(typeof children)) return null;
  if (typeof children === 'string' && !/^\d+$/.test(children.trim())) return null;
  const count = Number(children);
  if (!Number.isInteger(count) || count < 2 || count > 12 || typeof printGuide !== 'boolean') return null;
  const pack = homeGamePlanning[themeId];
  const teams = count <= 6 ? [count] : [Math.ceil(count / 2), Math.floor(count / 2)];
  const playerCopies = teams.length;
  const playerSheets = playerCopies * pack.playerPages;
  const guideSheets = printGuide ? pack.guidePages : 0;
  return { children: count, teams, playerCopies, playerSheets, guideSheets,
    totalSheets: playerSheets + guideSheets, pieces: playerCopies * pack.pieces };
}
