import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(process.cwd());
const plan = JSON.parse(readFileSync(resolve(root, 'output/stage-ready-plan.json'), 'utf8'));
if (!plan.privateOnly || plan.packs.length !== 12 || plan.uploads.length !== 56 ||
    !process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
  throw new Error('Private stage upload preflight failed');
}
const bucket = 'paper-adventure-stage-private';
const keys = new Set();
for (const item of plan.uploads) {
  if (!/^internal\/draft-(?:ready|variants)\/[A-Za-z0-9/.-]+\.pdf$/.test(item.r2Key) ||
      !/^output\/pdf\/(?:variants\/)?[A-Za-z0-9.-]+\.pdf$/.test(item.path) ||
      keys.has(item.r2Key)) throw new Error('Invalid private object path');
  keys.add(item.r2Key);
  const bytes = readFileSync(resolve(root, item.path));
  if (bytes.length !== item.bytes || createHash('sha256').update(bytes).digest('hex') !== item.sha256) {
    throw new Error('PDF changed since stage plan was built: ' + item.path);
  }
}
if (plan.packs.some(pack => pack.status !== 'internal_test')) throw new Error('Refusing to stage a published pack');
for (const item of plan.uploads) {
  execFileSync('npx', ['--yes', 'wrangler@4.74.0', 'r2', 'object', 'put',
    bucket + '/' + item.r2Key, '--file', resolve(root, item.path),
    '--content-type', 'application/pdf', '--remote'],
  { stdio: 'inherit', env: process.env });
}
execFileSync('npx', ['--yes', 'wrangler@4.74.0', 'd1', 'execute', 'paper-adventure-stage-db',
  '--remote', '--file', resolve(root, 'output/stage-ready.sql'), '--yes'],
{ stdio: 'inherit', env: process.env });
console.log('Staged ' + plan.uploads.length + ' private draft PDFs and ' + plan.packs.length + ' internal_test pack records.');
