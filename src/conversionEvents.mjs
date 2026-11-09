// Public funnel actions only. Values come from catalog/UI enums, never user text.
export const conversionGoalNames = Object.freeze([
  'home_sample_click', 'sample_download_success',
  'sample_browse_themes', 'product_checkout_click',
  'puzzle_select', 'puzzle_attempt', 'puzzle_solved', 'puzzle_hint_open', 'puzzle_pdf_download', 'puzzle_game_click',
  'escape_start_click', 'escape_game_start', 'escape_stage_complete', 'escape_hint_open', 'escape_game_complete', 'escape_pdf_download',
]);

export function conversionProperties(name, properties = {}) {
  if (!conversionGoalNames.includes(name)) return null;
  if (name.startsWith('escape_')) {
    if (properties.game !== 'sleeping-lighthouse') return null;
    const game = properties.game;
    if (name === 'escape_pdf_download') return ['A4', 'Letter'].includes(properties.paper) && ['players', 'guide', 'complete'].includes(properties.file) ? { game, paper: properties.paper, file: properties.file } : null;
    if (['escape_stage_complete', 'escape_hint_open'].includes(name) && !['journal', 'power', 'lens', 'finale'].includes(properties.stage)) return null;
    if (['escape_stage_complete', 'escape_game_complete'].includes(name) && !['none', 'hint', 'solution'].includes(properties.assistance)) return null;
    return { game, ...(['escape_stage_complete', 'escape_hint_open'].includes(name) ? { stage: properties.stage } : {}), ...(['escape_stage_complete', 'escape_game_complete'].includes(name) ? { assistance: properties.assistance } : {}) };
  }
  if (name.startsWith('puzzle_')) {
    if (name === 'puzzle_pdf_download') return ['A4', 'Letter'].includes(properties.paper) && ['players', 'guide'].includes(properties.file) ? { paper: properties.paper, file: properties.file } : null;
    if (name === 'puzzle_game_click') return ['home', 'classroom', 'space'].includes(properties.destination) ? { destination: properties.destination } : null;
    if (!['stamp-code', 'signal-shift', 'parcel-queue', 'shared-parcel', 'forest-trail', 'harbour-route'].includes(properties.puzzle)) return null;
    if (name === 'puzzle_solved') return ['none', 'hint', 'solution'].includes(properties.assistance) ? { puzzle: properties.puzzle, assistance: properties.assistance } : null;
    return { puzzle: properties.puzzle };
  }
  const setting = ['home', 'classroom'].includes(properties.setting) ? properties.setting : null;
  if (!setting) return null;
  if (name === 'sample_download_success') {
    if (!['A4', 'Letter'].includes(properties.paper)) return null;
    return { setting, paper: properties.paper };
  }
  // Theme identity is derived from the public catalog route, never arbitrary text.
  if (name === 'product_checkout_click') {
    if (!['dinosaur','space','forest','halloween','christmas','ocean','museum','library','weather','workshop'].includes(properties.theme)) return null;
    return { setting, theme: properties.theme };
  }
  return { setting };
}
