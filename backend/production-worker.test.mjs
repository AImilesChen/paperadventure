import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import productionWorker, { handleProductionApi } from './production-worker.mjs';
import { sha256, signAccessToken, verifyAccessToken } from './security.mjs';
import { validateGeneratedStory, validatePurchase, validateSupportedRange } from './domain.mjs';
import { buildGamePdf } from './pdf.mjs';
import { productRights } from '../shared/catalog.mjs';
import { signPreview } from './creator-preview.mjs';
import { planFixture } from '../tests/fixtures/creator-plan-fixture.mjs';
import { sampleSpec, sampleStory } from '../content/custom-paper-format-sample.mjs';
import { compileControlledPuzzle, controlledStageText } from './controlled-puzzles.mjs';
import { clockSpec,clockBlueprintContext } from '../content/paper-contract-qa.mjs';
async function approvedCustomInput(env,input) {
  const spec=validatePurchase({...input,creatorVersion:2,gameplay:{primary:'reasoning',secondary:[]}}).spec;
  spec.plan=planFixture(spec,spec.direction);spec.planConfirmed=true;
  spec.previewToken=await signPreview(spec.plan,spec,await sha256(`${env.SESSION_SECRET}|${input.email}`),env.SESSION_SECRET);
  return {...spec,email:input.email};
}

function database() {
  const db = new DatabaseSync(':memory:');
  for (const name of ['0001_core.sql','0002_runtime.sql','0003_revision_attempts.sql','0004_failure_notifications.sql','0005_theme_worlds.sql','0006_ready_pack_variants.sql','0007_variant_release_status.sql','0008_custom_plan_review.sql','0009_custom_delivery_recovery.sql','0010_pdf_generation_history.sql','0011_custom_story_checkpoints.sql','0012_staged_custom_generation.sql','0013_paid_pack_remakes.sql','0014_pack_remake_recovery.sql','0015_pack_remake_rounds.sql','0016_controlled_pack_epoch.sql']) db.exec(readFileSync(new URL(`./migrations/${name}`, import.meta.url), 'utf8'));
  const binding = {
    prepare(sql) {
      return { bind(...values) {
        const statement = db.prepare(sql);
        return {
          first: async () => statement.get(...values) || null,
          all: async () => ({ results: statement.all(...values) }),
          run: async () => ({ meta: { changes: Number(statement.run(...values).changes) } }),
        };
      } };
    },
    async batch(statements) {
      db.exec('BEGIN');
      try { const values = []; for (const statement of statements) values.push(await statement.run()); db.exec('COMMIT'); return values; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
  return { db, binding };
}

function seedReady(db) {
  db.prepare("INSERT OR IGNORE INTO theme_worlds (id,title_en,status) VALUES ('celebration','Celebration','published')").run();
  for (const [id, theme, setting, status] of [
    ['pack-h01','celebration','home','release_ready'],
    ['pack-c01','celebration','classroom','release_ready'],
    ['pack-d02','dinosaur','home','published'],
  ]) db.prepare("INSERT INTO ready_packs (id,theme_world_id,setting,version,status,licence_version) VALUES (?,?,?,'v1',?,'licence-1')").run(id,theme,setting,status);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES ('price-1','ready_home','USD',999,'price_test_1','exclusive',1)").run();
  const pdfHash = createHash('sha256').update(new Uint8Array([37,80,68,70])).digest('hex');
  for (const pack of ['pack-h01','pack-c01','pack-d02']) for (const paper of ['A4','Letter']) for (const role of ['player','guide'])
    db.prepare('INSERT INTO ready_pack_files (ready_pack_id,paper,role,r2_key,sha256,bytes) VALUES (?,?,?,?,?,?)').run(pack,paper,role,`ready/${pack}/${paper}/${role}.pdf`,pdfHash,4);
  for (const kind of ['privacy','terms','cookies','refunds']) db.prepare("INSERT INTO legal_documents (kind,version,title,effective_at,sections_json,status) VALUES (?,?,?,'2026-10-07',?,'published')").run(kind,'reviewed-test-1',kind,JSON.stringify([{ heading: 'Test only', body: 'Mock test policy.' }]));
}

const request = (path, method = 'GET', data, headers = {}) => new Request(`https://adventure.example${path}`, { method, headers: { ...(data ? { 'content-type': 'application/json' } : {}), ...headers }, body: data ? JSON.stringify(data) : undefined });
const purchase = { sku: 'ready_home', themeId: 'dinosaur', packVersion: 'v1', email: 'Adult@example.com' };
const config = binding => ({ DB: binding, PRIVATE_FILES: { get: async () => null }, RESEND_API_KEY: 're_test', EMAIL_FROM: 'hello@adventure.example', ACCOUNT_ENABLED: 'true', EMAIL_LOGIN_ENABLED: 'true', GOOGLE_CLIENT_ID: 'test-google-client.apps.googleusercontent.com', STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_WEBHOOK_SECRET: 'whsec_fake', SESSION_SECRET: 'test-session-secret', PUBLIC_ORIGIN: 'https://adventure.example', CHECKOUT_ENABLED: 'true', LEGAL_RELEASED: 'true', TAX_CONFIGURED: 'true', CUSTOM_LICENCE_VERSION: 'custom-v1', SUPPORTED_AGE_MIN: '6', SUPPORTED_AGE_MAX: '12', HOME_PLAYER_MAX: '8', CLASSROOM_STUDENT_MAX: '40' });

test('DeepSeek key enables generation capability without requiring an OpenAI key', async () => {
  const { binding } = database();
  const env = { ...config(binding), AI_PROVIDER: 'deepseek', DEEPSEEK_API_KEY: 'test-only',
    GENERATION_QUEUE: { send: async () => {} }, PROPOSALS_ENABLED: 'true' };
  const ready = await handleProductionApi(request('/api/v1/health'), env);
  assert.equal((await ready.json()).generation, true);
  const missing = await handleProductionApi(request('/api/v1/health'),
    { ...env, DEEPSEEK_API_KEY: undefined, OPENAI_API_KEY: 'other-key', OPENAI_MODEL: 'gpt-test' });
  assert.equal((await missing.json()).generation, false);
});

test('six public story worlds are seeded without publishing their packs', () => {
  const { db } = database();
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM theme_worlds WHERE status = 'published'").get().n, 6);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ready_packs WHERE status = 'published'").get().n, 0);
});

test('catalog follows D1 world publication without implying a pack is available', async () => {
  const { db, binding } = database();
  db.prepare("UPDATE theme_worlds SET status = 'paused' WHERE id = 'space'").run();
  const response = await handleProductionApi(request('/api/v1/catalog'), config(binding));
  assert.equal(response.status, 200);
  const catalog = await response.json();
  assert.equal(catalog.themes.length, 5);
  assert.equal(catalog.themes.some(theme => theme.id === 'space'), false);
  assert.equal(catalog.freeSampleThemeId, null);
  assert.equal(catalog.offers.every(offer => offer.saleEnabled === false), true);
});

test('pausing Celebration hides both free trial editions without affecting another paid theme', async () => {
  const { db, binding } = database();
  seedReady(db);
  db.prepare("UPDATE theme_worlds SET status = 'paused' WHERE id = 'celebration'").run();
  const env = { ...config(binding), FREE_SAMPLE_ENABLED: 'false' };
  const catalog = await handleProductionApi(request('/api/v1/catalog'), env).then(response => response.json());
  assert.equal(catalog.themes.some(theme => theme.id === 'celebration'), false);
  assert.equal(catalog.offers.find(offer => offer.sku === 'ready_home').saleEnabled, true);
  const sample = await handleProductionApi(request('/api/v1/samples/home/A4/player'), { ...env, FREE_SAMPLE_ENABLED: 'true' });
  assert.equal(sample.status, 404);
});

test('free sample checks actual R2 bytes even when custom metadata is absent', async () => {
  const { db, binding } = database();
  seedReady(db);
  const env = { ...config(binding), FREE_SAMPLE_ENABLED: 'true',
    PRIVATE_FILES: { get: async () => ({ body: new Uint8Array([37,80,68,70]) }) } };
  const catalog = await handleProductionApi(request('/api/v1/catalog'), env).then(response => response.json());
  assert.equal(catalog.freeSampleThemeId, 'celebration');
  assert.equal(catalog.themes.find(theme => theme.id === 'celebration').home.readyStatus, 'downloadable_trial');
  assert.equal(catalog.themes.find(theme => theme.id === 'celebration').classroom.freeSample, true);
  const good = await handleProductionApi(request('/api/v1/samples/home/A4/player'), env);
  assert.equal(good.status, 200);
  assert.deepEqual(new Uint8Array(await good.arrayBuffer()), new Uint8Array([37,80,68,70]));
  assert.equal((await handleProductionApi(request('/api/v1/samples/classroom/Letter/guide'), env)).status, 200);
  const bad = await handleProductionApi(request('/api/v1/samples/home/A4/player'),
    { ...env, PRIVATE_FILES: { get: async () => ({ body: new Uint8Array([37,80,68,71]) }) } });
  assert.equal(bad.status, 503);
  assert.equal((await bad.json()).error.code, 'FILE_INTEGRITY_FAILED');
  db.prepare("UPDATE ready_packs SET status = 'internal_test' WHERE id = 'pack-c01'").run();
  const incomplete = await handleProductionApi(request('/api/v1/catalog'), env).then(response => response.json());
  assert.equal(incomplete.freeSampleThemeId, null);
  assert.equal((await handleProductionApi(request('/api/v1/samples/home/A4/player'), env)).status, 404);
});

test('Celebration cannot enter paid ready-made checkout even when the sample flag is off', async () => {
  const { db, binding } = database();
  seedReady(db);
  const env = { ...config(binding), FREE_SAMPLE_ENABLED: 'false' };
  const response = await handleProductionApi(request('/api/v1/checkout-intents', 'POST',
    { ...purchase, themeId: 'celebration' }, { origin: 'https://adventure.example' }), env);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error.code, 'SAMPLE_IS_FREE');
});

test('purchase validation distinguishes ready packs from custom activity and rejects invalid groups', () => {
  assert.equal(validatePurchase(purchase).spec.kind, 'ready');
  const proposed = validatePurchase({ sku: 'custom_home', customIdea: 'A moon library', players: 4, age: '8-10', paper: 'A4', direction: 'mission', proposalTitle: 'The missing star map', proposalSummary: 'Follow a lost map through a paper observatory.' });
  assert.equal(proposed.spec.proposalTitle, 'The missing star map');
  assert.equal(proposed.spec.proposalSummary, 'Follow a lost map through a paper observatory.');
  assert.equal(validatePurchase({ sku: 'ready_classroom', themeId: 'halloween', packVersion: 'v1', variantId: 'halloween' }).spec.variantId, 'halloween');
  assert.throws(() => validatePurchase({ sku: 'ready_classroom', themeId: 'halloween', packVersion: 'v1', variantId: 'christmas' }), /story wording/);
  assert.equal(validatePurchase({ sku: 'custom_classroom', customIdea: 'A moon library', players: 20, groups: 4, age: '8-10', paper: 'A4', direction: 'mission' }).spec.kind, 'custom');
  assert.throws(() => validatePurchase({ sku: 'custom_classroom', customIdea: 'A moon library', players: 20, groups: 21, age: '8-10', paper: 'A4', direction: 'mission' }), /groups/);
  const spec = validatePurchase({ sku: 'custom_home', customIdea: 'A moon library', players: 4, age: '8-10', paper: 'A4', direction: 'mission' }).spec;
  assert.doesNotThrow(() => validateSupportedRange(spec, { SUPPORTED_AGE_MIN: '6', SUPPORTED_AGE_MAX: '12', HOME_PLAYER_MAX: '8', CLASSROOM_STUDENT_MAX: '40' }));
  assert.throws(() => validateSupportedRange({ ...spec, age: '3-5' }, { SUPPORTED_AGE_MIN: '6', SUPPORTED_AGE_MAX: '12', HOME_PLAYER_MAX: '8', CLASSROOM_STUDENT_MAX: '40' }), /supported age range/);
});

