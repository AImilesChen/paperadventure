import { ApiError } from './domain.mjs';
const q = (env, sql, ...args) => env.DB.prepare(sql).bind(...args);

// Minimum necessary order evidence. No IP, browser fingerprint, card data or story text.
// File events mean the server supplied bytes, not that a person read or used them.
export async function recordOrderEvidence(env, orderId, event, reference, details = {}) {
  await q(env, 'INSERT OR IGNORE INTO order_evidence(order_id,event,reference,details_json) VALUES(?,?,?,?)',
    orderId, event, reference, JSON.stringify(details)).run();
}
// Access evidence is useful for review, but a transient logging failure must not
// make an otherwise valid paid PDF unavailable. Never swallow entitlement checks.
export async function recordAccessEvidence(...args) {
  try { await recordOrderEvidence(...args); }
  catch { console.error('Access evidence deferred', {code:'ORDER_EVIDENCE_WRITE'}); }
}
export async function assertOrderNotRefunded(env, orderId) {
  const order = await q(env, 'SELECT status FROM orders WHERE id=?', orderId).first();
  if (order?.status === 'refunded') throw new ApiError(410, 'ORDER_REFUNDED', 'This order has been refunded. New work and online files are no longer available.');
}
export function refundedWork(error) {
  return error?.code === 'ORDER_REFUNDED' || String(error?.message).includes('ORDER_REFUNDED');
}
export async function generationJobOrder(env, job) {
  const table = { plan: 'custom_plan_requests', delivery_edition: 'delivery_editions', revision: 'revision_requests', revision_preview: 'revision_previews' }[job?.type];
  if (!table) return job?.orderId || null;
  const id = job.type === 'plan' ? job.requestId : job.type === 'delivery_edition' ? job.editionId : job.type === 'revision' ? job.revisionId : job.previewId;
  return (await q(env, `SELECT order_id FROM ${table} WHERE id=?`, id).first())?.order_id || null;
}
// All queue provider requests, including later calls in the same job, recheck the order.
// An already submitted external request cannot be recalled; its result cannot publish
// after a refund (database guards), and no subsequent request may start.
export function orderWorkEnvironment(env, orderId) {
  return { ...env, FETCH: async (...args) => {
    await assertOrderNotRefunded(env, orderId);
    await recordOrderEvidence(env, orderId, 'provider_work_started', 'first');
    const result = await (env.FETCH || fetch)(...args);
    await assertOrderNotRefunded(env, orderId);
    return result;
  } };
}
