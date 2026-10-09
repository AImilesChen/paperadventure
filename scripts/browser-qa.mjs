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
          id: item.id, impact: item.impact, nodes: item.nodes.slice(0, 3).map(node => node.target),
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
  if (viewport.name === 'mobile') {
    await page.goto(base + '/en/', { waitUntil: 'domcontentloaded' });
    const menu = page.getByRole('button', { name: 'Open menu' });
    await menu.click();
    if (await page.getByRole('button', { name: 'Close menu' }).getAttribute('aria-expanded') !== 'true') problems.push('Mobile menu failed to open');
    await page.keyboard.press('Escape');
    if (await page.getByRole('button', { name: 'Open menu' }).getAttribute('aria-expanded') !== 'false') problems.push('Mobile menu failed to close on Escape');
  }
  await context.close();
}
await browser.close();
writeFileSync(out + '/report.json', JSON.stringify({ snapshots, accessibility, problems }, null, 2) + '\n');
console.log(JSON.stringify({ checked: snapshots.length, screenshots: routesToCapture.size * 2, problems }, null, 2));
if (problems.length) process.exitCode = 1;
