import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowClockwise, DownloadSimple, WarningCircle, Books, Sparkle, Receipt } from '@phosphor-icons/react';
import { formatUsd, productRights } from '../shared/catalog.mjs';
import { draftSpec, readySetup } from './creatorDraft.mjs';
import { PlanPreview } from './creatorPlanPreview.jsx';
import { mechanicById } from '../shared/creator-plan.mjs';
import './creatorFlow.css';
import './livePages.css';
import FreeDownload from './freeDownload.jsx';
import { createDownloadZip } from './downloadZip.mjs';
import OrderUpdateProgress, {themeUpdatePending} from './orderUpdateProgress.jsx';
import AdventureCover from './adventureCover.jsx';
import {googleSignInController} from './googleSignIn.mjs';

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error?.message || 'The service could not complete this request.'),{code:data.error?.code});
  return data;
}

function Intro({ eyebrow, title, children }) { return <section className="page-intro extended-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{children}</section>; }
function Alert({ children }) { return <p className="live-alert" role="alert"><WarningCircle size={18} /> {children}</p>; }

const orderLabel = { pending_payment: 'Payment not confirmed', paid: 'Payment confirmed · queued', fulfilling: 'Generating and checking', published: 'Files ready', failed: 'PDF creation stopped · action needed', refunded: 'Refunded' };

function CompletePackDownload({ orderId, paper, setting, label = 'Download complete game · ZIP' }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  async function download() {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const files = await Promise.all(['player','guide'].map(async role => {
        const response = await fetch('/api/v1/files/' + encodeURIComponent(orderId) + '/' + role + '?paper=' + encodeURIComponent(paper), {credentials:'same-origin'});
        if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error?.message || 'The files could not be downloaded. Please try again.'); }
        if (!response.headers.get('content-type')?.includes('application/pdf')) throw new Error('A PDF is unavailable. Please try again.');
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (new TextDecoder().decode(bytes.slice(0,5)) !== '%PDF-') throw new Error('A PDF could not be verified. Please try again.');
        return {name:'adventure-' + setting + '-' + role + '-' + paper + '.pdf',data:bytes};
      }));
      const blob = createDownloadZip(files); const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = 'adventure-' + orderId + '-' + paper + '.zip'; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000); setNotice('ZIP prepared with both PDFs. Extract it before opening the files.');
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <div className="complete-pack-download"><button type="button" className="button complete-pack-button" disabled={busy} onClick={download}>{busy ? 'Preparing your complete pack…' : label} <DownloadSimple size={20} /></button>{busy && <p role="status">Fetching both {paper === 'Letter' ? 'US Letter' : 'A4'} PDFs…</p>}{notice && <p className="live-note" role="status">{notice}</p>}{error && <Alert>{error} No ZIP is saved unless both PDFs are available.</Alert>}</div>;
}

function ThemeCoverStatus({order,refresh}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  if(order.product_kind!=='custom'||!order.coverAvailable)return null;
  if(['queued','submitting','pending'].includes(order.coverStatus))return <p className="live-note" role="status">Your theme cover is being illustrated. Your game can continue normally.</p>;
  if(order.coverStatus==='failed')return <p className="live-note">The cover could not be completed. Your game and downloads are unaffected.</p>;
  if(order.coverStatus==='ready')return null;
  async function create(){setBusy(true);setError('');try{await api('/api/v1/orders/'+order.id+'/cover',{method:'POST'});await refresh();}catch(failure){setError(failure.message);}finally{setBusy(false);}}
  return <div><button type="button" className="button-quiet" disabled={busy} onClick={create}>{busy?'Requesting cover…':'Create a theme cover'}</button>{error&&<Alert>{error}</Alert>}</div>;
}

export function LiveAccount({ Link }) {
  const button = useRef(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    let signIn=null;
    const resume=()=>{if(document.visibilityState!=='hidden')signIn?.refreshIfStale();};
    async function prepare() {
      try {
        setLoading(true); setError('');
        const requested = new URLSearchParams(window.location.search).get('returnTo');
        const destination = requested && /^\/en\/(create\/|checkout\/|themes\/|orders\/|my-adventures\/)/.test(requested) && !requested.includes('\\') ? requested : '/en/my-adventures/';
        const session = await api('/api/v1/auth/session');
        if (cancelled) return;
        if (session.authenticated) { window.location.replace(destination); return; }
        if (!window.google?.accounts?.id) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error('Google sign-in could not load. Please try again.'));
            document.head.appendChild(script);
          });
        }
        if (cancelled || !button.current) return;
        signIn=googleSignInController({api,
          initialize:options=>window.google.accounts.id.initialize(options),
          render:()=>{button.current.replaceChildren();window.google.accounts.id.renderButton(button.current,{theme:'outline',size:'large',shape:'rectangular',text:'signin_with',width:Math.min(360,button.current.clientWidth||280)});},
          redirect:()=>window.location.assign(destination),onReady:ready=>setLoading(!ready),onBusy:setBusy,onError:setError,
        });
        window.addEventListener('focus',resume);document.addEventListener('visibilitychange',resume);
        await signIn.prepare();
      } catch (failure) { if (!cancelled) { setError(failure.message); setLoading(false); } }
    }
    prepare();
    return () => { cancelled = true;signIn?.stop();window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume); };
  }, [retry]);
  return <main className="extended-page live-page account-page">
    <section className="account-entry" aria-labelledby="account-title">
      <div className="account-benefits">
        <span className="eyebrow">YOUR ADVENTURE ACCOUNT</span>
        <h1 id="account-title">Your next adventure starts here.</h1>
        <p className="account-summary">Sign in to pick up a saved story, find your games, or print your next adventure.</p>
        <div className="account-illustration" aria-hidden="true">
          <div className="account-paper account-paper-back"><span /><span /><span /></div>
          <div className="account-paper account-paper-front">
            <span className="account-map-sun" />
            <svg className="account-map-route" viewBox="0 0 420 200" fill="none" preserveAspectRatio="none"><path d="M38 157 C105 157 84 63 172 86 S256 168 316 110 S356 61 390 55" stroke="currentColor" strokeWidth="4" strokeDasharray="6 10" strokeLinecap="round" /></svg>
            <span className="account-map-stop account-map-stop-one" /><span className="account-map-stop account-map-stop-two" /><span className="account-map-stop account-map-stop-three" />
            <Sparkle className="account-map-sparkle" size={35} weight="fill" />
          </div>
          <div className="account-paper-tab"><Books size={25} weight="duotone" /></div>
        </div>
        <ul className="account-benefit-list">
          <li><Books size={22} /><span>Your printable games</span></li>
          <li><Sparkle size={22} /><span>Stories in progress</span></li>
          <li><Receipt size={22} /><span>Orders and downloads</span></li>
        </ul>
        <Link className="text-link account-browse" to="/en/themes/">Browse adventures first <ArrowRight size={18} /></Link>
      </div>
      <div className="account-signin">
        <div className="live-panel account-card">
          <span className="account-card-icon" aria-hidden="true"><Sparkle size={28} weight="fill" /></span>
          <span className="eyebrow">FOR PARENTS &amp; TEACHERS</span>
          <h2>Open your adventure shelf</h2>
          <p className="account-card-intro">Continue with your adult Google account. Your games, drafts and orders will be here.</p>
          <div className="account-google" ref={button} aria-label="Sign in with Google" aria-busy={loading || busy} />
          {loading && <p className="account-status" role="status">Loading Google sign-in…</p>}
          {busy && <p className="account-status" role="status">Signing you in…</p>}
          {error && <><Alert>{error}</Alert><button type="button" className="button-quiet" onClick={() => setRetry(value => value + 1)}>Try again</button></>}
          <p className="account-child-note">Just your adult account. No child account needed.</p>
          <p className="account-privacy">We use your verified Google email to find your adventures. We do not request access to your contacts or Google Drive. <Link to="/en/privacy/">Read our Privacy Notice</Link>.</p>
        </div>
        <p className="live-note account-support">Need help accessing a purchase? <Link to="/en/help/">Contact support <ArrowRight size={16} /></Link></p>
      </div>
    </section>
  </main>;
}

