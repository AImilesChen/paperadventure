import { publicCatalog, offers, productRights, themes } from '../shared/catalog.mjs';
import { ApiError, validatePurchase, validateSupportedRange } from './domain.mjs';
import { normalizeEmail, sha256, sha256Bytes, verifyStripeSignature, signAccessToken, verifyAccessToken } from './security.mjs';
import { stripeRequest, checkoutForm, validatePaidSession } from './payments.mjs';
import { generateStory, generateProposals, reviseStage } from './openai.mjs';
import { buildGamePdf } from './pdf.mjs';

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const query = (db, sql, ...values) => db.prepare(sql).bind(...values);
const error = (status, code, message) => json({ error: { code, message } }, status);
const nowSeconds = () => Math.floor(Date.now() / 1000);
const emailHash = (env, email) => sha256(`${env.SESSION_SECRET}|${email}`);
function accessMonths(spec) {
  const months = spec?.onlineRedownloadMonths;
  if (!Number.isInteger(months) || months < 1 || months > 120) throw new Error('Order access policy is missing or invalid');
  return months;
}
const accessActive = entitlement => Boolean(entitlement?.status === 'active' && entitlement.access_expires_at &&
  Date.parse(`${entitlement.access_expires_at.replace(' ', 'T')}Z`) > Date.now());

const cloudflareEmailReady = env => env.EMAIL_PUBLIC_DESTINATIONS_READY === 'true' && typeof env.EMAIL?.send === 'function';
const emailReady = env => Boolean(env.EMAIL_FROM && (cloudflareEmailReady(env) || env.RESEND_API_KEY));

function paymentReady(env) {
  return Boolean(env.DB && env.PRIVATE_FILES && emailReady(env) && env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.SESSION_SECRET && env.PUBLIC_ORIGIN &&
    env.CHECKOUT_ENABLED === 'true' && env.LEGAL_RELEASED === 'true' && env.TAX_CONFIGURED === 'true' &&
    (env.STRIPE_SECRET_KEY.startsWith('sk_test_') || (env.LIVE_PAYMENTS_ENABLED === 'true' && env.STRIPE_SECRET_KEY.startsWith('sk_live_'))));
}
const rangeReady = env => [env.SUPPORTED_AGE_MIN,env.SUPPORTED_AGE_MAX,env.HOME_PLAYER_MAX,env.CLASSROOM_STUDENT_MAX].every(value => Number.isInteger(Number(value)) && Number(value) > 0) && Number(env.SUPPORTED_AGE_MAX) >= Number(env.SUPPORTED_AGE_MIN) && Number(env.HOME_PLAYER_MAX) >= 2 && Number(env.CLASSROOM_STUDENT_MAX) >= 2;
const generationReady = env => Boolean(env.OPENAI_API_KEY && env.OPENAI_MODEL && env.GENERATION_QUEUE && env.PRIVATE_FILES && rangeReady(env));

async function publishedLegal(env) {
  if (!env.DB) return null;
  const result = await query(env.DB, "SELECT kind,version,title,effective_at,sections_json FROM legal_documents WHERE status = 'published' ORDER BY effective_at DESC").all();
  const byKind = new Map();
  for (const item of result.results || []) if (!byKind.has(item.kind)) byKind.set(item.kind, item);
  return byKind;
}
async function checkoutReady(env) { return paymentReady(env) && (await publishedLegal(env))?.size === 4; }

async function liveCatalog(env) {
  const base = publicCatalog();
  if (!env.DB) return base;
  const visibleWorlds = await query(env.DB, "SELECT id FROM theme_worlds WHERE status = 'published'").all();
  const visibleIds = new Set((visibleWorlds.results || []).map(world => world.id));
  const result = await query(env.DB, `SELECT p.id,p.theme_world_id,p.setting,p.version FROM ready_packs p
    WHERE p.status = 'published' AND (SELECT COUNT(*) FROM ready_pack_files f WHERE f.ready_pack_id = p.id) = 4
    ORDER BY p.published_at DESC, p.version DESC`).all();
  const ready = result.results || [];
  const free = env.FREE_SAMPLE_ENABLED === 'true' && ready.some(pack => pack.theme_world_id === 'celebration');
  const prices = await query(env.DB, 'SELECT sku,unit_amount,currency FROM price_versions WHERE sale_enabled = 1').all();
  const liveSkus = new Set((prices.results || []).filter(price => offers.some(offer => offer.sku === price.sku && offer.unitAmount === price.unit_amount && price.currency === 'USD')).map(price => price.sku));
  const availablePaidPack = setting => ready.some(pack => pack.setting === setting && !(free && pack.theme_world_id === 'celebration'));
  const canCheckout = await checkoutReady(env);
  return { ...base, publicationState: canCheckout || free ? 'partially_configured' : base.publicationState,
    freeSampleThemeId: free ? 'celebration' : null,
    themes: themes.filter(theme => visibleIds.has(theme.id)).map(theme => ({ ...theme, home: { readyStatus: ready.some(pack => pack.theme_world_id === theme.id && pack.setting === 'home') ? 'published' : 'not_published', freeSample: free && theme.id === 'celebration' && ready.some(pack => pack.theme_world_id === theme.id && pack.setting === 'home'), packVersion: ready.find(pack => pack.theme_world_id === theme.id && pack.setting === 'home')?.version || null },
      classroom: { readyStatus: ready.some(pack => pack.theme_world_id === theme.id && pack.setting === 'classroom') ? 'published' : 'not_published', freeSample: free && theme.id === 'celebration' && ready.some(pack => pack.theme_world_id === theme.id && pack.setting === 'classroom'), packVersion: ready.find(pack => pack.theme_world_id === theme.id && pack.setting === 'classroom')?.version || null } })),
    offers: offers.map(offer => ({ ...offer, saleEnabled: canCheckout && liveSkus.has(offer.sku) && (offer.kind === 'custom' ? generationReady(env) : availablePaidPack(offer.setting)) })) };
}

function requireSameOrigin(request, env) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(env.PUBLIC_ORIGIN || request.url).origin) throw new ApiError(403, 'ORIGIN_DENIED', 'The request origin is not allowed.');
}

async function requestBody(request) {
  if (Number(request.headers.get('content-length') || 0) > 16384) throw new ApiError(413, 'REQUEST_TOO_LARGE', 'The request is too large.');
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 16384) throw new ApiError(413, 'REQUEST_TOO_LARGE', 'The request is too large.');
  try { return JSON.parse(raw); } catch { throw new ApiError(400, 'INVALID_JSON', 'Send a valid JSON request.'); }
}

