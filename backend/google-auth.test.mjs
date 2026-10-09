import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyGoogleCredential } from './google-auth.mjs';

const encoded = value => Buffer.from(value instanceof Uint8Array ? value :
  typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

test('Google ID token requires a valid signature, audience, nonce and verified adult email', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...await crypto.subtle.exportKey('jwk', pair.publicKey), kid: 'test-google-key-1', alg: 'RS256', use: 'sig' };
  const fetcher = async url => {
    assert.equal(url, 'https://www.googleapis.com/oauth2/v3/certs');
    return Response.json({ keys: [jwk] }, { headers: { 'cache-control': 'max-age=300' } });
  };
  const now = Date.now();
  const claims = { iss: 'https://accounts.google.com', aud: 'paper-client.apps.googleusercontent.com',
    sub: '123456789012345678901', email: 'Adult@Example.com', email_verified: true,
    nonce: 'server-issued-nonce', iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 3600 };
  async function token(payload) {
    const prefix = encoded({ alg: 'RS256', kid: jwk.kid, typ: 'JWT' }) + '.' + encoded(payload);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(prefix));
    return prefix + '.' + encoded(new Uint8Array(signature));
  }
  const options = { clientId: claims.aud, nonce: claims.nonce, fetcher, now };
  assert.deepEqual(await verifyGoogleCredential(await token(claims), options),
    { email: 'adult@example.com', subject: claims.sub });
  await assert.rejects(verifyGoogleCredential(await token({ ...claims, aud: 'wrong-client' }), options), /Google sign-in could not be verified/);
  await assert.rejects(verifyGoogleCredential(await token({ ...claims, nonce: 'wrong-nonce' }), options), /Google sign-in could not be verified/);
  await assert.rejects(verifyGoogleCredential(await token({ ...claims, email_verified: false }), options), /Google sign-in could not be verified/);
  await assert.rejects(verifyGoogleCredential(await token({ ...claims, exp: Math.floor(now / 1000) - 1 }), options), /Google sign-in could not be verified/);
  const valid = await token(claims);
  const [header, body, signature] = valid.split('.');
  await assert.rejects(verifyGoogleCredential(header + '.' + encoded({ ...claims, sub: '999999999999999999999' }) + '.' + signature, options), /Google sign-in could not be verified/);
});