test('classroom wording choice is snapshotted and serves only its selected private files', async () => {
  const { db, binding } = database();
  seedReady(db);
  db.prepare("INSERT INTO ready_packs (id,theme_world_id,setting,version,status,licence_version) VALUES ('pack-c05','halloween','classroom','v1','published','licence-1')").run();
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES ('price-class','ready_classroom','USD',1499,'price_test_class','exclusive',1)").run();
  const bytes = new Uint8Array([37,80,68,70]);
  const digest = createHash('sha256').update(bytes).digest('hex');
  for (const paper of ['A4','Letter']) for (const role of ['player','guide']) {
    db.prepare('INSERT INTO ready_pack_files (ready_pack_id,paper,role,r2_key,sha256,bytes) VALUES (?,?,?,?,?,?)').run('pack-c05',paper,role,`base/c05/${paper}/${role}.pdf`,digest,4);
    db.prepare("INSERT INTO ready_pack_variants (ready_pack_id,variant_id,paper,role,r2_key,sha256,bytes,status) VALUES (?,?,?,?,?,?,?,'published')").run('pack-c05','halloween',paper,role,`variant/c05/${paper}/${role}.pdf`,digest,4);
  }
  let requestedKey;
  const env = { ...config(binding),
    FETCH: async (url, init) => Response.json({ id: 'cs_variant', url: 'https://checkout.stripe.com/test',
      client_reference_id: new URLSearchParams(init.body).get('client_reference_id') }),
    PRIVATE_FILES: { get: async key => { requestedKey = key; return { body: bytes }; } } };
  const catalog = await handleProductionApi(request('/api/v1/catalog'), env).then(response => response.json());
  assert.deepEqual(catalog.themes.find(theme => theme.id === 'halloween').classroom.variantIds, ['halloween']);
  const purchaseSpec = { sku: 'ready_classroom', themeId: 'halloween', packVersion: 'v1', variantId: 'halloween', email: 'adult@example.com' };
  const checkout = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', purchaseSpec,
    { 'Idempotency-Key': 'classroom-variant-001', origin: 'https://adventure.example' }), env);
  assert.equal(checkout.status, 409);
  assert.equal((await checkout.json()).error.code, 'EDITION_RETIRED');
  // Existing orders remain versioned and downloadable after the former edition closes.
  const orderId = 'order-legacy-c05';
  const specJson = JSON.stringify(purchaseSpec);
  const emailHash = await sha256(`${env.SESSION_SECRET}|adult@example.com`);
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status) VALUES (?,'ready','ready_classroom',?,?,?,?,1499,'USD','published')")
    .run(orderId, specJson, await sha256(specJson), emailHash, 'price-class');
  db.prepare("INSERT INTO entitlements (id,order_id,ready_pack_id,status,access_expires_at) VALUES ('ent-variant',?,?,'active',datetime('now','+12 months'))").run(orderId,'pack-c05');
  const token = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash, exp: Math.floor(Date.now()/1000)+3600 });
  const file = await handleProductionApi(request(`/api/v1/files/${orderId}/player?paper=Letter`, 'GET', undefined,
    { cookie: `paw_session=${token}` }), env);
  assert.equal(file.status, 200);
  assert.equal(requestedKey, 'variant/c05/Letter/player.pdf');
  db.prepare("UPDATE ready_pack_variants SET status = 'internal_test' WHERE ready_pack_id = 'pack-c05'").run();
  const unpublished = await handleProductionApi(request('/api/v1/catalog'), env).then(response => response.json());
  assert.deepEqual(unpublished.themes.find(theme => theme.id === 'halloween').classroom.variantIds, []);
  const blocked = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', purchaseSpec,
    { 'Idempotency-Key': 'classroom-variant-002', origin: 'https://adventure.example' }), env);
  assert.equal(blocked.status, 409);
  assert.equal((await blocked.json()).error.code, 'EDITION_RETIRED');
});

test('signed email access tokens expire and reject tampering', async () => {
  const token = await signAccessToken('secret', { scope: 'session', emailHash: 'abc', exp: Math.floor(Date.now()/1000) + 10 });
  assert.equal((await verifyAccessToken('secret', token)).emailHash, 'abc');
  assert.equal(await verifyAccessToken('other', token), null);
  assert.equal(await verifyAccessToken('secret', token + 'x'), null);
  assert.equal(await verifyAccessToken('secret', token, Date.now() + 20000), null);
});

test('adult session state and sign-out reflect verified access without exposing an email', async () => {
  const { binding } = database();
  const env = config(binding);
  const anonymous = await handleProductionApi(request('/api/v1/auth/session'), env).then(response => response.json());
  assert.deepEqual(anonymous, { available: true, authenticated: false });
  const token = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: 'adult-hash', exp: Math.floor(Date.now()/1000) + 3600 });
  const signedIn = await handleProductionApi(request('/api/v1/auth/session', 'GET', undefined, { cookie: `paw_session=${token}` }), env).then(response => response.json());
  assert.deepEqual(signedIn, { available: true, authenticated: true });
  const foreignLogout = await handleProductionApi(request('/api/v1/auth/logout', 'POST', undefined, { origin: 'https://elsewhere.example' }), env);
  assert.equal(foreignLogout.status, 403);
  const logout = await handleProductionApi(request('/api/v1/auth/logout', 'POST', undefined, { origin: 'https://adventure.example' }), env);
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
});

test('isolated backend stage serves noindex pages and blocks robots', async () => {
  const env = { STAGE_PREVIEW: 'true', ASSETS: { fetch: async () => new Response('<h1>Stage</h1>', { headers: { 'content-type': 'text/html' } }) } };
  const page = await productionWorker.fetch(request('/en/'), env);
  assert.equal(page.headers.get('x-robots-tag'), 'noindex, nofollow');
  const robots = await productionWorker.fetch(request('/robots.txt'), env);
  assert.equal(await robots.text(), 'User-agent: *\nDisallow: /\n');
});

test('closed checkout fails before touching Stripe', async () => {
  const { binding } = database();
  const response = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', purchase, { 'Idempotency-Key': 'purchase-attempt-001' }), { ...config(binding), LEGAL_RELEASED: 'false' });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'CHECKOUT_NOT_READY');
});

test('JSON requests without Content-Length are still capped at 16 KiB', async () => {
  const { binding } = database();
  const oversized = new Request('https://adventure.example/api/v1/access-links', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://adventure.example' },
    body: JSON.stringify({ email: 'adult@example.com', extra: 'x'.repeat(17000) }),
  });
  const response = await handleProductionApi(oversized, config(binding));
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error.code, 'REQUEST_TOO_LARGE');
});

test('verified adults can remove a saved planning draft', async () => {
  const { db, binding } = database();
  const env = config(binding);
  const hash = await sha256(`${env.SESSION_SECRET}|adult@example.com`);
  db.prepare('INSERT INTO adult_drafts (email_hash,draft_json) VALUES (?,?)').run(hash, JSON.stringify({ themeId: 'dinosaur' }));
  const anonymous = await handleProductionApi(request('/api/v1/my-draft', 'DELETE'), env);
  assert.equal(anonymous.status, 401);
  const token = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: hash, exp: Math.floor(Date.now() / 1000) + 3600 });
  const response = await handleProductionApi(request('/api/v1/my-draft', 'DELETE', undefined, { cookie: `paw_session=${token}`, origin: 'https://adventure.example' }), env);
  assert.equal(response.status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM adult_drafts').get().n, 0);
});

test('verified Stripe payment grants only the matching ready pack and private files stay gated', async () => {
  const { db, binding } = database();
  seedReady(db);
  let checkoutInput; let emailSent = 0;
  const env = { ...config(binding), FETCH: async (url, init) => {
    if (url === 'https://api.resend.com/emails') { emailSent++; return Response.json({ id: 'email-1' }); }
    assert.match(url, /checkout\/sessions/);
    if (!init.body) return Response.json({ id: 'cs_test_001', customer_email: 'adult@example.com' });
    checkoutInput = new URLSearchParams(init.body);
    return Response.json({ id: 'cs_test_001', url: 'https://checkout.stripe.com/test', client_reference_id: checkoutInput.get('client_reference_id') });
  }, PRIVATE_FILES: { get: async () => ({ body: new Uint8Array([37,80,68,70]), customMetadata: { sha256: 'test-hash' } }) } };
  const checkout = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', purchase, { 'Idempotency-Key': 'purchase-attempt-001', origin: 'https://adventure.example' }), env);
  assert.equal(checkout.status, 201);
  const { orderId } = await checkout.json();
  assert.equal(checkoutInput.get('line_items[0][price]'), 'price_test_1');
  assert.equal(checkoutInput.get('automatic_tax[enabled]'), 'true');
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  assert.equal(JSON.parse(order.purchase_spec_json).onlineRedownloadMonths, 12);
  const session = { id: 'cs_test_001', client_reference_id: orderId, metadata: { order_id: orderId, spec_hash: order.purchase_spec_sha256 }, payment_status: 'paid', currency: 'usd', amount_subtotal: 999, amount_total: 1089, payment_intent: 'pi_test_001' };
  async function sendEvent(event) {
    const raw = JSON.stringify(event);
    const timestamp = Math.floor(Date.now()/1000);
    const signature = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest('hex');
    return handleProductionApi(new Request('https://adventure.example/api/v1/stripe/webhook', { method: 'POST', headers: { 'Stripe-Signature': `t=${timestamp},v1=${signature}` }, body: raw }), env);
  }
  const mismatch = await sendEvent({ id: 'evt_bad', type: 'checkout.session.completed', data: { object: { ...session, amount_subtotal: 1499 } } });
  assert.equal(mismatch.status, 409);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM entitlements').get().n, 0);
  const event = { id: 'evt_good', type: 'checkout.session.completed', data: { object: session } };
  assert.equal((await sendEvent(event)).status, 200);
  assert.equal((await sendEvent(event).then(response => response.json())).duplicate, true);
  assert.equal(db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId).status, 'published');
  const readyEntitlement = db.prepare('SELECT ready_pack_id,access_expires_at FROM entitlements WHERE order_id = ?').get(orderId);
  assert.equal(readyEntitlement.ready_pack_id, 'pack-d02');
  assert.ok(Date.parse(`${readyEntitlement.access_expires_at.replace(' ', 'T')}Z`) > Date.now() + 360 * 86400000);
  assert.ok(Date.parse(`${readyEntitlement.access_expires_at.replace(' ', 'T')}Z`) < Date.now() + 367 * 86400000);
  await productionWorker.scheduled(null, env);
  assert.equal(emailSent, 1);
  assert.equal(db.prepare('SELECT status FROM delivery_notifications WHERE order_id = ?').get(orderId).status, 'sent');
  assert.equal((await handleProductionApi(request(`/api/v1/files/${orderId}/player`), env)).status, 401);
  const emailHash = await sha256(`${env.SESSION_SECRET}|adult@example.com`);
  const token = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash, exp: Math.floor(Date.now()/1000)+3600 });
  const file = await handleProductionApi(request(`/api/v1/files/${orderId}/player?paper=Letter`, 'GET', undefined, { cookie: `paw_session=${token}` }), env);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'application/pdf');
  const otherToken = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: 'somebody-else', exp: Math.floor(Date.now()/1000)+3600 });
  assert.equal((await handleProductionApi(request(`/api/v1/files/${orderId}/player`, 'GET', undefined, { cookie: `paw_session=${otherToken}` }), env)).status, 404);
  db.prepare("UPDATE entitlements SET access_expires_at = datetime('now','-1 day') WHERE order_id = ?").run(orderId);
  const expiredFile = await handleProductionApi(request(`/api/v1/files/${orderId}/player`, 'GET', undefined, { cookie: `paw_session=${token}` }), env);
  assert.equal(expiredFile.status, 403);
  assert.equal((await expiredFile.json()).error.code, 'ACCESS_EXPIRED');
  const expiredView = await handleProductionApi(request(`/api/v1/orders/${orderId}`, 'GET', undefined, { cookie: `paw_session=${token}` }), env);
  assert.equal((await expiredView.json()).filesReady, false);
  const refund = await sendEvent({ id: 'evt_refund', type: 'charge.refunded', data: { object: { payment_intent: 'pi_test_001', currency: 'usd', refunded: true, amount_refunded: 1089 } } });
  assert.equal(refund.status, 200);
  assert.equal(db.prepare('SELECT status FROM entitlements WHERE order_id = ?').get(orderId).status, 'revoked');
  assert.equal((await handleProductionApi(request(`/api/v1/files/${orderId}/player`, 'GET', undefined, { cookie: `paw_session=${token}` }), env)).status, 404);
  const issue = await handleProductionApi(request(`/api/v1/orders/${orderId}/issues`, 'POST', { issueType: 'refund', description: 'The file was not usable and I need help.' }, { cookie: `paw_session=${token}`, origin: 'https://adventure.example' }), env);
  assert.equal(issue.status, 201);
  const cases = await handleProductionApi(request(`/api/v1/orders/${orderId}/issues`, 'GET', undefined, { cookie: `paw_session=${token}` }), env);
  const savedCase = (await cases.json()).cases[0];
  assert.equal(savedCase.issue_type, 'refund');
  assert.equal(savedCase.description, 'The file was not usable and I need help.');
  assert.equal((await handleProductionApi(request(`/api/v1/orders/${orderId}/issues`, 'GET', undefined, { cookie: `paw_session=${otherToken}` }), env)).status, 404);
});

