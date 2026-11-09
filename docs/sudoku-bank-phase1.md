# Sudoku question bank: phase 1

Scope: local implementation based on released v39. No production deployment or remote database change is part of this task. Single-level speed rankings and leaderboard SEO redesign remain later work.

## Source and data contract

- `backend/sudoku/puzzles.json` is the append-only published campaign. Existing puzzle IDs, givens and solutions stay stable. The first 100 entries are locked by SHA-256 in `bank-policy.json`; each subsequent release records the hash of its full published prefix in `bank-stock.json`.
- `bank-stock.json` holds validated private reserve, the deterministic generator seed, UTC release week and release history. It is not imported into the API or browser bundle.
- A generation batch first saves `bank-candidates.json`, a private recovery checkpoint tied to the exact published bank, reserve and policy hash. A matching interrupted local run can resume it. Hosted runner failures retain this checkpoint as a seven-day Actions artifact; a fresh runner otherwise restarts from the last committed stock. Stale checkpoints are not reused.
- `shared/sudoku/catalog.mjs` is derived public metadata with no givens or solutions. Its version, total, collection/chapter sizes and stable per-puzzle versions are shared by SSR, API and gameplay.
- `GET /api/v1/sudoku/catalog` reads this catalogue without creating an account or issuing a cookie. Account progress includes the current catalogue, while action responses contain its small summary. An already-open game refreshes catalogue metadata when the API reports a new version.
- The stored account schema is unchanged. Original boards, wallet, purchased hints, completion history and retired weekly records remain. Progress responses return only the current board, rather than growing with every archived session; archives remain on the server and load when selected.

## Generation and release policy

Initial publication target: 300 levels, with 100 validated reserve puzzles. Defaults live in `bank-policy.json`: daily check, refill below 50 to a target of 100, at most 50 accepted puzzles per generation batch, and append 20 levels once per UTC week. A delayed Monday run can publish later in the same week; missed weeks do not create a catch-up burst. It is a continuous campaign, not a separate weekly game.

The generator changes clue patterns and occasionally starts a fresh grid. A candidate must have one independently verified solution, a complete supported logical trace, correct candidate eliminations, and usable next-step hints at its placement states. Digit relabelling, rotations, reflections and repeated clue masks and equivalent complete solution boards are rejected against both published and reserve stock. The initial hundred introduce four techniques. Extensions consolidate candidate pairs, with a weighted logical-work score at least that of the old final puzzle; published extension grades are ordered. A later puzzle is not promised to take longer for every player. New techniques require a separate engine, grading and hint implementation before being advertised.

All validation precedes publication writes. Shortage or any validation error retains the published bank and fails the job. A local exclusive lock prevents overlapping writers. Hosted maintenance is serialized; a rejected fast-forward Git push stops rather than overwriting another release. The verified artifacts are committed together. The matching immutable API bundle deploys first, then the site waits for its exact catalogue version. Failed site deployment leaves the existing site usable with the newer append-only API. A later maintenance run compares both live API metadata and the server-rendered site catalogue marker, retrying a committed but incompletely deployed release. Each bank version gets a fresh offline-shell cache.

Commands:

```sh
npm run sudoku:bank -- --bootstrap  # first expansion only; frozen original prefix
npm run sudoku:bank:plan           # inspect without generation or publication
npm run sudoku:bank                # refill/release only if due
npm run sudoku:bank:verify         # independent stock + derived-artifact checks
```

## Player-facing changes

Puzzle collections contain up to 100 levels, chapters up to 10. The current collection and chapter open by default. The collection selector supports future additions without an ever-longer list. Inspecting a later collection does not unlock it. All counters, maximum levels, terminal messages, continuation and ranking progress use the published catalogue.

The public leaderboard ranks total verified first clears only. In-site hints and point usage do not reduce the score. Equal totals share a rank, including players above level 100. The old `mode=independent` endpoint returns HTTP 410 with an explanatory message; the UI, navigation and public copy no longer promote it. Historical assistance fields remain internal for compatibility, without rewriting records. Replays remain reward-free.

## Activation and recovery

The repository's local remote HEAD points to `main`, whereas releases use `frontend-prd-v13-2026-10-08`. GitHub only schedules workflows on the default branch. At publication, install `sudoku-bank-maintenance.yml` on the actual default branch and the implementation plus callable API/site workflows on the release branch. The scheduler explicitly calls release-branch workflow definitions with the exact generated commit, rather than deploying `main`.

After the initial API and site release is verified, install the maintenance workflow on the default branch to enable it. Its installation push also runs one real maintenance check against the released bank; the already-recorded UTC week prevents a duplicate batch. The optional repository variable `SUDOKU_BANK_AUTOMATION=disabled` pauses future scheduled checks. Confirm the existing Actions token may commit generated artifacts to the release branch; do not bypass branch protections or introduce new credentials implicitly. Verify the installation-triggered maintenance run, the registered daily UTC schedule and its next execution. Manual dispatch defaults to `dry_run=true`. **None of this remote activation has been performed or claimed by the local implementation.** GitHub scheduling is best-effort; check failure notifications and stock if a run fails or is delayed.

Normal rollback keeps every published puzzle and every account record. `check-sudoku-bank-upgrade.mjs` blocks an API deployment that reduces the published count or changes an existing public puzzle version. Roll back interface/code with the newest bank retained; do not restore the whole player database or remove already-cleared levels. No database migration is needed for this phase.
