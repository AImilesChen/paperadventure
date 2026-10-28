import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicPages } from '../shared/page-manifest.mjs';
import { productRights, themes } from '../shared/catalog.mjs';
import { themeDetailContent } from '../src/themeDetailContent.js';
import { updateDraftField } from '../src/creatorDraft.mjs';
import { pageDocumentTitle } from '../shared/site-identity.mjs';

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
    assert.ok(html.includes(`<title>${pageDocumentTitle(page).replaceAll('&', '&amp;')}</title>`), page.path);
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

test('homepage shows actual materials and an honest custom example with audience and guide navigation intact', async () => {
  const html = await read('en/index.html');
  const sections = ['sample-spotlight-heading','home-product-guide-title','home-custom-heading','home-guides-heading'];
  const positions = sections.map(id => html.indexOf(`id="${id}"`));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual([...positions].sort((a,b) => a-b), positions);
  assert.doesNotMatch(html, /Illustrative page layout|PLAYER PACK · EXAMPLE LAYOUT|class="two-paths"|Ready to plan your game/);
  for (const image of ['celebration-home-detail-record.jpg','celebration-home-detail-handout-cut.jpg','custom-paper-format-cards.jpg']) {
    assert.ok(html.includes(`href="/assets/${image}"`));
    assert.ok(html.includes(`src="/assets/${image}"`));
  }
  assert.match(html, /A hand-authored lighthouse sample rendered in the custom PDF format/);
  assert.match(html, /After payment, review your personal five-checkpoint plan/);
  assert.match(html, /Approve it before PDF creation starts/);
  assert.match(html, /When generation and file checks finish/);
  assert.match(html, /One team of 2–6; two balanced teams for 7–12/);
  assert.match(html, /Crews of 2–6 each use a complete paper set/);
  for (const path of ['/en/for-home/','/en/for-classroom/','/en/samples/home/','/en/samples/classroom/','/en/guides/']) assert.ok(html.includes(`href="${path}"`));
  assert.equal((html.match(/class="home-guide-card"/g)||[]).length, 3);
  for (const slug of ['run-a-printable-adventure','organize-a-classroom-adventure','printable-birthday-party-adventures']) assert.ok(html.includes(`href="/en/guides/${slug}/"`));
});

