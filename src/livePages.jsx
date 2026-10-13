import { useEffect, useRef, useState } from 'react';
import { ArrowRight, DownloadSimple, WarningCircle, Books, Sparkle, Receipt } from '@phosphor-icons/react';
import { formatUsd, productRights } from '../shared/catalog.mjs';
import { draftSpec, readySetup } from './creatorDraft.mjs';
import { PlanPreview } from './creatorPlanPreview.jsx';
import { mechanicById } from '../shared/creator-plan.mjs';
import './creatorFlow.css';
import './livePages.css';
import FreeDownload from './freeDownload.jsx';
import { createDownloadZip } from './downloadZip.mjs';

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || 'The service could not complete this request.');
  return data;
}

function Intro({ eyebrow, title, children }) { return <section className="page-intro extended-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{children}</section>; }
function Alert({ children }) { return <p className="live-alert" role="alert"><WarningCircle size={18} /> {children}</p>; }

const orderLabel = { pending_payment: 'Payment not confirmed', paid: 'Payment confirmed · queued', fulfilling: 'Generating and checking', published: 'Files ready', failed: 'PDF creation stopped · action needed', refunded: 'Refunded' };

function CompletePackDownload({ orderId, paper, setting }) {
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
  return <div className="complete-pack-download"><button type="button" className="button complete-pack-button" disabled={busy} onClick={download}>{busy ? 'Preparing your complete pack…' : 'Download complete game · ZIP'} <DownloadSimple size={20} /></button>{busy && <p role="status">Fetching both {paper === 'Letter' ? 'US Letter' : 'A4'} PDFs…</p>}{notice && <p className="live-note" role="status">{notice}</p>}{error && <Alert>{error} No ZIP is saved unless both PDFs are available.</Alert>}</div>;
}

export function LiveAccount({ Link }) {
  const button = useRef(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    async function prepare() {
      try {
        setLoading(true); setError('');
        const requested = new URLSearchParams(window.location.search).get('returnTo');
        const destination = requested && /^\/en\/(create\/|checkout\/|themes\/|orders\/|my-adventures\/)/.test(requested) && !requested.includes('\\') ? requested : '/en/my-adventures/';
        const session = await api('/api/v1/auth/session');
        if (cancelled) return;
        if (session.authenticated) { window.location.replace(destination); return; }
        const config = await api('/api/v1/auth/google/config');
        if (!config.available || !config.clientId || !config.nonce) throw new Error('Google sign-in is not available yet.');
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
        window.google.accounts.id.initialize({
          client_id: config.clientId,
          nonce: config.nonce,
          callback: async result => {
            if (cancelled || !result?.credential) return;
            setBusy(true); setError('');
            try {
              await api('/api/v1/auth/google', { method: 'POST', body: JSON.stringify({ credential: result.credential }) });
              window.location.assign(destination);
            } catch (failure) { if (!cancelled) { setError(failure.message); setBusy(false); } }
          },
        });
        button.current.replaceChildren();
        window.google.accounts.id.renderButton(button.current, { theme: 'outline', size: 'large', shape: 'rectangular', text: 'signin_with', width: Math.min(360, button.current.clientWidth || 280) });
        setLoading(false);
      } catch (failure) { if (!cancelled) { setError(failure.message); setLoading(false); } }
    }
    prepare();
    return () => { cancelled = true; };
  }, [retry]);
  return <main className="extended-page live-page account-page"><section className="account-entry" aria-labelledby="account-title"><div className="account-benefits"><span className="eyebrow">YOUR ADVENTURE ACCOUNT</span><h1 id="account-title">Sign in to your adventures.</h1><p className="account-summary">Access your purchased packs, download your PDFs, and continue creating custom adventures.</p><ul className="account-benefit-list"><li><Books size={26} /><div><h2>Keep your packs together</h2><p>Find your purchased Home and Classroom adventures and download available Player Packs and adult guides.</p></div></li><li><Sparkle size={26} /><div><h2>Continue your custom adventure</h2><p>Return to saved planning drafts and follow your AI adventure from generation to files ready.</p></div></li><li><Receipt size={26} /><div><h2>Follow your orders</h2><p>Check payment and delivery status or get help with a purchase.</p></div></li></ul><Link className="text-link" to="/en/themes/">Browse adventures first <ArrowRight size={18} /></Link></div><div className="account-signin"><div className="live-panel account-card"><span className="eyebrow">FOR PARENTS &amp; TEACHERS</span><h2>Welcome to Paper Adventure</h2><p>Use your adult Google account to get started or return to your adventures.</p><div className="account-google" ref={button} aria-label="Sign in with Google" aria-busy={loading || busy} />{loading && <p className="account-status" role="status">Loading Google sign-in…</p>}{busy && <p className="account-status" role="status">Signing you in…</p>}{error && <><Alert>{error}</Alert><button type="button" className="button-quiet" onClick={() => setRetry(value => value + 1)}>Try again</button></>}<p className="account-child-note">No child account is needed.</p><p className="account-privacy">We use your verified Google email to find your adventures. We do not request access to your contacts or Google Drive. <Link to="/en/privacy/">Read our Privacy Notice</Link>.</p></div><p className="live-note account-support">Need help accessing a purchase? <Link to="/en/help/">Contact support <ArrowRight size={16} /></Link></p></div></section></main>;
}

