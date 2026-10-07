import { publicCatalog, themes, offers } from '../shared/catalog.mjs';

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
});

const unavailable = (code, message) => json({ error: { code, message } }, 503);

export function handleApi(request) {
  const url = new URL(request.url);
  const { pathname } = url;
  if (request.method === 'GET' && pathname === '/api/v1/health') {
    return json({ status: 'development_preview', checkout: false, generation: false });
  }
  if (request.method === 'GET' && pathname === '/api/v1/catalog') {
    return json(publicCatalog());
  }
  if (request.method === 'GET' && pathname.startsWith('/api/v1/themes/')) {
    const id = decodeURIComponent(pathname.slice('/api/v1/themes/'.length));
    const theme = themes.find(item => item.id === id);
    return theme ? json({ theme, offers: offers.filter(offer => offer.kind === 'custom') }) : json({ error: { code: 'THEME_NOT_FOUND', message: 'Unknown theme.' } }, 404);
  }
  if (request.method === 'POST' && pathname === '/api/v1/checkout-intents') {
    return unavailable('CHECKOUT_NOT_READY', 'Purchases are not open. No payment was created.');
  }
  if (request.method === 'POST' && pathname === '/api/v1/proposals') {
    return unavailable('GENERATION_NOT_READY', 'Story generation is not available yet.');
  }
  if (pathname.startsWith('/api/v1/orders/') || pathname.startsWith('/api/v1/files/')) {
    return unavailable('ORDER_ACCESS_NOT_READY', 'Verified order access is not available yet.');
  }
  return json({ error: { code: 'NOT_FOUND', message: 'API route not found.' } }, 404);
}

export default { fetch: handleApi };