test('free Home landing explains the actual complete game without moving downloads behind the content', async () => {
  const html = await read('en/samples/home/index.html');
  assert.match(html, /<h1[^>]*>Free printable adventure game for kids\.<\/h1>/);
  assert.ok(html.indexOf('Download complete game · ZIP') < html.indexOf('id="sample-story-heading"'));
  assert.equal((html.match(/class="sample-home-preview sample-home-preview-/g)||[]).length, 3);
  for (const image of ['map','record','handout-cut']) {
    assert.ok(html.includes(`href="/assets/celebration-home-detail-${image}.jpg"`));
    assert.ok(html.includes(`src="/assets/celebration-home-detail-${image}.jpg"`));
  }
  assert.match(html, /five checkpoints|five-checkpoint|Five connected checkpoints/);
  assert.match(html, /10 pages per team/);
  assert.match(html, /Read Host Guide pages 1–11 on screen and print page 12 once/);
  assert.match(html, /11 sheets/);
  assert.match(html, /21 sheets/);
  assert.match(html, /adult host is additional/);
  assert.match(html, /href="#sample-download"/);
  for (const route of ['/en/guides/run-a-printable-adventure/','/en/help/print/','/en/themes/celebration/home/']) assert.ok(html.includes(`href="${route}"`));
  const classroom = await read('en/samples/classroom/index.html');
  assert.match(classroom, /Free printable classroom adventure game/);
  assert.doesNotMatch(classroom, /Fenn’s delivery|Courier|Mapper/);
});

test('free Classroom landing explains separate crews, actual materials and accurate print counts', async () => {
  const html = await read('en/samples/classroom/index.html');
  assert.match(html, /<h1[^>]*>Free printable classroom adventure game\.<\/h1>/);
  assert.ok(html.indexOf('Download complete game · ZIP') < html.indexOf('id="classroom-story-heading"'));
  for (const name of ['plan','symbols','review']) {
    assert.ok(html.includes(`href="/assets/celebration-classroom-preview-${name}.jpg"`));
    assert.ok(html.includes(`src="/assets/celebration-classroom-preview-${name}.jpg"`));
  }
  for (const job of ['Story Reader','Prop Mover','Team Recorder','Evidence Checker']) assert.ok(html.includes(job));
  assert.match(html, /four badge clue cards are separate/);
  assert.match(html, /With one crew, the teacher reviews/);
  assert.match(html, /9 pages per crew/);
  assert.match(html, /4 crews of 6<\/td><td>36/);
  assert.match(html, /7 crews of 5<\/td><td>63/);
  assert.match(html, /add nine sheets to print it once/);
  assert.match(html, /href="#sample-download"/);
  for (const route of ['/en/guides/organize-a-classroom-adventure/','/en/help/print/','/en/themes/celebration/classroom/']) assert.ok(html.includes(`href="${route}"`));
  assert.doesNotMatch(html, /Fenn|birthday chest|11 sheets|21 sheets/);
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
      const data = JSON.parse(html.match(/id="public-release-data">([^<]+)<\/script>/)[1]);
      const pack = data.catalog.themes.find(item => item.id === theme.id)[setting];
      const offer = data.catalog.offers.find(item => item.sku === 'ready_' + setting);
      assert.equal(html.includes('/en/checkout/?kind=ready'), data.runtime.checkout && ['published','test_ready'].includes(pack.readyStatus) && !pack.freeSample && offer.saleEnabled, `${story.code} checkout must match public availability`);
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
  assert.match(pricing, /one adult purchaser and their household/);
  assert.match(pricing, /Private, non-commercial play with reasonable reprinting/);
  assert.match(pricing, /one purchasing teacher’s own classes/);
  assert.match(pricing, /reasonable reprinting for those classes/);
  assert.match(pricing, /from confirmed payment/);
  assert.match(pricing, /Choose your game/);
  assert.match(pricing, /Celebration adventure/);
  assert.match(pricing, /Choose a ready-made game/);
  assert.match(pricing, /Create a custom adventure/);
  assert.match(pricing, /\$9\.99/);
  assert.match(pricing, /\$19\.99/);
  assert.doesNotMatch(pricing, /No ready-made packs are published yet/);
  assert.doesNotMatch(pricing, /href="[^"]*\/api\/v1\/samples\//);
  assert.match(pricing, /from first qualified delivery/);
  assert.match(checkout, /Online re-download/);
  assert.match(checkout, /Checkout unavailable/);
  assert.doesNotMatch(terms, /POLICY PREVIEW/);
  assert.match(terms, /Three successful checkpoint changes and two successful whole-game remakes/);
  assert.match(terms, /Effective 2026-10-26/);
  assert.doesNotMatch(terms, /Final reviewed wording goes here/);
});

test('all four policy pages contain readable complete published policies and consistent purchase allowances', async () => {
  for (const kind of ['terms', 'privacy', 'cookies', 'refunds']) {
    const html = await read(`en/${kind}/index.html`);
    assert.doesNotMatch(html, /POLICY PREVIEW/);
    assert.doesNotMatch(html, /Prepared for review before real payments open/);
    assert.match(html, /Effective 2026-10-26/);
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
  const changes = pricing.match(/<details[^>]*id="pricing-custom-changes"[\s\S]*?<\/details>/)?.[0] || '';
  assert.match(changes, /Two successful whole-plan reworks and three successful targeted edits before approval/);
  assert.match(changes, /Three successful checkpoint changes and two successful whole-game remakes/);
  assert.match(changes, /30 days of first qualified delivery/);
  assert.match(changes, /six checkpoint suggestions and four whole-game candidates/);
  assert.match(table, /href="#pricing-custom-changes"/);
  assert.match(pricing, /href="\/en\/refunds\/"/);
  assert.doesNotMatch(pricing, /Live checkout is active|Version 0\.1 drafts|not yet play-tested|Will Stripe charge me now|subscription or points/);
  assert.doesNotMatch(pricing, /2 checkpoint revisions after delivery/);
  const privacy = await read('en/privacy/index.html');
  assert.match(privacy, /modification feedback/);
  assert.match(privacy, /fal.ai/);
});


