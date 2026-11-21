import {paidDocumentGame,readyDocumentLabel,readyEnglishRepairGame} from '../shared/ready-document-editions.mjs';
import ReadyLocalizedDownloads from './readyLocalizedDownloads.jsx';
import { currentLocale as uiLocale, t as translateUi, localHref } from './i18n/index.mjs';

import AccountEntry from './accountEntry.jsx';
import { accountReturnPath } from '../shared/account-return.mjs';
import { SudokuAccountEntry } from './sudokuEntry.jsx';
import OrderSupport from './orderSupport.jsx';
import { clearRemovedLocalDraft } from './libraryArchive.mjs';
import { fromCloudDraft } from './creatorDraft.mjs';
import { libraryIntent, libraryPath, orderSupportPath } from '../shared/support-navigation.mjs';
import { purchaseConsentVersion, purchaseNotice } from '../shared/purchase-consent.mjs';
import PostDeliveryEditor from './postDeliveryEditor.jsx';
import { PolicyDocument } from './policyDocument.jsx';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowClockwise, DownloadSimple, WarningCircle, Books, Sparkle, Receipt, CheckCircle, Printer } from '@phosphor-icons/react';
import { formatUsd, productRights } from '../shared/catalog.mjs';
import { draftSpec, readySetup } from './creatorDraft.mjs';
import { PlanPreview } from './creatorPlanPreview.jsx';
import { mechanicById } from '../shared/creator-plan.mjs';
import './creatorFlow.css';
import './livePages.css';
import FreeDownload from './freeDownload.jsx';
import { createDownloadZip } from './downloadZip.mjs';
import OrderUpdateProgress, { themeUpdatePending } from './orderUpdateProgress.jsx';
import AdventureCover from './adventureCover.jsx';
import { googleSignInController } from './googleSignIn.mjs';

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error?.message || 'The service could not complete this request.'), { code: data.error?.code });
  return data;
}

function Intro({ eyebrow, title, children }) {return <section className="page-intro extended-intro"><span className="eyebrow">{translateUi(eyebrow)}</span><h1>{translateUi(title)}</h1>{translateUi(children)}</section>;}
function Alert({ children }) {return <p className="live-alert" role="alert"><WarningCircle size={18} /> {translateUi(children)}</p>;}

const orderLabel = { pending_payment: 'Payment not confirmed', paid: 'Payment confirmed · queued', fulfilling: 'Generating and checking', published: 'Files ready', failed: 'PDF creation stopped · action needed', refunded: 'Refunded' };

function MidnightIndividualFiles({ themeId, orderId, paper }) {
  if (themeId !== 'midnight-masquerade') return null;
  return <div className="shelf-downloads"><strong>{translateUi("Required private cards and preparation map")}</strong>{[['setup', 'Start here / preparation map'], ['role-A', 'Private portfolio A'], ['role-B', 'Private portfolio B'], ['role-C', 'Private portfolio C']].map(([role, label]) => <a className="button-quiet" key={role} href={localHref('/api/v1/orders/' + encodeURIComponent(orderId) + '/escape/' + paper + '-' + role + '.pdf')}>{translateUi(label)} · {translateUi(paper)}</a>)}<small>{translateUi("Player Pack + all three private portfolios: 22 sheets. Keep the Adult Guide separate.")}</small></div>;
}
function CompletePackDownload({ orderId, paper, setting, kind = 'custom', escapeGame = false, version = null, label = 'Download complete game · ZIP' }) {
  const [busy, setBusy] = useState(false);const [error, setError] = useState('');const [notice, setNotice] = useState('');
  async function download() {
    if (busy) return;
    setBusy(true);setError('');setNotice('');
    try {
      if (escapeGame) {const response = await fetch('/api/v1/orders/' + encodeURIComponent(orderId) + '/escape/bundle', { credentials: 'same-origin' });if (!response.ok) throw new Error('Your complete package could not be downloaded. Sign in with your purchase account and retry.');const bytes = new Uint8Array(await response.arrayBuffer());if (!response.headers.get('content-type')?.includes('application/zip') || bytes[0] !== 80 || bytes[1] !== 75) throw new Error('The package could not be verified.');const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));const a = document.createElement('a');a.href = url;a.download = escapeGame === 'fold-city' ? 'The-Secret-of-Fold-City-v2.zip' : escapeGame === 'last-letter' ? 'The-Last-Letter-Before-the-Storm-v2.zip' : escapeGame === 'thirteenth-hour' ? 'The-Clockmakers-Thirteenth-Hour-v2.zip' : escapeGame === 'midnight-masquerade' ? 'The-Midnight-Masquerade-v2.zip' : 'The-Missing-Seventh-Carriage-v2.zip';document.body.appendChild(a);a.click();a.remove();setTimeout(() => URL.revokeObjectURL(url), 60000);setNotice('Complete ZIP prepared with both paper sizes, adult guides and the offline companion. Extract it before opening.');return;}
      const selectedVersion = kind === 'custom' ? version || (await api('/api/v1/orders/' + encodeURIComponent(orderId))).downloadVersion : null;
      const versionQuery = selectedVersion ? '&version=' + selectedVersion : '';
      const files = await Promise.all(['player', 'guide'].map(async (role) => {
        const response = await fetch('/api/v1/files/' + encodeURIComponent(orderId) + '/' + role + '?paper=' + encodeURIComponent(paper) + versionQuery, { credentials: 'same-origin' });
        if (!response.ok) {const data = await response.json().catch(() => ({}));throw new Error(data.error?.message || 'The files could not be downloaded. Please try again.');}
        if (!response.headers.get('content-type')?.includes('application/pdf')) throw new Error('A PDF is unavailable. Please try again.');
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('A PDF could not be verified. Please try again.');
        return { name: 'adventure-' + setting + '-' + role + '-' + paper + '.pdf', data: bytes };
      }));
      const blob = createDownloadZip(files);const url = URL.createObjectURL(blob);const link = document.createElement('a');
      link.href = url;link.download = 'adventure-' + orderId + '-' + paper + '.zip';document.body.appendChild(link);link.click();link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);setNotice('ZIP prepared with both PDFs. Extract it before opening the files.');
    } catch (failure) {setError(failure.message);} finally {setBusy(false);}
  }
  return <div className="complete-pack-download"><button type="button" className="button complete-pack-button" disabled={busy} onClick={download}>{busy ? translateUi('Preparing your complete pack…') : translateUi(label)} <DownloadSimple size={20} /></button>{busy && <p role="status">{translateUi("Fetching both ")}{paper === 'Letter' ? translateUi('US Letter') : translateUi('A4')}{translateUi(" PDFs\u2026")}</p>}{notice && <p className="live-note" role="status">{translateUi(notice)}</p>}{error && <Alert>{translateUi(error)}{translateUi(" No ZIP is saved unless both PDFs are available.")}</Alert>}</div>;
}

function ThemeCoverStatus({ order, refresh }) {
  const [busy, setBusy] = useState(false),[error, setError] = useState('');
  if (order.product_kind !== 'custom' || !order.coverAvailable) return null;
  if (['queued', 'submitting', 'pending'].includes(order.coverStatus)) return <p className="live-note" role="status">{translateUi("Your theme cover is being illustrated. Your game can continue normally.")}</p>;
  if (order.coverStatus === 'failed') return <p className="live-note">{translateUi("The cover could not be completed. Your game and downloads are unaffected.")}</p>;
  if (order.coverStatus === 'ready') return null;
  async function create() {setBusy(true);setError('');try {await api('/api/v1/orders/' + order.id + '/cover', { method: 'POST' });await refresh();} catch (failure) {setError(failure.message);} finally {setBusy(false);}}
  return <div><button type="button" className="button-quiet" disabled={busy} onClick={create}>{busy ? translateUi('Requesting cover…') : translateUi('Create a theme cover')}</button>{error && <Alert>{translateUi(error)}</Alert>}</div>;
}

export function LiveAccount({ Link }) {
  const button = useRef(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [returnTo, setReturnTo] = useState(null);
  const [localPreview, setLocalPreview] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let signIn = null,buttonObserver = null,lastButtonWidth = 0,buttonRendered = false;
    const renderGoogle = () => {if (cancelled || !button.current) return;lastButtonWidth = Math.max(200, Math.min(360, Math.floor(button.current.clientWidth || 280)));button.current.replaceChildren();window.google.accounts.id.renderButton(button.current, { locale: window.location.pathname.startsWith('/zh/') ? 'zh_CN' : 'en', theme: 'outline', size: 'large', shape: 'rectangular', text: 'signin_with', width: lastButtonWidth });buttonRendered = true;};
    const resume = () => {if (document.visibilityState !== 'hidden') signIn?.refreshIfStale();};
    async function prepare() {
      try {
        setLoading(true);setError('');
        const requested = new URLSearchParams(window.location.search).get('returnTo');
        const destination = localHref(accountReturnPath(requested));
        setReturnTo(destination);
        const session = await api('/api/v1/auth/session');
        if (cancelled) return;
        setLocalPreview(session.localPreview === true);
        if (session.authenticated) {window.location.replace(localHref(destination));return;}
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
        signIn = googleSignInController({ api,
          initialize: (options) => window.google.accounts.id.initialize(options),
          render: renderGoogle,
          redirect: () => window.location.assign(localHref(destination)), onReady: (ready) => setLoading(!ready), onBusy: setBusy, onError: setError
        });
        window.addEventListener('focus', resume);document.addEventListener('visibilitychange', resume);
        await signIn.prepare();
        if (!cancelled && button.current && typeof ResizeObserver !== 'undefined') {buttonObserver = new ResizeObserver(() => {const width = Math.max(200, Math.min(360, Math.floor(button.current?.clientWidth || 280)));if (buttonRendered && width !== lastButtonWidth) renderGoogle();});buttonObserver.observe(button.current);}
      } catch (failure) {if (!cancelled) {setError(failure.message);setLoading(false);}}
    }
    prepare();
    return () => {cancelled = true;buttonObserver?.disconnect();signIn?.stop();window.removeEventListener('focus', resume);document.removeEventListener('visibilitychange', resume);};
  }, [retry]);
  return <AccountEntry Link={Link} googleRef={button} loading={loading} busy={busy} error={error} onRetry={() => setRetry((value) => value + 1)} returnTo={returnTo} localPreview={localPreview} />;
}

