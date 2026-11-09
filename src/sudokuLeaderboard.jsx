import {useEffect,useRef,useState} from 'react';
import {Trophy,Medal,CheckCircle,Lightbulb,ArrowRight,ArrowClockwise,UserCircle,LockSimple,Globe,Info} from '@phosphor-icons/react';
import {publicCatalog} from '../shared/sudoku/catalog.mjs';
import './sudoku-leaderboard.css';

const signIn='/en/account/?returnTo=%2Fen%2Fsudoku%2Fleaderboard%2F';
const config={label:'All clears',description:'Every verified first clear counts equally. Thinking hints are welcome.'};

export default function SudokuLeaderboard({api,progress,profile,onProfile,local,onLocalLogin,catalog=publicCatalog}){
 const mode='all';
 const [revision,setRevision]=useState(0),[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [editing,setEditing]=useState(false),[nickname,setNickname]=useState(profile.nickname),[listed,setListed]=useState(profile.listed),[saving,setSaving]=useState(false),[profileError,setProfileError]=useState(''),[notice,setNotice]=useState('');
 const editButton=useRef(null),editor=useRef(null);
 useEffect(()=>{let active=true;setLoading(true);setError('');
  api('/leaderboard?mode='+mode).then(r=>{if(active){setData(r);setLoading(false);}}).catch(e=>{if(active){setError(e.message);setLoading(false);}});
  return()=>{active=false;};
 },[mode,revision,profile.storageKey,profile.listed]);
 useEffect(()=>{setNickname(profile.nickname);setListed(profile.listed);},[profile.nickname,profile.listed]);
 useEffect(()=>{if(editing)editor.current?.focus();},[editing]);
 const waiting=loading||data?.mode!==mode;
 const total=data?.catalog?.publishedCount||catalog.publishedCount;
 const highest=data?.personal?.highest??progress.highest;
 const score=highest,mine=!waiting&&!error?data?.mine:null;
 const status=!profile.authenticated?'guest':!profile.listed?'private':!highest?'no_clears':'ranked';
 const level=Math.min(highest+1,total),play=highest===total?'/en/sudoku/levels/':'/en/sudoku/play/?level='+level;
 const playLabel=highest===total?'Revisit your levels':highest===0?'Start level 1':'Continue level '+level;
 function closeEditor(){setEditing(false);setNickname(profile.nickname);setListed(profile.listed);setProfileError('');editButton.current?.focus();}
 async function save(e){e.preventDefault();if(saving)return;setSaving(true);setProfileError('');setNotice('');
  try{const r=await api('/profile',{nickname,listed});onProfile(r.profile);setNotice(r.profile.listed?'Public profile saved. Eligible first clears appear on the leaderboard.':'Your scores are private. Your progress is kept.');setRevision(n=>n+1);closeEditor();}
  catch(e){setProfileError(e.message);}finally{setSaving(false);}
 }
 const explanations={guest:'Your progress stays private as a guest. Sign in, then choose whether to share your nickname and scores.',private:'Your scores are private. You can join the public leaderboard whenever you are ready.',no_clears:'Your public profile is ready. Complete level 1 to get your first score.'};
 return <div className="sd-ranks-page">
  <section className="sd-ranks-intro" aria-labelledby="sd-ranks-title"><div><span className="sd-eyebrow">ONE MORE CLEAR. ONE STEP FURTHER.</span><h2 id="sd-ranks-title">See how far you can go</h2><p>Compare real progress, celebrate each clear, and keep your own pace.</p></div><a className="sd-action-link" href={play}>{playLabel}<ArrowRight size={17} aria-hidden="true"/></a></section>
  <div className="sd-ranks-layout">
   <section className="sd-panel sd-ranks-board" aria-labelledby="sd-ranks-board-title">
    <div className="sd-ranks-board-heading"><span className="sd-ranks-icon trophy"><Trophy size={24} aria-hidden="true"/></span><div><h3 id="sd-ranks-board-title">The community trail</h3><span>Top 50 players · equal scores share a rank</span></div><button className="sd-ranks-refresh" aria-label="Refresh leaderboard" disabled={loading} onClick={()=>setRevision(n=>n+1)}><ArrowClockwise size={19} aria-hidden="true"/></button></div>

    <p className="sd-ranks-definition">{config.description}</p>
    <div className="sd-ranks-results" aria-busy={loading}>
     {error?<div className="sd-ranks-empty error" role="alert"><Info size={30} aria-hidden="true"/><h4>Rankings could not be loaded</h4><p>Your saved progress is safe. Try loading the board again.</p><button onClick={()=>setRevision(n=>n+1)}>Try again</button></div>:waiting?<div className="sd-ranks-empty" role="status"><ArrowClockwise size={30} aria-hidden="true"/><p>Loading {config.label.toLowerCase()}…</p></div>:data.rows.length?<>
      <table className="sd-ranks-table"><caption className="sd-ranks-sr">{config.label}: up to 50 public players. There are {total} published levels.</caption><thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Cleared</th></tr></thead><tbody>{data.rows.map((r,i)=><tr key={i} className={r.mine?'is-you':''}><td><span className={'sd-rank-position place-'+r.rank}>{r.rank<=3?<Medal size={20} aria-hidden="true"/>:null}<b>{r.rank}</b></span>{r.tied&&<small className="sd-rank-tied">Tied</small>}</td><td><span className="sd-rank-name">{r.nickname}</span>{r.mine&&<span className="sd-rank-you">You</span>}</td><td><strong>{r.score}<small> / {total}</small></strong><div className="sd-rank-track" aria-hidden="true"><span style={{width:Math.min(100,r.score/total*100)+'%'}}/></div></td></tr>)}</tbody></table>
      <p className="sd-ranks-list-note">Showing {data.rows.length} of up to 50 players. Your own rank appears in My progress, including outside this list.</p>
     </>:<div className="sd-ranks-empty"><span className="sd-ranks-empty-icon"><Trophy size={36} aria-hidden="true"/></span><h4>The first explorers start here</h4><p>Complete a level, then choose to share your nickname and score. You could be among the first players on this board.</p><a className="sd-action-link" href={play}>{playLabel}<ArrowRight size={16} aria-hidden="true"/></a></div>}
    </div>
    {!error&&!waiting&&<p className="sd-ranks-updated" role="status">Scores loaded from saved results. <button onClick={()=>setRevision(n=>n+1)}>Refresh</button></p>}
   </section>
   <aside className="sd-panel sd-ranks-personal" aria-labelledby="sd-ranks-personal-title"><div className="sd-ranks-personal-heading"><span className="sd-ranks-icon personal"><UserCircle size={24} aria-hidden="true"/></span><div><h3 id="sd-ranks-personal-title">My progress</h3><span>{profile.authenticated?profile.nickname:'Guest explorer'}</span></div></div>
    <div className="sd-ranks-my-rank"><span>{config.label} rank</span><strong>{error?'Unavailable':waiting?'Loading…':mine?`${mine.tied?'Joint ':''}#${mine.rank}`:'Not listed yet'}</strong>{mine&&<small>{score} first {score===1?'clear':'clears'} on this board</small>}</div>
    <dl className="sd-ranks-stats"><div><dt><CheckCircle size={17} aria-hidden="true"/>All clears</dt><dd>{highest}<small> / {total}</small></dd></div></dl>
    <div className="sd-ranks-personal-track" role="progressbar" aria-label="Overall campaign progress" aria-valuenow={highest} aria-valuemin={0} aria-valuemax={total}><span style={{width:Math.min(100,highest/total*100)+'%'}}/></div>
    <p className="sd-ranks-milestone">{highest===total?'All published levels complete. Your progress is ready for future additions.':`${Math.ceil((highest+1)/10)*10-highest} more ${Math.ceil((highest+1)/10)*10-highest===1?'clear':'clears'} to finish chapter ${Math.ceil((highest+1)/10)}.`}</p>
    <a className="sd-action-link" href={play}>{playLabel}<ArrowRight size={16} aria-hidden="true"/></a>
    {status!=='ranked'&&<div className="sd-ranks-eligibility"><p>{explanations[status]}</p>{status==='guest'&&<a href={signIn}>Sign in to join the leaderboard<ArrowRight size={14} aria-hidden="true"/></a>}</div>}
    <div className="sd-ranks-visibility">{profile.listed&&profile.authenticated?<><Globe size={15} aria-hidden="true"/>Public profile</>:<><LockSimple size={15} aria-hidden="true"/>Private progress</>}</div>
    {profile.authenticated&&<button ref={editButton} className="sd-ranks-edit" aria-expanded={editing} aria-controls="sd-ranks-profile" onClick={()=>{setProfileError('');setNotice('');setEditing(v=>!v);}}>Manage public profile</button>}
    {editing&&profile.authenticated&&<form id="sd-ranks-profile" className="sd-ranks-profile" onSubmit={save}><h4>Public profile</h4><label htmlFor="sd-ranks-nickname">Public nickname</label><input ref={editor} id="sd-ranks-nickname" value={nickname} onChange={e=>setNickname(e.target.value)} minLength={3} maxLength={20} pattern="[A-Za-z0-9 _\-]{3,20}" required aria-describedby="sd-ranks-name-help" disabled={saving}/><small id="sd-ranks-name-help">3–20 letters, numbers, spaces, underscores or hyphens.</small><label className="sd-ranks-opt-in"><input type="checkbox" checked={listed} onChange={e=>setListed(e.target.checked)} disabled={saving}/>Show my nickname and scores publicly</label><p>You can hide your profile again without losing progress.</p>{profileError&&<p className="sd-error" role="alert">{profileError}</p>}<div><button type="submit" disabled={saving}>{saving?'Saving…':'Save profile'}</button><button type="button" onClick={closeEditor} disabled={saving}>Cancel</button></div></form>}
    {notice&&<p className="sd-ranks-notice" role="status">{notice}</p>}
    {local&&!profile.authenticated&&<details className="sd-ranks-local"><summary>Local testing</summary><p>Test account only. No production scores.</p><button disabled={saving} onClick={async()=>{setSaving(true);try{await api('/local-login',{});await onLocalLogin();setRevision(n=>n+1);}catch(e){setProfileError(e.message);}finally{setSaving(false);}}}>Create local test account</button>{profileError&&<p role="alert">{profileError}</p>}</details>}
   </aside>
  </div>
  <section className="sd-ranks-rules" aria-labelledby="sd-ranks-rules-title"><h3 id="sd-ranks-rules-title"><Info size={21} aria-hidden="true"/>How scores work</h3><div className="sd-ranks-rule-grid"><div><CheckCircle size={21} aria-hidden="true"/><h4>Every first clear matters</h4><p>All clears counts each campaign level once. Replays never add extra clears.</p></div><div><Lightbulb size={21} aria-hidden="true"/><h4>Hints help you learn</h4><p>Hints explain deductions and never reduce your ranking score. Each verified new level adds one clear, whether you use points or solve unaided.</p></div><div><Medal size={21} aria-hidden="true"/><h4>A shared place is a fair place</h4><p>Equal scores share a rank. Time and point balance do not break ties. These are casual rankings; external solving tools cannot be ruled out.</p></div></div><div className="sd-ranks-footer"><span><LockSimple size={15} aria-hidden="true"/>Only signed-in players who opt in appear publicly.</span><a href="/en/sudoku/techniques/">Explore solving techniques<ArrowRight size={15} aria-hidden="true"/></a></div></section>
 </div>;
}
