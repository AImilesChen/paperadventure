import { t as translateUi } from "./i18n/index.mjs";import { useEffect, useRef, useState } from 'react';

const labels = { clue: 'Clue or instructions', answer: 'Answer or hint', printing: 'Printing or layout', delivery: 'Missing delivery', refund: 'Refund request', other: 'Quality review or other' };
export default function OrderSupport({ orderId, failedDelivery = false, initialRequest = null, refunded = false, canRefund = true, compact = false, api }) {
  const [kind, setKind] = useState(failedDelivery ? 'delivery' : 'clue'),[description, setDescription] = useState(''),[reason, setReason] = useState('missing_delivery');
  const [open, setOpen] = useState(false),[busy, setBusy] = useState(false),[notice, setNotice] = useState(''),[error, setError] = useState(''),[cases, setCases] = useState([]);
  const requestKey = useRef(crypto.randomUUID()),form = useRef(null),textarea = useRef(null);
  const refresh = () => api(`/api/v1/orders/${orderId}/issues`).then((d) => setCases(d.cases));
  useEffect(() => {refresh().catch(() => {});}, [orderId]);
  useEffect(() => {if (initialRequest) {setKind(initialRequest.kind);setDescription(initialRequest.description || '');setOpen(true);}}, [initialRequest]);
  useEffect(() => {if (open) {form.current?.scrollIntoView({ block: 'nearest' });textarea.current?.focus({ preventScroll: true });}}, [open, initialRequest]);
  function begin(next) {if (!open) requestKey.current = crypto.randomUUID();setKind(next);setOpen(true);setError('');setNotice('');}
  async function submit(event) {
    event.preventDefault();if (busy) return;setBusy(true);setError('');
    try {
      const result = await api(`/api/v1/orders/${orderId}/issues`, { method: 'POST', body: JSON.stringify({ issueType: kind, description, requestKey: requestKey.current, ...(kind === 'refund' ? { refundReason: reason } : {}) }) });
      setNotice(translateUi("Request {value0} received. Support has been notified or queued for notification. You do not need to send a second email. We aim to reply within two business days.", { value0: result.caseId.slice(0, 8).toUpperCase() }));
      requestKey.current = crypto.randomUUID();setDescription('');setOpen(false);await refresh().catch(() => {});
    } catch (e) {setError(e.message);} finally {setBusy(false);}
  }
  return <section id="order-help" className={'order-support' + (compact ? ' order-support-compact' : '')} aria-label={translateUi("Help and refund requests")}>
  <h2>{compact ? translateUi('Need help with your game?') : translateUi('Help with this purchase')}</h2><p>{compact ? translateUi('Get help with downloads, printing or your purchase.') : <>{translateUi("Your request is linked to order ")}{translateUi(orderId.slice(0, 8).toUpperCase())}{translateUi(". You do not need to enter your order number again.")}</>}</p>
  {refunded && <p className="live-note">{translateUi("A full refund has been confirmed by the payment provider.")}</p>}
  <div className="order-support-actions">{compact && <button type="button" className="button-quiet" onClick={() => begin(failedDelivery ? 'delivery' : 'other')}>{translateUi("Report a problem")}</button>}{canRefund && !refunded && <button type="button" className={compact ? 'button-quiet order-support-refund' : 'button'} onClick={() => begin('refund')}>{translateUi("Request a refund")}</button>}{!compact && <button type="button" className="button-quiet" onClick={() => begin(failedDelivery ? 'delivery' : 'other')}>{translateUi("Report a problem")}</button>}</div>
  {notice && <p role="status" className="order-support-receipt">{translateUi(notice)}</p>}
  {open && <form ref={form} className="live-revision order-support-form" onSubmit={submit}>
   <h3>{kind === 'refund' ? translateUi('Request a refund') : translateUi('Report a problem')}</h3>
   <p>{kind === 'refund' ? translateUi('Requests are reviewed manually. Submitting this form does not issue a refund. Mandatory consumer rights remain unchanged.') : translateUi('Tell us what went wrong. A saved request does not automatically remake your game.')}{translateUi(" Do not include child names or photos.")}</p>
   <label>{translateUi("Request type")}<select value={kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{translateUi(label)}</option>)}</select></label>
   {kind === 'refund' && <label>{translateUi("Reason for your refund request")}<select value={reason} onChange={(e) => setReason(e.target.value)}><option value="missing_delivery">{translateUi("Files were not delivered")}</option><option value="fault">{translateUi("Files are faulty or unusable")}</option><option value="duplicate_charge">{translateUi("Duplicate or incorrect charge")}</option><option value="cancellation">{translateUi("Cancellation")}</option><option value="other">{translateUi("Other reason")}</option></select></label>}
   <label>{translateUi("What happened?")}<textarea ref={textarea} minLength={10} maxLength={900} required value={description} onChange={(e) => setDescription(e.target.value)} placeholder={translateUi("Describe the problem and the outcome you would like.")} /></label>
   <div className="order-support-actions"><button className="button" disabled={busy}>{busy ? translateUi('Submitting…') : translateUi('Submit request')}</button><button type="button" className="button-quiet" disabled={busy} onClick={() => setOpen(false)}>{translateUi("Cancel")}</button></div>
   {error && <p role="alert" className="live-alert">{translateUi(error)}{translateUi(" Your request is not confirmed yet; you can retry this submission.")}</p>}
  </form>}
  {cases.length > 0 && <div className="order-report-history"><h3>{translateUi("Your requests")}</h3><ul>{cases.map((item) => <li key={item.id}><strong>{translateUi(labels[item.issue_type]) || translateUi('Support request')}</strong> · {translateUi(item.id.slice(0, 8).toUpperCase())} · {item.status === 'reviewing' ? translateUi('Under review') : item.status === 'resolved' ? translateUi('Closed') : translateUi('Received')}{item.notification_status === 'attention' && <p>{translateUi("The request is saved, but the support notification could not be delivered. Please email support@paperadventure.app with this reference.")}</p>}</li>)}</ul></div>}
  <p className="live-note">{translateUi("You can also email ")}<a href="mailto:support@paperadventure.app">support@paperadventure.app</a>. {!compact && translateUi('An approved refund is completed only after confirmation from the payment provider.')}</p>
 </section>;
}
