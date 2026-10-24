import PrintedComparison from './printedComparison.jsx';
import {useEffect,useRef,useState} from 'react';
import {PlanPreview} from './creatorPlanPreview.jsx';
import './postDeliveryEditor.css';

const busyStatuses=['plan_queued','plan_generating','queued','generating'];
const activeStatuses=[...busyStatuses,'plan_review','ready'];
const phases={plan:'Preparing your proposed changes',approval:'Your plan is ready to review',baseline:'Preparing the checked paper game',frame:'Preparing the story',material1:'Creating checkpoint 1',material2:'Creating checkpoint 2',material3:'Creating checkpoint 3',material4:'Creating checkpoint 4',closing:'Preparing the ending',assemble:'Checking the five puzzles',pdf:'Creating both PDFs',wording:'Preparing your checkpoint suggestion',comparison:'Your PDF comparison is ready'};
const styles=[['reading','Make the reading easier'],['hint','Give a clearer hint'],['steps','Explain it step by step']];
const plays=[['reasoning','Compare evidence'],['sequence','Arrange a sequence'],['code','Decode a message'],['discussion','Discuss and check']];
const failureText={EDITION_SCOPE:'This idea changes the story, puzzle or rules. Choose “Adjust the whole game” to propose that change.',EDITION_NO_CHANGE:'This suggestion did not change the printed files. No successful change was used.',EDITION_STALE:'Your current version has changed. Discard this candidate before making a new request.'};

