import { execFileSync } from 'node:child_process';

const cli = (args, options = {}) => process.env.WRANGLER_CLI
  ? execFileSync(process.execPath, [process.env.WRANGLER_CLI, ...args], options)
  : execFileSync('npx', ['--yes', 'wrangler@4.74.0', ...args], options);
const run = sql => JSON.parse(cli([
  'd1', 'execute', 'paper-adventure-stage-db', '--remote', '--command', sql, '--json',
], { encoding: 'utf8' }));
const rows = sql => run(sql)[0]?.results ?? [];
const before = rows("SELECT id,version,status,(SELECT COUNT(*) FROM ready_pack_files f WHERE f.ready_pack_id=p.id) AS files FROM ready_packs p WHERE theme_world_id='halloween' AND setting='home'");
console.log('Halloween Home before activation:', JSON.stringify(before));
if (!before.length || !before.some(pack => pack.version === 'v1.0' && pack.files === 4)) {
  throw Error('Halloween Home v1.0 has no complete four-file pack');
}

run("UPDATE ready_packs SET status='internal_test',published_at=CURRENT_TIMESTAMP WHERE theme_world_id='halloween' AND setting='home' AND version='v1.0' AND status IN ('draft','internal_test','release_ready','paused') AND (SELECT COUNT(*) FROM ready_pack_files f WHERE f.ready_pack_id=ready_packs.id)=4");
const after = rows("SELECT id,version,status,(SELECT COUNT(*) FROM ready_pack_files f WHERE f.ready_pack_id=p.id) AS files FROM ready_packs p WHERE theme_world_id='halloween' AND setting='home'");
console.log('Halloween Home after activation:', JSON.stringify(after));
if (!after.some(pack => pack.version === 'v1.0' && pack.status === 'internal_test' && pack.files === 4)) {
  throw Error('Halloween Home v1.0 is not test-ready with four files');
}
const response = await fetch('https://paperadventure.app/api/v1/catalog');
if (!response.ok) throw Error(`Public catalog responded ${response.status}`);
const catalog = await response.json();
const status = catalog.themes?.find(theme => theme.id === 'halloween')?.home?.readyStatus;
console.log('Halloween Home public catalog status:', status);
if (!['test_ready', 'published'].includes(status)) {
  throw Error(`Halloween Home is not available through the public catalog: ${status}`);
}