export function LiveShelf({ Link, embedded = false, mode = "library", initialSection = "games" }) {
  const ShelfRoot = embedded ? "div" : "main";
  const helpIntent = libraryIntent(typeof window === 'undefined' ? '' : window.location.search);
  const [orders, setOrders] = useState(null);const [draft, setDraft] = useState(null);
  const [archived, setArchived] = useState([]),[oldDrafts, setOldDrafts] = useState([]),[restoring, setRestoring] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);const [error, setError] = useState('');
  const [paperByOrder, setPaperByOrder] = useState({});
  const [section, setSection] = useState(mode === 'orders' ? 'orders' : initialSection);const [paper, setPaper] = useState('A4');const [historyKind, setHistoryKind] = useState(embedded && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('history') === 'unpaid' ? 'unpaid' : 'paid');const firstLoad = useRef(true);
  const needsAttention = (order) => order.product_kind === 'custom' && Boolean(order.paid_at) && (['paid', 'fulfilling'].includes(order.status) || order.status === 'failed');
  const refresh = () => Promise.all([api('/api/v1/my-orders'), api('/api/v1/my-orders?archived=1'), api('/api/v1/my-draft')]).then(([data, archive, saved]) => {setArchived(archive.orders);setOldDrafts(archive.archivedDrafts || []);setDraft(saved.draft);clearRemovedLocalDraft(localStorage, saved.removedDrafts);setOrders(data.orders);setNeedsLogin(false);if (firstLoad.current) {firstLoad.current = false;if (mode === 'orders') setSection('orders');else if (helpIntent.view) setSection(helpIntent.view);else if (!embedded && initialSection === 'games' && data.orders.some(needsAttention)) setSection('making');}setError('');}).catch((failure) => {if (/Sign in|Verify/.test(failure.message)) setNeedsLogin(true);else setError(failure.message);});
  useEffect(() => {refresh();}, []);
  useEffect(() => {if (!orders?.some((order) => ['paid', 'fulfilling'].includes(order.status) || ['queued', 'submitting', 'pending'].includes(order.coverStatus))) return;const timer = setInterval(() => {if (document.visibilityState === 'visible') refresh();}, 10000);return () => clearInterval(timer);}, [orders]);
  async function deleteDraft() {
    if (!window.confirm('Move this saved planning draft to Archived? You can restore it later.')) return;
    try {await api('/api/v1/my-draft', { method: 'DELETE' });localStorage.removeItem('paw-draft');await refresh();} catch (failure) {setError(failure.message);}
  }
  async function restoreEntry(id, isDraft = false) {
    if (isDraft) {try {const local = JSON.parse(localStorage.getItem('paw-draft') || 'null');if (local?.idea && !window.confirm('Replace the unsaved idea on this device with this archived draft?')) return;} catch {}}
    setRestoring(id);setError('');
    try {
      const result = await api(isDraft ? `/api/v1/archived-drafts/${id}/restore` : `/api/v1/orders/${id}/archive`, { method: isDraft ? 'POST' : 'DELETE' });
      if (isDraft) localStorage.setItem('paw-draft', JSON.stringify(fromCloudDraft(result.draft)));
      await refresh();
    } catch (failure) {setError(failure.message);} finally {setRestoring('');}
  }
  const games = (orders || []).filter((order) => order.status === 'published');
  const making = (orders || []).filter(needsAttention);
  const orderHistory = mode === 'orders' ? [...new Map([...(orders || []), ...archived].map((order) => [order.id, order])).values()] : orders || [];
  const paidOrders = orderHistory.filter((order) => Boolean(order.paid_at));
  const unpaidOrders = orderHistory.filter((order) => !order.paid_at);
  const visible = section === 'archived' ? archived : section === 'games' ? games : section === 'making' ? making : historyKind === 'paid' ? paidOrders : unpaidOrders;
  const date = (value) => value ? new Date(value.replace(' ', 'T') + (value.endsWith('Z') ? '' : 'Z')).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
  return <ShelfRoot className={embedded ? "cc-library" : "extended-page live-page shelf-page"}>
    {!embedded && <Intro eyebrow="MY ADVENTURES" title={translateUi("Your games, ready to play.")}><p>{translateUi("Download your purchased adventures, follow custom creations and return to your ideas.")}</p></Intro>}
    <section className="shelf-shell">{!embedded && <SudokuAccountEntry />}
      {needsLogin ? <div className="live-panel"><h2>{translateUi("Sign in to your library")}</h2><Link className="button" to={localHref('/en/account/?returnTo=' + encodeURIComponent(libraryPath(helpIntent)))}>{translateUi("Sign in with Google ")}<ArrowRight size={18} /></Link></div> : orders === null ? error ? <div className="live-panel"><Alert>{translateUi(error)}</Alert><button className="button-quiet" onClick={refresh}>{translateUi("Retry library")}</button></div> : <p role="status">{translateUi("Loading your library\u2026")}</p> : <>
        {mode !== "orders" && <nav className="shelf-tabs" aria-label={translateUi("Your adventure library")}>{[['games', embedded ? 'Ready to play' : 'My games', games.length], ['making', 'In progress', making.length], ['drafts', 'My drafts', draft ? 1 : 0], ...(!embedded ? [['orders', 'Order history', paidOrders.length]] : []), ['archived', 'Archived', archived.length + oldDrafts.length]].map(([id, title, count]) => <button type="button" key={id} aria-pressed={section === id} className={section === id ? 'active' : ''} onClick={() => {setSection(id);if (embedded) {const u = new URL(window.location.href);u.searchParams.set('view', id);u.searchParams.delete('support');history.replaceState(null, '', u);}}}>{translateUi(title)}<span>{translateUi(count)}</span></button>)}</nav>}
        <div className="shelf-toolbar"><p>{section === 'archived' ? translateUi('Records removed from your everyday library. Restore them at any time; paid orders still have order details and refund help.') : section === 'games' ? translateUi('Completed games with downloadable PDFs appear here.') : section === 'making' ? translateUi('Your paid custom orders stay here until delivery, including any that need recovery.') : section === 'drafts' ? translateUi('Saved ideas are not purchases and have not been charged.') : translateUi('Paid purchases are listed separately from unfinished checkout attempts.')}</p><button type="button" className="button-quiet" onClick={refresh}>{translateUi("Refresh")}</button></div>
        {section === 'orders' && <div className="creator-source-choice"><button type="button" aria-pressed={historyKind === 'paid'} onClick={() => setHistoryKind('paid')}>{translateUi("Paid orders (")}{translateUi(paidOrders.length)})</button><button type="button" aria-pressed={historyKind === 'unpaid'} onClick={() => setHistoryKind('unpaid')}>{translateUi("Unfinished checkouts (")}{translateUi(unpaidOrders.length)})</button></div>}
        {helpIntent.support && section !== 'archived' && <p className="live-panel" role="status">{helpIntent.support === 'refund' ? translateUi('Choose a paid order below and select Request a refund.') : translateUi('Choose a paid order below and select Get help with this order.')}{translateUi(" Your request will be linked to that purchase.")}</p>}
        {section === 'games' && embedded && <p className="cc-inline-note">{translateUi("Looking for a purchase? ")}<Link to={localHref("/en/account/billing/")}>{translateUi("View orders & billing \u2192")}</Link></p>}
        {error && <Alert>{translateUi(error)}</Alert>}
        {section === 'archived' && oldDrafts.map((item) => <article className="live-panel shelf-draft" key={item.id}><span className="eyebrow">{translateUi("ARCHIVED IDEA \xB7 NOT PAID")}</span><h2>{translateUi(item.title)}</h2><p>{item.setting === 'classroom' ? translateUi('Classroom') : translateUi('Home')}{translateUi(" \xB7 Removed ")}{translateUi(date(item.removedAt))}</p><button type="button" className="button-quiet" disabled={Boolean(restoring)} onClick={() => restoreEntry(item.id, true)}>{restoring === item.id ? translateUi('Restoring…') : translateUi('Restore draft')}</button></article>)}
        {!embedded && section === 'games' && games.some((order) => order.product_kind === 'ready') && <label className="shelf-paper">{translateUi("Download paper size")}<select value={paper} onChange={(event) => setPaper(event.target.value)}><option value="A4">A4</option><option value="Letter">{translateUi("US Letter")}</option></select></label>}
        {section === 'drafts' ? draft ? <article className="live-panel shelf-draft"><span className="eyebrow">{translateUi("UNPURCHASED IDEA")}</span><h2>{draft.customIdea || draft.themeId || translateUi('Your story idea')}</h2><p>{draft.setting === 'classroom' ? translateUi('Classroom') : translateUi('Home')} · {translateUi(draft.players)}{translateUi(" players")}</p><Link className="button" to={localHref("/en/create/")}>{translateUi("Continue designing ")}<ArrowRight size={18} /></Link><button className="button-quiet" onClick={deleteDraft}>{translateUi("Archive draft")}</button></article> : <div className="shelf-empty"><h2>{translateUi("No saved ideas yet")}</h2><Link className="button" to={localHref("/en/create/")}>{translateUi("Create an adventure ")}<ArrowRight size={18} /></Link></div> : visible.length === 0 && !(section === 'archived' && oldDrafts.length) ? <div className="shelf-empty"><Books size={38} /><h2>{section === 'archived' ? translateUi('No archived orders or drafts') : section === 'games' ? translateUi('Your first adventure belongs here') : section === 'making' ? translateUi('Nothing is being made right now') : translateUi('No orders yet')}</h2><p>{section === 'games' ? translateUi('Completed purchases appear here. Find payment records in Orders & billing.') : translateUi('Explore a game or create a new story for your group.')}</p><Link className="button" to={localHref("/en/for-home/")}>{translateUi("Browse games ")}<ArrowRight size={18} /></Link></div> :
        <div className={'shelf-grid ' + (section === 'orders' ? 'shelf-history' : '')}>{visible.map((order) => {
            const downloadPaper = order.product_kind === 'ready' ? embedded ? paperByOrder[order.id] || paper : paper : order.paper;
            return <article className="shelf-game" key={order.id}>
            <AdventureCover order={order} />
            <div className="shelf-game-copy"><span className="eyebrow">{order.setting === 'classroom' ? translateUi('CLASSROOM') : translateUi('HOME')} · {order.product_kind === 'ready' ? translateUi('READY-MADE') : translateUi('AI CUSTOM')}</span><h2>{order.title || translateUi('Your adventure')}</h2>
              <p className={'shelf-status status-' + order.status}>{order.checkoutExpired ? translateUi('Checkout expired · not paid') : order.status === 'failed' && !order.paid_at ? translateUi('Checkout unsuccessful · not paid') : order.status === 'pending_payment' ? translateUi('Unfinished checkout · not paid') : order.status === 'failed' && order.paid_at ? translateUi('Paid · PDF creation stopped · action needed') : order.planStatus === 'needs_help' ? translateUi('Paid · plan generation stopped · action needed') : order.planStatus === 'review' ? translateUi('Paid · personal plan ready for review') : order.planStatus === 'confirmed' ? translateUi('Paid · creating PDFs') : order.paid_at ? translateUi("Paid \xB7 {value0}", { value0: orderLabel[order.status] || order.status }) : orderLabel[order.status] || translateUi(order.status)}</p>
              <p className="live-note">{translateUi("Order ")}{translateUi(order.id.slice(0, 8).toUpperCase())} · {order.paid_at ? translateUi("Paid {value0}", { value0: date(order.paid_at) }) : translateUi("Started {value0}", { value0: date(order.created_at) })} · {translateUi(formatUsd(order.amount_total))}<br />{order.accessExpiresAt && translateUi("Downloads until {value0}", { value0: date(order.accessExpiresAt) })}</p>
              {section !== 'archived' && <ThemeCoverStatus order={order} refresh={refresh} />}
              {embedded && section === 'games' && order.product_kind === 'ready' && <label className="shelf-paper">{translateUi("Paper size")}<select aria-label={translateUi("Paper size for {value0}", { value0: order.title || 'your game' })} value={downloadPaper} onChange={(event) => setPaperByOrder((previous) => ({ ...previous, [order.id]: event.target.value }))}><option value="A4">A4</option><option value="Letter">{translateUi("US Letter")}</option></select></label>}
              {section === 'games' && order.filesReady ? <div className="shelf-downloads"><CompletePackDownload escapeGame={['seventh-carriage', 'midnight-masquerade', 'thirteenth-hour', 'last-letter', 'fold-city'].includes(order.themeId) ? order.themeId : false} orderId={order.id} kind={order.product_kind} paper={downloadPaper} setting={order.setting} /><details className="cc-individual-downloads" open={embedded ? undefined : true}><summary>{translateUi("Download individual files")}</summary><a className="button-quiet" href={localHref('/api/v1/files/' + order.id + '/player?paper=' + downloadPaper)}>{translateUi("Player Pack \xB7 ")}{downloadPaper === 'Letter' ? translateUi('US Letter') : translateUi(downloadPaper)} <DownloadSimple size={18} /></a><a className="button-quiet" href={localHref('/api/v1/files/' + order.id + '/guide?paper=' + downloadPaper)}>{order.setting === 'classroom' ? translateUi('Teacher Guide') : translateUi('Host Guide')} <DownloadSimple size={18} /></a><small>{translateUi("Download both: player activities and separate instructions with answers.")}</small><MidnightIndividualFiles themeId={order.themeId} orderId={order.id} paper={downloadPaper} /></details></div> : section === 'games' && <p className="live-note">{translateUi("Online downloads are unavailable. Check your order for access details.")}</p>}
              {section === 'making' && order.status === 'failed' && <p className="shelf-action-note">{order.deliveryRetryAvailable ? translateUi('Your PDFs are not ready. Retry on this paid order without another checkout.') : translateUi('Your PDFs are not ready. Open this paid order for assistance or refund review.')}</p>}
              {embedded && section === 'games' ? <details className="cc-game-more"><summary>{translateUi("More options")}</summary><Link className="text-link" to={localHref('/en/orders/' + order.id + '/')}>{translateUi("Order details ")}<ArrowRight size={18} /></Link>{order.paid_at && order.status !== 'refunded' && <Link className="text-link shelf-refund-link" to={localHref(orderSupportPath(order.id, 'refund'))}>{translateUi("Request a refund")}</Link>}</details> : <>
              <Link className={section === 'making' ? 'shelf-action' + (order.status === 'failed' ? ' shelf-action-urgent' : '') : 'text-link'} to={localHref('/en/orders/' + order.id + '/')}>{section === 'making' ? order.status === 'failed' ? order.deliveryRetryAvailable ? translateUi('Open order to retry PDF') : translateUi('Open order for help') : order.planStatus === 'needs_help' ? translateUi('Open order and recover plan') : order.planStatus === 'review' ? translateUi('Review and edit your plan') : translateUi('View order progress') : translateUi('Order details')} <ArrowRight size={18} /></Link>
              {section === 'archived' && <button type="button" className="button-quiet shelf-restore" disabled={Boolean(restoring)} onClick={() => restoreEntry(order.id)}>{restoring === order.id ? translateUi('Restoring…') : translateUi('Restore to library')}</button>}
              {order.paid_at && order.status !== 'refunded' && <Link className={helpIntent.support ? 'button shelf-refund-link' : 'text-link shelf-refund-link'} to={localHref(orderSupportPath(order.id, helpIntent.support || 'refund'))}>{helpIntent.support === 'problem' ? translateUi('Get help with this order') : translateUi('Request a refund')}</Link>}
              </>}
            </div>
          </article>;
          })}</div>}
        <div className="shelf-help"><p>{translateUi("Looking for a new adventure?")}</p><Link to={localHref("/en/for-home/")}>{translateUi("Home games")}</Link><Link to={localHref("/en/for-classroom/")}>{translateUi("Classroom games")}</Link><Link to={localHref("/en/create/")}>{translateUi("Create with AI")}</Link><Link to={localHref("/en/help/")}>{translateUi("Get help")}</Link></div>
      </>}
    </section>
  </ShelfRoot>;
}

function OrderQualityActions({ order, onHelp }) {
  if (order.kind !== 'custom' || !order.paidAt || !order.filesReady) return null;
  const legacy = (order.gamePackVersion || 1) < 2;
  if (!legacy) return null;
  const canRevise = order.revisionLimit > order.revisionUsed && order.revisionExpiresAt && Date.parse(`${order.revisionExpiresAt}Z`) > Date.now();
  return <section className="order-quality-actions" aria-labelledby="order-quality-title">
    <span className="eyebrow">{translateUi("AFTER YOU DOWNLOAD")}</span><h2 id="order-quality-title">{translateUi("Want to improve this game?")}</h2>
    <p>{translateUi("Use the option that matches the problem. Both stay with this paid order; there is no new checkout.")}</p>
    <div className="order-quality-grid">
      {canRevise && <div><h3>{translateUi("Change one checkpoint")}</h3><p>{translateUi("Adjust the reading level, difficulty or instructions in one existing checkpoint. Only a successful revised file uses an included change.")}</p><a className="button-quiet" href="#order-revision">{translateUi("Choose a checkpoint ")}<ArrowRight size={17} /></a></div>}
      <div><h3>{legacy ? translateUi('Create a new version of the whole pack') : translateUi('Report an error in the pack')}</h3><p>{legacy ? translateUi('Your earlier pack can be rebuilt in the new paper-material format on this paid order. The original files stay available while the new version is created and checked.') : translateUi('If a clue, answer or file is wrong, record the issue on this order for review. This is separate from your included preference changes.')}</p>{legacy ? <a className="button-quiet" href="#order-remake" onClick={() => {const upgrade = document.querySelector('.order-optional-upgrade');if (upgrade) upgrade.open = true;}}>{translateUi("View no-charge remake ")}<ArrowRight size={17} /></a> : <button type="button" className="button-quiet" onClick={() => onHelp('clue', 'I found an error in my delivered game pack: ')}>{translateUi("Report a game error ")}<ArrowRight size={17} /></button>}</div>
    </div>
  </section>;
}

