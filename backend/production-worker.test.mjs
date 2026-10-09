import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import productionWorker, { handleProductionApi } from './production-worker.mjs';
import { sha256, signAccessToken, verifyAccessToken } from './security.mjs';
import { validateGeneratedStory, validatePurchase, validateSupportedRange } from './domain.mjs';
import { buildGamePdf } from './pdf.mjs';
import { productRights } from '../shared/catalog.mjs';

function database() {
  const db = new DatabaseSync(':memory:');
  for (const name of ['0001_core.sql','0002_runtime.sql','0003_revision_attempts.sql']) db.exec(readFileSync(new URL(`./migrations/${name}`, import.meta.url), 'utf8'));
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
  db.prepare("INSERT INTO theme_worlds (id,title_en,status) VALUES ('celebration','Celebration','published')").run();
  db.prepare("INSERT INTO ready_packs (id,theme_world_id,setting,version,status,licence_version) VALUES ('pack-h01','celebration','home','v1','published','licence-1')").run();
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES ('price-1','ready_home','USD',999,'price_test_1','exclusive',1)").run();
  for (const paper of ['A4','Letter']) for (const role of ['player','guide']) db.prepare('INSERT INTO ready_pack_files (ready_pack_id,paper,role,r2_key,sha256,bytes) VALUES (?,?,?,?,?,?)').run('pack-h01',paper,role,`ready/h01/${paper}/${role}.pdf`,'test-hash',123);
  for (const kind of ['privacy','terms','cookies','refunds']) db.prepare("INSERT INTO legal_documents (kind,version,title,effective_at,sections_json,status) VALUES (?,?,?,'2026-10-07',?,'published')").run(kind,'reviewed-test-1',kind,JSON.stringify([{ heading: 'Test only', body: 'Mock test policy.' }]));
}

const request = (path, method = 'GET', data, headers = {}) => new Request(`https://adventure.example${path}`, { method, headers: { ...(data ? { 'content-type': 'application/json' } : {}), ...headers }, body: data ? JSON.stringify(data) : undefined });
const purchase = { sku: 'ready_home', themeId: 'celebration', packVersion: 'v1', email: 'Adult@example.com' };
const config = binding => ({ DB: binding, PRIVATE_FILES: { get: async () => null }, RESEND_API_KEY: 're_test', EMAIL_FROM: 'hello@adventure.example', STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_WEBHOOK_SECRET: 'whsec_fake', SESSION_SECRET: 'test-session-secret', PUBLIC_ORIGIN: 'https://adventure.example', CHECKOUT_ENABLED: 'true', LEGAL_RELEASED: 'true', TAX_CONFIGURED: 'true', CUSTOM_LICENCE_VERSION: 'custom-v1', SUPPORTED_AGE_MIN: '6', SUPPORTED_AGE_MAX: '12', HOME_PLAYER_MAX: '8', CLASSROOM_STUDENT_MAX: '40' });

test('purchase validation distinguishes ready packs from custom activity and rejects invalid groups', () => {
  assert.equal(validatePurchase(purchase).spec.kind, 'ready');
  assert.equal(validatePurchase({ sku: 'custom_classroom', customIdea: 'A moon library', players: 20, groups: 4, age: '8-10', paper: 'A4', direction: 'mission' }).spec.kind, 'custom');
  assert.throws(() => validatePurchase({ sku: 'custom_classroom', customIdea: 'A moon library', players: 20, groups: 21, age: '8-10', paper: 'A4', direction: 'mission' }), /groups/);
  const spec = validatePurchase({ sku: 'custom_home', customIdea: 'A moon library', players: 4, age: '8-10', paper: 'A4', direction: 'mission' }).spec;
  assert.doesNotThrow(() => validateSupportedRange(spec, { SUPPORTED_AGE_MIN: '6', SUPPORTED_AGE_MAX: '12', HOME_PLAYER_MAX: '8', CLASSROOM_STUDENT_MAX: '40' }));
  assert.throws(() => validateSupportedRange({ ...spec, age: '3-5' }, { SUPPORTED_AGE_MIN: '6', SUPPORTED_AGE_MAX: '12', HOME_PLAYER_MAX: '8', CLASSROOM_STUDENT_MAX: '40' }), /supported age range/);
});

test('signed email access tokens expire and reject tampering', async () => {
  const token = await signAccessToken('secret', { scope: 'session', emailHash: 'abc', exp: Math.floor(Date.now()/1000) + 10 });
  assert.equal((await verifyAccessToken('secret', token)).emailHash, 'abc');
  assert.equal(await verifyAccessToken('other', token), null);
  assert.equal(await verifyAccessToken('secret', token + 'x'), null);
  assert.equal(await verifyAccessToken('secret', token, Date.now() + 20000), null);
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
  assert.equal(readyEntitlement.ready_pack_id, 'pack-h01');
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
  assert.equal((await cases.json()).cases[0].issue_type, 'refund');
  assert.equal((await handleProductionApi(request(`/api/v1/orders/${orderId}/issues`, 'GET', undefined, { cookie: `paw_session=${otherToken}` }), env)).status, 404);
});

test('custom checkout queues generation only after a verified paid webhook', async () => {
  const { db, binding } = database();
  seedReady(db);
  db.prepare("INSERT INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES ('price-custom','custom_home','USD',1499,'price_custom_1','exclusive',1)").run();
  const queued = [];
  const env = { ...config(binding), OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model', GENERATION_QUEUE: { send: async item => queued.push(item) }, FETCH: async (_url, init) => {
    const form = new URLSearchParams(init.body);
    return Response.json({ id: 'cs_custom_001', url: 'https://checkout.stripe.com/custom', client_reference_id: form.get('client_reference_id') });
  } };
  const input = { sku: 'custom_home', customIdea: 'A moon library', players: 4, age: '8-10', paper: 'A4', direction: 'mission', email: 'adult@example.com' };
  const checkout = await handleProductionApi(request('/api/v1/checkout-intents', 'POST', input, { 'Idempotency-Key': 'custom-attempt-001', origin: 'https://adventure.example' }), env);
  assert.equal(checkout.status, 201);
  const { orderId } = await checkout.json();
  assert.equal(db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId).status, 'pending_payment');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM custom_activities').get().n, 0);
  assert.equal(queued.length, 0);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
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
  assert.equal(db.prepare("SELECT input_tokens FROM generation_usage WHERE order_id = 'order-1'").get().input_tokens, 1000);
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

test('free proposal endpoint returns two short directions and enforces an IP budget', async () => {
  const { binding } = database();
  const env = { ...config(binding), PROPOSALS_ENABLED: 'true', OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model', FETCH: async () => Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ proposals: [{ id: 'mystery', title: 'Lost note', summary: 'Follow a missing note.' }, { id: 'mission', title: 'Shared map', summary: 'Rebuild a map together.' }] }) }] }], usage: { input_tokens: 90, output_tokens: 60 } }) };
  const input = { themeId: 'celebration', setting: 'home', players: 4, age: '8-10', paper: 'A4' };
  const call = () => handleProductionApi(request('/api/v1/proposals', 'POST', input, { 'cf-connecting-ip': '203.0.113.7', origin: 'https://adventure.example' }), env);
  assert.equal((await call()).status, 200);
  assert.equal((await call()).status, 200);
  const limited = await call();
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error.code, 'PROPOSAL_LIMIT');
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
