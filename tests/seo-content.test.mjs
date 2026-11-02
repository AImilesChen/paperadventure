import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicPages, pageFor } from '../shared/page-manifest.mjs';
import { publicCatalog } from '../shared/catalog.mjs';
import { publicRelease, publicReleaseData, readPublicRelease, htmlJson } from '../shared/public-release.mjs';
import { pageSchema } from '../shared/seo.mjs';
import { guides, guideOutcomes } from '../shared/guides.mjs';
import { siteIdentity } from '../shared/site-identity.mjs';
import { homeGamePlanning, homePrintPlan } from '../shared/home-game-planning.mjs';

test('Home printing plans balance every supported child count and count the adult guide only once', () => {
  for (const [theme, pages, guidePages, pieces] of [['dinosaur', 15, 10, 16], ['christmas', 14, 8, 12]]) {
    for (let children = 2; children <= 12; children++) {
      const teams = children <= 6 ? 1 : 2;
      for (const printGuide of [false, true]) {
        const result = homePrintPlan(theme, String(children), printGuide);
        assert.equal(result.teams.reduce((a, b) => a + b, 0), children);
        assert.equal(result.teams.length, teams);
        assert.ok(result.teams.every(n => n >= (teams === 1 ? 2 : 3) && n <= 6));
        assert.ok(Math.max(...result.teams) - Math.min(...result.teams) <= 1);
        assert.equal(result.playerCopies, teams);
        assert.equal(result.playerSheets, teams * pages);
        assert.equal(result.guideSheets, printGuide ? guidePages : 0);
        assert.equal(result.totalSheets, teams * pages + (printGuide ? guidePages : 0));
        assert.equal(result.pieces, teams * pieces);
      }
    }
  }
  assert.deepEqual(homePrintPlan('dinosaur', 7).teams, [4, 3]);
  assert.equal(homePrintPlan('dinosaur', 12, true).totalSheets, 40);
  assert.equal(homePrintPlan('christmas', 12, true).totalSheets, 36);
});

test('printing plans reject invalid inputs and editions with different printing rules', () => {
  for (const invalid of ['', ' ', '1', '13', '2.5', '2e0', '0x2', 'seven', 1, 13, 2.5, NaN, Infinity, null, undefined, {}, [], true]) {
    assert.equal(homePrintPlan('dinosaur', invalid), null, String(invalid));
  }
  for (const theme of ['celebration', 'space', 'forest', 'halloween', 'unknown', '__proto__']) assert.equal(homePrintPlan(theme, 4), null);
  assert.equal(homePrintPlan('christmas', 4, 'print'), null);
});

test('Home catalogue compares real gameplay and preparation without changing Classroom cards', async () => {
  const home = await read('/en/for-home/'), classroom = await read('/en/for-classroom/');
  assert.equal((home.match(/class="catalog-home-comparison"/g) || []).length, 6);
  for (const facts of Object.values(homeGamePlanning)) {
    assert.ok(home.includes(facts.play));
    assert.ok(home.includes(facts.prepare));
    assert.ok(home.includes(facts.occasion));
  }
  assert.match(home, /adult host, who can read aloud/);
  assert.match(home, /Host Guide separate/);
  assert.doesNotMatch(classroom, /catalog-home-comparison|Choosing for your group/);
});

test('featured Home calculators render an accessible initial estimate and a static reference', async () => {
  for (const [theme, sheets, pieces] of [['dinosaur', 15, 16], ['christmas', 14, 12]]) {
    const html = await read(`/en/themes/${theme}/home/`);
    assert.match(html, /<label for="pack-children"><span class="pack-step-number" aria-hidden="true">1<\/span>Number of children/);
    assert.match(html, /type="number" min="2" max="12" step="1"/);
    assert.match(html, /Adult host not included/);
    assert.match(html, /id="pack-calculator-title">Game printing calculator/);
    assert.match(html, /aria-label="Remove one child"/);
    assert.match(html, /aria-label="Add one child"/);
    assert.match(html, /type="radio"[^>]*aria-label="Read Host Guide on screen"[^>]*checked=""/);
    assert.match(html, /type="radio"[^>]*aria-label="Print one Host Guide"/);
    assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/);
    assert.ok(html.includes(`<strong>${sheets}</strong><span>sheets to print</span>`));
    assert.ok(html.replaceAll('<!-- -->', '').includes(`${pieces} total · ${pieces} per team`));
    assert.match(html, /1 team of 4 children/);
    assert.match(html, /See one- and two-team totals/);
    assert.match(html, /same for A4 and US Letter/);
  }
});

