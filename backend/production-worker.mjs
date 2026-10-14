import { publicCatalog, offers, productRights, themes } from '../shared/catalog.mjs';
import { ApiError, validateGeneratedStage, validateGeneratedStory, validatePurchase, validateSupportedRange } from './domain.mjs';
import { normalizeEmail, sha256, sha256Bytes, verifyStripeSignature, signAccessToken, verifyAccessToken } from './security.mjs';
import { stripeRequest, checkoutForm, validatePaidSession } from './payments.mjs';
import { aiProvider, generateStory, generateProposals, reviseStage } from './openai.mjs';
import { assembleStagedStory, auditStagedStory, generateBlueprint, repairBlueprint, generateStagedCheckpoint, validateBlueprint } from './staged-story.mjs';
import { buildGamePdf } from './pdf.mjs';
import { verifyGoogleCredential } from './google-auth.mjs';
import { signPreview, confirmPreview } from './creator-preview.mjs';
import { generateSinglePlan } from './plan-proposals.mjs';
import { validatePlan } from '../shared/creator-plan.mjs';
import { startPackRemake, retryPackRemake, packRemakeView, processPackRemake } from './pack-remake.mjs';
import { controlledRevisionStyle } from './controlled-puzzles.mjs';

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const query = (db, sql, ...values) => db.prepare(sql).bind(...values);
const error = (status, code, message) => json({ error: { code, message } }, status);
const nowSeconds = () => Math.floor(Date.now() / 1000);
const nonRetryableStoryCodes = new Set(['GENERATION_INVALID','GENERATION_QA_FAILED','INVALID_SPEC','GENERATION_NOT_CONFIGURED','STAGED_GENERATION_STOPPED']);
const emailHash = (env, email) => sha256(`${env.SESSION_SECRET}|${email}`);
function accessMonths(spec) {
  const months = spec?.onlineRedownloadMonths;
  if (!Number.isInteger(months) || months < 1 || months > 120) throw new Error('Order access policy is missing or invalid');
  return months;
}
const accessActive = entitlement => Boolean(entitlement?.status === 'active' && entitlement.access_expires_at &&
  Date.parse(`${entitlement.access_expires_at.replace(' ', 'T')}Z`) > Date.now());

const MAX_PDF_BYTES = 20 * 1024 * 1024;
async function verifiedPdf(env, file) {
  const object = file?.r2_key && await env.PRIVATE_FILES.get(file.r2_key);
  if (!object || !/^[a-f0-9]{64}$/i.test(file.sha256) || (object.size && object.size > MAX_PDF_BYTES)) {
    throw new ApiError(503, 'FILE_INTEGRITY_FAILED', 'The file is temporarily unavailable.');
  }
  const bytes = new Uint8Array(await new Response(object.body).arrayBuffer());
  if (!bytes.length || bytes.length > MAX_PDF_BYTES || (file.bytes && bytes.length !== file.bytes) ||
      await sha256Bytes(bytes) !== file.sha256) {
    throw new ApiError(503, 'FILE_INTEGRITY_FAILED', 'The file is temporarily unavailable.');
  }
  return bytes;
}

const cloudflareEmailReady = env => env.EMAIL_PUBLIC_DESTINATIONS_READY === 'true' && typeof env.EMAIL?.send === 'function';
const emailReady = env => Boolean(env.EMAIL_FROM && (cloudflareEmailReady(env) || env.RESEND_API_KEY));
const accountReady = env => Boolean(env.ACCOUNT_ENABLED === 'true' && env.DB && env.SESSION_SECRET && env.GOOGLE_CLIENT_ID && env.PUBLIC_ORIGIN);

function paymentReady(env) {
  return Boolean(env.DB && env.PRIVATE_FILES && emailReady(env) && env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.SESSION_SECRET && env.PUBLIC_ORIGIN &&
    env.CHECKOUT_ENABLED === 'true' && env.LEGAL_RELEASED === 'true' && env.TAX_CONFIGURED === 'true' &&
    (env.STRIPE_SECRET_KEY.startsWith('sk_test_') || (env.LIVE_PAYMENTS_ENABLED === 'true' && env.STRIPE_SECRET_KEY.startsWith('sk_live_'))));
}
const rangeReady = env => [env.SUPPORTED_AGE_MIN,env.SUPPORTED_AGE_MAX,env.HOME_PLAYER_MAX,env.CLASSROOM_STUDENT_MAX].every(value => Number.isInteger(Number(value)) && Number(value) > 0) && Number(env.SUPPORTED_AGE_MAX) >= Number(env.SUPPORTED_AGE_MIN) && Number(env.HOME_PLAYER_MAX) >= 2 && Number(env.CLASSROOM_STUDENT_MAX) >= 2;
const generationReady = env => Boolean(aiProvider(env) && env.GENERATION_QUEUE && env.PRIVATE_FILES && rangeReady(env));
async function paidPlanSchemaReady(env) {
  if (!env.DB) return false;
  try { return Boolean(await query(env.DB,"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'custom_plan_orders'").first()); }
  catch { return false; }
}
const offeredFor = (themeId, setting) => themes.find(theme => theme.id === themeId)?.availableSettings?.includes(setting) ?? false;

async function publishedLegal(env) {
  if (!env.DB) return null;
  const result = await query(env.DB, "SELECT kind,version,title,effective_at,sections_json FROM legal_documents WHERE status = 'published' ORDER BY effective_at DESC").all();
  const byKind = new Map();
  for (const item of result.results || []) if (!byKind.has(item.kind)) byKind.set(item.kind, item);
  return byKind;
}
const testCheckoutReady = env => Boolean(env.TEST_CHECKOUT_ENABLED === 'true' && env.STAGE_PREVIEW === 'true' &&
  env.DB && env.PRIVATE_FILES && emailReady(env) && accountReady(env) &&
  env.STRIPE_SECRET_KEY?.startsWith('sk_test_') && env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_') &&
  generationReady(env));
async function checkoutReady(env) { return testCheckoutReady(env) || (paymentReady(env) && (await publishedLegal(env))?.size === 4); }