function RevisionForm({ order, refresh }) {
  const [stageNumber, setStageNumber] = useState(1),[instruction, setInstruction] = useState(''),[custom, setCustom] = useState(false),[workspace, setWorkspace] = useState(null);
  const [busy, setBusy] = useState(false),[notice, setNotice] = useState(''),[error, setError] = useState('');
  const remaining = order.revisionLimit - order.revisionUsed,checked = order.checkedPuzzleRevision;
  const available = order.kind === 'custom' && order.filesReady && !['queued', 'generating'].includes(order.remake?.status) && remaining > 0 &&
  order.revisionExpiresAt && Date.parse(`${order.revisionExpiresAt}Z`) > Date.now();
  async function load() {try {setWorkspace(await api(`/api/v1/orders/${order.id}/revision-workspace`));} catch (failure) {setError(failure.message);}}
  useEffect(() => {if (available) load();}, [order.id, available]);
  useEffect(() => {if (!['queued', 'generating'].includes(workspace?.preview?.status)) return;const timer = setInterval(load, 4000);return () => clearInterval(timer);}, [workspace?.preview?.status, order.id]);
  if (!available) return null;
  const stages = workspace?.stages || [],pending = workspace?.preview,selected = pending?.status === 'ready' ? pending.stageNumber : stageNumber;
  const current = stages[selected - 1],candidate = pending?.candidate,locked = Boolean(pending && ['queued', 'generating', 'ready'].includes(pending.status));
  const shortcuts = [
  ['Make the clue easier to read aloud, keeping the task and play style.', 'Easier to read'],
  ['Add a clearer hint, keeping the printed puzzle and answer unchanged.', 'Clearer hint'],
  ['Clarify the printed instructions step by step, keeping the same answer.', 'Step-by-step instructions']];

  async function generate(event) {event.preventDefault();setBusy(true);setError('');setNotice('');try {await api(`/api/v1/orders/${order.id}/revision-previews`, { method: 'POST', body: JSON.stringify({ stageNumber, instruction, mode: custom ? 'custom' : 'preset' }) });setNotice('Preparing your comparison. Your current game stays available.');await load();} catch (failure) {setError(failure.message);} finally {setBusy(false);}}
  async function decide(action) {setBusy(true);setError('');setNotice('');try {await api(`/api/v1/orders/${order.id}/revision-previews/${pending.id}/${action}`, { method: 'POST' });setNotice(action === 'accept' ? 'The new version is ready to download.' : 'Your current version is unchanged.');setInstruction('');setCustom(false);await refresh();await load();} catch (failure) {setError(failure.message);} finally {setBusy(false);}}
  const previewRole = candidate && current?.clue === candidate.clue ? 'guide' : 'player';
  const pdfFragment = previewRole === 'player' ? `#page=${selected * 2}&toolbar=0&navpanes=0` : '#toolbar=0&navpanes=0';
  const currentPdf = `/api/v1/files/${order.id}/${previewRole}?paper=${encodeURIComponent(workspace?.paper || order.paper)}&version=${workspace?.version || 1}&view=1${pdfFragment}`;
  const candidatePdf = pending?.id ? `/api/v1/orders/${order.id}/revision-previews/${pending.id}/${previewRole}${pdfFragment}` : '';
  return <section id="order-revision" className="order-revision-form" aria-labelledby="checkpoint-change-title">
    <span className="eyebrow">{translateUi("OPTIONAL \xB7 ONE CHECKPOINT")}</span><h2 id="checkpoint-change-title">{translateUi("Improve one checkpoint")}</h2>
    <p>{translateUi("Choose a checkpoint, see the change, then decide. Your current game stays downloadable.")}</p>
    {!workspace ? <p role="status">{translateUi("Loading your game pages\u2026")}</p> : <>
      <h3>{translateUi("1. Choose a checkpoint")}</h3>
      <div className="revision-page-grid" role="group" aria-label={translateUi("Choose one checkpoint")}>{stages.map((stage) => <button key={stage.number} type="button" className="revision-page-card" aria-pressed={selected === stage.number} disabled={locked} onClick={() => {setStageNumber(stage.number);setInstruction('');setCustom(false);}}>
        <span className="revision-paper-thumb" aria-hidden="true"><span>{translateUi("CHECKPOINT ")}{stage.number}</span><strong>{stage.title}</strong><small>{stage.clue}</small></span>
        <strong>{translateUi("Checkpoint ")}{stage.number}</strong><span>{stage.title}</span><small>{translateUi("Player pages ")}{stage.number * 2}–{stage.number * 2 + 1}</small>
      </button>)}</div>
      {current && <div className="revision-current-copy"><strong>{translateUi("Current checkpoint \xB7 ")}{current.title}</strong><p>{current.storyContext}</p><p>{current.task}</p><p>{current.clue}</p><details><summary>{translateUi("See printed pieces and choices")}</summary><p>{current.material.instruction}</p><ul>{current.material.items.map((item, index) => <li key={index}><strong>{item.label}</strong> · {item.detail}</li>)}</ul><ol type="A">{current.options.map((option, index) => <li key={index}>{option}</li>)}</ol></details></div>}
      {!locked && <form onSubmit={generate}><h3>{translateUi("2. What should improve?")}</h3><div className="revision-shortcuts">{shortcuts.map(([value, label]) => <button key={value} type="button" aria-pressed={!custom && instruction === value} onClick={() => {setInstruction(value);setCustom(false);}}>{translateUi(label)}</button>)}</div>
        {(workspace.customAvailable || !checked) && <details className="revision-custom-note" onToggle={(event) => {if (!event.currentTarget.open && custom) {setInstruction('');setCustom(false);}}}><summary>{translateUi("Describe a different change to AI")}</summary><label>{translateUi("What should be clearer in this checkpoint?")}<textarea minLength="10" maxLength="350" value={custom ? instruction : ''} onChange={(event) => {setInstruction(event.target.value);setCustom(true);}} placeholder={translateUi("For example: Make the hint easier for 8-year-olds without changing the answer.")} /></label><small>{translateUi("AI is called only when you generate this comparison. Up to three AI comparisons are available on this order.")}</small></details>}
        <button className="button revision-generate" disabled={busy || !instruction}>{busy ? translateUi('Preparing…') : translateUi('Generate comparison')}</button></form>}
      {['queued', 'generating'].includes(pending?.status) && <div className="revision-wait" role="status">{translateUi("Preparing a revised checkpoint. You can leave this page and come back; the current PDFs remain ready.")}</div>}
      {pending?.status === 'ready' && candidate && <div className="revision-result"><h3>{translateUi("3. Compare and decide")}</h3><p>{translateUi("Only checkpoint ")}{translateUi(selected)}{translateUi(" changes. The printed puzzle and answer stay the same.")}</p><div className="revision-compare">
        {[['Current version', current, currentPdf], ['Suggested version', candidate, candidatePdf]].map(([label, stage, pdf]) => <article key={label}><h4>{translateUi(label)}</h4><p><strong>{translateUi("Clue")}</strong><br />{stage.clue}</p><p><strong>{translateUi("Hint for the adult")}</strong><br />{stage.hint}</p><details><summary>{translateUi("Preview the actual ")}{previewRole === 'player' ? translateUi('player page') : translateUi('adult guide')}</summary><iframe title={translateUi("{value0} checkpoint {value1} PDF", { value0: label, value1: selected })} src={pdf} loading="lazy" /></details></article>)}
      </div><div className="revision-decisions"><button type="button" className="button" disabled={busy} onClick={() => decide('accept')}>{translateUi("Use suggested version")}</button><button type="button" className="button-quiet" disabled={busy} onClick={() => decide('discard')}>{translateUi("Keep current version")}</button></div><p className="live-note">{translateUi("One included change is used only when you choose the suggested version.")}</p></div>}
      {pending?.status === 'failed' && <p role="status">{translateUi("This comparison could not be prepared. Your current game and included changes are unchanged. You can choose another wording option.")}</p>}
      <details className="revision-rules"><summary>{translateUi("What can I change?")}</summary><p>{translateUi(remaining)}{translateUi(" included successful ")}{remaining === 1 ? translateUi('change') : translateUi('changes')}{translateUi(" left. This adjusts wording or hints in one checkpoint. For a wrong answer, different puzzle or whole-game problem, ")}<a href="#order-help">{translateUi("use order help below")}</a>.</p></details>
    </>}
    {notice && <p role="status">{translateUi(notice)}</p>}{error && <Alert>{translateUi(error)}</Alert>}
  </section>;
}


