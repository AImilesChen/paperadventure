import { pageFor } from '../shared/page-manifest.mjs';

// Third-party analytics belongs only on public editorial pages. Planning,
// checkout, account, order, and support flows may contain private details.
const privatePage = /^\/en\/(?:sudoku|create|checkout|orders|my-adventures|account)(?:\/|$)|^\/en\/help\/(?:recover|report)(?:\/|$)/;

const publicSudoku=new Set(['/en/sudoku/leaderboard/','/en/sudoku/levels/','/en/sudoku/how-to-play/','/en/sudoku/techniques/']);
export const isPublicSudokuPage=pathname=>publicSudoku.has(pathname);
export function isAnalyticsPage(pathname) {
  if(isPublicSudokuPage(pathname))return true;
  return Boolean(pageFor(pathname)) && !privatePage.test(pathname);
}

export function crossesAnalyticsBoundary(from, to) {
  return isAnalyticsPage(from) !== isAnalyticsPage(to) || isPublicSudokuPage(from)!==isPublicSudokuPage(to);
}
