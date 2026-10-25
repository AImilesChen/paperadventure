import { ApiError } from './domain.mjs';

// Restricted keys authenticate like standard keys; their permissions are
// enforced by Stripe. Unknown and client-side keys never enable checkout.
export function stripeKeyMode(key) {
  if (typeof key !== 'string') return null;
  if (key.startsWith('sk_test_') || key.startsWith('rk_test_')) return 'test';
  if (key.startsWith('sk_live_') || key.startsWith('rk_live_')) return 'live';
  return null;
}

// Explicitly select already-stored live secrets without overwriting sandbox secrets.
// An incomplete selection closes checkout rather than falling back to test keys.
export function paymentEnvironment(env) {
  if (env.PAYMENT_CREDENTIAL_SOURCE !== 'staged_live') return env;
  return { ...env,
    STRIPE_SECRET_KEY: stripeKeyMode(env.STRIPE_LIVE_SECRET_KEY) === 'live' ? env.STRIPE_LIVE_SECRET_KEY : undefined,
    STRIPE_WEBHOOK_SECRET: typeof env.STRIPE_LIVE_WEBHOOK_SECRET === 'string' && env.STRIPE_LIVE_WEBHOOK_SECRET.startsWith('whsec_') ? env.STRIPE_LIVE_WEBHOOK_SECRET : undefined,
  };
}

export async function stripeRequest(env, path, options = {}, fetcher = fetch) {
  if (!env.STRIPE_SECRET_KEY) throw new ApiError(503, 'PAYMENT_NOT_CONFIGURED', 'Payment is not configured.');
  const response = await fetcher(`https://api.stripe.com/v1/${path}`, { ...options, headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, ...(options.headers || {}) } });
  if (!response.ok) {
    const error = new ApiError(502, 'PAYMENT_PROVIDER_ERROR', 'The payment provider could not complete this request.');
    error.providerStatus = response.status; // Internal numeric diagnostic; never copy Stripe response prose.
    throw error;
  }
  return response.json();
}

export function checkoutForm({ orderId, email, priceId, inlinePrice, specHash, successUrl, cancelUrl }) {
  const form = new URLSearchParams();
  const fields = {
    mode: 'payment', client_reference_id: orderId,
    'line_items[0][quantity]': '1',
    'metadata[order_id]': orderId, 'metadata[spec_hash]': specHash,
    success_url: successUrl, cancel_url: cancelUrl,
    'billing_address_collection': 'auto',
    'automatic_tax[enabled]': 'false',
    'allow_promotion_codes': 'false',
  };
  if (inlinePrice) {
    form.set('line_items[0][price_data][currency]', 'usd');
    form.set('line_items[0][price_data][unit_amount]', String(inlinePrice.unitAmount));
    form.set('line_items[0][price_data][product_data][name]', inlinePrice.name);
  } else form.set('line_items[0][price]', priceId);
  if (email) form.set('customer_email', email);
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

// Verify catalog identity and amount without requiring Stripe Tax enrollment.
export async function verifyFixedPrice(env, price, fetcher = fetch) {
  const actual = await stripeRequest(env, `prices/${encodeURIComponent(price.stripe_price_id)}`, {}, fetcher);
  if (actual.id !== price.stripe_price_id || actual.livemode !== true || actual.active !== true || actual.type !== 'one_time' || actual.currency !== 'usd' || actual.unit_amount !== price.unit_amount)
    throw new ApiError(503, 'OFFER_NOT_READY', 'This product is not available for checkout.');
}

export function validatePaidSession(session, order, price) {
  if (!session || session.id !== order.stripe_checkout_session_id || session.client_reference_id !== order.id || session.metadata?.order_id !== order.id || session.metadata?.spec_hash !== order.purchase_spec_sha256) return false;
  if (session.payment_status !== 'paid' || session.currency?.toLowerCase() !== 'usd') return false;
  if (session.amount_subtotal !== price.unit_amount || !Number.isInteger(session.amount_total) || session.amount_total < session.amount_subtotal) return false;
  let fixedTotal = false;
  try { fixedTotal = JSON.parse(order.purchase_spec_json || '{}').checkoutPricing === 'fixed_total_v1'; } catch { return false; }
  if ((fixedTotal || price.tax_behavior === 'inclusive') && session.amount_total !== price.unit_amount) return false;
  return true;
}