async function checkout(request, env) {
  if (!await checkoutReady(env)) throw new ApiError(503, 'CHECKOUT_NOT_READY', 'Purchases are not open. No payment was created.');
  requireSameOrigin(request, env);
  const input = await requestBody(request);
  const email = normalizeEmail(input.email);
  if (!email) throw new ApiError(400, 'INVALID_EMAIL', 'Enter an adult email address.');
  const { offer, spec } = validatePurchase(input);
  if (offer.kind === 'custom' && !generationReady(env)) throw new ApiError(503, 'GENERATION_NOT_READY', 'Custom generation is not available.');
  if (offer.kind === 'custom') validateSupportedRange(spec, env);
  if (offer.kind === 'ready' && env.FREE_SAMPLE_ENABLED === 'true' && spec.themeId === 'celebration') throw new ApiError(409, 'SAMPLE_IS_FREE', 'Use the free sample download for this theme.');
  const key = request.headers.get('Idempotency-Key');
  if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw new ApiError(400, 'IDEMPOTENCY_REQUIRED', 'A valid idempotency key is required.');
  const price = await query(env.DB, 'SELECT * FROM price_versions WHERE sku = ? AND sale_enabled = 1 ORDER BY created_at DESC LIMIT 1', offer.sku).first();
  if (!price || price.currency !== 'USD' || price.unit_amount !== offer.unitAmount || !price.stripe_price_id || price.tax_behavior === 'unknown') throw new ApiError(503, 'OFFER_NOT_READY', 'This product is not available for checkout.');
  let readyPack = null;
  if (offer.kind === 'ready') {
    readyPack = await query(env.DB, "SELECT * FROM ready_packs WHERE theme_world_id = ? AND setting = ? AND version = ? AND status = 'published'", spec.themeId, spec.setting, spec.packVersion).first();
    if (!readyPack) throw new ApiError(503, 'PACK_NOT_PUBLISHED', 'This ready-made pack is not published.');
    const files = await query(env.DB, 'SELECT paper, role FROM ready_pack_files WHERE ready_pack_id = ?', readyPack.id).all();
    if (files.results?.length !== 4) throw new ApiError(503, 'PACK_FILES_INCOMPLETE', 'The printable pack is incomplete.');
  }
  const buyerHash = await emailHash(env, email);
  const legal = await publishedLegal(env);
  const legalVersions = Object.fromEntries([...legal].map(([kind, item]) => [kind, item.version]));
  const specJson = JSON.stringify({ ...spec, readyPackId: readyPack?.id || null, priceVersionId: price.id, licenceVersion: readyPack?.licence_version || env.CUSTOM_LICENCE_VERSION,
    accessPolicyVersion: productRights.version, onlineRedownloadMonths: productRights.onlineRedownloadMonths,
    accessStarts: offer.kind === 'ready' ? productRights.readyAccessStarts : productRights.customAccessStarts, legalVersions });
  const specHash = await sha256(specJson);
  let order = await query(env.DB, 'SELECT * FROM orders WHERE idempotency_key = ?', key).first();
  if (order && (order.purchase_spec_sha256 !== specHash || order.purchaser_email_hash !== buyerHash)) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'This request key was used for another purchase.');
  if (!order) {
    const id = crypto.randomUUID();
    await query(env.DB, `INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,idempotency_key)
      VALUES (?,?,?,?,?,?,?,?,?,'pending_payment',?)`, id, offer.kind, offer.sku, specJson, specHash, buyerHash, price.id, price.unit_amount, 'USD', key).run();
    order = await query(env.DB, 'SELECT * FROM orders WHERE id = ?', id).first();
  }
  if (order.checkout_url && order.stripe_checkout_session_id) return json({ orderId: order.id, checkoutUrl: order.checkout_url, mode: 'stripe' });
  const origin = new URL(env.PUBLIC_ORIGIN).origin;
  const form = checkoutForm({ orderId: order.id, email, priceId: price.stripe_price_id, specHash,
    successUrl: `${origin}/en/orders/${order.id}/?checkout=returned`, cancelUrl: `${origin}/en/checkout/?cancelled=1`, automaticTax: true });
  const session = await stripeRequest(env, 'checkout/sessions', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `paw-${order.id}` }, body: form.toString() }, env.FETCH || fetch);
  if (!session.id || !session.url || session.client_reference_id !== order.id) throw new ApiError(502, 'PAYMENT_PROVIDER_ERROR', 'Payment session could not be verified.');
  await query(env.DB, 'UPDATE orders SET stripe_checkout_session_id = ?, checkout_url = ? WHERE id = ? AND status = ?', session.id, session.url, order.id, 'pending_payment').run();
  return json({ orderId: order.id, checkoutUrl: session.url, mode: 'stripe' }, 201);
}

