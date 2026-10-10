import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { publicCatalog } from '../shared/catalog.mjs';

const base = 'http://127.0.0.1:4173';
const out = 'output/browser-qa';
mkdirSync(out, { recursive: true });
const packIds = ['dinosaur', 'space', 'forest', 'halloween', 'christmas'];
const packs = packIds.flatMap(themeId => ['home', 'classroom'].map(setting => ({
  themeId, setting, version: 'v1.0',
  variantIds: setting === 'classroom' && ['halloween', 'christmas'].includes(themeId) ? [themeId] : [],
})));
const health = {
  status: 'configured_runtime', checkout: true, checkoutMode: 'test',
  generation: true, proposals: true, account: true, sample: true, legal: false,
};
const catalog = publicCatalog();
catalog.freeSampleThemeId = 'celebration';
catalog.themes = catalog.themes.map(theme => ({
  ...theme,
  home: { ...theme.home, freeSample: theme.id === 'celebration',
    readyStatus: theme.id === 'celebration' ? 'downloadable_trial' : 'test_ready',
    packVersion: theme.id === 'celebration' ? 'v0.1' : 'v1.0' },
  classroom: { ...theme.classroom, freeSample: theme.id === 'celebration',
    readyStatus: theme.id === 'celebration' ? 'downloadable_trial' : 'test_ready',
    packVersion: theme.id === 'celebration' ? 'v0.1' : 'v1.0',
    variantIds: ['halloween', 'christmas'].includes(theme.id) ? [theme.id] : [] },
}));
catalog.offers = catalog.offers.map(offer => ({ ...offer, saleEnabled: true }));
const proposalResponse = {
  proposals: [
    { id: 'mystery', title: 'The hidden forest letter', summary: 'Find the missing letter through five woodland clues.' },
    { id: 'mission', title: 'Mission through the canopy', summary: 'Deliver a paper signal to the forest lookout.' },
  ],
};
const orders = {
  'mock-ready': {
    id: 'mock-ready', kind: 'ready', sku: 'ready_home', status: 'published',
    amountTotal: 999, currency: 'USD', filesReady: true,
    accessExpiresAt: '2027-10-09 00:00:00', revisionLimit: 0, revisionUsed: 0,
  },
  'mock-classroom': {
    id: 'mock-classroom', kind: 'ready', sku: 'ready_classroom', status: 'published',
    amountTotal: 1499, currency: 'USD', filesReady: true,
    accessExpiresAt: '2027-10-09 00:00:00', revisionLimit: 0, revisionUsed: 0,
  },
  'mock-custom': {
    id: 'mock-custom', kind: 'custom', sku: 'custom_classroom', status: 'paid',
    amountTotal: 1999, currency: 'USD', filesReady: false,
    generationState: 'queued', generationFailedAttempts: 0,
    revisionLimit: 2, revisionUsed: 0,
  },
};
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const checkoutPayloads = [];
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('**/api/v1/**', async route => {
  const path = new URL(route.request().url()).pathname;
  const reply = (body, status = 200) => route.fulfill({
    status, contentType: 'application/json', body: JSON.stringify(body),
  });
  if (path === '/api/v1/health') return reply(health);
  if (path === '/api/v1/catalog') return reply(catalog);
  if (path === '/api/v1/test-packs') return reply({ packs, mode: 'stripe_test' });
  if (path === '/api/v1/auth/session') return reply({ available: true, authenticated: true });
  if (path.startsWith('/api/v1/test-pack-previews/')) return route.fulfill({
    status: 200, contentType: 'image/jpeg',
    body: Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABQb/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdAB//2Q==', 'base64'),
  });
  if (path === '/api/v1/proposals') return reply(proposalResponse);
  if (path === '/api/v1/my-draft') return reply({ draft: null });
  if (path === '/api/v1/checkout-intents') {
    const body = route.request().postDataJSON();
    checkoutPayloads.push(body);
    const orderId = body.sku === 'ready_home' ? 'mock-ready'
      : body.sku === 'ready_classroom' ? 'mock-classroom' : 'mock-custom';
    return reply({ checkoutUrl: base + '/en/orders/' + orderId + '/' });
  }
  const order = path.match(/^\/api\/v1\/orders\/([^/]+)$/);
  if (order) return reply(orders[order[1]] || { error: { message: 'Unknown mock order' } }, orders[order[1]] ? 200 : 404);
  if (/^\/api\/v1\/orders\/[^/]+\/issues$/.test(path)) return reply({ cases: [] });
  return reply({ error: { message: 'Unexpected mock API request: ' + path } }, 503);
});

