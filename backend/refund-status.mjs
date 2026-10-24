import {ApiError} from './domain.mjs';
// A full charge-refunded flag alone can include pending refunds. Revoke only
// when a complete, payment-bound refund list confirms enough succeeded refunds.
export function succeededRefundAmount(list,charge) {
 if(!list || list.has_more!==false || !Array.isArray(list.data))throw new ApiError(503,'REFUND_STATUS_UNAVAILABLE','Complete refund status requires review.');
 let total=0;const ids=new Set();
 for(const refund of list.data){
  if(!refund.id||ids.has(refund.id)||!['pending','requires_action','succeeded','failed','canceled'].includes(refund.status)||!Number.isSafeInteger(refund.amount)||refund.amount<=0||refund.currency!==charge.currency||refund.payment_intent&&refund.payment_intent!==charge.payment_intent||refund.charge&&refund.charge!==charge.id)throw new ApiError(409,'REFUND_MISMATCH','Refund details do not match the payment.');
  ids.add(refund.id);if(refund.status==='succeeded')total+=refund.amount;
 }
 if(total>charge.amount)throw new ApiError(409,'REFUND_MISMATCH','Refund amounts exceed the payment.');
 return total;
}