test('custom checkout queues generation only after a verified paid webhook', async () => {
  const { db, binding } = database();
  seedReady(db);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES ('price-custom','custom_home','USD',1499,'price_custom_1','exclusive',1)").run();
  const queued = [];
  let checkoutForm;
  const env = { ...config(binding), OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model', GENERATION_QUEUE: { send: async item => queued.push(item) }, FETCH: async (_url, init) => {
    const form = new URLSearchParams(init.body);
    checkoutForm = form;
    return Response.json({ id: 'cs_custom_001', url: 'https://checkout.stripe.com/custom', client_reference_id: form.get('client_reference_id') });
  } };
  const input = await approvedCustomInput(env,{ sku: 'custom_home', customIdea: 'A moon library', players: 4, age: '8-10', paper: 'A4', direction: 'mission', email: 'adult@example.com' });
  const sessionToken = await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:await sha256(`${env.SESSION_SECRET}|${input.email}`),exp:Math.floor(Date.now()/1000)+3600});
  const { email: _accountEmail, ...signedInPurchase } = input;
  const checkout = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', signedInPurchase, { 'Idempotency-Key': 'custom-attempt-001', origin: 'https://adventure.example', cookie:`paw_session=${sessionToken}` }), env);
  assert.equal(checkout.status, 201);
  assert.equal(checkoutForm.get('customer_email'), null);
  const { orderId } = await checkout.json();
  assert.equal(db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId).status, 'pending_payment');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_activities').get().n, 0);
  assert.equal(queued.length, 0);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  assert.equal(order.purchaser_email_hash, await sha256(`${env.SESSION_SECRET}|adult@example.com`));
  const session = { id: 'cs_custom_001', client_reference_id: orderId, metadata: { order_id: orderId, spec_hash: order.purchase_spec_sha256 }, payment_status: 'paid', currency: 'usd', amount_subtotal: 1499, amount_total: 1499, payment_intent: 'pi_custom_001' };
  const raw = JSON.stringify({ id: 'evt_custom_001', type: 'checkout.session.completed', data: { object: session } });
  const timestamp = Math.floor(Date.now()/1000);
  const signature = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest('hex');
  const response = await handleProductionApi(new Request('https://adventure.example/api/v1/stripe/webhook', { method: 'POST', headers: { 'Stripe-Signature': `t=${timestamp},v1=${signature}` }, body: raw }), env);
  assert.equal(response.status, 200);
  assert.equal(db.prepare('SELECT status FROM custom_activities WHERE order_id = ?').get(orderId).status, 'queued');
  assert.equal(queued.length, 1);
  assert.equal(queued[0].orderId, orderId);
});

test('v3 checkout and duplicate webhook queue only the paid plan',async()=>{
  const {db,binding}=database();seedReady(db);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES ('v3-checkout-price','custom_home','USD',1499,'price_v3','exclusive',1)").run();
  const queued=[];let checkoutForm;
  const env={...config(binding),OPENAI_API_KEY:'test',OPENAI_MODEL:'test-model',GENERATION_QUEUE:{send:async value=>queued.push(value)},FETCH:async(_url,init)=>{
    const form=new URLSearchParams(init.body);checkoutForm=form;return Response.json({id:'cs_v3',url:'https://checkout.stripe.com/v3',client_reference_id:form.get('client_reference_id')});
  }};
  const input={sku:'custom_home',creatorVersion:3,customIdea:'A stopped clock tower',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:['discussion']},email:'adult@example.com'};
  const owner=await sha256(`${env.SESSION_SECRET}|${input.email}`);
  const sessionToken=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const {email:_verifiedEmail,...signedInPurchase}=input;
  const checkout=await handleProductionApi(request('/api/v1/checkout-intents','POST',signedInPurchase,{origin:env.PUBLIC_ORIGIN,cookie:`paw_session=${sessionToken}`,'Idempotency-Key':'v3-checkout-attempt-001'}),env);
  assert.equal(checkout.status,201,JSON.stringify(await checkout.clone().json()));
  assert.equal(checkoutForm.get('customer_email'),null);
  const {orderId}=await checkout.json(),order=db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  assert.equal(order.purchaser_email_hash,owner);
  assert.equal(queued.length,0);
  const session={id:'cs_v3',client_reference_id:orderId,metadata:{order_id:orderId,spec_hash:order.purchase_spec_sha256},payment_status:'paid',currency:'usd',amount_subtotal:1499,amount_total:1499,payment_intent:'pi_v3'};
  const raw=JSON.stringify({id:'evt_v3',type:'checkout.session.completed',data:{object:session}}),time=Math.floor(Date.now()/1000);
  const signature=createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(`${time}.${raw}`).digest('hex');
  const event=()=>handleProductionApi(new Request(`${env.PUBLIC_ORIGIN}/api/v1/stripe/webhook`,{method:'POST',headers:{'Stripe-Signature':`t=${time},v1=${signature}`},body:raw}),env);
  assert.equal((await event()).status,200);assert.equal((await event()).status,200);
  assert.equal(queued.length,2);assert.deepEqual(queued[0],{type:'plan',requestId:`plan-${orderId}-initial`});
  assert.deepEqual(queued[1],queued[0]);
  assert.equal(db.prepare('SELECT status FROM custom_activities WHERE order_id = ?').get(orderId).status,'queued');
  await productionWorker.scheduled(null,env);
  assert.deepEqual(queued.at(-1),queued[0]);
});

test('custom story validator requires five linked stages; PDF keeps answers out of player pack', () => {
  const spec = validatePurchase({ sku: 'custom_home', customIdea: 'The garden compass', players: 4, age: '8-10', paper: 'Letter', direction: 'mission' }).spec;
  const stages = Array.from({ length: 5 }, (_, index) => ({ title: `Stage ${index+1}`, clue: 'Choose the card with the matching route symbol.', options: ['Sun card', 'Moon card', 'Star card'], answerIndex: 0,
    explanation: 'The route symbol is the sun.', hint: 'Look at the top corner.', prerequisite: index ? `CODE-${index}` : 'START', unlock: `CODE-${index+1}` }));
  const story = validateGeneratedStory({ title: 'Garden Compass', introduction: 'A team adventure begins.', ending: 'The team celebrates.', groupInstructions: '', stages }, spec);
  const player = new TextDecoder().decode(buildGamePdf(story, spec, 'player'));
  const guide = new TextDecoder().decode(buildGamePdf(story, spec, 'guide'));
  assert.match(player, /^%PDF-1\.4/);
  assert.match(player, /Garden Compass/);
  assert.doesNotMatch(player, /Answer:/);
  assert.match(guide, /Answer: A/);
  assert.throws(() => validateGeneratedStory({ ...story, stages: story.stages.slice(1) }, spec), /five connected stages/);
});

test('paid custom queue job generates private player and guide PDFs, then publishes entitlement', async () => {
  const { db, binding } = database();
  const spec = validatePurchase({ sku: 'custom_home', customIdea: 'A garden map', players: 4, age: '8-10', paper: 'A4', direction: 'mission' }).spec;
  const specJson = JSON.stringify({ ...spec, onlineRedownloadMonths: productRights.onlineRedownloadMonths, accessPolicyVersion: productRights.version });
  const specHash = await sha256(specJson);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('custom-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status) VALUES ('order-1','custom','custom_home',?,?,?,?,1499,'USD','paid')").run(specJson,specHash,'email-hash','custom-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('activity-order-1','order-1','queued',?)").run(specJson);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit) VALUES ('ent-1','order-1','activity-order-1','active',2)").run();
  const stages = Array.from({ length: 5 }, (_, index) => ({ title: `Clue ${index + 1}`, clue: 'Choose the marker that matches the trail.', options: ['Sun marker', 'Moon marker', 'Star marker'], answerIndex: 0, explanation: 'The sun matches the trail.', hint: 'Look at the first symbol.', prerequisite: index ? `CODE-${index}` : 'START', unlock: `CODE-${index + 1}` }));
  const output = { title: 'Garden Trail', introduction: 'The group follows a friendly map.', ending: 'The group celebrates together.', groupInstructions: '', stages };
  const stored = new Map();
  const queued = [];
  let failRevisionOnce = false;
  let failGenerationOnce = true;
  const env = { ...config(binding), OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model', GENERATION_QUEUE: { send: async message => { queued.push(message); } }, FETCH: async (url, init) => {
    assert.match(url, /api\.openai\.com/);
    const name = JSON.parse(init.body).text.format.name;
    if (name === 'paper_adventure' && failGenerationOnce) { failGenerationOnce = false; return Response.json({ error: 'temporary provider failure' }, { status: 502 }); }
    if (name === 'revised_stage' && failRevisionOnce) { failRevisionOnce = false; return Response.json({ error: 'temporary provider failure' }, { status: 502 }); }
    const targetStage = name === 'revised_stage' ? JSON.parse(JSON.parse(init.body).input).stageNumber : null;
    const value = name === 'story_audit' ? { pass: true, issues: [] } : name === 'revised_stage' ? { ...stages[targetStage - 1], title: 'A gentler revised clue' } : output;
    return Response.json({ id: name === 'revised_stage' ? 'resp-2' : 'resp-1', output: [{ content: [{ type: 'output_text', text: JSON.stringify(value) }] }], usage: { input_tokens: 500, output_tokens: 800 } });
  }, PRIVATE_FILES: { put: async (key, bytes, options) => { stored.set(key, { bytes, options }); return { key }; }, get: async key => { const item = stored.get(key); return item && { body: item.bytes, customMetadata: item.options.customMetadata }; } } };
  let acknowledged = false;
  let generationRetried = false;
  await productionWorker.queue({ messages: [{ body: { orderId: 'order-1' }, ack: () => { throw new Error('Failed generation must not be acknowledged'); }, retry: () => { generationRetried = true; } }] }, env);
  assert.equal(generationRetried, true);
  assert.equal(db.prepare("SELECT status FROM custom_activities WHERE id = 'activity-order-1'").get().status, 'generating');
  await productionWorker.queue({ messages: [{ body: { orderId: 'order-1' }, ack: () => { acknowledged = true; }, retry: () => { throw new Error('The generation retry should succeed'); } }] }, env);
  assert.equal(acknowledged, true);
  assert.equal(db.prepare("SELECT status FROM orders WHERE id = 'order-1'").get().status, 'published');
  assert.equal(db.prepare("SELECT status FROM custom_activities WHERE id = 'activity-order-1'").get().status, 'published');
  const customEntitlement = db.prepare("SELECT access_expires_at,revision_expires_at FROM entitlements WHERE order_id = 'order-1'").get();
  assert.ok(Date.parse(`${customEntitlement.access_expires_at.replace(' ', 'T')}Z`) > Date.now() + 360 * 86400000);
  assert.ok(Date.parse(`${customEntitlement.access_expires_at.replace(' ', 'T')}Z`) < Date.now() + 367 * 86400000);
  assert.ok(Date.parse(`${customEntitlement.revision_expires_at.replace(' ', 'T')}Z`) < Date.now() + 31 * 86400000);
  assert.equal(db.prepare("SELECT input_tokens FROM generation_usage WHERE order_id = 'order-1' AND status = 'published'").get().input_tokens, 1000);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM generation_usage WHERE order_id = 'order-1' AND status = 'failed'").get().n, 1);
  assert.deepEqual(db.prepare("SELECT status,phase,round_number,trigger_kind FROM generation_usage WHERE order_id = 'order-1' AND status IN ('failed','published') ORDER BY attempt").all().map(row=>({...row})), [
    {status:'failed',phase:'story',round_number:1,trigger_kind:'initial'},
    {status:'published',phase:'delivered',round_number:1,trigger_kind:'automatic_retry'},
  ]);
  assert.equal(stored.size, 3);
  const player = new TextDecoder().decode(stored.get('custom/order-1/v1/player.pdf').bytes);
  assert.match(player, /^%PDF-1\.4/);
  assert.doesNotMatch(player, /Answer:/);
  const token = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: 'email-hash', exp: Math.floor(Date.now()/1000)+3600 });
  const revisionRequest = await handleProductionApi(request('/api/v1/orders/order-1/revisions', 'POST', { stageNumber: 2, instruction: 'Please make the second clue a little gentler.' }, { cookie: `paw_session=${token}`, origin: 'https://adventure.example' }), env);
  assert.equal(revisionRequest.status, 202);
  assert.equal(queued.length, 1);
  await productionWorker.queue({ messages: [{ body: queued[0], ack: () => {}, retry: () => { throw new Error('Unexpected revision retry'); } }] }, env);
  assert.equal(db.prepare("SELECT revision_success_used FROM entitlements WHERE order_id = 'order-1'").get().revision_success_used, 1);
  assert.equal(db.prepare("SELECT version_number FROM revision_requests WHERE order_id = 'order-1'").get().version_number, 2);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM artifact_versions WHERE custom_activity_id = 'activity-order-1'").get().n, 2);
  const secondRevision = await handleProductionApi(request('/api/v1/orders/order-1/revisions', 'POST', { stageNumber: 3, instruction: 'Please make the third clue easier to read aloud.' }, { cookie: `paw_session=${token}`, origin: 'https://adventure.example' }), env);
  assert.equal(secondRevision.status, 202);
  failRevisionOnce = true;
  let retried = false;
  await productionWorker.queue({ messages: [{ body: queued[1], ack: () => { throw new Error('Failed attempt must not be acknowledged'); }, retry: () => { retried = true; } }] }, env);
  assert.equal(retried, true);
  assert.equal(db.prepare("SELECT status,attempts FROM revision_requests WHERE id = ?").get(queued[1].revisionId).status, 'generating');
  assert.equal(db.prepare("SELECT attempts FROM revision_requests WHERE id = ?").get(queued[1].revisionId).attempts, 1);
  await productionWorker.queue({ messages: [{ body: queued[1], ack: () => {}, retry: () => { throw new Error('The retry should succeed'); } }] }, env);
  assert.equal(db.prepare("SELECT status,attempts FROM revision_requests WHERE id = ?").get(queued[1].revisionId).status, 'published');
  assert.equal(db.prepare("SELECT attempts FROM revision_requests WHERE id = ?").get(queued[1].revisionId).attempts, 2);
  assert.equal(db.prepare("SELECT revision_success_used FROM entitlements WHERE order_id = 'order-1'").get().revision_success_used, 2);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM artifact_versions WHERE custom_activity_id = 'activity-order-1'").get().n, 3);
  db.prepare("UPDATE entitlements SET access_expires_at = datetime('now','-1 day') WHERE order_id = 'order-1'").run();
  const expiredCustomFile = await handleProductionApi(request('/api/v1/files/order-1/player', 'GET', undefined, { cookie: `paw_session=${token}` }), env);
  assert.equal(expiredCustomFile.status, 403);
});

