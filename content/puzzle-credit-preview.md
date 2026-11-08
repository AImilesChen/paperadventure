# Puzzle help credits: approved local preview

The owner approved a local preview on 7 November 2026: keep puzzles free to solve, give a free first direction hint, charge more demo credits for further hints and a full solution, show the cost and obtain confirmation before any debit, and never charge twice for the same unlocked content. Pack prices and introductory grants are not approved or activated.

## What the current preview does

- Enabled only after mount in Vite development on localhost or 127.0.0.1. Server-rendered and production pages retain the current free-help flow. No new backend, migration, real balance, checkout or payment fulfilment is deployed.
- The starting eight credits are explicitly labelled samples with no cash value, saved in this browser only. This is not an account grant, purchase or promised commercial price.
- Demo settings: hint 1 costs 0, hint 2 costs 1, hint 3 costs 2, full solution costs 5 and includes all three hints, so later hint reading is not charged again. Viewing a solved puzzle's explanation is earned and free; it does not change its completion classification.
- Quoting or cancelling makes no wallet change. Unlocking records a debit and a content entitlement. Insufficient balance rejects both changes. A synchronous current-wallet ref prevents same-render duplicate clicks from charging twice.
- Reopening, refreshing, changing puzzle and restarting a puzzle preserve previously unlocked help for that puzzle edition. Resetting the sample balance keeps unlocks. Previously opened free content is honoured without retrospectively billing it.
- Reading help is explicit. The first hint opens immediately at zero cost. Further hints show a before/cost/after confirmation. Full solutions always have a disclosure confirmation, including at zero cost. Revealing a solution never fills or completes the puzzle.
- Existing hint/solution assistance classifications remain: a later successful check is recorded as hint-assisted or after viewing a solution. A completed independent solve remains independent when reading its earned explanation.
- No new paid analytics events are emitted. Typed answers are not sent. Existing fixed puzzle/help enums are retained.

## Compact puzzle workbench

Puzzle 1's rules and structured record descriptions are always visible. Its duplicate large printable diagram and collapsed transcript are removed from the active workbench; the matching printable files remain below on the page. Undo and restart move beside the clues. Duplicate headings/copy and empty feedback space are removed, with readable text and 44px controls preserved. The two phases are measured at real desktop sizes, and narrow screens reflow rather than being shrunk to fit one screen.

## Required before real sales

The free collection currently ships answers in public JS, hidden explanatory HTML and the free Adult Guide. This preview is intentionally not a paid-access boundary. Selling protected help requires a separately defined commercial question-bank edition or a clearly approved change in content policy. Keep the existing promised free guide available.

1. Reuse the existing verified adult account identity. Account IDs and prices come from the session and server configuration, never browser balances or caller-supplied amounts.
2. Add a separate puzzle-credit wallet, append-only transaction ledger, and help entitlements. Do not reuse custom-generation allowances, household game orders or current game prices.
3. Uniquely identify content by puzzle ID, edition and help level. Enforce a unique user/content entitlement and an idempotent payment/unlock reference.
4. In one atomic server operation, check entitlement, check balance, debit and append the ledger entry, then grant access. A duplicate request returns the existing entitlement. A failed operation must not leave a debit without accessible content. Multiple tabs and concurrent requests must be covered by database constraints, not browser state.
5. Serve locked hints and full solutions only after an entitlement check. Validate answers on the server for a commercial bank; omit unreleased answer content from static HTML, client bundles, open JSON and free PDFs. Do not pretend client obfuscation protects paid answers.
6. Add server quotes and account balance/history/help endpoints, including loading, signed-out, insufficient, unavailable, price-changed, refunded/disputed and retry states. A reset of puzzle attempts must never erase a purchased entitlement.
7. Sell separate, owner-approved credit pack SKUs through the existing payment system. Create a pending pack order server-side; grant credits once only after a verified confirmed payment. Browser redirects cannot grant a balance. Define refund/dispute handling and audit references before activating sales.
8. Choose pack quantities, prices, introductory credits, validity/expiry if any and refund terms explicitly. Show those facts before checkout. Update product copy and applicable policies to match actual behaviour before release.
9. Verify with payment test mode first: duplicate and reordered webhooks, failed payments, repeated checkout returns, concurrent spends, interrupted unlocks, persisted entitlements and refunds. No real charge is part of this preview task.

The local wallet can be edited by the browser user and is not secure money or proof of ownership. The production build deliberately does not activate it.


## Edition 4 route extension

The post office now has separate first-stage and route hint counters. A help-tier unlock covers that tier in both phases, and full solution covers both phases and all hints. Previously opened edition3 post-office demo entitlements migrate to edition4 without a further debit; balance is preserved. The route count is saved separately and either phase’s hint use marks assisted completion. Essential route records, semantics, earned key and instructions are never paid help. Production still uses the free hint flow.
