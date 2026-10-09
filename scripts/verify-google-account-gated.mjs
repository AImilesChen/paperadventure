const origin = 'https://paperadventure.app';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let matched = false;
for (let attempt = 0; attempt < 12; attempt += 1) {
  const response = await fetch(origin + '/api/v1/health', { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (response.ok && data.status === 'configured_runtime' && data.account === false && data.sample === true &&
      data.checkout === false && data.generation === false && data.proposals === false && data.legal === false) {
    matched = true;
    break;
  }
  await pause(2000);
}
if (!matched) throw new Error('Apex capability gate did not propagate');
const response = await fetch(origin + '/api/v1/auth/google/config', { cache: 'no-store' });
const config = await response.json().catch(() => ({}));
if (!response.ok || config.available !== false || response.headers.has('set-cookie')) {
  throw new Error('Public Google account config remained enabled');
}
console.log('Apex Google account remains gated; free trial works and paid capabilities remain off');