export function PaidPlanReview({ order, refresh }) {
  const review = order.planReview;
  const [mode, setMode] = useState('edit');
  const [scope, setScope] = useState('stage1');
  const [feedbackByMode, setFeedbackByMode] = useState({ edit: '', rework: '' });
  const feedback = feedbackByMode[mode];
  const setFeedback = (value) => setFeedbackByMode((previous) => ({ ...previous, [mode]: value }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  if (!review || !['paid', 'fulfilling', 'published', 'failed'].includes(order.status)) return null;

  async function action(body) {
    setBusy(true);setError('');setNotice('');
    try {
      await api(`/api/v1/orders/${order.id}/plan`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) });
      setNotice(body.action === 'confirm' ? 'Plan approved. Your PDFs are now queued.' : body.action === 'repair_story_scenes' ? 'Story-scene repair queued. Your saved plan and original PDFs remain available.' : body.action === 'select' ? 'Saved plan selected.' : body.action === 'retry_initial' ? 'A free recovery attempt is queued. You will not be charged again.' : body.action === 'resume_review' ? 'Your saved plan is ready to review again.' : 'Your plan change is queued. It uses an included change only if a valid new plan is delivered.');
      setFeedback('');
      await refresh();
    } catch (failure) {setError(failure.message);} finally
    {setBusy(false);}
  }

  const qualityReview = order.status === 'published' && review.qualityReplanUsed && review.status === 'review' && review.activeVersion > review.confirmedVersion;
  const stoppedReplacement = review.themeReplanFailed && review.activeVersion > review.confirmedVersion;
  const reviewable = order.status === 'paid' && review.status === 'review' || qualityReview;
  const targetedLeft = Math.max(0, review.targetedLimit - review.targetedUsed);
  const reworksLeft = Math.max(0, review.fullLimit - review.fullUsed);
  const changeAvailable = mode === 'edit' ? targetedLeft > 0 : reworksLeft > 0;
  const hasUnsentFeedback = Object.values(feedbackByMode).some((value) => Boolean(value.trim()));
  const activePlan = review.versions.find((item) => item.version === review.activeVersion)?.plan;
  const stageNumber = /^stage([1-5])$/.exec(scope)?.[1];
  const selectedStage = stageNumber ? activePlan?.stages?.find((item) => item.number === Number(stageNumber)) : null;
  const scopeNames = { title: 'Title', summary: 'Summary', opening: 'Opening', roles: 'Team roles', goal: 'Goal', preparation: 'Preparation' };
  const selectedName = selectedStage ? translateUi("Checkpoint {value0} \xB7 {value1}", { value0: stageNumber, value1: selectedStage.title }) : scopeNames[scope] || 'Selected part';
  const selectedText = selectedStage ? [selectedStage.storyContext, selectedStage.task].filter(Boolean).join(' ') : activePlan?.[scope];
  const scopeOptions = [['title', 'Title'], ['summary', 'Summary'], ['opening', 'Opening'], ['roles', 'Team roles'], ['goal', 'Goal'], ['preparation', 'Preparation'], ...[1, 2, 3, 4, 5].map((n) => [`stage${n}`, translateUi("Checkpoint {value0}", { value0: n })])].filter(([value]) => !order.packContractVersion || !['roles', 'preparation'].includes(value));

  return <section id="personal-plan-review" className="paid-plan-review" aria-label={translateUi("Personal plan review")}>
    <header className="paid-plan-heading">
      <span className="eyebrow">{translateUi("YOUR PAID PLAN")}</span>
      <h2>{stoppedReplacement ? translateUi('Replacement plan not approved') : qualityReview ? translateUi('Review your corrected theme plan') : review.status === 'confirmed' ? translateUi('Approved plan') : review.status === 'needs_help' ? translateUi('Plan generation stopped') : review.status === 'review' ? translateUi('Review your plan') : translateUi('Preparing your personal plan')}</h2>
      {stoppedReplacement ? <p>{translateUi("The correction stopped. Version ")}{translateUi(review.activeVersion)}{translateUi(" is saved but has not been approved. Version ")}{translateUi(review.confirmedVersion)}{translateUi(" remains approved for your existing files.")}</p> : qualityReview ? <p>{translateUi("Compare this new plan with your original theme. Your existing PDFs stay available. Approve only if the characters, world, goal and five scenes fit your idea; approval then starts a no-charge replacement pack.")}</p> : reviewable ? <><p>{translateUi("Review the story direction and five checkpoints. You can edit this plan now, or create the complete game and review its actual PDFs before requesting post-delivery changes.")}</p><div className="paid-plan-allowances" aria-label={translateUi("Included plan changes remaining")}><a href="#paid-plan-next" onClick={() => setMode('edit')}><strong>{translateUi("Change one part")}</strong> · {translateUi(targetedLeft)}{translateUi(" left")}</a><a href="#paid-plan-next" onClick={() => setMode('rework')}><strong>{translateUi("Rethink this plan")}</strong> · {translateUi(reworksLeft)}{translateUi(" left")}</a></div><a className="paid-plan-skip" href="#paid-plan-next">{translateUi("Go to next step \u2193")}</a></> : review.confirmedVersion ? <p>{translateUi("Plan version ")}{translateUi(review.confirmedVersion)}{translateUi(" was approved for the first delivery. Later accepted game versions are listed with your downloads.")}</p> : review.status === 'needs_help' ? <p>{translateUi("Your payment is confirmed, but we could not finish a valid plan. No PDF generation has started, and no plan change was used.")}</p> : <p>{translateUi("Plan generation and quality checks are in progress.")}</p>}
    </header>

    {qualityReview && <a className="paid-plan-skip" href="#paid-plan-next">{translateUi("Go to approval \u2193")}</a>}
    {review.pending && <p className="paid-plan-pending" role="status">{review.qualityReplanUsed ? translateUi('Preparing a corrected theme plan') : review.pending === 'initial' ? translateUi('Creating your first plan') : translateUi('Preparing your requested change')}{translateUi("\u2026 You can return later through My adventures.")}</p>}
    {review.status === 'needs_help' && <div className="paid-plan-recovery" role="status"><p>{review.activeVersion ? translateUi('Your earlier valid plan is saved. Return to it to review, edit or approve it.') : review.retryAvailable ? translateUi('You can try the first plan again once at no charge. If it still fails, report the problem below for help or refund-policy review.') : translateUi('This plan needs manual help. Report the problem below for assistance or refund-policy review.')}</p>{review.retryAvailable && !review.activeVersion && <button type="button" className="button" disabled={busy} onClick={() => action({ action: 'retry_initial' })}>{busy ? translateUi('Requesting…') : translateUi('Retry my plan at no charge')} <ArrowRight size={17} /></button>}{review.activeVersion > 0 && <button type="button" className="button" disabled={busy} onClick={() => action({ action: 'resume_review' })}>{translateUi("Return to my saved plan ")}<ArrowRight size={17} /></button>}</div>}

    {review.versions.length > 0 && <div className="paid-plan-versions"><h3>{translateUi("Your saved plans")}</h3><p>{translateUi("Saved versions stay available for comparison without using another change.")}</p><div className="creator-plan-options">{review.versions.filter((item) => item.version === review.activeVersion).map((item) => <article key={item.version} className={item.version === review.activeVersion ? 'selected' : ''}><h4>{translateUi("Version ")}{translateUi(item.version)} · {item.plan.title}</h4>{review.confirmedVersion && <p className="live-note">{item.version === review.confirmedVersion ? translateUi('Approved for your existing files') : item.version > review.confirmedVersion ? translateUi('Saved replacement · not approved') : translateUi('Earlier saved version')}</p>}<p>{item.plan.summary}</p><details open={undefined}><summary>{translateUi("Read this five-checkpoint plan")}</summary><PlanPreview plan={item.plan} showPreparation={false} /></details>{reviewable && !qualityReview && item.version !== review.activeVersion && <button type="button" className="button-quiet" disabled={busy} onClick={() => action({ action: 'select', version: item.version })}>{translateUi("Use this version")}</button>}</article>)}</div>{review.versions.length > 1 && <details><summary>{translateUi("Earlier saved plans")}</summary>{review.versions.filter((item) => item.version !== review.activeVersion).map((item) => <article key={item.version}><h4>{translateUi("Version ")}{translateUi(item.version)} · {item.plan.title}</h4><PlanPreview plan={item.plan} showPreparation={false} />{reviewable && !qualityReview && <button type="button" className="button-quiet" disabled={busy} onClick={() => action({ action: 'select', version: item.version })}>{translateUi("Use this version")}</button>}</article>)}</details>}</div>}

    {reviewable && <div id="paid-plan-next" className="paid-plan-next">
      {!qualityReview && <div className="paid-plan-change">
        <span className="eyebrow">{translateUi("OPTIONAL CHANGE")}</span>
        <h3>{translateUi("Want to change the plan?")}</h3>
        <p>{translateUi("Your selected version stays saved. A change is used only when a valid new plan is ready for review.")}</p>
        <div className="paid-plan-modes" role="group" aria-label={translateUi("Choose a plan change")}>
          <button type="button" aria-pressed={mode === 'edit'} disabled={busy} onClick={() => setMode('edit')}><strong>{translateUi("Change one part")}</strong><span>{translateUi("Focus on one checkpoint or story detail \xB7 ")}{translateUi(targetedLeft)}{translateUi(" left")}</span></button>
          <button type="button" aria-pressed={mode === 'rework'} disabled={busy} onClick={() => setMode('rework')}><strong>{translateUi("Rethink the whole plan")}</strong><span>{translateUi("Ask for a different overall direction \xB7 ")}{translateUi(reworksLeft)}{translateUi(" left")}</span></button>
        </div>
        {changeAvailable ? <form className="paid-plan-change-form" onSubmit={(event) => {event.preventDefault();action({ action: mode, scope: mode === 'edit' ? scope : undefined, feedback: feedback.trim() });}}>
          {mode === 'edit' && <div className="paid-plan-field"><label htmlFor="paid-plan-scope">{translateUi("Part to change")}</label><select id="paid-plan-scope" value={scope} onChange={(event) => setScope(event.target.value)}>{scopeOptions.map(([value, label]) => <option value={value} key={value}>{translateUi(label)}</option>)}</select>{activePlan && <div className="paid-plan-selected"><span>{translateUi("Currently selected")}</span><strong>{translateUi(selectedName)}</strong>{selectedText && <p>{translateUi(selectedText)}</p>}</div>}</div>}
          <div className="paid-plan-field"><label htmlFor="paid-plan-feedback">{translateUi("What should change?")}</label><textarea id="paid-plan-feedback" rows={6} minLength={10} maxLength={500} required value={feedback} onChange={(event) => setFeedback(event.target.value)} aria-describedby="paid-plan-feedback-hint paid-plan-feedback-count" placeholder={translateUi(mode === 'edit' ? translateUi('For example: Make checkpoint 2 easier to read, but keep the clue and the team decision.') : translateUi('For example: Keep the setting, but make the five checkpoints feel more like a mystery.'))} /><div className="paid-plan-field-meta"><span id="paid-plan-feedback-hint">{translateUi("Say what felt wrong and what should stay.")}</span><span id="paid-plan-feedback-count">{translateUi(feedback.length)}/500{feedback && <button type="button" className="paid-plan-clear" onClick={() => setFeedback('')}>{translateUi("Clear draft")}</button>}</span></div></div>
          <button type="submit" className="paid-plan-submit" disabled={busy}>{busy ? translateUi('Submitting…') : mode === 'edit' ? translateUi('Request this edit') : translateUi('Request a new plan direction')} <ArrowRight size={17} /></button>
        </form> : <p className="paid-plan-limit" role="status">{translateUi("No ")}{mode === 'edit' ? translateUi('focused edits') : translateUi('whole-plan reworks')}{translateUi(" remain. You can review a saved version or ask for help before approving.")}</p>}
      </div>}

      <section className="paid-plan-approval" aria-label={translateUi("Approve your plan")}>
        <span className="eyebrow">{translateUi("FINAL STEP")}</span>
        <h3>{review.storyScenesRequired ? translateUi('Repair the story before approval') : translateUi('Ready to make your game?')}</h3>
        <p>{qualityReview ? translateUi('Approving this corrected plan starts a replacement game on this paid order. Your current PDFs stay available until the new files pass every check.') : translateUi("Approve version {value0} to begin creating and checking the Player Pack and adult guide. You can follow progress on this order.", { value0: review.activeVersion })}</p>
        {review.storyScenesRequired && <p>{translateUi("This saved replacement contains locations without complete story events. Repair and review its five scenes before approving. Original PDFs stay available. This repair uses the remaining budget of the same request and does not use an included plan edit.")}</p>}
        {review.storySceneRepairAvailable && <button type="button" className="button" disabled={busy} onClick={() => action({ action: 'repair_story_scenes', version: review.activeVersion })}>{busy ? translateUi('Starting…') : translateUi('Update game pack at no charge')} <ArrowRight size={17} /></button>}
        {review.storyScenesRequired && !review.storySceneRepairAvailable && <p>{translateUi("No scene repair remains within this request's limit. Use the order help section for review.")}</p>}
        {!review.storyScenesRequired && <button type="button" className="button" disabled={busy || !qualityReview && hasUnsentFeedback} onClick={() => action({ action: 'confirm', version: review.activeVersion })}>{translateUi("Approve this plan and create PDFs ")}<ArrowRight size={17} /></button>}
        {hasUnsentFeedback ? <p className="paid-plan-approval-note">{translateUi("You have an unsent change request. Return to that change type to submit or clear it before approving.")}</p> : <p className="paid-plan-approval-note">{translateUi("If a plan does not work for you, use the help form below before approval.")}</p>}
      </section>
    </div>}
    {notice && <p className="paid-plan-notice" role="status">{translateUi(notice)}</p>}{error && <Alert>{translateUi(error)}</Alert>}
  </section>;
}

function DeliveryRecovery({ order, refresh }) {
  const [busy, setBusy] = useState(false),[notice, setNotice] = useState(''),[error, setError] = useState('');
  if (order.kind !== 'custom' || order.status !== 'failed' || !order.paidAt) return null;
  async function retry() {
    setBusy(true);setError('');setNotice('');
    try {await api(`/api/v1/orders/${order.id}/retry-delivery`, { method: 'POST' });setNotice(order.savedCopyRecoveryAvailable ? 'The saved game check is continuing on this paid order. You will not be charged again.' : 'PDF creation has been queued on this paid order. You will not be charged again.');await refresh();}
    catch (failure) {setError(failure.message);} finally {setBusy(false);}
  }
  if (order.deliveryRetryAvailable) return <section className="order-next-step delivery-failed" aria-label={translateUi("Next step")}>
    <span className="eyebrow">{translateUi("NEXT STEP")}</span>
    <h2>{order.savedCopyRecoveryAvailable ? translateUi('Continue your saved game') : translateUi('Continue making your game')}</h2>
    <p>{translateUi("Your plan and completed work are saved. Continue this paid order at no charge.")}</p>
    <button type="button" className="button" disabled={busy} onClick={retry}>{busy ? translateUi('Continuing…') : translateUi('Continue game at no charge')} <ArrowRight size={17} /></button>
    {notice && <p role="status">{translateUi(notice)}</p>}{error && <Alert>{translateUi(error)}</Alert>}
  </section>;
  return <section className="live-revision paid-plan-recovery delivery-failed" role="status">
    <span className="eyebrow">{translateUi("GAME DELIVERY STOPPED")}</span>
    <h3>{translateUi("Your game needs help")}</h3>
    <p>{translateUi("No complete pack is available yet. Your paid order and saved work remain here; you do not need to pay again.")}</p>
    <a className="button" href={localHref('mailto:support@paperadventure.app?subject=' + encodeURIComponent('Game delivery stopped · order ' + order.id.slice(0, 8).toUpperCase()))}>{translateUi("Email support about this order ")}<ArrowRight size={17} /></a>
    <a className="delivery-report-link" href="#order-help" onClick={() => {const help = document.getElementById('order-help');if (help) help.open = true;}}>{translateUi("Or report a problem on this order")}</a>
  </section>;
}

export function orderNextStep(order) {
  const review = order.planReview || {},remake = order.remake;
  if (order.status === 'refunded') return { title: 'This order was refunded', detail: 'There is no game creation action on this order.' };
  if (!order.paidAt) return { title: 'Payment is not confirmed', detail: 'No game package will be created until payment is confirmed.' };
  if (order.kind === 'ready') return order.filesReady ? { title: 'Download your game', detail: 'The complete ZIP contains the Player Pack and adult guide.', href: '#download-game', action: 'Go to downloads' } : { title: 'Waiting for your files', detail: 'This order will show downloads when its files are ready.' };
  if (review.pending) return { title: review.qualityReplanUsed ? 'Your corrected plan is being prepared' : 'Your personal plan is being prepared', detail: 'No action is needed now. This page updates automatically.' };
  if (review.storyScenesRequired && review.status === 'review' && !review.themeReplanFailed) return review.storySceneRepairAvailable ? { title: 'Repair the story scenes', detail: 'The saved plan needs complete story events before it can be approved. Your current files remain available.', href: '#personal-plan-review', action: 'Go to scene repair' } : { title: 'Get help with the story scenes', detail: 'This plan cannot be approved until its scenes are reviewed. Your current files remain available.', href: '#order-help', action: 'Open order help' };
  if (review.themeReplanFailed && (order.themePlanRepairAvailable || review.formatResumeAvailable)) return { title: 'Continue the saved plan check', detail: 'The correction stopped before approval. Continue on this paid order; existing PDFs remain available.', href: '#order-remake', action: 'Go to plan recovery' };
  if (review.themeReplanFailed) return { title: 'Get help with the stopped plan correction', detail: 'The original files remain available. The correction needs a review before it can continue.', href: '#order-help', action: 'Open order help' };
  if (review.status === 'review' && !review.pending) return { title: review.qualityReplanUsed ? 'Review the corrected plan' : 'Review your plan', detail: 'Check the story and five checkpoints. Approving the plan starts the game package.', href: '#personal-plan-review', action: 'Go to plan review' };
  if (review.status === 'needs_help') return review.activeVersion > 0 ? { title: 'Return to your saved plan', detail: 'A valid version is saved on this paid order. Review it to continue.', href: '#personal-plan-review', action: 'Go to saved plan' } : review.retryAvailable ? { title: 'Retry your plan', detail: 'A no-charge retry is available on this paid order.', href: '#personal-plan-review', action: 'Go to plan retry' } : { title: 'Get help with your plan', detail: 'The plan stopped and needs a review before a package can be made.', href: '#order-help', action: 'Open order help' };
  if (['queued', 'generating'].includes(remake?.status)) return { title: 'Your new game pack is being prepared', detail: 'No action is needed now. Saved steps and current files remain on this order.' };
  if (remake?.status === 'failed') return remake.recoveryAvailable ? { title: 'Continue the saved game check', detail: 'The replacement stopped. Resume the saved work on this paid order; no new checkout is needed.', href: '#order-remake', action: 'Go to game recovery' } : { title: 'Get help with the stopped replacement', detail: 'The existing PDFs remain available. The replacement needs a review before it can continue.', href: '#order-help', action: 'Open order help' };
  if (order.themePlanRepairAvailable && !review.qualityReplanUsed) return { title: 'Start the plan correction', detail: 'The corrected theme plan will be prepared on this paid order.', href: '#order-remake', action: 'Go to plan correction' };
  if (['queued', 'generating'].includes(review.status)) return { title: review.qualityReplanUsed ? 'Your corrected plan is being prepared' : 'Your personal plan is being prepared', detail: 'No action is needed now. This page updates automatically.' };
  if (order.status === 'failed') return order.savedCopyRecoveryAvailable ? { title: 'Continue the saved game check', detail: 'All five checkpoints are saved. Continue the interrupted wording check on this paid order without another checkout.', href: '#delivery-recovery', action: 'Go to game recovery' } : order.deliveryRetryAvailable ? { title: 'Retry game delivery', detail: 'Your approved plan is saved. Retry creation on this paid order at no charge.', href: '#delivery-recovery', action: 'Go to delivery recovery' } : { title: 'Get help with game delivery', detail: 'No complete package was delivered. Ask for help on this order without paying again.', href: '#order-help', action: 'Open order help' };
  if (order.filesReady) return { title: 'Download your game', detail: 'The complete ZIP contains the Player Pack and adult guide.', href: '#download-game', action: 'Go to downloads' };
  return { title: 'Your game is being prepared', detail: 'No action is needed now. This page updates automatically.' };
}

