import { ApiError } from './domain.mjs';

export async function stripeRequest(env, path, options = {}, fetcher = fetch) {
  if (!env.STRIPE_SECRET_KEY) throw new ApiError(503, 'PAYMENT_NOT_CONFIGURED', 'Payment is not configured.');
  const response = await fetcher(`https://api.stripe.com/v1/${path}`, { ...options, headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, ...(options.headers || {}) } });
  if (!response.ok) throw new ApiError(502, 'PAYMENT_PROVIDER_ERROR', 'The payment provider could not complete this request.');
  return response.json();
}

export function checkoutForm({ orderId, email, priceId, specHash, successUrl, cancelUrl, automaticTax }) {
  const form = new URLSearchParams();
  const fields = {
    mode: 'payment', client_reference_id: orderId, customer_email: email,
    'line_items[0][price]': priceId, 'line_items[0][quantity]': '1',
    'metadata[order_id]': orderId, 'metadata[spec_hash]': specHash,
    success_url: successUrl, cancel_url: cancelUrl,
    'billing_address_collection': 'required',
    'automatic_tax[enabled]': automaticTax ? 'true' : 'false',
  };
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

export function validatePaidSession(session, order, price) {
  if (!session || session.id !== order.stripe_checkout_session_id || session.client_reference_id !== order.id || session.metadata?.order_id !== order.id || session.metadata?.spec_hash !== order.purchase_spec_sha256) return false;
  if (session.payment_status !== 'paid' || session.currency?.toLowerCase() !== 'usd') return false;
  if (session.amount_subtotal !== price.unit_amount || !Number.isInteger(session.amount_total) || session.amount_total < session.amount_subtotal) return false;
  return true;
}
