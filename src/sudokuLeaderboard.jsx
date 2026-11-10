import RankIcon from './sudokuRankIcon.jsx';
import {campaignTime,OwnRankRow} from './sudokuRankPersonal.jsx';
import {rankingSignIn,rankingContext,participation} from '../shared/sudoku/leaderboard-context.mjs';
import {trackConversionEvent} from './analytics.js';
import SudokuRankPersonal from './sudokuRankPersonal.jsx';
import SudokuSpeed from './sudokuSpeed.jsx';
import {useEffect,useRef,useState} from 'react';
import {Trophy,Medal,Timer,ArrowRight,ArrowClockwise,LockSimple,Globe,Info} from '@phosphor-icons/react';
import {publicCatalog} from '../shared/sudoku/catalog.mjs';
import './sudoku-leaderboard.css';

const config={label:'All clears',description:'More clears first. At the same clear count, a shorter first-clear total ranks higher. Hints are welcome.'};

export default function SudokuLeaderboard({api,progress,profile,onProfile,local,onLocalLogin,catalog=publicCatalog,speedEnabled=false}){
 const selectedSpeedLevel=useRef(new URLSearchParams(location.search).get('level'));
 const selectMode=speed=>{trackConversionEvent('sudoku_board_switch',{mode:speed?'speed':'all'});setSpeedTab(speed);const u=new URL(location.href);if(speed){u.searchParams.set('mode','speed');u.searchParams.set('level',selectedSpeedLevel.current||Math.min(progress.highest+1,catalog.publishedCount));}else{selectedSpeedLevel.current=u.searchParams.get('level');u.searchParams.delete('mode');u.searchParams.delete('level');}history.replaceState(null,'',u);window.dispatchEvent(new Event('sudoku-ranking-context'));};
 const mode='all';const[speedTab,setSpeedTab]=useState(new URLSearchParams(location.search).get('mode')==='speed');
 const [revision,setRevision]=useState(0),[rawData,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const data=rawData?.profile?.storageKey===profile.storageKey?rawData:null;
 const [editing,setEditing]=useState(false),[nickname,setNickname]=useState(profile.nickname),[listed,setListed]=useState(profile.listed),[saving,setSaving]=useState(false),[profileError,setProfileError]=useState(''),[notice,setNotice]=useState('');
 const editButton=useRef(null),editor=useRef(null);
 useEffect(()=>{if(speedEnabled&&speedTab)return;let active=true,timer;setLoading(true);setError('');
  api('/leaderboard?mode='+mode).then(r=>{if(active){setData(r);setLoading(false);}}).catch(e=>{if(active){setError(e.message);setLoading(false);}});
  const update=()=>{if(!document.hidden)setRevision(n=>n+1);};timer=setInterval(update,30000);document.addEventListener('visibilitychange',update);window.addEventListener('focus',update);return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',update);window.removeEventListener('focus',update);};
 },[mode,revision,profile.storageKey,profile.listed,speedEnabled,speedTab]);
 useEffect(()=>{setNickname(profile.nickname);setListed(profile.listed);},[profile.nickname,profile.listed]);
 useEffect(()=>{if(editing){editor.current?.focus();}},[editing]);
 useEffect(()=>{if(profile.authenticated&&rankingContext(location.search,catalog.publishedCount).profile){setEditing(true);setNotice('Your saved progress is linked. Choose whether to share your results.');}},[profile.authenticated]);
 const waiting=!data||data.mode!==mode;
 const total=data?.catalog?.publishedCount||catalog.publishedCount;
 const highest=data?.personal?.highest??progress.highest;
 const score=highest,mine=!waiting&&!error?data?.mine:null;
 const status=!profile.authenticated?'guest':!profile.listed?'private':!highest?'no_clears':'ranked';
 const level=Math.min(highest+1,total),play=highest===total?'/en/sudoku/levels/':'/en/sudoku/play/?level='+level;
 const playLabel=highest===total?'Revisit your levels':highest===0?'Start level 1':'Continue level '+level;
 function closeEditor(){setEditing(false);const u=new URL(location.href);u.searchParams.delete('profile');u.hash='my-results';history.replaceState(null,'',u);window.dispatchEvent(new Event('sudoku-ranking-context'));setNickname(profile.nickname);setListed(profile.listed);setProfileError('');editButton.current?.focus();}
 async function save(e){e.preventDefault();if(saving)return;setSaving(true);setProfileError('');setNotice('');
  try{const r=await api('/profile',{nickname,listed});onProfile(r.profile);setNotice(r.profile.listed?'Public profile saved. Eligible scores appear on the leaderboard.':'Your scores are private. Your progress is kept.');setRevision(n=>n+1);closeEditor();}
  catch(e){setProfileError(e.message);}finally{setSaving(false);}
 }
 const renderPersonal=(extra={})=>{
  const context={mode:extra.speedLevel?'speed':'all',level:extra.speedLevel||1};
  const state=participation({profile,highest,...extra});
  const signIn=rankingSignIn(context,catalog.publishedCount);
  return <SudokuRankPersonal profile={profile} highest={highest} total={total} rank={mine} loading={waiting} error={error} play={play} playLabel={playLabel} balance={progress.balance} participation={state} timing={data?.personal} {...extra}>
    {state.id!=='public'&&<div className="sd-ranks-eligibility"><h4>{state.title}</h4><p>{state.text}</p>{!profile.authenticated&&<a data-sudoku-event="sudoku_board_signin" href={signIn}>{state.id==='guest-result'?'Keep my result and choose sharing':'Sign in to keep my progress'}<ArrowRight size={14} aria-hidden="true"/></a>}</div>}
    <div className="sd-ranks-visibility" title="You control whether your nickname and scores appear publicly">{profile.listed&&profile.authenticated?<><Globe size={15} aria-hidden="true"/>Public profile</>:<><LockSimple size={15} aria-hidden="true"/>Private progress</>}</div>
    {profile.authenticated&&<button ref={editButton} className="sd-ranks-edit" aria-expanded={editing} aria-controls="sd-ranks-profile" onClick={()=>{setProfileError('');setNotice('');setEditing(v=>!v);}}>Manage public profile</button>}
    {editing&&profile.authenticated&&<form id="sd-ranks-profile" className="sd-ranks-profile" onSubmit={save}><h4>Public profile</h4><label htmlFor="sd-ranks-nickname">Public nickname</label><input ref={editor} id="sd-ranks-nickname" value={nickname} onChange={e=>setNickname(e.target.value)} minLength={3} maxLength={20} pattern="[A-Za-z0-9 _\-]{3,20}" required aria-describedby="sd-ranks-name-help" disabled={saving}/><small id="sd-ranks-name-help">3–20 letters, numbers, spaces, underscores or hyphens.</small><label className="sd-ranks-opt-in"><input type="checkbox" checked={listed} onChange={e=>setListed(e.target.checked)} disabled={saving}/>Show my nickname and scores publicly</label><p>You can hide your profile again without losing progress.</p>{profileError&&<p className="sd-error" role="alert">{profileError}</p>}<div><button type="submit" disabled={saving}>{saving?'Saving…':'Save profile'}</button><button type="button" onClick={closeEditor} disabled={saving}>Cancel</button></div></form>}
    {notice&&<p className="sd-ranks-notice" role="status">{notice}</p>}
    {local&&!profile.authenticated&&<details className="sd-ranks-local"><summary>Local testing</summary><p>Test account only. No production scores.</p><button disabled={saving} onClick={async()=>{setSaving(true);try{await api('/local-login',{});await onLocalLogin();setRevision(n=>n+1);}catch(e){setProfileError(e.message);}finally{setSaving(false);}}}>Create local test account</button>{profileError&&<p role="alert">{profileError}</p>}</details>}
</SudokuRankPersonal>;
 };
 return <div id="leaderboard-board" className="sd-ranks-page">{speedEnabled&&<div className="sd-ranks-tabs" role="group" aria-label="Leaderboard type"><button aria-pressed={!speedTab} onClick={()=>selectMode(false)}><RankIcon kind="all" size={21}/>All clears</button><button aria-pressed={speedTab} onClick={()=>selectMode(true)}><RankIcon kind="speed" size={21}/>Single-level speed</button></div>}{speedEnabled&&speedTab?<SudokuSpeed api={api} progress={progress} catalog={catalog} profile={profile} renderPersonal={renderPersonal} onManageProfile={()=>setEditing(true)}/>:<div>

  <div className="sd-ranks-layout">
   <section className="sd-panel sd-ranks-board" aria-labelledby="sd-ranks-board-title">
    <div className="sd-ranks-board-heading"><RankIcon kind="all" size={30}/><div><h3 id="sd-ranks-board-title">Levels cleared leaderboard</h3><span>{data?.participants!=null?data.participants+' public '+(data.participants===1?'player':'players')+' · ':''}Top 50 players · clears, then first-clear time</span></div><button className="sd-ranks-refresh" aria-label="Refresh leaderboard" disabled={loading} onClick={()=>setRevision(n=>n+1)}><ArrowClockwise size={19} aria-hidden="true"/></button></div>

    <p className="sd-ranks-definition">{config.description}</p><p className="sd-ranks-mobile-summary">Cleared <strong>{highest} / {total}</strong> · <a href="#my-results">My results and profile</a><a className="sd-ranks-mobile-play" data-sudoku-event="sudoku_board_play" data-board-mode="all" href={play}>{playLabel}</a></p>
    {error&&data&&<p className="sd-ranks-network-error" role="alert">Unable to refresh. Showing the last received results; your progress is kept.</p>}
    <div className="sd-ranks-results" aria-busy={loading}>
     {error&&!data?<div className="sd-ranks-empty error" role="alert"><Info size={30} aria-hidden="true"/><h4>Rankings could not be loaded</h4><p>Your saved progress is safe. Try loading the board again.</p><button onClick={()=>setRevision(n=>n+1)}>Try again</button></div>:waiting?<div className="sd-ranks-empty" role="status"><ArrowClockwise size={30} aria-hidden="true"/><p>Loading {config.label.toLowerCase()}…</p></div>:data.rows.length?<>
      <div className="sd-ranks-scroll" tabIndex={0} role="region" aria-label="Top 50 players, scroll to browse"><table className="sd-ranks-table sd-ranks-total-table"><caption className="sd-ranks-sr">{config.label}: up to 50 public players. There are {total} published levels.</caption><thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Cleared</th><th scope="col">First-clear time</th></tr></thead><tbody>{data.rows.map((r,i)=><tr key={i} className={r.mine?'is-you':''}><td><span className={'sd-rank-position place-'+r.rank}>{r.rank<=3?<RankIcon kind="medal" size={18}/>:null}<b>{r.rank}</b></span></td><td><span className="sd-rank-name">{r.nickname}</span>{r.mine&&<span className="sd-rank-you">You</span>}</td><td><strong>{r.score}</strong><div className="sd-rank-track" aria-hidden="true"><span style={{width:Math.min(100,r.score/total*100)+'%'}}/></div></td><td><strong>{campaignTime(r.elapsedMs)}</strong>{r.elapsedMs==null&&<small className="sd-rank-time-note">Timing incomplete</small>}</td></tr>)}</tbody></table></div>
      <OwnRankRow rank={mine} mode="all"/><p className="sd-ranks-list-note">Showing {data.rows.length} of {data.participants} public players. Scroll the list to browse. Your personal rank includes everyone.</p>
     </>:<div className="sd-ranks-empty">{highest>0&&!profile.listed?<><h4>Your cleared levels are ready to share</h4><p>Your {highest} first clears are saved privately. Public sharing is your choice.</p>{profile.authenticated?<button className="sd-primary" onClick={()=>setEditing(true)}>Choose public sharing</button>:<a className="sd-action-link" data-sudoku-event="sudoku_board_signin" data-board-mode="all" href={rankingSignIn({mode:'all'},total)}>Keep my result and choose sharing<ArrowRight size={16} aria-hidden="true"/></a>}</>:<><h4>Be among the first on the board</h4><p>Complete a level, then choose to share your nickname and score. You could be among the first players on this board.</p><a className="sd-action-link" data-sudoku-event="sudoku_board_play" data-board-mode="all" href={play}>{playLabel}<ArrowRight size={16} aria-hidden="true"/></a></>}</div>}
    </div>
    {!error&&!waiting&&<p className="sd-ranks-updated" role="status">Checks every 30 seconds while visible. <button onClick={()=>setRevision(n=>n+1)}>Refresh</button></p>}
   </section>
   {renderPersonal()}
  </div>

 </div>} </div>;
}