const read = pathname => readFile(new URL('../dist/client' + pathname + 'index.html', import.meta.url), 'utf8');
const bootstrap = html => JSON.parse(html.match(/id="public-release-data">([^<]+)<\/script>/)[1]);
const schema = html => JSON.parse(html.match(/type="application\/ld\+json">([^<]+)<\/script>/)[1]);

test('custom search HTML describes ordering accurately without a false unavailable state', async () => {
  const html = await read('/en/create/'), data = bootstrap(html);
  assert.match(html, /<h1>Your idea\. Their next paper adventure\.<\/h1>/);
  assert.match(html, /After payment, review your personal plan before the game PDFs are made/);
  assert.match(html, /href="\/assets\/custom-paper-format-player-A4\.pdf"/);
  assert.match(html, /href="\/assets\/custom-paper-format-guide-A4\.pdf"/);
  assert.doesNotMatch(html, /The creator is temporarily unavailable/);
  assert.equal(html.includes('Custom checkout is currently unavailable'), data.runtime.checkout === false);
  const priced = data.runtime.checkout && data.catalog.offers.some(offer => ['custom_home','custom_classroom'].includes(offer.sku) && offer.saleEnabled);
  assert.equal(html.includes('class="custom-create-prices"'), Boolean(priced));
});

test('featured Home pages expose distinct file inventories, exact print totals and host handoffs', async () => {
  for (const [theme, player, guide, pieces] of [['dinosaur',15,10,16],['christmas',14,8,12]]) {
    const html = (await read(`/en/themes/${theme}/home/`)).replace(/<!--.*?-->/g, "");
    assert.match(html, /id="prepare-game"/);
    assert.ok(html.includes(`<strong>${player} Player pages</strong>`));
    assert.ok(html.includes(`${guide}-page Host Guide`));
    assert.ok(html.includes(`<strong>${pieces} loose pieces per team:</strong>`));
    const preparation = html.match(/<section id="prepare-game"[\s\S]*?<\/section>/)[0];
    for (const total of [player,player*2]) assert.ok(preparation.includes(`<td>${total}</td>`));
    assert.ok(preparation.includes(`Printing one Host Guide adds ${guide} sheets: ${player+guide} for one team or ${player*2+guide} for two`));
    assert.match(preparation, /Single-sided sheets with the Host Guide on screen/);
    assert.match(preparation, /Table setup schematic/);
    assert.match(preparation, /Actual size \/ 100%/);
    assert.match(preparation, /page 14/);
    assert.match(preparation, /two balanced teams of 3–6/);
    assert.match(html, /Selected blank materials from the game, not a view of every page/);
    assert.doesNotMatch(preparation, /minutes|playtested|play-tested|SUN &gt; FERN|Gift A is for OWL/);
    assert.equal((html.match(/id="theme-prep-heading"/g)||[]).length, 1);
  }
  const dinosaur = await read('/en/themes/dinosaur/home/');
  assert.match(dinosaur, /Keep the welcome on page 14 and keepsake on page 15/);
  assert.match(dinosaur, /fixed expedition, not a personalized birthday story/);
  const christmas = await read('/en/themes/christmas/home/');
  assert.match(christmas, /frame’s inner window/);
  assert.match(christmas, /No real gifts, tape or glue/);
  assert.match(await read('/en/occasions/christmas/'), /href="\/en\/themes\/christmas\/home\/#prepare-game"/);
});

