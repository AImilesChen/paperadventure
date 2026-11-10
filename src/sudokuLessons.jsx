import SudokuLearning from './sudokuLearning.jsx';
import SudokuRules from './sudokuRules.jsx';
import './sudoku.css';
import './sudoku-lessons.css';

export function SudokuUnitDiagram({kind}){const hidden=[[1,2],[1,2],[3,4],[4,6],[3,6],[7,8],[5,7,8],[8,9],[7,9]],pairs=[[2,8],[2,8],[2,3,8],[3,5],[1,5],[1,4],[4,6],[6,9],[7,9]];return <div className="sd-unit-diagram" role="img" aria-label={kind==='single'?'Separate row example: 1, 2, 3, 4, 5, 6, empty cell, 8, 9':kind==='hidden'?'Candidate row: digit 5 occurs only in the seventh cell':'Two cells have only candidates 2 and 8; eliminate 2 and 8 from the third cell'}>{Array.from({length:9},(_,i)=><span key={i} className={kind==='pair'&&i<2||kind!=='pair'&&i===6?'focus':''}>{kind==='single'?(i===6?'?':i+1):(kind==='hidden'?hidden:pairs)[i].map(n=><small key={n} className={kind==='pair'&&i===2&&n!==3?'removed':''}>{n}</small>)}</span>)}</div>;}
export default function SudokuLessons({route}){return route.endsWith('/how-to-play/')?<SudokuRules route={route}/>:<SudokuLearning route={route}/>;}