async function liveCatalog(env) {
  const base = publicCatalog();
  if (!env.DB) return base;
  const visibleWorlds = await query(env.DB, "SELECT id FROM theme_worlds WHERE status = 'published'").all();
  const visibleIds = new Set((visibleWorlds.results || []).map(world => world.id));
  const testOnly = testCheckoutReady(env);
  const result = await query(env.DB, `SELECT p.id,p.theme_world_id,p.setting,p.version,p.status FROM ready_packs p JOIN theme_worlds w ON w.id = p.theme_world_id
    WHERE ((p.status = 'published' AND p.theme_world_id <> 'celebration') OR
      (? = 1 AND p.status = 'internal_test' AND p.theme_world_id <> 'celebration') OR
      (p.status IN ('release_ready','published') AND p.theme_world_id = 'celebration'))
      AND w.status = 'published' AND (SELECT COUNT(*) FROM ready_pack_files f WHERE f.ready_pack_id = p.id) = 4
    ORDER BY p.published_at DESC, p.version DESC`, testOnly ? 1 : 0).all();
  const ready = result.results || [];
  const variantRows = await query(env.DB, `SELECT ready_pack_id,variant_id FROM ready_pack_variants
    WHERE status = 'published' OR (? = 1 AND status = 'internal_test')
    GROUP BY ready_pack_id,variant_id HAVING COUNT(*) = 4`, testOnly ? 1 : 0).all();
  const variantsFor = pack => (variantRows.results || []).filter(row => row.ready_pack_id === pack?.id).map(row => row.variant_id);
  const trialPacks = ready.filter(pack => pack.theme_world_id === 'celebration');
  const free = env.FREE_SAMPLE_ENABLED === 'true' &&
    ['home','classroom'].every(setting => trialPacks.some(pack => pack.setting === setting));
  const prices = await query(env.DB, 'SELECT sku,unit_amount,currency FROM price_versions WHERE sale_enabled = 1').all();
  const liveSkus = new Set((prices.results || []).filter(price => offers.some(offer => offer.sku === price.sku && offer.unitAmount === price.unit_amount && price.currency === 'USD')).map(price => price.sku));
  const availablePaidPack = setting => ready.some(pack => pack.setting === setting && offeredFor(pack.theme_world_id, setting) && pack.theme_world_id !== 'celebration' && pack.status === (testOnly ? 'internal_test' : 'published'));
  const readyStatus = (themeId, setting) => !offeredFor(themeId, setting) ? 'not_offered' : themeId === 'celebration'
    ? (free ? 'downloadable_trial' : 'not_published')
    : (ready.some(pack => pack.theme_world_id === themeId && pack.setting === setting && pack.status === 'published') ? 'published'
      : testOnly && ready.some(pack => pack.theme_world_id === themeId && pack.setting === setting && pack.status === 'internal_test') ? 'test_ready' : 'not_published');
  const canCheckout = await checkoutReady(env);
  const planSchemaReady = await paidPlanSchemaReady(env);
  return { ...base, publicationState: canCheckout || free ? 'partially_configured' : base.publicationState,
    freeSampleThemeId: free ? 'celebration' : null,
    themes: themes.filter(theme => visibleIds.has(theme.id)).map(theme => ({ ...theme, home: { readyStatus: readyStatus(theme.id, 'home'), freeSample: free && theme.id === 'celebration', packVersion: ready.find(pack => pack.theme_world_id === theme.id && pack.setting === 'home')?.version || null },
      classroom: { readyStatus: readyStatus(theme.id, 'classroom'), freeSample: free && theme.id === 'celebration', packVersion: ready.find(pack => pack.theme_world_id === theme.id && pack.setting === 'classroom')?.version || null,
        variantIds: variantsFor(ready.find(pack => pack.theme_world_id === theme.id && pack.setting === 'classroom')) } })),
    offers: offers.map(offer => ({ ...offer, saleEnabled: canCheckout && liveSkus.has(offer.sku) && (offer.kind === 'custom' ? generationReady(env) && planSchemaReady : availablePaidPack(offer.setting)) })) };
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

async function testReadyCatalog(request, env) {
  if (!testCheckoutReady(env)) throw new ApiError(404, 'NOT_FOUND', 'Test packs are not available.');
  const rows = await query(env.DB, `SELECT p.id,p.theme_world_id,p.setting,p.version FROM ready_packs p
    JOIN theme_worlds w ON w.id = p.theme_world_id
    WHERE p.status = 'internal_test' AND p.theme_world_id <> 'celebration' AND w.status = 'published'
      AND (SELECT COUNT(*) FROM ready_pack_files f WHERE f.ready_pack_id = p.id) = 4
    ORDER BY p.theme_world_id,p.setting,p.version DESC`).all();
  const variants = await query(env.DB, `SELECT ready_pack_id,variant_id FROM ready_pack_variants
    WHERE status = 'internal_test' GROUP BY ready_pack_id,variant_id HAVING COUNT(*) = 4`).all();
  const seen = new Set();
  const packs = [];
  for (const row of rows.results || []) {
    const slot = row.theme_world_id + '/' + row.setting;
    if (seen.has(slot) || !offeredFor(row.theme_world_id, row.setting)) continue;
    seen.add(slot);
    packs.push({ themeId: row.theme_world_id, setting: row.setting, version: row.version,
      variantIds: (variants.results || []).filter(item => item.ready_pack_id === row.id).map(item => item.variant_id) });
  }
  return json({ packs, mode: 'stripe_test' });
}

async function testPackPreview(request, env, themeId, setting, previewPage = null) {
  if (!testCheckoutReady(env) || !['home','classroom'].includes(setting) ||
      ![null, 1, 2].includes(previewPage) ||
      !offeredFor(themeId, setting) || themeId === 'celebration') {
    throw new ApiError(404, 'NOT_FOUND', 'Preview not found.');
  }
  const pack = await query(env.DB, `SELECT p.version FROM ready_packs p JOIN theme_worlds w ON w.id = p.theme_world_id
    WHERE p.theme_world_id = ? AND p.setting = ? AND p.status = 'internal_test' AND w.status = 'published'
      AND (SELECT COUNT(*) FROM ready_pack_files f WHERE f.ready_pack_id = p.id) = 4
    ORDER BY p.version DESC LIMIT 1`, themeId, setting).first();
  if (!pack || !/^v[0-9]+(?:[.][0-9]+){1,2}$/.test(pack.version)) throw new ApiError(404, 'NOT_FOUND', 'Preview not found.');
  const key = `internal/draft-previews/${themeId}/${setting}/${pack.version}-p${previewPage ?? 1}.jpg`;
  const object = await env.PRIVATE_FILES.get(key);
  if (!object || object.size > 3 * 1024 * 1024) throw new ApiError(404, 'NOT_FOUND', 'Preview not found.');
  const bytes = new Uint8Array(await new Response(object.body).arrayBuffer());
  if (bytes.length < 10000 || bytes.length > 3 * 1024 * 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new ApiError(503, 'PREVIEW_INVALID', 'The preview is temporarily unavailable.');
  }
  return new Response(bytes, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff' } });
}

async function checkout(request, env) {
  if (!await checkoutReady(env)) throw new ApiError(503, 'CHECKOUT_NOT_READY', 'Purchases are not open. No payment was created.');
  requireSameOrigin(request, env);
  const input = await requestBody(request);
  const email = normalizeEmail(input.email);
  const testOnly = testCheckoutReady(env);
  const { offer, spec } = validatePurchase(input);
  const accountHash = await authenticatedEmailHash(request, env);
  const accountRequired = testOnly || offer.kind === 'custom';
  if (accountRequired && !accountHash) throw new ApiError(403, 'ACCOUNT_REQUIRED', 'Sign in with your adult account before checkout.');
  if (!accountRequired && !email) throw new ApiError(400, 'INVALID_EMAIL', 'Enter an adult email address.');
  if (accountRequired && email && accountHash !== await emailHash(env, email))
    throw new ApiError(403, 'ACCOUNT_EMAIL_MISMATCH', 'Use the email linked to your adult account.');
  if (offer.kind === 'custom' && (!generationReady(env) || spec.creatorVersion===3 && !await paidPlanSchemaReady(env))) throw new ApiError(503, 'GENERATION_NOT_READY', 'Custom generation is not available.');
  if (offer.kind === 'custom') validateSupportedRange(spec, env);
  if (offer.kind === 'custom') {
    if (spec.creatorVersion === 2) {
      await confirmPreview(spec,accountHash,env.SESSION_SECRET);
      if (!spec.planConfirmed) throw new ApiError(409,'PREVIEW_CONFIRMATION_REQUIRED','Confirm your five-checkpoint plan before checkout.');
    } else if (spec.creatorVersion !== 3) throw new ApiError(409,'SETUP_UPDATE_REQUIRED','Update your custom setup before checkout.');
  }
  if (offer.kind === 'ready' && spec.themeId === 'celebration') throw new ApiError(409, 'SAMPLE_IS_FREE', 'Celebration is the free sample theme and is not sold as a ready-made pack.');
  if (offer.kind === 'ready' && !offeredFor(spec.themeId, spec.setting)) throw new ApiError(409, 'EDITION_RETIRED', 'This ready-made edition is no longer offered. Existing orders remain available in My adventures.');
  const key = request.headers.get('Idempotency-Key');
  if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw new ApiError(400, 'IDEMPOTENCY_REQUIRED', 'A valid idempotency key is required.');
  const price = await query(env.DB, 'SELECT * FROM price_versions WHERE sku = ? AND sale_enabled = 1 ORDER BY created_at DESC LIMIT 1', offer.sku).first();
  if (!price || price.currency !== 'USD' || price.unit_amount !== offer.unitAmount || (!testOnly && !price.stripe_price_id) || price.tax_behavior === 'unknown') throw new ApiError(503, 'OFFER_NOT_READY', 'This product is not available for checkout.');
  let readyPack = null;
  if (offer.kind === 'ready') {
    readyPack = await query(env.DB, "SELECT p.* FROM ready_packs p JOIN theme_worlds w ON w.id = p.theme_world_id WHERE p.theme_world_id = ? AND p.setting = ? AND p.version = ? AND p.status = ? AND w.status = 'published'", spec.themeId, spec.setting, spec.packVersion, testOnly ? 'internal_test' : 'published').first();
    if (!readyPack) throw new ApiError(503, 'PACK_NOT_PUBLISHED', 'This ready-made pack is not published.');
    const files = await query(env.DB, 'SELECT paper, role FROM ready_pack_files WHERE ready_pack_id = ?', readyPack.id).all();
    if (files.results?.length !== 4) throw new ApiError(503, 'PACK_FILES_INCOMPLETE', 'The printable pack is incomplete.');
    if (spec.variantId) {
      const variantFiles = await query(env.DB, "SELECT paper, role FROM ready_pack_variants WHERE ready_pack_id = ? AND variant_id = ? AND status = ?", readyPack.id, spec.variantId, testOnly ? 'internal_test' : 'published').all();
      if (variantFiles.results?.length !== 4) throw new ApiError(503, 'PACK_VARIANT_NOT_READY', 'This classroom story wording is not available.');
    }
  }
  const buyerHash = accountRequired ? accountHash : await emailHash(env, email);
  const legal = testOnly ? null : await publishedLegal(env);
  const legalVersions = testOnly ? { testMode: 'stripe-sandbox-2026-10-09' } : Object.fromEntries([...legal].map(([kind, item]) => [kind, item.version]));
  const specJson = JSON.stringify({ ...spec, readyPackId: readyPack?.id || null, priceVersionId: price.id, licenceVersion: readyPack?.licence_version || env.CUSTOM_LICENCE_VERSION,
    accessPolicyVersion: productRights.version, onlineRedownloadMonths: productRights.onlineRedownloadMonths,
    accessStarts: offer.kind === 'ready' ? productRights.readyAccessStarts : productRights.customAccessStarts, legalVersions });
  const specHash = await sha256(specJson);
  let order = await query(env.DB, 'SELECT * FROM orders WHERE idempotency_key = ?', key).first();
  if (order && (order.purchase_spec_sha256 !== specHash || order.purchaser_email_hash !== buyerHash)) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'This request key was used for another purchase.');
  if (!order && offer.kind === 'ready') {
    const existing = await query(env.DB, "SELECT * FROM orders WHERE purchaser_email_hash = ? AND purchase_spec_sha256 = ? AND status = 'pending_payment' AND created_at > datetime('now','-23 hours') ORDER BY created_at DESC LIMIT 1", buyerHash, specHash).first();
    if (existing?.stripe_checkout_session_id && existing.checkout_url) {
      const activeSession = await stripeRequest(env, 'checkout/sessions/' + encodeURIComponent(existing.stripe_checkout_session_id), {}, env.FETCH || fetch);
      if (activeSession.status === 'open' && activeSession.expires_at > nowSeconds())
        return json({ orderId: existing.id, checkoutUrl: existing.checkout_url, mode: testOnly ? 'stripe_test' : 'stripe' });
      if (activeSession.status === 'complete' && activeSession.payment_status === 'paid')
        return json({ orderId: existing.id, checkoutUrl: new URL('/en/orders/' + existing.id + '/', env.PUBLIC_ORIGIN).href, mode: testOnly ? 'stripe_test' : 'stripe' });
    }
  }
  if (!order) {
    const id = crypto.randomUUID();
    await query(env.DB, `INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,idempotency_key)
      VALUES (?,?,?,?,?,?,?,?,?,'pending_payment',?)`, id, offer.kind, offer.sku, specJson, specHash, buyerHash, price.id, price.unit_amount, 'USD', key).run();
    order = await query(env.DB, 'SELECT * FROM orders WHERE id = ?', id).first();
  }
  if (order.checkout_url && order.stripe_checkout_session_id) return json({ orderId: order.id, checkoutUrl: order.checkout_url, mode: 'stripe' });
  const origin = new URL(env.PUBLIC_ORIGIN).origin;
  const form = checkoutForm({ orderId: order.id, email, priceId: testOnly ? null : price.stripe_price_id,
    inlinePrice: testOnly ? { name: `Paper Adventure ${spec.themeId || 'original'} ${offer.setting} ${offer.kind} test`, unitAmount: offer.unitAmount } : null, specHash,
    successUrl: `${origin}/en/orders/${order.id}/?checkout=returned`, cancelUrl: `${origin}/en/checkout/?cancelled=1`, automaticTax: !testOnly });
  const session = await stripeRequest(env, 'checkout/sessions', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `paw-${order.id}` }, body: form.toString() }, env.FETCH || fetch);
  if (!session.id || !session.url || session.client_reference_id !== order.id) throw new ApiError(502, 'PAYMENT_PROVIDER_ERROR', 'Payment session could not be verified.');
  await query(env.DB, 'UPDATE orders SET stripe_checkout_session_id = ?, checkout_url = ? WHERE id = ? AND status = ?', session.id, session.url, order.id, 'pending_payment').run();
  return json({ orderId: order.id, checkoutUrl: session.url, mode: testOnly ? 'stripe_test' : 'stripe' }, 201);
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
  const testOrder = JSON.parse(order.purchase_spec_json).legalVersions?.testMode === 'stripe-sandbox-2026-10-09';
  if (testOrder && (event.livemode !== false || session.livemode !== false)) throw new ApiError(409, 'PAYMENT_MODE_MISMATCH', 'A test order requires a Stripe test event.');
  const price = await query(env.DB, 'SELECT * FROM price_versions WHERE id = ?', order.price_version_id).first();
  if (!price || !validatePaidSession(session, order, price)) throw new ApiError(409, 'PAYMENT_MISMATCH', 'Payment event does not match the order snapshot.');
  const existing = await query(env.DB, 'SELECT stripe_event_id FROM webhook_events WHERE stripe_event_id = ?', event.id).first();
  if (existing) {
    if (order.product_kind === 'custom' && env.GENERATION_QUEUE) {
      if (JSON.parse(order.purchase_spec_json).creatorVersion === 3) {
        const pending = await query(env.DB,"SELECT id FROM custom_plan_requests WHERE order_id = ? AND status IN ('queued','generating') ORDER BY created_at DESC LIMIT 1",order.id).first();
        if (pending) await env.GENERATION_QUEUE.send({type:'plan',requestId:pending.id});
      } else {
        const activity = await query(env.DB, 'SELECT status FROM custom_activities WHERE order_id = ?', order.id).first();
        if (activity?.status === 'queued') await env.GENERATION_QUEUE.send({ orderId: order.id });
      }
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
    if (spec.creatorVersion === 3) {
      statements.push(query(env.DB,"INSERT OR IGNORE INTO custom_plan_orders (order_id,status) VALUES (?,'queued')",order.id));
      statements.push(query(env.DB,"INSERT OR IGNORE INTO custom_plan_requests (id,order_id,kind,status) VALUES (?,?,'initial','queued')",`plan-${order.id}-initial`,order.id));
    }
  }
  statements.push(query(env.DB, "INSERT OR IGNORE INTO delivery_notifications (order_id,kind,status) VALUES (?,?,'pending')", order.id, order.product_kind === 'ready' ? 'files_ready' : 'payment'));
  await env.DB.batch(statements);
  if (order.product_kind === 'custom' && env.GENERATION_QUEUE) await env.GENERATION_QUEUE.send(spec.creatorVersion === 3 ? {type:'plan',requestId:`plan-${order.id}-initial`} : {orderId:order.id});
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
  if (env.EMAIL_LOGIN_ENABLED !== 'true' && email !== env.ACCOUNT_TEST_EMAIL) throw new ApiError(503, 'EMAIL_NOT_READY', 'Email verification is not available yet.');
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
    const paidSpec = JSON.parse(order.purchase_spec_json || '{}');
    const messages = {
      payment: { subject: 'Your Paper Adventure order is being prepared', intro: paidSpec.creatorVersion === 3 ? 'Payment is confirmed. Your personal plan is being prepared for review. Approve a plan before printable PDFs are generated. Verify your email to see progress:' : 'Payment is confirmed. Your custom adventure is being generated and checked. Verify your email to see order progress:' },
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

async function dispatchDeliveryIncident(orderId, env) {
  if (!emailReady(env)) return;
  const incident = await query(env.DB,"SELECT * FROM custom_delivery_incidents WHERE order_id = ? AND status = 'open' AND alert_status = 'pending' AND alert_attempts < 5",orderId).first();
  if (!incident) return;
  const recipient = normalizeEmail(env.OPERATIONS_EMAIL || 'support@paperadventure.app');
  if (!recipient) return;
  const text = `A paid custom order needs delivery recovery.\nOrder: ${orderId}\nStage: ${incident.phase}\nError: ${incident.error_code}\nReview the private generation record and the order at ${new URL(env.PUBLIC_ORIGIN).origin}/en/orders/${orderId}/. Do not ask the customer to pay again.`;
  try {
    if (cloudflareEmailReady(env)) await env.EMAIL.send({from:env.EMAIL_FROM,to:recipient,subject:`Paid custom delivery stopped · ${orderId.slice(0,8)}`,text});
    else {
      const response = await (env.FETCH || fetch)('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json','Idempotency-Key':`paw-delivery-incident-${orderId}`},body:JSON.stringify({from:env.EMAIL_FROM,to:[recipient],subject:`Paid custom delivery stopped · ${orderId.slice(0,8)}`,text})});
      if (!response.ok) throw new Error('Operator delivery alert could not be sent');
    }
    await query(env.DB,"UPDATE custom_delivery_incidents SET alert_status = 'sent',alerted_at = CURRENT_TIMESTAMP,alert_attempts = alert_attempts + 1 WHERE order_id = ?",orderId).run();
  } catch (caught) {
    await query(env.DB,'UPDATE custom_delivery_incidents SET alert_attempts = alert_attempts + 1 WHERE order_id = ?',orderId).run();
    throw caught;
  }
}

