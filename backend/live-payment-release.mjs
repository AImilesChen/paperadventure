import {verifyFixedPrice,stripeKeyMode} from './payments.mjs';
export const livePrices=Object.freeze([
  {
    "id": "stripe-live-custom-home-20261025",
    "sku": "custom_home",
    "currency": "USD",
    "unit_amount": 1499,
    "stripe_price_id": "price_1UU6DgQ0VSMjAbvO0lToj2a6"
  },
  {
    "id": "stripe-live-custom-classroom-20261025",
    "sku": "custom_classroom",
    "currency": "USD",
    "unit_amount": 1999,
    "stripe_price_id": "price_1UU6GBQ0VSMjAbvO9EASFvke"
  },
  {
    "id": "stripe-live-ready-home-20261025",
    "sku": "ready_home",
    "currency": "USD",
    "unit_amount": 999,
    "stripe_price_id": "price_1UU6GoQ0VSMjAbvOJuv6dmDK"
  },
  {
    "id": "stripe-live-ready-classroom-20261025",
    "sku": "ready_classroom",
    "currency": "USD",
    "unit_amount": 1499,
    "stripe_price_id": "price_1UU6IKQ0VSMjAbvOlH4jM3p3"
  }
]);

// Operator-controlled, one-shot read-only Stripe checks. No purchases or AI calls.
export async function runLivePricePreflight(env) {
  const id=env.PAYMENT_RELEASE_PREFLIGHT;
  if(!id||id==='off')return false;
  if(!/^[a-z0-9-]{8,80}$/.test(id))throw Error('Invalid release reference');
  if(await env.DB.prepare('SELECT id FROM audit_events WHERE id = ?').bind(id).first())return true;
  let action='live_prices_verified',target='four-skus';
  try {
    if(stripeKeyMode(env.STRIPE_LIVE_SECRET_KEY)!=='live'){action='live_key_missing';throw Error();}
    if(!env.STRIPE_LIVE_WEBHOOK_SECRET?.startsWith('whsec_')){action='live_signing_missing';throw Error();}
    for(const price of livePrices){target=price.sku;await verifyFixedPrice({STRIPE_SECRET_KEY:env.STRIPE_LIVE_SECRET_KEY},price,env.FETCH||fetch);}
    target='four-skus';
  }catch(error){if(action==='live_prices_verified')action=error.providerStatus===403?'live_price_permission_denied':error.providerStatus===401?'live_key_rejected':error.code==='OFFER_NOT_READY'?'live_price_mismatch':'live_price_access_failed';}
  await env.DB.prepare('INSERT OR IGNORE INTO audit_events(id,actor_type,actor_ref,action,target_type,target_id) VALUES(?,?,?,?,?,?)')
    .bind(id,'operator','live-release',action,'payment_configuration',target).run();
  return true;
}