async function webhook(request, env, context = {}) {
  if (!env.DB || !env.STRIPE_WEBHOOK_SECRET) throw new ApiError(503, 'WEBHOOK_NOT_READY', 'Webhook is not configured.');
  const raw = await request.text();
  if (raw.length > 250000) throw new ApiError(413, 'REQUEST_TOO_LARGE', 'The event is too large.');
  if (!await verifyStripeSignature(env.STRIPE_WEBHOOK_SECRET, request.headers.get('Stripe-Signature'), raw)) throw new ApiError(400, 'BAD_SIGNATURE', 'Invalid webhook signature.');
  let event;
  try { event = JSON.parse(raw); } catch { throw new ApiError(400, 'INVALID_JSON', 'Invalid webhook body.'); }
  if (!event.id || !event.type) throw new ApiError(400, 'INVALID_EVENT', 'Missing event identity.');
  if (event.type === 'charge.refunded') {
    const charge = event.data?.object;
    const order = charge?.payment_intent && await query(env.DB, 'SELECT * FROM orders WHERE stripe_payment_intent_id = ?', charge.payment_intent).first();
    if (!order) throw new ApiError(409, 'UNKNOWN_ORDER', 'Refund event has no matching order.');
    const prior = await query(env.DB, 'SELECT stripe_event_id FROM webhook_events WHERE stripe_event_id = ?', event.id).first();
    if (prior) return json({ received: true, duplicate: true });
    if (charge.currency?.toLowerCase() !== 'usd' || !Number.isInteger(charge.amount_refunded)) throw new ApiError(409, 'REFUND_MISMATCH', 'Refund event does not match the order.');
    const full = charge.refunded === true && charge.amount_refunded >= order.amount_total;
    const statements = [query(env.DB, 'INSERT INTO webhook_events (stripe_event_id,event_type,order_id) VALUES (?,?,?)', event.id, event.type, order.id)];
    if (full) statements.push(query(env.DB, "UPDATE orders SET status = 'refunded' WHERE id = ?", order.id), query(env.DB, "UPDATE entitlements SET status = 'revoked' WHERE order_id = ?", order.id));
    await env.DB.batch(statements);
    return json({ received: true, fullRefund: full });
  }
  if (['checkout.session.expired','checkout.session.async_payment_failed'].includes(event.type)) {
    const session = event.data?.object;
    const order = session?.client_reference_id && await query(env.DB, 'SELECT * FROM orders WHERE id = ?', session.client_reference_id).first();
    if (!order || order.stripe_checkout_session_id !== session.id) throw new ApiError(409, 'UNKNOWN_ORDER', 'Payment failure has no matching order.');
    await env.DB.batch([
      query(env.DB, 'INSERT OR IGNORE INTO webhook_events (stripe_event_id,event_type,order_id) VALUES (?,?,?)', event.id, event.type, order.id),
      query(env.DB, "UPDATE orders SET status = 'failed' WHERE id = ? AND status = 'pending_payment'", order.id),
    ]);
    return json({ received: true });
  }
  if (!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) return json({ received: true, ignored: true });
  const session = event.data?.object;
  const orderId = session?.client_reference_id;
  const order = orderId && await query(env.DB, 'SELECT * FROM orders WHERE id = ?', orderId).first();
  if (!order) throw new ApiError(409, 'UNKNOWN_ORDER', 'Payment event has no matching order.');
  const price = await query(env.DB, 'SELECT * FROM price_versions WHERE id = ?', order.price_version_id).first();
  if (!price || !validatePaidSession(session, order, price)) throw new ApiError(409, 'PAYMENT_MISMATCH', 'Payment event does not match the order snapshot.');
  const existing = await query(env.DB, 'SELECT stripe_event_id FROM webhook_events WHERE stripe_event_id = ?', event.id).first();
  if (existing) {
    if (order.product_kind === 'custom' && env.GENERATION_QUEUE) {
      const activity = await query(env.DB, 'SELECT status FROM custom_activities WHERE order_id = ?', order.id).first();
      if (activity?.status === 'queued') await env.GENERATION_QUEUE.send({ orderId: order.id });
    }
    return json({ received: true, duplicate: true });
  }
  const spec = JSON.parse(order.purchase_spec_json);
  const months = accessMonths(spec);
  const statements = [
    query(env.DB, 'INSERT OR IGNORE INTO webhook_events (stripe_event_id,event_type,order_id) VALUES (?,?,?)', event.id, event.type, order.id),
    query(env.DB, "UPDATE orders SET status = ?, amount_total = ?, stripe_payment_intent_id = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending_payment'", order.product_kind === 'ready' ? 'published' : 'paid', session.amount_total, typeof session.payment_intent === 'string' ? session.payment_intent : null, order.id),
  ];
  if (order.product_kind === 'ready') {
    statements.push(query(env.DB, `INSERT OR IGNORE INTO entitlements (id,order_id,ready_pack_id,status,revision_success_limit,access_expires_at) VALUES (?,?,?,'active',0,datetime('now',?))`,
      crypto.randomUUID(), order.id, spec.readyPackId, `+${months} months`));
  } else {
    const activityId = `activity-${order.id}`;
    statements.push(query(env.DB, `INSERT OR IGNORE INTO custom_activities (id,order_id,status,story_spec_json) VALUES (?,?,'queued',?)`, activityId, order.id, JSON.stringify(spec)));
    statements.push(query(env.DB, `INSERT OR IGNORE INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit,revision_expires_at)
      VALUES (?,?,?,'active',?,NULL)`, crypto.randomUUID(), order.id, activityId, offers.find(item => item.sku === order.sku)?.revisionLimit || 0));
  }
  statements.push(query(env.DB, "INSERT OR IGNORE INTO delivery_notifications (order_id,kind,status) VALUES (?,?,'pending')", order.id, order.product_kind === 'ready' ? 'files_ready' : 'payment'));
  await env.DB.batch(statements);
  if (order.product_kind === 'custom' && env.GENERATION_QUEUE) await env.GENERATION_QUEUE.send({ orderId: order.id });
  if (typeof context.waitUntil === 'function') context.waitUntil(dispatchNotification(order.id, order.product_kind === 'ready' ? 'files_ready' : 'payment', env).catch(caught => console.error('Email notification deferred', caught)));
  return json({ received: true });
}

async function authenticatedEmailHash(request, env) {
  const cookie = request.headers.get('cookie') || '';
  const token = cookie.match(/(?:^|;\s*)paw_session=([^;]+)/)?.[1];
  const payload = await verifyAccessToken(env.SESSION_SECRET, token);
  return payload?.scope === 'session' ? payload.emailHash : null;
}

async function requestAccessLink(request, env) {
  if (!env.DB || !env.SESSION_SECRET || !emailReady(env) || !env.PUBLIC_ORIGIN) throw new ApiError(503, 'EMAIL_NOT_READY', 'Email verification is not configured.');
  requireSameOrigin(request, env);
  const body = await requestBody(request);
  const email = normalizeEmail(body.email);
  if (!email) throw new ApiError(400, 'INVALID_EMAIL', 'Enter an adult email address.');
  const ip = request.headers.get('cf-connecting-ip');
  if (!ip) throw new ApiError(403, 'VISITOR_UNVERIFIED', 'Visitor verification is unavailable.');
  const hash = await emailHash(env, email);
  const ipBucket = await sha256(`${env.SESSION_SECRET}|access-ip|${ip}|${Math.floor(nowSeconds() / 3600)}`);
  await query(env.DB, `INSERT INTO access_rate_limits (bucket,hits,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1`, ipBucket, nowSeconds() + 3600).run();
  const ipCount = await query(env.DB, 'SELECT hits FROM access_rate_limits WHERE bucket = ?', ipBucket).first();
  if (ipCount.hits > 10) return json({ sent: true });
  const bucket = await sha256(`${hash}|${Math.floor(nowSeconds() / 3600)}`);
  await query(env.DB, `INSERT INTO access_rate_limits (bucket,hits,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1`, bucket, nowSeconds() + 3600).run();
  const count = await query(env.DB, 'SELECT hits FROM access_rate_limits WHERE bucket = ?', bucket).first();
  if (count.hits > 3) return json({ sent: true });
  await sendAccessEmail(env, email, hash, { subject: 'Your Paper Adventure sign-in link', intro: 'Open this link within 15 minutes to access your adventures:', idempotencyKey: crypto.randomUUID() });
  return json({ sent: true });
}