async function proposals(request, env) {
  if (!env.DB || !env.SESSION_SECRET || env.LEGACY_PROPOSALS_ENABLED !== 'true' || !aiProvider(env)) throw new ApiError(410, 'PREPAYMENT_PLANS_CLOSED', 'Personal plans are created only after confirmed payment.');
  requireSameOrigin(request, env);
  const accountHash = await authenticatedEmailHash(request, env);
  if (!accountHash) throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in with Google to preview story ideas.');
  const ip = request.headers.get('cf-connecting-ip');
  if (!ip) throw new ApiError(403, 'VISITOR_UNVERIFIED', 'Visitor verification is unavailable.');
  const input = await requestBody(request);
  const { spec } = validatePurchase({ ...input, sku: input.setting === 'classroom' ? 'custom_classroom' : 'custom_home', direction: 'mystery', paper: input.paper || 'A4' });
  validateSupportedRange(spec, env);
  const visitorHash = await sha256(`${env.SESSION_SECRET}|${ip}|${accountHash}`);
  const bucket = await sha256(`${accountHash}|proposals|${Math.floor(nowSeconds() / 86400)}`);
  await query(env.DB, `INSERT INTO access_rate_limits (bucket,hits,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1`, bucket, nowSeconds() + 86400).run();
  const count = await query(env.DB, 'SELECT hits FROM access_rate_limits WHERE bucket = ?', bucket).first();
  if (count.hits > 2) {
    await query(env.DB,'UPDATE access_rate_limits SET hits = MAX(0,hits - 1) WHERE bucket = ?',bucket).run();
    throw new ApiError(429, 'PROPOSAL_LIMIT', 'Your two free previews for today are used. Your saved plans remain available.');
  }
  // Reserve before calling AI, release on failure. Separate attempt throttling
  // protects against repeated failures without charging the successful quota.
  try {
    const attempts = `${bucket}-attempts`;
    await query(env.DB,`INSERT INTO access_rate_limits (bucket,hits,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1`,attempts,nowSeconds()+86400).run();
    if ((await query(env.DB,'SELECT hits FROM access_rate_limits WHERE bucket = ?',attempts).first()).hits > 12) throw new ApiError(429,'PROPOSAL_ATTEMPT_LIMIT','Too many preview attempts today. Your saved plans remain available.');
    const result = await generateProposals(spec, env, env.FETCH || fetch);
    const plans = await Promise.all(result.proposals.map(async plan=>({...plan,...(spec.creatorVersion===2 ? {previewToken:await signPreview(plan,spec,accountHash,env.SESSION_SECRET)} : {})})));
    await query(env.DB, 'INSERT INTO proposal_usage (id,visitor_hash,model,input_tokens,output_tokens) VALUES (?,?,?,?,?)', crypto.randomUUID(), visitorHash, aiProvider(env)?.model, result.usage?.input_tokens || null, result.usage?.output_tokens || null).run();
    const used = (await query(env.DB,'SELECT hits FROM access_rate_limits WHERE bucket = ?',bucket).first()).hits;
    return json({proposals:plans,remaining:Math.max(0,2-used),creatorVersion:spec.creatorVersion || 1});
  } catch (failure) {
    await query(env.DB,'UPDATE access_rate_limits SET hits = MAX(0,hits - 1) WHERE bucket = ?',bucket).run();
    throw failure;
  }
}

async function previewAllowance(request,env) {
  if (env.LEGACY_PROPOSALS_ENABLED !== 'true') return json({remaining:0,closed:true});
  if (!env.DB || !env.SESSION_SECRET) return json({remaining:null});
  const owner = await authenticatedEmailHash(request,env);
  if (!owner) return json({remaining:null});
  const bucket = await sha256(`${owner}|proposals|${Math.floor(nowSeconds()/86400)}`);
  const row = await query(env.DB,'SELECT hits FROM access_rate_limits WHERE bucket = ?',bucket).first();
  return json({remaining:Math.max(0,2-(row?.hits||0))});
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

function googleLoginConfig(request, env) {
  if (!accountReady(env)) return json({ available: false });
  const nonce = crypto.randomUUID().replaceAll('-', '');
  const secure = new URL(env.PUBLIC_ORIGIN || request.url).protocol === 'https:' ? '; Secure' : '';
  return json({ available: true, clientId: env.GOOGLE_CLIENT_ID, nonce }, 200,
    { 'set-cookie': 'paw_google_nonce=' + nonce + '; HttpOnly' + secure + '; SameSite=Lax; Path=/api/v1/auth/google; Max-Age=300' });
}

async function googleLogin(request, env) {
  if (!accountReady(env)) throw new ApiError(503, 'GOOGLE_LOGIN_NOT_READY', 'Google sign-in is not available yet.');
  requireSameOrigin(request, env);
  const nonce = (request.headers.get('cookie') || '').match(/(?:^|;\s*)paw_google_nonce=([a-f0-9]{32})(?:;|$)/)?.[1];
  if (!nonce) throw new ApiError(403, 'GOOGLE_LOGIN_EXPIRED', 'Sign-in expired. Please try again.');
  const body = await requestBody(request);
  const identity = await verifyGoogleCredential(body.credential, {
    clientId: env.GOOGLE_CLIENT_ID, nonce, fetcher: env.FETCH || fetch,
  });
  const hash = await emailHash(env, identity.email);
  const session = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: hash, email: identity.email, exp: nowSeconds() + 7 * 86400 });
  const secure = new URL(env.PUBLIC_ORIGIN || request.url).protocol === 'https:' ? '; Secure' : '';
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  headers.append('set-cookie', 'paw_session=' + session + '; HttpOnly' + secure + '; SameSite=Lax; Path=/; Max-Age=604800');
  headers.append('set-cookie', 'paw_google_nonce=; HttpOnly' + secure + '; SameSite=Lax; Path=/api/v1/auth/google; Max-Age=0');
  return new Response(JSON.stringify({ authenticated: true }), { headers });
}

async function myOrders(request, env) {
  if (!env.DB || !env.SESSION_SECRET) throw new ApiError(503, 'ACCOUNT_NOT_READY', 'Account storage is not configured.');
  const hash = await authenticatedEmailHash(request, env);
  if (!hash) throw new ApiError(401, 'EMAIL_VERIFICATION_REQUIRED', 'Sign in with Google first.');
  const rows = await query(env.DB, 'SELECT id,sku,product_kind,status,currency,amount_total,created_at,paid_at,purchase_spec_json FROM orders WHERE purchaser_email_hash = ? ORDER BY created_at DESC LIMIT 50', hash).all();
  const orders = await Promise.all((rows.results || []).map(async order => {
    let spec = {}; try { spec = JSON.parse(order.purchase_spec_json || '{}'); } catch {}
    const setting = order.sku.endsWith('_classroom') ? 'classroom' : 'home';
    const world = themes.find(theme => theme.id === spec.themeId);
    const story = world?.story?.[setting];
    const entitlement = order.status === 'published' ? await query(env.DB, 'SELECT * FROM entitlements WHERE order_id = ?', order.id).first() : null;
    const expired = order.status === 'failed' && !order.paid_at ? await query(env.DB, "SELECT event_type FROM webhook_events WHERE order_id = ? AND event_type = 'checkout.session.expired' LIMIT 1", order.id).first() : null;
    const paidPlan = order.product_kind === 'custom' && spec.creatorVersion === 3 && ['paid','fulfilling','failed'].includes(order.status)
      ? await query(env.DB,'SELECT status,confirmed_version FROM custom_plan_orders WHERE order_id = ?',order.id).first() : null;
    const failedDelivery = order.product_kind === 'custom' && order.status === 'failed' && order.paid_at
      ? await query(env.DB,'SELECT status,delivery_retry_used FROM custom_activities WHERE order_id = ?',order.id).first() : null;
    const lastPdfFailure = failedDelivery
      ? await query(env.DB,"SELECT phase,error_code FROM generation_usage WHERE order_id = ? AND status = 'failed' ORDER BY attempt DESC LIMIT 1",order.id).first() : null;
    const { purchase_spec_json, ...safe } = order;
    return { ...safe, checkoutExpired: Boolean(expired), setting, themeId: spec.themeId, title: order.product_kind === 'ready' ? story?.title || world?.title || 'Ready-made adventure' : spec.proposalTitle || spec.customIdea || 'Custom adventure',
      image: order.product_kind === 'ready' ? story?.image || world?.image : '/assets/custom-adventure-workshop-v1.jpg',
      paper: spec.paper, planStatus: paidPlan?.status || null,
      deliveryRetryAvailable: Boolean(order.paid_at && paidPlan?.confirmed_version && failedDelivery?.status === 'failed' && !failedDelivery.delivery_retry_used && !(lastPdfFailure?.phase === 'story' && nonRetryableStoryCodes.has(lastPdfFailure.error_code)) && lastPdfFailure?.error_code !== 'STORY_CHECKPOINT_MISMATCH'),
      filesReady: Boolean(order.status === 'published' && accessActive(entitlement)), accessExpiresAt: entitlement?.access_expires_at || null };
  }));
  return json({ orders });
}

async function savedDraft(request, env) {
  if (!env.DB || !env.SESSION_SECRET) throw new ApiError(503, 'ACCOUNT_NOT_READY', 'Account storage is not configured.');
  const hash = await authenticatedEmailHash(request, env);
  if (!hash) throw new ApiError(401, 'EMAIL_VERIFICATION_REQUIRED', 'Sign in with Google first.');
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
  if (spec.creatorVersion === 2) await confirmPreview(spec,hash,env.SESSION_SECRET,true);
  await query(env.DB, `INSERT INTO adult_drafts (email_hash,draft_json) VALUES (?,?) ON CONFLICT(email_hash) DO UPDATE SET draft_json = excluded.draft_json, updated_at = CURRENT_TIMESTAMP`, hash, JSON.stringify(spec)).run();
  return json({ saved: true, ...(spec.creatorVersion===2 ? {previewToken:spec.previewToken} : {}) });
}

