import SudokuRankMedal from './sudokuRankMedal.jsx';
export default function SudokuRankEmptyTable({ speed = false }) {
  return <div className="sd-empty-board">
    <div className="sd-empty-board-label"><span>PUBLIC LEADERBOARD</span><span>0 players</span></div>
    <table className={'sd-empty-ranks-table' + (speed ? ' is-speed' : '')}>
      <caption className="sd-ranks-sr">Five open positions, not recorded rankings. There are no public players on this board yet.</caption>
      <thead><tr><th scope="col">Rank</th><th scope="col">Player</th>{!speed && <th scope="col">Cleared</th>}<th scope="col">{speed ? 'Best time' : 'First-clear time'}</th></tr></thead>
      <tbody>{[1, 2, 3, 4, 5].map(position => <tr className={'sd-empty-position position-' + position} key={position}>
        <td><span className="sd-open-rank sd-rank-with-medal" role="img" aria-label={'Open position ' + position}><SudokuRankMedal rank={position}/></span></td>
        <td><span className="sd-open-player"><span className="sd-open-avatar" aria-hidden="true">—</span><span>No player yet</span></span></td>
        {!speed && <td><span className="sd-open-score" aria-label="No score">—</span></td>}
        <td><span className="sd-open-score" aria-label="No time">—</span></td>
      </tr>)}</tbody>
    </table>
    <p className="sd-empty-board-note">Open places · no public results yet</p>
  </div>;
}
