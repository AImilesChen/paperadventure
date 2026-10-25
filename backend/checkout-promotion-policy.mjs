// One owner-authorized live payment check; this does not alter catalogue prices.
export const ownerPromotion=Object.freeze({id:'owner-live-check-20261025',couponId:'paw-owner-live-check-899-20261025',sku:'ready_home',subtotal:999,discount:899,total:100,currency:'USD',expiresAt:1793491200});
export function validPromotionSnapshot(spec,order,price){
 const p=spec?.promotion,c=ownerPromotion;
 return spec?.checkoutPricing==='fixed_discount_v1'&&order.sku===c.sku&&order.product_kind==='ready'&&order.amount_total===c.total&&price.unit_amount===c.subtotal&&
  p&&['id','couponId','subtotal','discount','total','currency'].every(k=>p[k]===c[k])&&spec.paymentMode==='live';
}