export function LiveShelf({ Link }) {
  const [orders, setOrders] = useState(null); const [draft, setDraft] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false); const [error, setError] = useState('');
  const [section, setSection] = useState('games'); const [paper, setPaper] = useState('A4'); const [historyKind,setHistoryKind] = useState('paid'); const firstLoad = useRef(true);
  const needsAttention = order => order.product_kind === 'custom' && Boolean(order.paid_at) && (['paid','fulfilling'].includes(order.status) || order.status === 'failed');
  const refresh = () => api('/api/v1/my-orders').then(data => { setOrders(data.orders); if (firstLoad.current) { firstLoad.current = false; if (data.orders.some(needsAttention)) setSection('making'); } setError(''); }).catch(failure => { if (/Sign in|Verify/.test(failure.message)) setNeedsLogin(true); else setError(failure.message); });
  useEffect(() => { refresh(); api('/api/v1/my-draft').then(result => setDraft(result.draft)).catch(() => {}); }, []);
  useEffect(() => { if (!orders?.some(order => ['paid','fulfilling'].includes(order.status))) return; const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 10000); return () => clearInterval(timer); }, [orders]);
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
            {order.image && <img src={order.image} alt="" width="800" height="600" loading="lazy" />}
            <div className="shelf-game-copy"><span className="eyebrow">{order.setting === 'classroom' ? 'CLASSROOM' : 'HOME'} · {order.product_kind === 'ready' ? 'READY-MADE' : 'AI CUSTOM'}</span><h2>{order.title || 'Your adventure'}</h2>
              <p className={'shelf-status status-' + order.status}>{order.checkoutExpired ? 'Checkout expired · not paid' : order.status === 'failed' && !order.paid_at ? 'Checkout unsuccessful · not paid' : order.status === 'pending_payment' ? 'Unfinished checkout · not paid' : order.status === 'failed' && order.paid_at ? 'Paid · PDF creation stopped · action needed' : order.planStatus === 'needs_help' ? 'Paid · plan generation stopped · action needed' : order.planStatus === 'review' ? 'Paid · personal plan ready for review' : order.planStatus === 'confirmed' ? 'Paid · creating PDFs' : order.paid_at ? 'Paid · ' + (orderLabel[order.status] || order.status) : orderLabel[order.status] || order.status}</p>
              <p className="live-note">Order {order.id.slice(0,8).toUpperCase()} · {order.paid_at ? 'Paid ' + date(order.paid_at) : 'Started ' + date(order.created_at)} · {formatUsd(order.amount_total)}<br />{order.accessExpiresAt && 'Downloads until ' + date(order.accessExpiresAt)}</p>
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

