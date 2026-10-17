import { execFileSync } from 'node:child_process';

const cli = (args, options = {}) => process.env.WRANGLER_CLI
  ? execFileSync(process.execPath, [process.env.WRANGLER_CLI, ...args], options)
  : execFileSync('npx', ['--yes', 'wrangler@4.74.0', ...args], options);
const run = sql => JSON.parse(cli([
  'd1', 'execute', 'paper-adventure-stage-db', '--remote', '--command', sql, '--json',
], { encoding: 'utf8' }));
const rows = sql => run(sql)[0]?.results ?? [];

const packs = rows("SELECT id,version,status,(SELECT COUNT(*) FROM ready_pack_files f WHERE f.ready_pack_id=p.id) AS files FROM ready_packs p WHERE theme_world_id='museum' AND setting='classroom'");
if (!packs.some(pack => pack.version === 'v1.0' && pack.files === 4)) {
  throw Error('Museum Classroom v1.0 has no complete four-file pack');
}

run("UPDATE ready_packs SET status='internal_test',published_at=CURRENT_TIMESTAMP WHERE theme_world_id='museum' AND setting='classroom' AND version='v1.0' AND status IN ('draft','internal_test','release_ready','paused') AND (SELECT COUNT(*) FROM ready_pack_files f WHERE f.ready_pack_id=ready_packs.id)=4");
const after = rows("SELECT id,version,status,(SELECT COUNT(*) FROM ready_pack_files f WHERE f.ready_pack_id=p.id) AS files FROM ready_packs p WHERE theme_world_id='museum' AND setting='classroom'");
if (!after.some(pack => pack.version === 'v1.0' && pack.status === 'internal_test' && pack.files === 4)) {
  throw Error('Museum Classroom v1.0 is not test-ready with four files');
}
console.log('Museum Classroom file slots:', JSON.stringify(after));

const response = await fetch('https://paperadventure.app/api/v1/catalog');
if (!response.ok) throw Error(`Public catalog responded ${response.status}`);
const catalog = await response.json();
const status = catalog.themes?.find(theme => theme.id === 'museum')?.classroom?.readyStatus;
if (!['test_ready', 'published'].includes(status)) {
  throw Error(`Museum Classroom is not available through the public catalog: ${status}`);
}
console.log('Museum Classroom public catalog status:', status);
