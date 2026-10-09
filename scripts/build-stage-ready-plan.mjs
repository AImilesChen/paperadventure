import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_MANIFESTS = [
  'content/celebration-pdf-manifest.v0.1.json',
  'content/dinosaur-pdf-manifest.v0.1.json',
  'content/space-pdf-manifest.v0.1.json',
  'content/forest-pdf-manifest.v0.1.json',
  'content/halloween-pdf-manifest.v0.1.json',
  'content/christmas-pdf-manifest.v0.1.json',
];
const VARIANT_MANIFESTS = [
  'content/halloween-classroom-halloween-pdf-manifest.v0.1.json',
  'content/christmas-classroom-christmas-pdf-manifest.v0.1.json',
];
const MAX_BYTES = 20 * 1024 * 1024;
const sql = value => "'" + String(value).replaceAll("'", "''") + "'";
const roleOf = role => role === 'player' ? 'player' : ['host', 'teacher'].includes(role) ? 'guide' : null;

function safeFile(root, item) {
  if (typeof item.file !== 'string' || !/^output\/pdf\/(?:variants\/)?[A-Za-z0-9.-]+\.pdf$/.test(item.file)) {
    throw new Error('Unsafe PDF path: ' + item.file);
  }
  const path = resolve(root, item.file);
  const rel = relative(root, path);
  if (rel.startsWith('..' + sep) || rel === '..') throw new Error('PDF path escapes project root');
  const bytes = readFileSync(path);
  if (bytes.length < 4 || bytes.length > MAX_BYTES || bytes.subarray(0, 4).toString() !== '%PDF') {
    throw new Error('Invalid PDF bytes: ' + item.file);
  }
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (item.bytes !== bytes.length || item.sha256 !== digest || item.status !== 'draft' || item.public !== false) {
    throw new Error('Draft manifest does not match PDF: ' + item.file);
  }
  return { path: item.file, bytes: bytes.length, sha256: digest };
}

function readManifest(root, path) {
  const data = JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  if (!/^[a-z]+$/.test(data.themeWorldId || '') || !/^0\.[0-9]+$/.test(data.version || '') ||
      data.published === true || data.publishedFreeSample === true || !Array.isArray(data.items)) {
    throw new Error('Manifest is not an internal draft: ' + path);
  }
  return data;
}

export function buildStageReadyPlan(root, options = {}) {
  const basePaths = options.basePaths || BASE_MANIFESTS;
  const variantPaths = options.variantPaths || VARIANT_MANIFESTS;
  const packs = [];
  const uploads = [];
  const worlds = new Set();
  for (const manifestPath of basePaths) {
    const manifest = readManifest(root, manifestPath);
    const world = manifest.themeWorldId;
    if (worlds.has(world)) throw new Error('Duplicate world manifest: ' + world);
    worlds.add(world);
    if (manifest.items.length !== 8) throw new Error('A world needs exactly eight base PDFs: ' + world);
    for (const setting of ['home', 'classroom']) {
      const files = [];
      const seen = new Set();
      for (const item of manifest.items.filter(entry => entry.setting === setting)) {
        const role = roleOf(item.role);
        if (!role || !['A4', 'Letter'].includes(item.paper)) throw new Error('Invalid paper or role');
        const slot = item.paper + '/' + role;
        if (seen.has(slot)) throw new Error('Duplicate file slot: ' + world + '/' + setting + '/' + slot);
        seen.add(slot);
        const source = safeFile(root, item);
        const key = 'internal/draft-ready/' + world + '/' + setting + '/v' + manifest.version + '/' + slot + '-' + source.sha256.slice(0, 16) + '.pdf';
        const file = { ...source, paper: item.paper, role, r2Key: key };
        files.push(file);
        uploads.push(file);
      }
      if (seen.size !== 4) throw new Error('Incomplete base pack: ' + world + '/' + setting);
      packs.push({ id: 'stage-' + world + '-' + setting + '-v' + manifest.version, world, setting,
        version: 'v' + manifest.version, status: 'internal_test', files });
    }
  }
  for (const manifestPath of variantPaths) {
    const manifest = readManifest(root, manifestPath);
    if (!worlds.has(manifest.themeWorldId) || manifest.items.length !== 4 ||
        !/^[a-z]+$/.test(manifest.variantId || '')) throw new Error('Invalid classroom variant: ' + manifestPath);
    const seen = new Set();
    for (const item of manifest.items) {
      const role = roleOf(item.role);
      if (item.setting !== 'classroom' || item.variant !== manifest.variantId ||
          !role || !['A4', 'Letter'].includes(item.paper)) throw new Error('Invalid variant file');
      const slot = item.paper + '/' + role;
      if (seen.has(slot)) throw new Error('Duplicate variant slot');
      seen.add(slot);
      const source = safeFile(root, item);
      uploads.push({ ...source, paper: item.paper, role,
        r2Key: 'internal/draft-variants/' + manifest.themeWorldId + '/' + manifest.variantId + '/v' +
          manifest.version + '/' + slot + '-' + source.sha256.slice(0, 16) + '.pdf' });
    }
    if (seen.size !== 4) throw new Error('Incomplete variant');
  }
  const statements = [];
  for (const pack of packs) {
    statements.push('INSERT OR IGNORE INTO ready_packs (id,theme_world_id,setting,version,status,licence_version) VALUES (' +
      [pack.id, pack.world, pack.setting, pack.version, pack.status, 'draft-not-approved'].map(sql).join(',') + ');');
    statements.push('DELETE FROM ready_pack_files WHERE ready_pack_id = ' + sql(pack.id) +
      ' AND EXISTS (SELECT 1 FROM ready_packs WHERE id = ' + sql(pack.id) + " AND status = 'internal_test');");
    for (const file of pack.files) {
      statements.push('INSERT INTO ready_pack_files (ready_pack_id,paper,role,r2_key,sha256,bytes) SELECT ' +
        [pack.id, file.paper, file.role, file.r2Key, file.sha256].map(sql).join(',') + ',' + file.bytes +
        ' WHERE EXISTS (SELECT 1 FROM ready_packs WHERE id = ' + sql(pack.id) + " AND status = 'internal_test');");
    }
  }
  return { privateOnly: true, packs, uploads, sql: statements.join('\n') + '\n' };
}

const current = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === current) {
  const root = resolve(process.argv[2] || new URL('..', import.meta.url).pathname);
  const plan = buildStageReadyPlan(root);
  const output = resolve(root, 'output');
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'stage-ready-plan.json'), JSON.stringify({
    privateOnly: plan.privateOnly, packs: plan.packs, uploads: plan.uploads,
  }, null, 2) + '\n');
  writeFileSync(resolve(output, 'stage-ready.sql'), plan.sql);
  console.log(JSON.stringify({ packs: plan.packs.length, uploads: plan.uploads.length, privateOnly: true }));
}
