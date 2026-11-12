# Admin traffic v59 — Cloudflare real data, local only

Based on LIVE v58 (PR191 merge 70f694afabce06124a99004a9b12a825ac71e51e). Canonical source: tmp/admin-traffic-v59. Preview: http://127.0.0.1:5671/admin/analytics/?days=7 . No publication was requested or performed. Pending refund v54 is excluded.

## Completed connection

User explicitly approved continuing with Cloudflare read-only access. Created account-owned token paperadventure-analytics-read, Account Analytics Read only, account 77bc392d46985cd3425691358f5e8a77, expiring 2027-11-12. Token metadata ID dc752d0df33203677c1d2df87c07051c. Credential is saved only in ignored local tmp/qa/.cf-analytics-token; never commit, return, log or deploy this file. Production Worker secret is NOT configured yet. Server environment name: CF_ANALYTICS_API_TOKEN.

Cloudflare Web Analytics was already enabled by automatic injection. Its absence from the checked main bundle was not evidence that it was disabled. The report queries only paperadventure.app, siteTag 5af3291a59604376a2e07b572175a6e3, account above, bot:0. No new collection script or consent/policy changes.

## Data contract and UI

Private /admin/analytics/ and GET /api/v1/admin/analytics reuse existing designated verified Google admin authorization. Fixed official GraphQL endpoint https://api.cloudflare.com/client/v4/graphql . One request uses six rumPageloadEventsAdaptiveGroups aliases: summary, daily trend, countries, sources, pages and devices. All aliases have fixed account/site/host/bot filters. Only aggregate data is returned; private page paths are masked and query strings are excluded.

Today and inclusive last 7/30 days use UTC boundaries. range=24h with days=1 provides a rolling 24-hour range. Unsupported parameters return 400. Two main metrics are visits and pageviews; visits are NOT unique people. Country/source/device top ten sort by visits, pages by pageviews. Daily chart includes a data table. Sampled results have a badge. Empty valid reports show zero; missing configuration, denied access, malformed responses and network failures never become invented zero traffic. Partial GraphQL errors preserve other valid sections. No raw provider errors or credentials are exposed.

Adapter has a 12-second timeout, rejects redirects, validates counts, deduplicates concurrent requests, caches successful ranges for 60 seconds and failures for 10 seconds (four ranges). Frontend refreshes every 60 seconds only while visible. Missing/error states use short status and em dashes. Page has no setup walls, platform directory, fake UV or demo selector. Footer dates and update timestamps are UTC. Existing collectors and public/private collection exclusions are unchanged.

## Real validation — 2026-11-12 UTC

Authenticated official CF API returned all six sections ready for all four date ranges. Observed around 14:21–14:32 UTC: today 6 visits/10 pageviews; rolling 24 hours 6/10; last seven days 98/120; last thirty days 430/540 with sampling. Counts can change as time passes. Aggregate evidence: tmp/qa/cf-real-days-1.json, cf-real-days-7.json, cf-real-days-30.json, cf-real-days-1-range-24h.json and cf-live-probe.json. Schema introspection is saved in cf-rum-schema.json and cf-schema-names.json. These contain no API credential.

Build passed: 87 HTML routes, 52 sitemap URLs, hydration parity. Final build log: tmp/qa/build-cloudflare-final.log. Twenty-two admin/CF adapter tests passed, plus 42 existing analytics/static/routes tests. Built artifacts were scanned and contain no API credential. Browser checked actual CF data at 1280x800 and 390x844, date switches, sampled badge, refresh and no document horizontal overflow. Viewport restored. Actual-data screenshot: tmp/qa/cloudflare-real-desktop.jpg. Earlier traffic-desktop-demo.jpg is obsolete and must not be presented as real traffic.

Local server uses tmp/qa/serve-admin-traffic.mjs, loopback port 5671, and a local admin-session fixture solely to preview the actual authenticated adapter response. Helper, fixture auth, credential, SQLite and all tmp/qa material must NEVER ship. Production handler retains its real authorization. Local server session 92424.

## Future authorized publication

Before deploying the reviewed API and frontend, safely set existing token as API Worker secret CF_ANALYTICS_API_TOKEN using existing deployment authorization. Do not expand analytics token privileges. Then publish only the eight reviewed source deltas over latest LIVE, keeping unrelated work and pending refund v54 out. No migration is required. Validate production admin authorization and real CF reports afterward. Current LIVE remains frontend v58 / API v57; no production database, payment, ranking or player-data changes.

## Superseded GA4 attempt — retained for safe continuity

The earlier GA4 adapter/configuration instructions are superseded; GA4 is not the new report's backend. Existing GA4/Clarity/Ahrefs/old Plausible tracking remains unchanged. Owner reports the old Plausible service unavailable; this CF report does not depend on it. No GSC/Bing access or search-ranking improvement is claimed.

Earlier user-approved GCP service account paperadventure-ga4-reader@paperadventure.iam.gserviceaccount.com (unique ID 106756389524520271500, project paperadventure) exists with no project roles and no GA4 property Viewer grant. JSON key creation/download outcome remains UNKNOWN after browser timeout. No known downloaded private key was read or configured. Inspect actual key list before any future retry; do not continue GA4 work under this CF request. GA4 UI property557907157/account395554176 was read previously; those UI values are separate from CF visits.

Official references: https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/ ; https://developers.cloudflare.com/web-analytics/data-metrics/high-level-metrics/ ; https://developers.cloudflare.com/web-analytics/faq/ .

## Release runtime correction

PR192 initially deployed but the authenticated production report returned upstream errors. Official Workers Request documentation confirms redirect:error is unsupported and throws before the provider call. Replaced it with redirect:manual; existing non-2xx rejection refuses every redirect without forwarding the credential. Added redirect refusal regression coverage; 23 focused tests pass. This is a Workers runtime difference missed by Node-only checks. Production verification must be repeated after the correction.