test('a failed PDF write resumes from the checked story without paying for another model call', async () => {
  const { db, binding } = database();
  const base = validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'A clock tower that stopped at noon',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec;
  base.gamePackVersion=1; // Simulate a legacy paid order already in delivery.
  delete base.packContractVersion;
  const plan = planFixture(base);
  const purchase = {...base,onlineRedownloadMonths:productRights.onlineRedownloadMonths,accessPolicyVersion:productRights.version};
  const confirmed = {...purchase,plan,planConfirmed:true};
  const story = {title:plan.title,introduction:plan.opening,ending:'The team restores the clock.',groupInstructions:'',stages:plan.stages.map((stage,index)=>({
    title:stage.title,mechanic:stage.mechanic,clue:'The printed note says the sun marker is correct; moon and star do not match.',
    options:['Sun marker','Moon marker','Star marker'],answerIndex:0,explanation:'The sun marker matches the printed note.',hint:'Read the note.',
    prerequisite:index ? `CODE-${index}` : 'START',unlock:`CODE-${index+1}`,
  }))};
  const purchaseJson = JSON.stringify(purchase);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('checkpoint-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('checkpoint-order','custom','custom_home',?,?,?,?,1499,'USD','paid',CURRENT_TIMESTAMP)").run(purchaseJson,await sha256(purchaseJson),'owner-hash','checkpoint-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('checkpoint-activity','checkpoint-order','queued',?)").run(JSON.stringify(confirmed));
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,active_version,confirmed_version) VALUES ('checkpoint-order','confirmed',1,1)").run();
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit) VALUES ('checkpoint-entitlement','checkpoint-order','checkpoint-activity','active',2)").run();
  let modelCalls = 0;
  let failPdfWrite = true;
  const saved = new Map();
  const env = {...config(binding),OPENAI_API_KEY:'test',OPENAI_MODEL:'test-model',FETCH:async (_,options)=>{
    modelCalls++;
    const value = JSON.parse(options.body).text.format.name === 'story_audit' ? {pass:true,issues:[]} : story;
    return Response.json({id:`model-${modelCalls}`,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:5}});
  },PRIVATE_FILES:{put:async(key,bytes,options)=>{
    if (key.endsWith('/player.pdf') && failPdfWrite) {failPdfWrite=false;throw Error('Temporary R2 write failure');}
    saved.set(key,{bytes,options});
  },head:async key=>saved.has(key)?{customMetadata:saved.get(key).options.customMetadata}:null}};
  const job = {messages:[{body:{orderId:'checkpoint-order'},ack(){},retry(){}}]};
  await productionWorker.queue(job,env);
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='checkpoint-order'").get().status,'fulfilling');
  assert.equal(db.prepare("SELECT status,phase,input_tokens,output_tokens FROM generation_usage WHERE order_id='checkpoint-order' AND attempt=1").get().phase,'storage');
  assert.equal(db.prepare("SELECT story_json FROM custom_story_checkpoints WHERE order_id='checkpoint-order'").get().story_json.length > 100,true);
  assert.equal(modelCalls,2);
  await productionWorker.queue(job,env);
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='checkpoint-order'").get().status,'published');
  assert.equal(modelCalls,2,'PDF delivery must reuse the validated story');
  assert.equal(db.prepare("SELECT input_tokens FROM generation_usage WHERE order_id='checkpoint-order' AND attempt=1").get().input_tokens,20);
  assert.equal(db.prepare("SELECT input_tokens FROM generation_usage WHERE order_id='checkpoint-order' AND attempt=2").get().input_tokens,null);
  assert.ok(saved.has('custom/checkpoint-order/v1/player.pdf'));
  assert.ok(saved.has('custom/checkpoint-order/v1/guide.pdf'));
});

test('exhausted story quality repairs stop automatic retries and retain their billed usage', async () => {
  const { db, binding } = database();
  const spec = validatePurchase({sku:'custom_home',customIdea:'A garden map',players:4,age:'8-10',paper:'A4',direction:'mission'}).spec;
  const stored = JSON.stringify({...spec,onlineRedownloadMonths:productRights.onlineRedownloadMonths,accessPolicyVersion:productRights.version});
  const stages = Array.from({length:5},(_,index)=>({title:`Stage ${index+1}`,clue:'Choose the sun marker.',options:['Sun','Moon','Star'],answerIndex:0,explanation:'The sun matches.',hint:'Read the note.',prerequisite:index?`CODE-${index}`:'START',unlock:`CODE-${index+1}`}));
  const story = {title:'Garden route',introduction:'Follow the paper clues.',ending:'The team celebrates.',groupInstructions:'',stages};
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('qa-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('qa-order','custom','custom_home',?,?,?,?,1499,'USD','paid',CURRENT_TIMESTAMP)").run(stored,await sha256(stored),'qa-owner','qa-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('qa-activity','qa-order','queued',?)").run(stored);
  let calls = 0;
  const env = {...config(binding),OPENAI_API_KEY:'test',OPENAI_MODEL:'test-model',FETCH:async(_,options)=>{
    calls++;
    const value = JSON.parse(options.body).text.format.name === 'story_audit' ? {pass:false,issues:['Ambiguous clue.']} : story;
    return Response.json({id:`qa-${calls}`,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:5}});
  },PRIVATE_FILES:{put:async()=>{throw Error('No PDF should be written');}}};
  const job = {messages:[{body:{orderId:'qa-order'},ack(){},retry(){}}]};
  await productionWorker.queue(job,env);
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='qa-order'").get().status,'failed');
  assert.deepEqual({...db.prepare("SELECT phase,error_code,input_tokens,output_tokens FROM generation_usage WHERE order_id='qa-order'").get()},{
    phase:'story',error_code:'GENERATION_QA_FAILED',input_tokens:60,output_tokens:30,
  });
  assert.match(db.prepare("SELECT error_detail FROM generation_usage WHERE order_id='qa-order'").get().error_detail,/Ambiguous clue/);
  await productionWorker.queue(job,env);
  assert.equal(calls,6,'a terminal QA failure must not trigger another full generation');
});

test('terminal custom generation failure is visible and notifies the purchaser', async () => {
  const { db, binding } = database();
  const sent = [];
  const env = { ...config(binding), OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model',
    FETCH: async (url, init) => {
      if (url.includes('api.openai.com')) return Response.json({ error: 'provider unavailable' }, { status: 502 });
      if (url.includes('api.stripe.com')) return Response.json({ id: 'cs_failed', customer_email: 'adult@example.com' });
      if (url === 'https://api.resend.com/emails') { sent.push(JSON.parse(init.body)); return Response.json({ id: 'mail-failed' }); }
      throw new Error('Unexpected upstream request');
    },
    PRIVATE_FILES: { put: async () => { throw new Error('No file should be published'); } },
  };
  const spec = validatePurchase({ sku: 'custom_home', customIdea: 'A garden map', players: 4, age: '8-10', paper: 'A4', direction: 'mission' }).spec;
  const specJson = JSON.stringify({ ...spec, onlineRedownloadMonths: productRights.onlineRedownloadMonths, accessPolicyVersion: productRights.version });
  const hash = await sha256(`${env.SESSION_SECRET}|adult@example.com`);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('custom-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,stripe_checkout_session_id) VALUES ('order-failed','custom','custom_home',?,?,?,?,1499,'USD','paid','cs_failed')").run(specJson,await sha256(specJson),hash,'custom-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('activity-failed','order-failed','queued',?)").run(specJson);
  for (let attempt = 0; attempt < 2; attempt++) {
    await productionWorker.queue({ messages: [{ body: { orderId: 'order-failed' }, ack: () => { throw new Error('Failed work must not be acknowledged'); }, retry: () => {} }] }, env);
  }
  assert.equal(db.prepare("SELECT status FROM orders WHERE id = 'order-failed'").get().status, 'failed');
  assert.equal(db.prepare("SELECT status FROM delivery_notifications WHERE order_id = 'order-failed' AND kind = 'generation_failed'").get().status, 'pending');
  await productionWorker.scheduled(null, env);
  assert.equal(sent.length, 2);
  assert.match(sent[0].subject, /needs help/);
  assert.equal(sent[1].to[0], 'support@paperadventure.app');
  assert.match(sent[1].subject, /Paid custom delivery stopped/);
  assert.equal(db.prepare("SELECT status FROM delivery_notifications WHERE order_id = 'order-failed' AND kind = 'generation_failed'").get().status, 'sent');
});

test('paid plan attempts do not exhaust PDF retries and a failed paid order can retry delivery once', async () => {
  const {db,binding}=database();
  const owner=await sha256('test-session-secret|adult@example.com');
  const spec=validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'A clock tower that stopped at noon',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec;
  const confirmed={...spec,plan:planFixture(spec),planConfirmed:true};
  const stored=JSON.stringify(spec);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('pdf-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('pdf-order','custom','custom_home',?,?,?,?,1499,'USD','paid',CURRENT_TIMESTAMP)").run(stored,await sha256(stored),owner,'pdf-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('pdf-activity','pdf-order','queued',?)").run(JSON.stringify(confirmed));
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,active_version,confirmed_version) VALUES ('pdf-order','confirmed',1,1)").run();
  db.prepare("INSERT INTO generation_usage (order_id,attempt,model,status) VALUES ('pdf-order',1,'fixture','plan-failed'),('pdf-order',2,'fixture','plan-published')").run();
  const jobs=[];
  const env={...config(binding),OPENAI_API_KEY:'test',OPENAI_MODEL:'test-model',GENERATION_QUEUE:{send:async job=>jobs.push(job)},FETCH:async()=>Response.json({error:'provider unavailable'},{status:502}),PRIVATE_FILES:{put:async()=>{throw Error('No PDF expected');}}};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const run=()=>productionWorker.queue({messages:[{body:{orderId:'pdf-order'},ack(){throw Error('A failed job cannot be acknowledged');},retry(){}}]},env);
  await run();
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='pdf-order'").get().status,'fulfilling','a plan failure must not consume a PDF attempt');
  await run();
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='pdf-order'").get().status,'failed');
  let view=await handleProductionApi(request('/api/v1/orders/pdf-order','GET',undefined,headers),env).then(r=>r.json());
  assert.equal(view.deliveryRetryAvailable,true);
  let shelf=await handleProductionApi(request('/api/v1/my-orders','GET',undefined,headers),env).then(r=>r.json());
  assert.equal(shelf.orders.find(order=>order.id==='pdf-order').deliveryRetryAvailable,true);
  const retry=()=>handleProductionApi(request('/api/v1/orders/pdf-order/retry-delivery','POST',undefined,headers),env);
  assert.equal((await retry()).status,202);
  assert.equal(jobs.length,1);
  assert.equal((await retry()).status,404,'a queued order cannot start another retry');
  assert.equal(db.prepare("SELECT status,delivery_retry_used,delivery_retry_baseline FROM custom_activities WHERE order_id='pdf-order'").get().delivery_retry_baseline,2);
  await run();
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='pdf-order'").get().status,'fulfilling');
  await run();
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='pdf-order'").get().status,'failed');
  view=await handleProductionApi(request('/api/v1/orders/pdf-order','GET',undefined,headers),env).then(r=>r.json());
  assert.equal(view.deliveryRetryAvailable,false);
  assert.equal(view.pdfGenerationHistory.length,4);
  assert.deepEqual(view.pdfGenerationHistory.map(item=>[item.round,item.attemptInRound,item.trigger,item.status]),[
    [1,1,'initial','failed'],[1,2,'automatic_retry','failed'],
    [2,1,'customer_retry','failed'],[2,2,'automatic_retry','failed'],
  ]);
  assert.equal(view.pdfGenerationHistory[0].detailsRecorded,true);
  shelf=await handleProductionApi(request('/api/v1/my-orders','GET',undefined,headers),env).then(r=>r.json());
  assert.equal(shelf.orders.find(order=>order.id==='pdf-order').deliveryRetryAvailable,false);
});

test('free proposal endpoint returns two short directions and enforces an IP budget', async () => {
  const { binding } = database();
  const env = { ...config(binding), LEGACY_PROPOSALS_ENABLED: 'true', OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model', FETCH: async () => Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ proposals: [{ id: 'mystery', title: 'Lost note', summary: 'Follow a missing note.' }, { id: 'mission', title: 'Shared map', summary: 'Rebuild a map together.' }] }) }] }], usage: { input_tokens: 90, output_tokens: 60 } }) };
  const input = { themeId: 'celebration', setting: 'home', players: 4, age: '8-10', paper: 'A4' };
  const anonymous = await handleProductionApi(request('/api/v1/proposals', 'POST', input, { 'cf-connecting-ip': '203.0.113.7', origin: 'https://adventure.example' }), env);
  assert.equal(anonymous.status, 401);
  const session = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: await sha256(`${env.SESSION_SECRET}|adult@example.com`), exp: Math.floor(Date.now()/1000)+3600 });
  const call = () => handleProductionApi(request('/api/v1/proposals', 'POST', input, { 'cf-connecting-ip': '203.0.113.7', origin: 'https://adventure.example', cookie: `paw_session=${session}` }), env);
  assert.equal((await call()).status, 200);
  assert.equal((await call()).status, 200);
  const limited = await call();
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error.code, 'PROPOSAL_LIMIT');
});

