# Sudoku participation and public content — v43

Status: completed locally, 2026-11-10. Not deployed. Production remains v42 / PR176, merge `8ebfeea3937efbe2678b11bfd049fe08a4f263ef`.

Canonical source: `tmp/sudoku-participation-v43`. Preview: http://127.0.0.1:5639/en/sudoku/leaderboard/ ; local API: http://127.0.0.1:5640 . Use this snapshot for the next release, not the dirty root source. Preserve the current bank and player database when releasing or rolling back.

## Delivered behavior

- A compact introduction replaces duplicate promotional headings and the duplicate campaign status strip. The leaderboard remains the primary left column; personal progress, points and sharing controls occupy the right column. Phones receive an early summary and play action.
- All-clears and single-level speed keep their existing scoring rules. The all-clears participant count now counts all eligible public players, independently of the top-50 table limit. No weekly or hint-free board is introduced.
- Guest, guest-with-result, private, public, pending-review and locked-level states provide contextual next actions. A private best time leads directly to the public profile editor. Sharing stays unchecked unless the player explicitly chooses it.
- Sign-in return URLs retain the selected board and speed level, then focus the profile editor. Return context is bounded by the published catalog and restricted to local ranking routes.
- A compact verified-result strip links to the same-level speed board, or all clears for legacy untimed results. Guest players can retain the result through sign-in. Existing automatic next-level play still advances after five seconds unless stopped.
- Eight existing FAQs are grouped into joining/results, timing/replays and hints/privacy. Participation instructions and solving examples remain prerendered. The existing techniques page now contains an anchored practical speed-learning section. No extra thin SEO routes are created.
- The account summary uses the published puzzle count rather than a fixed 100. Points, hints, rewards, unlocks, timing validation and opt-in privacy retain their existing meaning.

## Measurement and SEO boundaries

Only the four public Sudoku routes (leaderboard, levels, how-to-play, techniques) enter the analytics allowlist. Gameplay and account pages remain excluded. Public Sudoku uses Plausible subject to existing opt-out, and GA4 only after explicit consent; no Clarity or Ahrefs is loaded on those routes. Full navigation across the public/private analytics boundary unloads existing recorder scripts.

Custom events are limited to board switch, play, sign-in and learning-link clicks, with finite mode/destination enums. No nickname, wallet balance, puzzle answers, form fields, or raw return URL is attached. Unknown query data and private referrers suppress measurement. This intentionally does not promise a complete authenticated registration funnel.

Canonical/base URL, prerendering, robots boundaries and the 47-URL sitemap were verified in the build. No sitemap submission or index request was made. Search Console's authenticated domain overview for paperadventure.app was accessible, but sitemap/detail reading repeatedly timed out; current crawl/index status is unverified. Bing backend and GA4/Plausible platform receipt are unverified. Code/consent tests do not establish search exposure or live analytics receipt.

## Validation

- Build: 75 prerendered routes, 47 sitemap URLs, public bootstrap and hydration parity passed.
- Static/function suite: 245 passed; backend: 431 passed; Sites worker: 4 passed; readiness: 13 passed.
- API and site Wrangler dry-run bundles passed. The existing large JavaScript chunk warning remains; no new bundle-size optimization is claimed.
- Actual local browser checks: desktop first screen, 390/320 narrow layouts without horizontal overflow, FAQ keyboard expansion, technique anchor navigation, profile publish/hide, mode/level persistence and locked level 201.
- Local sign-in callback retained speed level 201 and focused the nickname field without checking sharing. Guest result import retained a synthetic private 85-second personal best. Real Google OAuth was not exercised.
- One-cell-remaining fixtures verified completion/result actions and automatic continuation from level 2 to level 3. These are focused integration checks, not a full human puzzle solve or independently measured difficulty study.
- Final local browser console contained no error entries. Production gameplay, search crawling and analytics platform receipt were not tested by this local release.

Evidence: `tmp-v43-*.log`, `tmp/qa/leaderboard-final.png`, `tmp/qa/mobile-final.png`, `tmp/qa/completion-final.png`. Other earlier screenshots are exploratory evidence, not the final layout. Synthetic QA database is retained separately as `tmp/qa/layout-fixtures.sqlite`, excluded from the release.

## Local data and release

After closing QA polling tabs, the local database was restored with SQLite backup from the preserved v42 local database. Full original account rows, including wallets/progress/profile, were compared exactly; two original accounts remain and zero speed attempts remain. The synthetic fixture backup must never be deployed.

The local server's health/catalog additions only support the existing local account callback, with checkout disabled. They do not modify production authentication. v43 adds no migration. A future publication must include the small API participant-count change as well as frontend assets. Existing v42 D1 trigger-inclusive compare-and-swap behavior (`meta.changes > 0`) must remain intact. No remote database, bank schedule, deployment or production score was changed.
