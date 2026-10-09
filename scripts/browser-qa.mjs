import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { publicPages } from '../shared/page-manifest.mjs';

const base = 'http://127.0.0.1:4173';
const out = 'output/browser-qa';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const problems = [];
const snapshots = [];
const accessibility = [];
const routesToCapture = new Set(['/en/', '/en/themes/', '/en/themes/celebration/', '/en/create/', '/en/pricing/', '/en/privacy/']);

for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => problems.push(viewport.name + ' JavaScript: ' + error.message));
  const routes = viewport.name === 'desktop' ? publicPages.map(item => item.path) : [...routesToCapture];
  for (const route of routes) {
    try {
      const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 15000 });
      if (!response?.ok()) problems.push(viewport.name + ' ' + route + ' HTTP ' + response?.status());
      await page.locator('main').first().waitFor({ state: 'visible', timeout: 10000 });
      const state = await page.evaluate(() => ({
        h1: Boolean(document.querySelector('main h1')),
        bodyOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
        brokenImages: [...document.images].filter(image => image.complete && image.naturalWidth === 0).map(image => image.getAttribute('src')),
        noindex: Boolean(document.querySelector('meta[name="robots"][content*="noindex"]')),
      }));
      if (!state.h1) problems.push(viewport.name + ' ' + route + ' missing main heading');
      if (state.bodyOverflow > 16) problems.push(viewport.name + ' ' + route + ' horizontal overflow ' + state.bodyOverflow + 'px');
      if (state.brokenImages.length) problems.push(viewport.name + ' ' + route + ' broken images: ' + state.brokenImages.join(', '));
      if (!state.noindex) problems.push(viewport.name + ' ' + route + ' missing preview noindex');
      snapshots.push({ viewport: viewport.name, route, ...state });
      if (routesToCapture.has(route)) {
        const scan = await new AxeBuilder({ page }).analyze();
        accessibility.push({ viewport: viewport.name, route, violations: scan.violations.map(item => ({
          id: item.id, impact: item.impact, nodes: item.nodes.slice(0, 20).map(node => ({ target: node.target, summary: node.failureSummary })),
        })) });
        for (const violation of scan.violations.filter(item => ['serious','critical'].includes(item.impact))) {
          problems.push(viewport.name + ' ' + route + ' accessibility ' + violation.id + ': ' + violation.nodes.length + ' affected elements');
        }
        const slug = route === '/en/' ? 'home' : route.replace(/^\/en\//, '').replace(/\/$/, '').replaceAll('/', '-');
        await page.screenshot({ path: out + '/' + viewport.name + '-' + slug + '.png', fullPage: true, animations: 'disabled' });
      }
    } catch (error) {
      problems.push(viewport.name + ' ' + route + ' ' + error.message);
    }
  }
  if (viewport.name === 'desktop') {
    await page.goto(base + '/en/', { waitUntil: 'domcontentloaded' });
    const signIn = page.locator('.nav-actions .nav-login');
    if (!await signIn.isVisible() || await signIn.getAttribute('href') !== '/en/account/') problems.push('Desktop Sign in is not discoverable in the header');
    const primaryLinks = page.locator('#primary-navigation .nav-primary-link');
    const expectedPaths = ['/en/for-home/', '/en/for-classroom/', '/en/how-it-works/', '/en/pricing/'];
    if (JSON.stringify(await primaryLinks.evaluateAll(links => links.map(link => link.getAttribute('href')))) !== JSON.stringify(expectedPaths)) problems.push('Desktop primary navigation has unexpected links or order');
    if (!await primaryLinks.first().isVisible() || !await primaryLinks.nth(1).isVisible()) problems.push('Home and Classroom entries are not both visible in the desktop header');
    if (await page.locator('#primary-navigation a[href="/en/samples/home/"], #primary-navigation a[href="/en/themes/"]').count()) problems.push('Secondary sample or all-themes link still occupies desktop primary navigation');
    if (!await page.locator('.nav-actions a[href="/en/create/"]').isVisible()) problems.push('Desktop Create an adventure action is missing');
    await page.locator('.theme-audience-switch button').nth(1).click();
    if (!await page.locator('.theme-card').nth(1).getByText('The Dinosaur Research Station Mix-up').isVisible()) problems.push('Home gallery did not switch to the six Classroom stories');
    if (!await page.locator('.theme-card').nth(1).getAttribute('href').then(href => href?.includes('setting=classroom'))) problems.push('Classroom gallery card lost its setting');
    if (await page.locator('.sample-spotlight-card a[href^="/en/samples/"]').count() !== 2) problems.push('Home does not link to both Celebration editions');
    const rail = page.locator('.theme-track').first();
    const beforeScroll = await rail.evaluate(element => element.scrollLeft);
    await page.getByRole('button', { name: 'Scroll themes right' }).first().click();
    await page.waitForTimeout(650);
    if (await rail.evaluate(element => element.scrollLeft) <= beforeScroll + 20) problems.push('Desktop theme carousel did not advance from the right arrow');
    const playToggle = page.locator('.gallery-play-toggle').first();
    const previousState = await playToggle.getAttribute('aria-pressed');
    await playToggle.click();
    if (await playToggle.getAttribute('aria-pressed') === previousState) problems.push('Theme carousel play/pause control did not change state');
  }
  if (viewport.name === 'mobile') {
    await page.goto(base + '/en/', { waitUntil: 'domcontentloaded' });
    const menu = page.getByRole('button', { name: 'Open menu' });
    await menu.focus();
    await page.keyboard.press('Enter');
    if (await page.getByRole('button', { name: 'Close menu' }).getAttribute('aria-expanded') !== 'true') problems.push('Mobile menu failed to open from keyboard');
    const signIn = page.locator('#primary-navigation .nav-account-mobile').first();
    if (!await signIn.isVisible() || await signIn.getAttribute('href') !== '/en/account/') problems.push('Mobile Sign in is not discoverable in the menu');
    const createEntry = page.locator('#primary-navigation .nav-create-mobile');
    const expectedPaths = ['/en/for-home/', '/en/for-classroom/', '/en/how-it-works/', '/en/pricing/'];
    const primaryLinks = page.locator('#primary-navigation .nav-primary-link');
    if (JSON.stringify(await primaryLinks.evaluateAll(links => links.map(link => link.getAttribute('href')))) !== JSON.stringify(expectedPaths)) problems.push('Mobile primary navigation has unexpected links or order');
    if (!await primaryLinks.first().isVisible() || !await primaryLinks.nth(1).isVisible()) problems.push('Mobile menu does not expose both Home and Classroom');
    if (await page.locator('#primary-navigation a[href="/en/samples/home/"], #primary-navigation a[href="/en/themes/"]').count()) problems.push('Secondary sample or all-themes link still occupies mobile primary navigation');
    if (!await createEntry.isVisible() || await createEntry.getAttribute('href') !== '/en/create/') problems.push('Mobile custom creation is not discoverable in the menu');
    await page.keyboard.press('Escape');
    if (await page.getByRole('button', { name: 'Open menu' }).getAttribute('aria-expanded') !== 'false') problems.push('Mobile menu failed to close on Escape');
  }
  if (viewport.name === 'desktop') {
    for (const [route, title] of [['/en/for-home/', 'Six adventures for home.'], ['/en/for-classroom/', 'Six adventures for the classroom.']]) {
      await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      if (!await page.getByRole('heading', { name: title }).isVisible()) problems.push(route + ' has the wrong audience heading');
      if (await page.locator('.product-theme-card').count() !== 6) problems.push(route + ' does not show all six themes');
    }
    await page.goto(base + '/en/for-classroom/', { waitUntil: 'domcontentloaded' });
    const classroomDetail = page.locator('.product-theme-card').nth(1).locator('a.product-image-link');
    if (!await classroomDetail.getAttribute('href').then(href => href?.includes('setting=classroom'))) problems.push('Classroom catalog did not preserve the selected setting');
    await page.goto(base + '/en/themes/dinosaur/?setting=classroom', { waitUntil: 'domcontentloaded' });
    if (!await page.locator('.product-story-grid article.selected').first().getByText('The Dinosaur Research Station Mix-up').isVisible()) problems.push('Theme detail did not prioritize the selected Classroom story');
  }
  await context.close();
}
const autoContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
const autoPage = await autoContext.newPage();
await autoPage.goto(base + '/en/', { waitUntil: 'domcontentloaded' });
await autoPage.locator('.theme-track').first().waitFor({ state: 'visible' });
await autoPage.mouse.move(1, 1);
const autoStart = await autoPage.locator('.theme-track').first().evaluate(element => element.scrollLeft);
await autoPage.waitForTimeout(5500);
const autoEnd = await autoPage.locator('.theme-track').first().evaluate(element => element.scrollLeft);
if (autoEnd <= autoStart + 20) problems.push('Theme carousel did not advance automatically');
await autoContext.close();
await browser.close();
writeFileSync(out + '/report.json', JSON.stringify({ snapshots, accessibility, problems }, null, 2) + '\n');
console.log(JSON.stringify({ checked: snapshots.length, screenshots: routesToCapture.size * 2, problems }, null, 2));
if (problems.length) console.log(JSON.stringify(accessibility.filter(item => item.violations.some(violation => ['serious', 'critical'].includes(violation.impact))), null, 2));
if (problems.length) process.exitCode = 1;
