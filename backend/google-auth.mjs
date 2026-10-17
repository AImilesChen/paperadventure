import { ApiError } from './domain.mjs';
import { normalizeEmail } from './security.mjs';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
let cachedKeys = [];
let keysExpireAt = 0;
const invalid = () => new ApiError(401, 'GOOGLE_LOGIN_INVALID', 'Google sign-in could not be verified. Please try again.');

function decodeBase64Url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length > 16000) throw invalid();
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function googleKeys(fetcher, now) {
  if (cachedKeys.length && keysExpireAt > now) return cachedKeys;
  let response;
  try { response = await fetcher(GOOGLE_JWKS_URL); }
  catch { throw new ApiError(503, 'GOOGLE_KEYS_UNAVAILABLE', 'Google sign-in is temporarily unavailable.'); }
  if (!response.ok) throw new ApiError(503, 'GOOGLE_KEYS_UNAVAILABLE', 'Google sign-in is temporarily unavailable.');
  const body = await response.json().catch(() => null);
  if (!Array.isArray(body?.keys) || body.keys.length < 1 || body.keys.length > 20) throw invalid();
  cachedKeys = body.keys.filter(key => key.kty === 'RSA' && key.alg === 'RS256' && key.use === 'sig' && typeof key.kid === 'string');
  const maxAge = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 300);
  keysExpireAt = now + Math.min(Math.max(maxAge, 60), 3600) * 1000;
  return cachedKeys;
}

export async function verifyGoogleCredential(credential, { clientId, nonce, fetcher = fetch, now = Date.now() }) {
  if (typeof credential !== 'string' || credential.length > 16000 || !clientId || !nonce) throw invalid();
  const parts = credential.split('.');
  if (parts.length !== 3) throw invalid();
  let header, claims;
  try {
    header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
    claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
  } catch { throw invalid(); }
  if (header?.alg !== 'RS256' || typeof header.kid !== 'string') throw invalid();
  const keys = await googleKeys(fetcher, now);
  let jwk = keys.find(key => key.kid === header.kid);
  if (!jwk) {
    keysExpireAt = 0;
    jwk = (await googleKeys(fetcher, now)).find(key => key.kid === header.kid);
  }
  if (!jwk) throw invalid();
  try {
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const signed = new TextEncoder().encode(parts[0] + '.' + parts[1]);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodeBase64Url(parts[2]), signed)) throw invalid();
  } catch { throw invalid(); }
  const seconds = Math.floor(now / 1000);
  const email = normalizeEmail(claims?.email);
  if (!['https://accounts.google.com', 'accounts.google.com'].includes(claims?.iss) ||
      claims.aud !== clientId || claims.nonce !== nonce || claims.email_verified !== true ||
      !Number.isInteger(claims.exp) || claims.exp <= seconds ||
      !Number.isInteger(claims.iat) || claims.iat > seconds + 300 ||
      !email || typeof claims.sub !== 'string' || !/^[0-9]{10,30}$/.test(claims.sub)) throw invalid();
  return { email, subject: claims.sub };
}