export function PlanPreparationProgress({ review }) {
  const work = review.progress;
  const completed = work?.reviewPassed ? 3 : work?.formatChecked ? 2 : work?.candidateSaved ? 1 : 0;
  const labels = { queued: 'Waiting to start your plan', generating: 'Writing your story plan', validating: 'Checking the plan structure', repairing: 'Refining the plan structure', auditing: 'Checking the story and theme', correcting: 'Refining the story and theme', ready: 'Saving your plan for review' };
  const current = labels[work?.phase] || labels[review.status] || 'Preparing your plan';
  return <div className="plan-preparation-progress" aria-label={translateUi("Personal plan preparation progress")} aria-busy="true">
    <strong>{translateUi(current)}</strong>
    <progress max={3} {...completed ? { value: completed } : {}} aria-label={translateUi("Saved plan preparation milestones")} />
    <p>{completed ? translateUi("{value0} of 3 steps saved", { value0: completed }) : translateUi('Working on the first step')}{translateUi(" \xB7 Draft, format check, story review. Progress changes when a step is saved.")}</p>
  </div>;
}

export function OrderNextStep({ order }) {
  const next = orderNextStep(order);
  if (next.href === '#download-game' || next.href === '#delivery-recovery') return null;
  const review = order.planReview;
  const preparingPlan = order.kind === 'custom' && order.paidAt && !order.filesReady && (review?.pending || ['queued', 'generating'].includes(review?.status));
  return <section className="order-next-step" aria-label={translateUi("Next step")} aria-live="polite">
    <span className="eyebrow">{translateUi("NEXT STEP")}</span><h2>{translateUi(next.title)}</h2><p>{translateUi(next.detail)}</p>
    {preparingPlan && <PlanPreparationProgress review={review} />}
    {next.href && <a className="button" href={localHref(next.href)} onClick={next.href === '#order-help' ? () => {const help = document.getElementById('order-help');if (help) help.open = true;} : undefined}>{translateUi(next.action)} <ArrowRight size={18} /></a>}
  </section>;
}

const pdfPhaseText = {
  story: 'creating and checking the game content',
  pdf: 'building the two PDFs',
  storage: 'saving the PDF files',
  delivery_check: 'checking the saved files',
  delivered: 'completed'
};

export function OrderPackage({ order, orderId, selectedPaper, setSelectedPaper }) {
  if(order.kind==='ready'&&order.filesReady&&paidDocumentGame(order.themeId,order.setting,order.variantId)&&order.documentEditions?.length)return <ReadyLocalizedDownloads key={order.id} order={order} paper={selectedPaper} setPaper={setSelectedPaper}/>;
  const ready = order.filesReady;
  const correctingTheme = themeUpdatePending(order);
  const guide = order.sku.includes('classroom') ? 'Teacher Guide' : 'Host Guide';
  const approved = order.kind === 'ready' || Boolean(order.planReview?.confirmedVersion || order.plan?.planConfirmed);
  const state = ready ? correctingTheme || order.remake && order.remake.status !== 'ready' ? 'Original pack ready to download' : 'Ready to download' : order.status === 'failed' ? 'Game package creation stopped' : !approved ? 'Waiting for plan approval' : order.status === 'pending_payment' ? 'Waiting for payment confirmation' : order.generationProgress && !order.generationProgress.storyReady ? 'Creating and checking your game' : order.status === 'fulfilling' ? 'Creating and checking your PDFs' : 'PDF creation is queued';
  const paper = order.kind === 'ready' ? selectedPaper : order.paper;
  const progress = order.generationProgress;
  const originalProgress = ready && (correctingTheme || order.remake && order.remake.status !== 'ready');
  const detailed = Boolean(progress?.blueprintStepTotal);
  const progressTotal = detailed ? progress.blueprintStepTotal + 7 : 8;
  const progressLabel = progress?.phase === 'delivered' ? originalProgress ? 'Original version complete' : 'Complete' : progress?.phase === 'pdf' ? 'Building and checking PDFs' : progress?.phase === 'audit' ? 'Checking the printed puzzles' : progress?.phase === 'checkpoint' ? translateUi("Creating checkpoint {value0} of 5", { value0: progress.currentStage }) : detailed ? translateUi("Preparing story materials ({value0} of {value1} parts saved)", { value0: progress.blueprintStepsCompleted, value1: progress.blueprintStepTotal }) : 'Creating the game blueprint';
  const progressValue = progress?.phase === 'delivered' ? progressTotal : progress?.phase === 'pdf' ? progressTotal - 1 : (detailed ? progress.blueprintStepsCompleted : progress?.blueprintReady ? 1 : 0) + (progress?.completedStages.length || 0) + (detailed && progress?.auditPassed ? 1 : 0);
  const currentStep = { blueprint_frame: 'Writing the story framework', blueprint_material: translateUi("Preparing material {value0} of 5", { value0: progress?.activeStage || 1 }), blueprint_closing: 'Writing the ending', blueprint: 'Assembling the saved materials', checkpoint: translateUi("Building checkpoint {value0} of 5", { value0: progress?.activeStage || 1 }), audit: 'Checking the printed puzzles' }[progress?.activeStep];
  const stepState = { queued: 'The next step is queued.', running: 'This step is being prepared.', retrying: 'Retrying this step; completed work is saved.', waiting_for_update: 'Waiting for a new update. Saved work will be checked for recovery.', stopped: 'Generation has stopped.', complete: 'All files are ready.' }[progress?.stepState];
  return <section className={'order-package' + (order.status === 'failed' ? ' order-package-failed' : '')} aria-labelledby="order-package-title">
    <span className="eyebrow">{translateUi("YOUR GAME PACKAGE")}</span>
    <h2 id="order-package-title">{translateUi(state)}</h2>
    <p>{ready ? correctingTheme ? translateUi('These are the original PDFs. The corrected theme plan and replacement PDFs have not been delivered; follow the status above before using this pack.') : order.remake && order.remake.status !== 'ready' ? translateUi('These are your earlier PDFs. The new paper-material version has not been published yet; its current status is shown above.') : translateUi('Your complete printable adventure is ready below.') : order.status === 'failed' ? translateUi('No complete game package was delivered. There are no files to download at the moment.') : order.status === 'pending_payment' ? translateUi('Payment has not been confirmed for this order.') : approved ? translateUi('The full game package is being prepared. You can return to this order later.') : translateUi('Approve a personal plan before the full PDFs can be created.')}</p>
    {ready && order.kind === 'custom' && <p className="live-note">{originalProgress ? translateUi('These checks apply to the original version. The replacement has not been delivered.') : order.deliveryCheckKind === 'puzzle_and_pdf' ? translateUi('All five printed puzzles and both PDF files checked and ready.') : order.contentReviewPassed ? translateUi('Game content check passed · Both PDF files checked and ready.') : translateUi('Both PDF files are ready. This edition predates the current full-game content check.')}</p>}
    {progress && approved && (!ready || originalProgress) && <div className="order-game-progress" aria-label={translateUi(originalProgress ? translateUi('Original version progress') : translateUi('Game creation progress'))}>
      <strong>{order.status === 'failed' ? translateUi("Stopped while {value0}", { value0: progressLabel.toLowerCase() }) : translateUi(progressLabel)}</strong>
      <div className="order-game-progress-track" role="progressbar" aria-valuenow={progressValue} aria-valuemin="0" aria-valuemax={progressTotal} aria-label={translateUi(originalProgress ? translateUi('Original version steps completed') : translateUi('Game creation steps completed'))}><span style={{ width: `${Math.round(progressValue / progressTotal * 100)}%` }} /></div>
      <p>{progress.blueprintReady ? translateUi('Blueprint saved') : translateUi('Blueprint pending')} · {translateUi(progress.completedStages.length)}{translateUi(" of 5 checkpoints saved \xB7 ")}{progress.auditPassed ? order.deliveryCheckKind === 'puzzle_and_pdf' ? translateUi('Puzzles checked') : translateUi('Game check passed') : translateUi('Game check pending')} · {ready ? translateUi('PDFs ready') : translateUi('PDFs pending')}</p>
      {detailed && <p role="status">{translateUi(stepState)} {progress.stepState !== 'complete' && currentStep ? translateUi("{value0}. ", { value0: currentStep }) : translateUi('')}{progress.lastSavedAt ? translateUi("Last saved: {value0}.", { value0: new Date(progress.lastSavedAt.replace(' ', 'T') + 'Z').toLocaleString() }) : translateUi('No step has been saved yet.')}</p>}
      {order.status === 'failed' && <p>{translateUi("Completed steps are saved on this paid order. The history below shows what stopped; support can review this order without another purchase.")}</p>}
    </div>}
    {progress?.deliveryEdition === 'baseline' && <p className="live-note">{ready ? translateUi('Your paper mission briefing is ready.') : translateUi('Preparing your paper mission briefing.')}{translateUi(" It keeps your approved story and uses the five checked paper puzzles. The adult guide explains how to narrate the outcome.")}</p>}
    {!ready && <div className="order-package-files" aria-label={translateUi("Files in your package")}>
      <div><strong>{translateUi("Player Pack")}</strong><span>{translateUi("Children\u2019s activities \xB7 PDF")}</span><small>{ready ? translateUi('Ready') : translateUi('Not ready')}</small></div>
      <div><strong>{translateUi(guide)}</strong><span>{translateUi("Adult instructions and answers \xB7 PDF")}</span><small>{ready ? translateUi('Ready') : translateUi('Not ready')}</small></div>
      <div><strong>{translateUi("Complete game")}</strong><span>{translateUi("Both PDFs together \xB7 ZIP")}</span><small>{ready ? translateUi('Ready') : translateUi('Not ready')}</small></div>
    </div>}
     {ready && (originalProgress ? <details className="order-earlier-downloads"><summary>{translateUi("Download existing PDFs while the replacement is pending")}</summary><div id="download-game" className="order-package-downloads">
       <p className="live-note">{translateUi("These files belong to the original version.")}</p>
       <CompletePackDownload escapeGame={['seventh-carriage', 'midnight-masquerade', 'thirteenth-hour', 'last-letter', 'fold-city'].includes(order.themeId) ? order.themeId : false} orderId={orderId} kind={order.kind} version={order.downloadVersion} paper={paper} setting={order.sku.includes('classroom') ? 'classroom' : 'home'} label={translateUi("Download original game · ZIP")} />
       <div className="live-downloads">{['player', 'guide'].map((role) => <a key={role} href={localHref('/api/v1/files/' + orderId + '/' + role + '?paper=' + paper + (order.downloadVersion ? '&version=' + order.downloadVersion : ''))}>{role === 'player' ? translateUi('Original Player Pack') : translateUi("Original {value0}", { value0: guide })} <DownloadSimple size={17} /></a>)}</div>
     </div></details> : <div id="download-game" className="order-package-downloads">
      {order.kind === 'ready' ? <label className="order-paper-choice">{translateUi("Paper size")}<select aria-label={translateUi("Paper size")} value={selectedPaper} onChange={(event) => setSelectedPaper(event.target.value)}><option value="A4">A4</option><option value="Letter">{translateUi("US Letter")}</option></select></label> : <p className="live-note">{translateUi("Paper size: ")}{paper === 'Letter' ? translateUi('US Letter') : translateUi(paper)}</p>}
      <MidnightIndividualFiles themeId={order.themeId} orderId={orderId} paper={paper} />
      {['seventh-carriage', 'midnight-masquerade', 'thirteenth-hour', 'last-letter', 'fold-city'].includes(order.themeId) && <p><a className="button" href={localHref('/api/v1/orders/' + orderId + '/escape/companion')}>{translateUi("Open your browser companion \u2192")}</a></p>}
      <CompletePackDownload escapeGame={['seventh-carriage', 'midnight-masquerade', 'thirteenth-hour', 'last-letter', 'fold-city'].includes(order.themeId) ? order.themeId : false} orderId={orderId} kind={order.kind} version={order.downloadVersion} paper={paper} setting={order.sku.includes('classroom') ? 'classroom' : 'home'} />
      <div className="live-downloads">{['player', 'guide'].map((role) => <a key={role} href={localHref('/api/v1/files/' + orderId + '/' + role + '?paper=' + paper + (order.downloadVersion ? '&version=' + order.downloadVersion : ''))}>{role === 'player' ? translateUi('Player Pack') : translateUi(guide)} <DownloadSimple size={17} /></a>)}</div>
     </div>)}
  </section>;
}