async function freeSample(request, env, setting, paper, role) {
  if (!env.DB || !env.PRIVATE_FILES || env.FREE_SAMPLE_ENABLED !== 'true') throw new ApiError(404, 'SAMPLE_NOT_PUBLISHED', 'The free sample is not published.');
  const catalog = await liveCatalog(env);
  if (catalog.freeSampleThemeId !== 'celebration') throw new ApiError(404, 'SAMPLE_NOT_PUBLISHED', 'Both free sample editions must be ready before download.');
  const pack = await query(env.DB, "SELECT p.* FROM ready_packs p JOIN theme_worlds w ON w.id = p.theme_world_id WHERE p.theme_world_id = 'celebration' AND p.setting = ? AND p.status IN ('release_ready','published') AND w.status = 'published' AND (SELECT COUNT(*) FROM ready_pack_files f WHERE f.ready_pack_id = p.id) = 4 ORDER BY p.published_at DESC, p.version DESC LIMIT 1", setting).first();
  if (!pack) throw new ApiError(404, 'SAMPLE_NOT_PUBLISHED', 'The free sample is not published.');
  const file = await query(env.DB, 'SELECT * FROM ready_pack_files WHERE ready_pack_id = ? AND paper = ? AND role = ?', pack.id, paper, role).first();
  if (!file) throw new ApiError(404, 'FILE_NOT_FOUND', 'The sample file is unavailable.');
  const bytes = await verifiedPdf(env, file);
  return new Response(bytes, { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="celebration-${setting}-${role}-${paper}.pdf"`, 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff' } });
}

async function orderView(request, env, orderId) {
  if (!env.DB || !env.SESSION_SECRET) throw new ApiError(503, 'ORDER_ACCESS_NOT_READY', 'Verified order access is not configured.');
  const hash = await authenticatedEmailHash(request, env);
  if (!hash) throw new ApiError(401, 'EMAIL_VERIFICATION_REQUIRED', 'Sign in with Google using your purchase email first.');
  const order = await query(env.DB, 'SELECT * FROM orders WHERE id = ? AND purchaser_email_hash = ?', orderId, hash).first();
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'No verified order was found.');
  const entitlement = await query(env.DB, 'SELECT * FROM entitlements WHERE order_id = ?', order.id).first();
  const activity = order.product_kind === 'custom' ? await query(env.DB, 'SELECT status,delivery_retry_used,delivery_retry_baseline,generation_version FROM custom_activities WHERE order_id = ?', order.id).first() : null;
  const latestArtifact = activity && entitlement?.custom_activity_id ? await query(env.DB, "SELECT pack_format_version FROM artifact_versions WHERE custom_activity_id = ? AND status = 'published' ORDER BY version_number DESC LIMIT 1", entitlement.custom_activity_id).first() : null;
  const remake = order.product_kind === 'custom' && order.paid_at ? await packRemakeView(env.DB, order.id) : null;
  const readyRemakeSpec = latestArtifact?.pack_format_version === 2 && remake?.status === 'ready'
    ? await query(env.DB, "SELECT spec_json FROM custom_pack_remakes WHERE order_id = ? AND status = 'ready'", order.id).first() : null;
  const pdfRows = order.product_kind === 'custom' ? (await query(env.DB, "SELECT attempt,status,phase,round_number,trigger_kind,created_at,completed_at,error_code FROM generation_usage WHERE order_id = ? AND status IN ('generating','published','failed') ORDER BY attempt", order.id).all()).results || [] : [];
  const failureMessages = {
    GENERATION_UPSTREAM_FAILED: 'The story generation service did not complete.',
    GENERATION_EMPTY: 'The story generation service returned no usable content.',
    GENERATION_INVALID: 'The generated story did not pass validation.',
    GENERATION_QA_FAILED: 'The generated story did not pass quality checks.',
    STORY_CHECKPOINT_MISMATCH: 'The approved story changed after it was checked; support must review this order.',
    AUDIT_UPSTREAM_FAILED: 'The independent story check could not complete.',
    AUDIT_INVALID: 'The independent story check returned an unusable result.',
    STORED_PDF_MISMATCH: 'The saved PDF files did not pass the integrity check.',
    STAGED_GENERATION_STOPPED: 'Game creation stopped at a saved step. Your payment and completed work remain on this order.',
  };
  let firstRoundAttempts = 0;
  let retryRoundAttempts = 0;
  const pdfGenerationHistory = pdfRows.map((row, index) => {
    const round = row.round_number || (activity?.delivery_retry_baseline && index >= activity.delivery_retry_baseline ? 2 : 1);
    const attemptInRound = round === 2 ? ++retryRoundAttempts : ++firstRoundAttempts;
    const trigger = row.trigger_kind || (attemptInRound > 1 ? 'automatic_retry' : round === 2 ? 'customer_retry' : 'initial');
    const status = row.status === 'generating' && (order.status === 'failed' || index < pdfRows.length - 1) ? 'interrupted' : row.status;
    return { attempt: row.attempt, round, attemptInRound, trigger, status,
      phase: row.phase || null, recordedAt: row.completed_at || row.created_at,
      failureReason: failureMessages[row.error_code] || null,
      detailsRecorded: Boolean(row.phase) };
  });
  const failedAttempts = pdfGenerationHistory.filter(item => item.status === 'failed').length;
  const lastPdfFailure = pdfRows.filter(item => item.status === 'failed').at(-1);
  const retryBlocked = (lastPdfFailure?.phase === 'story' && nonRetryableStoryCodes.has(lastPdfFailure.error_code)) || lastPdfFailure?.error_code === 'STORY_CHECKPOINT_MISMATCH';
  const spec = JSON.parse(order.purchase_spec_json);
  const revisionRows = order.product_kind === 'custom'
    ? (await query(env.DB,'SELECT id,stage_number,status,version_number,created_at,completed_at FROM revision_requests WHERE order_id = ? ORDER BY created_at DESC LIMIT 5',order.id).all()).results || []
    : [];
  const paidPlan = order.product_kind === 'custom' && spec.creatorVersion === 3
    ? await query(env.DB,'SELECT * FROM custom_plan_orders WHERE order_id = ?',order.id).first() : null;
  const planVersions = paidPlan ? (await query(env.DB,'SELECT version_number,plan_json,request_kind,created_at FROM custom_plan_versions WHERE order_id = ? ORDER BY version_number',order.id).all()).results || [] : [];
  const pendingPlan = paidPlan ? await query(env.DB,"SELECT kind,status FROM custom_plan_requests WHERE order_id = ? AND status IN ('queued','generating') ORDER BY created_at DESC LIMIT 1",order.id).first() : null;
  const initialRequests = paidPlan?.status === 'needs_help' && !paidPlan.active_version
    ? await query(env.DB,"SELECT COUNT(*) AS count FROM custom_plan_requests WHERE order_id = ? AND kind = 'initial'",order.id).first() : null;
  const activePlan = planVersions.find(item=>item.version_number===paidPlan?.active_version);
  let generationProgress = null;
  if (activity?.generation_version === 2) {
    const [blueprint,stageRows,audit,story] = await Promise.all([
      query(env.DB,'SELECT order_id FROM custom_game_blueprints WHERE order_id = ?',order.id).first(),
      query(env.DB,'SELECT stage_number FROM custom_game_stages WHERE order_id = ? ORDER BY stage_number',order.id).all(),
      query(env.DB,'SELECT order_id FROM custom_game_audits WHERE order_id = ?',order.id).first(),
      query(env.DB,'SELECT order_id FROM custom_story_checkpoints WHERE order_id = ?',order.id).first(),
    ]);
    const completedStages=(stageRows.results||[]).map(row=>row.stage_number);
    const nextStage=[1,2,3,4,5].find(number=>!completedStages.includes(number))||null;
    generationProgress={phase:order.status==='published'?'delivered':story?'pdf':nextStage?'checkpoint':blueprint?'audit':'blueprint',
      blueprintReady:Boolean(blueprint),completedStages,currentStage:nextStage,auditPassed:Boolean(audit),storyReady:Boolean(story)};
  }
  return json({ id: order.id, sku: order.sku, kind: order.product_kind, currency: order.currency, amountTotal: order.amount_total, status: order.status,
    createdAt: order.created_at, paidAt: order.paid_at, filesReady: Boolean(accessActive(entitlement) && order.status === 'published'),
    generationState: order.product_kind === 'custom' ? (activity?.status || (order.status === 'pending_payment' ? 'awaiting_payment' : 'pending')) : null,
    generationFailedAttempts: failedAttempts, pdfGenerationHistory, generationProgress,
    deliveryRetryAvailable: Boolean(order.product_kind === 'custom' && order.status === 'failed' && order.paid_at && activity?.status === 'failed' && !activity.delivery_retry_used && paidPlan?.confirmed_version && !retryBlocked),
    paper: order.product_kind === 'custom' ? spec.paper : null,
    variantId: order.product_kind === 'ready' ? spec.variantId || null : null,
    accessExpiresAt: entitlement?.access_expires_at || null,
    revisionLimit: entitlement?.revision_success_limit || 0, revisionUsed: entitlement?.revision_success_used || 0,
    revisionExpiresAt: entitlement?.revision_expires_at || null,
    gamePackVersion: order.product_kind === 'custom' ? Math.max(latestArtifact?.pack_format_version || 1, spec.gamePackVersion || 1) : null,
    packContractVersion: spec.packContractVersion || (readyRemakeSpec ? JSON.parse(readyRemakeSpec.spec_json).packContractVersion || 0 : 0),
    checkedPuzzleRevision: Boolean(latestArtifact && (readyRemakeSpec ? JSON.parse(readyRemakeSpec.spec_json).packLogicVersion === 1 : spec.packLogicVersion === 1)),
    remake,
    revisionRequests: revisionRows.map(item=>({id:item.id,stageNumber:item.stage_number,status:item.status,version:item.version_number||null,createdAt:item.created_at,completedAt:item.completed_at||null})),
    plan:activePlan ? JSON.parse(activePlan.plan_json) : spec.plan || null,
    ...(spec.creatorVersion===3 ? {planReview:{status:paidPlan?.status || (order.status==='pending_payment'?'awaiting_payment':'pending'),activeVersion:paidPlan?.active_version||0,confirmedVersion:paidPlan?.confirmed_version||null,fullUsed:paidPlan?.full_used||0,fullLimit:2,targetedUsed:paidPlan?.targeted_used||0,targetedLimit:3,pending:pendingPlan?.kind||null,retryAvailable:paidPlan?.status==='needs_help' && !paidPlan.active_version && initialRequests?.count===1,versions:planVersions.map(item=>({version:item.version_number,kind:item.request_kind,createdAt:item.created_at,plan:JSON.parse(item.plan_json)}))}} : {}) });
}

async function retryCustomDelivery(request, env, orderId) {
  if (!env.DB || !env.GENERATION_QUEUE || !aiProvider(env)) throw new ApiError(503,'DELIVERY_NOT_READY','PDF generation is not configured.');
  requireSameOrigin(request,env);
  const owner = await authenticatedEmailHash(request,env);
  if (!owner) throw new ApiError(401,'SIGN_IN_REQUIRED','Sign in to recover your order.');
  const order = await query(env.DB,"SELECT id,paid_at,purchase_spec_json FROM orders WHERE id = ? AND purchaser_email_hash = ? AND product_kind = 'custom' AND status = 'failed'",orderId,owner).first();
  if (!order?.paid_at || JSON.parse(order.purchase_spec_json).creatorVersion !== 3) throw new ApiError(404,'ORDER_NOT_FOUND','No eligible paid order was found.');
  const plan = await query(env.DB,'SELECT confirmed_version FROM custom_plan_orders WHERE order_id = ?',orderId).first();
  if (!plan?.confirmed_version) throw new ApiError(409,'PLAN_NOT_APPROVED','Approve a personal plan before creating PDFs.');
  const activity = await query(env.DB,'SELECT id,status,delivery_retry_used FROM custom_activities WHERE order_id = ?',orderId).first();
  if (activity?.status !== 'failed' || activity.delivery_retry_used) throw new ApiError(409,'DELIVERY_RETRY_UNAVAILABLE','This order needs support review.');
  const lastPdfFailure = await query(env.DB,"SELECT phase,error_code FROM generation_usage WHERE order_id = ? AND status = 'failed' ORDER BY attempt DESC LIMIT 1",orderId).first();
  if ((lastPdfFailure?.phase === 'story' && nonRetryableStoryCodes.has(lastPdfFailure.error_code)) || lastPdfFailure?.error_code === 'STORY_CHECKPOINT_MISMATCH') throw new ApiError(409,'DELIVERY_RETRY_UNAVAILABLE','This order needs support review before another model request.');
  const artifact = await query(env.DB,"SELECT id FROM artifact_versions WHERE custom_activity_id = ? AND status = 'published' LIMIT 1",activity.id).first();
  if (artifact) throw new ApiError(409,'FILES_ALREADY_CREATED','Files were already created. Refresh this order.');
  const failed = await query(env.DB,"SELECT COUNT(*) AS count FROM generation_usage WHERE order_id = ? AND status = 'failed'",orderId).first();
  const reserved = await query(env.DB,"UPDATE custom_activities SET status = 'queued',lease_until = NULL,delivery_retry_used = 1,delivery_retry_baseline = ? WHERE id = ? AND status = 'failed' AND delivery_retry_used = 0",failed?.count || 0,activity.id).run();
  if (!reserved.meta?.changes) throw new ApiError(409,'DELIVERY_BUSY','The order changed. Refresh and try again.');
  await query(env.DB,"UPDATE orders SET status = 'fulfilling' WHERE id = ? AND status = 'failed'",orderId).run();
  await query(env.DB,"UPDATE delivery_notifications SET status = 'blocked' WHERE order_id = ? AND kind = 'generation_failed' AND status = 'pending'",orderId).run();
  await env.GENERATION_QUEUE.send({orderId});
  return json({status:'fulfilling',retryQueued:true},202);
}

async function changePaidPlan(request, env, orderId) {
  if (!env.DB || !env.GENERATION_QUEUE || !aiProvider(env)) throw new ApiError(503,'PLAN_NOT_READY','Paid plan changes are not configured.');
  requireSameOrigin(request,env);
  const owner = await authenticatedEmailHash(request,env);
  if (!owner) throw new ApiError(401,'SIGN_IN_REQUIRED','Sign in to review your paid plan.');
  const order = await query(env.DB,"SELECT * FROM orders WHERE id = ? AND purchaser_email_hash = ? AND product_kind = 'custom' AND status = 'paid'",orderId,owner).first();
  if (!order || JSON.parse(order.purchase_spec_json).creatorVersion!==3) throw new ApiError(404,'ORDER_NOT_FOUND','No eligible paid plan was found.');
  const body = await requestBody(request);
  const kind = body.action==='rework'?'full':body.action==='edit'?'targeted':null;
  const scope = kind==='targeted' ? String(body.scope||'') : null;
  const feedback=String(body.feedback||'').trim();
  let requestId=null;
  if (kind) {
    const key=request.headers.get('Idempotency-Key');
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw new ApiError(400,'IDEMPOTENCY_REQUIRED','A valid request key is required.');
    requestId=`plan-${orderId}-${await sha256(key)}`;
    const prior=await query(env.DB,'SELECT id,kind,scope,feedback,status FROM custom_plan_requests WHERE id = ? AND order_id = ?',requestId,orderId).first();
    if (prior) {
      if (prior.kind!==kind || prior.scope!==scope || prior.feedback!==feedback) throw new ApiError(409,'IDEMPOTENCY_CONFLICT','This request key was used for another change.');
      return json({requestId,status:prior.status,duplicate:true});
    }
  }
  const state = await query(env.DB,'SELECT * FROM custom_plan_orders WHERE order_id = ?',orderId).first();
  if (body.action==='retry_initial') {
    const attempts=await query(env.DB,"SELECT COUNT(*) AS count FROM custom_plan_requests WHERE order_id = ? AND kind = 'initial'",orderId).first();
    if (!state || state.status!=='needs_help' || state.active_version || attempts?.count!==1) throw new ApiError(409,'PLAN_RETRY_UNAVAILABLE','This plan needs support. Please use the help form below.');
    const reserved=await query(env.DB,"UPDATE custom_plan_orders SET status = 'queued',updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'needs_help' AND active_version = 0",orderId).run();
    if (!reserved.meta?.changes) throw new ApiError(409,'PLAN_BUSY','The plan status changed. Refresh and try again.');
    const retryId=`plan-${orderId}-customer-retry`;
    try { await query(env.DB,"INSERT INTO custom_plan_requests (id,order_id,kind,status) VALUES (?,?,'initial','queued')",retryId,orderId).run(); }
    catch (caught) { await query(env.DB,"UPDATE custom_plan_orders SET status = 'needs_help' WHERE order_id = ? AND status = 'queued'",orderId).run(); throw caught; }
    await env.GENERATION_QUEUE.send({type:'plan',requestId:retryId});
    return json({requestId:retryId,status:'queued'},202);
  }
  if (body.action==='resume_review') {
    const restored=await query(env.DB,"UPDATE custom_plan_orders SET status = 'review',updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'needs_help' AND active_version > 0",orderId).run();
    if (!restored.meta?.changes) throw new ApiError(409,'PLAN_NOT_REVIEWABLE','No saved plan is available to review.');
    return json({status:'review'});
  }
  if (!state || state.status!=='review' || !state.active_version) throw new ApiError(409,'PLAN_NOT_REVIEWABLE','Wait for the current plan to finish or contact support.');
  if (body.action==='select') {
    const version = Number(body.version);
    if (!Number.isInteger(version) || version<1) throw new ApiError(400,'INVALID_VERSION','Choose a saved plan version.');
    const chosen = await query(env.DB,'SELECT version_number FROM custom_plan_versions WHERE order_id = ? AND version_number = ?',orderId,version).first();
    if (!chosen) throw new ApiError(404,'INVALID_VERSION','That plan version was not found.');
    const changed = await query(env.DB,"UPDATE custom_plan_orders SET active_version = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'review'",version,orderId).run();
    if (!changed.meta?.changes) throw new ApiError(409,'PLAN_BUSY','The plan changed. Refresh and try again.');
    return json({selectedVersion:version});
  }
  if (body.action==='confirm') {
    const version = Number(body.version);
    if (version!==state.active_version) throw new ApiError(409,'PLAN_CHANGED','Review the active plan before confirming.');
    const row = await query(env.DB,'SELECT plan_json FROM custom_plan_versions WHERE order_id = ? AND version_number = ?',orderId,version).first();
    const spec = JSON.parse(order.purchase_spec_json);
    let plan; try { plan=validatePlan(JSON.parse(row?.plan_json),spec); } catch { throw new ApiError(409,'PLAN_INVALID','This plan cannot be confirmed. Contact support.'); }
    const updatedSpec = {...spec,plan,direction:plan.id,proposalTitle:plan.title,proposalSummary:plan.summary,planConfirmed:true};
    const locked = await env.DB.batch([
      query(env.DB,"UPDATE custom_plan_orders SET status = 'confirmed',confirmed_version = ?,updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'review' AND active_version = ?",version,orderId,version),
      query(env.DB,"UPDATE custom_activities SET story_spec_json = ?,generation_version = 2 WHERE order_id = ? AND status = 'queued'",JSON.stringify(updatedSpec),orderId),
    ]);
    if (!locked[0].meta?.changes || !locked[1].meta?.changes) throw new ApiError(409,'PLAN_CHANGED','The plan changed. Refresh and contact support if the status does not update.');
    await env.GENERATION_QUEUE.send({orderId});
    return json({confirmedVersion:version,generationQueued:true});
  }
  if (!kind) throw new ApiError(400,'INVALID_PLAN_ACTION','Choose rework, edit, select or confirm.');
  if (kind==='full' && state.full_used>=2 || kind==='targeted' && state.targeted_used>=3) throw new ApiError(403,'PLAN_CHANGE_LIMIT','Included plan changes are used. Contact support if the plan still does not fit.');
  if (scope && !['title','summary','opening','roles','goal','preparation','stage1','stage2','stage3','stage4','stage5'].includes(scope)) throw new ApiError(400,'INVALID_PLAN_SCOPE','Choose the part to change.');
  if (kind==='targeted' && !scope) throw new ApiError(400,'INVALID_PLAN_SCOPE','Choose the part to change.');
  if(kind==='targeted'&&JSON.parse(order.purchase_spec_json).packContractVersion===1&&['roles','preparation'].includes(scope))throw new ApiError(400,'FIXED_PAPER_SETUP','The checked job rotation and paper-only preparation are fixed. Edit the story, goal or a checkpoint story moment instead.');
  if (feedback.length<10 || feedback.length>500) throw new ApiError(400,'INVALID_PLAN_FEEDBACK','Describe the change in 10–500 characters.');
  const reserved=await query(env.DB,`UPDATE custom_plan_orders SET status = 'queued',updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'review' AND active_version = ? AND ${kind==='full'?'full_used < 2':'targeted_used < 3'}`,orderId,state.active_version).run();
  if (!reserved.meta?.changes) throw new ApiError(409,'PLAN_BUSY','The plan changed. Refresh and try again.');
  try { await query(env.DB,"INSERT INTO custom_plan_requests (id,order_id,kind,scope,feedback,base_version,status) VALUES (?,?,?,?,?,?,'queued')",requestId,orderId,kind,scope,feedback,state.active_version).run(); }
  catch (caught) { await query(env.DB,"UPDATE custom_plan_orders SET status = 'review' WHERE order_id = ? AND status = 'queued'",orderId).run(); throw caught; }
  await env.GENERATION_QUEUE.send({type:'plan',requestId});
  return json({requestId,status:'queued'},202);
}

async function fileDownload(request, env, orderId, role) {
  if (!env.DB || !env.PRIVATE_FILES) throw new ApiError(503, 'FILES_NOT_READY', 'Private files are not configured.');
  if (!['player','guide'].includes(role)) throw new ApiError(404, 'FILE_NOT_FOUND', 'File not found.');
  const hash = await authenticatedEmailHash(request, env);
  if (!hash) throw new ApiError(401, 'EMAIL_VERIFICATION_REQUIRED', 'Sign in with Google using your purchase email first.');
  const order = await query(env.DB, 'SELECT * FROM orders WHERE id = ? AND purchaser_email_hash = ?', orderId, hash).first();
  if (!order || order.status !== 'published') throw new ApiError(404, 'FILE_NOT_FOUND', 'File not found.');
  const entitlement = await query(env.DB, "SELECT * FROM entitlements WHERE order_id = ? AND status = 'active'", order.id).first();
  if (!accessActive(entitlement)) throw new ApiError(403, 'ACCESS_EXPIRED', 'Online re-download is unavailable after the access period. Files already downloaded may still be used within the licence.');
  const spec = JSON.parse(order.purchase_spec_json);
  const paper = new URL(request.url).searchParams.get('paper') === 'Letter' ? 'Letter' : 'A4';
  let file;
  if (order.product_kind === 'ready') file = spec.variantId
    ? await query(env.DB, 'SELECT r2_key, sha256, bytes FROM ready_pack_variants WHERE ready_pack_id = ? AND variant_id = ? AND paper = ? AND role = ?', entitlement.ready_pack_id, spec.variantId, paper, role).first()
    : await query(env.DB, 'SELECT r2_key, sha256, bytes FROM ready_pack_files WHERE ready_pack_id = ? AND paper = ? AND role = ?', entitlement.ready_pack_id, paper, role).first();
  else {
    if (paper !== spec.paper) throw new ApiError(404, 'FILE_NOT_FOUND', 'This paper size was not generated.');
    const requestedVersion = new URL(request.url).searchParams.get('version');
    if (requestedVersion && requestedVersion !== '1') throw new ApiError(404, 'FILE_NOT_FOUND', 'This file version is unavailable.');
    const remake = requestedVersion === '1' ? await query(env.DB, "SELECT status FROM custom_pack_remakes WHERE order_id = ?", order.id).first() : null;
    if (requestedVersion === '1' && remake?.status !== 'ready') throw new ApiError(404, 'FILE_NOT_FOUND', 'The original file version is unavailable.');
    const artifact = requestedVersion === '1'
      ? await query(env.DB, "SELECT * FROM artifact_versions WHERE custom_activity_id = ? AND status = 'published' AND version_number = 1", entitlement.custom_activity_id).first()
      : await query(env.DB, "SELECT * FROM artifact_versions WHERE custom_activity_id = ? AND status = 'published' ORDER BY version_number DESC LIMIT 1", entitlement.custom_activity_id).first();
    file = artifact && { r2_key: role === 'player' ? artifact.player_r2_key : artifact.guide_r2_key, sha256: role === 'player' ? artifact.player_sha256 : artifact.guide_sha256 };
  }
  if (!file?.r2_key) throw new ApiError(404, 'FILE_NOT_FOUND', 'The file is not ready.');
  const bytes = await verifiedPdf(env, file);
  return new Response(bytes, { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="adventure-${role}-${paper}.pdf"`, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } });
}

