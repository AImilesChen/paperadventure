import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { assertPaymentRuntime } from '../scripts/payment-runtime.mjs';
import { policyReleaseSql } from '../scripts/prepare-legal-release.mjs';
import { createPolicyDocuments, includedChanges } from '../shared/legal-documents.mjs';
import { legalProfile, policyReleaseProblems } from '../shared/legal-profile.mjs';

const health = (checkoutMode, extra = {}) => ({ status: 'configured_runtime', checkout: checkoutMode !== 'closed', checkoutMode, legal: checkoutMode === 'live', ...extra });
const approved = { ...legalProfile, operatorName: "Example O'Neil", contactAddress: '1 Example Road, Example City', operatorCountry: 'Example jurisdiction', effectiveAt: '2026-10-24', ownerApproved: true };

test('declared payment release mode accepts the current sandbox and reviewed live runtime', () => {
  assert.doesNotThrow(() => assertPaymentRuntime(health('test')));
  assert.doesNotThrow(() => assertPaymentRuntime(health('test', { legal: true })));
  assert.doesNotThrow(() => assertPaymentRuntime(health('closed')));
  assert.doesNotThrow(() => assertPaymentRuntime(health('live'), { expectedMode: 'live' }));
});

test('wrong modes and incomplete live capabilities fail rather than silently enabling payment', () => {
  assert.throws(() => assertPaymentRuntime(health('live')), /declared test/);
  assert.throws(() => assertPaymentRuntime(health('test'), { expectedMode: 'live' }), /declared live/);
  assert.throws(() => assertPaymentRuntime(health('closed'), { expectedMode: 'live' }), /declared live/);
  assert.throws(() => assertPaymentRuntime(health('live', { legal: false }), { expectedMode: 'live' }), /published policies/);
  assert.throws(() => assertPaymentRuntime(health('test'), { expectedMode: 'auto' }), /must be test or live/);
  assert.throws(() => assertPaymentRuntime({}), /health is unavailable/);
  assert.throws(() => assertPaymentRuntime(health('test', { checkout: false })), /declared test/);
});

test('sandbox writes are refused for live runtime or live target, including a currently closed checkout', () => {
  for (const checkoutMode of ['test', 'live', 'closed']) {
    assert.throws(() => assertPaymentRuntime(health(checkoutMode), { expectedMode: 'live', sandboxMaintenance: true, allowClosed: true }), /cannot run/);
  }
  assert.throws(() => assertPaymentRuntime(health('live'), { sandboxMaintenance: true }), /declared test/);
  assert.throws(() => assertPaymentRuntime(health('closed'), { sandboxMaintenance: true }), /declared test/);
  assert.doesNotThrow(() => assertPaymentRuntime(health('test'), { sandboxMaintenance: true }));
  assert.doesNotThrow(() => assertPaymentRuntime(health('closed'), { sandboxMaintenance: true, allowClosed: true }));
});

test('release CLI is read-only and rejects invalid or contradictory input without logging its body', () => {
  const secretSentinel = 'private-content-not-for-logs';
  const run = (value, expected = 'test', args = []) => spawnSync(process.execPath, ['scripts/payment-runtime.mjs', ...args], { input: value, encoding: 'utf8', env: { ...process.env, PAYMENTS_EXPECTED_MODE: expected } });
  assert.equal(run(JSON.stringify(health('test'))).status, 0);
  assert.equal(run(JSON.stringify(health('live')), 'live').status, 0);
  const wrong = run(JSON.stringify({ ...health('live'), secretSentinel }));
  assert.equal(wrong.status, 1);
  assert.ok(!wrong.stderr.includes(secretSentinel));
  assert.equal(run('{bad json').status, 1);
  assert.equal(run(JSON.stringify(health('closed')), 'live', ['--sandbox-maintenance', '--allow-closed']).status, 1);
});

test('an individual operator and global audience do not create a company or market whitelist', () => {
  assert.equal(legalProfile.operatorType, 'individual');
  assert.equal(legalProfile.audience, 'worldwide');
  assert.deepEqual(policyReleaseProblems(approved), []);
  assert.equal(legalProfile.operatorName, 'mielschen');
  assert.equal(legalProfile.operatorCountry, 'Mainland China');
  assert.equal(legalProfile.contactAddress, 'No. 46 Jinqing Avenue, Luqiao District, Taizhou, Zhejiang, China');
  assert.ok(!policyReleaseProblems().includes('contactAddress'));
  assert.ok(!policyReleaseProblems().includes('operatorName'));
  assert.ok(policyReleaseProblems().includes('ownerApproved'));
  assert.ok(policyReleaseProblems({ ...approved, effectiveAt: '2026-02-30' }).includes('effectiveAt'));
  assert.throws(() => policyReleaseSql(legalProfile, { publish: true }), /owner approval/);
});

