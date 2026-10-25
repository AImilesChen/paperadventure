import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicPages } from '../shared/page-manifest.mjs';
import { productRights, themes } from '../shared/catalog.mjs';
import { themeDetailContent } from '../src/themeDetailContent.js';
import { updateDraftField } from '../src/creatorDraft.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist', 'client');
const read = file => readFile(path.join(out, file), 'utf8');

test('public help leads to authenticated order support instead of pretending to send drafts or recovery email',async()=>{
  for(const topic of ['','recover/','report/','print/','start/']){
    const html=await read('en/help/'+topic+'index.html');
    assert.doesNotMatch(html,/Save feedback draft|Preview recovery step|only saves a draft locally|The planned flow|\/en\/orders\/demo\//);
    assert.doesNotMatch(html,/<(?:input|textarea|form)\b/,'public help must not imitate an unbound support submission');
  }
  const report=await read('en/help/report/index.html');
  assert.ok(report.includes('/en/my-adventures/?support=problem'));
  assert.ok(report.includes('/en/my-adventures/?support=refund'));
  assert.ok(report.includes('id="stopped-game"'));
  const recovery=await read('en/help/recover/index.html');
  const links=[...recovery.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(x=>new URL(x[1].replaceAll('&amp;','&'),'https://paperadventure.app'));
  assert.ok(links.some(u=>u.pathname==='/en/account/'&&u.searchParams.get('returnTo')==='/en/my-adventures/?view=orders'));
  assert.ok(links.some(u=>u.href==='mailto:support@paperadventure.app'));
});

test('classroom group selection updates the saved draft', () => {
  const classroom={setting:'classroom',groups:'',players:'24'};
  assert.equal(updateDraftField(classroom,'groups','6').groups,'6');
  assert.equal(updateDraftField({...classroom,groups:'6'},'setting','home').groups,'');
});

test('every route has visible HTML, canonical metadata and scoped indexing', async () => {
  assert.equal(new Set(publicPages.map(page => page.path)).size, publicPages.length);
  for (const page of publicPages) {
    const html = await read(path.join(page.path.slice(1), 'index.html'));
    assert.match(html, /<div id="root" data-clarity-mask="true">[\s\S]*<h1[ >]/, page.path);
    assert.ok(html.includes(`<title>${page.title.replaceAll('&', '&amp;')} | Paper Adventure Workshop</title>`), page.path);
    assert.equal(html.includes('<meta name="robots" content="noindex" />'), !page.indexable, page.path);
    assert.ok(html.includes(`<link rel="canonical" href="https://paperadventure.app${page.path}" />`), page.path);
    assert.ok(html.includes('application/ld+json'), page.path);
    assert.ok(!html.includes('<div id="root" data-clarity-mask="true"></div>'), page.path);
  }
});

test('public robots and sitemap expose content pages while private routes stay out', async () => {
  const robots = await read('robots.txt');
  assert.match(robots, /User-agent: \*\nAllow: \/\nDisallow: \/api\/\n/);
  assert.match(robots, /Sitemap: https:\/\/paperadventure\.app\/sitemap\.xml/);
  assert.doesNotMatch(robots, /Disallow: \/\s*$/);
  const sitemap = await read('sitemap.xml');
  for (const page of publicPages) {
    assert.equal(sitemap.includes('https://paperadventure.app' + page.path + '</loc>'), page.indexable, page.path);
  }
  const headers = await read('_headers');
  assert.match(headers, /\/en\/account\/\*\n  X-Robots-Tag: noindex/);
  assert.doesNotMatch(headers, /^\/\*\n  X-Robots-Tag: noindex/m);
});

test('homepage explains the printable product and links to both ways to play', async () => {
  const html = await read('en/index.html');
  assert.match(html, /Printable adventure games for kids/);
  assert.match(html, /What you actually play/i);
  assert.match(html, /Print the Player Pack/);
  assert.match(html, /Keep the adult guide/);
  assert.match(html, /A4 and US Letter/);
  assert.match(html, /href="\/en\/for-home\/"/);
  assert.match(html, /href="\/en\/for-classroom\/"/);
  assert.doesNotMatch(html, /Custom theme idea/);
});

test('root fallback retains a local redirect without exposing stale preview claims', async () => {
  const html = await read('index.html');
  const shell = await read('app-shell.txt');
  assert.equal(shell, html);
  assert.match(html, /location\.pathname === '\/'\) location\.replace\('\/en\/'/);
  assert.doesNotMatch(html, /Purchases, downloads and generated adventures are not available yet/);
});

test('preview HTML never loads analytics vendors before a visitor chooses', async () => {
  const html = await read('en/index.html');
  assert.doesNotMatch(html, /<script[^>]+src="https:\/\/(?:www\.googletagmanager\.com|www\.clarity\.ms|analytics\.ahrefs\.com|plausible\.shipsolo\.io)/);
  assert.match(html, /<div id="root" data-clarity-mask="true">/);
});

test('brand icons and social card are built and linked from every preview route', async () => {
  const html = await read('en/index.html');
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\/icon\.svg"/);
  assert.match(html, /<link rel="icon" type="image\/x-icon" href="\/favicon\.ico"/);
  assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png"/);
  assert.match(html, /<meta property="og:image" content="https:\/\/paperadventure\.app\/og-image\.jpg"/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/paperadventure\.app\/og-image\.jpg"/);
  for (const file of ['icon.svg', 'brand-wordmark.svg', 'brand-horizontal.svg', 'brand-stacked.svg', 'favicon.ico', 'favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png', 'icon-512.png', 'og-image.jpg']) {
    assert.ok((await stat(path.join(out, file))).size > 0, file);
  }
});

test('world roots stay available while offered edition pages have distinct canonical routes', async () => {
  for (const theme of themes) {
    const rootPage = await read(`en/themes/${theme.id}/index.html`);
    assert.match(rootPage, /<meta name="robots" content="noindex" \/>/);
    for (const setting of theme.availableSettings) {
      assert.ok(rootPage.includes(`/en/themes/${theme.id}/${setting}/`), `${theme.id} ${setting}`);
    }
  }
});

test('twelve offered games have independent descriptions and five checkpoints', async () => {
  assert.equal(themes.length, 11);
  assert.equal(themes.reduce((count, theme) => count + theme.availableSettings.length, 0), 12);
  const codes = new Set();
  for (const theme of themes) {
    for (const setting of theme.availableSettings) {
      const story = theme.story[setting];
      const details = themeDetailContent[theme.id][setting];
      const html = await read(`en/themes/${theme.id}/${setting}/index.html`);
      assert.ok(!codes.has(story.code), story.code);
      codes.add(story.code);
      assert.equal(details.stages.length, 5, `${theme.id} ${setting}`);
      assert.equal(details.reasons.length, 3, `${theme.id} ${setting}`);
      assert.equal(details.materials.length, 4, `${theme.id} ${setting}`);
      assert.ok(html.includes(story.title.replaceAll("'", '&#x27;')), `${story.code} title missing`);
      assert.ok(html.includes(story.goal.replaceAll("'", '&#x27;')), `${story.code} goal missing`);
      assert.equal((html.match(/class="theme-step-number"/g) || []).length, 5, `${story.code} checkpoint count`);
      assert.match(html, /Four PDF files per edition:/);
      assert.match(html, /A4 or US Letter/);
      assert.ok(!html.includes('/en/checkout/?kind=ready'), `${story.code} checkout should await live runtime`);
      assert.equal(theme[setting].readyStatus, 'not_published');
    }
  }
});

test('pricing explains all three choices and confirmed Home and Classroom rights', async () => {
  assert.equal(productRights.onlineRedownloadMonths, 12);
  assert.equal(productRights.legalReviewPending, true);
  const pricing = await read('en/pricing/index.html');
  const checkout = await read('en/checkout/demo/index.html');
  const terms = await read('en/terms/index.html');
  for (const scope of [productRights.home, productRights.classroom]) {
    assert.ok(pricing.includes(scope), scope);
  }
  assert.match(pricing, /from confirmed payment/);
  assert.match(pricing, /Three clear ways to begin/);
  assert.match(pricing, /Celebration adventure/);
  assert.match(pricing, /Pick an existing theme/);
  assert.match(pricing, /Make a new story/);
  assert.match(pricing, /\$9\.99/);
  assert.match(pricing, /\$19\.99/);
  assert.doesNotMatch(pricing, /No ready-made packs are published yet/);
  assert.doesNotMatch(pricing, /href="[^"]*\/api\/v1\/samples\//);
  assert.match(pricing, /from first qualified delivery/);
  assert.match(checkout, /Online re-download/);
  assert.match(checkout, /Checkout unavailable/);
  assert.doesNotMatch(terms, /POLICY PREVIEW/);
  assert.match(terms, /Three successful checkpoint changes and two successful whole-game remakes/);
  assert.match(terms, /Effective 2026-10-25/);
  assert.doesNotMatch(terms, /Final reviewed wording goes here/);
});

test('all four policy pages contain readable complete published policies and consistent purchase allowances', async () => {
  for (const kind of ['terms', 'privacy', 'cookies', 'refunds']) {
    const html = await read(`en/${kind}/index.html`);
    assert.doesNotMatch(html, /POLICY PREVIEW/);
    assert.doesNotMatch(html, /Prepared for review before real payments open/);
    assert.match(html, /Effective 2026-10-25/);
    assert.match(html, /mileschen/);
    assert.match(html, /aria-label="Policy sections"/);
    assert.match(html, /mailto:support@paperadventure.app/);
    assert.doesNotMatch(html, /Final reviewed wording goes here|LEGAL PAGE LAYOUT/);
    const ids = [...html.matchAll(/id="(policy-section-\d+)"/g)].map(match => match[1]);
    assert.ok(ids.length >= 5, kind);
    for (const id of ids) assert.ok(html.includes(`href="#${id}"`), `${kind} ${id}`);
  }
  const pricing = await read('en/pricing/index.html');
  const table = pricing.match(/<table>[\s\S]*?<\/table>/)?.[0] || '';
  assert.match(table, /Three successful checkpoint changes and two successful whole-game remakes/);
  assert.match(table, /30 days of first qualified delivery/);
  assert.doesNotMatch(pricing, /2 checkpoint revisions after delivery/);
  const privacy = await read('en/privacy/index.html');
  assert.match(privacy, /modification feedback/);
  assert.match(privacy, /fal.ai/);
});