async function requestRevision(request, env, orderId) {
  if (!env.DB || !env.GENERATION_QUEUE || !env.PRIVATE_FILES || !aiProvider(env)) throw new ApiError(503, 'REVISION_NOT_READY', 'Story revisions are not configured.');
  requireSameOrigin(request, env);
  const hash = await authenticatedEmailHash(request, env);
  if (!hash) throw new ApiError(401, 'EMAIL_VERIFICATION_REQUIRED', 'Sign in with Google using your purchase email first.');
  const order = await query(env.DB, "SELECT * FROM orders WHERE id = ? AND purchaser_email_hash = ? AND product_kind = 'custom' AND status = 'published'", orderId, hash).first();
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'No eligible custom order was found.');
  const remake = await query(env.DB, 'SELECT status FROM custom_pack_remakes WHERE order_id = ?', orderId).first();
  if (remake && ['queued','generating'].includes(remake.status)) throw new ApiError(409, 'REMAKE_IN_PROGRESS', 'Wait for the full-pack remake before changing a checkpoint.');
  const entitlement = await query(env.DB, "SELECT * FROM entitlements WHERE order_id = ? AND status = 'active'", orderId).first();
  if (!entitlement || entitlement.revision_success_used >= entitlement.revision_success_limit || !entitlement.revision_expires_at || Date.parse(`${entitlement.revision_expires_at}Z`) <= Date.now()) throw new ApiError(403, 'REVISION_LIMIT', 'No included revision remains for this order.');
  const body = await requestBody(request);
  const stageNumber = Number(body.stageNumber);
  if (!Number.isInteger(stageNumber) || stageNumber < 1 || stageNumber > 5) throw new ApiError(400, 'INVALID_STAGE', 'Choose a stage from 1 to 5.');
  const instruction = String(body.instruction || '').trim();
  if (instruction.length < 10 || instruction.length > 350) throw new ApiError(400, 'INVALID_REVISION', 'Describe one local change in 10–350 characters.');
  const purchaseSpec = JSON.parse(order.purchase_spec_json);
  const activity = await query(env.DB, 'SELECT id,story_spec_json FROM custom_activities WHERE order_id = ?', orderId).first();
  const latestArtifact = activity && await query(env.DB, "SELECT pack_format_version FROM artifact_versions WHERE custom_activity_id = ? AND status = 'published' ORDER BY version_number DESC LIMIT 1", activity.id).first();
  const readyRemake = latestArtifact?.pack_format_version === 2
    ? await query(env.DB, "SELECT spec_json FROM custom_pack_remakes WHERE order_id = ? AND status = 'ready'", orderId).first() : null;
  const revisionSpec = readyRemake ? JSON.parse(readyRemake.spec_json) : purchaseSpec.creatorVersion === 3 ? JSON.parse(activity.story_spec_json) : purchaseSpec;
  if (revisionSpec.packLogicVersion === 1 && !controlledRevisionStyle(instruction))
    throw new ApiError(422, 'REVISION_UNSUPPORTED', 'Choose a reading, difficulty, hint or instruction change. For a wrong answer, new mechanic or full-pack issue, request a quality review on this order.');
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

async function requestPackRemake(request, env, orderId) {
  requireSameOrigin(request, env);
  if (!env.DB || !env.SESSION_SECRET) throw new ApiError(503, 'REMAKE_NOT_READY', 'Order access is not configured.');
  const owner = await authenticatedEmailHash(request, env);
  if (!owner) throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to remake your paid order.');
  const order = await query(env.DB, "SELECT * FROM orders WHERE id = ? AND purchaser_email_hash = ? AND product_kind = 'custom'", orderId, owner).first();
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'No verified custom order was found.');
  const entitlement = await query(env.DB, "SELECT * FROM entitlements WHERE order_id = ? AND status = 'active'", orderId).first();
  if (!accessActive(entitlement)) throw new ApiError(403, 'ORDER_ACCESS_EXPIRED', 'Online order access has expired. Contact support about a quality remake.');
  const activity = await query(env.DB, 'SELECT id,status,story_spec_json FROM custom_activities WHERE order_id = ?', orderId).first();
  const result = await startPackRemake(order, activity, env);
  return json(result, result.queued ? 202 : 200);
}