async function sendAccessEmail(env, email, hash, { subject, intro, idempotencyKey }) {
  const nonce = crypto.randomUUID();
  const nonceHash = await sha256(nonce);
  const exp = nowSeconds() + 15 * 60;
  await query(env.DB, 'INSERT INTO access_challenges (nonce_hash,email_hash,expires_at) VALUES (?,?,?)', nonceHash, hash, exp).run();
  const token = await signAccessToken(env.SESSION_SECRET, { scope: 'email-link', emailHash: hash, nonce, exp });
  const link = `${new URL(env.PUBLIC_ORIGIN).origin}/api/v1/auth/verify?token=${encodeURIComponent(token)}`;
  const text = `${intro} ${link}\n\nIf you did not request it, you can ignore this email.`;
  if (cloudflareEmailReady(env)) {
    try { await env.EMAIL.send({ from: env.EMAIL_FROM, to: email, subject, text }); }
    catch { throw new ApiError(502, 'EMAIL_SEND_FAILED', 'The verification email could not be sent.'); }
    return;
  }
  const response = await (env.FETCH || fetch)('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [email], subject, text }) });
  if (!response.ok) throw new ApiError(502, 'EMAIL_SEND_FAILED', 'The verification email could not be sent.');
}

async function dispatchNotification(orderId, kind, env) {
  if (!env.DB || !emailReady(env) || !env.STRIPE_SECRET_KEY) return;
  const notice = await query(env.DB, "SELECT * FROM delivery_notifications WHERE order_id = ? AND kind = ? AND status = 'pending'", orderId, kind).first();
  if (!notice || notice.attempts >= 5) return;
  const order = await query(env.DB, 'SELECT * FROM orders WHERE id = ?', orderId).first();
  if (!order || order.status === 'refunded') {
    await query(env.DB, "UPDATE delivery_notifications SET status = 'blocked' WHERE order_id = ? AND kind = ?", orderId, kind).run();
    return;
  }
  try {
    const session = await stripeRequest(env, `checkout/sessions/${encodeURIComponent(order.stripe_checkout_session_id)}`, {}, env.FETCH || fetch);
    const email = normalizeEmail(session.customer_details?.email || session.customer_email);
    if (!email || await emailHash(env, email) !== order.purchaser_email_hash) {
      await query(env.DB, "UPDATE delivery_notifications SET status = 'blocked' WHERE order_id = ? AND kind = ?", orderId, kind).run();
      return;
    }
    const messages = {
      payment: { subject: 'Your Paper Adventure order is being prepared', intro: 'Payment is confirmed. Your custom adventure is being generated and checked. Verify your email to see order progress:' },
      files_ready: { subject: 'Your Paper Adventure files are ready', intro: 'Your adventure files are ready. Verify your email to open the order and download them:' },
      generation_failed: { subject: 'Your Paper Adventure order needs help', intro: 'We could not complete your custom adventure. Verify your email to see the order and report the problem for a correction or refund review:' },
    };
    const { subject, intro } = messages[kind];
    await sendAccessEmail(env, email, order.purchaser_email_hash, { subject, intro, idempotencyKey: `paw-notice-${orderId}-${kind}` });
    await query(env.DB, "UPDATE delivery_notifications SET status = 'sent', sent_at = CURRENT_TIMESTAMP, attempts = attempts + 1 WHERE order_id = ? AND kind = ?", orderId, kind).run();
  } catch (caught) {
    await query(env.DB, 'UPDATE delivery_notifications SET attempts = attempts + 1 WHERE order_id = ? AND kind = ?', orderId, kind).run();
    throw caught;
  }
}

async function proposals(request, env) {
  if (!env.DB || !env.SESSION_SECRET || env.PROPOSALS_ENABLED !== 'true' || !env.OPENAI_API_KEY || !env.OPENAI_MODEL) throw new ApiError(503, 'GENERATION_NOT_READY', 'Free story proposals are not available.');
  requireSameOrigin(request, env);
  const ip = request.headers.get('cf-connecting-ip');
  if (!ip) throw new ApiError(403, 'VISITOR_UNVERIFIED', 'Visitor verification is unavailable.');
  const input = await requestBody(request);
  const { spec } = validatePurchase({ ...input, sku: input.setting === 'classroom' ? 'custom_classroom' : 'custom_home', direction: 'mystery', paper: input.paper || 'A4' });
  validateSupportedRange(spec, env);
  const visitorHash = await sha256(`${env.SESSION_SECRET}|${ip}`);
  const bucket = await sha256(`${visitorHash}|proposals|${Math.floor(nowSeconds() / 86400)}`);
  await query(env.DB, `INSERT INTO access_rate_limits (bucket,hits,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1`, bucket, nowSeconds() + 86400).run();
  const count = await query(env.DB, 'SELECT hits FROM access_rate_limits WHERE bucket = ?', bucket).first();
  if (count.hits > 2) throw new ApiError(429, 'PROPOSAL_LIMIT', 'The free idea limit has been reached for today.');
  const result = await generateProposals(spec, env, env.FETCH || fetch);
  await query(env.DB, 'INSERT INTO proposal_usage (id,visitor_hash,model,input_tokens,output_tokens) VALUES (?,?,?,?,?)', crypto.randomUUID(), visitorHash, env.OPENAI_MODEL, result.usage?.input_tokens || null, result.usage?.output_tokens || null).run();
  return json({ proposals: result.proposals });
}

async function verifyAccessLink(request, env) {
  if (!env.DB || !env.SESSION_SECRET) throw new ApiError(503, 'EMAIL_NOT_READY', 'Email verification is not configured.');
  const token = new URL(request.url).searchParams.get('token');
  const payload = await verifyAccessToken(env.SESSION_SECRET, token);
  if (payload?.scope !== 'email-link' || !payload.nonce) throw new ApiError(401, 'LINK_INVALID', 'The sign-in link is invalid or expired.');
  const nonceHash = await sha256(payload.nonce);
  const result = await query(env.DB, 'UPDATE access_challenges SET used_at = ? WHERE nonce_hash = ? AND email_hash = ? AND used_at IS NULL AND expires_at > ?', nowSeconds(), nonceHash, payload.emailHash, nowSeconds()).run();
  if (!result.meta?.changes) throw new ApiError(401, 'LINK_USED', 'The sign-in link has already been used or expired.');
  const session = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: payload.emailHash, exp: nowSeconds() + 7 * 86400 });
  const secure = new URL(env.PUBLIC_ORIGIN || request.url).protocol === 'https:' ? '; Secure' : '';
  return new Response(null, { status: 303, headers: { location: '/en/my-adventures/', 'set-cookie': `paw_session=${session}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=604800`, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
}

async function myOrders(request, env) {
  if (!env.DB || !env.SESSION_SECRET) throw new ApiError(503, 'ACCOUNT_NOT_READY', 'Account storage is not configured.');
  const hash = await authenticatedEmailHash(request, env);
  if (!hash) throw new ApiError(401, 'EMAIL_VERIFICATION_REQUIRED', 'Verify your email first.');
  const rows = await query(env.DB, 'SELECT id,sku,product_kind,status,currency,amount_total,created_at FROM orders WHERE purchaser_email_hash = ? ORDER BY created_at DESC LIMIT 50', hash).all();
  return json({ orders: rows.results || [] });
}

async function savedDraft(request, env) {
  if (!env.DB || !env.SESSION_SECRET) throw new ApiError(503, 'ACCOUNT_NOT_READY', 'Account storage is not configured.');
  const hash = await authenticatedEmailHash(request, env);
  if (!hash) throw new ApiError(401, 'EMAIL_VERIFICATION_REQUIRED', 'Verify your email first.');
  if (request.method === 'GET') {
    const row = await query(env.DB, 'SELECT draft_json FROM adult_drafts WHERE email_hash = ?', hash).first();
    return json({ draft: row ? JSON.parse(row.draft_json) : null });
  }
  requireSameOrigin(request, env);
  if (request.method === 'DELETE') {
    await query(env.DB, 'DELETE FROM adult_drafts WHERE email_hash = ?', hash).run();
    return json({ deleted: true });
  }
  const body = await requestBody(request);
  const { spec } = validatePurchase({ ...body, sku: body.setting === 'classroom' ? 'custom_classroom' : 'custom_home' });
  await query(env.DB, `INSERT INTO adult_drafts (email_hash,draft_json) VALUES (?,?) ON CONFLICT(email_hash) DO UPDATE SET draft_json = excluded.draft_json, updated_at = CURRENT_TIMESTAMP`, hash, JSON.stringify(spec)).run();
  return json({ saved: true });
}

async function freeSample(request, env, setting, paper, role) {
  if (!env.DB || !env.PRIVATE_FILES || env.FREE_SAMPLE_ENABLED !== 'true') throw new ApiError(404, 'SAMPLE_NOT_PUBLISHED', 'The free sample is not published.');
  const pack = await query(env.DB, "SELECT * FROM ready_packs WHERE theme_world_id = 'celebration' AND setting = ? AND status = 'published' ORDER BY published_at DESC LIMIT 1", setting).first();
  if (!pack) throw new ApiError(404, 'SAMPLE_NOT_PUBLISHED', 'The free sample is not published.');
  const file = await query(env.DB, 'SELECT * FROM ready_pack_files WHERE ready_pack_id = ? AND paper = ? AND role = ?', pack.id, paper, role).first();
  if (!file) throw new ApiError(404, 'FILE_NOT_FOUND', 'The sample file is unavailable.');
  const object = await env.PRIVATE_FILES.get(file.r2_key);
  if (!object || object.customMetadata?.sha256 !== file.sha256) throw new ApiError(503, 'FILE_INTEGRITY_FAILED', 'The sample file is temporarily unavailable.');
  return new Response(object.body, { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="celebration-${setting}-${role}-${paper}.pdf"`, 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff' } });
}

async function orderView(request, env, orderId) {
  if (!env.DB || !env.SESSION_SECRET) throw new ApiError(503, 'ORDER_ACCESS_NOT_READY', 'Verified order access is not configured.');
  const hash = await authenticatedEmailHash(request, env);
  if (!hash) throw new ApiError(401, 'EMAIL_VERIFICATION_REQUIRED', 'Verify the purchase email first.');
  const order = await query(env.DB, 'SELECT * FROM orders WHERE id = ? AND purchaser_email_hash = ?', orderId, hash).first();
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'No verified order was found.');
  const entitlement = await query(env.DB, 'SELECT * FROM entitlements WHERE order_id = ?', order.id).first();
  const spec = JSON.parse(order.purchase_spec_json);
  return json({ id: order.id, sku: order.sku, kind: order.product_kind, currency: order.currency, amountTotal: order.amount_total, status: order.status,
    createdAt: order.created_at, paidAt: order.paid_at, filesReady: Boolean(accessActive(entitlement) && order.status === 'published'),
    paper: order.product_kind === 'custom' ? spec.paper : null,
    accessExpiresAt: entitlement?.access_expires_at || null,
    revisionLimit: entitlement?.revision_success_limit || 0, revisionUsed: entitlement?.revision_success_used || 0,
    revisionExpiresAt: entitlement?.revision_expires_at || null });
}

async function fileDownload(request, env, orderId, role) {
  if (!env.DB || !env.PRIVATE_FILES) throw new ApiError(503, 'FILES_NOT_READY', 'Private files are not configured.');
  if (!['player','guide'].includes(role)) throw new ApiError(404, 'FILE_NOT_FOUND', 'File not found.');
  const hash = await authenticatedEmailHash(request, env);
  if (!hash) throw new ApiError(401, 'EMAIL_VERIFICATION_REQUIRED', 'Verify the purchase email first.');
  const order = await query(env.DB, 'SELECT * FROM orders WHERE id = ? AND purchaser_email_hash = ?', orderId, hash).first();
  if (!order || order.status !== 'published') throw new ApiError(404, 'FILE_NOT_FOUND', 'File not found.');
  const entitlement = await query(env.DB, "SELECT * FROM entitlements WHERE order_id = ? AND status = 'active'", order.id).first();
  if (!accessActive(entitlement)) throw new ApiError(403, 'ACCESS_EXPIRED', 'Online re-download is unavailable after the access period. Files already downloaded may still be used within the licence.');
  const spec = JSON.parse(order.purchase_spec_json);
  const paper = new URL(request.url).searchParams.get('paper') === 'Letter' ? 'Letter' : 'A4';
  let file;
  if (order.product_kind === 'ready') file = await query(env.DB, 'SELECT r2_key, sha256 FROM ready_pack_files WHERE ready_pack_id = ? AND paper = ? AND role = ?', entitlement.ready_pack_id, paper, role).first();
  else {
    if (paper !== spec.paper) throw new ApiError(404, 'FILE_NOT_FOUND', 'This paper size was not generated.');
    const artifact = await query(env.DB, "SELECT * FROM artifact_versions WHERE custom_activity_id = ? AND status = 'published' ORDER BY version_number DESC LIMIT 1", entitlement.custom_activity_id).first();
    file = artifact && { r2_key: role === 'player' ? artifact.player_r2_key : artifact.guide_r2_key, sha256: role === 'player' ? artifact.player_sha256 : artifact.guide_sha256 };
  }
  if (!file?.r2_key) throw new ApiError(404, 'FILE_NOT_FOUND', 'The file is not ready.');
  const object = await env.PRIVATE_FILES.get(file.r2_key);
  if (!object || object.customMetadata?.sha256 !== file.sha256) throw new ApiError(503, 'FILE_INTEGRITY_FAILED', 'The file is temporarily unavailable.');
  return new Response(object.body, { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="adventure-${role}-${paper}.pdf"`, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } });
}

async function requestRevision(request, env, orderId) {
  if (!env.DB || !env.GENERATION_QUEUE || !env.PRIVATE_FILES || !env.OPENAI_API_KEY) throw new ApiError(503, 'REVISION_NOT_READY', 'Story revisions are not configured.');
  requireSameOrigin(request, env);
  const hash = await authenticatedEmailHash(request, env);
  if (!hash) throw new ApiError(401, 'EMAIL_VERIFICATION_REQUIRED', 'Verify the purchase email first.');
  const order = await query(env.DB, "SELECT * FROM orders WHERE id = ? AND purchaser_email_hash = ? AND product_kind = 'custom' AND status = 'published'", orderId, hash).first();
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'No eligible custom order was found.');
  const entitlement = await query(env.DB, "SELECT * FROM entitlements WHERE order_id = ? AND status = 'active'", orderId).first();
  if (!entitlement || entitlement.revision_success_used >= entitlement.revision_success_limit || !entitlement.revision_expires_at || Date.parse(`${entitlement.revision_expires_at}Z`) <= Date.now()) throw new ApiError(403, 'REVISION_LIMIT', 'No included revision remains for this order.');
  const body = await requestBody(request);
  const stageNumber = Number(body.stageNumber);
  if (!Number.isInteger(stageNumber) || stageNumber < 1 || stageNumber > 5) throw new ApiError(400, 'INVALID_STAGE', 'Choose a stage from 1 to 5.');
  const instruction = String(body.instruction || '').trim();
  if (instruction.length < 10 || instruction.length > 350) throw new ApiError(400, 'INVALID_REVISION', 'Describe one local change in 10–350 characters.');
  const pending = await query(env.DB, "SELECT id FROM revision_requests WHERE order_id = ? AND status IN ('queued','generating')", orderId).first();
  if (pending) {
    await env.GENERATION_QUEUE.send({ type: 'revision', revisionId: pending.id });
    return json({ revisionId: pending.id, status: 'queued' }, 202);
  }
  const id = crypto.randomUUID();
  await query(env.DB, "INSERT INTO revision_requests (id,order_id,stage_number,instruction,status) VALUES (?,?,?,?,'queued')", id, orderId, stageNumber, instruction).run();
  await env.GENERATION_QUEUE.send({ type: 'revision', revisionId: id });
  return json({ revisionId: id, status: 'queued' }, 202);
}

