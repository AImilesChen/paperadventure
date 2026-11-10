import {UserCircle,CheckCircle,Timer,ArrowRight} from '@phosphor-icons/react';
export const speedTime=s=>s==null?'No record':`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

export default function SudokuRankPersonal({profile,highest,total,rank,loading,error,play,playLabel,speedLevel,best,latest,children}){
 const speed=Boolean(speedLevel);
 return <aside className="sd-panel sd-ranks-personal" aria-labelledby="sd-ranks-personal-title">
  <div className="sd-ranks-personal-heading"><span className="sd-ranks-icon personal"><UserCircle size={24} aria-hidden="true"/></span><div><h3 id="sd-ranks-personal-title">{speed?'My level '+speedLevel+' results':'My progress'}</h3><span>{profile.authenticated?profile.nickname:'Guest explorer'}</span></div></div>
  <div className="sd-ranks-my-rank"><span>{speed?'Single-level speed':'All clears'} rank</span><strong>{error?'Unavailable':loading?'Loading…':rank?`${rank.tied?'Joint ':''}#${rank.rank}`:'Not listed yet'}</strong>{rank&&<small>Your rank includes players outside the top 50.</small>}</div>
  <dl className="sd-ranks-stats">{speed&&<div><dt><Timer size={18} aria-hidden="true"/>My best time</dt><dd>{loading?'…':speedTime(best)}</dd></div>}<div><dt><CheckCircle size={18} aria-hidden="true"/>Levels cleared</dt><dd>{highest}<small> / {total}</small></dd></div></dl>
  {speed?latest?.status==='pending'?<p className="sd-ranks-review-note" role="status">Your clear is saved. This attempt is awaiting timing review; any earlier valid best still counts.</p>:latest?.status==='invalid'?<p className="sd-ranks-review-note" role="status">Your latest time is not eligible. Your clear and any earlier valid best are kept.</p>:!loading&&best==null&&<p className="sd-ranks-milestone">Complete a server-timed attempt to record your first best time for this level.</p>:<><div className="sd-ranks-personal-track" role="progressbar" aria-label="Overall campaign progress" aria-valuenow={highest} aria-valuemin={0} aria-valuemax={total}><span style={{width:Math.min(100,highest/total*100)+'%'}}/></div><p className="sd-ranks-milestone">{highest===total?'All published levels complete. Revisit a favourite puzzle.':`${Math.min(total,Math.ceil((highest+1)/10)*10)-highest} more clears to finish chapter ${Math.ceil((highest+1)/10)}.`}</p></>}
  <a className="sd-action-link" href={play}>{playLabel}<ArrowRight size={16} aria-hidden="true"/></a>
  {children}
 </aside>;
}