async function requestPackRemakeRecovery(request, env, orderId) {
  requireSameOrigin(request, env);
  if (!env.DB || !env.SESSION_SECRET) throw new ApiError(503, 'REMAKE_NOT_READY', 'Order access is not configured.');
  const owner = await authenticatedEmailHash(request, env);
  if (!owner) throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to recover your paid remake.');
  const order = await query(env.DB, "SELECT * FROM orders WHERE id = ? AND purchaser_email_hash = ? AND product_kind = 'custom'", orderId, owner).first();
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'No verified custom order was found.');
  const entitlement = await query(env.DB, "SELECT * FROM entitlements WHERE order_id = ? AND status = 'active'", orderId).first();
  if (!accessActive(entitlement)) throw new ApiError(403, 'ORDER_ACCESS_EXPIRED', 'Online order access has expired. Contact support about this order.');
  return json(await retryPackRemake(order, env), 202);
}

async function supportCases(request, env, orderId) {
  if (!env.DB || !env.SESSION_SECRET) throw new ApiError(503, 'SUPPORT_NOT_READY', 'Support reporting is not configured.');
  const hash = await authenticatedEmailHash(request, env);
  if (!hash) throw new ApiError(401, 'EMAIL_VERIFICATION_REQUIRED', 'Sign in with Google using your purchase email first.');
  const order = await query(env.DB, 'SELECT id FROM orders WHERE id = ? AND purchaser_email_hash = ?', orderId, hash).first();
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'No verified order was found.');
  if (request.method === 'GET') {
    const cases = await query(env.DB, 'SELECT id,issue_type,description,status,created_at,updated_at FROM support_cases WHERE order_id = ? AND email_hash = ? ORDER BY created_at DESC LIMIT 20', orderId, hash).all();
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
      return json({ status: 'configured_runtime', paperContractVersion: 1, checkout: await checkoutReady(env), checkoutMode: testCheckoutReady(env) ? 'test' : paymentReady(env) ? 'live' : 'closed', generation: generationReady(env), proposals: false, paidPlanReview: generationReady(env) && await paidPlanSchemaReady(env), account: accountReady(env), sample: Boolean(catalog.freeSampleThemeId), legal: legal?.size === 4 });
    }
    const legalPath = path.match(/^\/api\/v1\/legal\/(privacy|terms|cookies|refunds)$/);
    if (request.method === 'GET' && legalPath) {
      const item = (await publishedLegal(env))?.get(legalPath[1]);
      return item ? json({ kind: item.kind, version: item.version, title: item.title, effectiveAt: item.effective_at, sections: JSON.parse(item.sections_json) }) : error(404, 'LEGAL_NOT_PUBLISHED', 'This policy is not published.');
    }
    if (request.method === 'GET' && path === '/api/v1/catalog') return json(await liveCatalog(env));
    if (request.method === 'GET' && path === '/api/v1/test-packs') return await testReadyCatalog(request, env);
    const testPreview = path.match(/^\/api\/v1\/test-pack-previews\/([a-z]+)\/(home|classroom)(?:\/([12]))?$/);
    if (request.method === 'GET' && testPreview) return await testPackPreview(request, env, testPreview[1], testPreview[2], testPreview[3] ? Number(testPreview[3]) : null);
    if (request.method === 'GET' && path.startsWith('/api/v1/themes/')) {
      const id = path.slice('/api/v1/themes/'.length);
      const catalog = await liveCatalog(env);
      const theme = catalog.themes.find(item => item.id === id);
      return theme ? json({ theme, offers: catalog.offers }) : error(404, 'THEME_NOT_FOUND', 'Unknown theme.');
    }
    if (request.method === 'POST' && path === '/api/v1/checkout-intents') return await checkout(request, env);
    if (request.method === 'POST' && path === '/api/v1/stripe/webhook') return await webhook(request, env, context);
    if (request.method === 'POST' && path === '/api/v1/proposals') return await proposals(request, env);
    if (request.method === 'GET' && path === '/api/v1/proposals') return await previewAllowance(request,env);
    if (request.method === 'POST' && path === '/api/v1/access-links') return await requestAccessLink(request, env);
    if (request.method === 'GET' && path === '/api/v1/auth/google/config') return googleLoginConfig(request, env);
    if (request.method === 'POST' && path === '/api/v1/auth/google') return await googleLogin(request, env);
    if (request.method === 'GET' && path === '/api/v1/auth/verify') return await verifyAccessLink(request, env);
    if (request.method === 'GET' && path === '/api/v1/auth/session') {
      const available = accountReady(env);
      const hash = available ? await authenticatedEmailHash(request, env) : null;
      const cookies = request.headers.get('cookie') || '';
      const token = cookies.split(';').map(part => part.trim()).find(part => part.startsWith('paw_session='))?.slice('paw_session='.length);
      const session = token ? await verifyAccessToken(env.SESSION_SECRET, token).catch(() => null) : null;
      const email = hash && session?.scope === 'session' && session.email && await emailHash(env, normalizeEmail(session.email)) === hash ? normalizeEmail(session.email) : null;
      return json({ available, authenticated: Boolean(hash), ...(email ? { email } : {}) });
    }
    if (request.method === 'GET' && path === '/api/v1/my-orders') return await myOrders(request, env);
    if (['GET','PUT','DELETE'].includes(request.method) && path === '/api/v1/my-draft') return await savedDraft(request, env);
    if (request.method === 'POST' && path === '/api/v1/auth/logout') {
      requireSameOrigin(request, env);
      const secure = new URL(env.PUBLIC_ORIGIN || request.url).protocol === 'https:' ? '; Secure' : '';
      return new Response(null, { status: 204, headers: { 'set-cookie': `paw_session=; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=0`, 'cache-control': 'no-store' } });
    }
    const sample = path.match(/^\/api\/v1\/samples\/(home|classroom)\/(A4|Letter)\/(player|guide)$/);
    if (request.method === 'GET' && sample) return await freeSample(request, env, sample[1], sample[2], sample[3]);
    const order = path.match(/^\/api\/v1\/orders\/([A-Za-z0-9-]+)$/);
    if (request.method === 'GET' && order) return await orderView(request, env, order[1]);
    const paidPlan = path.match(/^\/api\/v1\/orders\/([A-Za-z0-9-]+)\/plan$/);
    if (request.method === 'POST' && paidPlan) return await changePaidPlan(request,env,paidPlan[1]);
    const deliveryRetry = path.match(/^\/api\/v1\/orders\/([A-Za-z0-9-]+)\/retry-delivery$/);
    if (request.method === 'POST' && deliveryRetry) return await retryCustomDelivery(request,env,deliveryRetry[1]);
    const remake = path.match(/^\/api\/v1\/orders\/([A-Za-z0-9-]+)\/pack-remake$/);
    if (request.method === 'POST' && remake) return await requestPackRemake(request, env, remake[1]);
    const remakeRecovery = path.match(/^\/api\/v1\/orders\/([A-Za-z0-9-]+)\/pack-remake\/retry$/);
    if (request.method === 'POST' && remakeRecovery) return await requestPackRemakeRecovery(request, env, remakeRecovery[1]);
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

async function publishPlanRequest(requestId,env) {
  if (!env.DB || !aiProvider(env)) throw new Error('Plan bindings are missing');
  const request = await query(env.DB,"SELECT * FROM custom_plan_requests WHERE id = ? AND status IN ('queued','generating')",requestId).first();
  if (!request) return;
  const order = await query(env.DB,"SELECT * FROM orders WHERE id = ? AND product_kind = 'custom' AND status = 'paid'",request.order_id).first();
  if (!order || JSON.parse(order.purchase_spec_json).creatorVersion!==3) return;
  const lease = await query(env.DB,"UPDATE custom_plan_requests SET status = 'generating',attempts = attempts + 1,lease_until = ? WHERE id = ? AND (status = 'queued' OR (status = 'generating' AND COALESCE(lease_until,0) < ?))",nowSeconds()+300,requestId,nowSeconds()).run();
  if (!lease.meta?.changes) return;
  await query(env.DB,"UPDATE custom_plan_orders SET status = 'generating',updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status IN ('queued','generating')",order.id).run();
  const attempt=(await query(env.DB,'SELECT attempts FROM custom_plan_requests WHERE id = ?',requestId).first()).attempts;
  const usageAttempt=(await query(env.DB,'SELECT COALESCE(MAX(attempt),0) + 1 AS next FROM generation_usage WHERE order_id = ?',order.id).first()).next;
  try {
    const spec=JSON.parse(order.purchase_spec_json);
    const base=request.base_version ? await query(env.DB,'SELECT plan_json FROM custom_plan_versions WHERE order_id = ? AND version_number = ?',order.id,request.base_version).first() : null;
    if (request.base_version && !base) throw new Error('Previous plan version is missing');
    const result=await generateSinglePlan(spec,env,env.FETCH||fetch,{kind:request.kind,scope:request.scope,feedback:request.feedback,previousPlan:base?JSON.parse(base.plan_json):null});
    const state=await query(env.DB,'SELECT * FROM custom_plan_orders WHERE order_id = ?',order.id).first();
    const currentOrder=await query(env.DB,'SELECT status FROM orders WHERE id = ?',order.id).first();
    if (!state || state.status!=='generating' || state.confirmed_version || currentOrder?.status!=='paid') return;
    const version=(await query(env.DB,'SELECT COALESCE(MAX(version_number),0) + 1 AS next FROM custom_plan_versions WHERE order_id = ?',order.id).first()).next;
    await env.DB.batch([
      query(env.DB,'INSERT INTO custom_plan_versions (order_id,version_number,plan_json,request_kind) VALUES (?,?,?,?)',order.id,version,JSON.stringify(result.plan),request.kind),
      query(env.DB,`UPDATE custom_plan_orders SET status = 'review',active_version = ?,full_used = full_used + ?,targeted_used = targeted_used + ?,updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'generating'`,version,request.kind==='full'?1:0,request.kind==='targeted'?1:0,order.id),
      query(env.DB,"UPDATE custom_plan_requests SET status = 'published',result_version = ?,lease_until = NULL,completed_at = CURRENT_TIMESTAMP WHERE id = ?",version,requestId),
      query(env.DB,'INSERT OR IGNORE INTO generation_usage (order_id,attempt,response_id,model,input_tokens,output_tokens,status) VALUES (?,?,?,?,?,?,?)',order.id,usageAttempt,result.responseId,aiProvider(env)?.model,result.usage?.input_tokens||null,result.usage?.output_tokens||null,'plan-published'),
    ]);
  } catch (caught) {
    console.error('Paid plan generation failed', {orderId:order.id,requestId,attempt,code:caught?.code||'UNEXPECTED',message:caught?.message||'Unknown failure'});
    await query(env.DB,'INSERT OR IGNORE INTO generation_usage (order_id,attempt,model,status) VALUES (?,?,?,?)',order.id,usageAttempt,aiProvider(env)?.model||'unconfigured','plan-failed').run();
    if (attempt>=3) await env.DB.batch([
      query(env.DB,"UPDATE custom_plan_requests SET status = 'failed',lease_until = NULL,completed_at = CURRENT_TIMESTAMP WHERE id = ?",requestId),
      query(env.DB,"UPDATE custom_plan_orders SET status = CASE WHEN active_version > 0 THEN 'review' ELSE 'needs_help' END,updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'generating'",order.id),
    ]);
    else await query(env.DB,'UPDATE custom_plan_requests SET lease_until = 0 WHERE id = ?',requestId).run();
    throw caught;
  }
}

const STAGED_AI_CALL_LIMIT = 14;
const STAGED_STEP_CALL_LIMIT = 2;