async function supportCases(request, env, orderId) {
  if (!env.DB || !env.SESSION_SECRET) throw new ApiError(503, 'SUPPORT_NOT_READY', 'Support reporting is not configured.');
  const hash = await authenticatedEmailHash(request, env);
  if (!hash) throw new ApiError(401, 'EMAIL_VERIFICATION_REQUIRED', 'Verify the purchase email first.');
  const order = await query(env.DB, 'SELECT id FROM orders WHERE id = ? AND purchaser_email_hash = ?', orderId, hash).first();
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'No verified order was found.');
  if (request.method === 'GET') {
    const cases = await query(env.DB, 'SELECT id,issue_type,status,created_at,updated_at FROM support_cases WHERE order_id = ? AND email_hash = ? ORDER BY created_at DESC LIMIT 20', orderId, hash).all();
    return json({ cases: cases.results || [] });
  }
  requireSameOrigin(request, env);
  const body = await requestBody(request);
  if (!['clue','answer','printing','delivery','refund','other'].includes(body.issueType)) throw new ApiError(400, 'INVALID_ISSUE', 'Choose a report type.');
  const description = String(body.description || '').trim();
  if (description.length < 10 || description.length > 1000) throw new ApiError(400, 'INVALID_ISSUE', 'Describe the issue in 10–1000 characters.');
  const recent = await query(env.DB, "SELECT COUNT(*) AS count FROM support_cases WHERE order_id = ? AND created_at >= datetime('now','-1 day')", orderId).first();
  if (recent.count >= 5) throw new ApiError(429, 'ISSUE_LIMIT', 'Please wait before sending another report.');
  const id = crypto.randomUUID();
  await query(env.DB, "INSERT INTO support_cases (id,order_id,email_hash,issue_type,description,status) VALUES (?,?,?,?,?,'open')", id, orderId, hash, body.issueType, description).run();
  return json({ caseId: id, status: 'open' }, 201);
}