test('Stripe sandbox checkout accepts any matching Google account and uses inline test prices without legal release', async () => {
  const { db, binding } = database();
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES ('sandbox-home','custom_home','USD',1499,NULL,'exclusive',1)").run();
  let form; let sessionCount = 0;
  const env = { ...config(binding), STAGE_PREVIEW: 'true', TEST_CHECKOUT_ENABLED: 'true', CHECKOUT_ENABLED: 'false',
    LEGAL_RELEASED: 'false', TAX_CONFIGURED: 'false',
    OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model', GENERATION_QUEUE: { send: async () => {} },
    FETCH: async (_url, init) => { form = new URLSearchParams(init.body); return Response.json({ id: 'cs_test_sandbox_' + (++sessionCount), url: 'https://checkout.stripe.com/test', client_reference_id: form.get('client_reference_id') }); } };
  const health = await handleProductionApi(request('/api/v1/health'), env);
  assert.equal((await health.json()).checkoutMode, 'test');
  const input = await approvedCustomInput(env,{ sku: 'custom_home', customIdea: 'A moon library', players: 4, age: '8-10', paper: 'A4', direction: 'mission', email: 'adult@example.com' });
  const headers = { 'Idempotency-Key': 'sandbox-attempt-001', origin: 'https://adventure.example' };
  const anonymous = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', input, headers), env);
  assert.equal(anonymous.status, 403);
  const token = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: await sha256(`${env.SESSION_SECRET}|adult@example.com`), exp: Math.floor(Date.now()/1000)+3600 });
  const checkout = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', input, { ...headers, cookie: `paw_session=${token}` }), env);
  assert.equal(checkout.status, 201);
  assert.equal((await checkout.json()).mode, 'stripe_test');
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '1499');
  assert.equal(form.get('line_items[0][price]'), null);
  assert.equal(form.get('automatic_tax[enabled]'), 'false');
  const { email: _sandboxEmail, ...signedInPurchase } = input;
  const directCheckout = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', signedInPurchase,
    { ...headers, 'Idempotency-Key': 'sandbox-direct-with-session', cookie: `paw_session=${token}` }), env);
  assert.equal(directCheckout.status, 201);
  assert.equal(form.get('customer_email'), null);
  const otherToken = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: await sha256(`${env.SESSION_SECRET}|other@example.com`), exp: Math.floor(Date.now()/1000)+3600 });
  const mismatched = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', input,
    { ...headers, 'Idempotency-Key': 'sandbox-attempt-mismatch', cookie: `paw_session=${otherToken}` }), env);
  assert.equal(mismatched.status, 403);
  assert.equal((await mismatched.json()).error.code, 'ACCOUNT_EMAIL_MISMATCH');
});

test('public test catalogue and first-page previews allow any adult account to buy fixed packs', async () => {
  const { db, binding } = database();
  db.prepare("INSERT INTO ready_packs (id,theme_world_id,setting,version,status,licence_version) VALUES ('stage-d02','dinosaur','home','v0.1','internal_test','draft-not-approved')").run();
  for (const paper of ['A4','Letter']) for (const role of ['player','guide'])
    db.prepare('INSERT INTO ready_pack_files (ready_pack_id,paper,role,r2_key,sha256,bytes) VALUES (?,?,?,?,?,?)').run('stage-d02',paper,role,`internal/draft-ready/dinosaur/home/${paper}/${role}.pdf`,'0'.repeat(64),4);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES ('sandbox-ready-home','ready_home','USD',999,NULL,'exclusive',1)").run();
  let form; let sessionCount = 0;
  const env = { ...config(binding), STAGE_PREVIEW: 'true', TEST_CHECKOUT_ENABLED: 'true', CHECKOUT_ENABLED: 'false',
    LEGAL_RELEASED: 'false', TAX_CONFIGURED: 'false',
    OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model', GENERATION_QUEUE: { send: async () => {} },
    FETCH: async (_url, init) => { form = new URLSearchParams(init.body); return Response.json({ id: 'cs_ready_sandbox_' + (++sessionCount), url: 'https://checkout.stripe.com/test-ready', client_reference_id: form.get('client_reference_id') }); } };
  const publicCatalog = await handleProductionApi(request('/api/v1/catalog'), env).then(response => response.json());
  assert.equal(publicCatalog.themes.find(theme => theme.id === 'dinosaur').home.readyStatus, 'test_ready');
  assert.equal(publicCatalog.offers.find(offer => offer.sku === 'ready_home').saleEnabled, true);
  assert.equal(publicCatalog.offers.find(offer => offer.sku === 'custom_home').saleEnabled, false);
  assert.equal((await handleProductionApi(request('/api/v1/test-packs'), env)).status, 200);
  const token = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: await sha256(`${env.SESSION_SECRET}|adult@example.com`), exp: Math.floor(Date.now()/1000)+3600 });
  const cookie = { cookie: `paw_session=${token}` };
  const privateCatalog = await handleProductionApi(request('/api/v1/test-packs', 'GET', undefined, cookie), env).then(response => response.json());
  const anonymousPreview = await handleProductionApi(request('/api/v1/test-pack-previews/dinosaur/home'), env);
  assert.equal(anonymousPreview.status, 404);
  let previewKey;
  env.PRIVATE_FILES = { get: async key => { previewKey = key; return { body: new Uint8Array([0xff,0xd8,...new Uint8Array(10000)]) }; } };
  const preview = await handleProductionApi(request('/api/v1/test-pack-previews/dinosaur/home'), env);
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get('content-type'), 'image/jpeg');
  assert.match(preview.headers.get('cache-control'), /public/);
  assert.equal(previewKey, 'internal/draft-previews/dinosaur/home/v0.1-p1.jpg');
  const openingPage = await handleProductionApi(request('/api/v1/test-pack-previews/dinosaur/home/2'), env);
  assert.equal(openingPage.status, 200);
  assert.equal(previewKey, 'internal/draft-previews/dinosaur/home/v0.1-p2.jpg');

  assert.deepEqual(privateCatalog.packs, [{ themeId: 'dinosaur', setting: 'home', version: 'v0.1', variantIds: [] }]);
  const input = { sku: 'ready_home', themeId: 'dinosaur', packVersion: 'v0.1', email: 'adult@example.com' };
  const wrongVersion = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', { ...input, packVersion: 'v9' }, { ...cookie, origin: 'https://adventure.example', 'Idempotency-Key': 'sandbox-ready-wrong' }), env);
  assert.equal(wrongVersion.status, 503);
  const checkout = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', input, { ...cookie, origin: 'https://adventure.example', 'Idempotency-Key': 'sandbox-ready-correct' }), env);
  assert.equal(checkout.status, 201);
  assert.equal((await checkout.json()).mode, 'stripe_test');
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '999');
  assert.equal(form.get('automatic_tax[enabled]'), 'false');
  const otherEmail = 'another.adult@example.com';
  const otherToken = await signAccessToken(env.SESSION_SECRET, { scope: 'session', emailHash: await sha256(`${env.SESSION_SECRET}|${otherEmail}`), exp: Math.floor(Date.now()/1000)+3600 });
  const otherCheckout = await handleProductionApi(request('/api/v1/checkout-intents', 'POST',
    { ...input, email: otherEmail },
    { origin: 'https://adventure.example', 'Idempotency-Key': 'sandbox-ready-other-adult', cookie: `paw_session=${otherToken}` }), env);
  assert.equal(otherCheckout.status, 201);
  assert.equal((await otherCheckout.json()).mode, 'stripe_test');
});

test('adult email link can be used once and creates a private order session', async () => {
  const { binding } = database();
  let link;
  const env = { ...config(binding), FETCH: async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails');
    link = JSON.parse(init.body).text.match(/https:\/\/\S+/)[0];
    return Response.json({ id: 'email-1' });
  } };
  const sent = await handleProductionApi(request('/api/v1/access-links', 'POST', { email: 'ADULT@example.com' }, { origin: 'https://adventure.example', 'cf-connecting-ip': '203.0.113.8' }), env);
  assert.equal(sent.status, 200);
  assert.ok(link.includes('/api/v1/auth/verify?token='));
  const verified = await handleProductionApi(new Request(link), env);
  assert.equal(verified.status, 303);
  assert.match(verified.headers.get('set-cookie'), /HttpOnly/);
  assert.equal((await handleProductionApi(new Request(link), env)).status, 401);
  const cookie = verified.headers.get('set-cookie').split(';')[0];
  const orders = await handleProductionApi(request('/api/v1/my-orders', 'GET', undefined, { cookie }), env);
  assert.equal(orders.status, 200);
  assert.deepEqual((await orders.json()).orders, []);
});

