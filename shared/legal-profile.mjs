// Public policy configuration only. Never add keys, IDs, banking or ID documents.
// Owner-confirmed public name/location on 2026-10-24; no correspondence address supplied.
export const legalProfile = Object.freeze({
  brand: 'Paper Adventure',
  operatorType: 'individual',
  operatorName: 'mielschen',
  contactAddress: '',
  operatorCountry: 'Mainland China',
  supportEmail: 'support@paperadventure.app',
  audience: 'worldwide',
  version: '2026-10-24-v2',
  effectiveAt: '',
  ownerApproved: false,
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