export async function handleProductionApi(request, env = {}, context = {}) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === 'GET' && path === '/api/v1/health') {
      const legal = await publishedLegal(env);
      const catalog = await liveCatalog(env);
      return json({ status: 'configured_runtime', checkout: await checkoutReady(env), generation: generationReady(env), proposals: env.PROPOSALS_ENABLED === 'true' && Boolean(env.DB && env.SESSION_SECRET && env.OPENAI_API_KEY && env.OPENAI_MODEL && rangeReady(env)), account: Boolean(env.DB && env.SESSION_SECRET && emailReady(env) && env.PUBLIC_ORIGIN), sample: Boolean(catalog.freeSampleThemeId), legal: legal?.size === 4 });
    }
    const legalPath = path.match(/^\/api\/v1\/legal\/(privacy|terms|cookies|refunds)$/);
    if (request.method === 'GET' && legalPath) {
      const item = (await publishedLegal(env))?.get(legalPath[1]);
      return item ? json({ kind: item.kind, version: item.version, title: item.title, effectiveAt: item.effective_at, sections: JSON.parse(item.sections_json) }) : error(404, 'LEGAL_NOT_PUBLISHED', 'This policy is not published.');
    }
    if (request.method === 'GET' && path === '/api/v1/catalog') return json(await liveCatalog(env));
    if (request.method === 'GET' && path.startsWith('/api/v1/themes/')) {
      const id = path.slice('/api/v1/themes/'.length);
      const catalog = await liveCatalog(env);
      const theme = catalog.themes.find(item => item.id === id);
      return theme ? json({ theme, offers: catalog.offers }) : error(404, 'THEME_NOT_FOUND', 'Unknown theme.');
    }
    if (request.method === 'POST' && path === '/api/v1/checkout-intents') return await checkout(request, env);
    if (request.method === 'POST' && path === '/api/v1/stripe/webhook') return await webhook(request, env, context);
    if (request.method === 'POST' && path === '/api/v1/proposals') return await proposals(request, env);
    if (request.method === 'POST' && path === '/api/v1/access-links') return await requestAccessLink(request, env);
    if (request.method === 'GET' && path === '/api/v1/auth/verify') return await verifyAccessLink(request, env);
    if (request.method === 'GET' && path === '/api/v1/my-orders') return await myOrders(request, env);
    if (['GET','PUT','DELETE'].includes(request.method) && path === '/api/v1/my-draft') return await savedDraft(request, env);
    if (request.method === 'POST' && path === '/api/v1/auth/logout') return new Response(null, { status: 204, headers: { 'set-cookie': 'paw_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0', 'cache-control': 'no-store' } });
    const sample = path.match(/^\/api\/v1\/samples\/(home|classroom)\/(A4|Letter)\/(player|guide)$/);
    if (request.method === 'GET' && sample) return await freeSample(request, env, sample[1], sample[2], sample[3]);
    const order = path.match(/^\/api\/v1\/orders\/([A-Za-z0-9-]+)$/);
    if (request.method === 'GET' && order) return await orderView(request, env, order[1]);
    const revision = path.match(/^\/api\/v1\/orders\/([A-Za-z0-9-]+)\/revisions$/);
    if (request.method === 'POST' && revision) return await requestRevision(request, env, revision[1]);
    const cases = path.match(/^\/api\/v1\/orders\/([A-Za-z0-9-]+)\/issues$/);
    if (['GET','POST'].includes(request.method) && cases) return await supportCases(request, env, cases[1]);
    const file = path.match(/^\/api\/v1\/files\/([A-Za-z0-9-]+)\/(player|guide)$/);
    if (request.method === 'GET' && file) return await fileDownload(request, env, file[1], file[2]);
    return error(404, 'NOT_FOUND', 'API route not found.');
  } catch (caught) {
    if (caught instanceof ApiError) return error(caught.status, caught.code, caught.message);
    console.error('Production API failure', caught);
    return error(500, 'INTERNAL_ERROR', 'The request could not be completed.');
  }
}

