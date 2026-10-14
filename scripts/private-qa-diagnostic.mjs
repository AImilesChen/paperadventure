import { randomBytes, createCipheriv, publicEncrypt, createPublicKey } from 'node:crypto';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.PAPER_ADVENTURE_STAGE_D1_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const publicKey = createPublicKey(Buffer.from(process.env.QA_PUBLIC_KEY_B64, 'base64'));
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ sql: "SELECT error_detail FROM custom_pack_remake_calls WHERE order_id = ? AND phase = 'audit' AND generation_round = 3 AND result_json IS NOT NULL ORDER BY created_at DESC,id DESC LIMIT 1", params: ['612a56bd-494a-4265-984f-f4ecb3eb7407'] }),
});
if (!response.ok) throw new Error(`D1 query failed: HTTP ${response.status}`);
const body = await response.json();
if (!body.success) throw new Error('D1 query failed');
const detail = body.result?.[0]?.results?.[0]?.error_detail;
if (typeof detail !== 'string') throw new Error('Quality review detail unavailable');
const key = randomBytes(32);
const iv = randomBytes(12);
const cipher = createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(detail, 'utf8'), cipher.final()]);
console.log(`ENCRYPTED_QA_REASON=${JSON.stringify({ key: publicEncrypt(publicKey, key).toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') })}`);

