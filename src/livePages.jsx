import { useEffect, useRef, useState } from 'react';
import { ArrowRight, DownloadSimple, WarningCircle } from '@phosphor-icons/react';
import { formatUsd, productRights } from '../shared/catalog.mjs';
import './livePages.css';

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || 'The service could not complete this request.');
  return data;
}

function Intro({ eyebrow, title, children }) { return <section className="page-intro extended-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{children}</section>; }
function Alert({ children }) { return <p className="live-alert" role="alert"><WarningCircle size={18} /> {children}</p>; }

export function LiveAccount({ Link }) {
  const button = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    async function prepare() {
      try {
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
              window.location.assign('/en/my-adventures/');
            } catch (failure) { if (!cancelled) { setError(failure.message); setBusy(false); } }
          },
        });
        button.current.replaceChildren();
        window.google.accounts.id.renderButton(button.current, { theme: 'outline', size: 'large', shape: 'rectangular', text: 'signin_with', width: 280 });
      } catch (failure) { if (!cancelled) setError(failure.message); }
    }
    prepare();
    return () => { cancelled = true; };
  }, []);
  return <main className="extended-page live-page"><Intro eyebrow="ADULT ACCOUNT" title="Access your adventures."><p>Sign in with your adult Google account to see your adventures and purchases. No child account is needed.</p></Intro><section className="live-shell"><div className="live-panel"><h2>Sign in with Google</h2><p>We use your verified Google email to find your adventures. We do not ask for your contacts or Google Drive. <Link to="/en/privacy/">Read our Privacy Notice</Link>.</p><div ref={button} aria-label="Sign in with Google" />{busy && <p role="status">Signing you in…</p>}{error && <Alert>{error}</Alert>}</div><p className="live-note">Need help accessing a purchase? <Link to="/en/help/">Contact support <ArrowRight size={16} /></Link></p></section></main>;
}

export function LiveShelf({ Link }) {
  const [orders, setOrders] = useState(null); const [draft, setDraft] = useState(null); const [needsLogin, setNeedsLogin] = useState(false); const [error, setError] = useState('');
  async function deleteDraft() {
    if (!window.confirm('Delete this saved planning draft? Your purchased adventures will remain available.')) return;
    try { await api('/api/v1/my-draft', { method: 'DELETE' }); localStorage.removeItem('paw-draft'); setDraft(null); }
    catch (failure) { setError(failure.message); }
  }
  useEffect(() => {
    api('/api/v1/my-orders').then(data => { setOrders(data.orders); api('/api/v1/my-draft').then(result => setDraft(result.draft)).catch(() => {}); })
      .catch(failure => { if (failure.message.includes('Sign in') || failure.message.includes('Verify')) setNeedsLogin(true); else setError(failure.message); });
  }, []);
  return <main className="extended-page live-page"><Intro eyebrow="MY ADVENTURES" title="Your adventure shelf."><p>Purchases and planning drafts tied to your verified adult email appear here.</p></Intro><section className="live-shell">{needsLogin ? <div className="live-panel"><p>Sign in with Google to see your purchased adventures.</p><Link className="button" to="/en/account/">Sign in with Google <ArrowRight size={18} /></Link></div> : error ? <Alert>{error}</Alert> : orders === null ? <p>Loading your adventures…</p> : <div className="live-list">{draft && <article className="live-panel"><span className="eyebrow">SAVED DRAFT</span><h2>{draft.themeId || draft.customIdea || 'Your story idea'}</h2><p>{draft.setting} · {draft.players} players</p><Link className="text-link" to="/en/create/">Continue planning <ArrowRight size={18} /></Link> <button className="button-quiet" onClick={deleteDraft}>Delete saved draft</button></article>}{orders.length === 0 ? <div className="live-panel"><h2>No purchases yet</h2><p>Explore a published fixed game or plan a new adventure.</p><Link className="button" to="/en/themes/">Explore themes <ArrowRight size={18} /></Link></div> : orders.map(order => <article className="live-panel" key={order.id}><span className="eyebrow">{order.product_kind === 'ready' ? 'READY-MADE PACK' : 'CUSTOM ADVENTURE'}</span><h2>{order.sku.replaceAll('_', ' ')}</h2><p>Status: <strong>{order.status}</strong> · {formatUsd(order.amount_total)}</p><Link className="text-link" to={`/en/orders/${order.id}/`}>Open order <ArrowRight size={18} /></Link></article>)}</div>}</section></main>;
}