export function PackRemake({ order, refresh }) {
  const [busy, setBusy] = useState(false),[error, setError] = useState('');
  const remake = order.remake;
  if (order.kind !== 'custom' || !order.paidAt || !order.filesReady || (order.gamePackVersion || 1) >= 2 && !order.qualityUpgradeAvailable && !order.themePlanRepairAvailable && !order.planReview?.qualityReplanUsed && !order.planReview?.themeReplanFailed && !remake) return null;
  const active = remake && ['queued', 'generating'].includes(remake.status);
  const waiting = remake?.status === 'queued';
  const done = remake?.status === 'ready';
  const failed = remake?.status === 'failed';
  const copyTitle = remake?.copyResumeAvailable ? 'Saved wording is ready for its remaining review' : remake?.copyCheck?.phase === 'format' ? 'Saved wording stopped at the format check' : remake?.copyCheck?.code === 'DELIVERY_COPY_AUDIT_PROTOCOL' ? 'The review response could not be verified' : remake?.copyCheck?.phase === 'render' ? 'Saved wording stopped at the PDF layout check' : null;
  const failedTitle = copyTitle || (remake?.layoutRecoveryAvailable ? 'The PDF refresh stopped before rendering' : remake?.phase === 'blueprint' ? 'New pack stopped at the blueprint check' : remake?.phase === 'repair' ? translateUi("New pack stopped while repairing checkpoint {value0}", { value0: remake.problemStage || 'materials' }) : remake?.phase === 'checkpoint' ? translateUi("New pack stopped at checkpoint {value0}", { value0: remake.problemStage || remake.currentStage || '' }) : remake?.phase === 'audit' ? 'New pack stopped at the game review' : 'New pack stopped at PDF delivery');
  const blueprintDone = remake?.blueprintStepsCompleted ?? (remake?.blueprintReady ? 1 : 0);
  const blueprintTotal = remake?.blueprintStepTotal ?? 1;
  const completed = remake?.savedSteps ?? blueprintDone + (remake?.completedStages?.length || 0) + (remake?.storyReady ? 1 : 0) + (done ? 1 : 0);
  const total = remake?.totalSteps ?? blueprintTotal + 7;
  const step = remake?.phase === 'repair' ? translateUi("Repairing checkpoint {value0}", { value0: remake.problemStage || 'materials' }) : !remake?.blueprintReady ? translateUi("Preparing the game blueprint ({value0} of {value1} parts saved)", { value0: blueprintDone, value1: blueprintTotal }) : remake.completedStages.length < 5 ? translateUi("Creating and checking checkpoint {value0} of 5", { value0: remake.currentStage }) : !remake.storyReady ? 'Checking the complete game' : 'Building and checking both PDFs';
  async function start(retry = false) {
    setBusy(true);setError('');
    const consent = retry && remake?.copyCheck?.factRepairAvailable ? { action: 'complete_saved_facts', allowOneExtraReview: true } : null;
    try {await api(`/api/v1/orders/${order.id}/pack-remake${retry ? '/retry' : ''}`, { method: 'POST', ...(consent ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(consent) } : {}) });await refresh();}
    catch (failure) {setError(failure.message);} finally {setBusy(false);}
  }
  const themePlanStage = order.planReview?.qualityReplanUsed && order.planReview.status !== 'confirmed';
  const themePlanNeedsHelp = order.planReview?.themeReplanFailed && !order.themePlanRepairAvailable;
  if (themePlanNeedsHelp || (order.themePlanRepairAvailable || themePlanStage) && (!remake || remake.status === 'ready')) {
    async function repairThemePlan() {
      setBusy(true);setError('');
      try {await api(`/api/v1/orders/${order.id}/plan`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(order.planReview?.formatResumeAvailable ? { action: 'resume_saved_plan', version: order.planReview.activeVersion } : { action: 'quality_replan' }) });await refresh();}
      catch (failure) {setError(failure.message);} finally {setBusy(false);}
    }
    return <section id="order-remake" className="order-pack-remake" aria-labelledby="order-remake-title">
      <span className="eyebrow">{translateUi("IMPROVED GAME PACK")}</span>
      <h2 id="order-remake-title">{order.themePlanRecoveryAvailable ? translateUi('Your plan recovery is ready') : themePlanStage ? order.planReview.status === 'review' ? translateUi('Review your corrected story plan') : translateUi('Preparing your corrected story plan') : themePlanNeedsHelp ? translateUi('Story plan correction stopped') : order.planReview?.themeReplanFailed ? translateUi('Story plan needs review') : translateUi('First, review the story theme')}</h2>
      <p>{themePlanStage ? translateUi('Your replacement starts with a theme-faithful plan. After it passes review, you approve it before the five checkpoints and PDFs are built.') : themePlanNeedsHelp ? order.planReview?.formatResumeAvailable ? translateUi('The plan correction stopped at a format check. Continue the saved work below before approving replacement PDFs.') : translateUi('The plan correction stopped. No replacement PDFs were created. The original version remains downloadable below; use the order help section for review.') : order.planReview?.themeReplanFailed ? translateUi('The last plan correction stopped. Any saved draft stays on this order for review. A further attempt is available only within this order\'s existing allowance.') : translateUi('Review a corrected story plan before rebuilding the game on this paid order.')}</p>
      <OrderUpdateProgress order={order} />
      {order.planReview?.formatResumeAvailable && <><p>{translateUi("Your failed draft is saved. Continue its plan check before approving any replacement PDFs. Your original files stay available.")}</p><button type="button" className="button" onClick={repairThemePlan} disabled={busy}>{busy ? translateUi('Continuing…') : translateUi('Update game pack at no charge')} <ArrowRight size={17} /></button></>}
      {order.themePlanRecoveryAvailable && <p>{translateUi("One recovery attempt is available using the updated theme checks. Start it below, then review and approve the corrected plan before replacement PDFs are created. Your original files remain available.")}</p>}
      {order.themePlanRepairAvailable && !order.planReview?.formatResumeAvailable && <button type="button" className="button" onClick={repairThemePlan} disabled={busy}>{busy ? translateUi('Starting…') : translateUi('Update game pack at no charge')} <ArrowRight size={17} /></button>}
      {error && <Alert>{translateUi(error)}</Alert>}
    </section>;
  }
  return <section id="order-remake" className="order-pack-remake" aria-labelledby="order-remake-title">
    <span className="eyebrow">{translateUi("IMPROVED GAME PACK")}</span>
    <OrderUpdateProgress order={order} />
    <h2 id="order-remake-title">{done ? order.qualityUpgradeAvailable ? translateUi('A stronger quality version is available') : translateUi('Your new game pack is ready') : failed ? translateUi(failedTitle) : active ? waiting ? translateUi('New pack is waiting for its next step') : translateUi('Your new pack is being made') : translateUi('Remake this pack on your paid order')}</h2>
    {done ? <><p>{translateUi("Your current Player Pack and adult guide are ready in the download section. ")}{order.qualityUpgradeAvailable ? translateUi('You can rebuild this game with stronger story, printed-clue and guide checks on this same paid order. Current files stay available until both replacement PDFs pass every check.') : translateUi('The game, PDF and storage checks passed. There is no new charge.')}</p>{order.qualityUpgradeAvailable && <button type="button" className="button" onClick={() => start()} disabled={busy}>{busy ? translateUi('Starting…') : translateUi('Update game pack at no charge')} <ArrowRight size={17} /></button>}<div className="order-remake-original"><strong>{translateUi("Earlier version")}</strong><p>{translateUi("Your original PDFs are still available if you want to compare them.")}</p><a href={localHref(`/api/v1/files/${order.id}/player?paper=${order.paper}&version=1`)}>{translateUi("Download original Player Pack ")}<DownloadSimple size={16} /></a><a href={localHref(`/api/v1/files/${order.id}/guide?paper=${order.paper}&version=1`)}>{translateUi("Download original adult guide ")}<DownloadSimple size={16} /></a></div></> : failed ? <><p role="status">{translateUi(remake.failureReason)}{translateUi(" Your current PDFs are still available in the download section below. No new pack was delivered and there is no new charge.")}</p><p className="order-remake-count">{translateUi("Story setup ")}{translateUi(blueprintDone)}{translateUi(" of ")}{translateUi(blueprintTotal)}{translateUi(" parts saved \xB7 ")}{translateUi(remake.completedStages.length)}{translateUi(" of 5 checkpoints saved \xB7 New PDFs not published")}</p>{remake.upgradeAvailable && <p>{translateUi("The earlier generator could not complete this pack under the current delivery standard. The new rebuild checks complete sentences, exact printed names, playable clues and balanced guide pages on this same paid order. Your current PDFs remain available until the replacement passes.")}</p>}{remake.recoveryAvailable ? <button type="button" className="button" onClick={() => start(true)} disabled={busy}>{busy ? translateUi('Continuing…') : remake.copyCheck?.factRepairAvailable ? translateUi('Complete saved facts and review at no charge') : remake.copyResumeAvailable ? translateUi('Continue saved game check at no charge') : translateUi('Update game pack at no charge')} <ArrowRight size={17} /></button> : <p>{translateUi("Please use the order help section below for a review. Your saved work and current files remain on this order.")}</p>}</> : active ? <><p role="status">{waiting ? translateUi('The next generation step is queued.') : translateUi('This step is being built and checked.')} {translateUi(step)}{translateUi(". Completed work is saved after each step. You may leave this page and return later; your current PDFs remain downloadable below.")}</p><div className="order-game-progress-track" role="progressbar" aria-valuenow={completed} aria-valuemin="0" aria-valuemax={total} aria-label={translateUi("Completed new game pack steps")}><span style={{ width: `${Math.round(completed / total * 100)}%` }} /></div><p className="order-remake-count">{translateUi(completed)}{translateUi(" of ")}{translateUi(total)}{translateUi(" delivery steps saved \xB7 Story setup ")}{translateUi(blueprintDone)}{translateUi(" of ")}{translateUi(blueprintTotal)} · {translateUi(remake.completedStages.length)}{translateUi(" of 5 checkpoints saved \xB7 New PDFs pending.")}</p><p className="live-note">{translateUi("The progress bar updates whenever a story part, checkpoint, review or PDF package is saved. Last saved update: ")}{remake.updatedAt ? translateUi(new Date(remake.updatedAt.replace(' ', 'T') + 'Z').toLocaleString()) : translateUi('pending')}.</p><button type="button" className="button-quiet" onClick={refresh}>{translateUi("Refresh new-pack status")}</button><p className="live-note">{translateUi("Status also refreshes automatically about every 5 seconds while this tab is open.")}</p></> : <><p>{order.qualityUpgradeAvailable ? translateUi('This pack was made before our stronger game and guide checks were introduced. You can rebuild all five checkpoints using your approved plan and the current quality rules.') : translateUi('Your earlier pack uses the text-focused format. We can use your approved story and plan to create a new pack with printable activities for all five checkpoints.')}{translateUi(" This stays on order ")}{translateUi(order.id.slice(0, 8).toUpperCase())}{translateUi(" and does not require payment.")}</p><p>{translateUi("Your current Player Pack and guide stay available below while the new version is generated. The download buttons switch to the new files only after the whole game and both PDFs pass checks.")}</p><button type="button" className="button" onClick={() => start()} disabled={busy}>{busy ? translateUi('Starting…') : translateUi('Update game pack at no charge')} <ArrowRight size={17} /></button></>}
    {error && <Alert>{translateUi(error)}</Alert>}
  </section>;
}

function PdfGenerationHistory({ order }) {
  const attempts = order.pdfGenerationHistory || [];
  if (order.kind !== 'custom' || !order.planReview?.confirmedVersion && attempts.length === 0) return null;
  const rounds = [...new Set(attempts.map((item) => item.round))];
  return <section className="order-generation-history" aria-labelledby="order-history-title">
    <span className="eyebrow">{translateUi("PDF PROGRESS")}</span><h2 id="order-history-title">{translateUi("Generation history")}</h2>
    <p>{attempts.length ? translateUi('A round can contain an automatic retry. These are delivery attempts after plan approval, not plan edits.') : order.generationProgress && !order.generationProgress.storyReady ? translateUi('The game blueprint and checkpoints are being saved first. PDF creation begins after the complete game passes its check.') : translateUi('Your approved plan is saved. The first PDF attempt has not been recorded yet.')}</p>
    {rounds.map((round) => <div className="order-generation-round" key={round}>
      <h3>{round === 1 ? translateUi('First PDF build') : translateUi('Included delivery retry')}</h3>
      <ol>{translateUi(attempts.filter((item) => item.round === round).map((item) => {
          const status = item.status === 'published' ? 'Completed' : item.status === 'generating' ? 'In progress' : item.status === 'interrupted' ? 'Interrupted' : 'Failed';
          const phase = item.phase && pdfPhaseText[item.phase];
          const detail = item.status === 'published' ? 'Both PDFs were published.' : item.status === 'generating' ? translateUi("Currently {value0}.", { value0: phase || 'creating your PDFs' }) : !item.detailsRecorded ? 'This earlier attempt stopped; a detailed reason was not saved.' : translateUi("Stopped while {value0}. {value1}", { value0: phase || 'creating your PDFs', value1: item.failureReason || 'The exact cause is not available in this record.' });
          const date = item.recordedAt ? new Date(item.recordedAt.replace(' ', 'T') + 'Z') : null;
          return <li key={item.attempt}><div><strong>{item.trigger === 'automatic_retry' ? translateUi('Automatic retry') : item.trigger === 'customer_retry' ? translateUi('Your free retry') : translateUi('Initial attempt')}</strong><span className={'order-attempt-state state-' + item.status}>{translateUi(status)}</span></div><p>{translateUi(detail)}</p>{date && !Number.isNaN(date.getTime()) && <time dateTime={date.toISOString()}>{translateUi(date.toLocaleString())}</time>}</li>;
        }))}</ol>
    </div>)}
    {order.status === 'failed' && <p className="order-history-conclusion">{translateUi("No attempt has produced a downloadable package for this order.")}</p>}
  </section>;
}