export function LiveShelf({ Link }) {
  const [orders, setOrders] = useState(null); const [draft, setDraft] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false); const [error, setError] = useState('');
  const [section, setSection] = useState('games'); const [paper, setPaper] = useState('A4'); const [historyKind,setHistoryKind] = useState('paid'); const firstLoad = useRef(true);
  const needsAttention = order => order.product_kind === 'custom' && Boolean(order.paid_at) && (['paid','fulfilling'].includes(order.status) || order.status === 'failed');
  const refresh = () => api('/api/v1/my-orders').then(data => { setOrders(data.orders); if (firstLoad.current) { firstLoad.current = false; if (data.orders.some(needsAttention)) setSection('making'); } setError(''); }).catch(failure => { if (/Sign in|Verify/.test(failure.message)) setNeedsLogin(true); else setError(failure.message); });
  useEffect(() => { refresh(); api('/api/v1/my-draft').then(result => setDraft(result.draft)).catch(() => {}); }, []);
  useEffect(() => { if (!orders?.some(order => ['paid','fulfilling'].includes(order.status)||['queued','submitting','pending'].includes(order.coverStatus))) return; const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 10000); return () => clearInterval(timer); }, [orders]);
  async function deleteDraft() {
    if (!window.confirm('Delete this saved planning draft? Your purchased games remain available.')) return;
    try { await api('/api/v1/my-draft', { method: 'DELETE' }); localStorage.removeItem('paw-draft'); setDraft(null); } catch (failure) { setError(failure.message); }
  }
  const games = (orders || []).filter(order => order.status === 'published');
  const making = (orders || []).filter(needsAttention);
  const paidOrders = (orders || []).filter(order => Boolean(order.paid_at));
  const unpaidOrders = (orders || []).filter(order => !order.paid_at);
  const visible = section === 'games' ? games : section === 'making' ? making : historyKind === 'paid' ? paidOrders : unpaidOrders;
  const date = value => value ? new Date(value.replace(' ', 'T') + (value.endsWith('Z') ? '' : 'Z')).toLocaleDateString('en', { year:'numeric', month:'short', day:'numeric' }) : '';
  return <main className="extended-page live-page shelf-page">
    <Intro eyebrow="MY ADVENTURES" title="Your games, ready to play."><p>Download your purchased adventures, follow custom creations and return to your ideas.</p></Intro>
    <section className="shelf-shell">
      {needsLogin ? <div className="live-panel"><h2>Sign in to your library</h2><Link className="button" to="/en/account/?returnTo=%2Fen%2Fmy-adventures%2F">Sign in with Google <ArrowRight size={18} /></Link></div> : orders === null ? <p role="status">Loading your library…</p> : <>
        <nav className="shelf-tabs" aria-label="Your adventure library">{[['games','My games',games.length],['making','In progress',making.length],['drafts','My drafts',draft ? 1 : 0],['orders','Order history',paidOrders.length]].map(([id,title,count]) => <button type="button" key={id} aria-pressed={section === id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}>{title}<span>{count}</span></button>)}</nav>
        <div className="shelf-toolbar"><p>{section === 'games' ? 'Completed games with downloadable PDFs appear here.' : section === 'making' ? 'Your paid custom orders stay here until delivery, including any that need recovery.' : section === 'drafts' ? 'Saved ideas are not purchases and have not been charged.' : 'Paid purchases are listed separately from unfinished checkout attempts.'}</p><button type="button" className="button-quiet" onClick={refresh}>Refresh</button></div>
        {section === 'orders' && <div className="creator-source-choice"><button type="button" aria-pressed={historyKind==='paid'} onClick={()=>setHistoryKind('paid')}>Paid orders ({paidOrders.length})</button><button type="button" aria-pressed={historyKind==='unpaid'} onClick={()=>setHistoryKind('unpaid')}>Unfinished checkouts ({unpaidOrders.length})</button></div>}
        {error && <Alert>{error}</Alert>}
        {section === 'games' && games.some(order => order.product_kind === 'ready') && <label className="shelf-paper">Download paper size<select value={paper} onChange={event => setPaper(event.target.value)}><option value="A4">A4</option><option value="Letter">US Letter</option></select></label>}
        {section === 'drafts' ? draft ? <article className="live-panel shelf-draft"><span className="eyebrow">UNPURCHASED IDEA</span><h2>{draft.customIdea || draft.themeId || 'Your story idea'}</h2><p>{draft.setting === 'classroom' ? 'Classroom' : 'Home'} · {draft.players} players</p><Link className="button" to="/en/create/">Continue designing <ArrowRight size={18} /></Link><button className="button-quiet" onClick={deleteDraft}>Delete draft</button></article> : <div className="shelf-empty"><h2>No saved ideas yet</h2><Link className="button" to="/en/create/">Create an adventure <ArrowRight size={18} /></Link></div> : visible.length === 0 ? <div className="shelf-empty"><Books size={38} /><h2>{section === 'games' ? 'Your first adventure belongs here' : section === 'making' ? 'Nothing is being made right now' : 'No orders yet'}</h2><p>{section === 'games' ? 'Completed purchases appear here. Unfinished checkouts are in Order history.' : 'Explore a game or create a new story for your group.'}</p><Link className="button" to="/en/for-home/">Browse games <ArrowRight size={18} /></Link></div> :
        <div className={'shelf-grid ' + (section === 'orders' ? 'shelf-history' : '')}>{visible.map(order => {
          const downloadPaper = order.product_kind === 'ready' ? paper : order.paper;
          return <article className="shelf-game" key={order.id}>
            <AdventureCover order={order} />
            <div className="shelf-game-copy"><span className="eyebrow">{order.setting === 'classroom' ? 'CLASSROOM' : 'HOME'} · {order.product_kind === 'ready' ? 'READY-MADE' : 'AI CUSTOM'}</span><h2>{order.title || 'Your adventure'}</h2>
              <p className={'shelf-status status-' + order.status}>{order.checkoutExpired ? 'Checkout expired · not paid' : order.status === 'failed' && !order.paid_at ? 'Checkout unsuccessful · not paid' : order.status === 'pending_payment' ? 'Unfinished checkout · not paid' : order.status === 'failed' && order.paid_at ? 'Paid · PDF creation stopped · action needed' : order.planStatus === 'needs_help' ? 'Paid · plan generation stopped · action needed' : order.planStatus === 'review' ? 'Paid · personal plan ready for review' : order.planStatus === 'confirmed' ? 'Paid · creating PDFs' : order.paid_at ? 'Paid · ' + (orderLabel[order.status] || order.status) : orderLabel[order.status] || order.status}</p>
              <p className="live-note">Order {order.id.slice(0,8).toUpperCase()} · {order.paid_at ? 'Paid ' + date(order.paid_at) : 'Started ' + date(order.created_at)} · {formatUsd(order.amount_total)}<br />{order.accessExpiresAt && 'Downloads until ' + date(order.accessExpiresAt)}</p>
              <ThemeCoverStatus order={order} refresh={refresh} />
              {section === 'games' && order.filesReady ? <div className="shelf-downloads"><CompletePackDownload orderId={order.id} paper={downloadPaper} setting={order.setting} /><span className="live-note">Or download individual PDFs:</span><a className="button-quiet" href={'/api/v1/files/' + order.id + '/player?paper=' + downloadPaper}>Player Pack · {downloadPaper === 'Letter' ? 'US Letter' : downloadPaper} <DownloadSimple size={18} /></a><a className="button-quiet" href={'/api/v1/files/' + order.id + '/guide?paper=' + downloadPaper}>{order.setting === 'classroom' ? 'Teacher Guide' : 'Host Guide'} <DownloadSimple size={18} /></a><small>Download both: player activities and separate instructions with answers.</small></div> : section === 'games' && <p className="live-note">Online downloads are unavailable. Check your order for access details.</p>}
              {section === 'making' && order.status === 'failed' && <p className="shelf-action-note">{order.deliveryRetryAvailable ? 'Your PDFs are not ready. Retry on this paid order without another checkout.' : 'Your PDFs are not ready. Open this paid order for assistance or refund review.'}</p>}
              <Link className={section === 'making' ? 'shelf-action' + (order.status === 'failed' ? ' shelf-action-urgent' : '') : 'text-link'} to={'/en/orders/' + order.id + '/'}>{section === 'making' ? order.status === 'failed' ? order.deliveryRetryAvailable ? 'Open order to retry PDF' : 'Open order for help' : order.planStatus === 'needs_help' ? 'Open order and recover plan' : order.planStatus === 'review' ? 'Review and edit your plan' : 'View order progress' : 'Order details'} <ArrowRight size={18} /></Link>
            </div>
          </article>;
        })}</div>}
        <div className="shelf-help"><p>Looking for a new adventure?</p><Link to="/en/for-home/">Home games</Link><Link to="/en/for-classroom/">Classroom games</Link><Link to="/en/create/">Create with AI</Link><Link to="/en/help/">Get help</Link></div>
      </>}
    </section>
  </main>;
}

function OrderQualityActions({order,onHelp}) {
  if (order.kind!=='custom' || !order.paidAt || !order.filesReady) return null;
  const legacy=(order.gamePackVersion||1)<2;
  if(!legacy)return null;
  const canRevise=order.revisionLimit>order.revisionUsed && order.revisionExpiresAt && Date.parse(`${order.revisionExpiresAt}Z`)>Date.now();
  return <section className="order-quality-actions" aria-labelledby="order-quality-title">
    <span className="eyebrow">AFTER YOU DOWNLOAD</span><h2 id="order-quality-title">Want to improve this game?</h2>
    <p>Use the option that matches the problem. Both stay with this paid order; there is no new checkout.</p>
    <div className="order-quality-grid">
      {canRevise&&<div><h3>Change one checkpoint</h3><p>Adjust the reading level, difficulty or instructions in one existing checkpoint. Only a successful revised file uses an included change.</p><a className="button-quiet" href="#order-revision">Choose a checkpoint <ArrowRight size={17}/></a></div>}
      <div><h3>{legacy?'Create a new version of the whole pack':'Report an error in the pack'}</h3><p>{legacy?'Your earlier pack can be rebuilt in the new paper-material format on this paid order. The original files stay available while the new version is created and checked.':'If a clue, answer or file is wrong, record the issue on this order for review. This is separate from your included preference changes.'}</p>{legacy?<a className="button-quiet" href="#order-remake" onClick={()=>{const upgrade=document.querySelector('.order-optional-upgrade');if(upgrade)upgrade.open=true;}}>View no-charge remake <ArrowRight size={17}/></a>:<button type="button" className="button-quiet" onClick={()=>onHelp('clue','I found an error in my delivered game pack: ')}>Report a game error <ArrowRight size={17}/></button>}</div>
    </div>
  </section>;
}

