export const sudokuLinks=Object.freeze([
 {id:'play',href:'/en/sudoku/',title:'Play Sudoku',description:'Start or continue your current level',icon:'play',group:'Play'},
 {id:'levels',href:'/en/sudoku/levels/',title:'Level map',description:'Explore progressive puzzle collections',icon:'levels',group:'Play'},
 {id:'ranks',href:'/en/sudoku/leaderboard/',title:'Leaderboard',description:'Compare your total cleared levels',icon:'ranks',group:'Play'},
 {id:'rules',href:'/en/sudoku/how-to-play/',title:'How to play',description:'Rules, controls and a clear finish',icon:'rules',group:'Learn'},
 {id:'techniques',href:'/en/sudoku/techniques/',title:'Solving techniques',description:'Four logical ways to find your next step',icon:'techniques',group:'Learn'},
]);
export function sudokuSection(path){if(path==='/en/sudoku/'||path==='/en/sudoku/play/')return'play';return sudokuLinks.find(l=>l.href===path)?.id||null;}
