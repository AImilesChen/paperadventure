# Delivered-game changes

First generation remains on the existing step-delivery path. Its queue, source tables, budgets, proof and baseline behavior are unchanged. Customer modification is a separate, request-scoped candidate workflow, not another purchase or a destructive restart of the original activity.

## Customer flow

Before first approval, two plan reworks and three targeted plan edits remain separate rights. The plan header links directly to the editing controls, and the long plan is collapsed. Explain that plan review concerns story direction; post-delivery review uses actual printable files.

After delivery, the download area is followed by two actions:

- Improve one checkpoint: write feedback or choose a shortcut, prepare a candidate, compare both actual PDFs, accept or discard.
- Adjust the whole game: write what should change and stay, select a supported main style and two supporting styles, review the new plan, explicitly approve candidate generation, compare the actual PDFs, accept or discard.

The local editor uses AI to classify freeform reading/instruction/hint requests into six checked guidance variants. It never appends arbitrary model-authored rules, reveals an answer or changes the underlying puzzle. Requests outside this scope are explicitly directed to whole-game changes. Whole-game plans retain the purchased theme and supported paper format. Unsupported custom mechanics are not promised.

PDF.js is loaded only when a preview mounts. It renders the authenticated PDF bytes into canvas, rather than an approximate plan card or a native browser PDF plugin. The current and proposed documents have independent page navigation and full-file links. Local changes start at the correct checkpoint page in each document, calculated from the same paired renderer that created the PDFs. The API returns text excerpts only if recomputed Player and Guide hashes both match their stored files. Older unreproducible versions show original-file links and no misleading text comparison.

## Rights and attempts

Three accepted checkpoint changes and two accepted whole-game remakes are independent counters within the original first-qualified-delivery 30-day window. Migration 0039 increases an existing two-change local allowance to three without resetting usage or dates. It adds the whole-game counter without changing redownload expiry. Expired, suspended and refunded orders remain ineligible.

Preparation is separately capped at six checkpoint candidates and four whole-game candidates per order, including failures and discards. Preset local candidates do not call the provider; a custom candidate makes at most one classification call. A whole candidate has at most five plan calls and six enhancement calls. Each queue message may reserve and execute at most one provider call. Failed/discarded candidates do not spend successful replacements. An unavailable queue still leaves an auditable failed attempt. These limits are shown before submission and in purchase-rights copy.

## Isolation and recovery

`delivery_editions` contains a request key, kind, feedback, base artifact version/hash, private candidate spec/hash, saved work, phase, call count, lease, candidate hashes and final decision. No candidate writes the original plan, activity spec, generation calls/checkpoints, copy-review state or order status. Accepted artifacts have their own immutable spec snapshot; later edits use that version's spec.

Whole-game generation first builds a proved and PDF-preflighted baseline for the newly approved plan. It then saves the frame, four materials and closing in separate queue steps, compiles the final sheet locally, proves all five puzzles and renders both roles. Enhancement failure selects the saved baseline, explicitly labelled in the comparison. There is no final AI copy audit. A failed PDF upload can resume the same saved candidate twice without another AI call. Scheduled recovery never replays a reserved provider call: it continues locally from a saved baseline or records failure for explicit customer action.

One active candidate per order is enforced in SQLite, including exclusion triggers against legacy edits and upgrades. Owner authentication and same-origin checks apply to every mutation. Request keys make duplicate submissions idempotent. Active requests reject a different new request; confirmation is idempotent. The scheduled worker redispatches saved queued phases.

## Publication boundary

Before acceptance, read and verify the candidate story and both PDF hashes from private R2. A single guarded SQLite state transition publishes an immutable artifact row and increments exactly one successful counter using triggers in the same transaction. It verifies current source, rights, status and deadline again at commit time. Repeated acceptance returns the published version without charging again; discarded or stale candidates cannot publish. All previously published artifact rows and R2 objects remain accessible by version number. ZIP downloads pin both PDFs to one version, including when acceptance happens between their HTTP requests.

## Verification

Local integration tests use SQLite migrations, private in-memory R2, scripted provider outputs and the actual production API/queue. Coverage includes Home/Classroom and A4/Letter; checkpoint custom/preset/discard/accept; whole-plan approval; enhanced completion and baseline fallback; immutable original state; both-file integrity; original/current downloads; source mismatch; idempotency; separate rights; finite attempts; expiry; cross-owner and CSRF denial; stale and exhausted acceptance; legacy exclusion; saved PDF recovery; reserved-call interruption; and multi-message plan repair. Scripted tests do not spend live credit or claim real-provider quality. Desktop/mobile local UI checks exercise both flows and real PDF canvas rendering. No customer order is automatically retried or replaced during development/deployment.

Release requires migration 0039 before backend activation, then the matching frontend. Roll back the UI first if needed; retain the additive schema, histories and published artifacts. Deployment itself does not generate, call AI or switch any customer's files.