async function publishStagedStory(order,activity,spec,specHash,env) {
  const lease=await query(env.DB,"UPDATE custom_activities SET status = 'generating',lease_until = ? WHERE id = ? AND (status = 'queued' OR (status = 'generating' AND COALESCE(lease_until,0) < ?))",nowSeconds()+900,activity.id,nowSeconds()).run();
  if (!lease.meta?.changes) return;
  await query(env.DB,"UPDATE orders SET status = 'fulfilling' WHERE id = ? AND status = 'paid'",order.id).run();
  let phase='blueprint',stageNumber=0;
  const fetcher=env.FETCH||fetch;
  const countCalls=async (kind,number)=>Number((await query(env.DB,'SELECT COUNT(*) AS count FROM custom_generation_calls WHERE order_id = ? AND phase = ? AND stage_number = ?',order.id,kind,number).first())?.count||0);
  const totalCalls=async()=>Number((await query(env.DB,'SELECT COUNT(*) AS count FROM custom_generation_calls WHERE order_id = ?',order.id).first())?.count||0);
  const call=async (kind,number,produce,expectedHash=null)=>{
    const cached=await query(env.DB,"SELECT result_json FROM custom_generation_calls WHERE order_id = ? AND phase = ? AND stage_number = ? AND status = 'passed' AND result_json IS NOT NULL ORDER BY created_at DESC,id DESC LIMIT 1",order.id,kind,number).first();
    if (cached) {
      const value=JSON.parse(cached.result_json);
      if (!expectedHash || value.storySha256===expectedHash) return value;
    }
    if (await countCalls(kind,number)>=STAGED_STEP_CALL_LIMIT || await totalCalls()>=STAGED_AI_CALL_LIMIT)
      throw new ApiError(422,'STAGED_BUDGET_EXHAUSTED','The safe generation limit was reached.');
    const deterministic=spec.gamePackVersion===2&&spec.packLogicVersion===1&&kind!=='blueprint'&&!(spec.packContractVersion===1&&kind==='audit');
    const provider=deterministic?null:aiProvider(env);
    if (!deterministic&&!provider) throw new ApiError(503,'GENERATION_NOT_CONFIGURED','Story generation is not configured.');
    const id=crypto.randomUUID();
    await query(env.DB,"INSERT INTO custom_generation_calls (id,order_id,phase,stage_number,status,model) VALUES (?,?,?,?,'started',?)",id,order.id,kind,number,deterministic?'checked-rules-v1':provider.model).run();
    try {
      const result=await produce();
      try { await query(env.DB,"UPDATE custom_generation_calls SET status = 'passed',result_json = ?,response_id = ?,input_tokens = ?,output_tokens = ?,completed_at = CURRENT_TIMESTAMP WHERE id = ?",JSON.stringify(result.value),result.responseId,result.usage?.input_tokens??null,result.usage?.output_tokens??null,id).run(); }
      catch (caught) { caught.persistence=true; caught.persistenceUncertain=true; throw caught; }
      return result.value;
    } catch (caught) {
      const code=typeof caught?.code==='string' && /^[A-Z0-9_]{1,60}$/.test(caught.code)?caught.code:'UNEXPECTED';
      const detail=[caught?.message||'Unknown failure',...(Array.isArray(caught?.issues)?caught.issues.slice(0,5):[])].join(' | ').slice(0,1000);
      const candidate=caught?.candidate?JSON.stringify(caught.candidate):null;
      await query(env.DB,"UPDATE custom_generation_calls SET status = 'failed',response_id = ?,input_tokens = ?,output_tokens = ?,error_code = ?,error_detail = ?,result_json = ?,completed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'started'",caught?.responseId||null,caught?.usage?.input_tokens??null,caught?.usage?.output_tokens??null,code,detail,candidate?.length<=40000?candidate:null,id).run();
      throw caught;
    }
  };
  try {
    for (;;) {
      await query(env.DB,"UPDATE custom_activities SET lease_until = ? WHERE id = ? AND status = 'generating'",nowSeconds()+900,activity.id).run();
      const blueprintRow=await query(env.DB,'SELECT spec_sha256,blueprint_sha256,blueprint_json FROM custom_game_blueprints WHERE order_id = ?',order.id).first();
      if (!blueprintRow) {
        phase='blueprint';stageNumber=0;
        const blueprint=validateBlueprint(await call('blueprint',0,async()=>{
          const prior=spec.packContractVersion===1?await query(env.DB,"SELECT result_json,error_detail FROM custom_generation_calls WHERE order_id = ? AND phase = 'blueprint' AND status = 'failed' AND result_json IS NOT NULL ORDER BY created_at DESC,id DESC LIMIT 1",order.id).first():null;
          const result=prior?await repairBlueprint(spec,JSON.parse(prior.result_json),prior.error_detail,env,fetcher):await generateBlueprint(spec,env,fetcher);
          return {value:result.blueprint,usage:result.usage,responseId:result.responseId};
        }),spec);
        const blueprintJson=JSON.stringify(blueprint),blueprintHash=await sha256(blueprintJson);
        try { await query(env.DB,'INSERT OR IGNORE INTO custom_game_blueprints (order_id,spec_sha256,blueprint_sha256,blueprint_json) VALUES (?,?,?,?)',order.id,specHash,blueprintHash,blueprintJson).run(); }
        catch (caught) { caught.persistence=true; throw caught; }
        await query(env.DB,'UPDATE custom_activities SET pipeline_failures = 0 WHERE id = ?',activity.id).run();
        continue;
      }
      if (blueprintRow.spec_sha256!==specHash) throw new ApiError(422,'STORY_CHECKPOINT_MISMATCH','The approved plan changed after its blueprint was saved.');
      const blueprint=validateBlueprint(JSON.parse(blueprintRow.blueprint_json),spec);
      const stages=(await query(env.DB,'SELECT stage_number,blueprint_sha256,stage_json FROM custom_game_stages WHERE order_id = ? ORDER BY stage_number',order.id).all()).results||[];
      if (stages.some(row=>row.blueprint_sha256!==blueprintRow.blueprint_sha256)) throw new ApiError(422,'STORY_CHECKPOINT_MISMATCH','A saved checkpoint belongs to another blueprint.');
      const next=[1,2,3,4,5].find(number=>!stages.some(row=>row.stage_number===number));
      if (next) {
        phase='checkpoint';stageNumber=next;
        const previous=next===1?null:JSON.parse(stages.find(row=>row.stage_number===next-1)?.stage_json||'null');
        if (next>1&&!previous) throw new ApiError(422,'STORY_CHECKPOINT_MISMATCH','The previous checkpoint is missing.');
        const generated=await call('checkpoint',next,async()=>{
          const result=await generateStagedCheckpoint(spec,blueprint,next,previous,env,fetcher);
          return {value:result.stage,usage:result.usage,responseId:result.responseId};
        });
        const stage=validateGeneratedStage(generated,spec,next,previous?.unlock||'START');
        try { await query(env.DB,'INSERT OR IGNORE INTO custom_game_stages (order_id,stage_number,blueprint_sha256,stage_json) VALUES (?,?,?,?)',order.id,next,blueprintRow.blueprint_sha256,JSON.stringify(stage)).run(); }
        catch (caught) { caught.persistence=true; throw caught; }
        await query(env.DB,'UPDATE custom_activities SET pipeline_failures = 0 WHERE id = ?',activity.id).run();
        continue;
      }
      phase='audit';stageNumber=0;
      const story=assembleStagedStory(spec,blueprint,stages.map(row=>JSON.parse(row.stage_json)));
      const storyJson=JSON.stringify(story),storyHash=await sha256(storyJson);
      const audited=await query(env.DB,'SELECT story_sha256 FROM custom_game_audits WHERE order_id = ?',order.id).first();
      if (audited && audited.story_sha256!==storyHash) throw new ApiError(422,'STORY_CHECKPOINT_MISMATCH','The checked story changed after approval.');
      if (!audited) {
        await call('audit',0,async()=>{
          const result=await auditStagedStory(story,spec,blueprint,env,fetcher);
          return {value:{storySha256:storyHash},usage:result.usage,responseId:result.responseId};
        },storyHash);
        try { await query(env.DB,'INSERT OR IGNORE INTO custom_game_audits (order_id,story_sha256) VALUES (?,?)',order.id,storyHash).run(); }
        catch (caught) { caught.persistence=true; throw caught; }
      }
      try { await query(env.DB,'INSERT OR IGNORE INTO custom_story_checkpoints (order_id,spec_sha256,story_json,response_id) VALUES (?,?,?,NULL)',order.id,specHash,storyJson).run(); }
      catch (caught) { caught.persistence=true; throw caught; }
      await query(env.DB,"UPDATE custom_activities SET status = 'queued',lease_until = NULL,pipeline_failures = 0 WHERE id = ? AND status = 'generating'",activity.id).run();
      try { await env.GENERATION_QUEUE.send({orderId:order.id}); }
      catch (caught) { console.error('Checked story saved; PDF queue send failed, scheduled recovery will continue',{orderId:order.id,message:caught?.message}); }
      return;
    }
  } catch (caught) {
    const code=typeof caught?.code==='string' && /^[A-Z0-9_]{1,60}$/.test(caught.code)?caught.code:'UNEXPECTED';
    const phaseCalls=await countCalls(phase,stageNumber),calls=await totalCalls();
    const persistenceFailures=(activity.pipeline_failures||0)+(caught.persistence?1:0);
    let canRetry=code!=='STORY_CHECKPOINT_MISMATCH' && code!=='PRINTED_PROOF_INVALID' && code!=='GENERATION_NOT_CONFIGURED' && calls<STAGED_AI_CALL_LIMIT && phaseCalls<STAGED_STEP_CALL_LIMIT;
    if (caught.persistence) canRetry=persistenceFailures<3 && !caught.persistenceUncertain;
    if(code==='GENERATION_QA_FAILED'&&spec.packContractVersion===1&&canRetry&&await countCalls('blueprint',0)<STAGED_STEP_CALL_LIMIT){
      await env.DB.batch([
        query(env.DB,"UPDATE custom_generation_calls SET status = 'failed',error_code = 'AUDIT_REJECTED',error_detail = ? WHERE order_id = ? AND phase = 'blueprint' AND status = 'passed'",String(caught.message).slice(0,1000),order.id),
        query(env.DB,"UPDATE custom_generation_calls SET result_json = NULL,error_code = 'AUDIT_REJECTED' WHERE order_id = ? AND phase = 'checkpoint' AND status = 'passed'",order.id),
        query(env.DB,'DELETE FROM custom_game_blueprints WHERE order_id = ?',order.id),
        query(env.DB,'DELETE FROM custom_game_stages WHERE order_id = ?',order.id),
      ]);
    } else if (code==='GENERATION_QA_FAILED' && spec.packContractVersion!==1 && caught.stageNumber>=1 && caught.stageNumber<=5 && canRetry && await countCalls('checkpoint',caught.stageNumber)<STAGED_STEP_CALL_LIMIT) {
      await env.DB.batch([
        query(env.DB,'DELETE FROM custom_game_stages WHERE order_id = ? AND stage_number = ?',order.id,caught.stageNumber),
        query(env.DB,"UPDATE custom_generation_calls SET result_json = NULL,error_code = 'AUDIT_REJECTED',error_detail = ? WHERE order_id = ? AND phase = 'checkpoint' AND stage_number = ? AND status = 'passed'",(caught.issues||[]).join(' | ').slice(0,1000),order.id,caught.stageNumber),
      ]);
    } else if (code==='GENERATION_QA_FAILED') canRetry=false;
    console.error('Staged custom generation stopped',{orderId:order.id,phase,stageNumber,code,message:caught?.message||'Unknown failure',retrying:canRetry});
    if (canRetry) {
      await query(env.DB,'UPDATE custom_activities SET lease_until = 0,pipeline_failures = ? WHERE id = ?',persistenceFailures,activity.id).run();
      try { await env.GENERATION_QUEUE.send({orderId:order.id}); }
      catch (queueFailure) { console.error('Staged retry queue send failed; scheduled recovery will continue',{orderId:order.id,message:queueFailure?.message}); }
      return;
    }
    const attempt=(await query(env.DB,'SELECT COALESCE(MAX(attempt),0)+1 AS next FROM generation_usage WHERE order_id = ?',order.id).first()).next;
    await env.DB.batch([
      query(env.DB,"UPDATE custom_activities SET status = 'failed',lease_until = NULL WHERE id = ?",activity.id),
      query(env.DB,"UPDATE orders SET status = 'failed' WHERE id = ?",order.id),
      query(env.DB,"INSERT INTO generation_usage (order_id,attempt,model,status,phase,round_number,trigger_kind,error_code,error_detail,completed_at) VALUES (?,?,?,'failed','story',1,'initial','STAGED_GENERATION_STOPPED',?,CURRENT_TIMESTAMP)",order.id,attempt,aiProvider(env)?.model||'unconfigured',`${phase}${stageNumber?` ${stageNumber}`:''}: ${code} ${caught?.message||''}`.slice(0,1000)),
      query(env.DB,"INSERT INTO delivery_notifications (order_id,kind,status,attempts) VALUES (?,'generation_failed','pending',0) ON CONFLICT(order_id,kind) DO UPDATE SET status = 'pending',attempts = 0,sent_at = NULL",order.id),
      query(env.DB,"INSERT INTO custom_delivery_incidents (order_id,phase,error_code) VALUES (?,?,?) ON CONFLICT(order_id) DO UPDATE SET phase = excluded.phase,error_code = excluded.error_code,status = 'open',alert_status = 'pending',alert_attempts = 0,alerted_at = NULL",order.id,phase,code),
    ]);
  }
}