function RevisionForm({ order, refresh }) {
  const [stageNumber, setStageNumber] = useState(1); const [instruction, setInstruction] = useState(''); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  const remaining = order.revisionLimit - order.revisionUsed;
  if (order.kind !== 'custom' || !order.filesReady || remaining <= 0 || !order.revisionExpiresAt || Date.parse(`${order.revisionExpiresAt}Z`) <= Date.now()) return null;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await api(`/api/v1/orders/${order.id}/revisions`, { method: 'POST', body: JSON.stringify({ stageNumber, instruction }) }); setNotice('Your local change is queued. It counts only after a revised file is published.'); setInstruction(''); refresh(); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <form className="live-revision" onSubmit={submit}><h3>Adjust one checkpoint</h3><p>{remaining} included successful {remaining === 1 ? 'revision' : 'revisions'} remain. Choose one checkpoint; a new adventure requires a separate order.</p><label>Checkpoint<select value={stageNumber} onChange={event => setStageNumber(Number(event.target.value))}>{[1,2,3,4,5].map(number => <option key={number} value={number}>Checkpoint {number}</option>)}</select></label><label>What should change?<textarea minLength="10" maxLength="350" required value={instruction} onChange={event => setInstruction(event.target.value)} placeholder="For example, make checkpoint 2 easier to read aloud." /></label><button className="button" disabled={busy}>{busy ? 'Submitting…' : 'Request local revision'}</button>{notice && <p role="status">{notice}</p>}{error && <Alert>{error}</Alert>}</form>;
}

