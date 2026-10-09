import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildStageReadyPlan } from '../scripts/build-stage-ready-plan.mjs';

test('draft pack plan stages complete private files without publishing products', () => {
  const root = mkdtempSync(join(tmpdir(), 'paw-stage-pack-'));
  try {
    mkdirSync(resolve(root, 'content'), { recursive: true });
    mkdirSync(resolve(root, 'output/pdf'), { recursive: true });
    const items = [];
    for (const setting of ['home', 'classroom']) for (const paper of ['A4', 'Letter']) {
      for (const role of ['player', setting === 'home' ? 'host' : 'teacher']) {
        const file = 'output/pdf/celebration-' + setting + '-' + paper + '-' + role + '.pdf';
        const bytes = Buffer.from('%PDF-1.4\n' + setting + paper + role);
        writeFileSync(resolve(root, file), bytes);
        items.push({ file, setting, paper, role, bytes: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'), status: 'draft', public: false });
      }
    }
    const manifest = { version: '0.1', themeWorldId: 'celebration',
      candidateFreeSample: true, publishedFreeSample: false, items };
    const manifestPath = 'content/celebration-pdf-manifest.v0.1.json';
    writeFileSync(resolve(root, manifestPath), JSON.stringify(manifest));
    const plan = buildStageReadyPlan(root, { basePaths: [manifestPath], variantPaths: [] });
    assert.equal(plan.packs.length, 2);
    assert.equal(plan.uploads.length, 8);
    assert.ok(plan.uploads.every(item => item.r2Key.startsWith('internal/draft-ready/')));
    assert.ok(plan.packs.every(pack => pack.status === 'internal_test'));
    assert.match(plan.sql, /status = 'internal_test'/);
    assert.doesNotMatch(plan.sql, /'published'/);
    manifest.items[0].public = true;
    writeFileSync(resolve(root, manifestPath), JSON.stringify(manifest));
    assert.throws(() => buildStageReadyPlan(root, { basePaths: [manifestPath], variantPaths: [] }), /does not match PDF/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