test('Christmas occasion explains the real paid workshop with preparation and a distinct free trial', async () => {
  const route = '/en/occasions/christmas/', html = await read(route);
  assert.match(html, /<h1>A printable Christmas adventure for kids/);
  assert.match(html, /Printable Christmas Games for Kids \| Paper Adventure Workshop/);
  assert.ok((await readFile(new URL('../dist/client/sitemap.xml', import.meta.url), 'utf8')).includes('https://paperadventure.app' + route));
  const missions = html.match(/<ol class="christmas-occasion-missions">([\s\S]*?)<\/ol>/)[1];
  assert.equal((missions.match(/<li>/g)||[]).length, 5);
  for (const name of ['gifts', 'frame', 'village']) assert.ok(html.includes(`href="/assets/christmas-home-detail-${name}.jpg"`));
  assert.ok(html.includes('src="/assets/christmas-family-table-v1.jpg"'));
  assert.match(html, /illustrative scene/);
  assert.match(html, /Player Pack · 14 pages/);
  assert.match(html, /Host Guide · 8 pages/);
  for (const amount of ['14','28']) assert.ok(html.includes(`<td><strong>${amount}</strong></td>`));
  assert.match(html, /add 8 sheets once, making 22 sheets for one team or 36 for two/);
  assert.match(html, /The free option is Celebration Home: The Missing Birthday Chest, a separate birthday story/);
  assert.equal((html.match(/<details>/g)||[]).length, 6);
  const data = bootstrap(html), offer = data.catalog.offers.find(item => item.sku === 'ready_home');
  if (data.runtime.checkout && data.runtime.checkoutMode === 'live' && offer.saleEnabled) assert.ok(html.includes(`Paid Home game · US$${(offer.unitAmount/100).toFixed(2)} · one-time purchase`));
  const graph = schema(html)['@graph'];
  assert.ok(graph.find(item=>item['@type']==='WebPage'));
  const breadcrumbs = graph.find(item=>item['@type']==='BreadcrumbList');
  assert.equal(breadcrumbs.itemListElement[1].item,'https://paperadventure.app/en/for-home/');
  assert.equal(graph.find(item=>['Product','CollectionPage','ItemList','FAQPage'].includes(item['@type'])),undefined);
  assert.ok((await read('/en/')).includes(`href="${route}"`));
  assert.ok((await read('/en/themes/christmas/home/')).includes(`href="${route}"`));
});

test('birthday landing separates choosing a game from hosting and exposes truthful materials and offers', async () => {
  const route = '/en/occasions/birthday/', html = await read(route);
  assert.match(html, /<h1>Printable birthday adventure games for kids/);
  assert.match(html, /Birthday Adventure Games for Kids \| Paper Adventure Workshop/);
  assert.ok((await readFile(new URL('../dist/client/sitemap.xml', import.meta.url), 'utf8')).includes('https://paperadventure.app' + route));
  assert.equal((html.match(/<details>/g) || []).length, 6);
  for (const id of ['birthday-games', 'birthday-preparation']) assert.ok(html.includes(`id="${id}"`));
  for (const asset of ['birthday-party-table-v1', 'celebration-home-detail-map', 'celebration-home-detail-record', 'celebration-home-detail-handout-cut']) assert.ok(html.includes(`/assets/${asset}.jpg`));
  assert.match(html, /illustrative scene/);
  assert.match(html, /10 Player \+ 1 finale = <strong>11/);
  assert.match(html, /20 Player \+ 1 finale = <strong>21/);
  assert.match(html, /Other themes have different counts/);
  assert.match(html, /existing fixed stories, not personalized birthday editions/);
  const data = bootstrap(html), offer = data.catalog.offers.find(item => item.sku === 'ready_home');
  if (data.runtime.checkout && data.runtime.checkoutMode === 'live' && offer.saleEnabled) assert.ok(html.includes(`US$${(offer.unitAmount / 100).toFixed(2)} · one-time purchase`));
  const graph = schema(html)['@graph'], list = graph.find(item => item['@type'] === 'ItemList');
  assert.equal(graph.find(item => item['@type'] === 'CollectionPage').mainEntity['@id'], list['@id']);
  assert.equal(list.numberOfItems, 3);
  for (const item of list.itemListElement) assert.ok(html.includes(`href="${new URL(item.url).pathname}"`));
  assert.equal(graph.find(item => ['Product', 'Article', 'FAQPage'].includes(item['@type'])), undefined);
  const birthdayGuide = await read('/en/guides/printable-birthday-party-adventures/');
  assert.match(birthdayGuide, /<h1>How to Host a Printable Birthday Adventure for Kids/);
  for (const source of ['/en/', '/en/for-home/', '/en/guides/printable-birthday-party-adventures/']) assert.ok((await read(source)).includes(`href="${route}"`), source);
  assert.ok(birthdayGuide.includes('href="' + route + '"'));
});