function IssueForm({ orderId }) {
  const [kind, setKind] = useState('clue'); const [description, setDescription] = useState(''); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  const [cases, setCases] = useState([]);
  useEffect(() => { api(`/api/v1/orders/${orderId}/issues`).then(data => setCases(data.cases)).catch(() => {}); }, [orderId]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const result = await api(`/api/v1/orders/${orderId}/issues`, { method: 'POST', body: JSON.stringify({ issueType: kind, description }) });
      setNotice(`Report ${result.caseId} was recorded for review.`); setDescription('');
      const updated = await api(`/api/v1/orders/${orderId}/issues`); setCases(updated.cases);
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <form className="live-revision" onSubmit={submit}><h3>Report a problem</h3><p>Use this for clue errors, missing files, delivery issues or a refund request. Do not include child names or photos.</p><label>Issue type<select value={kind} onChange={event => setKind(event.target.value)}><option value="clue">Clue or instructions</option><option value="answer">Answer or hint</option><option value="printing">Printing or layout</option><option value="delivery">Missing delivery</option><option value="refund">Refund request</option><option value="other">Other</option></select></label><label>What happened?<textarea minLength="10" maxLength="1000" required value={description} onChange={event => setDescription(event.target.value)} /></label><button className="button" disabled={busy}>{busy ? 'Recording…' : 'Send report'}</button>{notice && <p role="status">{notice}</p>}{error && <Alert>{error}</Alert>}{cases.length > 0 && <p>Your reports: {cases.map(item => `${item.issue_type} (${item.status})`).join(', ')}</p>}</form>;
}

export function LiveOrder({ Link, orderId }) {
  const [order, setOrder] = useState(null); const [error, setError] = useState('');
  const refresh = () => api(`/api/v1/orders/${orderId}`).then(data => { setOrder(data); setError(''); }).catch(failure => setError(failure.message));
  useEffect(() => { setOrder(null); setError(''); refresh(); }, [orderId]);
  useEffect(() => {
    if (!order || !['pending_payment', 'paid', 'fulfilling'].includes(order.status)) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 10000);
    return () => clearInterval(timer);
  }, [orderId, order?.status]);
  return <main className="extended-page live-page"><Intro eyebrow="ORDER" title="Your adventure order."><p>Payment and file status come from the server. Returning from Stripe alone does not confirm payment.</p></Intro><section className="live-shell">{error ? <div className="live-panel"><Alert>{error}</Alert><Link className="button" to="/en/account/">Sign in with Google <ArrowRight size={18} /></Link></div> : !order ? <p>Checking your order…</p> : <div className="live-panel"><span className="eyebrow">{order.kind === 'ready' ? 'READY-MADE' : 'CUSTOM-MADE'}</span><h2>{order.sku.replaceAll('_', ' ')}</h2><p>Order status: <strong>{order.status}</strong></p><p>Charged total: {formatUsd(order.amountTotal)} · {order.currency}</p>{order.status === "published" && order.accessExpiresAt && <p>Online re-download until {new Date(order.accessExpiresAt.replace(" ", "T") + "Z").toLocaleDateString()}.</p>}{order.filesReady ? <div className="live-downloads">{(order.kind === 'ready' ? ['A4','Letter'] : [order.paper]).map(paper => <div key={paper}><strong>{paper}</strong><a href={`/api/v1/files/${orderId}/player?paper=${paper}`}>Player Pack <DownloadSimple size={17} /></a><a href={`/api/v1/files/${orderId}/guide?paper=${paper}`}>{order.sku.includes('classroom') ? 'Teacher Guide' : 'Host Guide'} <DownloadSimple size={17} /></a></div>)}</div> : <p>{order.status === "published" && order.accessExpiresAt && Date.parse(order.accessExpiresAt.replace(" ", "T") + "Z") <= Date.now() ? "The online re-download period has ended. Files already downloaded may still be used within your Home or Classroom licence." : order.status === "failed" ? "We could not complete this adventure. Please report the problem below so support can review a correction or refund." : order.status === "refunded" ? "This order was refunded, so online file access is closed." : "Files are not ready yet. If this is a custom order, generation and checking begin only after confirmed payment."}</p>}<RevisionForm order={order} refresh={refresh} /><IssueForm orderId={orderId} /><button className="button-quiet" onClick={refresh}>Refresh status</button><p className="live-note">If a file is missing or incorrect, contact support through the help page. A system correction does not use a paid revision.</p></div>}</section></main>;
}

