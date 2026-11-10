# Ranking order, icons and leaderboard layout — v44

Completed locally on 2026-11-10. Canonical source: `tmp/sudoku-ranking-v44`, extending unpublished v43. Preview http://127.0.0.1:5641/en/sudoku/leaderboard/ ; local API http://127.0.0.1:5642 . Production remains v42 / PR176 (`8ebfeea3937efbe2678b11bfd049fe08a4f263ef`). No deployment or remote database operation was performed.

## Ranking contract

The total-clears board now gives every eligible public player a unique consecutive position:

1. More first-cleared levels first.
2. At equal clear counts, complete first-clear timing precedes incomplete timing, then the smaller sum of first-clear elapsed milliseconds wins.
3. At identical sums, the earlier time of reaching the cleared-level count wins. The maximum first-clear timestamp represents that attainment time. An internal stable owner key is the final deterministic fallback for exact timestamp equality; it is not exposed in public rows.

Only immutable first-clear snapshots contribute to cumulative time. A faster replay can improve the separate speed board but cannot overwrite total-board time or earn extra first-clear rewards. Server-recorded positive historical elapsed times are retained. Missing, zero, negative or unapproved timing is incomplete, never zero seconds; cleared-level credit stays intact. Times are displayed in hours:minutes:seconds, with fractional milliseconds when present.

New first-clear snapshots retain the timing attempt ID/status. Ranking reads consult audited speed records, so approval or withdrawal affects timing eligibility even after a replay has replaced the active session. Older snapshots without an ID can match the original attempt by owner/imported owner, level and finish timestamp. Personal timing applies the same review status. No new schema projection or migration is needed. Guest/account duplicate clears keep the chronologically earliest snapshot, not the fastest one, while preserving conservative assistance history.

Hints and points do not penalize ranking. Pauses/time away remain in measured elapsed time. Public sharing remains optional and off unless explicitly chosen. The speed board's existing equal-whole-second shared ranks are unchanged: the new unique-position rule is for the total-clears board requested by the user.

## Interface

- Replaced repeated trophy decorations with a shared duotone icon component: numerical podium for totals, timer for speed, nine-cell grid for personal progress, medals for the top three. Existing Phosphor vector assets are used; no generated illustrations or raster assets.
- Removed the large empty-state trophy. Main/secondary columns retain hierarchy and stretch to the same top/bottom boundaries. Empty and populated cards are allowed to require vertical page scrolling at shorter heights; no claim that every state fits one viewport.
- Both boards show up to 50 public players in a bounded, manually scrollable region with sticky table headers and a keyboard focus outline. No auto-scrolling ticker.
- An independent personal-result row below the list remains visible while browsing the list, including ranks outside 50. Personal cards also explicitly state when the rank is outside the displayed list.
- Added total first-clear time to the total board and personal card. Incomplete timing is explained without deleting historical clears. Updated ranking FAQ, game explanations, rules and level-page copy to agree with the new total ordering.
- Refreshing total results keeps the current list instead of unmounting it. The checked scroll offset remained 287 before/after a manual refresh. Switching to speed without a previous level preserves the actual next playable level in the URL. Cached personal data is scoped to the current account key.

## Verification

- Build/hydration/bootstrap parity: 75 prerendered routes and 47 sitemap URLs passed. Existing large-chunk warning remains.
- Static/function suite: 249 passed. Backend suite: 431 passed. Sites worker: 4 passed. Readiness: 13 passed.
- API and site Wrangler dry-run bundles passed; no upload/deployment.
- Meaningful tests cover total-time ordering, exact ties/stable positions, personal rank beyond 50, hidden/guest exclusion, missing/zero/negative/pending timings, review approval/withdrawal, unchanged first-clear snapshots after faster replays, guest merge chronology, hint/reward behavior, and trigger-inclusive D1 compare-and-swap acceptance.
- Actual local UI: isolated 56-player fixture, 50 visible records, own position #56 in both locations, manual keyboard list scrolling/sticky header, preserved refresh scroll position, speed switch/level context, desktop aligned card boundaries, 390/320 viewport reflow and no horizontal page/list overflow. Final production-build browser log query contained no error entries.
- Final icon changed from a plain chart to a numerical podium after the full suite; the final build/hydration and site bundle were rerun successfully. No claim of independent aesthetic user testing or live Google OAuth.

Evidence is in `tmp-v44-*.log` and `tmp/qa/`: `filled-final.png` is explicitly synthetic QA data; `leaderboard-final.png` and `empty-phone-final.png` show the cleaned preview. Earlier screenshots are exploratory. Synthetic data is backed up separately in `isolated-ranking-fixtures.sqlite`, never part of deployment.

After all QA polling tabs were closed, SQLite backup restored the original v43 local database. All rows in all three application tables compare exactly: 2 original accounts, 0 speed attempts, 0 speed reviews. Wallets, progress and profile data are preserved. v43 and live v42 sources/databases were not modified.

## Release handoff

A future user-authorized publication must include all changes against live v42, including the unpublished v43 participation/analytics changes. Deploy the API ranking change before the frontend. There is no migration; preserve current published bank/player data and the v42 `meta.changes > 0` fix. Rollback should revert code only, retaining completions and timing metadata. Do not deploy QA SQLite files or the dirty root tree.

Public canonical/indexability and sitemap coverage remain as tested in the build. No new search-console or analytics-platform receipt verification was attempted in this turn; the v43 external verification limitations still apply.