export default function PostDeliveryEditor({order,refresh,api,legacy}){
 const [workspace,setWorkspace]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [kind,setKind]=useState('checkpoint'),[stage,setStage]=useState(1),[feedback,setFeedback]=useState(''),[style,setStyle]=useState(null);
 const [gameplay,setGameplay]=useState(null);const requestKey=useRef(null);
 const eligible=order.kind==='custom'&&order.filesReady;
 async function load(){try{const data=await api(`/api/v1/orders/${order.id}/editions`);setWorkspace(data);setGameplay(value=>value||data.gameplay);return data;}catch(failure){setError(failure.message);}}
 useEffect(()=>{if(eligible)load();},[order.id,eligible]);
 const pending=workspace?.candidate;
 useEffect(()=>{if(activeStatuses.includes(pending?.status))setKind(pending.kind);},[pending?.id,pending?.status]);
 useEffect(()=>{if(!busyStatuses.includes(pending?.status))return;const timer=setInterval(load,4000);return()=>clearInterval(timer);},[order.id,pending?.status]);
 if(!eligible)return null;
 if(!workspace)return <section className="live-panel delivery-editor"><h2>Change your delivered game</h2><p role="status">Loading your saved versions…</p>{error&&<p role="alert">{error}</p>}<button type="button" className="button-quiet" onClick={load}>Reload change options</button></section>;
 if(!workspace.available)return <><section className="live-panel delivery-editor"><h2>Your original game files</h2><p>Use the original PDFs to review this earlier edition. A matching whole-game comparison is unavailable for this version.</p><div className="delivery-shortcuts">{['player','guide'].map(which=><a key={which} href={`/api/v1/files/${order.id}/${which}?paper=${workspace.paper}&version=${workspace.version}&view=1`} target="_blank" rel="noreferrer">Open original {which==='player'?'Player Pack':'adult guide'}</a>)}</div><a href="#delivery-recovery">Get help with this order</a></section>{workspace.previewExact?legacy:null}</>;
 const rights=workspace.rights,locked=activeStatuses.includes(pending?.status),expired=!rights.expiresAt||Date.parse(rights.expiresAt.replace(' ','T')+'Z')<=Date.now();
 const selected=locked&&pending.kind==='checkpoint'?pending.stageNumber:stage;
 const left=kind==='whole'?rights.wholeLeft:rights.checkpointLeft,attempts=kind==='whole'?rights.wholeAttemptsLeft:rights.checkpointAttemptsLeft;
 const file=(version,which)=>`/api/v1/files/${order.id}/${which}?paper=${workspace.paper}&version=${version}&view=1`;
 async function generate(event){
  event.preventDefault();setBusy(true);setError('');setNotice('');requestKey.current||=crypto.randomUUID();
  try{await api(`/api/v1/orders/${order.id}/editions`,{method:'POST',headers:{'Idempotency-Key':requestKey.current},body:JSON.stringify({kind,stageNumber:stage,feedback,style,gameplay:kind==='whole'?gameplay:undefined})});requestKey.current=null;await load();setNotice('Your current download stays available while the suggestion is prepared.');}
  catch(failure){setError(failure.message);}finally{setBusy(false);}
 }
 async function decide(action){
  setBusy(true);setError('');try{await api(`/api/v1/orders/${order.id}/editions/${pending.id}/${action}`,{method:'POST'});await load();if(action==='accept'){await refresh();setFeedback('');setStyle(null);setNotice('New version accepted. The download buttons now serve both new PDFs. Earlier versions are below.');}else if(action==='discard')setNotice('Candidate discarded. No successful change was used.');}
  catch(failure){setError(failure.message);}finally{setBusy(false);}
 }
 return <section id="order-revision" className="live-panel delivery-editor" aria-labelledby="delivery-editor-title">
  <span className="eyebrow">YOUR GAME · VERSION {workspace.version}</span><h2 id="delivery-editor-title">Make it work better for your group</h2>
  <p>Tell us your idea → preview the actual PDFs → accept the version you prefer.</p>
  <div className="delivery-edit-options" role="group" aria-label="Choose what to change">
   <button type="button" aria-pressed={kind==='checkpoint'} disabled={busy||locked} onClick={()=>{setKind('checkpoint');setFeedback('');setStyle(null);requestKey.current=null;}}><strong>Improve one checkpoint</strong><span>Reading, hints and instructions</span><b>{rights.checkpointLeft} successful changes left</b></button>
   <button type="button" aria-pressed={kind==='whole'} disabled={busy||locked} onClick={()=>{setKind('whole');setFeedback('');setStyle(null);requestKey.current=null;}}><strong>Adjust the whole game</strong><span>Story direction and supported play styles</span><b>{rights.wholeLeft} successful remakes left</b></button>
  </div>
  <p className="live-note">Included changes until {new Date(rights.expiresAt?.replace(' ','T')+'Z').toLocaleDateString()}. Accepting a checked version uses one change. Failed or discarded suggestions do not.</p>
  {!locked&&<form onSubmit={generate}>
   {kind==='checkpoint'&&<><label htmlFor="delivery-checkpoint">1. Choose a checkpoint</label><select id="delivery-checkpoint" value={stage} onChange={e=>setStage(Number(e.target.value))}>{workspace.stages.map(item=><option key={item.number} value={item.number}>{item.number}. {item.title}</option>)}</select>
    <div className="delivery-current"><strong>Currently printed · checkpoint {stage}</strong><p>{workspace.stages[stage-1]?.storyContext}</p><p>{workspace.stages[stage-1]?.clue}</p></div>
    <div className="delivery-shortcuts" role="group" aria-label="Suggested wording changes">{styles.map(([value,label])=><button type="button" className="button-quiet" key={value} aria-pressed={style===value} onClick={()=>{setStyle(value);setFeedback(label+'. Keep the existing puzzle and answer.');requestKey.current=null;}}>{label}</button>)}</div></>}
   {kind==='whole'&&<><p>First review the proposed story and play styles. Approve that plan to prepare a complete candidate; the final PDF comparison comes before replacement.</p><label htmlFor="delivery-main-play">Main play style</label><select id="delivery-main-play" value={gameplay?.primary||'reasoning'} onChange={e=>setGameplay({primary:e.target.value,secondary:plays.map(x=>x[0]).filter(x=>x!==e.target.value).slice(0,2)})}>{plays.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
    <fieldset className="delivery-supports"><legend>Two supporting styles</legend>{plays.filter(([value])=>value!==gameplay?.primary).map(([value,label])=><label key={value}><input type="checkbox" checked={gameplay?.secondary?.includes(value)||false} onChange={e=>setGameplay(current=>({...current,secondary:e.target.checked?[...current.secondary,value]:current.secondary.filter(x=>x!==value)}))}/>{label}</label>)}</fieldset></>}
   <label htmlFor="delivery-feedback">{kind==='checkpoint'?'2. What should improve?':'What should change, and what should stay?'}</label>
   <textarea id="delivery-feedback" rows={5} minLength={10} maxLength={1000} required value={feedback} onChange={e=>{setFeedback(e.target.value);setStyle(null);requestKey.current=null;}} aria-describedby="delivery-scope delivery-count" placeholder={kind==='checkpoint'?'For example: Our younger readers lose their place. Help them follow one instruction at a time.':'For example: Keep the characters and setting, but use more decoding and make the story about finding the lost letter.'}/>
   <div className="delivery-feedback-meta"><span id="delivery-scope">{kind==='checkpoint'?'We adapt reading guidance and adult hints using checked wording. Printed rules, pieces and answers stay fixed. Use whole-game changes for a new story or play style.':'Changes use supported paper activities. Your current version remains available.'}</span><span id="delivery-count">{feedback.length}/1000</span></div>
   <button className="button" type="submit" disabled={busy||expired||left<=0||attempts<=0||kind==='whole'&&gameplay?.secondary?.length!==2}>{busy?'Submitting…':kind==='whole'?'Propose a new version':'Prepare my PDF comparison'}</button>
   <details><summary>Comparison limits</summary><p>{attempts} preparation attempts remain for this option. These finite attempts are separate from successful replacements. A failed suggestion uses an attempt, but no successful change. The deadline stays tied to your first delivery.</p></details>
   {(expired||left<=0||attempts<=0)&&<p role="status">{expired?'The included change window has ended.':left<=0?'No successful changes remain for this option.':'No preparation attempts remain for this option.'} Your published downloads and version history remain available.</p>}
  </form>}
  {pending&&busyStatuses.includes(pending.status)&&<div className="delivery-candidate-status" role="status"><strong>{phases[pending.phase]||'Preparing your suggestion'}…</strong><p>Your current version {workspace.version} is still downloadable. This page checks progress automatically.</p></div>}
  {pending?.status==='plan_review'&&<div className="delivery-proposed-plan"><h3>Review the proposed whole-game change</h3><p><strong>Your request:</strong> {pending.feedback}</p><PlanPreview plan={pending.plan}/><div className="delivery-decisions"><button className="button" disabled={busy||expired} onClick={()=>decide('confirm')}>Approve plan and prepare comparison PDFs</button><button className="button-quiet" disabled={busy} onClick={()=>decide('discard')}>Keep current game</button></div><p className="live-note">This approval creates a candidate. It does not replace your downloads or use a successful remake yet.</p></div>}
  {pending?.status==='failed'&&<div role="status"><p>{failureText[pending.errorCode]||'The candidate could not be completed. Your published game is unchanged; no successful change was used.'}</p><div className="delivery-decisions">{pending.pdfRetryAvailable&&<button type="button" className="button" disabled={busy||expired} onClick={()=>decide('retry')}>Finish saved PDFs · no extra AI call</button>}<button type="button" className="button-quiet" disabled={busy} onClick={()=>decide('discard')}>Dismiss this attempt</button></div></div>}
  {pending?.status!=='plan_review'&&!busyStatuses.includes(pending?.status)&&<div className="delivery-preview">
   <PrintedComparison key={pending?.status==='ready'?pending.id:`current-${workspace.version}`} workspace={workspace} candidate={pending?.status==='ready'?pending:null} orderId={order.id} guideLabel={order.sku.includes('classroom')?'Teacher Guide':'Host Guide'} stageNumber={kind==='checkpoint'?selected:0}/>
   {pending?.status==='ready'&&<><p className="live-note">Comparison PDFs have a small unaccepted-preview mark in the bottom margin. Accepted downloads are clean; the game content is the same.</p><p><strong>Your request:</strong> {pending.feedback}</p>{pending.edition==='baseline'&&<p>This candidate uses the checked paper-briefing edition: simpler narration with the approved story goal and supported puzzles.</p>}<div className="delivery-decisions"><button type="button" className="button" aria-describedby="printed-comparison-effect" disabled={busy||expired} onClick={()=>decide('accept')}>Use this version · uses 1 {pending.kind==='whole'?'remake':'checkpoint change'}</button><button type="button" className="button-quiet" disabled={busy} onClick={()=>decide('discard')}>Keep current version · no change used</button></div><p className="live-note">Both new PDFs become your downloads together. The earlier version stays in history.</p></>}
  </div>}
  {workspace.currentPlan&&<details><summary>Current game plan · version {workspace.version}</summary><PlanPreview plan={workspace.currentPlan}/></details>}
  <details className="delivery-version-history"><summary>Saved download versions ({workspace.versions.length})</summary>{workspace.versions.map(item=><div key={item.version_number}><strong>Version {item.version_number}{item.version_number===workspace.version?' · current':''}</strong><a href={file(item.version_number,'player').replace('&view=1','')}>Player Pack</a><a href={file(item.version_number,'guide').replace('&view=1','')}>Adult guide</a></div>)}</details>
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
