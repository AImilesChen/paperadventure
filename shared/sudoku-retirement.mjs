// Never carry a retired week ID or puzzle number into the 100-level campaign.
export function retiredWeeklyTarget(pathname){
 if(!/^\/en\/sudoku\/weekly(?:\/|$)/.test(pathname))return null;
 return /^\/en\/sudoku\/weekly\/leaderboard(?:\/|$)/.test(pathname)?'/en/sudoku/leaderboard/':'/en/sudoku/';
}
