import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicPages, pageFor } from '../shared/page-manifest.mjs';
import { publicCatalog } from '../shared/catalog.mjs';
import { publicRelease, publicReleaseData, readPublicRelease, htmlJson } from '../shared/public-release.mjs';
import { pageSchema } from '../shared/seo.mjs';
import { guides, guideOutcomes } from '../shared/guides.mjs';

const read = pathname => readFile(new URL('../dist/client' + pathname + 'index.html', import.meta.url), 'utf8');
const bootstrap = html => JSON.parse(html.match(/id="public-release-data">([^<]+)<\/script>/)[1]);
const schema = html => JSON.parse(html.match(/type="application\/ld\+json">([^<]+)<\/script>/)[1]);

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
