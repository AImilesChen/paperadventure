import { themes, offers, productRights } from './catalog.mjs';

const statuses = new Set(['published', 'test_ready', 'downloadable_trial', 'not_published', 'not_offered']);
// Only public merchandising fields enter the HTML. Never serialize an API
// response wholesale: account, operational and future fields stay outside it.
export function publicRelease(health, catalog) {
  if (health?.status !== 'configured_runtime' || !['live', 'test', 'disabled'].includes(health.checkoutMode) || !Array.isArray(catalog?.themes) || !Array.isArray(catalog?.offers)) throw new Error('Invalid public release');
  const cleanOffers = offers.map(base => {
    const item = catalog.offers.find(value => value.sku === base.sku);
    if (!item || item.currency !== 'USD' || !Number.isSafeInteger(item.unitAmount) || item.unitAmount < 0 || typeof item.saleEnabled !== 'boolean') throw new Error(`Invalid public offer: ${base.sku}`);
    return { ...base, currency: 'USD', unitAmount: item.unitAmount, saleEnabled: item.saleEnabled };
  });
  const cleanThemes = themes.map(base => {
    const item = catalog.themes.find(value => value.id === base.id);
    const result = { ...base };
    for (const setting of ['home', 'classroom']) {
      const pack = item?.[setting];
      if (!pack || !statuses.has(pack.readyStatus) || typeof pack.freeSample !== 'boolean') throw new Error(`Invalid public edition: ${base.id}/${setting}`);
      result[setting] = { readyStatus: pack.readyStatus, freeSample: pack.freeSample };
    }
    return result;
  });
  return {
    runtime: { status: 'configured_runtime', sample: health.sample === true, checkout: health.checkout === true, checkoutMode: health.checkoutMode },
    catalog: { themes: cleanThemes, offers: cleanOffers, freeSampleThemeId: catalog.freeSampleThemeId === 'celebration' ? 'celebration' : null, productRights },
  };
}

export function readPublicRelease(document = globalThis.document) {
  const source = document?.getElementById('public-release-data');
  if (!source) return null;
  try { const data = JSON.parse(source.textContent); return publicRelease(data.runtime, data.catalog); }
  catch { return null; }
}

export function publicReleaseData(release) {
  return { runtime: release.runtime, catalog: { freeSampleThemeId: release.catalog.freeSampleThemeId, offers: release.catalog.offers, themes: release.catalog.themes.map(theme => ({ id: theme.id, home: theme.home, classroom: theme.classroom })) } };
}

export const htmlJson = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