test('public content identifies the brand in its main content and keeps site names consistent', async () => {
  for (const page of publicPages.filter(page => page.indexable)) {
    const html = await read(page.path);
    const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0].replace(/<[^>]+>/g, ' ');
    assert.match(main, /Paper Adventure/i, `${page.path}: brand must be in content, beyond the header/footer`);
    assert.ok(html.includes(`<meta property="og:site_name" content="${siteIdentity.name}" />`), page.path);
    const graph = schema(html)['@graph'];
    assert.equal(graph.filter(item => item['@type'] === 'WebSite').length, 1, page.path);
    for (const type of ['WebSite', 'Organization']) {
      const identity = graph.find(item => item['@type'] === type);
      assert.equal(identity.name, siteIdentity.name, page.path);
      assert.equal(identity.alternateName, siteIdentity.alternateName, page.path);
    }
  }
});

test('all indexable HTML uses the same sanitized public bootstrap and schema builder as the client', async () => {
  for (const page of publicPages) {
    const html = await read(page.path);
    if (!page.indexable) { assert.doesNotMatch(html, /id="public-release-data"/); continue; }
    const data = bootstrap(html);
    const release = readPublicRelease({ getElementById: () => ({ textContent: JSON.stringify(data) }) });
    assert.deepEqual(schema(html), pageSchema(page, release), page.path);
    assert.ok(JSON.stringify(data).length < 5000, 'bootstrap should contain availability, not duplicate story text');
  }
  for (const route of ['/en/','/en/samples/home/','/en/samples/classroom/','/en/occasions/halloween/']) {
    assert.doesNotMatch(await read(route), /Layout preview|PDF not available|files are being prepared|planned catalog|Design preview/i, route);
  }
});

test('public bootstrap ignores unapproved API fields and safely restores its compact format', () => {
  const catalog = structuredClone(publicCatalog());
  catalog.secret = 'private-value'; catalog.themes[0].email = 'private@example.invalid'; catalog.offers[0].stripeSecret = 'private-key';
  const release = publicRelease({ status:'configured_runtime', checkoutMode:'test', checkout:false, sample:true, accessToken:'private-token', account:true }, catalog);
  const data = publicReleaseData(release);
  assert.doesNotMatch(JSON.stringify(data), /private-|private@|accessToken|stripeSecret|account/);
  assert.deepEqual(readPublicRelease({ getElementById:()=>({textContent:htmlJson(data)}) }), release);
  assert.equal(readPublicRelease({ getElementById:()=>({textContent:'invalid'}) }), null);
  assert.throws(() => publicRelease({status:'unavailable'}, catalog));
  catalog.offers[0].unitAmount = -1;
  assert.throws(() => publicRelease({status:'configured_runtime',checkoutMode:'live'}, catalog));
  assert.doesNotMatch(htmlJson({x:'</script><script>alert(1)</script>\u2028'}), /<|\u2028/);
});

test('product offers match real public price and availability without invented ratings or test sales', async () => {
  for (const page of publicPages.filter(page => /^\/en\/themes\/[^/]+\/(home|classroom)\/$/.test(page.path))) {
    const html = await read(page.path), graph = schema(html)['@graph'];
    const product = graph.find(item => item['@type'] === 'Product');
    if (!page.indexable) { assert.equal(product, undefined); continue; }
    const data = bootstrap(html), [, id, setting] = page.path.match(/^\/en\/themes\/([^/]+)\/(home|classroom)\/$/);
    const theme = data.catalog.themes.find(t => t.id === id), offer = data.catalog.offers.find(o => o.sku === 'ready_' + setting);
    assert.ok(product);
    assert.doesNotMatch(JSON.stringify(product), /aggregateRating|reviewCount|priceValidUntil/);
    const eligible = theme[setting].freeSample || (data.runtime.checkout && data.runtime.checkoutMode === 'live' && theme[setting].readyStatus === 'published' && offer.saleEnabled);
    assert.equal(Boolean(product.offers), eligible);
    if (eligible) assert.equal(product.offers.price, theme[setting].freeSample ? '0.00' : (offer.unitAmount / 100).toFixed(2));
  }
  const data = bootstrap(await read('/en/themes/dinosaur/home/'));
  data.runtime.checkoutMode = 'test';
  assert.equal(pageSchema(pageFor('/en/themes/dinosaur/home/'), readPublicRelease({getElementById:()=>({textContent:JSON.stringify(data)})}))['@graph'].find(item=>item['@type']==='Product').offers, undefined);
});

