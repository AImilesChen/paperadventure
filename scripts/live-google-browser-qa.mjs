import { chromium } from 'playwright';

const origin = 'https://paperadventure.app';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({
  status: 200,
  contentType: 'application/javascript',
  body: "window.google={accounts:{id:{initialize(options){window.__googleSignIn=options},renderButton(node){const button=document.createElement('button');button.type='button';button.textContent='Google test button';button.onclick=()=>window.__googleSignIn.callback({credential:'invalid-id-token'});node.appendChild(button)}}}};",
}));
try {
  const response = await page.goto(origin + '/en/account/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  if (!response?.ok() || !response.headers()['x-robots-tag']?.includes('noindex')) throw new Error('Account page HTTP/noindex mismatch');
  const button = page.getByRole('button', { name: 'Google test button' });
  await button.waitFor({ state: 'visible', timeout: 15000 });
  await button.click();
  await page.getByRole('alert').getByText('Google sign-in could not be verified. Please try again.').waitFor({ timeout: 15000 });
  if (errors.length) throw new Error('Browser JavaScript errors: ' + errors.join('; '));
  console.log('Live account page, GIS callback, API rejection and user-visible error verified with a synthetic invalid credential');
} finally {
  await browser.close();
}