test('complete policy drafts cover actual delivery and feedback without publishing themselves', () => {
  const documents = createPolicyDocuments();
  assert.deepEqual(Object.keys(documents).sort(), ['cookies', 'privacy', 'refunds', 'terms']);
  for (const doc of Object.values(documents)) {
    assert.equal(doc.publicationStatus, 'draft');
    assert.equal(doc.effectiveAt, null);
    assert.ok(doc.sections.length >= 5);
    assert.doesNotMatch(JSON.stringify(doc), /Final reviewed wording goes here|Two successful local custom revisions|no-refunds policy/i);
  }
  const terms = JSON.stringify(documents.terms);
  assert.match(terms, /public name mielschen, based in Mainland China/);
  assert.match(terms, /Business correspondence address: No\. 46 Jinqing Avenue/);
  assert.ok(terms.includes(includedChanges.afterDelivery));
  assert.match(terms, /simpler paper-briefing edition/);
  assert.match(terms, /Earlier versions remain available/);
  const privacy = JSON.stringify(documents.privacy);
  assert.match(privacy, /modification feedback/);
  assert.match(privacy, /fal.ai/);
  assert.match(privacy, /not a promise that every order record/);
  assert.doesNotMatch(privacy, /do not currently.*collect real payments/);
  assert.match(JSON.stringify(documents.refunds), /do not assume your statutory cancellation rights have been waived/);
});

test('policy SQL preserves versions, escapes operator text and requires explicit approved publication', () => {
  const draftSql = policyReleaseSql(legalProfile);
  assert.equal((draftSql.match(/INSERT INTO legal_documents/g) || []).length, 4);
  assert.equal((draftSql.match(/,'draft'\);/g) || []).length, 4);
  const liveSql = policyReleaseSql(approved, { publish: true });
  assert.equal((liveSql.match(/,'published'\);/g) || []).length, 4);
  assert.match(liveSql, /Example O''Neil/);
  assert.doesNotMatch(liveSql, /UPDATE|DELETE|REPLACE|LEGAL_RELEASED|LIVE_PAYMENTS_ENABLED/);
  assert.equal(liveSql, policyReleaseSql(approved, { publish: true }));
  assert.notEqual(liveSql, policyReleaseSql({ ...approved, supportEmail: 'different@example.invalid' }, { publish: true }));
});

test('revised voluntary refund terms preserve mandatory rights and do not promise free unlimited generation',()=>{
  const docs=createPolicyDocuments(),refunds=JSON.stringify(docs.refunds);
  assert.match(refunds,/before custom generation has begun/);
  assert.match(refunds,/A generated personal plan is part of the custom service/);
  assert.match(refunds,/do not offer an unconditional voluntary full refund/);
  assert.match(refunds,/not a limit on mandatory rights/);
  assert.match(refunds,/two business days/);assert.match(refunds,/five business days/);
  assert.match(refunds,/partial refund does not automatically revoke/);
  assert.match(refunds,/does not reset them/);assert.match(refunds,/not copy protection/);
  assert.doesNotMatch(refunds,/all sales are final|14 days.*full refund|we charge an automatic deduction/i);
  assert.match(JSON.stringify(docs.privacy),/not that a person read or used/);
  assert.equal(docs.refunds.publicationStatus,'draft');
});

test('sandbox upload and activation workflows check mode before any remote write', () => {
  for (const [file, writeStep] of [
    ['stage-ready-packs.yml', 'node scripts/upload-stage-ready.mjs'],
    ['stripe-test-setup.yml', 'node scripts/write-stage-wrangler.mjs'],
    ['provision-backend-stage.yml', 'Create or reuse isolated D1'],
  ]) {
    const text = readFileSync(`.github/workflows/${file}`, 'utf8');
    assert.ok(text.includes('vars.PAYMENTS_EXPECTED_MODE'));
    const guard = text.indexOf('node scripts/payment-runtime.mjs --sandbox-maintenance');
    assert.ok(guard >= 0 && guard < text.indexOf(writeStep), file);
  }
  for (const file of ['deploy-preview.yml', 'deploy-creator-api.yml']) {
    const text = readFileSync(`.github/workflows/${file}`, 'utf8');
    assert.ok(text.includes('vars.PAYMENTS_EXPECTED_MODE'));
    assert.ok(text.includes('node scripts/payment-runtime.mjs <'));
    assert.doesNotMatch(text, /checkoutMode!==['"]test/);
  }
});

test('the new checkout page waits for its matching API before any public deployment',()=>{
 const workflow=readFileSync('.github/workflows/deploy-preview.yml','utf8');
 const guard=workflow.indexOf('Wait for the matching checkout API');
 assert.ok(guard>0&&guard<workflow.indexOf('Deploy verified public site'));
 assert.match(workflow,/v.purchaseConfirmationVersion!==purchaseConsentVersion/);
 assert.match(workflow,/current public page was retained/);
});
