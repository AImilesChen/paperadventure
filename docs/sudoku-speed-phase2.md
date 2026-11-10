# Sudoku phase 2 — server timing and single-level speed leaderboard

Status: local development complete, not deployed. Preview: http://127.0.0.1:5635/en/sudoku/leaderboard/?mode=speed&level=1 . Local API: port 5636. Canonical implementation: `tmp/sudoku-speed-v41`, based on the released v40 source. Production remains v40.

## Player rules

- This is the existing campaign, not another challenge or duplicate puzzle library. The total-clears leaderboard remains available.
- A new puzzle first presents a ready screen without its givens. Start creates a server-timed attempt before returning the puzzle. Auto-continue starts the next timed attempt immediately.
- Refresh resumes the same attempt. Pausing, leaving the page and going offline do not stop the clock. The server receives and verifies the completed board before recording the finish time. Connection delay is included; the browser does not submit a trusted duration.
- Replays create new attempts. The best valid time for the exact level, puzzle version and `speed-v1` rules counts. Replays do not grant another first-clear reward.
- Thinking hints and points have no time penalty or eligibility penalty. There is no hint-free leaderboard.
- Times round upward to whole seconds and display as minutes:seconds. Equal seconds share a dense rank; nickname ordering only stabilizes display order.
- Guests keep personal bests. Signing in imports eligible guest history. Public listing requires the existing explicit profile opt-in. Opting out retains personal records.
- Earlier saves and clear records retain their boards, points and hints. Previously exposed legacy puzzles are not silently assigned a new ranked clock, including unopened legacy saves. Restart is required for a new timed attempt. Historical client durations are not backfilled into speed rankings.

## Storage and consistency

Additive migration: `backend/migrations/0050_sudoku_speed.sql`. It creates `sudoku_speed_attempts`, indexed by level/version/rules/status/time/owner and owner/level, plus `sudoku_speed_reviews` for administrator decisions.

The current attempt summary stays with the existing server-controlled session. An `AFTER UPDATE OF state_json` trigger projects current session attempts and the most recent abandoned/restarted attempt into the independent attempt table. Historical attempts remain there after subsequent replays. Attempt history does not accumulate in account JSON. Unchanged historic rows are skipped, and reviewed decisions survive later account writes.

The account compare-and-swap update, wallet/reward settlement and timing projection occur in one SQLite statement/transaction. A failing projection rolls back the clear and wallet change too. There is no asynchronous dual write. Public bests are calculated from valid attempt rows with SQL window functions; this release does not add a separate materialized-best table. Imported guest attempts retain their original ownership and are attributed to the verified account only after the recorded import/claim relationship exists.

## Contracts and validation

- `POST /sessions` with `prepare:true`: ready response without a puzzle for a new level.
- `POST /sessions` with `timing:"speed-v1"`: start or resume a timed session.
- Save, hint, restart and completion requests carry `attemptId`; stale rounds are rejected. Board revisions reject stale saves/submissions. Restart and completion use idempotency identifiers.
- Completion accepts the final board and revision directly, so the last move need not wait for a debounced autosave. Givens and Sudoku rules are validated server-side. Client duration and computer clock are not trusted.
- `GET /leaderboard?mode=speed&level=N`: current puzzle version's top 50 public players, participant count, own public rank even outside the top 50, private best, latest attempt status and update time. Responses are `no-store`.
- `GET /speed/reviews?status=pending|valid|invalid` and `POST /speed/reviews`: existing authenticated administrator authorization only. Confirm/withdraw requires a reason and records the operator/time. Ordinary users cannot review records. The administrator controls are shown only when the existing auth session reports admin status.
- Negative elapsed time is invalid. Results below three seconds preserve the clear but remain pending timing review. A pending/withdrawn attempt does not displace another valid personal best. A low duration alone does not delete progress or points.
- `SUDOKU_SPEED_ENABLED=true` and the migration table must both be present. Health exposes `speedVersion:1`; the existing v40 bank/release identifier remains compatible with the bank-maintenance pipeline.

## Refresh and layout

The existing leaderboard contains All clears and Single-level speed views. Speed controls select a collection and a level from the dynamic published catalog, with previous/next navigation. Locked puzzles remain inspectable in the leaderboard but cannot be played early. Loading, empty, network-error, pending-review and private/unlisted states are explicit.

Visible pages refresh every 30 seconds and on focus/visibility return. Speed failures back off to at most 120 seconds, preserve the last received records, and offer manual retry. Switching levels/accounts or unmounting aborts obsolete requests. Hidden pages do not continue polling. This is polling, not a push/WebSocket system.

## Verification evidence

- Nine focused speed integration tests use real SQLite, both migrations, an injected server clock and an administrator fixture. They cover start/resume, immediate final-board submission, hint eligibility, replay rewards/bests, stale rounds/revisions, forged givens, invalid clocks, pending review, audit persistence, atomic rollback, guest import/opt-in, ties, rank beyond top 50, restart retry and legacy unstarted saves.
- Full static suite: 239 tests. Existing backend suite: 431 tests; Sites: 4; release readiness: 13. Build generates 75 routes and 46 sitemap URLs, with bootstrap hydration verification.
- Actual browser QA completed a hinted puzzle in 77 seconds, confirmed personal best, signed-in opt-in ranking, and observed a changed rank on automatic refresh. A local synthetic comparison player was used only in the isolated QA database. Desktop plus 390px and 320px layouts were checked without horizontal overflow; no application console errors were observed.
- The official workerd Windows package was integrity-checked after a pre-existing cached executable proved truncated. The new migration and JSON projection trigger were then executed successfully in isolated local Cloudflare D1. API and frontend Wrangler dry-run bundles passed; these commands did not deploy.
- UI test database is preserved separately under `tmp/qa/speed-qa.sqlite`. The delivered local database was restored from the original v40 logical snapshot. Account rows, wallet/progress JSON and profile metadata were compared unchanged before handoff. No QA account or public score was left in the delivered local database.

## Publication and limits

No production migration, deployment, or scheduler change was performed. Prepared deployment changes apply additive migrations first, enable speed capability in the API, wait for `speedVersion:1`, then publish the matching frontend. On a future authorized release, verify existing Google sign-in, actual administrator review, remote D1 ranking queries and post-deploy smoke checks. Those live flows have not been claimed as tested here.

Keep the current bank and player database during rollback. Disable the speed flag and restore compatible application code if necessary; do not delete timing tables, clear history, wallet data or newly published puzzles. Existing clocks already exposed before a code rollback must not be reinterpreted as new attempts.

This validates server timing and correct Sudoku completion, not whether a human solved without outside help. It does not prevent external solvers, pre-knowledge of a replay, or coordinated account sharing. Accepted-save counts and review decisions are retained; a full per-keystroke replay/event ledger is not part of this implementation. Repeated-puzzle speed records explicitly allow practice and hints.
