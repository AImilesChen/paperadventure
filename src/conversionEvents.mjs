// Public funnel actions only. Values come from catalog/UI enums, never user text.
export const conversionGoalNames = Object.freeze([
  'home_sample_click', 'sample_download_success',
  'sample_browse_themes', 'product_checkout_click',
]);

export function conversionProperties(name, properties = {}) {
  if (!conversionGoalNames.includes(name)) return null;
  const setting = ['home', 'classroom'].includes(properties.setting) ? properties.setting : null;
  if (!setting) return null;
  if (name === 'sample_download_success') {
    if (!['A4', 'Letter'].includes(properties.paper)) return null;
    return { setting, paper: properties.paper };
  }
  // Theme identity is derived from the public catalog route, never arbitrary text.
  if (name === 'product_checkout_click') {
    if (!['dinosaur','space','forest','halloween','christmas','ocean','museum','library','weather','workshop'].includes(properties.theme)) return null;
    return { setting, theme: properties.theme };
  }
  return { setting };
}