export function ReadyOrderDelivery({ order, Link, selectedPaper, setSelectedPaper, helpRequest, api: orderApi = api }) {
  const classroom = order.sku.endsWith('_classroom');
  const title = order.title || 'Your ready-made adventure';
  const expires = order.accessExpiresAt ? new Date(order.accessExpiresAt.replace(' ', 'T') + 'Z').toLocaleDateString(uiLocale() === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : null;
  return <main className="extended-page live-page order-page delivered-game-page">
    <div className="order-workspace">
      <Link className="order-back" to={localHref("/en/my-adventures/")}>{translateUi("\u2190 My adventures")}</Link>
      <header className="delivered-heading">
        <p className="delivered-success"><CheckCircle size={21} weight="fill" aria-hidden="true" />{translateUi("Payment confirmed \xB7 Files ready")}</p>
        <h1>{translateUi(title)}</h1><p>{classroom ? translateUi('Classroom') : translateUi('Home')}{translateUi(" edition \xB7 Ready-made adventure")}</p>
      </header>
      <div className="delivered-game-card">
        <div className="delivered-cover"><AdventureCover order={{ product_kind: 'ready', image: order.image }} /><div><span className="eyebrow">{translateUi("YOUR NEXT ADVENTURE")}</span><p>{translateUi("Print, prepare, and bring the story to life.")}</p></div></div>
        <OrderPackage order={order} orderId={order.id} selectedPaper={selectedPaper} setSelectedPaper={setSelectedPaper} />
      </div>
      <dl className="delivered-receipt" aria-label={translateUi("Order details")}>
        <div><dt>{translateUi("Order reference")}</dt><dd>{translateUi(order.id.slice(0, 8).toUpperCase())}</dd></div>
        <div><dt>{translateUi("Total paid")}</dt><dd>{translateUi(formatUsd(order.amountTotal))}</dd></div>
        <div><dt>{expires ? translateUi('Online downloads until') : translateUi('Edition')}</dt><dd>{expires || translateUi("{value0} edition", { value0: classroom ? 'Classroom' : 'Home' })}</dd></div>
      </dl>
      <nav className="delivered-start-links" aria-label={translateUi("Prepare your game")}><Link to={localHref("/en/help/print/")}><Printer size={20} aria-hidden="true" /><span>{translateUi("Printing guide")}</span><ArrowRight size={17} aria-hidden="true" /></Link><Link to={localHref("/en/help/start/")}><Books size={20} aria-hidden="true" /><span>{translateUi("How to set up and play")}</span><ArrowRight size={17} aria-hidden="true" /></Link></nav>
      <OrderSupport compact api={orderApi} canRefund={Boolean(order.paidAt)} orderId={order.id} initialRequest={helpRequest} />
    </div>
  </main>;
}

export function LiveOrder({ Link, orderId }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [selectedPaper, setSelectedPaper] = useState('A4');
  const [helpRequest, setHelpRequest] = useState(() => {const support = libraryIntent(typeof window === 'undefined' ? '' : window.location.search).support;return support ? { kind: support === 'refund' ? 'refund' : 'other', description: '' } : null;});
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
        setRefreshNotice(remakeActive ?
        'Status updated. Your new pack is still being prepared.' :
        remakeStopped ?
        'Status updated. The new pack still needs attention; your current files remain available.' :
        data.filesReady ?
        'Status updated. Your latest available files are ready below.' :
        'Status updated. No downloadable files are available yet.');
      }
    } catch (failure) {
      setError(failure.message);
      if (announce) setRefreshNotice('');
    } finally {
      refreshLock.current = false;
      if (announce) setRefreshing(false);
    }
  };
  const openHelp = (kind, description) => {
    setHelpRequest({ kind, description });
    requestAnimationFrame(() => {const section = document.getElementById('order-help');if (section) {section.open = true;section.scrollIntoView({ behavior: 'smooth', block: 'start' });}});
  };
  useEffect(() => {setOrder(null);setError('');setRefreshNotice('');refresh();}, [orderId]);
  useEffect(() => {
    const awaitingApproval = order?.kind === 'custom' && order.planReview?.status === 'review' && !order.planReview.pending;
    if (!order || awaitingApproval || !['pending_payment', 'paid', 'fulfilling'].includes(order.status) && !['queued', 'generating'].includes(order.remake?.status) && !['queued', 'generating'].includes(order.planReview?.status)) return;
    const update = () => {if (document.visibilityState === 'visible') refresh();};
    const timer = setInterval(update, 5000);
    document.addEventListener('visibilitychange', update);
    return () => {clearInterval(timer);document.removeEventListener('visibilitychange', update);};
  }, [orderId, order?.status, order?.remake?.status, order?.planReview?.status, order?.planReview?.pending, order?.planReview?.confirmedVersion]);

  if (error) return <main className="extended-page live-page order-page"><div className="order-workspace"><Alert>{translateUi(error)}</Alert><button className="button" type="button" onClick={() => refresh({ announce: true })} disabled={refreshing}>{refreshing ? translateUi('Checking order…') : translateUi('Retry order status')} {refreshing ? <ArrowClockwise className="is-spinning" size={18} /> : <ArrowRight size={18} />}</button><p><Link to={localHref("/en/account/")}>{translateUi("Sign in with Google")}</Link>{translateUi(" if your session has expired.")}</p></div></main>;
  if (!order) return <main className="extended-page live-page order-page"><div className="order-workspace" role="status">{translateUi("Checking your order\u2026")}</div></main>;

  if (order.kind === 'ready' && order.paidAt && order.filesReady && order.status === 'published') return <ReadyOrderDelivery order={order} Link={Link} selectedPaper={selectedPaper} setSelectedPaper={setSelectedPaper} helpRequest={helpRequest} />;

  const title = order.title || order.plan?.title || (order.kind === 'ready' ? 'Your ready-made adventure' : 'Your custom adventure');
  const paid = Boolean(order.paidAt);
  const approved = Boolean(order.planReview?.confirmedVersion);
  const correctingTheme = themeUpdatePending(order);
  const directRecovery = orderNextStep(order).href === '#delivery-recovery' && order.kind === 'custom' && paid && order.deliveryRetryAvailable;
  const optionalUpgrade = order.kind === 'custom' && order.filesReady && !correctingTheme && (!order.remake || order.remake.status === 'ready') && (order.gamePackVersion || 1) < 2 && !order.qualityUpgradeAvailable;
  return <main className="extended-page live-page order-page">
    <div className="order-workspace">
      <Link className="order-back" to={localHref("/en/my-adventures/")}>{translateUi("\u2190 My adventures")}</Link>
      <header className="order-heading">
        <div><span className="eyebrow">{translateUi("YOUR ADVENTURE ORDER")}</span><h1>{translateUi(title)}</h1><p>{translateUi("Order ")}{translateUi(order.id.slice(0, 8).toUpperCase())} · {order.kind === 'ready' ? translateUi('Ready-made') : order.sku.includes('classroom') ? translateUi('Custom Classroom') : translateUi('Custom Home')}</p></div>
        <span className={'order-current-status status-' + order.status}>{order.filesReady && (correctingTheme || order.remake && order.remake.status !== 'ready') ? translateUi('Original files ready') : orderLabel[order.status] || translateUi(order.status)}</span>
      </header>
      <OrderNextStep order={order} />
      {directRecovery && <div id="delivery-recovery"><DeliveryRecovery order={order} refresh={refresh} /></div>}
      <div className="order-layout">
        <div className="order-main">
          {!optionalUpgrade && <PackRemake order={order} refresh={refresh} />}
          <OrderPackage order={order} orderId={orderId} selectedPaper={selectedPaper} setSelectedPaper={setSelectedPaper} />
          {optionalUpgrade && <details className="order-optional-upgrade"><summary>{translateUi("Optional no-charge quality upgrade")}</summary><PackRemake order={order} refresh={refresh} /></details>}
          <OrderQualityActions order={order} onHelp={openHelp} />
          <PostDeliveryEditor order={order} refresh={refresh} api={api} legacy={<RevisionForm order={order} refresh={refresh} />} />
          <PdfGenerationHistory order={order} />
          {order.planReview && (approved && !(order.planReview.qualityReplanUsed && order.planReview.status !== 'confirmed') ? <details className="order-approved-plan"><summary>{order.downloadVersion > 1 ? translateUi('View the original approved plan') : translateUi('View your approved five-checkpoint plan')}</summary><PaidPlanReview order={order} refresh={refresh} /></details> : <PaidPlanReview order={order} refresh={refresh} />)}
          {!order.planReview && order.plan && <details className="order-plan-review"><summary>{translateUi("Review the story and five-checkpoint plan")}</summary><PlanPreview plan={order.plan} /></details>}
        </div>
        <aside className="order-sidebar" aria-label={translateUi("Order details")}>
          <h2>{translateUi("Order details")}</h2>{order.paidAt && order.status !== 'refunded' && <button type="button" className="button order-refund-entry" onClick={() => setHelpRequest({ kind: 'refund', description: '', at: Date.now() })}>{translateUi("Request a refund")}</button>}
          <dl><div><dt>{translateUi("Payment")}</dt><dd>{paid ? translateUi('Confirmed') : translateUi('Not confirmed')}</dd></div><div><dt>{translateUi("Total")}</dt><dd>{translateUi(formatUsd(order.amountTotal))} · {translateUi(order.currency)}</dd></div><div><dt>{translateUi("Paper")}</dt><dd>{order.paper === 'Letter' ? translateUi('US Letter') : order.paper || translateUi('Choose on download')}</dd></div>{order.kind === 'custom' && <div><dt>{translateUi("Plan")}</dt><dd>{approved ? order.downloadVersion > 1 ? translateUi("Accepted game version {value0}", { value0: order.downloadVersion }) : translateUi("Version {value0} approved", { value0: order.planReview.confirmedVersion }) : translateUi('Awaiting approval')}</dd></div>}<div><dt>{translateUi("Files")}</dt><dd>{order.filesReady ? correctingTheme ? order.planReview?.themeReplanFailed ? translateUi('Original ready · correction stopped') : translateUi('Original ready · correction pending') : order.remake && order.remake.status !== 'ready' ? translateUi('Original ready · new pending') : translateUi('Ready') : translateUi('Not available yet')}</dd></div></dl>
          {order.filesReady && order.accessExpiresAt && <p>{translateUi("Online re-download until ")}{translateUi(new Date(order.accessExpiresAt.replace(' ', 'T') + 'Z').toLocaleDateString())}.</p>}
          {order.kind === 'custom' && paid && <p>{translateUi("Before approval, edit the story direction. After delivery, preview checkpoint changes or a whole-game candidate before accepting new PDFs.")}</p>}
          <div className="order-status-action"><strong>{translateUi("Order status")}</strong><p>{translateUi("Progress refreshes automatically while this page is open. You can also check it now.")}</p><button type="button" className="button-quiet" onClick={() => refresh({ announce: true })} disabled={refreshing}>{refreshing ? translateUi('Checking status…') : translateUi('Refresh status')} <ArrowClockwise className={refreshing ? 'is-spinning' : ''} size={18} /></button>{refreshNotice && <p className="order-refresh-notice" role="status">{translateUi(refreshNotice)}</p>}</div>
        </aside>
      </div>
       <section id={directRecovery ? undefined : 'delivery-recovery'} className="order-help-footer" aria-label={translateUi("Help with this order")}>
        {!directRecovery && <DeliveryRecovery order={order} refresh={refresh} />}
        <OrderSupport api={api} canRefund={paid} refunded={order.status === 'refunded'} orderId={orderId} failedDelivery={order.kind === 'custom' && order.status === 'failed' && paid} initialRequest={helpRequest} />
        {order.status !== 'failed' && <p className="live-note">{translateUi("If a file is missing or incorrect, use the help form. A system correction does not use a paid revision.")}</p>}
      </section>
    </div>
  </main>;
}

export function LiveSamples(props) {return <FreeDownload {...props} />;}

export function LiveLegal({ kind }) {
  const [document, setDocument] = useState(null);const [error, setError] = useState('');
  useEffect(() => {let active = true;setDocument(null);setError('');api(`/api/v1/legal/${kind}`).then((value) => {if (active) setDocument(value);}).catch((failure) => {if (active) setError(failure.message);});return () => {active = false;};}, [kind]);
  if (document) return <PolicyDocument kind={kind} document={document} />;
  return <main className="extended-page live-page"><Intro eyebrow="LEGAL INFORMATION" title={translateUi("Policy")}><p role="status">{translateUi("Loading the current policy\u2026")}</p></Intro><section className="live-shell">{error && <Alert>{translateUi(error)}</Alert>}</section></main>;
}

