// Public policy configuration only. Never add keys, IDs, banking or ID documents.
// Owner-confirmed public name/location on 2026-10-24; public correspondence address supplied by the owner.
export const legalProfile = Object.freeze({
  brand: 'Paper Adventure',
  operatorType: 'individual',
  operatorName: 'mileschen',
  contactAddress: 'No. 46 Jinqing Avenue, Luqiao District, Taizhou, Zhejiang, China',
  operatorCountry: 'Mainland China',
  supportEmail: 'support@paperadventure.app',
  audience: 'worldwide',
  version: '2026-10-26-v8',
  effectiveAt: '2026-10-26',
  ownerApproved: true,
});

export function policyReleaseProblems(profile = legalProfile) {
  const problems = [];
  for (const key of ['operatorName', 'contactAddress', 'operatorCountry']) {
    if (typeof profile[key] !== 'string' || !profile[key].trim()) problems.push(key);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.supportEmail || '')) problems.push('supportEmail');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.effectiveAt || '') ||
      !Number.isFinite(Date.parse(profile.effectiveAt)) || new Date(profile.effectiveAt).toISOString().slice(0, 10) !== profile.effectiveAt) problems.push('effectiveAt');
  if (profile.ownerApproved !== true) problems.push('ownerApproved');
  return problems;
}