async function publishCustomOrder(orderId, env) {
  if (!env.DB || !env.PRIVATE_FILES || !env.OPENAI_API_KEY) throw new Error('Generation bindings are missing');
  const order = await query(env.DB, "SELECT * FROM orders WHERE id = ? AND product_kind = 'custom' AND status IN ('paid','fulfilling')", orderId).first();
  if (!order) return;
  const activity = await query(env.DB, 'SELECT * FROM custom_activities WHERE order_id = ?', orderId).first();
  if (!activity || activity.status === 'published') return;
  const spec = JSON.parse(order.purchase_spec_json);
  const lease = await query(env.DB, `UPDATE custom_activities SET status = 'generating', lease_until = ? WHERE id = ? AND (status = 'queued' OR (status = 'generating' AND COALESCE(lease_until,0) < ?))`, nowSeconds() + 300, activity.id, nowSeconds()).run();
  if (!lease.meta?.changes) return;
  await env.DB.batch([
    query(env.DB, "UPDATE orders SET status = 'fulfilling' WHERE id = ? AND status = 'paid'", orderId),
  ]);
  const attempt = (await query(env.DB, 'SELECT COALESCE(MAX(attempt),0) + 1 AS next FROM generation_usage WHERE order_id = ?', orderId).first()).next;
  try {
    const result = await generateStory(spec, env, env.FETCH || fetch);
    const player = buildGamePdf(result.story, spec, 'player');
    const guide = buildGamePdf(result.story, spec, 'guide');
    const storyJson = JSON.stringify(result.story);
    const storyHash = await sha256(storyJson);
    const playerHash = await sha256Bytes(player);
    const guideHash = await sha256Bytes(guide);
    const prefix = `custom/${orderId}/v1`;
    await Promise.all([
      env.PRIVATE_FILES.put(`${prefix}/player.pdf`, player, { httpMetadata: { contentType: 'application/pdf' }, customMetadata: { sha256: playerHash } }),
      env.PRIVATE_FILES.put(`${prefix}/guide.pdf`, guide, { httpMetadata: { contentType: 'application/pdf' }, customMetadata: { sha256: guideHash } }),
      env.PRIVATE_FILES.put(`${prefix}/story.json`, storyJson, { httpMetadata: { contentType: 'application/json' }, customMetadata: { sha256: storyHash } }),
    ]);
    await env.DB.batch([
      query(env.DB, `INSERT OR IGNORE INTO artifact_versions (id,custom_activity_id,version_number,status,player_r2_key,guide_r2_key,player_sha256,guide_sha256,story_r2_key,story_sha256) VALUES (?,?,1,'published',?,?,?,?,?,?)`, `artifact-${orderId}-1`, activity.id, `${prefix}/player.pdf`, `${prefix}/guide.pdf`, playerHash, guideHash, `${prefix}/story.json`, storyHash),
      query(env.DB, "UPDATE custom_activities SET status = 'published', lease_until = NULL, generated_at = CURRENT_TIMESTAMP, published_at = CURRENT_TIMESTAMP WHERE id = ?", activity.id),
      query(env.DB, "UPDATE orders SET status = 'published' WHERE id = ?", orderId),
      query(env.DB, `UPDATE entitlements SET revision_expires_at = datetime('now','+30 days'), access_expires_at = datetime('now', ?) WHERE order_id = ?`,
        `+${accessMonths(spec)} months`, orderId),
      query(env.DB, "INSERT OR IGNORE INTO delivery_notifications (order_id,kind,status) VALUES (?,'files_ready','pending')", orderId),
      query(env.DB, 'INSERT OR IGNORE INTO generation_usage (order_id,attempt,response_id,model,input_tokens,output_tokens,status) VALUES (?,?,?,?,?,?,?)', orderId, attempt, result.responseId, env.OPENAI_MODEL, result.usage?.input_tokens || null, result.usage?.output_tokens || null, 'published'),
    ]);
  } catch (caught) {
    await query(env.DB, 'INSERT OR IGNORE INTO generation_usage (order_id,attempt,model,status) VALUES (?,?,?,?)', orderId, attempt, env.OPENAI_MODEL || 'unconfigured', 'failed').run();
    if (attempt >= 2) await env.DB.batch([
      query(env.DB, "UPDATE custom_activities SET status = 'failed', lease_until = NULL WHERE id = ?", activity.id),
      query(env.DB, "UPDATE orders SET status = 'failed' WHERE id = ?", orderId),
      query(env.DB, "INSERT OR IGNORE INTO delivery_notifications (order_id,kind,status) VALUES (?,'generation_failed','pending')", orderId),
    ]);
    else await query(env.DB, 'UPDATE custom_activities SET lease_until = 0 WHERE id = ?', activity.id).run();
    throw caught;
  }
}

