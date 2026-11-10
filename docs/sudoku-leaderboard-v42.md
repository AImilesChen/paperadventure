# Sudoku leaderboard layout and public content — v42

Local only. Canonical source: `tmp/sudoku-leaderboard-v42`, extending the unpublished v41 speed implementation. Preview remains http://127.0.0.1:5635/en/sudoku/leaderboard/?mode=speed&level=1 with an isolated local API on 5638. The original v41 source and database remain preserved. Production remains v40/PR173; no publishing or remote migration occurred.

## Delivered behavior

Both leaderboard modes now use the same public-board/personal-card layout and a compact common introduction. The speed view shows collection/level navigation, real participant count, fastest valid time, and level/chapter/technique context. The personal card shows the selected level's best time, own rank including beyond the top 50, public/private status, play/unlock action, and profile management in either mode. Profile save/cancel and existing opt-in rules remain functional. Switching modes retains the selected speed level.

Empty boards explain how to set the first record. Real populated tables distinguish ties and the current player; examples are never inserted into public production scores. Refresh failures use a readable message instead of a JSON parse exception. Existing 30-second polling, focus refresh, pause/offline timing rules and review controls remain in place. No scoring, puzzle, wallet, backend or database-schema change was made in v42. The legacy in-game tutorial copy was corrected to match the already-approved hint eligibility rule.

Shared static content follows the interactive board: comparison of the two ranking methods, three steps to join, three practical solving habits with a clearly separate row example, eight FAQs, and relevant game/levels/rules/techniques/account links. These sections render before private progress loads and remain available during a connection failure. Native FAQ disclosures, visible focus states, semantic tables and labeled native selectors are retained. Gold, blue, green and purple distinguish ranking, timing, progress and learning.

## Technical SEO

The production leaderboard base route is now indexable in the shared page manifest. Initial HTML includes the public content, one H1, accurate title/description and the existing site/organization metadata. The public worker permits indexing on the canonical host; preview aliases retain the noindex response header. Parameter variants use the base leaderboard canonical, and only the base URL is added to the sitemap. Sitemap count is now 47; route count remains 75. Personal data continues to load through existing no-store APIs and is absent from pre-rendered HTML.

This is a local implementation and verification result, not a claim of live indexing, increased impressions or rankings. GSC, Bing and analytics settings were not modified or submitted in this task. Gameplay remains noindex, and weekly pages remain retired.

## Verification

- Production build, 75 routes, 47 sitemap URLs and bootstrap hydration verification passed.
- 241 static/function regression tests passed, including speed validity tests and two public leaderboard content/indexing checks. Sites worker: 4 passed. Release readiness: 13 passed. The backend implementation is byte-identical to v41 and was not changed in this task.
- Local browser: guest/empty state, profile save and cancel inside speed view, collection 3/level 201 locked state, two-mode switching with selection retention, populated tables, same-second ties, own rank, public/private profile messaging, FAQ expansion, ranking-rules anchor, network failure and recovery all checked.
- Populated layout checks used explicitly synthetic local QA fixtures (including tied 65-second records and an 85-second own record), not genuine gameplay evidence or production data. Preserved separately in `tmp/qa/layout-fixtures.sqlite` and removed from the delivered database.
- 390px and 320px iframe layouts were checked with actual usable widths 375px and 305px after desktop scrollbars. Both document scroll widths equal their client widths. A pre-existing global body minimum width required a leaderboard-scoped override. Narrow filters, locked-level messaging, table wrapping and FAQ expansion were checked. No application console errors were observed.
- Site Wrangler dry-run bundle passed. No remote deployment was performed. The temporary responsive harness was removed from the delivered asset directory.
- The delivered database was restored from the original v41 logical snapshot after browser QA: all columns of both original account rows match exactly, and no synthetic speed attempts remain.

Screenshots are under `tmp/qa`: `desktop-final.png`, `content-final.png`, `content-faq-desktop.png`, and responsive QA captures. Full-page capture is unavailable in this browser; accepted normal viewport captures were inspected.

## Future release

This frontend includes the still-unpublished v41 speed API feature. A future user-authorized publication must deploy both together using the prepared additive 0050 migration/API capability gate, then verify the actual public HTML, response indexing directives, canonical/sitemap/assets, sign-in and profile behavior. Do not deploy only the frontend against the current v40 API. Preserve current bank and all player records when rolling back; keep previews non-indexable.