function RevisionForm({ order, refresh }) {
  const [stageNumber,setStageNumber]=useState(1),[instruction,setInstruction]=useState(''),[custom,setCustom]=useState(false),[workspace,setWorkspace]=useState(null);
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  const remaining=order.revisionLimit-order.revisionUsed,checked=order.checkedPuzzleRevision;
  const available=order.kind==='custom'&&order.filesReady&&!['queued','generating'].includes(order.remake?.status)&&remaining>0&&
    order.revisionExpiresAt&&Date.parse(`${order.revisionExpiresAt}Z`)>Date.now();
  async function load(){try{setWorkspace(await api(`/api/v1/orders/${order.id}/revision-workspace`));}catch(failure){setError(failure.message);}}
  useEffect(()=>{if(available)load();},[order.id,available]);
  useEffect(()=>{if(!['queued','generating'].includes(workspace?.preview?.status))return;const timer=setInterval(load,4000);return()=>clearInterval(timer);},[workspace?.preview?.status,order.id]);
  if(!available)return null;
  const stages=workspace?.stages||[],pending=workspace?.preview,selected=pending?.status==='ready'?pending.stageNumber:stageNumber;
  const current=stages[selected-1],candidate=pending?.candidate,locked=Boolean(pending&&['queued','generating','ready'].includes(pending.status));
  const shortcuts=[
    ['Make the clue easier to read aloud, keeping the task and play style.','Easier to read'],
    ['Add a clearer hint, keeping the printed puzzle and answer unchanged.','Clearer hint'],
    ['Clarify the printed instructions step by step, keeping the same answer.','Step-by-step instructions'],
  ];
  async function generate(event){event.preventDefault();setBusy(true);setError('');setNotice('');try{await api(`/api/v1/orders/${order.id}/revision-previews`,{method:'POST',body:JSON.stringify({stageNumber,instruction,mode:custom?'custom':'preset'})});setNotice('Preparing your comparison. Your current game stays available.');await load();}catch(failure){setError(failure.message);}finally{setBusy(false);}}
  async function decide(action){setBusy(true);setError('');setNotice('');try{await api(`/api/v1/orders/${order.id}/revision-previews/${pending.id}/${action}`,{method:'POST'});setNotice(action==='accept'?'The new version is ready to download.':'Your current version is unchanged.');setInstruction('');setCustom(false);await refresh();await load();}catch(failure){setError(failure.message);}finally{setBusy(false);}}
  const previewRole=candidate&&current?.clue===candidate.clue?'guide':'player';
  const pdfFragment=previewRole==='player'?`#page=${selected*2}&toolbar=0&navpanes=0`:'#toolbar=0&navpanes=0';
  const currentPdf=`/api/v1/files/${order.id}/${previewRole}?paper=${encodeURIComponent(workspace?.paper||order.paper)}&version=${workspace?.version||1}&view=1${pdfFragment}`;
  const candidatePdf=pending?.id?`/api/v1/orders/${order.id}/revision-previews/${pending.id}/${previewRole}${pdfFragment}`:'';
  return <section id="order-revision" className="order-revision-form" aria-labelledby="checkpoint-change-title">
    <span className="eyebrow">OPTIONAL · ONE CHECKPOINT</span><h2 id="checkpoint-change-title">Improve one checkpoint</h2>
    <p>Choose a checkpoint, see the change, then decide. Your current game stays downloadable.</p>
    {!workspace?<p role="status">Loading your game pages…</p>:<>
      <h3>1. Choose a checkpoint</h3>
      <div className="revision-page-grid" role="group" aria-label="Choose one checkpoint">{stages.map(stage=><button key={stage.number} type="button" className="revision-page-card" aria-pressed={selected===stage.number} disabled={locked} onClick={()=>{setStageNumber(stage.number);setInstruction('');setCustom(false);}}>
        <span className="revision-paper-thumb" aria-hidden="true"><span>CHECKPOINT {stage.number}</span><strong>{stage.title}</strong><small>{stage.clue}</small></span>
        <strong>Checkpoint {stage.number}</strong><span>{stage.title}</span><small>Player pages {stage.number*2}–{stage.number*2+1}</small>
      </button>)}</div>
      {current&&<div className="revision-current-copy"><strong>Current checkpoint · {current.title}</strong><p>{current.storyContext}</p><p>{current.task}</p><p>{current.clue}</p><details><summary>See printed pieces and choices</summary><p>{current.material.instruction}</p><ul>{current.material.items.map((item,index)=><li key={index}><strong>{item.label}</strong> · {item.detail}</li>)}</ul><ol type="A">{current.options.map((option,index)=><li key={index}>{option}</li>)}</ol></details></div>}
      {!locked&&<form onSubmit={generate}><h3>2. What should improve?</h3><div className="revision-shortcuts">{shortcuts.map(([value,label])=><button key={value} type="button" aria-pressed={!custom&&instruction===value} onClick={()=>{setInstruction(value);setCustom(false);}}>{label}</button>)}</div>
        {(workspace.customAvailable||!checked)&&<details className="revision-custom-note" onToggle={event=>{if(!event.currentTarget.open&&custom){setInstruction('');setCustom(false);}}}><summary>Describe a different change to AI</summary><label>What should be clearer in this checkpoint?<textarea minLength="10" maxLength="350" value={custom?instruction:''} onChange={event=>{setInstruction(event.target.value);setCustom(true);}} placeholder="For example: Make the hint easier for 8-year-olds without changing the answer." /></label><small>AI is called only when you generate this comparison. Up to three AI comparisons are available on this order.</small></details>}
        <button className="button revision-generate" disabled={busy||!instruction}>{busy?'Preparing…':'Generate comparison'}</button></form>}
      {['queued','generating'].includes(pending?.status)&&<div className="revision-wait" role="status">Preparing a revised checkpoint. You can leave this page and come back; the current PDFs remain ready.</div>}
      {pending?.status==='ready'&&candidate&&<div className="revision-result"><h3>3. Compare and decide</h3><p>Only checkpoint {selected} changes. The printed puzzle and answer stay the same.</p><div className="revision-compare">
        {[['Current version',current,currentPdf],['Suggested version',candidate,candidatePdf]].map(([label,stage,pdf])=><article key={label}><h4>{label}</h4><p><strong>Clue</strong><br/>{stage.clue}</p><p><strong>Hint for the adult</strong><br/>{stage.hint}</p><details><summary>Preview the actual {previewRole==='player'?'player page':'adult guide'}</summary><iframe title={`${label} checkpoint ${selected} PDF`} src={pdf} loading="lazy" /></details></article>)}
      </div><div className="revision-decisions"><button type="button" className="button" disabled={busy} onClick={()=>decide('accept')}>Use suggested version</button><button type="button" className="button-quiet" disabled={busy} onClick={()=>decide('discard')}>Keep current version</button></div><p className="live-note">One included change is used only when you choose the suggested version.</p></div>}
      {pending?.status==='failed'&&<p role="status">This comparison could not be prepared. Your current game and included changes are unchanged. You can choose another wording option.</p>}
      <details className="revision-rules"><summary>What can I change?</summary><p>{remaining} included successful {remaining===1?'change':'changes'} left. This adjusts wording or hints in one checkpoint. For a wrong answer, different puzzle or whole-game problem, <a href="#order-help">use order help below</a>.</p></details>
    </>}
    {notice&&<p role="status">{notice}</p>}{error&&<Alert>{error}</Alert>}
  </section>;
}

