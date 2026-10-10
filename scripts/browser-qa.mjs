import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { publicPages } from '../shared/page-manifest.mjs';
import { themes } from '../shared/catalog.mjs';

const base = 'http://127.0.0.1:4173';
const out = 'output/browser-qa';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const problems = [];
const snapshots = [];
const accessibility = [];
const routesToCapture = new Set(['/en/', '/en/themes/', '/en/themes/celebration/home/', '/en/themes/dinosaur/home/', '/en/themes/ocean/classroom/', '/en/for-home/', '/en/for-classroom/', '/en/create/', '/en/how-it-works/', '/en/pricing/', '/en/privacy/']);

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
      const indexable = publicPages.find(item => item.path === route)?.indexable;
      if (state.noindex === indexable) problems.push(viewport.name + ' ' + route + ' has the wrong robots metadata');
      snapshots.push({ viewport: viewport.name, route, ...state });
      if (route === '/en/create/') {
        if (await page.locator('main h1').count() !== 1) problems.push(viewport.name + ' creator page must have one main heading');
        for (const title of ['From a sentence to a paper adventure.', 'Player activities plus a separate adult guide.', 'About custom printable adventures.']) {
          if (!await page.getByRole('heading', { name: title, exact: true }).isVisible()) problems.push(viewport.name + ' creator missing ' + title);
        }
        if (await page.locator('#custom-files img').count() !== 2) problems.push(viewport.name + ' creator lacks real format previews');
        const headingSize = await page.locator('main h1').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
        if (headingSize > 49) problems.push(viewport.name + ' creator title is oversized');
      }

      if (route === '/en/how-it-works/') {
        if (await page.locator('main h1').count() !== 1) problems.push(viewport.name + ' guide page must have one main heading');
        if (!await page.getByRole('heading', { name: 'Pick the path that suits your group.' }).isVisible()) problems.push(viewport.name + ' guide page lacks the two paths');
        if (!await page.getByRole('heading', { name: 'Two parts, with different jobs.' }).isVisible()) problems.push(viewport.name + ' guide page lacks file contents');
        if (!await page.getByRole('heading', { name: 'Questions before you start.' }).isVisible()) problems.push(viewport.name + ' guide page lacks FAQs');
        if (await page.locator('.how-guide-visual img').count() !== 2) problems.push(viewport.name + ' guide page lacks real printable previews');
        if ((await page.locator('main').innerText()).includes('planned paid experience')) problems.push(viewport.name + ' guide page contains outdated placeholder copy');
        const headingSize = await page.locator('#how-guide-title').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
        if (headingSize > (viewport.name === 'desktop' ? 70 : 49)) problems.push(viewport.name + ' guide title is oversized: ' + headingSize + 'px');
        await page.getByRole('button', { name: 'For classroom' }).click();
        if (!await page.getByRole('heading', { name: 'A teacher-led group adventure' }).isVisible()) problems.push(viewport.name + ' classroom guidance does not appear');
        await page.getByRole('button', { name: 'For home' }).click();
      }

      if (route === '/en/pricing/') {
        if (await page.locator('main h1').count() !== 1) problems.push(viewport.name + ' pricing page must have one main heading');
        if (await page.locator('.pricing-guide-card').count() !== 3) problems.push(viewport.name + ' pricing page must show three choices');
        if (!await page.getByRole('heading', { name: 'Three clear ways to begin.' }).isVisible()) problems.push(viewport.name + ' pricing page lacks a clear choice overview');
        if (!await page.getByRole('heading', { name: 'Ready-made or custom?' }).isVisible()) problems.push(viewport.name + ' pricing page lacks product comparison');
        if (!await page.getByRole('heading', { name: 'Choose the licence that fits your group.' }).isVisible()) problems.push(viewport.name + ' pricing page lacks usage rights');
        const pricingText = await page.locator('main').innerText();
        if (pricingText.includes('checkout is closed while files') || pricingText.includes('No ready-made packs are published yet')) problems.push(viewport.name + ' pricing page contains outdated placeholder copy');
        for (const amount of ['$0', '$9.99', '$14.99', '$19.99']) if (!pricingText.includes(amount)) problems.push(viewport.name + ' pricing page missing ' + amount);
        const pricingHeadingSize = await page.locator('main h1').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
        if (pricingHeadingSize > (viewport.name === 'desktop' ? 76 : 50)) problems.push(viewport.name + ' pricing title is oversized: ' + pricingHeadingSize + 'px');
      }

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
    const expectedPaths = ['/en/for-home/', '/en/for-classroom/', '/en/create/', '/en/how-it-works/', '/en/pricing/'];
    if (JSON.stringify(await primaryLinks.evaluateAll(links => links.map(link => link.getAttribute('href')))) !== JSON.stringify(expectedPaths)) problems.push('Desktop primary navigation has unexpected links or order');
    if (!await primaryLinks.first().isVisible() || !await primaryLinks.nth(1).isVisible()) problems.push('Home and Classroom entries are not both visible in the desktop header');
    if (await page.locator('#primary-navigation a[href="/en/samples/home/"], #primary-navigation a[href="/en/themes/"]').count()) problems.push('Secondary sample or all-themes link still occupies desktop primary navigation');
    if (!await page.locator('.nav-actions a[href="/en/create/"]').isVisible()) problems.push('Desktop Create an adventure action is missing');
    if (!await primaryLinks.nth(2).isVisible() || await primaryLinks.nth(2).innerText() !== 'AI custom adventure') problems.push('Desktop navigation lacks a clearly labelled AI custom entry');
    await page.locator('.theme-audience-switch button').nth(1).click();
    if (!await page.locator('.theme-card').nth(1).getByText('The Coral Chart Expedition').isVisible()) problems.push('Home gallery did not switch to the distinct Classroom worlds');
    if (!await page.locator('.theme-card').nth(1).getAttribute('href').then(href => href?.endsWith('/classroom/'))) problems.push('Classroom gallery card lost its setting');
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
    const expectedPaths = ['/en/for-home/', '/en/for-classroom/', '/en/create/', '/en/how-it-works/', '/en/pricing/'];
    const primaryLinks = page.locator('#primary-navigation .nav-primary-link');
    if (JSON.stringify(await primaryLinks.evaluateAll(links => links.map(link => link.getAttribute('href')))) !== JSON.stringify(expectedPaths)) problems.push('Mobile primary navigation has unexpected links or order');
    if (!await primaryLinks.first().isVisible() || !await primaryLinks.nth(1).isVisible()) problems.push('Mobile menu does not expose both Home and Classroom');
    if (await page.locator('#primary-navigation a[href="/en/samples/home/"], #primary-navigation a[href="/en/themes/"]').count()) problems.push('Secondary sample or all-themes link still occupies mobile primary navigation');
    if (!await primaryLinks.nth(2).isVisible() || await primaryLinks.nth(2).innerText() !== 'AI custom adventure') problems.push('Mobile menu lacks a clearly labelled AI custom entry');
    await page.keyboard.press('Escape');
    if (await page.getByRole('button', { name: 'Open menu' }).getAttribute('aria-expanded') !== 'false') problems.push('Mobile menu failed to close on Escape');
  }
  if (viewport.name === 'desktop') {
    for (const [route, title] of [['/en/for-home/', 'Printable Adventure Games for Kids at Home.'], ['/en/for-classroom/', 'Printable Classroom Adventure Games for Kids.']]) {
      await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      if (!await page.getByRole('heading', { name: title }).isVisible()) problems.push(route + ' has the wrong audience heading');
      if (await page.locator('.product-theme-card').count() !== 6) problems.push(route + ' does not show six available adventures');
      if (route === '/en/for-classroom/' && (!await page.locator('.catalog-classroom-hero').isVisible() || !await page.getByRole('heading', { name: 'What comes in a Classroom pack?' }).isVisible())) problems.push('Classroom page lacks its teacher-facing introduction or pack explanation');
      await page.getByRole('button', { name: /Parties & seasons/ }).click();
      if (await page.locator('.product-theme-card').count() !== (route === '/en/for-home/' ? 3 : 1)) problems.push(route + ' occasion filter did not narrow the catalog');
      await page.getByRole('button', { name: /Any-day adventures/ }).click();
      if (await page.locator('.product-theme-card').count() !== (route === '/en/for-home/' ? 3 : 5)) problems.push(route + ' any-day filter did not narrow the catalog');
      await page.getByRole('button', { name: /All themes/ }).click();
    }
    await page.goto(base + '/en/for-classroom/', { waitUntil: 'domcontentloaded' });
    const classroomDetail = page.locator('.product-theme-card').nth(1).locator('a.product-image-link');
    if (!await classroomDetail.getAttribute('href').then(href => href?.endsWith('/classroom/'))) problems.push('Classroom catalog did not preserve the selected setting');
    await page.goto(base + '/en/themes/ocean/classroom/', { waitUntil: 'domcontentloaded' });
    if (!await page.getByRole('heading', { level: 1, name: "The Coral Chart Expedition." }).isVisible()) problems.push('Theme detail did not prioritize the selected Classroom story');
    if (await page.locator('.theme-checkpoints li').count() !== 5) problems.push('Classroom theme detail lost its five checkpoint explanation');
    if (!await page.getByRole('heading', { name: 'Inside the Classroom adventure' }).isVisible()) problems.push('Classroom theme detail lacks its pack contents');
    if (!await page.getByText(/7 Player Pack pages \+ 7 Teacher Guide pages/).isVisible()) problems.push('Classroom print plan does not show draft PDF page counts');
  }
  await context.close();
}
const autoContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
const autoPage = await autoContext.newPage();
await autoPage.goto(base + '/en/', { waitUntil: 'domcontentloaded' });
await autoPage.locator('.theme-track').first().waitFor({ state: 'visible' });
await autoPage.locator('.themes-section .section-heading').first().hover();
const autoStart = await autoPage.locator('.theme-track').first().evaluate(element => element.scrollLeft);
await autoPage.waitForTimeout(5500);
const autoEnd = await autoPage.locator('.theme-track').first().evaluate(element => element.scrollLeft);
if (autoEnd <= autoStart + 20) problems.push('Theme carousel did not advance while the pointer was over the section heading');
await autoPage.locator('.theme-card').first().hover();
await autoPage.waitForTimeout(350);
const hoverStart = await autoPage.locator('.theme-track').first().evaluate(element => element.scrollLeft);
await autoPage.waitForTimeout(5500);
const hoverEnd = await autoPage.locator('.theme-track').first().evaluate(element => element.scrollLeft);
if (Math.abs(hoverEnd - hoverStart) > 5) problems.push('Theme carousel did not pause while a card was being read');
if (await autoPage.locator('.gallery-status').innerText() !== 'Paused while viewing cards') problems.push('Theme carousel does not explain its interaction pause');
await autoPage.mouse.move(1, 1);
await autoPage.waitForTimeout(5500);
const resumedEnd = await autoPage.locator('.theme-track').first().evaluate(element => element.scrollLeft);
if (Math.abs(resumedEnd - hoverEnd) <= 20) problems.push('Theme carousel did not resume after pointer left the cards');
const belt = autoPage.locator('.theme-track').first();
const beforeShort = await belt.evaluate(element => element.scrollLeft);
await autoPage.waitForTimeout(700);
const afterShort = await belt.evaluate(element => element.scrollLeft);
if (afterShort - beforeShort < 5 || afterShort - beforeShort > 40) problems.push('Theme belt is not moving slowly and continuously');
await autoPage.getByRole('button', { name: 'Pause automatic theme scrolling' }).click();
await belt.evaluate(element => {
  const cards = element.querySelectorAll('.theme-card');
  const cycle = cards[cards.length / 2].offsetLeft - cards[0].offsetLeft;
  element.scrollLeft = cycle - 12;
});
await autoPage.getByRole('button', { name: 'Resume automatic theme scrolling' }).click();
await autoPage.waitForTimeout(1500);
const seamEnd = await belt.evaluate(element => element.scrollLeft);
if (seamEnd > 100) problems.push('Theme belt did not wrap seamlessly at its duplicated seam');
if (await belt.locator('[data-loop-copy]:not([tabindex="-1"])').count()) problems.push('Visual loop copies create duplicate keyboard stops');
await autoContext.close();
await browser.close();
writeFileSync(out + '/report.json', JSON.stringify({ snapshots, accessibility, problems }, null, 2) + '\n');
console.log(JSON.stringify({ checked: snapshots.length, screenshots: routesToCapture.size * 2, problems }, null, 2));
if (problems.length) console.log(JSON.stringify(accessibility.filter(item => item.violations.some(violation => ['serious', 'critical'].includes(violation.impact))), null, 2));
if (problems.length) process.exitCode = 1;