test('Cloudflare Email binding delivers a one-use sign-in link without a Resend key', async () => {
  const { binding } = database();
  const sentMessages = [];
  const env = { ...config(binding), RESEND_API_KEY: undefined, EMAIL_FROM: 'support@paperadventure.app', EMAIL_PUBLIC_DESTINATIONS_READY: 'true',
    EMAIL: { send: async message => { sentMessages.push(message); return { messageId: 'cf-test-1' }; } },
    FETCH: async () => { throw new Error('Resend must not be called when Cloudflare Email is bound'); } };
  const unconfigured = await handleProductionApi(request('/api/v1/health'), { ...env, GOOGLE_CLIENT_ID: undefined });
  assert.equal((await unconfigured.json()).account, false);
  const health = await handleProductionApi(request('/api/v1/health'), env);
  assert.equal((await health.json()).account, true);
  const sent = await handleProductionApi(request('/api/v1/access-links', 'POST', { email: 'ADULT@example.com' },
    { origin: 'https://adventure.example', 'cf-connecting-ip': '203.0.113.9' }), env);
  assert.equal(sent.status, 200);
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].from, 'support@paperadventure.app');
  assert.equal(sentMessages[0].to, 'adult@example.com');
  const link = sentMessages[0].text.match(/https:\/\/\S+/)[0];
  assert.equal((await handleProductionApi(new Request(link), env)).status, 303);
  assert.equal((await handleProductionApi(new Request(link), env)).status, 401);
});

test('stage account gate permits only the configured delivery-test inbox', async () => {
  const { binding } = database();
  const sentMessages = [];
  const env = { ...config(binding), ACCOUNT_ENABLED: 'false', EMAIL_LOGIN_ENABLED: 'false', ACCOUNT_TEST_EMAIL: 'support@paperadventure.app', RESEND_API_KEY: undefined,
    EMAIL_FROM: 'support@paperadventure.app', EMAIL_PUBLIC_DESTINATIONS_READY: 'true',
    EMAIL: { send: async message => { sentMessages.push(message); return { messageId: 'stage-test-1' }; } } };
  const state = await handleProductionApi(request('/api/v1/auth/session'), env).then(response => response.json());
  assert.deepEqual(state, { available: false, authenticated: false });
  const blocked = await handleProductionApi(request('/api/v1/access-links', 'POST', { email: 'adult@example.com' },
    { origin: 'https://adventure.example', 'cf-connecting-ip': '203.0.113.10' }), env);
  assert.equal(blocked.status, 503);
  const allowed = await handleProductionApi(request('/api/v1/access-links', 'POST', { email: 'support@paperadventure.app' },
    { origin: 'https://adventure.example', 'cf-connecting-ip': '203.0.113.10' }), env);
  assert.equal(allowed.status, 200);
  assert.equal(sentMessages.length, 1);
});
test('Google sign-in config creates a short-lived nonce and rejects missing or invalid credentials', async () => {
  const { binding } = database();
  const env = config(binding);
  const disabled = await handleProductionApi(request('/api/v1/auth/google/config'), { ...env, ACCOUNT_ENABLED: 'false' });
  assert.deepEqual(await disabled.json(), { available: false });
  const configResponse = await handleProductionApi(request('/api/v1/auth/google/config'), env);
  const google = await configResponse.json();
  assert.equal(google.available, true);
  assert.equal(google.clientId, env.GOOGLE_CLIENT_ID);
  assert.match(google.nonce, /^[a-f0-9]{32}$/);
  assert.match(configResponse.headers.get('set-cookie'), /HttpOnly.*SameSite=Lax/);
  const missingNonce = await handleProductionApi(request('/api/v1/auth/google', 'POST', { credential: 'invalid' },
    { origin: 'https://adventure.example' }), env);
  assert.equal(missingNonce.status, 403);
  const invalidCredential = await handleProductionApi(request('/api/v1/auth/google', 'POST', { credential: 'invalid' },
    { origin: 'https://adventure.example', cookie: 'paw_google_nonce=' + google.nonce }), env);
  assert.equal(invalidCredential.status, 401);
});



