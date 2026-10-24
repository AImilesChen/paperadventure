// This is a request to start supplying the purchase, never a statutory-rights waiver.
export const purchaseConsentVersion = 'immediate-supply-2026-10-24-v1';
export function purchaseNotice(kind) {
  return kind === 'custom'
    ? 'I request my personal plan to start after payment. Once a plan has been generated, a change of mind is not covered by an unconditional voluntary full refund. I can review the plan before approving PDF creation. My mandatory consumer rights remain unchanged.'
    : 'I request access to the digital game files after payment. After normal delivery, a change of mind is not covered by an unconditional voluntary full refund. My rights for missing, defective or incorrectly charged purchases remain unchanged.';
}
export function validPurchaseConsent(value) {
  return value?.version === purchaseConsentVersion && value?.requested === true;
}
export function purchaseConsentSnapshot(kind) {
  return { version: purchaseConsentVersion, requested: true, kind, notice: purchaseNotice(kind), statutoryRightsWaived: false };
}
