import {verifyApprovedCreditPrices} from '../credits/verify-prices.mjs';
import {pointsProducts} from '../../shared/credits/products.mjs';
import {paymentEnvironment,stripeKeyMode} from '../payments.mjs';
export async function pointsPriceEnvironment(rawEnv){
 await verifyApprovedCreditPrices(rawEnv);
 const env={...paymentEnvironment(rawEnv)},mode=stripeKeyMode(env.STRIPE_SECRET_KEY);if(!mode||!env.DB)return env;
 try{for(const p of pointsProducts){if(env[p.priceEnv])continue;const row=await env.DB.prepare('SELECT * FROM sudoku_point_products WHERE mode=? AND sku=?').bind(mode,p.sku).first();if(row&&row.amount===p.unitAmount&&row.points===p.points&&row.currency===p.currency)env[p.priceEnv]=row.price_id;}}catch{}
 return env;
}
// The owner chose manual Stripe product creation. Retired v49 provisioning flags
// must never create products under the new site-wide credit SKUs.
export async function runPointsProductSetup(){return {skipped:true,reason:'manual-product-creation'};}