function check(condition, message) { if (!condition) throw new Error(message); }
try {
  await page.goto(base + '/en/themes/dinosaur/home/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Open test checkout/ }).waitFor();
  await page.locator('.theme-preview-pages figure img').first().waitFor();
  check(await page.locator('.theme-preview-pages figure img').count() === 2, 'Ready-made page needs both real player-page previews');
  await page.getByRole('link', { name: /Open test checkout/ }).click();
  await page.getByLabel('Adult delivery email').fill('tester@example.com');
  await page.getByRole('button', { name: /Continue to Stripe test/ }).click();
  await page.waitForURL('**/en/orders/mock-ready/');
  check(checkoutPayloads[0]?.sku === 'ready_home' &&
    checkoutPayloads[0]?.themeId === 'dinosaur' &&
    checkoutPayloads[0]?.packVersion === 'v1.0', 'Home ready pack checkout lost its SKU, theme or version');
  await page.locator('.live-downloads a').first().waitFor();
  check(await page.locator('.live-downloads a').count() === 4, 'Ready order does not show four private PDF downloads');

  await page.goto(base + '/en/themes/halloween/classroom/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Open test checkout/ }).click();
  await page.getByLabel('Classroom story wording').selectOption('halloween');
  await page.getByLabel('Adult delivery email').fill('tester@example.com');
  await page.getByRole('button', { name: /Continue to Stripe test/ }).click();
  await page.waitForURL('**/en/orders/mock-classroom/');
  check(checkoutPayloads[1]?.sku === 'ready_classroom' &&
    checkoutPayloads[1]?.themeId === 'halloween' &&
    checkoutPayloads[1]?.variantId === 'halloween',
    'Seasonal classroom wording was not carried into checkout');
  await page.locator('.live-downloads a').first().waitFor();
  check(await page.locator('.live-downloads a').count() === 4,
    'Classroom order does not show four private PDF downloads');

  await page.goto(base + '/en/create/?theme=forest&setting=classroom', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1, name: /Create a printable adventure from your idea/ }).waitFor();
  check(await page.locator('.custom-create-page-previews img').count() === 2, 'Creator does not show the real sample-format pages');
  await page.getByText(/Custom Home US\$14\.99/).waitFor();
  await page.getByText(/Custom Classroom US\$19\.99/).waitFor();

  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByLabel('Players or students').fill('20');
  await page.getByLabel('Groups').fill('4');
  await page.getByLabel('Age range (6–12)').fill('8–10');
  await page.getByRole('button', { name: /Preview two story ideas/ }).click();
  await page.getByRole('button', { name: /Mission through the canopy/ }).click();
  await page.getByRole('button', { name: /Review choices/ }).click();
  await page.getByRole('link', { name: /Continue to Stripe test checkout/ }).click();
  await page.waitForURL('**/en/checkout/**');
  const customEmail = page.getByLabel('Adult delivery email');
  if (!await customEmail.count()) {
    const debug = await page.evaluate(() => ({
      url: location.href,
      draft: localStorage.getItem('paw-draft'),
      main: document.querySelector('main')?.innerText.slice(0, 1200),
    }));
    throw new Error('Custom checkout form missing: ' + JSON.stringify(debug));
  }
  await customEmail.fill('tester@example.com');
  await page.getByRole('button', { name: /Continue to Stripe test/ }).click();
  await page.waitForURL('**/en/orders/mock-custom/');
  check(checkoutPayloads[2]?.sku === 'custom_classroom' &&
    checkoutPayloads[2]?.themeId === 'forest' &&
    checkoutPayloads[2]?.direction === 'mission' &&
    checkoutPayloads[2]?.proposalTitle === 'Mission through the canopy' &&
    checkoutPayloads[2]?.proposalSummary === proposalResponse.proposals[1].summary,
    'Selected AI direction did not survive review and checkout');
  await page.getByText('Your full game is queued.').waitFor();
  check(errors.length === 0, 'Browser JavaScript errors: ' + errors.join('; '));
  await page.screenshot({ path: out + '/mock-custom-order.png', fullPage: true, animations: 'disabled' });
  await page.route('**/api/v1/auth/session', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ available: true, authenticated: false }),
  }));
  await page.goto(base + '/en/themes/dinosaur/home/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Open test checkout/ }).waitFor();
  await page.locator('.theme-preview-pages figure img').first().waitFor();
  check(await page.locator('.theme-preview-pages figure img').count() === 2, 'Ready-made page needs both real player-page previews');
  await page.getByRole('link', { name: /Open test checkout/ }).click();
  const signIn = page.getByRole('link', { name: 'Sign in with Google' });
  await signIn.waitFor();
  check((await signIn.getAttribute('href'))?.includes('returnTo='), 'Checkout sign-in did not preserve the return path');
  check(await page.getByLabel('Adult delivery email').count() === 0, 'Signed-out visitor can submit test checkout');
  writeFileSync(out + '/commerce-flow-report.json', JSON.stringify({
    fixedPacksVisible: packs.length, readyHomeOrderLinks: 4, readyClassroomOrderLinks: 4,
    seasonalVariant: checkoutPayloads[1].variantId,
    customDirection: checkoutPayloads[2].proposalTitle,
    publicCatalogueVisibleBeforeSignIn: true,
    checkoutRequiresGoogleSignIn: true,
    note: 'Mocked API and checkout redirect only; no Stripe charge or authenticated production purchase.',
  }, null, 2) + '\n');
  console.log('Commerce UI mock passed: 10 public fixed packs, signed-out checkout gate, two ready order paths, seasonal wording, custom proposal snapshot and queued order.');
} finally {
  await browser.close();
}