test('three original illustrated guides have navigation, real materials, article identity and working section anchors', async () => {
  const hub = await read('/en/guides/');
  for (const guide of guides) {
    assert.ok(hub.includes(`href="${guide.path}"`));
    const html = await read(guide.path);
    for (const [id] of guide.sections) { assert.ok(html.includes(`href="#${id}"`)); assert.ok(html.includes(`id="${id}"`)); }
    assert.ok((html.match(/<figure/g)||[]).length >= 1);
    const article = schema(html)['@graph'].find(item=>item['@type']==='Article');
    assert.equal(article.headline, guide.title);
    assert.equal(article.datePublished, '2026-10-28');
    assert.match(html, /By Paper Adventure Workshop/);
    assert.match(html, /href="\/en\/samples\/(home|classroom)\/"/);
    assert.doesNotMatch(html, /tested with \d|guaranteed|boosts? rankings/i);
  }
  const home = await read(guides[0].path), classroom = await read(guides[1].path);
  assert.match(home, /10 Player sheets \+ 1 finale sheet = 11|11 sheets total/);
  assert.match(home, /20 Player sheets \+ 1 finale sheet = 21/);
  assert.match(classroom, /5 crews of 6 \+ 1 crew of 5/);
  assert.match(classroom, /<td>54<\/td>/);
  assert.match(classroom, /four badge clue cards are information to share, separate from these job titles/);
});

test('guide hub connects its collection schema to actual articles and exposes useful preparation content in HTML', async () => {
  const html = await read('/en/guides/');
  const graph = schema(html)['@graph'];
  const collection = graph.find(item => item['@type'] === 'CollectionPage');
  const list = graph.find(item => item['@type'] === 'ItemList');
  assert.equal(collection.mainEntity['@id'], list['@id']);
  assert.equal(list.numberOfItems, guides.length);
  assert.deepEqual(list.itemListElement.map(item => [item.position, item.name, item.url]), guides.map((guide, i) => [i + 1, guide.title, 'https://paperadventure.app' + guide.path]));
  assert.equal(graph.find(item => item['@type'] === 'Article' || item['@type'] === 'FAQPage'), undefined);
  assert.match(html, /<h1>Printable Adventure Game Guides for Parents &amp; Teachers/);
  for (const id of ['choose-setting','read-guides','see-materials','prepare-to-play','guide-questions']) {
    assert.ok(html.includes(`href="#${id}"`), id);
    assert.ok(html.includes(`id="${id}"`), id);
  }
  for (const outcomes of Object.values(guideOutcomes)) for (const outcome of outcomes) assert.ok(html.includes(outcome), outcome);
  assert.match(html, /<caption>Choosing a setup for the free Celebration games, ages 6–12/);
  assert.equal((html.match(/<tr><th scope="row">/g)||[]).length, 3);
  assert.match(html, /One Home team: 11 sheets/);
  assert.match(html, /24 pupils in four crews: 36 sheets/);
  assert.match(html, /Read Guide pages 1–11 on screen/);
  assert.match(html, /read the nine-page Teacher Guide on screen/i);
  assert.equal((html.match(/<details>/g)||[]).length, 6);
  for (const image of ['handout-cut','handout-share']) assert.ok(html.includes(`href="/assets/celebration-home-detail-${image}.jpg"`));
  assert.ok(html.includes('href="/en/help/print/"'));
  assert.ok(html.includes('href="/en/help/start/"'));
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const url = new URL(href.replaceAll('&amp;','&'), 'https://paperadventure.app/en/guides/');
    if (url.origin !== 'https://paperadventure.app' || !url.hash) continue;
    const target = url.pathname === '/en/guides/' ? html : await read(url.pathname);
    assert.ok(target.includes(`id="${url.hash.slice(1)}"`), href);
  }
});
