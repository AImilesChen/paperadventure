import { googleClientId } from '../shared/google-client.mjs';

const origin = 'https://paperadventure.app';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let healthy = false;
for (let attempt = 0; attempt < 12; attempt += 1) {
  const response = await fetch(origin + '/api/v1/health', { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (response.ok && data.status === 'configured_runtime' && data.account === true && data.sample === true &&
      data.checkout === false && data.generation === true && data.proposals === true && data.legal === false) {
    healthy = true;
    break;
  }
  await pause(2000);
}
if (!healthy) throw new Error('Apex account capability or fail-closed release flags did not propagate');

const configResponse = await fetch(origin + '/api/v1/auth/google/config', { cache: 'no-store' });
const config = await configResponse.json();
const cookie = configResponse.headers.get('set-cookie') || '';
if (!configResponse.ok || config.available !== true || config.clientId !== googleClientId ||
    !/^[a-f0-9]{32}$/.test(config.nonce || '') ||
    !cookie.includes('paw_google_nonce=' + config.nonce) ||
    !/httponly/i.test(cookie) || !/secure/i.test(cookie) || !/samesite=lax/i.test(cookie)) {
  throw new Error('Google config or nonce cookie mismatch');
}

const rejected = await fetch(origin + '/api/v1/auth/google', {
  method: 'POST',
  headers: { origin, 'content-type': 'application/json', cookie: 'paw_google_nonce=' + config.nonce },
  body: JSON.stringify({ credential: 'invalid-id-token' }),
});
const rejection = await rejected.json();
if (rejected.status !== 401 || rejection.error?.code !== 'GOOGLE_LOGIN_INVALID' || rejected.headers.has('set-cookie')) {
  throw new Error('Malformed Google credential was not safely rejected');
}
const sessionResponse = await fetch(origin + '/api/v1/auth/session', { cache: 'no-store' });
const session = await sessionResponse.json();
if (!sessionResponse.ok || session.available !== true || session.authenticated !== false) {
  throw new Error('Guest session state mismatch');
}
console.log('Google config, nonce cookie, invalid-token rejection and guest session verified; no real user credential used');
