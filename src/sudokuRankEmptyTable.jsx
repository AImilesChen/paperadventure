import { t as translateUi } from "./i18n/index.mjs";import SudokuRankMedal from './sudokuRankMedal.jsx';
export default function SudokuRankEmptyTable({ speed = false }) {
  return <div className="sd-empty-board">
    <div className="sd-empty-board-label"><span>{translateUi("PUBLIC LEADERBOARD")}</span><span>{translateUi("0 players")}</span></div>
    <table className={'sd-empty-ranks-table' + (speed ? ' is-speed' : '')}>
      <caption className="sd-ranks-sr">{translateUi("Five open positions, not recorded rankings. There are no public players on this board yet.")}</caption>
      <thead><tr><th scope="col">{translateUi("Rank")}</th><th scope="col">{translateUi("Player")}</th>{!speed && <th scope="col">{translateUi("Cleared")}</th>}<th scope="col">{speed ? translateUi('Best time') : translateUi('First-clear time')}</th></tr></thead>
      <tbody>{[1, 2, 3, 4, 5].map((position) => <tr className={'sd-empty-position position-' + position} key={position}>
        <td><span className="sd-open-rank sd-rank-with-medal" role="img" aria-label={translateUi("Open position {value0}", { value0: position })}><SudokuRankMedal rank={position} /></span></td>
        <td><span className="sd-open-player"><span className="sd-open-avatar" aria-hidden="true">—</span><span>{translateUi("No player yet")}</span></span></td>
        {!speed && <td><span className="sd-open-score" aria-label={translateUi("No score")}>—</span></td>}
        <td><span className="sd-open-score" aria-label={translateUi("No time")}>—</span></td>
      </tr>)}</tbody>
    </table>
    <p className="sd-empty-board-note">{translateUi("Open places \xB7 no public results yet")}</p>
  </div>;
}
