import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const origin = 'https://paperadventure.app';
const out = 'output/browser-qa';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const problems = [];
const snapshots = [];

for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => problems.push(viewport.name + ' JavaScript: ' + error.message));
  for (const setting of ['home', 'classroom']) {
    const route = '/en/samples/' + setting + '/';
    try {
      const response = await page.goto(origin + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
      if (!response?.ok() || response.headers()['x-robots-tag']?.includes('noindex') || await page.locator('meta[name="robots"][content*="noindex"]').count()) problems.push(viewport.name + ' ' + route + ' HTTP/indexability mismatch');
      const player = page.getByRole('button', { name: 'Download ' + setting + ' A4 Player Pack' });
      await player.waitFor({ state: 'visible', timeout: 15000 });
      if (await page.getByText('Trial v0.1').count() === 0) problems.push(viewport.name + ' ' + route + ' lacks trial version');
      const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
      if (overflow > 16) problems.push(viewport.name + ' ' + route + ' horizontal overflow ' + overflow + 'px');
      const scan = await new AxeBuilder({ page }).analyze();
      for (const violation of scan.violations.filter(item => ['serious', 'critical'].includes(item.impact))) {
        problems.push(viewport.name + ' ' + route + ' accessibility ' + violation.id + ': ' + violation.nodes.length + ' affected elements');
      }
      await page.screenshot({ path: out + '/live-' + viewport.name + '-' + setting + '.png', fullPage: true, animations: 'disabled' });
      snapshots.push({ viewport: viewport.name, route, overflow });
      const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), player.click()]);
      if (download.suggestedFilename() !== 'celebration-' + setting + '-player-A4.pdf') problems.push(viewport.name + ' ' + route + ' incorrect download name');
      await download.delete();
      await page.getByRole('button', { name: 'US Letter' }).click();
      const guide = page.getByRole('button', { name: new RegExp('Download ' + setting + ' Letter (?:Host|Teacher) Guide') });
      const [guideDownload] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), guide.click()]);
      if (guideDownload.suggestedFilename() !== 'celebration-' + setting + '-guide-Letter.pdf') problems.push(viewport.name + ' ' + route + ' incorrect guide download name');
      await guideDownload.delete();
    } catch (error) { problems.push(viewport.name + ' ' + route + ': ' + error.message); }
  }
  await context.close();
}
await browser.close();
writeFileSync(out + '/live-trial-report.json', JSON.stringify({ snapshots, problems }, null, 2) + '\n');
console.log(JSON.stringify({ checked: snapshots.length, screenshots: snapshots.length, problems }, null, 2));
if (problems.length) process.exitCode = 1;
