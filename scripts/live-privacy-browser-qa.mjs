import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const browser = await chromium.launch({ headless: true });
const problems = [];
for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  try {
    const response = await page.goto('https://paperadventure.app/en/privacy/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (!response?.ok()) throw new Error('Privacy page HTTP error');
    await page.getByRole('heading', { name: 'How Paper Adventure uses your information.' }).waitFor({ timeout: 15000 });
    const body = await page.locator('main').innerText();
    for (const required of ['Paper Adventure is operated by an individual based in Hong Kong', 'support@paperadventure.app', 'paw_google_nonce', 'paw_session', 'We do not currently run non-essential analytics']) {
      if (!body.includes(required)) problems.push(viewport.name + ': missing ' + required);
    }
    if (/NEEDS_REVIEW|Final reviewed wording goes here|review-stage layout/.test(body)) problems.push(viewport.name + ': draft legal placeholder visible');
    const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
    if (overflow > 16) problems.push(viewport.name + ': horizontal overflow ' + overflow + 'px');
    const scan = await new AxeBuilder({ page }).analyze();
    for (const violation of scan.violations.filter(item => ['serious', 'critical'].includes(item.impact))) {
      problems.push(viewport.name + ': accessibility ' + violation.id + ': ' + violation.nodes.length + ' elements');
    }
  } catch (error) { problems.push(viewport.name + ': ' + error.message); }
  await page.close();
}
await browser.close();
console.log(JSON.stringify({ checked: 2, problems }, null, 2));
if (problems.length) process.exitCode = 1;
