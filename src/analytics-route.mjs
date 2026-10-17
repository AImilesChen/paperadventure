import { pageFor } from '../shared/page-manifest.mjs';

// Third-party analytics belongs only on public editorial pages. Planning,
// checkout, account, order, and support flows may contain private details.
const privatePage = /^\/en\/(?:create|checkout|orders|my-adventures|account)(?:\/|$)|^\/en\/help\/(?:recover|report)(?:\/|$)/;

export function isAnalyticsPage(pathname) {
  return Boolean(pageFor(pathname)) && !privatePage.test(pathname);
}

export function crossesAnalyticsBoundary(from, to) {
  return isAnalyticsPage(from) !== isAnalyticsPage(to);
}