function RevisionForm({ order, refresh }) {
  const [stageNumber, setStageNumber] = useState(1); const [instruction, setInstruction] = useState(''); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  const remaining = order.revisionLimit - order.revisionUsed;
  const shortcuts = ["Make the clue easier to read aloud, keeping the task and play style.","Reduce the reasoning difficulty, keeping one clear answer and the same task.","Clarify the printed instructions and hint without changing the story."];
  if (order.kind !== 'custom' || !order.filesReady || remaining <= 0 || !order.revisionExpiresAt || Date.parse(`${order.revisionExpiresAt}Z`) <= Date.now()) return null;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await api(`/api/v1/orders/${order.id}/revisions`, { method: 'POST', body: JSON.stringify({ stageNumber, instruction }) }); setNotice('Your local change is queued. It counts only after a revised file is published.'); setInstruction(''); refresh(); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <form className="live-revision" onSubmit={submit}><h3>Adjust one checkpoint</h3><p>{remaining} included successful {remaining === 1 ? 'revision' : 'revisions'} remain. Choose one checkpoint; a new adventure requires a separate order.</p><label>Checkpoint<select value={stageNumber} onChange={event => setStageNumber(Number(event.target.value))}>{[1,2,3,4,5].map(number => <option key={number} value={number}>Checkpoint {number}{order.plan?.stages?.[number-1] ? " · " + order.plan.stages[number-1].title : ""}</option>)}</select></label><div className="revision-shortcuts">{shortcuts.map((text,index)=><button key={text} type="button" className="button-quiet" onClick={()=>setInstruction(text)}>{["Simplify reading","Ease the difficulty","Clarify instructions"][index]}</button>)}</div><label>What should change?<textarea minLength="10" maxLength="350" required value={instruction} onChange={event => setInstruction(event.target.value)} placeholder="For example, make checkpoint 2 easier to read aloud." /></label><button className="button" disabled={busy}>{busy ? 'Submitting…' : 'Request local revision'}</button>{notice && <p role="status">{notice}</p>}{error && <Alert>{error}</Alert>}</form>;
}