export function LiveSamples({ Link, classroom = false, catalog }) {
  const setting = classroom ? 'classroom' : 'home';
  const version = catalog?.themes.find(theme => theme.id === 'celebration')?.[setting]?.packVersion;
  const [paper, setPaper] = useState('A4');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function download(role) {
    setBusy(role); setError('');
    try {
      const response = await fetch(`/api/v1/samples/${setting}/${paper}/${role}`, { credentials: 'same-origin' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || 'The file could not be downloaded. Please try again.');
      }
      if (!response.headers.get('content-type')?.includes('application/pdf')) throw new Error('The file is temporarily unavailable.');
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `celebration-${setting}-${role}-${paper}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(''); }
  }
  return <main className="extended-page live-page"><Intro eyebrow="FREE CELEBRATION TRIAL" title="Try a complete Celebration adventure."><p>Both Home and Classroom editions are free. This versioned trial pack contains a full five-checkpoint story; clues and layout may be refined after feedback.</p></Intro><section className="live-shell"><div className="live-panel"><div className="live-tabs" aria-label="Choose edition"><Link className={!classroom ? 'active' : ''} to="/en/samples/home/">Home</Link><Link className={classroom ? 'active' : ''} to="/en/samples/classroom/">Classroom</Link></div><p className="live-note">Trial {version || 'draft'} · English PDF · No account or payment needed.</p><h2>Choose your paper size</h2><div className="live-tabs" role="group" aria-label="Paper size">{['A4','Letter'].map(size => <button key={size} type="button" className={paper === size ? 'active' : ''} aria-pressed={paper === size} onClick={() => setPaper(size)}>{size === 'Letter' ? 'US Letter' : 'A4'}</button>)}</div><div className="live-downloads"><div><strong>For players</strong><p>The clues and paper activities for the group.</p><button type="button" onClick={() => download('player')} disabled={Boolean(busy)}>{busy === 'player' ? 'Downloading…' : `Download ${setting} ${paper} Player Pack`} <DownloadSimple size={17} /></button></div><div><strong>For the adult organiser</strong><p>Preparation, hints and answers. Keep this file away from players.</p><button type="button" onClick={() => download('guide')} disabled={Boolean(busy)}>{busy === 'guide' ? 'Downloading…' : `Download ${setting} ${paper} ${classroom ? 'Teacher Guide' : 'Host Guide'}`} <DownloadSimple size={17} /></button></div></div>{error && <Alert>{error}</Alert>}<p className="live-note">Found a confusing clue or print issue? <a href="mailto:support@paperadventure.app?subject=Celebration%20trial%20feedback">Tell us what happened</a> without including a child's name or photo.</p></div></section></main>;
}

export function LiveLegal({ kind }) {
  const [document, setDocument] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api(`/api/v1/legal/${kind}`).then(setDocument).catch(failure => setError(failure.message)); }, [kind]);
  return <main className="extended-page live-page"><Intro eyebrow="LEGAL INFORMATION" title={document?.title || 'Policy'}><p>{document ? `Effective ${document.effectiveAt} · version ${document.version}` : 'Loading the current policy…'}</p></Intro><section className="live-shell">{error ? <Alert>{error}</Alert> : document && <div className="live-panel legal-document">{document.sections.map((section, index) => <section key={index}><h2>{section.heading}</h2><p>{section.body}</p></section>)}</div>}</section></main>;
}

export function LivePricing({ Link, catalog }) {
  const ready = catalog.offers.filter(offer => offer.kind === 'ready');
  const custom = catalog.offers.filter(offer => offer.kind === 'custom');
  const celebration = catalog.themes.find(theme => theme.id === 'celebration');
  const sampleReady = celebration?.home.freeSample && celebration?.classroom.freeSample;
  return <main className="extended-page live-page"><Intro eyebrow="PRICING & RIGHTS" title="Choose a finished game or make a new one."><p>One-time prices in US dollars. Applicable tax and the final total appear in Stripe before payment.</p></Intro><section className="live-shell"><div className="live-price-grid"><div className="live-panel"><span className="eyebrow">READY-MADE</span><h2>Buy a fixed theme</h2><p>A published fixed theme includes a Player Pack and adult guide for download after confirmed payment. No AI edits are included.</p>{ready.map(offer => <p key={offer.sku}><strong>{offer.setting === 'home' ? 'Home' : 'Classroom'}: {formatUsd(offer.unitAmount)}</strong> per published pack</p>)}<Link className="button" to="/en/themes/">Explore published themes <ArrowRight size={18} /></Link></div><div className="live-panel"><span className="eyebrow">CUSTOM-MADE</span><h2>Generate a new activity</h2><p>Choose a featured world or your own idea. A full game is generated and checked after confirmed payment.</p>{custom.map(offer => <p key={offer.sku}><strong>{offer.setting === 'home' ? 'Home' : 'Classroom'}: {formatUsd(offer.unitAmount)}</strong> per new activity</p>)}<p>Two successful local revisions within 30 days of first delivery are included. A different game needs a new order.</p><Link className="button" to="/en/create/">Start custom setup <ArrowRight size={18} /></Link></div></div><div className="live-panel live-price-note"><h2>Free fixed sample</h2><p>{sampleReady ? 'Celebration Home and Classroom are both available as free fixed trial packs; neither includes custom generation.' : 'A complete free sample is planned but not yet published.'}</p>{sampleReady && <><Link className="text-link" to="/en/samples/home/">Download Home trial <ArrowRight size={18} /></Link> <Link className="text-link" to="/en/samples/classroom/">Download Classroom trial <ArrowRight size={18} /></Link></>}<p>No subscription, points or automatic renewal. {productRights.home} {productRights.classroom} Online re-download lasts {productRights.onlineRedownloadMonths} months from confirmed payment for a fixed pack or first qualified delivery for a custom pack. Lawfully downloaded files remain usable within that scope. Final tax and refund terms are shown before payment.</p></div></section></main>;
}

export function LiveCheckout({ Link, catalog }) {
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
  const customDraftReady = Boolean((draft.custom ? draft.idea?.trim() : draft.theme) && Number(draft.players) >= 2 && draft.age?.trim() && ['A4','Letter'].includes(draft.paper) && ['mystery','mission'].includes(draft.direction) && (setting !== 'classroom' || Number(draft.groups) >= 1));
  const eligible = Boolean(['home','classroom'].includes(setting) && offer?.saleEnabled && (ready ? theme?.[setting]?.readyStatus === 'published' : customDraftReady));
  async function start(event) {
    event.preventDefault(); setBusy(true); setError('');
    const body = ready ? { sku, themeId, packVersion: theme[setting].packVersion, variantId: variantId || null, email } : { sku, themeId: draft.custom ? null : draft.theme, customIdea: draft.custom ? draft.idea : null, players: draft.players, groups: draft.groups, age: draft.age, paper: draft.paper, direction: draft.direction, place: draft.place, reading: draft.reading, materials: draft.materials, email };
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
  return <main className="extended-page live-page"><Intro eyebrow="SECURE CHECKOUT" title="Review your order."><p>One-time purchase. Stripe calculates applicable taxes and shows the final amount before you pay.</p></Intro><section className="live-shell"><div className="live-panel"><span className="eyebrow">{ready ? 'FIXED PACK' : 'NEW CUSTOM ADVENTURE'}</span><h2>{ready ? `${theme?.title || 'Unknown theme'} · ${setting}` : `${setting || 'Custom'} adventure`}</h2><p>Listed price: <strong>{offer ? formatUsd(offer.unitAmount) : 'Unavailable'}</strong> before applicable tax.</p><p>{ready ? 'This purchase grants the selected fixed version, with no AI rewrite.' : 'After confirmed payment, your new activity is generated, checked, and delivered when ready.'}</p><p>{setting === "classroom" ? productRights.classroom : productRights.home} Online re-download lasts {productRights.onlineRedownloadMonths} months {ready ? "from confirmed payment" : "from first qualified delivery"}; downloaded files remain usable within that scope afterward.</p>{!ready && customDraftReady && <dl className="live-review"><div><dt>Story world</dt><dd>{draft.custom ? draft.idea : catalog.themes.find(item => item.id === draft.theme)?.title}</dd></div><div><dt>Players</dt><dd>{draft.players} · age {draft.age}</dd></div><div><dt>Paper and direction</dt><dd>{draft.paper} · {draft.direction}</dd></div></dl>}{!eligible ? <Alert>{!ready && !customDraftReady ? 'Finish reviewing a custom adventure before checkout.' : 'This product is not available for checkout.'}</Alert> : <form onSubmit={start}>{ready && variantIds.length > 0 && <label>Classroom story wording<select value={variantId} onChange={event => setVariantId(event.target.value)}><option value="">{themeId === 'halloween' ? 'Autumn classroom' : 'Winter classroom'}</option>{variantIds.map(id => <option key={id} value={id}>{id === 'halloween' ? 'Halloween classroom' : 'Christmas classroom'}</option>)}</select></label>}<label>Adult delivery email<input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="adult@example.com" /></label><p className="live-note">Review the <Link to="/en/terms/">terms</Link> and <Link to="/en/refunds/">refund policy</Link> before paying. Stripe displays the final total.</p><button className="button" disabled={busy}>{busy ? 'Preparing checkout…' : 'Continue to Stripe'} <ArrowRight size={18} /></button>{error && <Alert>{error}</Alert>}</form>}</div></section></main>;
}