export function LivePricing({ Link, catalog, checkoutMode }) {
  const ready = catalog.offers.filter((offer) => offer.kind === 'ready');
  const custom = catalog.offers.filter((offer) => offer.kind === 'custom');
  const celebration = catalog.themes.find((theme) => theme.id === 'celebration');
  const sampleReady = celebration?.home.freeSample && celebration?.classroom.freeSample;
  return <main className="extended-page live-page"><Intro eyebrow="PRICING & RIGHTS" title={translateUi("Choose a finished game or make a new one.")}><p>{checkoutMode === 'test' ? translateUi('Stripe test checkout is open after adult Google sign-in. Test cards move no real money; these USD prices are for flow testing.') : translateUi('One-time prices in US dollars. Pay the listed price once.')}</p></Intro><section className="live-shell"><div className="live-price-grid"><div className="live-panel"><span className="eyebrow">{translateUi("READY-MADE")}</span><h2>{translateUi("Buy a fixed theme")}</h2><p>{translateUi("A fixed theme includes a Player Pack and adult guide for download after confirmed payment. No AI edits are included.")}</p>{ready.map((offer) => <p key={offer.sku}><strong>{offer.setting === 'home' ? translateUi('Home') : translateUi('Classroom')}: {translateUi(formatUsd(offer.unitAmount))}</strong>{translateUi(" per published pack")}</p>)}<Link className="button" to={localHref("/en/themes/")}>{checkoutMode === 'test' ? translateUi('Explore test packs') : translateUi('Explore published themes')} <ArrowRight size={18} /></Link></div><div className="live-panel"><span className="eyebrow">{translateUi("CUSTOM-MADE")}</span><h2>{translateUi("Generate a new activity")}</h2><p>{translateUi("Choose a featured world or your own idea. One personal plan follows confirmed payment; after approval, five paper challenges, their material sheets and a matching adult guide are generated and checked.")}</p>{custom.map((offer) => <p key={offer.sku}><strong>{offer.setting === 'home' ? translateUi('Home') : translateUi('Classroom')}: {translateUi(formatUsd(offer.unitAmount))}</strong>{translateUi(" per new activity")}</p>)}<p>{translateUi("Two successful plan reworks and three targeted edits are included before approval. After delivery, three successful checkpoint changes and two successful whole-game remakes are separate, within 30 days of first delivery. Preview attempts are capped at six checkpoint suggestions and four whole-game candidates; failed or discarded candidates do not use a successful replacement.")}</p><Link className="button" to={localHref("/en/create/")}>{translateUi("Start custom setup ")}<ArrowRight size={18} /></Link></div></div><div className="live-panel live-price-note"><h2>{translateUi("Free fixed sample")}</h2><p>{sampleReady ? translateUi('Celebration Home and Classroom are both available as free fixed trial packs; neither includes custom generation.') : translateUi('A complete free sample is planned but not yet published.')}</p>{sampleReady && <><Link className="text-link" to={localHref("/en/samples/home/")}>{translateUi("Download Home trial ")}<ArrowRight size={18} /></Link> <Link className="text-link" to={localHref("/en/samples/classroom/")}>{translateUi("Download Classroom trial ")}<ArrowRight size={18} /></Link></>}<p>{translateUi("No subscription, points or automatic renewal. ")}{translateUi(productRights.home)} {translateUi(productRights.classroom)}{translateUi(" Online re-download lasts ")}{translateUi(productRights.onlineRedownloadMonths)}{translateUi(" months from confirmed payment for a fixed pack or first qualified delivery for a custom pack. Lawfully downloaded files remain usable within that scope. Review the refund terms before payment.")}</p></div></section></main>;
}

export function LiveCheckout({ Link, catalog, checkoutMode }) {
  const params = new URLSearchParams(window.location.search);
  const ready = params.get('kind') === 'ready';
  const draft = (() => {try {return JSON.parse(localStorage.getItem('paw-draft') || '{}');} catch {return {};}})();
  const setting = ready ? params.get('setting') : draft.setting;
  const sku = `${ready ? 'ready' : 'custom'}_${setting}`;
  const offer = catalog?.offers.find((item) => item.sku === sku);
  const themeId = params.get('theme') || '';
  const theme = [...(catalog?.themes || []), ...(catalog?.escapeGames || [])].find((item) => item.id === themeId);
  const variantIds = ready && setting === 'classroom' ? theme?.classroom?.variantIds || [] : [];
  const [variantId, setVariantId] = useState('');
  const documentEditions=ready&&paidDocumentGame(themeId,setting)?theme?.[setting]?.documentEditions||[]:[];
  const [documentLocale,setDocumentLocale]=useState(uiLocale()==='zh'?'zh':'en');
  const selectedDocument=documentEditions.find(e=>e.locale===documentLocale)||documentEditions.find(e=>e.locale==='en');
  const [supplyRequested, setSupplyRequested] = useState(false);
  const [email, setEmail] = useState('');const [busy, setBusy] = useState(false);const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(null);
  const [accountEmail, setAccountEmail] = useState('');
  useEffect(() => {let active = true;api('/api/v1/auth/session').then((session) => {if (active) {setAuthenticated(Boolean(session.authenticated));setAccountEmail(session.email || '');}}).catch(() => {if (active) setAuthenticated(false);});return () => {active = false;};}, []);
  const customDraftReady = Boolean(draft.creatorVersion === 3 && readySetup(draft));
  const eligible = Boolean(['home', 'classroom'].includes(setting) && offer?.saleEnabled && (ready ? ['published', 'test_ready'].includes(theme?.[setting]?.readyStatus) : customDraftReady));
  const accountRequired = checkoutMode === 'test' || !ready || theme?.series === 'escape';
  const needsSignIn = accountRequired && !authenticated;
  const signInPath = `/en/account/?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  async function start(event) {
    event.preventDefault();setBusy(true);setError('');
    if (!supplyRequested) {setError('Confirm the supply and refund notice before continuing.');setBusy(false);return;}
    const checkoutEmail = accountEmail || (accountRequired ? null : email);
    const body = ready ? { sku, themeId, packVersion: theme[setting].packVersion, variantId: variantId || null, email: checkoutEmail } : { ...draftSpec(draft), sku, email: checkoutEmail };
    if(selectedDocument&&(selectedDocument.locale==='zh'||readyEnglishRepairGame(themeId))){body.documentLocale=selectedDocument.locale;body.documentEdition=selectedDocument.version;}
    body.locale = window.location.pathname.startsWith('/zh/') ? 'zh' : 'en';
    body.serviceRequest = { version: purchaseConsentVersion, requested: true };
    try {
      const payload = JSON.stringify(body);
      const key = sessionStorage.getItem('paw-checkout-payload') === payload ? sessionStorage.getItem('paw-checkout-key') : crypto.randomUUID();
      sessionStorage.setItem('paw-checkout-key', key);
      sessionStorage.setItem('paw-checkout-payload', payload);
      const result = await api('/api/v1/checkout-intents', { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(body) });
      sessionStorage.removeItem('paw-checkout-key');
      sessionStorage.removeItem('paw-checkout-payload');
      window.location.assign(localHref(result.checkoutUrl));
    } catch (failure) {setError(failure.message);setBusy(false);}
  }
  const notice = purchaseNotice(ready ? 'ready' : 'custom');
  const noticeBreak = notice.indexOf('. ') + 1;
  const total = offer?.unitAmount;
  return <main className="extended-page live-page checkout-page">
    <Intro eyebrow="CHECKOUT" title={translateUi("Review your order.")}>{checkoutMode === 'test' && <p>{translateUi("TEST MODE \xB7 No real payment is taken.")}</p>}</Intro>
    <section className="live-shell"><div className="live-panel checkout-card">
      <header className="checkout-order-heading">
        <span className="eyebrow">{ready ? translateUi('READY-MADE GAME') : translateUi('AI CUSTOM GAME')} · {setting === 'classroom' ? translateUi('CLASSROOM') : translateUi('HOME')}</span>
        <h2>{ready ? theme?.title || translateUi('Unknown theme') : translateUi('Your custom adventure')}</h2>
        <p className="checkout-includes">{themeId === 'fold-city' ? translateUi('Four PDFs (10-page Player Pack + 12-page Adult Guide in A4 and US Letter), complete ZIP and offline companion; print 10 player sheets; cutting and glue required') : themeId === 'last-letter' ? translateUi('Four PDFs (20-page Player Pack + 8-page Adult Guide in A4 and US Letter), complete ZIP and offline companion; print 20 player sheets for all choices') : themeId === 'thirteenth-hour' ? translateUi('Player Pack + Adult Guide + offline companion; standard and no-cut modes') : themeId === 'midnight-masquerade' ? translateUi('Player Pack + 18 private cards + preparation map + Adult Guide + offline companion') : <>{translateUi("Player Pack + ")}{setting === 'classroom' ? translateUi('Teacher Guide') : translateUi('Host Guide')}</>}</p>
        <p className="checkout-delivery">{ready ? translateUi("Download after payment \xB7 Online access for {value0} months.", { value0: productRights.onlineRedownloadMonths }) : translateUi('Your plan starts after payment. Approve it before we create your PDFs.')}</p>
      </header>
      {documentEditions.some(e=>e.locale==='zh')&&<label>{uiLocale()==='zh'?'购买的 PDF 语言':'PDF language for this purchase'}<select value={selectedDocument?.locale||'en'} disabled={busy} onChange={e=>setDocumentLocale(e.target.value)}>{documentEditions.map(e=><option key={e.locale} value={e.locale}>{readyDocumentLabel(themeId,e.locale,e.version,uiLocale())}</option>)}</select><small>{uiLocale()==='zh'?'付款前确认资料语言；界面语言与 PDF 语言分别选择。':'Confirm the PDF language before paying. Interface language and PDF language are separate.'}</small></label>}
      {ready&&paidDocumentGame(themeId,setting)&&!documentEditions.some(e=>e.locale==='zh')&&<p role="status">{uiLocale()==='zh'?'当前仅开放英文PDF。中文界面不代表中文资料；购买前请确认语言。':'Only English PDFs are currently available for this game.'}</p>}
      {!ready && <details className="checkout-details"><summary>{translateUi("Included changes and downloads")}</summary><p>{translateUi("Online re-download lasts ")}{translateUi(productRights.onlineRedownloadMonths)}{translateUi(" months from first qualified delivery.")}</p><p>{translateUi("Before approval: two successful whole-plan reworks and three successful targeted edits. After delivery: three successful checkpoint changes and two successful whole-game remakes within 30 days of first delivery. Up to six checkpoint suggestions and four whole-game candidates can be prepared; failed or discarded candidates do not use a successful replacement. If no plan works, contact support for assistance or refund-policy review.")}</p></details>}
      {!ready && customDraftReady && <dl className="live-review"><div><dt>{translateUi("Story idea")}</dt><dd>{draft.idea}</dd></div><div><dt>{translateUi("Players")}</dt><dd>{translateUi(draft.players)}{translateUi(" \xB7 ages ")}{translateUi(draft.age)}</dd></div><div><dt>{translateUi("Paper and play")}</dt><dd>{translateUi(draft.paper)} · {translateUi(mechanicById(draft.gameplay?.primary)?.title)}</dd></div></dl>}
      {!eligible ? <Alert>{!ready && !customDraftReady ? translateUi('Finish your custom adventure setup before checkout.') : translateUi('This product is not available for checkout.')}</Alert> : needsSignIn ? authenticated === null ? <p role="status">{translateUi("Checking adult sign-in\u2026")}</p> : <div><Alert>{translateUi("Sign in with your adult Google account before checkout.")}</Alert><Link className="button" to={localHref(signInPath)}>{translateUi("Sign in with Google ")}<ArrowRight size={18} /></Link></div> : <form onSubmit={start}>
        {ready && variantIds.length > 0 && <label>{translateUi("Classroom story wording")}<select value={variantId} onChange={(event) => setVariantId(event.target.value)}><option value="">{themeId === 'halloween' ? translateUi('Autumn classroom') : translateUi('Winter classroom')}</option>{variantIds.map((id) => <option key={id} value={id}>{id === 'halloween' ? translateUi('Halloween classroom') : translateUi('Christmas classroom')}</option>)}</select></label>}
        {accountEmail ? <p className="checkout-account">{translateUi("Delivery to ")}<strong>{translateUi(accountEmail)}</strong></p> : accountRequired ? <p className="checkout-account">{translateUi("Saved to your signed-in account.")}</p> : <label>{translateUi("Email for your receipt and downloads")}<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>}
        <div className="checkout-total" aria-live="polite" aria-atomic="true">
          <div className="checkout-total-main"><span>{translateUi("Total to pay")}<small>{translateUi("One-time purchase")}</small></span><strong>{total === undefined ? translateUi('Unavailable') : translateUi(formatUsd(total))}</strong></div>
        </div>
        <div className="purchase-confirmation checkout-confirmation">
          <label><input type="checkbox" required checked={supplyRequested} aria-describedby="checkout-refund-notice" onChange={(event) => setSupplyRequested(event.target.checked)} /><span>{translateUi(notice.slice(0, noticeBreak))}</span></label>
          <p id="checkout-refund-notice" className="checkout-refund-notice">{translateUi(notice.slice(noticeBreak + 1))}</p>
          <p className="checkout-policy-links"><Link to={localHref("/en/terms/")}>{translateUi("Terms")}</Link><span aria-hidden="true"> · </span><Link to={localHref("/en/refunds/")}>{translateUi("Refund policy")}</Link></p>
        </div>
        <button className="button" disabled={busy || !supplyRequested}>{busy ? translateUi('Preparing checkout…') : checkoutMode === 'test' ? translateUi('Continue to Stripe test') : translateUi('Continue to Stripe')} <ArrowRight size={18} /></button>
        {error && <Alert>{translateUi(error)}</Alert>}
      </form>}
    </div></section>
  </main>;
}
