const enc = new TextEncoder();

function bytesToHex(bytes) { return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
function bytesToBase64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
function base64urlToBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid token encoding');
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}
async function hmac(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}
function sameBytes(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

export async function sha256(value) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value))));
}

export async function sha256Bytes(value) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', value)));
}

export async function signAccessToken(secret, payload) {
  const body = bytesToBase64url(enc.encode(JSON.stringify(payload)));
  const signature = bytesToBase64url(await hmac(secret, body));
  return `${body}.${signature}`;
}

export async function verifyAccessToken(secret, token, now = Date.now()) {
  if (!secret || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  try {
    const expected = await hmac(secret, parts[0]);
    if (!sameBytes(expected, base64urlToBytes(parts[1]))) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64urlToBytes(parts[0])));
    if (!payload || !Number.isInteger(payload.exp) || payload.exp <= Math.floor(now / 1000)) return null;
    if (!['email-link', 'session', 'creator-preview'].includes(payload.scope) || typeof payload.emailHash !== 'string') return null;
    return payload;
  } catch { return null; }
}

export async function verifyStripeSignature(secret, header, body, now = Date.now()) {
  if (!secret || typeof header !== 'string') return false;
  const attributes = header.split(',').map(item => item.trim().split('='));
  const timestamp = attributes.find(([key]) => key === 't')?.[1];
  const signatures = attributes.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!/^\d+$/.test(timestamp || '') || signatures.length === 0) return false;
  const seconds = Number(timestamp);
  if (Math.abs(Math.floor(now / 1000) - seconds) > 300) return false;
  const expected = await hmac(secret, `${timestamp}.${body}`);
  return signatures.some(signature => /^[a-f0-9]{64}$/i.test(signature) && sameBytes(expected, Uint8Array.from(signature.match(/../g), item => parseInt(item, 16))));
}

export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
