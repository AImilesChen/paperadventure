// UI-only mock for reviewing conditional runtime pages. It never takes payment or sends mail.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicCatalog } from '../../shared/catalog.mjs';

const root = resolve(fileURLToPath(new URL('../../dist/client/', import.meta.url)));
const catalog = publicCatalog();
catalog.publicationState = 'mock_ui_only';
catalog.freeSampleThemeId = 'celebration';
catalog.offers = catalog.offers.map(offer => ({ ...offer, saleEnabled: true }));
catalog.themes = catalog.themes.map(theme => ({ ...theme,
  home: { ...theme.home, readyStatus: ['celebration','dinosaur'].includes(theme.id) ? 'published' : 'not_published', freeSample: theme.id === 'celebration', packVersion: 'fixture-v1' },
  classroom: { ...theme.classroom, readyStatus: theme.id === 'celebration' ? 'published' : 'not_published', freeSample: theme.id === 'celebration', packVersion: 'fixture-v1' },
}));
const health = { status: 'configured_runtime', checkout: true, generation: true, proposals: true, account: true, sample: true, legal: true };
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/api/v1/health' || path === '/api/v1/catalog') {
    response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    response.end(JSON.stringify(path.endsWith('health') ? health : catalog)); return;
  }
  if (path.startsWith('/api/')) {
    response.writeHead(503, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: { code: 'MOCK_ONLY', message: 'This UI mock never performs an external action.' } })); return;
  }
  const target = resolve(root, `.${decodeURIComponent(path)}`);
  const safe = target === root || target.startsWith(root + sep);
  const asset = safe && extname(target) ? target : resolve(root, 'index.html');
  try {
    if (!(await stat(asset)).isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'content-type': mime[extname(asset)] || 'application/octet-stream' });
    response.end(await readFile(asset));
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.listen(4175, '127.0.0.1', () => console.log('Mock UI preview: http://127.0.0.1:4175/en/'));