async function publishRevision(revisionId, env) {
  if (!env.DB || !env.PRIVATE_FILES || !env.OPENAI_API_KEY) throw new Error('Revision bindings are missing');
  const revision = await query(env.DB, "SELECT * FROM revision_requests WHERE id = ? AND status IN ('queued','generating')", revisionId).first();
  if (!revision) return;
  const order = await query(env.DB, "SELECT * FROM orders WHERE id = ? AND status = 'published'", revision.order_id).first();
  if (!order) throw new Error('Original order is unavailable');
  const entitlement = await query(env.DB, "SELECT * FROM entitlements WHERE order_id = ? AND status = 'active'", order.id).first();
  if (!entitlement || entitlement.revision_success_used >= entitlement.revision_success_limit) throw new Error('Revision allowance exhausted');
  const activity = await query(env.DB, 'SELECT * FROM custom_activities WHERE order_id = ?', order.id).first();
  const previous = await query(env.DB, "SELECT * FROM artifact_versions WHERE custom_activity_id = ? AND status = 'published' ORDER BY version_number DESC LIMIT 1", activity.id).first();
  if (!previous?.story_r2_key) throw new Error('Original story data is unavailable');
  const storyObject = await env.PRIVATE_FILES.get(previous.story_r2_key);
  if (!storyObject || storyObject.customMetadata?.sha256 !== previous.story_sha256) throw new Error('Story data failed integrity check');
  const oldStory = JSON.parse(await new Response(storyObject.body).text());
  const spec = JSON.parse(order.purchase_spec_json);
  const lease = await query(env.DB, `UPDATE revision_requests SET status = 'generating', lease_until = ?, attempts = attempts + 1 WHERE id = ? AND (status = 'queued' OR (status = 'generating' AND COALESCE(lease_until,0) < ?))`, nowSeconds() + 300, revision.id, nowSeconds()).run();
  if (!lease.meta?.changes) return;
  const revisionAttempt = (await query(env.DB, 'SELECT attempts FROM revision_requests WHERE id = ?', revision.id).first()).attempts;
  const attempt = (await query(env.DB, 'SELECT COALESCE(MAX(attempt),0) + 1 AS next FROM generation_usage WHERE order_id = ?', order.id).first()).next;
  try {
    const result = await reviseStage(oldStory, spec, revision.stage_number, revision.instruction, env, env.FETCH || fetch);
    const version = previous.version_number + 1;
    const prefix = `custom/${order.id}/v${version}`;
    const player = buildGamePdf(result.story, spec, 'player'); const guide = buildGamePdf(result.story, spec, 'guide'); const storyJson = JSON.stringify(result.story);
    const playerHash = await sha256Bytes(player); const guideHash = await sha256Bytes(guide); const storyHash = await sha256(storyJson);
    await Promise.all([
      env.PRIVATE_FILES.put(`${prefix}/player.pdf`, player, { httpMetadata: { contentType: 'application/pdf' }, customMetadata: { sha256: playerHash } }),
      env.PRIVATE_FILES.put(`${prefix}/guide.pdf`, guide, { httpMetadata: { contentType: 'application/pdf' }, customMetadata: { sha256: guideHash } }),
      env.PRIVATE_FILES.put(`${prefix}/story.json`, storyJson, { httpMetadata: { contentType: 'application/json' }, customMetadata: { sha256: storyHash } }),
    ]);
    await env.DB.batch([
      query(env.DB, `INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,player_r2_key,guide_r2_key,player_sha256,guide_sha256,story_r2_key,story_sha256) VALUES (?, ?, ?, 'published', ?, ?, ?, ?, ?, ?)`, `artifact-${order.id}-${version}`, activity.id, version, `${prefix}/player.pdf`, `${prefix}/guide.pdf`, playerHash, guideHash, `${prefix}/story.json`, storyHash),
      query(env.DB, `UPDATE entitlements SET revision_success_used = revision_success_used + 1 WHERE order_id = ? AND revision_success_used < revision_success_limit`, order.id),
      query(env.DB, "UPDATE revision_requests SET status = 'published', lease_until = NULL, version_number = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?", version, revision.id),
      query(env.DB, 'INSERT INTO generation_usage (order_id,attempt,response_id,model,input_tokens,output_tokens,status) VALUES (?,?,?,?,?,?,?)', order.id, attempt, result.responseId, env.OPENAI_MODEL, result.usage?.input_tokens || null, result.usage?.output_tokens || null, 'revision-published'),
    ]);
  } catch (caught) {
    await query(env.DB, 'INSERT OR IGNORE INTO generation_usage (order_id,attempt,model,status) VALUES (?,?,?,?)', order.id, attempt, env.OPENAI_MODEL || 'unconfigured', 'revision-failed').run();
    if (revisionAttempt >= 3) await query(env.DB, "UPDATE revision_requests SET status = 'failed', lease_until = NULL, completed_at = CURRENT_TIMESTAMP WHERE id = ?", revision.id).run();
    else await query(env.DB, 'UPDATE revision_requests SET lease_until = 0 WHERE id = ?', revision.id).run();
    throw caught;
  }
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleProductionApi(request, env, context);
    if (env.STAGE_PREVIEW === 'true' && url.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex, nofollow' } });
    const response = await (env.ASSETS?.fetch(request) || error(503, 'ASSETS_NOT_READY', 'Site assets are not configured.'));
    if (env.STAGE_PREVIEW !== 'true') return response;
    const headers = new Headers(response.headers);
    headers.set('x-robots-tag', 'noindex, nofollow');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
  async queue(batch, env) {
    for (const message of batch.messages) {
      try { if (message.body?.type === 'revision') await publishRevision(message.body.revisionId, env); else await publishCustomOrder(message.body?.orderId, env); message.ack(); }
      catch (failure) { console.error('Generation job failed', failure); message.retry(); }
    }
  },
  async scheduled(_controller, env) {
    if (!env.DB) return;
    await env.DB.batch([
      query(env.DB, 'DELETE FROM access_challenges WHERE expires_at < ?', nowSeconds()),
      query(env.DB, 'DELETE FROM access_rate_limits WHERE expires_at < ?', nowSeconds()),
    ]);
    const notices = await query(env.DB, "SELECT order_id,kind FROM delivery_notifications WHERE status = 'pending' AND attempts < 5 LIMIT 20").all();
    for (const item of notices.results || []) {
      try { await dispatchNotification(item.order_id, item.kind, env); }
      catch (caught) { console.error('Notification retry failed', caught); }
    }
    if (!env.GENERATION_QUEUE) return;
    const jobs = await query(env.DB, `SELECT c.order_id FROM custom_activities c JOIN orders o ON o.id = c.order_id
      WHERE c.status IN ('queued','generating') AND COALESCE(c.lease_until,0) < ? AND o.status IN ('paid','fulfilling') LIMIT 20`, nowSeconds()).all();
    const revisions = await query(env.DB, "SELECT id FROM revision_requests WHERE status IN ('queued','generating') AND COALESCE(lease_until,0) < ? LIMIT 20", nowSeconds()).all();
    for (const item of jobs.results || []) await env.GENERATION_QUEUE.send({ orderId: item.order_id });
    for (const item of revisions.results || []) await env.GENERATION_QUEUE.send({ type: 'revision', revisionId: item.id });
  },
};
