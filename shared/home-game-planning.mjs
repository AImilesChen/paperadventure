// Public preparation facts from the six fixed Home editions, not custom orders.
export const homeGamePlanning = {
  celebration: {
    playerPages: 10, guidePages: 12, pieces: 21,
    play: 'Share clues, connect routes and decode a birthday key.',
    prepare: '10 Player pages/team · 21 game pieces, plus adult finale letters.',
    occasion: 'A birthday gathering or family mystery.',
  },
  dinosaur: {
    playerPages: 17, guidePages: 18, pieces: 16,
    play: 'Build a landscape, choose paper supplies and help Milo find a route.',
    prepare: '17 Player pages/team · 16 cut-out pieces/team.',
    occasion: 'A family table or dinosaur birthday party.',
  },
  space: {
    playerPages: 19, guidePages: 18, pieces: 24,
    play: 'Connect signals, share separate clues and send a paper reply.',
    prepare: '19 Player pages/team · 24 cut-out pieces/team.',
    occasion: 'A space party or family signal mystery.',
  },
  forest: {
    playerPages: 18, guidePages: 17, pieces: 19,
    play: 'Sort mail, repair a label and question paper forest residents.',
    prepare: '18 Player pages/team · 19 pieces/team; private resident cards prepared by the host.',
    occasion: 'Family play with a post-office story.',
  },
  halloween: {
    playerPages: 17, guidePages: 19, pieces: 17,
    play: 'Make paper actors, inspect clues and bring back the pumpkin light.',
    prepare: '17 Player pages/team · 17 pieces/team; print private Host page 18 once per team.',
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
