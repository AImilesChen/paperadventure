import { pathToFileURL } from 'node:url';

// This verifies a declared release target. It never changes keys, flags or data.
export function assertPaymentRuntime(health, { expectedMode = 'test', sandboxMaintenance = false, allowClosed = false } = {}) {
  if (!['test', 'live'].includes(expectedMode)) throw new Error('PAYMENTS_EXPECTED_MODE must be test or live.');
  if (!health || health.status !== 'configured_runtime' || typeof health.checkout !== 'boolean') throw new Error('Payment runtime health is unavailable.');
  if (sandboxMaintenance && expectedMode !== 'test') throw new Error('Sandbox maintenance cannot run against a live release target.');
  const closed = health.checkout === false && health.checkoutMode === 'closed';
  if (closed && expectedMode === 'test' && (!sandboxMaintenance || allowClosed)) return;
  if (health.checkout !== true || health.checkoutMode !== expectedMode) throw new Error(`Checkout mode does not match the declared ${expectedMode} release target.`);
  if (expectedMode === 'live' && health.legal !== true) throw new Error('Live checkout requires published policies.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const expectedMode = process.env.PAYMENTS_EXPECTED_MODE || 'test';
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    assertPaymentRuntime(JSON.parse(input), {
      expectedMode,
      sandboxMaintenance: process.argv.includes('--sandbox-maintenance'),
      allowClosed: process.argv.includes('--allow-closed'),
    });
    console.log(`Verified declared ${expectedMode} payment target${process.argv.includes('--sandbox-maintenance') ? ' for sandbox-only maintenance' : ''}.`);
  } catch (error) {
    console.error(error.message); // Do not print response bodies or environment values.
    process.exitCode = 1;
  }
}