function IssueForm({ orderId, failedDelivery = false, initialRequest = null }) {
  const [kind, setKind] = useState(failedDelivery ? 'delivery' : 'clue'); const [description, setDescription] = useState(''); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  const [cases, setCases] = useState([]);
  useEffect(() => { api(`/api/v1/orders/${orderId}/issues`).then(data => setCases(data.cases)).catch(() => {}); }, [orderId]);
  useEffect(() => { if (initialRequest) { setKind(initialRequest.kind); setDescription(initialRequest.description); } }, [initialRequest]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const result = await api(`/api/v1/orders/${orderId}/issues`, { method: 'POST', body: JSON.stringify({ issueType: kind, description }) });
      setNotice(`Report ${result.caseId} was saved on this order. For direct help, email support@paperadventure.app.`); setDescription('');
      const updated = await api(`/api/v1/orders/${orderId}/issues`); setCases(updated.cases);
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <details id="order-help" className="order-feedback"><summary>{failedDelivery ? 'Get help with this failed delivery' : 'Report a problem or request a quality review'}</summary><form className="live-revision" onSubmit={submit}><p>{failedDelivery ? 'Your PDFs did not pass the delivery check. Record the missing delivery here, or email support@paperadventure.app directly for assistance or refund review. No new payment is needed.' : 'This records a request on your paid order; it does not immediately regenerate a game or alert a person. For direct help, email support@paperadventure.app with your order reference.'} Do not include child names or photos.</p><label>Issue type<select value={kind} onChange={event => setKind(event.target.value)}><option value="clue">Clue or instructions</option><option value="answer">Answer or hint</option><option value="printing">Printing or layout</option><option value="delivery">Missing delivery</option><option value="refund">Refund request</option><option value="other">Full-pack quality review or other</option></select></label><label>What happened?<textarea minLength="10" maxLength="1000" required value={description} onChange={event => setDescription(event.target.value)} placeholder={failedDelivery ? 'For example: My approved plan is saved, but the PDFs were not delivered.' : 'Describe which page or checkpoint is wrong, or why the full pack needs a remake.'} /></label><button className="button" disabled={busy}>{busy ? 'Recording…' : 'Record request on this order'}</button>{notice && <p role="status">{notice}</p>}{error && <Alert>{error}</Alert>}{cases.length > 0 && <div className="order-report-history"><strong>Requests recorded on this order</strong><ul>{cases.map(item=><li key={item.id}>{item.issue_type==='other'&&item.description?.startsWith('Please review a no-charge remake')?'Full-pack remake review':item.issue_type} · {item.status==='resolved'?'resolved':item.status==='reviewing'?'under review':'recorded'}</li>)}</ul></div>}</form></details>;
}

export function PaidPlanReview({order,refresh}) {
  const review=order.planReview;
  const [mode,setMode]=useState('edit');
  const [scope,setScope]=useState('stage1');
  const [feedbackByMode,setFeedbackByMode]=useState({edit:'',rework:''});
  const feedback=feedbackByMode[mode];
  const setFeedback=value=>setFeedbackByMode(previous=>({...previous,[mode]:value}));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  if (!review || !['paid','fulfilling','published','failed'].includes(order.status)) return null;

  async function action(body) {
    setBusy(true); setError(''); setNotice('');
    try {
      await api(`/api/v1/orders/${order.id}/plan`,{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify(body)});
      setNotice(body.action==='confirm'?'Plan approved. Your PDFs are now queued.':body.action==='repair_story_scenes'?'Story-scene repair queued. Your saved plan and original PDFs remain available.':body.action==='select'?'Saved plan selected.':body.action==='retry_initial'?'A free recovery attempt is queued. You will not be charged again.':body.action==='resume_review'?'Your saved plan is ready to review again.':'Your plan change is queued. It uses an included change only if a valid new plan is delivered.');
      setFeedback('');
      await refresh();
    } catch(failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  const qualityReview=order.status==='published'&&review.qualityReplanUsed&&review.status==='review'&&review.activeVersion>review.confirmedVersion;
  const stoppedReplacement=review.themeReplanFailed&&review.activeVersion>review.confirmedVersion;
  const reviewable=order.status==='paid'&&review.status==='review'||qualityReview;
  const targetedLeft=Math.max(0,review.targetedLimit-review.targetedUsed);
  const reworksLeft=Math.max(0,review.fullLimit-review.fullUsed);
  const changeAvailable=mode==='edit'?targetedLeft>0:reworksLeft>0;
  const hasUnsentFeedback=Object.values(feedbackByMode).some(value=>Boolean(value.trim()));
  const activePlan=review.versions.find(item=>item.version===review.activeVersion)?.plan;
  const stageNumber=/^stage([1-5])$/.exec(scope)?.[1];
  const selectedStage=stageNumber?activePlan?.stages?.find(item=>item.number===Number(stageNumber)):null;
  const scopeNames={title:'Title',summary:'Summary',opening:'Opening',roles:'Team roles',goal:'Goal',preparation:'Preparation'};
  const selectedName=selectedStage?`Checkpoint ${stageNumber} · ${selectedStage.title}`:scopeNames[scope]||'Selected part';
  const selectedText=selectedStage?[selectedStage.storyContext,selectedStage.task].filter(Boolean).join(' '):activePlan?.[scope];
  const scopeOptions=[['title','Title'],['summary','Summary'],['opening','Opening'],['roles','Team roles'],['goal','Goal'],['preparation','Preparation'],...[1,2,3,4,5].map(n=>[`stage${n}`,`Checkpoint ${n}`])].filter(([value])=>!order.packContractVersion||!['roles','preparation'].includes(value));

  return <section id="personal-plan-review" className="paid-plan-review" aria-label="Personal plan review">
    <header className="paid-plan-heading">
      <span className="eyebrow">YOUR PAID PLAN</span>
      <h2>{stoppedReplacement?'Replacement plan not approved':qualityReview?'Review your corrected theme plan':review.status==='confirmed'?'Approved plan':review.status==='needs_help'?'Plan generation stopped':review.status==='review'?'Review your plan':'Preparing your personal plan'}</h2>
      {stoppedReplacement?<p>The correction stopped. Version {review.activeVersion} is saved but has not been approved. Version {review.confirmedVersion} remains approved for your existing files.</p>:qualityReview?<p>Compare this new plan with your original theme. Your existing PDFs stay available. Approve only if the characters, world, goal and five scenes fit your idea; approval then starts a no-charge replacement pack.</p>:reviewable ? <><p>Read the five checkpoints, then choose whether to change the plan or approve it for PDF creation.</p><div className="paid-plan-allowances" aria-label="Included plan changes remaining"><span><strong>{targetedLeft}</strong> focused edits left</span><span><strong>{reworksLeft}</strong> whole-plan reworks left</span></div><a className="paid-plan-skip" href="#paid-plan-next">Go to next step ↓</a></> : review.confirmedVersion ? <p>Version {review.confirmedVersion} was approved for PDF generation.</p> : review.status==='needs_help' ? <p>Your payment is confirmed, but we could not finish a valid plan. No PDF generation has started, and no plan change was used.</p> : <p>Plan generation and quality checks are in progress.</p>}
    </header>

    {qualityReview&&<a className="paid-plan-skip" href="#paid-plan-next">Go to approval ↓</a>}
    {review.pending&&<p className="paid-plan-pending" role="status">{review.qualityReplanUsed?'Preparing a corrected theme plan':review.pending==='initial'?'Creating your first plan':'Preparing your requested change'}… You can return later through My adventures.</p>}
    {review.status==='needs_help'&&<div className="paid-plan-recovery" role="status"><p>{review.activeVersion ? 'Your earlier valid plan is saved. Return to it to review, edit or approve it.' : review.retryAvailable ? 'You can try the first plan again once at no charge. If it still fails, report the problem below for help or refund-policy review.' : 'This plan needs manual help. Report the problem below for assistance or refund-policy review.'}</p>{review.retryAvailable&&!review.activeVersion&&<button type="button" className="button" disabled={busy} onClick={()=>action({action:'retry_initial'})}>{busy?'Requesting…':'Retry my plan at no charge'} <ArrowRight size={17}/></button>}{review.activeVersion>0&&<button type="button" className="button" disabled={busy} onClick={()=>action({action:'resume_review'})}>Return to my saved plan <ArrowRight size={17}/></button>}</div>}

    {review.versions.length>0&&<div className="paid-plan-versions"><h3>Your saved plans</h3><p>Saved versions stay available for comparison without using another change.</p><div className="creator-plan-options">{review.versions.filter(item=>item.version===review.activeVersion).map(item=><article key={item.version} className={item.version===review.activeVersion?'selected':''}><h4>Version {item.version} · {item.plan.title}</h4>{review.confirmedVersion&&<p className="live-note">{item.version===review.confirmedVersion?'Approved for your existing files':item.version>review.confirmedVersion?'Saved replacement · not approved':'Earlier saved version'}</p>}<p>{item.plan.summary}</p><details open={item.version===review.activeVersion&&reviewable}><summary>Read this five-checkpoint plan</summary><PlanPreview plan={item.plan} showPreparation={false}/></details>{reviewable&&!qualityReview&&item.version!==review.activeVersion&&<button type="button" className="button-quiet" disabled={busy} onClick={()=>action({action:'select',version:item.version})}>Use this version</button>}</article>)}</div>{review.versions.length>1&&<details><summary>Earlier saved plans</summary>{review.versions.filter(item=>item.version!==review.activeVersion).map(item=><article key={item.version}><h4>Version {item.version} · {item.plan.title}</h4><PlanPreview plan={item.plan} showPreparation={false}/>{reviewable&&!qualityReview&&<button type="button" className="button-quiet" disabled={busy} onClick={()=>action({action:'select',version:item.version})}>Use this version</button>}</article>)}</details>}</div>}

    {reviewable&&<div id="paid-plan-next" className="paid-plan-next">
      {!qualityReview&&<div className="paid-plan-change">
        <span className="eyebrow">OPTIONAL CHANGE</span>
        <h3>Want to change the plan?</h3>
        <p>Your selected version stays saved. A change is used only when a valid new plan is ready for review.</p>
        <div className="paid-plan-modes" role="group" aria-label="Choose a plan change">
          <button type="button" aria-pressed={mode==='edit'} disabled={busy} onClick={()=>setMode('edit')}><strong>Change one part</strong><span>Focus on one checkpoint or story detail · {targetedLeft} left</span></button>
          <button type="button" aria-pressed={mode==='rework'} disabled={busy} onClick={()=>setMode('rework')}><strong>Rethink the whole plan</strong><span>Ask for a different overall direction · {reworksLeft} left</span></button>
        </div>
        {changeAvailable ? <form className="paid-plan-change-form" onSubmit={event=>{event.preventDefault();action({action:mode,scope:mode==='edit'?scope:undefined,feedback:feedback.trim()});}}>
          {mode==='edit'&&<div className="paid-plan-field"><label htmlFor="paid-plan-scope">Part to change</label><select id="paid-plan-scope" value={scope} onChange={event=>setScope(event.target.value)}>{scopeOptions.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select>{activePlan&&<div className="paid-plan-selected"><span>Currently selected</span><strong>{selectedName}</strong>{selectedText&&<p>{selectedText}</p>}</div>}</div>}
          <div className="paid-plan-field"><label htmlFor="paid-plan-feedback">What should change?</label><textarea id="paid-plan-feedback" rows={6} minLength={10} maxLength={500} required value={feedback} onChange={event=>setFeedback(event.target.value)} aria-describedby="paid-plan-feedback-hint paid-plan-feedback-count" placeholder={mode==='edit'?'For example: Make checkpoint 2 easier to read, but keep the clue and the team decision.':'For example: Keep the setting, but make the five checkpoints feel more like a mystery.'}/><div className="paid-plan-field-meta"><span id="paid-plan-feedback-hint">Say what felt wrong and what should stay.</span><span id="paid-plan-feedback-count">{feedback.length}/500{feedback&&<button type="button" className="paid-plan-clear" onClick={()=>setFeedback('')}>Clear draft</button>}</span></div></div>
          <button type="submit" className="paid-plan-submit" disabled={busy}>{busy?'Submitting…':mode==='edit'?'Request this edit':'Request a new plan direction'} <ArrowRight size={17}/></button>
        </form> : <p className="paid-plan-limit" role="status">No {mode==='edit'?'focused edits':'whole-plan reworks'} remain. You can review a saved version or ask for help before approving.</p>}
      </div>}

      <section className="paid-plan-approval" aria-label="Approve your plan">
        <span className="eyebrow">FINAL STEP</span>
        <h3>{review.storyScenesRequired?'Repair the story before approval':'Ready to make your game?'}</h3>
        <p>{qualityReview?'Approving this corrected plan starts a replacement game on this paid order. Your current PDFs stay available until the new files pass every check.':`Approve version ${review.activeVersion} to begin creating and checking the Player Pack and adult guide. You can follow progress on this order.`}</p>
        {review.storyScenesRequired&&<p>This saved replacement contains locations without complete story events. Repair and review its five scenes before approving. Original PDFs stay available. This repair uses the remaining budget of the same request and does not use an included plan edit.</p>}
        {review.storySceneRepairAvailable&&<button type="button" className="button" disabled={busy} onClick={()=>action({action:'repair_story_scenes',version:review.activeVersion})}>{busy?'Starting…':'Update game pack at no charge'} <ArrowRight size={17}/></button>}
        {review.storyScenesRequired&&!review.storySceneRepairAvailable&&<p>No scene repair remains within this request's limit. Use the order help section for review.</p>}
        {!review.storyScenesRequired&&<button type="button" className="button" disabled={busy||!qualityReview&&hasUnsentFeedback} onClick={()=>action({action:'confirm',version:review.activeVersion})}>Approve this plan and create PDFs <ArrowRight size={17}/></button>}
        {hasUnsentFeedback ? <p className="paid-plan-approval-note">You have an unsent change request. Return to that change type to submit or clear it before approving.</p> : <p className="paid-plan-approval-note">If a plan does not work for you, use the help form below before approval.</p>}
      </section>
    </div>}
    {notice&&<p className="paid-plan-notice" role="status">{notice}</p>}{error&&<Alert>{error}</Alert>}
  </section>;
}

function DeliveryRecovery({order,refresh}) {
  const [busy,setBusy] = useState(false), [notice,setNotice] = useState(''), [error,setError] = useState('');
  if (order.kind !== 'custom' || order.status !== 'failed' || !order.paidAt) return null;
  async function retry() {
    setBusy(true); setError(''); setNotice('');
    try { await api(`/api/v1/orders/${order.id}/retry-delivery`,{method:'POST'}); setNotice(order.savedCopyRecoveryAvailable?'The saved game check is continuing on this paid order. You will not be charged again.':'PDF creation has been queued on this paid order. You will not be charged again.'); await refresh(); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  if(order.deliveryRetryAvailable)return <section className="order-next-step delivery-failed" aria-label="Next step">
    <span className="eyebrow">NEXT STEP</span>
    <h2>{order.savedCopyRecoveryAvailable?'Continue your saved game':'Continue making your game'}</h2>
    <p>Your plan and completed work are saved. Continue this paid order at no charge.</p>
    <button type="button" className="button" disabled={busy} onClick={retry}>{busy?'Continuing…':'Continue game at no charge'} <ArrowRight size={17}/></button>
    {notice&&<p role="status">{notice}</p>}{error&&<Alert>{error}</Alert>}
  </section>;
  return <section className="live-revision paid-plan-recovery delivery-failed" role="status">
    <span className="eyebrow">GAME DELIVERY STOPPED</span>
    <h3>Your game needs help</h3>
    <p>No complete pack is available yet. Your paid order and saved work remain here; you do not need to pay again.</p>
    <a className="button" href={'mailto:support@paperadventure.app?subject=' + encodeURIComponent('Game delivery stopped · order ' + order.id.slice(0, 8).toUpperCase())}>Email support about this order <ArrowRight size={17}/></a>
    <a className="delivery-report-link" href="#order-help" onClick={() => { const help = document.getElementById('order-help'); if (help) help.open = true; }}>Or report a problem on this order</a>
  </section>;
}

export function orderNextStep(order) {
  const review=order.planReview||{},remake=order.remake;
  if(order.status==='refunded')return {title:'This order was refunded',detail:'There is no game creation action on this order.'};
  if(!order.paidAt)return {title:'Payment is not confirmed',detail:'No game package will be created until payment is confirmed.'};
  if(order.kind==='ready')return order.filesReady?{title:'Download your game',detail:'The complete ZIP contains the Player Pack and adult guide.',href:'#download-game',action:'Go to downloads'}:{title:'Waiting for your files',detail:'This order will show downloads when its files are ready.'};
  if(review.pending)return {title:review.qualityReplanUsed?'Your corrected plan is being prepared':'Your personal plan is being prepared',detail:'No action is needed now. This page updates automatically.'};
  if(review.storyScenesRequired&&review.status==='review'&&!review.themeReplanFailed)return review.storySceneRepairAvailable?{title:'Repair the story scenes',detail:'The saved plan needs complete story events before it can be approved. Your current files remain available.',href:'#personal-plan-review',action:'Go to scene repair'}:{title:'Get help with the story scenes',detail:'This plan cannot be approved until its scenes are reviewed. Your current files remain available.',href:'#order-help',action:'Open order help'};
  if(review.themeReplanFailed&&(order.themePlanRepairAvailable||review.formatResumeAvailable))return {title:'Continue the saved plan check',detail:'The correction stopped before approval. Continue on this paid order; existing PDFs remain available.',href:'#order-remake',action:'Go to plan recovery'};
  if(review.themeReplanFailed)return {title:'Get help with the stopped plan correction',detail:'The original files remain available. The correction needs a review before it can continue.',href:'#order-help',action:'Open order help'};
  if(review.status==='review'&&!review.pending)return {title:review.qualityReplanUsed?'Review the corrected plan':'Review your plan',detail:'Check the story and five checkpoints. Approving the plan starts the game package.',href:'#personal-plan-review',action:'Go to plan review'};
  if(review.status==='needs_help')return review.activeVersion>0?{title:'Return to your saved plan',detail:'A valid version is saved on this paid order. Review it to continue.',href:'#personal-plan-review',action:'Go to saved plan'}:review.retryAvailable?{title:'Retry your plan',detail:'A no-charge retry is available on this paid order.',href:'#personal-plan-review',action:'Go to plan retry'}:{title:'Get help with your plan',detail:'The plan stopped and needs a review before a package can be made.',href:'#order-help',action:'Open order help'};
  if(['queued','generating'].includes(remake?.status))return {title:'Your new game pack is being prepared',detail:'No action is needed now. Saved steps and current files remain on this order.'};
  if(remake?.status==='failed')return remake.recoveryAvailable?{title:'Continue the saved game check',detail:'The replacement stopped. Resume the saved work on this paid order; no new checkout is needed.',href:'#order-remake',action:'Go to game recovery'}:{title:'Get help with the stopped replacement',detail:'The existing PDFs remain available. The replacement needs a review before it can continue.',href:'#order-help',action:'Open order help'};
  if(order.themePlanRepairAvailable&&!review.qualityReplanUsed)return {title:'Start the plan correction',detail:'The corrected theme plan will be prepared on this paid order.',href:'#order-remake',action:'Go to plan correction'};
  if(['queued','generating'].includes(review.status))return {title:review.qualityReplanUsed?'Your corrected plan is being prepared':'Your personal plan is being prepared',detail:'No action is needed now. This page updates automatically.'};
  if(order.status==='failed')return order.savedCopyRecoveryAvailable?{title:'Continue the saved game check',detail:'All five checkpoints are saved. Continue the interrupted wording check on this paid order without another checkout.',href:'#delivery-recovery',action:'Go to game recovery'}:order.deliveryRetryAvailable?{title:'Retry game delivery',detail:'Your approved plan is saved. Retry creation on this paid order at no charge.',href:'#delivery-recovery',action:'Go to delivery recovery'}:{title:'Get help with game delivery',detail:'No complete package was delivered. Ask for help on this order without paying again.',href:'#order-help',action:'Open order help'};
  if(order.filesReady)return {title:'Download your game',detail:'The complete ZIP contains the Player Pack and adult guide.',href:'#download-game',action:'Go to downloads'};
  return {title:'Your game is being prepared',detail:'No action is needed now. This page updates automatically.'};
}

export function PlanPreparationProgress({review}) {
  const work=review.progress;
  const completed=work?.reviewPassed?3:work?.formatChecked?2:work?.candidateSaved?1:0;
  const labels={queued:'Waiting to start your plan',generating:'Writing your story plan',validating:'Checking the plan structure',repairing:'Refining the plan structure',auditing:'Checking the story and theme',correcting:'Refining the story and theme',ready:'Saving your plan for review'};
  const current=labels[work?.phase]||labels[review.status]||'Preparing your plan';
  return <div className="plan-preparation-progress" aria-label="Personal plan preparation progress" aria-busy="true">
    <strong>{current}</strong>
    <progress max={3} {...(completed?{value:completed}:{})} aria-label="Saved plan preparation milestones"/>
    <p>{completed ? `${completed} of 3 steps saved` : 'Working on the first step'} · Draft, format check, story review. Progress changes when a step is saved.</p>
  </div>;
}

export function OrderNextStep({order}) {
  const next=orderNextStep(order);
  if(next.href==='#download-game'||next.href==='#delivery-recovery')return null;
  const review=order.planReview;
  const preparingPlan=order.kind==='custom'&&order.paidAt&&!order.filesReady&&(review?.pending||['queued','generating'].includes(review?.status));
  return <section className="order-next-step" aria-label="Next step" aria-live="polite">
    <span className="eyebrow">NEXT STEP</span><h2>{next.title}</h2><p>{next.detail}</p>
    {preparingPlan&&<PlanPreparationProgress review={review}/>}
    {next.href&&<a className="button" href={next.href} onClick={next.href==='#order-help'?()=>{const help=document.getElementById('order-help');if(help)help.open=true;}:undefined}>{next.action} <ArrowRight size={18}/></a>}
  </section>;
}

const pdfPhaseText = {
  story: 'creating and checking the game content',
  pdf: 'building the two PDFs',
  storage: 'saving the PDF files',
  delivery_check: 'checking the saved files',
  delivered: 'completed',
};

export function OrderPackage({order,orderId,selectedPaper,setSelectedPaper}) {
  const ready = order.filesReady;
  const correctingTheme = themeUpdatePending(order);
  const guide = order.sku.includes('classroom') ? 'Teacher Guide' : 'Host Guide';
  const approved = order.kind === 'ready' || Boolean(order.planReview?.confirmedVersion || order.plan?.planConfirmed);
  const state = ready ? correctingTheme || order.remake && order.remake.status !== 'ready' ? 'Original pack ready to download' : 'Ready to download' : order.status === 'failed' ? 'Game package creation stopped' : !approved ? 'Waiting for plan approval' : order.status === 'pending_payment' ? 'Waiting for payment confirmation' : order.generationProgress && !order.generationProgress.storyReady ? 'Creating and checking your game' : order.status === 'fulfilling' ? 'Creating and checking your PDFs' : 'PDF creation is queued';
  const paper = order.kind === 'ready' ? selectedPaper : order.paper;
  const progress = order.generationProgress;
  const originalProgress = ready && (correctingTheme || order.remake && order.remake.status !== 'ready');
  const detailed=Boolean(progress?.blueprintStepTotal);
  const progressTotal=detailed?progress.blueprintStepTotal+7:8;
  const progressLabel = progress?.phase === 'delivered' ? originalProgress ? 'Original version complete' : 'Complete' : progress?.phase === 'pdf' ? 'Building and checking PDFs' : progress?.phase === 'audit' ? 'Checking the printed puzzles' : progress?.phase === 'checkpoint' ? `Creating checkpoint ${progress.currentStage} of 5` : detailed?`Preparing story materials (${progress.blueprintStepsCompleted} of ${progress.blueprintStepTotal} parts saved)`:'Creating the game blueprint';
  const progressValue = progress?.phase === 'delivered' ? progressTotal : progress?.phase === 'pdf' ? progressTotal-1 : (detailed?progress.blueprintStepsCompleted:progress?.blueprintReady?1:0) + (progress?.completedStages.length || 0) + (detailed&&progress?.auditPassed?1:0);
  const currentStep={blueprint_frame:'Writing the story framework',blueprint_material:`Preparing material ${progress?.activeStage||1} of 5`,blueprint_closing:'Writing the ending',blueprint:'Assembling the saved materials',checkpoint:`Building checkpoint ${progress?.activeStage||1} of 5`,audit:'Checking the printed puzzles'}[progress?.activeStep];
  const stepState={queued:'The next step is queued.',running:'This step is being prepared.',retrying:'Retrying this step; completed work is saved.',waiting_for_update:'Waiting for a new update. Saved work will be checked for recovery.',stopped:'Generation has stopped.',complete:'All files are ready.'}[progress?.stepState];
  return <section className={'order-package' + (order.status === 'failed' ? ' order-package-failed' : '')} aria-labelledby="order-package-title">
    <span className="eyebrow">YOUR GAME PACKAGE</span>
    <h2 id="order-package-title">{state}</h2>
    <p>{ready ? correctingTheme ? 'These are the original PDFs. The corrected theme plan and replacement PDFs have not been delivered; follow the status above before using this pack.' : order.remake && order.remake.status !== 'ready' ? 'These are your earlier PDFs. The new paper-material version has not been published yet; its current status is shown above.' : 'Your complete printable adventure is ready below.' : order.status === 'failed' ? 'No complete game package was delivered. There are no files to download at the moment.' : order.status === 'pending_payment' ? 'Payment has not been confirmed for this order.' : approved ? 'The full game package is being prepared. You can return to this order later.' : 'Approve a personal plan before the full PDFs can be created.'}</p>
    {ready && order.kind === 'custom' && <p className="live-note">{originalProgress ? 'These checks apply to the original version. The replacement has not been delivered.' : order.deliveryCheckKind==='puzzle_and_pdf' ? 'All five printed puzzles and both PDF files checked and ready.' : order.contentReviewPassed ? 'Game content check passed · Both PDF files checked and ready.' : 'Both PDF files are ready. This edition predates the current full-game content check.'}</p>}
    {progress && approved && (!ready || originalProgress) && <div className="order-game-progress" aria-label={originalProgress?'Original version progress':'Game creation progress'}>
      <strong>{order.status === 'failed' ? 'Stopped while ' + progressLabel.toLowerCase() : progressLabel}</strong>
      <div className="order-game-progress-track" role="progressbar" aria-valuenow={progressValue} aria-valuemin="0" aria-valuemax={progressTotal} aria-label={originalProgress?'Original version steps completed':'Game creation steps completed'}><span style={{width:`${Math.round(progressValue / progressTotal * 100)}%`}}/></div>
      <p>{progress.blueprintReady ? 'Blueprint saved' : 'Blueprint pending'} · {progress.completedStages.length} of 5 checkpoints saved · {progress.auditPassed ? (order.deliveryCheckKind==='puzzle_and_pdf'?'Puzzles checked':'Game check passed') : 'Game check pending'} · {ready ? 'PDFs ready' : 'PDFs pending'}</p>
      {detailed&&<p role="status">{stepState} {progress.stepState!=='complete'&&currentStep?`${currentStep}. `:''}{progress.lastSavedAt?`Last saved: ${new Date(progress.lastSavedAt.replace(' ','T')+'Z').toLocaleString()}.`:'No step has been saved yet.'}</p>}
      {order.status === 'failed' && <p>Completed steps are saved on this paid order. The history below shows what stopped; support can review this order without another purchase.</p>}
    </div>}
    {progress?.deliveryEdition==='baseline'&&<p className="live-note">{ready?'Your paper mission briefing is ready.':'Preparing your paper mission briefing.'} It keeps your approved story and uses the five checked paper puzzles. The adult guide explains how to narrate the outcome.</p>}
    {!ready && <div className="order-package-files" aria-label="Files in your package">
      <div><strong>Player Pack</strong><span>Children’s activities · PDF</span><small>{ready ? 'Ready' : 'Not ready'}</small></div>
      <div><strong>{guide}</strong><span>Adult instructions and answers · PDF</span><small>{ready ? 'Ready' : 'Not ready'}</small></div>
      <div><strong>Complete game</strong><span>Both PDFs together · ZIP</span><small>{ready ? 'Ready' : 'Not ready'}</small></div>
    </div>}
     {ready && (originalProgress ? <details className="order-earlier-downloads"><summary>Download existing PDFs while the replacement is pending</summary><div id="download-game" className="order-package-downloads">
       <p className="live-note">These files belong to the original version.</p>
       <CompletePackDownload orderId={orderId} paper={paper} setting={order.sku.includes('classroom') ? 'classroom' : 'home'} label="Download original game · ZIP"/>
       <div className="live-downloads">{['player','guide'].map(role=><a key={role} href={'/api/v1/files/' + orderId + '/' + role + '?paper=' + paper}>{role === 'player' ? 'Original Player Pack' : `Original ${guide}`} <DownloadSimple size={17}/></a>)}</div>
     </div></details> : <div id="download-game" className="order-package-downloads">
      {order.kind === 'ready' ? <label className="order-paper-choice">Paper size<select aria-label="Paper size" value={selectedPaper} onChange={event=>setSelectedPaper(event.target.value)}><option value="A4">A4</option><option value="Letter">US Letter</option></select></label> : <p className="live-note">Paper size: {paper === 'Letter' ? 'US Letter' : paper}</p>}
      <CompletePackDownload orderId={orderId} paper={paper} setting={order.sku.includes('classroom') ? 'classroom' : 'home'}/>
      <div className="live-downloads">{['player','guide'].map(role=><a key={role} href={'/api/v1/files/' + orderId + '/' + role + '?paper=' + paper}>{role === 'player' ? 'Player Pack' : guide} <DownloadSimple size={17}/></a>)}</div>
     </div>)}
  </section>;
}

export function PackRemake({order,refresh}) {
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  const remake = order.remake;
  if (order.kind !== 'custom' || !order.paidAt || !order.filesReady || ((order.gamePackVersion || 1) >= 2 && !order.qualityUpgradeAvailable && !order.themePlanRepairAvailable && !order.planReview?.qualityReplanUsed && !order.planReview?.themeReplanFailed && !remake)) return null;
  const active = remake && ['queued','generating'].includes(remake.status);
  const waiting = remake?.status === 'queued';
  const done = remake?.status === 'ready';
  const failed = remake?.status === 'failed';
  const copyTitle = remake?.copyResumeAvailable ? 'Saved wording is ready for its remaining review' : remake?.copyCheck?.phase==='format' ? 'Saved wording stopped at the format check' : remake?.copyCheck?.code==='DELIVERY_COPY_AUDIT_PROTOCOL' ? 'The review response could not be verified' : remake?.copyCheck?.phase==='render' ? 'Saved wording stopped at the PDF layout check' : null;
  const failedTitle = copyTitle || (remake?.layoutRecoveryAvailable ? 'The PDF refresh stopped before rendering' : remake?.phase === 'blueprint' ? 'New pack stopped at the blueprint check' : remake?.phase === 'repair' ? `New pack stopped while repairing checkpoint ${remake.problemStage || 'materials'}` : remake?.phase === 'checkpoint' ? `New pack stopped at checkpoint ${remake.problemStage || remake.currentStage || ''}` : remake?.phase === 'audit' ? 'New pack stopped at the game review' : 'New pack stopped at PDF delivery');
  const blueprintDone = remake?.blueprintStepsCompleted ?? (remake?.blueprintReady ? 1 : 0);
  const blueprintTotal = remake?.blueprintStepTotal ?? 1;
  const completed = remake?.savedSteps ?? blueprintDone + (remake?.completedStages?.length || 0) + (remake?.storyReady ? 1 : 0) + (done ? 1 : 0);
  const total = remake?.totalSteps ?? blueprintTotal + 7;
  const step = remake?.phase==='repair' ? `Repairing checkpoint ${remake.problemStage || 'materials'}` : !remake?.blueprintReady ? `Preparing the game blueprint (${blueprintDone} of ${blueprintTotal} parts saved)` : remake.completedStages.length < 5 ? `Creating and checking checkpoint ${remake.currentStage} of 5` : !remake.storyReady ? 'Checking the complete game' : 'Building and checking both PDFs';
  async function start(retry=false) {
    setBusy(true); setError('');
    const consent=retry&&remake?.copyCheck?.factRepairAvailable?{action:'complete_saved_facts',allowOneExtraReview:true}:null;
    try { await api(`/api/v1/orders/${order.id}/pack-remake${retry?'/retry':''}`,{method:'POST',...(consent?{headers:{'content-type':'application/json'},body:JSON.stringify(consent)}:{})}); await refresh(); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  const themePlanStage=order.planReview?.qualityReplanUsed&&order.planReview.status!=='confirmed';
  const themePlanNeedsHelp=order.planReview?.themeReplanFailed&&!order.themePlanRepairAvailable;
  if(themePlanNeedsHelp||(order.themePlanRepairAvailable||themePlanStage)&&(!remake||remake.status==='ready')){
    async function repairThemePlan(){
      setBusy(true);setError('');
      try{await api(`/api/v1/orders/${order.id}/plan`,{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify(order.planReview?.formatResumeAvailable?{action:'resume_saved_plan',version:order.planReview.activeVersion}:{action:'quality_replan'})});await refresh();}
      catch(failure){setError(failure.message);}finally{setBusy(false);}
    }
    return <section id="order-remake" className="order-pack-remake" aria-labelledby="order-remake-title">
      <span className="eyebrow">IMPROVED GAME PACK</span>
      <h2 id="order-remake-title">{order.themePlanRecoveryAvailable?'Your plan recovery is ready':themePlanStage?order.planReview.status==='review'?'Review your corrected story plan':'Preparing your corrected story plan':themePlanNeedsHelp?'Story plan correction stopped':order.planReview?.themeReplanFailed?'Story plan needs review':'First, review the story theme'}</h2>
      <p>{themePlanStage?'Your replacement starts with a theme-faithful plan. After it passes review, you approve it before the five checkpoints and PDFs are built.':themePlanNeedsHelp?order.planReview?.formatResumeAvailable?'The plan correction stopped at a format check. Continue the saved work below before approving replacement PDFs.':'The plan correction stopped. No replacement PDFs were created. The original version remains downloadable below; use the order help section for review.':order.planReview?.themeReplanFailed?'The last plan correction stopped. Any saved draft stays on this order for review. A further attempt is available only within this order\'s existing allowance.':'Review a corrected story plan before rebuilding the game on this paid order.'}</p>
      <OrderUpdateProgress order={order}/>
      {order.planReview?.formatResumeAvailable&&<><p>Your failed draft is saved. Continue its plan check before approving any replacement PDFs. Your original files stay available.</p><button type="button" className="button" onClick={repairThemePlan} disabled={busy}>{busy?'Continuing…':'Update game pack at no charge'} <ArrowRight size={17}/></button></>}
      {order.themePlanRecoveryAvailable&&<p>One recovery attempt is available using the updated theme checks. Start it below, then review and approve the corrected plan before replacement PDFs are created. Your original files remain available.</p>}
      {order.themePlanRepairAvailable&&!order.planReview?.formatResumeAvailable&&<button type="button" className="button" onClick={repairThemePlan} disabled={busy}>{busy?'Starting…':'Update game pack at no charge'} <ArrowRight size={17}/></button>}
      {error&&<Alert>{error}</Alert>}
    </section>;
  }
  return <section id="order-remake" className="order-pack-remake" aria-labelledby="order-remake-title">
    <span className="eyebrow">IMPROVED GAME PACK</span>
    <OrderUpdateProgress order={order}/>
    <h2 id="order-remake-title">{done?order.qualityUpgradeAvailable?'A stronger quality version is available':'Your new game pack is ready':failed?failedTitle:active?waiting?'New pack is waiting for its next step':'Your new pack is being made':'Remake this pack on your paid order'}</h2>
    {done?<><p>Your current Player Pack and adult guide are ready in the download section. {order.qualityUpgradeAvailable?'You can rebuild this game with stronger story, printed-clue and guide checks on this same paid order. Current files stay available until both replacement PDFs pass every check.':'The game, PDF and storage checks passed. There is no new charge.'}</p>{order.qualityUpgradeAvailable&&<button type="button" className="button" onClick={()=>start()} disabled={busy}>{busy?'Starting…':'Update game pack at no charge'} <ArrowRight size={17}/></button>}<div className="order-remake-original"><strong>Earlier version</strong><p>Your original PDFs are still available if you want to compare them.</p><a href={`/api/v1/files/${order.id}/player?paper=${order.paper}&version=1`}>Download original Player Pack <DownloadSimple size={16}/></a><a href={`/api/v1/files/${order.id}/guide?paper=${order.paper}&version=1`}>Download original adult guide <DownloadSimple size={16}/></a></div></>:failed?<><p role="status">{remake.failureReason} Your current PDFs are still available in the download section below. No new pack was delivered and there is no new charge.</p><p className="order-remake-count">Story setup {blueprintDone} of {blueprintTotal} parts saved · {remake.completedStages.length} of 5 checkpoints saved · New PDFs not published</p>{remake.upgradeAvailable&&<p>The earlier generator could not complete this pack under the current delivery standard. The new rebuild checks complete sentences, exact printed names, playable clues and balanced guide pages on this same paid order. Your current PDFs remain available until the replacement passes.</p>}{remake.recoveryAvailable?<button type="button" className="button" onClick={()=>start(true)} disabled={busy}>{busy?'Continuing…':remake.copyCheck?.factRepairAvailable?'Complete saved facts and review at no charge':remake.copyResumeAvailable?'Continue saved game check at no charge':'Update game pack at no charge'} <ArrowRight size={17}/></button>:<p>Please use the order help section below for a review. Your saved work and current files remain on this order.</p>}</>:active?<><p role="status">{waiting?'The next generation step is queued.':'This step is being built and checked.'} {step}. Completed work is saved after each step. You may leave this page and return later; your current PDFs remain downloadable below.</p><div className="order-game-progress-track" role="progressbar" aria-valuenow={completed} aria-valuemin="0" aria-valuemax={total} aria-label="Completed new game pack steps"><span style={{width:`${Math.round(completed/total*100)}%`}}/></div><p className="order-remake-count">{completed} of {total} delivery steps saved · Story setup {blueprintDone} of {blueprintTotal} · {remake.completedStages.length} of 5 checkpoints saved · New PDFs pending.</p><p className="live-note">The progress bar updates whenever a story part, checkpoint, review or PDF package is saved. Last saved update: {remake.updatedAt ? new Date(remake.updatedAt.replace(' ','T') + 'Z').toLocaleString() : 'pending'}.</p><button type="button" className="button-quiet" onClick={refresh}>Refresh new-pack status</button><p className="live-note">Status also refreshes automatically about every 5 seconds while this tab is open.</p></>:<><p>{order.qualityUpgradeAvailable?'This pack was made before our stronger game and guide checks were introduced. You can rebuild all five checkpoints using your approved plan and the current quality rules.':'Your earlier pack uses the text-focused format. We can use your approved story and plan to create a new pack with printable activities for all five checkpoints.'} This stays on order {order.id.slice(0,8).toUpperCase()} and does not require payment.</p><p>Your current Player Pack and guide stay available below while the new version is generated. The download buttons switch to the new files only after the whole game and both PDFs pass checks.</p><button type="button" className="button" onClick={()=>start()} disabled={busy}>{busy?'Starting…':'Update game pack at no charge'} <ArrowRight size={17}/></button></>}
    {error&&<Alert>{error}</Alert>}
  </section>;
}

function PdfGenerationHistory({order}) {
  const attempts = order.pdfGenerationHistory || [];
  if (order.kind !== 'custom' || !order.planReview?.confirmedVersion && attempts.length === 0) return null;
  const rounds = [...new Set(attempts.map(item=>item.round))];
  return <section className="order-generation-history" aria-labelledby="order-history-title">
    <span className="eyebrow">PDF PROGRESS</span><h2 id="order-history-title">Generation history</h2>
    <p>{attempts.length ? 'A round can contain an automatic retry. These are delivery attempts after plan approval, not plan edits.' : order.generationProgress && !order.generationProgress.storyReady ? 'The game blueprint and checkpoints are being saved first. PDF creation begins after the complete game passes its check.' : 'Your approved plan is saved. The first PDF attempt has not been recorded yet.'}</p>
    {rounds.map(round=><div className="order-generation-round" key={round}>
      <h3>{round === 1 ? 'First PDF build' : 'Included delivery retry'}</h3>
      <ol>{attempts.filter(item=>item.round===round).map(item=>{
        const status = item.status === 'published' ? 'Completed' : item.status === 'generating' ? 'In progress' : item.status === 'interrupted' ? 'Interrupted' : 'Failed';
        const phase = item.phase && pdfPhaseText[item.phase];
        const detail = item.status === 'published' ? 'Both PDFs were published.' : item.status === 'generating' ? `Currently ${phase || 'creating your PDFs'}.` : !item.detailsRecorded ? 'This earlier attempt stopped; a detailed reason was not saved.' : `Stopped while ${phase || 'creating your PDFs'}. ${item.failureReason || 'The exact cause is not available in this record.'}`;
        const date = item.recordedAt ? new Date(item.recordedAt.replace(' ','T') + 'Z') : null;
        return <li key={item.attempt}><div><strong>{item.trigger === 'automatic_retry' ? 'Automatic retry' : item.trigger === 'customer_retry' ? 'Your free retry' : 'Initial attempt'}</strong><span className={'order-attempt-state state-' + item.status}>{status}</span></div><p>{detail}</p>{date && !Number.isNaN(date.getTime()) && <time dateTime={date.toISOString()}>{date.toLocaleString()}</time>}</li>;
      })}</ol>
    </div>)}
    {order.status === 'failed' && <p className="order-history-conclusion">No attempt has produced a downloadable package for this order.</p>}
  </section>;
}

export function LiveOrder({ Link, orderId }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [selectedPaper, setSelectedPaper] = useState('A4');
  const [helpRequest,setHelpRequest] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState('');
  const refreshLock = useRef(false);
  const refresh = async ({ announce = false } = {}) => {
    if (refreshLock.current) return;
    refreshLock.current = true;
    if (announce) setRefreshing(true);
    try {
      const data = await api(`/api/v1/orders/${orderId}`);
      if (data?.id !== orderId || !['ready', 'custom'].includes(data.kind)) throw new Error('The order service returned an invalid response. Please try again later.');
      setOrder(data);
      setError('');
      if (announce) {
        const remakeActive = ['queued', 'generating'].includes(data.remake?.status);
        const remakeStopped = data.remake && !['ready', 'queued', 'generating'].includes(data.remake.status);
        setRefreshNotice(remakeActive
          ? 'Status updated. Your new pack is still being prepared.'
          : remakeStopped
            ? 'Status updated. The new pack still needs attention; your current files remain available.'
            : data.filesReady
              ? 'Status updated. Your latest available files are ready below.'
              : 'Status updated. No downloadable files are available yet.');
      }
    } catch (failure) {
      setError(failure.message);
      if (announce) setRefreshNotice('');
    } finally {
      refreshLock.current = false;
      if (announce) setRefreshing(false);
    }
  };
  const openHelp = (kind,description) => {
    setHelpRequest({kind,description});
    requestAnimationFrame(()=>{const section=document.getElementById('order-help');if(section){section.open=true;section.scrollIntoView({behavior:'smooth',block:'start'});}});
  };
  useEffect(() => { setOrder(null); setError(''); setRefreshNotice(''); refresh(); }, [orderId]);
  useEffect(() => {
    const awaitingApproval = order?.kind === 'custom' && order.planReview?.status === 'review' && !order.planReview.pending;
    if (!order || awaitingApproval || !['pending_payment','paid','fulfilling'].includes(order.status) && !['queued','generating'].includes(order.remake?.status) && !['queued','generating'].includes(order.planReview?.status)) return;
    const update = () => { if (document.visibilityState === 'visible') refresh(); };
    const timer = setInterval(update, 5000);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [orderId,order?.status,order?.remake?.status,order?.planReview?.status,order?.planReview?.pending,order?.planReview?.confirmedVersion]);

  if (error) return <main className="extended-page live-page order-page"><div className="order-workspace"><Alert>{error}</Alert><button className="button" type="button" onClick={() => refresh({ announce: true })} disabled={refreshing}>{refreshing ? 'Checking order…' : 'Retry order status'} {refreshing ? <ArrowClockwise className="is-spinning" size={18}/> : <ArrowRight size={18}/>}</button><p><Link to="/en/account/">Sign in with Google</Link> if your session has expired.</p></div></main>;
  if (!order) return <main className="extended-page live-page order-page"><div className="order-workspace" role="status">Checking your order…</div></main>;

  const title = order.plan?.title || (order.kind === 'ready' ? order.sku.replaceAll('_',' ') : 'Your custom adventure');
  const paid = Boolean(order.paidAt);
  const approved = Boolean(order.planReview?.confirmedVersion);
  const correctingTheme = themeUpdatePending(order);
  const directRecovery=orderNextStep(order).href==='#delivery-recovery'&&order.kind==='custom'&&paid&&order.deliveryRetryAvailable;
  const optionalUpgrade=order.kind==='custom'&&order.filesReady&&!correctingTheme&&(!order.remake||order.remake.status==='ready')&&(order.gamePackVersion||1)<2&&!order.qualityUpgradeAvailable;
  return <main className="extended-page live-page order-page">
    <div className="order-workspace">
      <Link className="order-back" to="/en/my-adventures/">← My adventures</Link>
      <header className="order-heading">
        <div><span className="eyebrow">YOUR ADVENTURE ORDER</span><h1>{title}</h1><p>Order {order.id.slice(0,8).toUpperCase()} · {order.kind === 'ready' ? 'Ready-made' : order.sku.includes('classroom') ? 'Custom Classroom' : 'Custom Home'}</p></div>
        <span className={'order-current-status status-' + order.status}>{order.filesReady && (correctingTheme || order.remake && order.remake.status !== 'ready') ? 'Original files ready' : orderLabel[order.status] || order.status}</span>
      </header>
      <OrderNextStep order={order}/>
      {directRecovery&&<div id="delivery-recovery"><DeliveryRecovery order={order} refresh={refresh}/></div>}
      <div className="order-layout">
        <div className="order-main">
          {!optionalUpgrade&&<PackRemake order={order} refresh={refresh}/>}
          <OrderPackage order={order} orderId={orderId} selectedPaper={selectedPaper} setSelectedPaper={setSelectedPaper}/>
          {optionalUpgrade&&<details className="order-optional-upgrade"><summary>Optional no-charge quality upgrade</summary><PackRemake order={order} refresh={refresh}/></details>}
          <OrderQualityActions order={order} onHelp={openHelp}/>
          <RevisionForm order={order} refresh={refresh}/>
          <PdfGenerationHistory order={order}/>
          {order.planReview && (approved&&!(order.planReview.qualityReplanUsed&&order.planReview.status!=='confirmed') ? <details className="order-approved-plan"><summary>View your approved five-checkpoint plan</summary><PaidPlanReview order={order} refresh={refresh}/></details> : <PaidPlanReview order={order} refresh={refresh}/>)}
          {!order.planReview && order.plan && <details className="order-plan-review"><summary>Review the story and five-checkpoint plan</summary><PlanPreview plan={order.plan}/></details>}
        </div>
        <aside className="order-sidebar" aria-label="Order details">
          <h2>Order details</h2>
          <dl><div><dt>Payment</dt><dd>{paid ? 'Confirmed' : 'Not confirmed'}</dd></div><div><dt>Total</dt><dd>{formatUsd(order.amountTotal)} · {order.currency}</dd></div><div><dt>Paper</dt><dd>{order.paper === 'Letter' ? 'US Letter' : order.paper || 'Choose on download'}</dd></div>{order.kind === 'custom' && <div><dt>Plan</dt><dd>{approved ? `Version ${order.planReview.confirmedVersion} approved` : 'Awaiting approval'}</dd></div>}<div><dt>Files</dt><dd>{order.filesReady ? correctingTheme ? order.planReview?.themeReplanFailed ? 'Original ready · correction stopped' : 'Original ready · correction pending' : order.remake && order.remake.status !== 'ready' ? 'Original ready · new pending' : 'Ready' : 'Not available yet'}</dd></div></dl>
          {order.filesReady && order.accessExpiresAt && <p>Online re-download until {new Date(order.accessExpiresAt.replace(' ','T') + 'Z').toLocaleDateString()}.</p>}
          {order.kind === 'custom' && paid && <p>Plan changes happen before approval. Checkpoint revisions appear after your complete game is delivered.</p>}
          <div className="order-status-action"><strong>Order status</strong><p>Progress refreshes automatically while this page is open. You can also check it now.</p><button type="button" className="button-quiet" onClick={() => refresh({ announce: true })} disabled={refreshing}>{refreshing ? 'Checking status…' : 'Refresh status'} <ArrowClockwise className={refreshing ? 'is-spinning' : ''} size={18}/></button>{refreshNotice && <p className="order-refresh-notice" role="status">{refreshNotice}</p>}</div>
        </aside>
      </div>
       <section id={directRecovery?undefined:'delivery-recovery'} className="order-help-footer" aria-label="Help with this order">
        {!directRecovery&&<DeliveryRecovery order={order} refresh={refresh}/>}
        <IssueForm orderId={orderId} failedDelivery={order.kind === 'custom' && order.status === 'failed' && paid} initialRequest={helpRequest}/>
        {order.status !== 'failed' && <p className="live-note">If a file is missing or incorrect, use the help form. A system correction does not use a paid revision.</p>}
      </section>
    </div>
  </main>;
}

export function LiveSamples(props) { return <FreeDownload {...props} />; }

export function LiveLegal({ kind }) {
  const [document, setDocument] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api(`/api/v1/legal/${kind}`).then(setDocument).catch(failure => setError(failure.message)); }, [kind]);
  return <main className="extended-page live-page"><Intro eyebrow="LEGAL INFORMATION" title={document?.title || 'Policy'}><p>{document ? `Effective ${document.effectiveAt} · version ${document.version}` : 'Loading the current policy…'}</p></Intro><section className="live-shell">{error ? <Alert>{error}</Alert> : document && <div className="live-panel legal-document">{document.sections.map((section, index) => <section key={index}><h2>{section.heading}</h2><p>{section.body}</p></section>)}</div>}</section></main>;
}

export function LivePricing({ Link, catalog, checkoutMode }) {
  const ready = catalog.offers.filter(offer => offer.kind === 'ready');
  const custom = catalog.offers.filter(offer => offer.kind === 'custom');
  const celebration = catalog.themes.find(theme => theme.id === 'celebration');
  const sampleReady = celebration?.home.freeSample && celebration?.classroom.freeSample;
  return <main className="extended-page live-page"><Intro eyebrow="PRICING & RIGHTS" title="Choose a finished game or make a new one."><p>{checkoutMode === 'test' ? 'Stripe test checkout is open after adult Google sign-in. Test cards move no real money; these USD prices are for flow testing.' : 'One-time prices in US dollars. Applicable tax and the final total appear in Stripe before payment.'}</p></Intro><section className="live-shell"><div className="live-price-grid"><div className="live-panel"><span className="eyebrow">READY-MADE</span><h2>Buy a fixed theme</h2><p>A fixed theme includes a Player Pack and adult guide for download after confirmed payment. No AI edits are included.</p>{ready.map(offer => <p key={offer.sku}><strong>{offer.setting === 'home' ? 'Home' : 'Classroom'}: {formatUsd(offer.unitAmount)}</strong> per published pack</p>)}<Link className="button" to="/en/themes/">{checkoutMode === 'test' ? 'Explore test packs' : 'Explore published themes'} <ArrowRight size={18} /></Link></div><div className="live-panel"><span className="eyebrow">CUSTOM-MADE</span><h2>Generate a new activity</h2><p>Choose a featured world or your own idea. One personal plan follows confirmed payment; after approval, five paper challenges, their material sheets and a matching adult guide are generated and checked.</p>{custom.map(offer => <p key={offer.sku}><strong>{offer.setting === 'home' ? 'Home' : 'Classroom'}: {formatUsd(offer.unitAmount)}</strong> per new activity</p>)}<p>Two successful plan reworks and three targeted edits are included before approval. Two successful single-checkpoint revisions within 30 days of first delivery are separate.</p><Link className="button" to="/en/create/">Start custom setup <ArrowRight size={18} /></Link></div></div><div className="live-panel live-price-note"><h2>Free fixed sample</h2><p>{sampleReady ? 'Celebration Home and Classroom are both available as free fixed trial packs; neither includes custom generation.' : 'A complete free sample is planned but not yet published.'}</p>{sampleReady && <><Link className="text-link" to="/en/samples/home/">Download Home trial <ArrowRight size={18} /></Link> <Link className="text-link" to="/en/samples/classroom/">Download Classroom trial <ArrowRight size={18} /></Link></>}<p>No subscription, points or automatic renewal. {productRights.home} {productRights.classroom} Online re-download lasts {productRights.onlineRedownloadMonths} months from confirmed payment for a fixed pack or first qualified delivery for a custom pack. Lawfully downloaded files remain usable within that scope. Final tax and refund terms are shown before payment.</p></div></section></main>;
}

export function LiveCheckout({ Link, catalog, checkoutMode }) {
  const params = new URLSearchParams(window.location.search);
  const ready = params.get('kind') === 'ready';
  const draft = (() => { try { return JSON.parse(localStorage.getItem('paw-draft') || '{}'); } catch { return {}; } })();
  const setting = ready ? params.get('setting') : draft.setting;
  const sku = `${ready ? 'ready' : 'custom'}_${setting}`;
  const offer = catalog?.offers.find(item => item.sku === sku);
  const themeId = params.get('theme') || '';
  const theme = catalog?.themes.find(item => item.id === themeId);
  const variantIds = ready && setting === 'classroom' ? theme?.classroom?.variantIds || [] : [];
  const [variantId, setVariantId] = useState('');
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(null);
  const [accountEmail, setAccountEmail] = useState('');
  useEffect(() => { let active = true; api('/api/v1/auth/session').then(session => { if (active) { setAuthenticated(Boolean(session.authenticated)); setAccountEmail(session.email || ''); } }).catch(() => { if (active) setAuthenticated(false); }); return () => { active = false; }; }, []);
  const customDraftReady = Boolean(draft.creatorVersion===3 && readySetup(draft));
  const eligible = Boolean(['home','classroom'].includes(setting) && offer?.saleEnabled && (ready ? ['published','test_ready'].includes(theme?.[setting]?.readyStatus) : customDraftReady));
  const accountRequired = checkoutMode === 'test' || !ready;
  const needsSignIn = accountRequired && !authenticated;
  const signInPath = `/en/account/?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  async function start(event) {
    event.preventDefault(); setBusy(true); setError('');
    const checkoutEmail = accountEmail || (accountRequired ? null : email);
    const body = ready ? { sku, themeId, packVersion: theme[setting].packVersion, variantId: variantId || null, email: checkoutEmail } : { ...draftSpec(draft), sku, email: checkoutEmail };
    try {
      const payload = JSON.stringify(body);
      const key = sessionStorage.getItem('paw-checkout-payload') === payload ? sessionStorage.getItem('paw-checkout-key') : crypto.randomUUID();
      sessionStorage.setItem('paw-checkout-key', key);
      sessionStorage.setItem('paw-checkout-payload', payload);
      const result = await api('/api/v1/checkout-intents', { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(body) });
      sessionStorage.removeItem('paw-checkout-key');
      sessionStorage.removeItem('paw-checkout-payload');
      window.location.assign(result.checkoutUrl);
    } catch (failure) { setError(failure.message); setBusy(false); }
  }
  return <main className="extended-page live-page"><Intro eyebrow="SECURE CHECKOUT" title="Review your order."><p>{checkoutMode === 'test' ? 'TEST MODE · Sign in with Google and use test-card details. No real payment is taken.' : 'One-time purchase. Stripe shows the final total before you pay.'}</p></Intro><section className="live-shell"><div className="live-panel"><span className="eyebrow">{ready ? 'FIXED PACK' : 'NEW CUSTOM ADVENTURE'}</span><h2>{ready ? `${theme?.title || 'Unknown theme'} · ${setting}` : `${setting || 'Custom'} adventure`}</h2><p>Listed price: <strong>{offer ? formatUsd(offer.unitAmount) : 'Unavailable'}</strong> before applicable tax.</p><p>{ready ? 'After confirmed payment, download this ready-made game from My adventures.' : 'Payment creates your personal five-checkpoint plan. Review and approve it, then we make the printable Player Pack and adult guide.'}</p><p>Online re-download lasts {productRights.onlineRedownloadMonths} months {ready ? 'from confirmed payment' : 'from first qualified delivery'}. </p>{!ready && <details><summary>Included changes and help</summary><p>Before approval: two successful whole-plan reworks and three successful targeted edits. After delivery: two successful single-checkpoint revisions within 30 days. If no plan works, contact support for assistance or refund-policy review.</p></details>}{!ready && customDraftReady && <dl className="live-review"><div><dt>Story idea</dt><dd>{draft.idea}</dd></div><div><dt>Players</dt><dd>{draft.players} · ages {draft.age}</dd></div><div><dt>Paper and play</dt><dd>{draft.paper} · {mechanicById(draft.gameplay?.primary)?.title}</dd></div></dl>}{!eligible ? <Alert>{!ready && !customDraftReady ? 'Finish your custom adventure setup before checkout.' : 'This product is not available for checkout.'}</Alert> : needsSignIn ? authenticated === null ? <p role="status">Checking adult sign-in…</p> : <div><Alert>Sign in with your adult Google account before checkout.</Alert><Link className="button" to={signInPath}>Sign in with Google <ArrowRight size={18} /></Link></div> : <form onSubmit={start}>{ready && variantIds.length > 0 && <label>Classroom story wording<select value={variantId} onChange={event => setVariantId(event.target.value)}><option value="">{themeId === 'halloween' ? 'Autumn classroom' : 'Winter classroom'}</option>{variantIds.map(id => <option key={id} value={id}>{id === 'halloween' ? 'Halloween classroom' : 'Christmas classroom'}</option>)}</select></label>}{accountEmail ? <p className="live-note">Buying with your Google account: <strong>{accountEmail}</strong></p> : accountRequired ? <p className="live-note">This order stays in your signed-in account. Stripe may ask for an email for the payment receipt.</p> : <label>Email for your receipt and downloads<input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></label>}<p className="live-note">{checkoutMode === 'test' ? 'Stripe test checkout takes no real money.' : <>Review the <Link to="/en/terms/">terms</Link> and <Link to="/en/refunds/">refund policy</Link> before paying. Stripe displays the final total.</>}</p><button className="button" disabled={busy}>{busy ? 'Preparing checkout…' : checkoutMode === 'test' ? 'Continue to Stripe test' : 'Continue to Stripe'} <ArrowRight size={18} /></button>{error && <Alert>{error}</Alert>}</form>}</div></section></main>;
}