async function publishCustomOrder(orderId, env) {
  if (!env.DB || !env.PRIVATE_FILES) throw new Error('Generation bindings are missing');
  const order = await query(env.DB, "SELECT * FROM orders WHERE id = ? AND product_kind = 'custom' AND status IN ('paid','fulfilling')", orderId).first();
  if (!order) return;
  const activity = await query(env.DB, 'SELECT * FROM custom_activities WHERE order_id = ?', orderId).first();
  if (!activity || activity.status === 'published') return;
  const purchaseSpec = JSON.parse(order.purchase_spec_json);
  if (purchaseSpec.creatorVersion === 3) {
    const state=await query(env.DB,'SELECT confirmed_version FROM custom_plan_orders WHERE order_id = ?',orderId).first();
    if (!state?.confirmed_version) return;
  }
  const spec = purchaseSpec.creatorVersion === 3 ? JSON.parse(activity.story_spec_json) : purchaseSpec;
  if (purchaseSpec.creatorVersion === 3 && (!spec.planConfirmed || !spec.plan)) return;
  const specHash = await sha256(JSON.stringify(spec));
  if (activity.generation_version===2) {
    const existing=await query(env.DB,'SELECT order_id FROM custom_story_checkpoints WHERE order_id = ?',orderId).first();
    if (!existing) return publishStagedStory(order,activity,spec,specHash,env);
  }
  const lease = await query(env.DB, `UPDATE custom_activities SET status = 'generating', lease_until = ? WHERE id = ? AND (status = 'queued' OR (status = 'generating' AND COALESCE(lease_until,0) < ?))`, nowSeconds() + 900, activity.id, nowSeconds()).run();
  if (!lease.meta?.changes) return;
  await env.DB.batch([
    query(env.DB, "UPDATE orders SET status = 'fulfilling' WHERE id = ? AND status = 'paid'", orderId),
  ]);
  const attempt = (await query(env.DB, 'SELECT COALESCE(MAX(attempt),0) + 1 AS next FROM generation_usage WHERE order_id = ?', orderId).first()).next;
  const failedDeliveries = await query(env.DB,"SELECT COUNT(*) AS count FROM generation_usage WHERE order_id = ? AND status = 'failed'",orderId).first();
  const deliveryAttempt = (failedDeliveries?.count || 0) - (activity.delivery_retry_baseline || 0) + 1;
  const roundNumber = activity.delivery_retry_used ? 2 : 1;
  const triggerKind = deliveryAttempt > 1 ? 'automatic_retry' : roundNumber === 2 ? 'customer_retry' : 'initial';
  let generationPhase = 'story';
  await query(env.DB, "INSERT INTO generation_usage (order_id,attempt,model,status,phase,round_number,trigger_kind) VALUES (?,?,?,'generating',?,?,?)",
    orderId,attempt,aiProvider(env)?.model || 'unconfigured',generationPhase,roundNumber,triggerKind).run();
  try {
    const checkpoint = await query(env.DB,'SELECT spec_sha256,story_json FROM custom_story_checkpoints WHERE order_id = ?',orderId).first();
    if (checkpoint && checkpoint.spec_sha256 !== specHash) throw Object.assign(new Error('Approved story specification changed after generation'),{code:'STORY_CHECKPOINT_MISMATCH'});
    const result = checkpoint
      ? {story:validateGeneratedStory(JSON.parse(checkpoint.story_json),spec),usage:null,responseId:null}
      : await generateStory(spec, env, env.FETCH || fetch);
    if (!checkpoint) {
      await query(env.DB,'UPDATE generation_usage SET response_id = ?,input_tokens = ?,output_tokens = ? WHERE order_id = ? AND attempt = ?',result.responseId,result.usage?.input_tokens || 0,result.usage?.output_tokens || 0,orderId,attempt).run();
      await query(env.DB,'INSERT INTO custom_story_checkpoints (order_id,spec_sha256,story_json,response_id) VALUES (?,?,?,?)',orderId,specHash,JSON.stringify(result.story),result.responseId).run();
    }
    generationPhase = 'pdf';
    await query(env.DB, 'UPDATE generation_usage SET phase = ? WHERE order_id = ? AND attempt = ?',generationPhase,orderId,attempt).run();
    const player = buildGamePdf(result.story, spec, 'player');
    const guide = buildGamePdf(result.story, spec, 'guide');
    const storyJson = JSON.stringify(result.story);
    const storyHash = await sha256(storyJson);
    const playerHash = await sha256Bytes(player);
    const guideHash = await sha256Bytes(guide);
    const prefix = `custom/${orderId}/v1`;
    generationPhase = 'storage';
    await query(env.DB, 'UPDATE generation_usage SET phase = ? WHERE order_id = ? AND attempt = ?',generationPhase,orderId,attempt).run();
    await Promise.all([
      env.PRIVATE_FILES.put(`${prefix}/player.pdf`, player, { httpMetadata: { contentType: 'application/pdf' }, customMetadata: { sha256: playerHash } }),
      env.PRIVATE_FILES.put(`${prefix}/guide.pdf`, guide, { httpMetadata: { contentType: 'application/pdf' }, customMetadata: { sha256: guideHash } }),
      env.PRIVATE_FILES.put(`${prefix}/story.json`, storyJson, { httpMetadata: { contentType: 'application/json' }, customMetadata: { sha256: storyHash } }),
    ]);
    generationPhase = 'delivery_check';
    await query(env.DB, 'UPDATE generation_usage SET phase = ? WHERE order_id = ? AND attempt = ?',generationPhase,orderId,attempt).run();
    if (typeof env.PRIVATE_FILES.head === 'function') {
      const [savedPlayer,savedGuide] = await Promise.all([
        env.PRIVATE_FILES.head(`${prefix}/player.pdf`),env.PRIVATE_FILES.head(`${prefix}/guide.pdf`),
      ]);
      if (savedPlayer?.customMetadata?.sha256 !== playerHash || savedGuide?.customMetadata?.sha256 !== guideHash)
        throw Object.assign(new Error('Stored PDF verification failed'),{code:'STORED_PDF_MISMATCH'});
    }
    await env.DB.batch([
      query(env.DB, `INSERT OR IGNORE INTO artifact_versions (id,custom_activity_id,version_number,status,player_r2_key,guide_r2_key,player_sha256,guide_sha256,story_r2_key,story_sha256,pack_format_version) VALUES (?,?,1,'published',?,?,?,?,?,?,?)`, `artifact-${orderId}-1`, activity.id, `${prefix}/player.pdf`, `${prefix}/guide.pdf`, playerHash, guideHash, `${prefix}/story.json`, storyHash, spec.gamePackVersion || 1),
      query(env.DB, "UPDATE custom_activities SET status = 'published', lease_until = NULL, generated_at = CURRENT_TIMESTAMP, published_at = CURRENT_TIMESTAMP WHERE id = ?", activity.id),
      query(env.DB, "UPDATE orders SET status = 'published' WHERE id = ? AND status IN ('paid','fulfilling')", orderId),
      query(env.DB, `UPDATE entitlements SET revision_expires_at = datetime('now','+30 days'), access_expires_at = datetime('now', ?) WHERE order_id = ?`,
        `+${accessMonths(spec)} months`, orderId),
      query(env.DB, "INSERT OR IGNORE INTO delivery_notifications (order_id,kind,status) VALUES (?,'files_ready','pending')", orderId),
      query(env.DB, "UPDATE generation_usage SET status = 'published',phase = 'delivered',completed_at = CURRENT_TIMESTAMP,error_code = NULL WHERE order_id = ? AND attempt = ?", orderId, attempt),
      query(env.DB,"UPDATE custom_delivery_incidents SET status = 'resolved' WHERE order_id = ?",orderId),
    ]);
  } catch (caught) {
    const errorCode = typeof caught?.code === 'string' && /^[A-Z0-9_]{1,60}$/.test(caught.code) ? caught.code : 'UNEXPECTED';
    const errorDetail = [caught?.message || 'Unknown failure',...(Array.isArray(caught?.issues) ? caught.issues.slice(0,5) : [])].join(' | ').slice(0,1000);
    await query(env.DB, "UPDATE generation_usage SET status = 'failed',phase = ?,error_code = ?,error_detail = ?,response_id = COALESCE(?,response_id),input_tokens = COALESCE(?,input_tokens),output_tokens = COALESCE(?,output_tokens),completed_at = CURRENT_TIMESTAMP WHERE order_id = ? AND attempt = ?", generationPhase,errorCode,errorDetail,caught?.responseId || null,caught?.usage?.input_tokens ?? null,caught?.usage?.output_tokens ?? null,orderId,attempt).run();
    console.error('Custom PDF attempt failed',{orderId,attempt,roundNumber,phase:generationPhase,code:errorCode,message:caught?.message || 'Unknown failure'});
    if (deliveryAttempt >= 2 || (generationPhase === 'story' && nonRetryableStoryCodes.has(errorCode))) await env.DB.batch([
      query(env.DB, "UPDATE custom_activities SET status = 'failed', lease_until = NULL WHERE id = ?", activity.id),
      query(env.DB, "UPDATE orders SET status = 'failed' WHERE id = ?", orderId),
      query(env.DB, "INSERT INTO delivery_notifications (order_id,kind,status,attempts) VALUES (?,'generation_failed','pending',0) ON CONFLICT(order_id,kind) DO UPDATE SET status = 'pending',attempts = 0,sent_at = NULL", orderId),
      query(env.DB,"INSERT INTO custom_delivery_incidents (order_id,phase,error_code) VALUES (?,?,?) ON CONFLICT(order_id) DO UPDATE SET phase = excluded.phase,error_code = excluded.error_code,status = 'open',alert_status = 'pending',alert_attempts = 0,alerted_at = NULL",orderId,generationPhase,errorCode),
    ]);
    else await query(env.DB, 'UPDATE custom_activities SET lease_until = 0 WHERE id = ?', activity.id).run();
    throw caught;
  }
}

async function publishRevision(revisionId, env) {
  if (!env.DB || !env.PRIVATE_FILES || !aiProvider(env)) throw new Error('Revision bindings are missing');
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
  const purchaseSpec = JSON.parse(order.purchase_spec_json);
  const remade = previous.pack_format_version === 2 ? await query(env.DB, "SELECT spec_json FROM custom_pack_remakes WHERE order_id = ? AND status = 'ready'", order.id).first() : null;
  if (previous.pack_format_version === 2 && !remade && purchaseSpec.gamePackVersion !== 2) throw new Error('Remade story specification is unavailable');
  const spec = remade ? JSON.parse(remade.spec_json) : purchaseSpec.creatorVersion === 3 ? JSON.parse(activity.story_spec_json) : purchaseSpec;
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
      query(env.DB, `INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,player_r2_key,guide_r2_key,player_sha256,guide_sha256,story_r2_key,story_sha256,pack_format_version) VALUES (?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?)`, `artifact-${order.id}-${version}`, activity.id, version, `${prefix}/player.pdf`, `${prefix}/guide.pdf`, playerHash, guideHash, `${prefix}/story.json`, storyHash, previous.pack_format_version || 1),
      query(env.DB, `UPDATE entitlements SET revision_success_used = revision_success_used + 1 WHERE order_id = ? AND revision_success_used < revision_success_limit`, order.id),
      query(env.DB, "UPDATE revision_requests SET status = 'published', lease_until = NULL, version_number = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?", version, revision.id),
      query(env.DB, 'INSERT INTO generation_usage (order_id,attempt,response_id,model,input_tokens,output_tokens,status) VALUES (?,?,?,?,?,?,?)', order.id, attempt, result.responseId, aiProvider(env)?.model, result.usage?.input_tokens || null, result.usage?.output_tokens || null, 'revision-published'),
    ]);
  } catch (caught) {
    await query(env.DB, 'INSERT OR IGNORE INTO generation_usage (order_id,attempt,model,status) VALUES (?,?,?,?)', order.id, attempt, aiProvider(env)?.model || 'unconfigured', 'revision-failed').run();
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
      try { if (message.body?.type === 'pack_remake') await processPackRemake(message.body.orderId, env); else if (message.body?.type === 'revision') await publishRevision(message.body.revisionId, env); else if (message.body?.type === 'plan') await publishPlanRequest(message.body.requestId,env); else await publishCustomOrder(message.body?.orderId, env); message.ack(); }
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
    const incidents = await query(env.DB,"SELECT order_id FROM custom_delivery_incidents WHERE status = 'open' AND alert_status = 'pending' AND alert_attempts < 5 LIMIT 20").all();
    for (const item of incidents.results || []) {
      try { await dispatchDeliveryIncident(item.order_id,env); }
      catch (caught) { console.error('Operator delivery alert failed',caught); }
    }
    if (!env.GENERATION_QUEUE) return;
    const jobs = await query(env.DB, `SELECT c.order_id FROM custom_activities c JOIN orders o ON o.id = c.order_id
      LEFT JOIN custom_plan_orders p ON p.order_id = c.order_id
      WHERE c.status IN ('queued','generating') AND COALESCE(c.lease_until,0) < ? AND o.status IN ('paid','fulfilling') AND (p.order_id IS NULL OR p.confirmed_version IS NOT NULL) LIMIT 20`, nowSeconds()).all();
    const plans = await query(env.DB,"SELECT r.id FROM custom_plan_requests r JOIN orders o ON o.id = r.order_id WHERE r.status IN ('queued','generating') AND COALESCE(r.lease_until,0) < ? AND o.status = 'paid' LIMIT 20",nowSeconds()).all();
    const revisions = await query(env.DB, "SELECT id FROM revision_requests WHERE status IN ('queued','generating') AND COALESCE(lease_until,0) < ? LIMIT 20", nowSeconds()).all();
    const remakes = await query(env.DB, "SELECT order_id FROM custom_pack_remakes WHERE status IN ('queued','generating') AND COALESCE(lease_until,0) < ? LIMIT 20", nowSeconds()).all();
    for (const item of jobs.results || []) await env.GENERATION_QUEUE.send({ orderId: item.order_id });
    for (const item of plans.results || []) await env.GENERATION_QUEUE.send({type:'plan',requestId:item.id});
    for (const item of revisions.results || []) await env.GENERATION_QUEUE.send({ type: 'revision', revisionId: item.id });
    for (const item of remakes.results || []) await env.GENERATION_QUEUE.send({ type: 'pack_remake', orderId: item.order_id });
  },
};

