import { t as translateUi, localHref } from "./i18n/index.mjs";import SudokuRankMedal from './sudokuRankMedal.jsx';
import SudokuRankEmptyTable from './sudokuRankEmptyTable.jsx';
import RankIcon from './sudokuRankIcon.jsx';
import { campaignTime, OwnRankRow } from './sudokuRankPersonal.jsx';
import { rankingSignIn, rankingContext, participation } from '../shared/sudoku/leaderboard-context.mjs';
import { trackConversionEvent } from './analytics.js';
import SudokuRankPersonal from './sudokuRankPersonal.jsx';
import SudokuSpeed from './sudokuSpeed.jsx';
import { useEffect, useRef, useState } from 'react';
import { Trophy, Medal, Timer, ArrowRight, ArrowClockwise, LockSimple, Globe, Info } from '@phosphor-icons/react';
import { publicCatalog } from '../shared/sudoku/catalog.mjs';
import './sudoku-leaderboard.css';

const config = { label: 'All clears', description: 'More clears first. At the same clear count, a shorter first-clear total ranks higher. Hints are welcome.' };

export default function SudokuLeaderboard({ api, progress, profile, onProfile, local, onLocalLogin, catalog = publicCatalog, speedEnabled = false }) {
  const selectedSpeedLevel = useRef(new URLSearchParams(location.search).get('level'));
  const selectMode = (speed) => {trackConversionEvent('sudoku_board_switch', { mode: speed ? 'speed' : 'all' });setSpeedTab(speed);const u = new URL(location.href);if (speed) {u.searchParams.set('mode', 'speed');u.searchParams.set('level', selectedSpeedLevel.current || Math.min(progress.highest + 1, catalog.publishedCount));} else {selectedSpeedLevel.current = u.searchParams.get('level');u.searchParams.delete('mode');u.searchParams.delete('level');}history.replaceState(null, '', u);window.dispatchEvent(new Event('sudoku-ranking-context'));};
  const mode = 'all';const [speedTab, setSpeedTab] = useState(new URLSearchParams(location.search).get('mode') === 'speed');
  const [revision, setRevision] = useState(0),[rawData, setData] = useState(null),[loading, setLoading] = useState(true),[error, setError] = useState('');
  const data = rawData?.profile?.storageKey === profile.storageKey ? rawData : null;
  const [editing, setEditing] = useState(false),[nickname, setNickname] = useState(profile.nickname),[listed, setListed] = useState(profile.listed),[saving, setSaving] = useState(false),[profileError, setProfileError] = useState(''),[notice, setNotice] = useState('');
  const editButton = useRef(null),editor = useRef(null);
  useEffect(() => {if (speedEnabled && speedTab) return;let active = true,timer;setLoading(true);setError('');
    api('/leaderboard?mode=' + mode).then((r) => {if (active) {setData(r);setLoading(false);}}).catch((e) => {if (active) {setError(e.message);setLoading(false);}});
    const update = () => {if (!document.hidden) setRevision((n) => n + 1);};timer = setInterval(update, 30000);document.addEventListener('visibilitychange', update);window.addEventListener('focus', update);return () => {active = false;clearInterval(timer);document.removeEventListener('visibilitychange', update);window.removeEventListener('focus', update);};
  }, [mode, revision, profile.storageKey, profile.listed, speedEnabled, speedTab]);
  useEffect(() => {setNickname(profile.nickname);setListed(profile.listed);}, [profile.nickname, profile.listed]);
  useEffect(() => {if (editing) {editor.current?.focus();}}, [editing]);
  useEffect(() => {if (profile.authenticated && rankingContext(location.search, catalog.publishedCount).profile) {setEditing(true);setNotice('Your saved progress is linked. Choose whether to share your results.');}}, [profile.authenticated]);
  const waiting = !data || data.mode !== mode;
  const total = data?.catalog?.publishedCount || catalog.publishedCount;
  const highest = data?.personal?.highest ?? progress.highest;
  const score = highest,mine = !waiting && !error ? data?.mine : null;
  const status = !profile.authenticated ? 'guest' : !profile.listed ? 'private' : !highest ? 'no_clears' : 'ranked';
  const level = Math.min(highest + 1, total),play = highest === total ? '/en/sudoku/levels/' : '/en/sudoku/play/?level=' + level;
  const playLabel = highest === total ? 'Revisit your levels' : highest === 0 ? 'Start level 1' : 'Continue level ' + level;
  function closeEditor() {setEditing(false);const u = new URL(location.href);u.searchParams.delete('profile');u.hash = 'my-results';history.replaceState(null, '', u);window.dispatchEvent(new Event('sudoku-ranking-context'));setNickname(profile.nickname);setListed(profile.listed);setProfileError('');editButton.current?.focus();}
  async function save(e) {e.preventDefault();if (saving) return;setSaving(true);setProfileError('');setNotice('');
    try {const r = await api('/profile', { nickname, listed });onProfile(r.profile);setNotice(r.profile.listed ? 'Public profile saved. Eligible scores appear on the leaderboard.' : 'Your scores are private. Your progress is kept.');setRevision((n) => n + 1);closeEditor();}
    catch (e) {setProfileError(e.message);} finally {setSaving(false);}
  }
  const renderPersonal = (extra = {}) => {
    const context = { mode: extra.speedLevel ? 'speed' : 'all', level: extra.speedLevel || 1 };
    const state = participation({ profile, highest, ...extra });
    const signIn = rankingSignIn(context, catalog.publishedCount);
    return <SudokuRankPersonal profile={profile} highest={highest} total={total} rank={mine} loading={waiting} error={error} play={play} playLabel={playLabel} balance={progress.balance} participation={state} timing={data?.personal} {...extra}>
    {state.id !== 'public' && <div className="sd-ranks-eligibility"><h4>{translateUi(state.title)}</h4><p>{translateUi(state.text)}</p>{!profile.authenticated && <a data-sudoku-event="sudoku_board_signin" href={localHref(signIn)}>{state.id === 'guest-result' ? translateUi('Keep my result and choose sharing') : translateUi('Sign in to keep my progress')}<ArrowRight size={14} aria-hidden="true" /></a>}</div>}
    <div className="sd-ranks-visibility" title={translateUi("You control whether your nickname and scores appear publicly")}>{profile.listed && profile.authenticated ? <><Globe size={15} aria-hidden="true" />{translateUi("Public profile")}</> : <><LockSimple size={15} aria-hidden="true" />{translateUi("Private progress")}</>}</div>
    {profile.authenticated && <button ref={editButton} className="sd-ranks-edit" aria-expanded={editing} aria-controls="sd-ranks-profile" onClick={() => {setProfileError('');setNotice('');setEditing((v) => !v);}}>{translateUi("Manage public profile")}</button>}
    {editing && profile.authenticated && <form id="sd-ranks-profile" className="sd-ranks-profile" onSubmit={save}><h4>{translateUi("Public profile")}</h4><label htmlFor="sd-ranks-nickname">{translateUi("Public nickname")}</label><input ref={editor} id="sd-ranks-nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} minLength={3} maxLength={20} pattern="[A-Za-z0-9 _\-]{3,20}" required aria-describedby="sd-ranks-name-help" disabled={saving} /><small id="sd-ranks-name-help">{translateUi("3\u201320 letters, numbers, spaces, underscores or hyphens.")}</small><label className="sd-ranks-opt-in"><input type="checkbox" checked={listed} onChange={(e) => setListed(e.target.checked)} disabled={saving} />{translateUi("Show my nickname and scores publicly")}</label><p>{translateUi("You can hide your profile again without losing progress.")}</p>{profileError && <p className="sd-error" role="alert">{translateUi(profileError)}</p>}<div><button type="submit" disabled={saving}>{saving ? translateUi('Saving…') : translateUi('Save profile')}</button><button type="button" onClick={closeEditor} disabled={saving}>{translateUi("Cancel")}</button></div></form>}
    {notice && <p className="sd-ranks-notice" role="status">{translateUi(notice)}</p>}
    {local && !profile.authenticated && <details className="sd-ranks-local"><summary>{translateUi("Local testing")}</summary><p>{translateUi("Test account only. No production scores.")}</p><button disabled={saving} onClick={async () => {setSaving(true);try {await api('/local-login', {});await onLocalLogin();setRevision((n) => n + 1);} catch (e) {setProfileError(e.message);} finally {setSaving(false);}}}>{translateUi("Create local test account")}</button>{profileError && <p role="alert">{translateUi(profileError)}</p>}</details>}
</SudokuRankPersonal>;
  };
  return <div id="leaderboard-board" className="sd-ranks-page">{speedEnabled && <div className="sd-ranks-tabs" role="group" aria-label={translateUi("Leaderboard type")}><button aria-pressed={!speedTab} onClick={() => selectMode(false)}><RankIcon kind="all" size={21} />{translateUi("All clears")}</button><button aria-pressed={speedTab} onClick={() => selectMode(true)}><RankIcon kind="speed" size={21} />{translateUi("Single-level speed")}</button></div>}{speedEnabled && speedTab ? <SudokuSpeed api={api} progress={progress} catalog={catalog} profile={profile} renderPersonal={renderPersonal} onManageProfile={() => setEditing(true)} /> : <div>

  <div className="sd-ranks-layout">
   <section className="sd-panel sd-ranks-board" aria-labelledby="sd-ranks-board-title">
    <div className="sd-ranks-board-heading"><RankIcon kind="all" size={30} /><div><h3 id="sd-ranks-board-title">{translateUi("Levels cleared leaderboard")}</h3><span>{data?.participants != null ? translateUi("{value0} public {value1} \xB7 ", { value0: data.participants, value1: data.participants === 1 ? 'player' : 'players' }) : translateUi('')}{translateUi("Top 50 players \xB7 clears, then first-clear time")}</span></div><button className="sd-ranks-refresh" aria-label={translateUi("Refresh leaderboard")} disabled={loading} onClick={() => setRevision((n) => n + 1)}><ArrowClockwise size={19} aria-hidden="true" /></button></div>

    <p className="sd-ranks-definition">{translateUi(config.description)}</p><p className="sd-ranks-mobile-summary">{translateUi("Cleared ")}<strong>{translateUi(highest)} / {translateUi(total)}</strong> · <a href="#my-results">{translateUi("My results and profile")}</a><a className="sd-ranks-mobile-play" data-sudoku-event="sudoku_board_play" data-board-mode="all" href={localHref(play)}>{translateUi(playLabel)}</a></p>
    {error && data && <p className="sd-ranks-network-error" role="alert">{translateUi("Unable to refresh. Showing the last received results; your progress is kept.")}</p>}
    <div className="sd-ranks-results" aria-busy={loading}>
     {error && !data ? <div className="sd-ranks-empty error" role="alert"><Info size={30} aria-hidden="true" /><h4>{translateUi("Rankings could not be loaded")}</h4><p>{translateUi("Your saved progress is safe. Try loading the board again.")}</p><button onClick={() => setRevision((n) => n + 1)}>{translateUi("Try again")}</button></div> : waiting ? <div className="sd-ranks-empty" role="status"><ArrowClockwise size={30} aria-hidden="true" /><p>{translateUi("Loading ")}{translateUi(config.label.toLowerCase())}…</p></div> : data.rows.length ? <>
      <div className="sd-ranks-scroll" tabIndex={0} role="region" aria-label={translateUi("Top 50 players, scroll to browse")}><table className="sd-ranks-table sd-ranks-total-table"><caption className="sd-ranks-sr">{translateUi(config.label)}{translateUi(": up to 50 public players. There are ")}{translateUi(total)}{translateUi(" published levels.")}</caption><thead><tr><th scope="col">{translateUi("Rank")}</th><th scope="col">{translateUi("Player")}</th><th scope="col">{translateUi("Cleared")}</th><th scope="col">{translateUi("First-clear time")}</th></tr></thead><tbody>{data.rows.map((r, i) => <tr key={i} className={r.mine ? 'is-you' : ''}><td><span className={'sd-rank-position sd-rank-with-medal place-' + r.rank} role="img" aria-label={translateUi("Rank {value0}", { value0: r.rank })}><SudokuRankMedal rank={r.rank} /></span></td><td><span className="sd-rank-name">{r.nickname}</span>{r.mine && <span className="sd-rank-you">{translateUi("You")}</span>}</td><td><strong>{translateUi(r.score)}</strong><div className="sd-rank-track" aria-hidden="true"><span style={{ width: Math.min(100, r.score / total * 100) + '%' }} /></div></td><td><strong>{translateUi(campaignTime(r.elapsedMs))}</strong>{r.elapsedMs == null && <small className="sd-rank-time-note">{translateUi("Timing incomplete")}</small>}</td></tr>)}</tbody></table></div>
      <OwnRankRow rank={mine} mode="all" /><p className="sd-ranks-list-note">{translateUi("Showing ")}{translateUi(data.rows.length)}{translateUi(" of ")}{translateUi(data.participants)}{translateUi(" public players. Scroll the list to browse. Your personal rank includes everyone.")}</p>
     </> : <div className="sd-ranks-empty sd-ranks-empty-public"><SudokuRankEmptyTable /><h4>{translateUi("No public scores yet")}</h4><p>{translateUi("Anyone can view this board. No sign-in or completed level is needed.")}</p><div className="sd-ranks-join">{highest > 0 && !profile.listed ? <><h5>{translateUi("Want to share your results?")}</h5><p>{translateUi("Your ")}{translateUi(highest)}{translateUi(" first clears are saved privately. Public sharing is your choice.")}</p>{profile.authenticated ? <button className="sd-primary" onClick={() => setEditing(true)}>{translateUi("Choose public sharing")}</button> : <a className="sd-action-link" data-sudoku-event="sudoku_board_signin" data-board-mode="all" href={localHref(rankingSignIn({ mode: 'all' }, total))}>{translateUi("Keep my result and choose sharing")}<ArrowRight size={16} aria-hidden="true" /></a>}</> : <><h5>{translateUi("Want to join the board?")}</h5><p>{translateUi("Complete a level, sign in and turn on public sharing to add your own score. Sharing is optional.")}</p><a className="sd-action-link" data-sudoku-event="sudoku_board_play" data-board-mode="all" href={localHref(play)}>{translateUi(playLabel)}<ArrowRight size={16} aria-hidden="true" /></a></>}</div></div>}
    </div>
    {!error && !waiting && <p className="sd-ranks-updated" role="status">{translateUi("Checks every 30 seconds while visible. ")}<button onClick={() => setRevision((n) => n + 1)}>{translateUi("Refresh")}</button></p>}
   </section>
   {translateUi(renderPersonal())}
  </div>

 </div>} </div>;
}