test('full creator previews sign both plans, failed attempts refund quota, and saved plans verify', async()=>{
  const {binding}=database();
  const input={creatorVersion:2,customIdea:'A journey mystery',setting:'home',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:['discussion']}};
  let fail=true;
  const env={...config(binding),LEGACY_PROPOSALS_ENABLED:'true',DEEPSEEK_API_KEY:'test-only',AI_PROVIDER:'deepseek',FETCH:async(_,init)=>{
    if(fail)return new Response('unavailable',{status:502});
    const spec=JSON.parse(JSON.parse(init.body).input);
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({proposals:[planFixture(spec),planFixture(spec,'mission')]})}]}]});
  }};
  const owner=await sha256(`${env.SESSION_SECRET}|adult@example.com`);
  const session=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${session}`,origin:env.PUBLIC_ORIGIN,'cf-connecting-ip':'203.0.113.7'};
  const call=()=>handleProductionApi(request('/api/v1/proposals','POST',input,headers),env);
  assert.equal((await call()).status,502);
  assert.equal((await handleProductionApi(request('/api/v1/proposals','GET',undefined,headers),env).then(r=>r.json())).remaining,2);
  fail=false;const result=await call();assert.equal(result.status,200);const body=await result.json();assert.equal(body.remaining,1);
  const plan=body.proposals[0];assert.equal(plan.stages.length,5);assert.ok(plan.previewToken);
  const draft={...input,direction:plan.id,plan,previewToken:plan.previewToken};
  const saved=await handleProductionApi(request('/api/v1/my-draft','PUT',draft,headers),env);assert.equal(saved.status,200);
  const tampered=await handleProductionApi(request('/api/v1/my-draft','PUT',{...draft,players:5},headers),env);assert.equal(tampered.status,409);
  const restored=await handleProductionApi(request('/api/v1/my-draft','GET',undefined,headers),env).then(r=>r.json());assert.equal(restored.draft.plan.title,plan.title);
});

test('concurrent preview requests reserve the same account allowance atomically',async()=>{
  const {binding}=database();
  const env={...config(binding),LEGACY_PROPOSALS_ENABLED:'true',DEEPSEEK_API_KEY:'test-only',AI_PROVIDER:'deepseek',FETCH:async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({proposals:[{id:'mystery',title:'First',summary:'First plan'},{id:'mission',title:'Second',summary:'Second plan'}]})}]}]})};
  const session=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:'test-owner',exp:Math.floor(Date.now()/1000)+3600});
  const input={customIdea:'A paper journey',setting:'home',players:4,age:'8-10',paper:'A4'};
  const statuses=await Promise.all(Array.from({length:3},()=>handleProductionApi(request('/api/v1/proposals','POST',input,{cookie:`paw_session=${session}`,origin:env.PUBLIC_ORIGIN,'cf-connecting-ip':'203.0.113.7'}),env).then(r=>r.status)));
  assert.deepEqual(statuses.sort(),[200,200,429]);
});

test('paid v3 plan is reviewed before PDFs and only successful changes spend allowance',async()=>{
  const {db,binding}=database();
  const owner=await sha256('test-session-secret|adult@example.com');
  const spec=validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'The clock tower stopped at noon',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec;
  const stored=JSON.stringify({...spec,onlineRedownloadMonths:12});
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('v3-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status) VALUES ('v3-order','custom','custom_home',?,?,?,?,1499,'USD','paid')").run(stored,await sha256(stored),owner,'v3-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('v3-activity','v3-order','queued',?)").run(stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit) VALUES ('v3-ent','v3-order','v3-activity','active',2)").run();
  db.prepare("INSERT INTO custom_plan_orders (order_id,status) VALUES ('v3-order','queued')").run();
  db.prepare("INSERT INTO custom_plan_requests (id,order_id,kind,status) VALUES ('v3-initial','v3-order','initial','queued')").run();
  let providerCalls=0,failAudit=true;
  const queued=[];
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture-model',GENERATION_QUEUE:{send:async job=>queued.push(job)},FETCH:async(_url,init)=>{
    providerCalls++;
    const sent=JSON.parse(init.body),name=sent.text.format.name;
    if(name==='paid_plan_audit')return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({pass:!failAudit,issues:failAudit?['Mismatch']:[]})}]}]});
    assert.equal(name,'paid_adventure_plan');
    const input=JSON.parse(sent.input),plan=input.kind==='targeted'?structuredClone(input.previousPlan):planFixture(input.spec);
    if(input.kind==='full'){plan.stages[1].task+=' Check the clock face.';plan.stages[2].task+=' Ask the keeper.';plan.stages[1].scene='Beside the noon clock face';plan.stages[2].scene='At the second paper desk';}
    if(input.kind==='targeted')plan.opening+=' The clock has a paper dial.';
    return Response.json({id:'response-plan',output:[{content:[{type:'output_text',text:JSON.stringify(plan)}]}],usage:{input_tokens:100,output_tokens:150}});
  }};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN,'Idempotency-Key':'paid-plan-change-0001'};
  const post=(body,key='paid-plan-change-0001')=>handleProductionApi(request('/api/v1/orders/v3-order/plan','POST',body,{...headers,'Idempotency-Key':key}),env);
  await productionWorker.queue({messages:[{body:{orderId:'v3-order'},ack(){},retry(){throw Error('unexpected retry');}}]},env);
  assert.equal(providerCalls,0,'PDF job must stop before plan approval');
  failAudit=false;
  await productionWorker.queue({messages:[{body:{type:'plan',requestId:'v3-initial'},ack(){},retry(){throw Error('unexpected retry');}}]},env);
  assert.equal(db.prepare("SELECT active_version FROM custom_plan_orders WHERE order_id='v3-order'").get().active_version,1);
  assert.equal(db.prepare("SELECT status FROM custom_activities WHERE order_id='v3-order'").get().status,'queued');
  assert.equal((await post({action:'rework',feedback:'Make the middle checkpoints less repetitive.'})).status,202);
  assert.equal((await post({action:'rework',feedback:'Make the middle checkpoints less repetitive.'})).status,200,'network retry reuses the same job');
  const requestId=queued.at(-1).requestId;
  failAudit=true;
  await productionWorker.queue({messages:[{body:{type:'plan',requestId},ack(){throw Error('failed audit cannot ack');},retry(){}}]},env);
  assert.equal(db.prepare("SELECT full_used FROM custom_plan_orders WHERE order_id='v3-order'").get().full_used,0);
  failAudit=false;
  await productionWorker.queue({messages:[{body:{type:'plan',requestId},ack(){},retry(){throw Error('unexpected retry');}}]},env);
  assert.equal(db.prepare("SELECT full_used FROM custom_plan_orders WHERE order_id='v3-order'").get().full_used,1);
  assert.equal((await post({action:'edit',scope:'opening',feedback:'Please mention the paper clock earlier.'},'paid-plan-change-0002')).status,202);
  await productionWorker.queue({messages:[{body:queued.at(-1),ack(){},retry(){throw Error('unexpected retry');}}]},env);
  const viewed=await handleProductionApi(request('/api/v1/orders/v3-order','GET',undefined,headers),env).then(r=>r.json());
  assert.equal(viewed.gamePackVersion,2,'new paid orders identify the paper-material format');
  assert.equal(viewed.planReview.targetedUsed,1);assert.equal(viewed.planReview.versions.length,3);
  assert.equal((await post({action:'select',version:1},'paid-plan-select-0001')).status,200);
  assert.equal((await post({action:'confirm',version:1},'paid-plan-confirm-0001')).status,200);
  assert.equal(db.prepare("SELECT confirmed_version FROM custom_plan_orders WHERE order_id='v3-order'").get().confirmed_version,1);
  assert.equal(JSON.parse(db.prepare("SELECT story_spec_json FROM custom_activities WHERE order_id='v3-order'").get().story_spec_json).plan.title,viewed.planReview.versions[0].plan.title);
  assert.equal(queued.at(-1).orderId,'v3-order');
  assert.equal((await post({action:'rework',feedback:'Try again after approval.'},'paid-plan-change-0003')).status,409);
});

test('staged paid generation resumes at a failed checkpoint without regenerating saved work',async()=>{
  const {db,binding}=database();
  const purchase=validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'A clock tower that stopped at noon',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec;
  purchase.gamePackVersion=1; // Resume an order approved before interactive paper materials existed.
  delete purchase.packContractVersion;
  const plan=planFixture(purchase);
  const spec={...purchase,plan,planConfirmed:true,onlineRedownloadMonths:12};
  const stored=JSON.stringify(purchase),storySpec=JSON.stringify(spec);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('staged-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('staged-order','custom','custom_home',?,?,?,?,1499,'USD','paid',CURRENT_TIMESTAMP)").run(stored,await sha256(stored),'owner-hash','staged-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json,generation_version) VALUES ('staged-activity','staged-order','queued',?,2)").run(storySpec);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit) VALUES ('staged-entitlement','staged-order','staged-activity','active',2)").run();
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,confirmed_version) VALUES ('staged-order','confirmed',1)").run();
  const calls=[];const queued=[];const saved=new Map();let failThird=true,rejectFourth=true,failFirstPdf=true,queueRetries=0;
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture-model',GENERATION_QUEUE:{send:async job=>queued.push(job)},
    PRIVATE_FILES:{put:async(key,bytes,options)=>{if(key.endsWith('/player.pdf')&&failFirstPdf){failFirstPdf=false;throw new Error('Temporary PDF storage failure');}saved.set(key,{bytes,options});},head:async key=>saved.get(key)&&{customMetadata:saved.get(key).options.customMetadata}},
    FETCH:async(_url,init)=>{
      const payload=JSON.parse(init.body),name=payload.text.format.name;
      const input=JSON.parse(payload.input);calls.push([name,input.stageNumber||0]);
      if(name==='game_checkpoint'&&input.stageNumber===3&&failThird){failThird=false;return new Response('Temporary failure',{status:502});}
      const value=name==='game_blueprint'?{ending:'The team repairs the paper clock and celebrates together.',groupInstructions:'',stages:Array.from({length:5},(_,index)=>({question:`Which record completes checkpoint ${index+1}?`,evidence:`The correct record has symbol ${index+1}.`,options:[`Symbol ${index+1}`,`Old symbol ${index+1}`,`Other symbol ${index+1}`],answerIndex:0,unlock:`CLOCK-${index+1}`}))}
        :name==='game_checkpoint'?{clue:`${input.blueprintCheckpoint.question} ${input.blueprintCheckpoint.evidence} The other records have old or other symbols.`,explanation:'The first choice matches the numbered symbol in the printed evidence.',hint:'Compare the symbols in the records.'}
        :rejectFourth?(rejectFourth=false,{pass:false,issues:[{stageNumber:4,reason:'The fourth clue needs a clearer printed fact.'}]}):{pass:true,issues:[]};
      return Response.json({id:`response-${calls.length}`,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:20}});
    }};
  const process=()=>productionWorker.queue({messages:[{body:{orderId:'staged-order'},ack(){},retry(){queueRetries++;}}]},env);
  await process();
  assert.deepEqual(db.prepare('SELECT stage_number FROM custom_game_stages WHERE order_id = ? ORDER BY stage_number').all('staged-order').map(row=>row.stage_number),[1,2]);
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='staged-order'").get().status,'fulfilling');
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:'owner-hash',exp:Math.floor(Date.now()/1000)+3600});
  const view=await handleProductionApi(request('/api/v1/orders/staged-order','GET',undefined,{cookie:`paw_session=${token}`}),env).then(response=>response.json());
  assert.equal(view.gamePackVersion,1,'a previously approved paid order keeps its original pack format');
  assert.deepEqual(view.revisionRequests,[]);
  assert.equal(view.generationProgress.phase,'checkpoint');assert.equal(view.generationProgress.currentStage,3);
  await process();
  assert.deepEqual(db.prepare('SELECT stage_number FROM custom_game_stages WHERE order_id = ? ORDER BY stage_number').all('staged-order').map(row=>row.stage_number),[1,2,3,5]);
  assert.equal(db.prepare("SELECT status FROM custom_activities WHERE id='staged-activity'").get().status,'generating');
  await process();
  assert.equal(db.prepare("SELECT status FROM custom_activities WHERE id='staged-activity'").get().status,'queued');
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM custom_story_checkpoints WHERE order_id='staged-order'").get().count,1);
  const storyCalls=calls.length;
  await process();
  assert.equal(queueRetries,1,'a temporary PDF storage failure should retry delivery');
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='staged-order'").get().status,'fulfilling');
  assert.equal(calls.length,storyCalls,'PDF retry cannot ask the model to regenerate the saved game');
  await process();
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='staged-order'").get().status,'published');
  assert.equal(calls.filter(([name])=>name==='game_blueprint').length,1);
  assert.equal(calls.filter(([name,number])=>name==='game_checkpoint'&&number===1).length,1);
  assert.equal(calls.filter(([name,number])=>name==='game_checkpoint'&&number===2).length,1);
  assert.equal(calls.filter(([name,number])=>name==='game_checkpoint'&&number===3).length,2);
  assert.equal(calls.filter(([name,number])=>name==='game_checkpoint'&&number===4).length,2);
  assert.equal(calls.filter(([name,number])=>name==='game_checkpoint'&&number===5).length,1);
  assert.equal(calls.filter(([name])=>name==='staged_story_audit').length,2);
  assert.equal(saved.size,3);
  const callCount=calls.length;await process();assert.equal(calls.length,callCount,'a duplicate queue message cannot spend more tokens');
  assert.equal(queued.length,3);
});

test('a paid legacy pack remakes on the same order and keeps the old download until the new files pass',async()=>{
  const {db,binding}=database();
  const owner='paid-legacy-owner';
  const original={...sampleSpec,gamePackVersion:1};
  const purchase=JSON.stringify(original);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('remake-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('legacy-order','custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(purchase,await sha256(purchase),owner,'remake-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('legacy-activity','legacy-order','published',?)").run(purchase);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit,revision_expires_at,access_expires_at) VALUES ('legacy-entitlement','legacy-order','legacy-activity','active',2,datetime('now','+20 days'),datetime('now','+6 months'))").run();
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,confirmed_version) VALUES ('legacy-order','confirmed',1)").run();
  const files=new Map();
  for(const role of ['player','guide']) {
    const bytes=buildGamePdf(sampleStory,original,role),sha=createHash('sha256').update(bytes).digest('hex');
    files.set(`custom/legacy-order/v1/${role}.pdf`,{bytes,sha});
    if(role==='player') db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,player_r2_key,player_sha256) VALUES ('legacy-artifact','legacy-activity',1,'published',?,?)").run(`custom/legacy-order/v1/${role}.pdf`,sha);
    else db.prepare("UPDATE artifact_versions SET guide_r2_key = ?,guide_sha256 = ? WHERE id = 'legacy-artifact'").run(`custom/legacy-order/v1/${role}.pdf`,sha);
  }
  const queue=[];const calls=[];let failFirstNewPdf=true,failFirstAudit=true;
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture-model',
    GENERATION_QUEUE:{send:async job=>queue.push(job)},
    PRIVATE_FILES:{put:async(key,body,options)=>{if(key.includes('paper-remake/player.pdf')&&failFirstNewPdf){failFirstNewPdf=false;throw new Error('Temporary replacement storage failure');}files.set(key,{bytes:typeof body==='string'?new TextEncoder().encode(body):body,sha:options.customMetadata.sha256});},get:async key=>{const file=files.get(key);return file&&{body:file.bytes,customMetadata:{sha256:file.sha}};}},
    FETCH:async(_url,init)=>{
      const payload=JSON.parse(init.body),name=payload.text.format.name,input=JSON.parse(payload.input);
      calls.push([name,input.stageNumber||0]);
      const value=name==='game_blueprint'?{ending:sampleStory.ending,groupInstructions:'',stages:sampleStory.stages.map((stage,index)=>({question:stage.clue,evidence:stage.clue,options:stage.options,answerIndex:stage.answerIndex,unlock:stage.unlock,material:{...stage.material,items:stage.material.items.slice(0,index===1&&!input.candidate?3:['order_tiles','symbol_key'].includes(stage.material.type)?4:3)}}))}
        :name==='game_checkpoint'?{clue:sampleStory.stages[input.stageNumber-1].clue,explanation:sampleStory.stages[input.stageNumber-1].explanation,hint:sampleStory.stages[input.stageNumber-1].hint}
        :failFirstAudit?(failFirstAudit=false,{pass:false,issues:[{stageNumber:1,reason:'Stage 1 answer leaks because an option repeats a printed card.'}]}):{pass:true,issues:[]};
      return Response.json({id:`remake-${calls.length}`,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:20}});
    }};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const view=()=>handleProductionApi(request('/api/v1/orders/legacy-order','GET',undefined,headers),env).then(response=>response.json());
  const download=()=>handleProductionApi(request('/api/v1/files/legacy-order/player?paper=A4','GET',undefined,headers),env);
  assert.equal((await view()).gamePackVersion,1);
  const oldPdf=new Uint8Array(await (await download()).arrayBuffer());
  assert.equal((await handleProductionApi(request('/api/v1/orders/legacy-order/pack-remake','POST',undefined,{origin:env.PUBLIC_ORIGIN}),env)).status,401);
  assert.equal((await handleProductionApi(request('/api/v1/orders/legacy-order/pack-remake','POST',undefined,headers),env)).status,202);
  assert.equal((await handleProductionApi(request('/api/v1/orders/legacy-order/pack-remake','POST',undefined,headers),env)).status,200);
  assert.equal(queue.length,1,'repeat clicks do not start another model run');
  assert.equal((await view()).remake.status,'queued');
  for(let step=0;step<17 && (await view()).remake.status!=='ready';step++) {
    const job=queue.shift();assert.equal(job?.type,'pack_remake');
    let retries=0;await productionWorker.queue({messages:[{body:job,ack(){},retry(){retries++;}}]},env);
    assert.equal(retries,0);
    if((await view()).remake.status!=='ready') assert.deepEqual(new Uint8Array(await (await download()).arrayBuffer()),oldPdf,'old PDF stays available until replacement is complete');
  }
  const completed=await view();
  assert.equal(completed.remake.status,'ready');
  assert.equal(completed.gamePackVersion,2);
  assert.equal(completed.checkedPuzzleRevision,true);
  const unsupportedChange=await handleProductionApi(request('/api/v1/orders/legacy-order/revisions','POST',{stageNumber:1,instruction:'Replace this puzzle with a maze.'},headers),env);
  assert.equal(unsupportedChange.status,422,'unsupported changes fail before queueing or consuming a revision');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM revision_requests WHERE order_id='legacy-order'").get().n,0);
  const supportedChange=await handleProductionApi(request('/api/v1/orders/legacy-order/revisions','POST',{stageNumber:1,instruction:'Clarify the printed instructions and hint without changing the story.'},headers),env);
  assert.equal(supportedChange.status,202);
  assert.equal(queue.at(-1).type,'revision');
  assert.equal(completed.amountTotal,1499,'remake does not create a second charge');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artifact_versions').get().n,2);
  assert.equal(db.prepare("SELECT pack_format_version FROM artifact_versions WHERE version_number=1").get().pack_format_version,1);
  assert.equal(db.prepare("SELECT pack_format_version FROM artifact_versions WHERE version_number=2").get().pack_format_version,2);
  assert.equal(calls.length,2,'a rejected blueprint gets one repair; checked puzzle steps and PDF retries use no more model calls');
  assert.notDeepEqual(new Uint8Array(await (await download()).arrayBuffer()),oldPdf,'downloads switch only after checked publication');
  const originalDownload=await handleProductionApi(request('/api/v1/files/legacy-order/player?paper=A4&version=1','GET',undefined,headers),env);
  assert.deepEqual(new Uint8Array(await originalDownload.arrayBuffer()),oldPdf,'the earlier pack can still be downloaded by its owner');
});

test('an original checked pack can publish a checkpoint revision without a remake or model call',async()=>{
  const {db,binding}=database(),owner='checked-original-owner';
  const spec={...sampleSpec,creatorVersion:3,packLogicVersion:1};
  const stored=JSON.stringify(spec);
  const stages=sampleStory.stages.map((original,index)=>{
    const puzzle=compileControlledPuzzle({number:index+1,title:original.title,material:original.material});
    return {...original,...controlledStageText(puzzle),options:puzzle.options,answerIndex:puzzle.answerIndex,material:puzzle.material};
  });
  const story=validateGeneratedStory({...sampleStory,stages},spec),storyJson=JSON.stringify(story),storyHash=await sha256(storyJson);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('checked-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('checked-order','custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(stored,await sha256(stored),owner,'checked-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('checked-activity','checked-order','published',?)").run(stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit,revision_expires_at,access_expires_at) VALUES ('checked-entitlement','checked-order','checked-activity','active',2,datetime('now','+20 days'),datetime('now','+6 months'))").run();
  db.prepare("INSERT INTO artifact_versions (id,custom_activity_id,version_number,status,story_r2_key,story_sha256,pack_format_version) VALUES ('checked-artifact','checked-activity',1,'published','original/story.json',?,2)").run(storyHash);
  const queue=[],files=new Map([['original/story.json',{body:storyJson,customMetadata:{sha256:storyHash}}]]);
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async job=>queue.push(job)},FETCH:async()=>{throw Error('Checked revisions cannot call a model');},PRIVATE_FILES:{get:async key=>files.get(key),put:async(key,body,options)=>files.set(key,{body,...options})}};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const response=await handleProductionApi(request('/api/v1/orders/checked-order/revisions','POST',{stageNumber:2,instruction:'Clarify the instructions and hint.'},{cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN}),env);
  assert.equal(response.status,202,await response.text());
  await productionWorker.queue({messages:[{body:queue[0],ack(){},retry(){throw Error('A valid checked revision must publish');}}]},env);
  assert.equal(db.prepare("SELECT status FROM revision_requests WHERE order_id='checked-order'").get().status,'published');
  assert.equal(db.prepare("SELECT revision_success_used FROM entitlements WHERE order_id='checked-order'").get().revision_success_used,1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM custom_pack_remakes").get().n,0);
  assert.ok(files.has('custom/checked-order/v2/player.pdf'));
  assert.ok(files.has('custom/checked-order/v2/guide.pdf'));
});

test('a failed paid remake can recover twice without paying again or reusing exhausted model calls',async()=>{
  const {db,binding}=database(),owner='recovery-owner';
  const purchase=JSON.stringify({...sampleSpec,gamePackVersion:1});
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('old-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('remake-failed','custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(purchase,await sha256(purchase),owner,'old-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('old-activity','remake-failed','published',?)").run(purchase);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,access_expires_at) VALUES ('old-entitlement','remake-failed','old-activity','active',datetime('now','+6 months'))").run();
  const specJson=JSON.stringify({...sampleSpec,packLogicVersion:1});
  db.prepare("INSERT INTO custom_pack_remakes (order_id,status,phase,spec_json,spec_sha256,error_code,failure_count) VALUES ('remake-failed','failed','blueprint',?,?,'BLUEPRINT_INVALID',2)").run(specJson,await sha256(specJson));
  for(let i=1;i<=2;i++) db.prepare("INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,error_code) VALUES (?, 'remake-failed','blueprint',0,'failed','fixture','BLUEPRINT_INVALID')").run(`old-blueprint-${i}`);
  const queued=[];
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture-model',GENERATION_QUEUE:{send:async job=>queued.push(job)},PRIVATE_FILES:{get:async()=>null},
    FETCH:async()=>Response.json({id:'recovered-blueprint',output:[{content:[{type:'output_text',text:JSON.stringify({ending:sampleStory.ending,groupInstructions:'',stages:sampleStory.stages.map(stage=>({question:stage.clue,evidence:stage.clue,options:stage.options,answerIndex:stage.answerIndex,unlock:stage.unlock,material:{...stage.material,items:stage.material.items.slice(0,['order_tiles','symbol_key'].includes(stage.material.type)?4:3)}}))})}]}],usage:{input_tokens:10,output_tokens:20}})};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const retry=()=>handleProductionApi(request('/api/v1/orders/remake-failed/pack-remake/retry','POST',undefined,headers),env);
  assert.equal((await retry()).status,202);
  assert.equal((await retry()).status,409,'the same paid order allows only one recovery request');
  assert.equal(db.prepare("SELECT recovery_count,status FROM custom_pack_remakes WHERE order_id='remake-failed'").get().recovery_count,1);
  await productionWorker.queue({messages:[{body:queued.shift(),ack(){},retry(){throw Error('queue job should not retry');}}]},env);
  assert.equal(db.prepare("SELECT round_number,status FROM custom_pack_remake_calls WHERE order_id='remake-failed' ORDER BY round_number DESC LIMIT 1").get().round_number,2);
  assert.equal(db.prepare("SELECT status,phase FROM custom_pack_remakes WHERE order_id='remake-failed'").get().phase,'checkpoint');
  db.prepare("UPDATE custom_pack_remakes SET status='failed',error_code='STAGE_INVALID' WHERE order_id='remake-failed'").run();
  assert.equal((await retry()).status,202,'a later checkpoint validation failure can resume the same paid order');
  assert.equal(db.prepare("SELECT recovery_round,status FROM custom_pack_remakes WHERE order_id='remake-failed'").get().recovery_round,2);
  assert.equal((await retry()).status,409,'a queued recovery cannot be submitted twice');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
});

test('an exhausted old paid remake can restart once with checked puzzles and no second payment',async()=>{
  const {db,binding}=database(),owner='upgrade-owner';
  const purchase=JSON.stringify({...sampleSpec,gamePackVersion:1});
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('upgrade-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('upgrade-order','custom','custom_home',?,?,?,?,1499,'USD','published',CURRENT_TIMESTAMP)").run(purchase,await sha256(purchase),owner,'upgrade-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json) VALUES ('upgrade-activity','upgrade-order','published',?)").run(purchase);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,access_expires_at) VALUES ('upgrade-entitlement','upgrade-order','upgrade-activity','active',datetime('now','+6 months'))").run();
  const oldSpec=JSON.stringify({...sampleSpec,gamePackVersion:2});
  db.prepare("INSERT INTO custom_pack_remakes (order_id,status,phase,spec_json,spec_sha256,blueprint_json,blueprint_sha256,stages_json,error_code,recovery_round) VALUES ('upgrade-order','failed','audit',?,?,?,?,'[]','GENERATION_QA_FAILED',2)").run(oldSpec,await sha256(oldSpec),'{"old":"blueprint"}','old-hash');
  db.prepare("INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,result_json,generation_round) VALUES ('old-upgrade-call','upgrade-order','blueprint',0,'passed','fixture',?,3)").run(JSON.stringify({old:'result'}));
  const queued=[];
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture-model',GENERATION_QUEUE:{send:async job=>queued.push(job)},PRIVATE_FILES:{get:async()=>null}};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const retry=()=>handleProductionApi(request('/api/v1/orders/upgrade-order/pack-remake/retry','POST',undefined,headers),env);
  const upgradedResponse=await retry();
  assert.equal(upgradedResponse.status,202,await upgradedResponse.text());
  const saved=db.prepare("SELECT status,phase,spec_json,blueprint_json,recovery_round,logic_epoch FROM custom_pack_remakes WHERE order_id='upgrade-order'").get();
  assert.equal(saved.status,'queued');assert.equal(saved.phase,'blueprint');assert.equal(saved.blueprint_json,null);
  assert.equal(saved.recovery_round,0);assert.equal(saved.logic_epoch,1);assert.equal(JSON.parse(saved.spec_json).packLogicVersion,1);
  assert.equal(db.prepare("SELECT result_json,logic_epoch FROM custom_pack_remake_calls WHERE id='old-upgrade-call'").get().logic_epoch,0);
  assert.ok(db.prepare("SELECT result_json FROM custom_pack_remake_calls WHERE id='old-upgrade-call'").get().result_json,'older call history remains available for support');
  assert.deepEqual(queued,[{type:'pack_remake',orderId:'upgrade-order'}]);
  assert.equal((await retry()).status,409);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);
});

test('a failed paid first plan offers one free recovery without another checkout or spending edits',async()=>{
  const {db,binding}=database();
  const owner=await sha256('test-session-secret|adult@example.com');
  const spec=validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'A clock tower that stopped at noon',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}}).spec;
  const stored=JSON.stringify(spec);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('recovery-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status) VALUES ('recovery-order','custom','custom_home',?,?,?,?,1499,'USD','paid')").run(stored,await sha256(stored),owner,'recovery-price');
  db.prepare("INSERT INTO custom_plan_orders (order_id,status) VALUES ('recovery-order','needs_help')").run();
  db.prepare("INSERT INTO custom_plan_requests (id,order_id,kind,status,attempts) VALUES ('recovery-initial','recovery-order','initial','failed',3)").run();
  const queued=[];
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture-model',GENERATION_QUEUE:{send:async job=>queued.push(job)},FETCH:async(_url,options)=>{
    const payload=JSON.parse(options.body);
    const value=payload.text.format.name==='paid_plan_audit'?{pass:true,issues:[]}:planFixture(spec);
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]});
  }};
  const token=await signAccessToken(env.SESSION_SECRET,{scope:'session',emailHash:owner,exp:Math.floor(Date.now()/1000)+3600});
  const headers={cookie:`paw_session=${token}`,origin:env.PUBLIC_ORIGIN};
  const get=()=>handleProductionApi(request('/api/v1/orders/recovery-order','GET',undefined,headers),env).then(response=>response.json());
  const post=()=>handleProductionApi(request('/api/v1/orders/recovery-order/plan','POST',{action:'retry_initial'},headers),env);
  assert.equal((await get()).planReview.retryAvailable,true);
  assert.equal((await post()).status,202);
  assert.equal((await post()).status,409,'a second click cannot queue another request');
  assert.equal((await get()).planReview.status,'queued');
  assert.equal(queued.length,1);
  await productionWorker.queue({messages:[{body:queued[0],ack(){},retry(){throw Error('unexpected retry');}}]},env);
  const viewed=await get();
  assert.equal(viewed.planReview.status,'review');
  assert.equal(viewed.planReview.versions.length,1);
  assert.equal(viewed.planReview.fullUsed,0);
  assert.equal(viewed.planReview.targetedUsed,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM orders WHERE id='recovery-order'").get().count,1);
});


test('contract delivery repairs one rejected context, then retries PDF storage without more AI calls',async()=>{
  const {db,binding}=database();
  const stored=JSON.stringify({...clockSpec,onlineRedownloadMonths:12,accessPolicyVersion:productRights.version});
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,tax_behavior,sale_enabled) VALUES ('contract-price','custom_home','USD',1499,'exclusive',1)").run();
  db.prepare("INSERT INTO orders (id,product_kind,sku,purchase_spec_json,purchase_spec_sha256,purchaser_email_hash,price_version_id,amount_total,currency,status,paid_at) VALUES ('contract-order','custom','custom_home',?,?,?,?,1499,'USD','paid',CURRENT_TIMESTAMP)").run(stored,await sha256(stored),'contract-owner','contract-price');
  db.prepare("INSERT INTO custom_activities (id,order_id,status,story_spec_json,generation_version) VALUES ('contract-activity','contract-order','queued',?,2)").run(stored);
  db.prepare("INSERT INTO entitlements (id,order_id,custom_activity_id,status,revision_success_limit) VALUES ('contract-entitlement','contract-order','contract-activity','active',2)").run();
  db.prepare("INSERT INTO custom_plan_orders (order_id,status,confirmed_version) VALUES ('contract-order','confirmed',1)").run();
  const calls=[],files=new Map();let reject=true,storageFails=true;
  const env={...config(binding),OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture',GENERATION_QUEUE:{send:async()=>{}},
    PRIVATE_FILES:{put:async(key,bytes,options)=>{if(storageFails){storageFails=false;throw Error('Temporary storage failure');}files.set(key,{bytes,options});},head:async key=>files.has(key)?{customMetadata:files.get(key).options.customMetadata}:null},
    FETCH:async(url,request)=>{
      const body=JSON.parse(request.body),name=body.text.format.name;calls.push(name);
      let value;
      if(name==='game_blueprint')value=clockBlueprintContext;
      else if(name==='paper_context_repair'){
        assert.equal(JSON.parse(body.input).checkpoint.number,3);
        value=structuredClone(clockBlueprintContext.stages[2]);value.material.items[0].label='Pause noon signal';
      }else if(name==='staged_story_audit')value=reject?(reject=false,{pass:false,issues:[{stageNumber:3,reason:'Clarify the first clock repair step.'}]}):{pass:true,issues:[]};
      else throw Error('Unexpected model request: '+name);
      return Response.json({id:'contract-'+calls.length,output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:20}});
    }};
  const process=()=>productionWorker.queue({messages:[{body:{orderId:'contract-order'},ack(){},retry(){}}]},env);
  for(let i=0;i<8&&db.prepare("SELECT status FROM orders WHERE id='contract-order'").get().status!=='published';i++)await process();
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='contract-order'").get().status,'published');
  assert.deepEqual(calls,['game_blueprint','staged_story_audit','paper_context_repair','staged_story_audit']);
  assert.equal(files.size,3);
  const stages=db.prepare("SELECT stage_json FROM custom_game_stages WHERE order_id='contract-order' ORDER BY stage_number").all().map(row=>JSON.parse(row.stage_json));
  assert.equal(stages.length,5);assert.equal(stages[2].material.items[0].label,'Pause noon signal');
  assert.deepEqual(stages[4].material.logic.previousDigits,['3','1','2','3']);
  const count=calls.length;await process();assert.equal(calls.length,count);
});