function IssueForm({ orderId, failedDelivery = false }) {
  const [kind, setKind] = useState(failedDelivery ? 'delivery' : 'clue'); const [description, setDescription] = useState(''); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  const [cases, setCases] = useState([]);
  useEffect(() => { api(`/api/v1/orders/${orderId}/issues`).then(data => setCases(data.cases)).catch(() => {}); }, [orderId]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const result = await api(`/api/v1/orders/${orderId}/issues`, { method: 'POST', body: JSON.stringify({ issueType: kind, description }) });
      setNotice(`Report ${result.caseId} was saved on this order. For direct help, email support@paperadventure.app.`); setDescription('');
      const updated = await api(`/api/v1/orders/${orderId}/issues`); setCases(updated.cases);
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <details id="order-help" className="order-feedback"><summary>{failedDelivery ? 'Get help with this failed delivery' : 'Need help with this order?'}</summary><form className="live-revision" onSubmit={submit}><p>{failedDelivery ? 'Your PDFs did not pass the delivery check. Record the missing delivery here, or email support@paperadventure.app directly for assistance or refund review. No new payment is needed.' : 'Report a clue error, missing file, delivery issue or refund request.'} Do not include child names or photos.</p><label>Issue type<select value={kind} onChange={event => setKind(event.target.value)}><option value="clue">Clue or instructions</option><option value="answer">Answer or hint</option><option value="printing">Printing or layout</option><option value="delivery">Missing delivery</option><option value="refund">Refund request</option><option value="other">Other</option></select></label><label>What happened?<textarea minLength="10" maxLength="1000" required value={description} onChange={event => setDescription(event.target.value)} placeholder={failedDelivery ? 'For example: My approved plan is saved, but the PDFs were not delivered.' : undefined} /></label><button className="button" disabled={busy}>{busy ? 'Recording…' : 'Send report'}</button>{notice && <p role="status">{notice}</p>}{error && <Alert>{error}</Alert>}{cases.length > 0 && <p>Your reports: {cases.map(item => `${item.issue_type} (${item.status})`).join(', ')}</p>}</form></details>;
}

function PaidPlanReview({order,refresh}) {
  const review=order.planReview;
  const [mode,setMode]=useState('edit'),[scope,setScope]=useState('stage1'),[feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  if (!review || !['paid','fulfilling','published','failed'].includes(order.status)) return null;
  async function action(body) {
    setBusy(true);setError('');setNotice('');
    try {
      await api(`/api/v1/orders/${order.id}/plan`,{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify(body)});
      setNotice(body.action==='confirm'?'Plan approved. Your PDFs are now queued.':body.action==='select'?'Saved plan selected.':body.action==='retry_initial'?'A free recovery attempt is queued. You will not be charged again.':body.action==='resume_review'?'Your saved plan is ready to review again.':'Your plan change is queued. It uses an included change only if a valid new plan is delivered.');
      setFeedback('');await refresh();
    } catch(failure){setError(failure.message);} finally {setBusy(false);}
  }
  const reviewable=order.status==='paid'&&review.status==='review';
  return <section className="live-revision paid-plan-review" aria-label="Personal plan review"><span className="eyebrow">YOUR PAID PLAN</span><h3>{review.status==='confirmed'?'Approved plan':review.status==='needs_help'?'Plan generation stopped':review.status==='review'?'Review your plan':'Preparing your personal plan'}</h3>{reviewable?<p>Whole-plan reworks: {review.fullLimit-review.fullUsed} left · Targeted edits: {review.targetedLimit-review.targetedUsed} left. Only valid new plans delivered for review use a change.</p>:review.confirmedVersion?<p>Version {review.confirmedVersion} was approved for PDF generation.</p>:review.status==='needs_help'?<p>Your payment is confirmed, but we could not finish a valid plan. No PDF generation has started, and no plan change was used.</p>:<p>Plan generation and quality checks are in progress.</p>}{review.pending&&<p role="status">{review.pending==='initial'?'Creating your first plan':'Preparing your requested change'}… You can return later through My adventures.</p>}{review.status==='needs_help'&&<div className="paid-plan-recovery" role="status"><p>{review.activeVersion ? 'Your earlier valid plan is saved. Return to it to review, edit or approve it.' : review.retryAvailable ? 'You can try the first plan again once at no charge. If it still fails, report the problem below for help or refund-policy review.' : 'This plan needs manual help. Report the problem below for assistance or refund-policy review.'}</p>{review.retryAvailable&&<button type="button" className="button" disabled={busy} onClick={()=>action({action:'retry_initial'})}>{busy?'Requesting…':'Retry my plan at no charge'} <ArrowRight size={17}/></button>}{review.activeVersion>0&&<button type="button" className="button" disabled={busy} onClick={()=>action({action:'resume_review'})}>Return to my saved plan <ArrowRight size={17}/></button>}</div>}{review.versions.length>0&&<><p>Saved versions stay available without using another change.</p><div className="creator-plan-options">{review.versions.map(item=><article key={item.version} className={item.version===review.activeVersion?'selected':''}><h4>Version {item.version} · {item.plan.title}</h4><p>{item.plan.summary}</p><details open={item.version===review.activeVersion && reviewable}><summary>Read this five-checkpoint plan</summary><PlanPreview plan={item.plan}/></details>{reviewable&&item.version!==review.activeVersion&&<button type="button" className="button-quiet" disabled={busy} onClick={()=>action({action:'select',version:item.version})}>Use this version</button>}</article>)}</div></>}{reviewable&&<><div className="creator-source-choice"><button type="button" aria-pressed={mode==='edit'} onClick={()=>setMode('edit')}>Targeted edit</button><button type="button" aria-pressed={mode==='rework'} onClick={()=>setMode('rework')}>Whole-plan rework</button></div>{(mode==='edit'?review.targetedUsed<review.targetedLimit:review.fullUsed<review.fullLimit)&&<form onSubmit={event=>{event.preventDefault();action({action:mode,scope:mode==='edit'?scope:undefined,feedback});}}>{mode==='edit'&&<label>Part to change<select value={scope} onChange={event=>setScope(event.target.value)}>{[['title','Title'],['summary','Summary'],['opening','Opening'],['roles','Team roles'],['goal','Goal'],['preparation','Preparation'],...[1,2,3,4,5].map(n=>[`stage${n}`,`Checkpoint ${n}`])].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>}<label>What should change?<textarea minLength={10} maxLength={500} required value={feedback} onChange={event=>setFeedback(event.target.value)} placeholder="Tell us what felt wrong and what should be kept."/></label><button className="button" disabled={busy}>{busy?'Submitting…':mode==='edit'?'Request targeted edit':'Request whole-plan rework'}</button></form>}<button type="button" className="button" disabled={busy} onClick={()=>action({action:'confirm',version:review.activeVersion})}>Approve this plan and create PDFs <ArrowRight size={17}/></button><p className="small-muted">Approval starts full PDF generation. If the plan still does not work for you, use the help form below before approval.</p></>}{notice&&<p role="status">{notice}</p>}{error&&<Alert>{error}</Alert>}</section>;
}

function DeliveryRecovery({order,refresh}) {
  const [busy,setBusy] = useState(false), [notice,setNotice] = useState(''), [error,setError] = useState('');
  if (order.kind !== 'custom' || order.status !== 'failed' || !order.paidAt) return null;
  async function retry() {
    setBusy(true); setError(''); setNotice('');
    try { await api(`/api/v1/orders/${order.id}/retry-delivery`,{method:'POST'}); setNotice('PDF creation has been queued on this paid order. You will not be charged again.'); await refresh(); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <section className="live-revision paid-plan-recovery delivery-failed" role="status"><span className="eyebrow">PDF DELIVERY STOPPED</span><h3>No game pack is available to download yet</h3><p>Your approved plan is saved, but the full game package was not completed. This order is no longer generating automatically, so there is no download button yet. Plan edits closed when you approved this version; checkpoint revisions become available only after a complete pack is delivered.</p>{order.deliveryRetryAvailable ? <><p>You can restart PDF creation on this same paid order at no charge. This does not use a plan edit or post-delivery revision.</p><button type="button" className="button" disabled={busy} onClick={retry}>{busy?'Requesting…':'Retry PDF creation at no charge'} <ArrowRight size={17}/></button></> : <><p>Self-service retries are unavailable. Ask for help with this order or request a refund review. You do not need to pay again.</p><a className="button" href={'mailto:support@paperadventure.app?subject=' + encodeURIComponent('PDF delivery failed · order ' + order.id.slice(0, 8).toUpperCase())}>Email support about this order <ArrowRight size={17}/></a><a className="delivery-report-link" href="#order-help" onClick={() => { const help = document.getElementById('order-help'); if (help) help.open = true; }}>Or record a report on this order</a></>}<p className="delivery-location">If the files are completed after recovery, the ZIP and both PDFs will appear at the top of this order and under My games.</p>{notice&&<p>{notice}</p>}{error&&<Alert>{error}</Alert>}</section>;
}

function OrderNextStep({order,refresh,Link}) {
  if (order.kind !== 'custom' || !order.paidAt || !order.planReview?.confirmedVersion || order.status === 'failed' || order.status === 'refunded' || order.status === 'published' && !order.filesReady) return null;
  const ready = order.filesReady;
  return <section className={'order-next-step ' + (ready ? 'is-ready' : '')} aria-live="polite">
    <span className="eyebrow">{ready ? 'NEXT STEP · DOWNLOAD' : 'NEXT STEP · WAIT FOR DELIVERY'}</span>
    <h3>{ready ? 'Your game package is ready' : 'Your PDFs are being created and checked'}</h3>
    <p>{ready ? 'Download the Player Pack and separate adult guide. Your finished game is also saved under My games.' : 'Your plan is approved. Nothing else needs to be filled in or paid for. This page checks the order automatically every 10 seconds; you can leave and return from My adventures.'}</p>
    <div className="order-next-actions">{ready ? <a className="button" href="#download-game">Go to PDF downloads <DownloadSimple size={18}/></a> : <button type="button" className="button" onClick={refresh}>Check PDF status now <ArrowRight size={18}/></button>}<Link className="button-quiet" to="/en/my-adventures/">Open My adventures</Link></div>
  </section>;
}

const pdfPhaseText = {
  story: 'creating and checking the game content',
  pdf: 'building the two PDFs',
  storage: 'saving the PDF files',
  delivery_check: 'checking the saved files',
  delivered: 'completed',
};

function OrderPackage({order,orderId,selectedPaper,setSelectedPaper}) {
  const ready = order.filesReady;
  const guide = order.sku.includes('classroom') ? 'Teacher Guide' : 'Host Guide';
  const approved = order.kind === 'ready' || Boolean(order.planReview?.confirmedVersion || order.plan?.planConfirmed);
  const state = ready ? 'Ready to download' : order.status === 'failed' ? 'PDF creation stopped' : !approved ? 'Waiting for plan approval' : order.status === 'pending_payment' ? 'Waiting for payment confirmation' : order.status === 'fulfilling' ? 'Creating and checking your PDFs' : 'PDF creation is queued';
  const paper = order.kind === 'ready' ? selectedPaper : order.paper;
  return <section className={'order-package' + (order.status === 'failed' ? ' order-package-failed' : '')} aria-labelledby="order-package-title">
    <span className="eyebrow">YOUR GAME PACKAGE</span>
    <h2 id="order-package-title">{state}</h2>
    <p>{ready ? 'Your complete printable adventure is ready below.' : order.status === 'failed' ? 'No complete game package was delivered. There are no files to download at the moment.' : order.status === 'pending_payment' ? 'Payment has not been confirmed for this order.' : approved ? 'The full game package is being prepared. You can return to this order later.' : 'Approve a personal plan before the full game package can be created.'}</p>
    <div className="order-package-files" aria-label="Files in your package">
      <div><strong>Player Pack</strong><span>Children’s activities · PDF</span><small>{ready ? 'Ready' : 'Not ready'}</small></div>
      <div><strong>{guide}</strong><span>Adult instructions and answers · PDF</span><small>{ready ? 'Ready' : 'Not ready'}</small></div>
      <div><strong>Complete game</strong><span>Both PDFs together · ZIP</span><small>{ready ? 'Ready' : 'Not ready'}</small></div>
    </div>
    {ready && <div id="download-game" className="order-package-downloads">
      {order.kind === 'ready' ? <label className="order-paper-choice">Paper size<select aria-label="Paper size" value={selectedPaper} onChange={event=>setSelectedPaper(event.target.value)}><option value="A4">A4</option><option value="Letter">US Letter</option></select></label> : <p className="live-note">Paper size: {paper === 'Letter' ? 'US Letter' : paper}</p>}
      <CompletePackDownload orderId={orderId} paper={paper} setting={order.sku.includes('classroom') ? 'classroom' : 'home'}/>
      <div className="live-downloads">{['player','guide'].map(role=><a key={role} href={'/api/v1/files/' + orderId + '/' + role + '?paper=' + paper}>{role === 'player' ? 'Player Pack' : guide} <DownloadSimple size={17}/></a>)}</div>
    </div>}
  </section>;
}

function PdfGenerationHistory({order}) {
  const attempts = order.pdfGenerationHistory || [];
  if (order.kind !== 'custom' || !order.planReview?.confirmedVersion && attempts.length === 0) return null;
  const rounds = [...new Set(attempts.map(item=>item.round))];
  return <section className="order-generation-history" aria-labelledby="order-history-title">
    <span className="eyebrow">PDF PROGRESS</span><h2 id="order-history-title">Generation history</h2>
    <p>{attempts.length ? 'A round can contain an automatic retry. These are PDF attempts after plan approval, not plan edits.' : 'Your approved plan is saved. The first PDF attempt has not been recorded yet.'}</p>
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
  const refresh = () => api(`/api/v1/orders/${orderId}`).then(data => { setOrder(data); setError(''); }).catch(failure => setError(failure.message));
  useEffect(() => { setOrder(null); setError(''); refresh(); }, [orderId]);
  useEffect(() => {
    if (!order || !['pending_payment','paid','fulfilling'].includes(order.status)) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 10000);
    return () => clearInterval(timer);
  }, [orderId,order?.status]);

  if (error) return <main className="extended-page live-page order-page"><div className="order-workspace"><Alert>{error}</Alert><Link className="button" to="/en/account/">Sign in with Google <ArrowRight size={18}/></Link></div></main>;
  if (!order) return <main className="extended-page live-page order-page"><div className="order-workspace" role="status">Checking your order…</div></main>;

  const title = order.plan?.title || (order.kind === 'ready' ? order.sku.replaceAll('_',' ') : 'Your custom adventure');
  const paid = Boolean(order.paidAt);
  const approved = Boolean(order.planReview?.confirmedVersion);
  return <main className="extended-page live-page order-page">
    <div className="order-workspace">
      <Link className="order-back" to="/en/my-adventures/">← My adventures</Link>
      <header className="order-heading">
        <div><span className="eyebrow">YOUR ADVENTURE ORDER</span><h1>{title}</h1><p>Order {order.id.slice(0,8).toUpperCase()} · {order.kind === 'ready' ? 'Ready-made' : order.sku.includes('classroom') ? 'Custom Classroom' : 'Custom Home'}</p></div>
        <span className={'order-current-status status-' + order.status}>{orderLabel[order.status] || order.status}</span>
      </header>
      <div className="order-layout">
        <div className="order-main">
          <OrderPackage order={order} orderId={orderId} selectedPaper={selectedPaper} setSelectedPaper={setSelectedPaper}/>
          <PdfGenerationHistory order={order}/>
          {order.planReview && (approved ? <details className="order-approved-plan"><summary>View your approved five-checkpoint plan</summary><PaidPlanReview order={order} refresh={refresh}/></details> : <PaidPlanReview order={order} refresh={refresh}/>)}
          {!order.planReview && order.plan && <details className="order-plan-review"><summary>Review the story and five-checkpoint plan</summary><PlanPreview plan={order.plan}/></details>}
          <RevisionForm order={order} refresh={refresh}/>
        </div>
        <aside className="order-sidebar" aria-label="Order details">
          <h2>Order details</h2>
          <dl><div><dt>Payment</dt><dd>{paid ? 'Confirmed' : 'Not confirmed'}</dd></div><div><dt>Total</dt><dd>{formatUsd(order.amountTotal)} · {order.currency}</dd></div><div><dt>Paper</dt><dd>{order.paper === 'Letter' ? 'US Letter' : order.paper || 'Choose on download'}</dd></div>{order.kind === 'custom' && <div><dt>Plan</dt><dd>{approved ? `Version ${order.planReview.confirmedVersion} approved` : 'Awaiting approval'}</dd></div>}<div><dt>Files</dt><dd>{order.filesReady ? 'Ready' : 'Not available yet'}</dd></div></dl>
          {order.filesReady && order.accessExpiresAt && <p>Online re-download until {new Date(order.accessExpiresAt.replace(' ','T') + 'Z').toLocaleDateString()}.</p>}
          {order.kind === 'custom' && paid && <p>Plan changes happen before approval. Checkpoint revisions appear after your complete game is delivered.</p>}
          <button type="button" className="button-quiet" onClick={refresh}>Refresh order status</button>
        </aside>
      </div>
      <section className="order-help-footer" aria-label="Help with this order">
        <DeliveryRecovery order={order} refresh={refresh}/>
        <IssueForm orderId={orderId} failedDelivery={order.kind === 'custom' && order.status === 'failed' && paid}/>
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
  return <main className="extended-page live-page"><Intro eyebrow="PRICING & RIGHTS" title="Choose a finished game or make a new one."><p>{checkoutMode === 'test' ? 'Stripe test checkout is open after adult Google sign-in. Test cards move no real money; these USD prices are for flow testing.' : 'One-time prices in US dollars. Applicable tax and the final total appear in Stripe before payment.'}</p></Intro><section className="live-shell"><div className="live-price-grid"><div className="live-panel"><span className="eyebrow">READY-MADE</span><h2>Buy a fixed theme</h2><p>A fixed theme includes a Player Pack and adult guide for download after confirmed payment. No AI edits are included.</p>{ready.map(offer => <p key={offer.sku}><strong>{offer.setting === 'home' ? 'Home' : 'Classroom'}: {formatUsd(offer.unitAmount)}</strong> per published pack</p>)}<Link className="button" to="/en/themes/">{checkoutMode === 'test' ? 'Explore test packs' : 'Explore published themes'} <ArrowRight size={18} /></Link></div><div className="live-panel"><span className="eyebrow">CUSTOM-MADE</span><h2>Generate a new activity</h2><p>Choose a featured world or your own idea. One personal plan follows confirmed payment; full PDFs follow your plan approval and checks.</p>{custom.map(offer => <p key={offer.sku}><strong>{offer.setting === 'home' ? 'Home' : 'Classroom'}: {formatUsd(offer.unitAmount)}</strong> per new activity</p>)}<p>Two successful plan reworks and three targeted edits are included before approval. Two successful single-checkpoint revisions within 30 days of first delivery are separate.</p><Link className="button" to="/en/create/">Start custom setup <ArrowRight size={18} /></Link></div></div><div className="live-panel live-price-note"><h2>Free fixed sample</h2><p>{sampleReady ? 'Celebration Home and Classroom are both available as free fixed trial packs; neither includes custom generation.' : 'A complete free sample is planned but not yet published.'}</p>{sampleReady && <><Link className="text-link" to="/en/samples/home/">Download Home trial <ArrowRight size={18} /></Link> <Link className="text-link" to="/en/samples/classroom/">Download Classroom trial <ArrowRight size={18} /></Link></>}<p>No subscription, points or automatic renewal. {productRights.home} {productRights.classroom} Online re-download lasts {productRights.onlineRedownloadMonths} months from confirmed payment for a fixed pack or first qualified delivery for a custom pack. Lawfully downloaded files remain usable within that scope. Final tax and refund terms are shown before payment.</p></div></section></main>;
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
  return <main className="extended-page live-page"><Intro eyebrow="SECURE CHECKOUT" title="Review your order."><p>{checkoutMode === 'test' ? 'TEST MODE · Sign in with Google and use test-card details. No real payment is taken.' : 'One-time purchase. Stripe shows the final total before you pay.'}</p></Intro><section className="live-shell"><div className="live-panel"><span className="eyebrow">{ready ? 'FIXED PACK' : 'NEW CUSTOM ADVENTURE'}</span><h2>{ready ? `${theme?.title || 'Unknown theme'} · ${setting}` : `${setting || 'Custom'} adventure`}</h2><p>Listed price: <strong>{offer ? formatUsd(offer.unitAmount) : 'Unavailable'}</strong> before applicable tax.</p><p>{ready ? 'After confirmed payment, download this ready-made game from My adventures.' : 'After confirmed payment, one personal five-checkpoint plan is generated for your review. Two successful whole-plan reworks and three successful targeted edits are included. Select and approve a saved plan before the full PDFs are generated. If no version works, contact support for assistance or refund-policy review.'}</p><p>{!ready && 'After PDF delivery, two successful single-checkpoint revisions within 30 days are included. '}Online re-download lasts {productRights.onlineRedownloadMonths} months {ready ? 'from confirmed payment' : 'from first qualified delivery'}.</p>{!ready && customDraftReady && <dl className="live-review"><div><dt>Story idea</dt><dd>{draft.idea}</dd></div><div><dt>Players</dt><dd>{draft.players} · ages {draft.age}</dd></div><div><dt>Paper and play</dt><dd>{draft.paper} · {mechanicById(draft.gameplay?.primary)?.title}</dd></div></dl>}{!eligible ? <Alert>{!ready && !customDraftReady ? 'Finish your custom adventure setup before checkout.' : 'This product is not available for checkout.'}</Alert> : needsSignIn ? authenticated === null ? <p role="status">Checking adult sign-in…</p> : <div><Alert>Sign in with your adult Google account before checkout.</Alert><Link className="button" to={signInPath}>Sign in with Google <ArrowRight size={18} /></Link></div> : <form onSubmit={start}>{ready && variantIds.length > 0 && <label>Classroom story wording<select value={variantId} onChange={event => setVariantId(event.target.value)}><option value="">{themeId === 'halloween' ? 'Autumn classroom' : 'Winter classroom'}</option>{variantIds.map(id => <option key={id} value={id}>{id === 'halloween' ? 'Halloween classroom' : 'Christmas classroom'}</option>)}</select></label>}{accountEmail ? <p className="live-note">Buying with your Google account: <strong>{accountEmail}</strong></p> : accountRequired ? <p className="live-note">This order stays in your signed-in account. Stripe may ask for an email for the payment receipt.</p> : <label>Email for your receipt and downloads<input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></label>}<p className="live-note">{checkoutMode === 'test' ? 'Stripe test checkout takes no real money.' : <>Review the <Link to="/en/terms/">terms</Link> and <Link to="/en/refunds/">refund policy</Link> before paying. Stripe displays the final total.</>}</p><button className="button" disabled={busy}>{busy ? 'Preparing checkout…' : checkoutMode === 'test' ? 'Continue to Stripe test' : 'Continue to Stripe'} <ArrowRight size={18} /></button>{error && <Alert>{error}</Alert>}</form>}</div></section></main>;
}
