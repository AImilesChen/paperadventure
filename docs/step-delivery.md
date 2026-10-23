# Paid custom pack delivery

New creator-v3 purchases snapshot `packStepDeliveryVersion: 1`. Older orders and remakes keep their saved policies. Migration 0038 creates a private, approved-spec-bound baseline store and does not enqueue any work.

## Before enhancement

`buildBaselinePack` constructs a paper mission briefing using the approved title, opening, goal, scenes and mechanics. The existing puzzle compiler supplies every rule, answer, result digit and final combination. It independently solves all five printed puzzles and preflights both PDFs before the first provider request. The baseline uses standard briefing materials; it is not an equivalent bespoke narrative repair. Its host guide explicitly tells the adult to narrate the approved mission outcome after the final paper action. The order page labels this edition.

## Queue boundaries

The worker saves one provider/local generation result and yields. The next message reads the saved result rather than buying it again. Blueprint assembly and each derived checkpoint also yield after persistence. No provider assembly fallback runs inside a single-message new-order step. A lost send leaves a queued row for the existing five-minute scheduled dispatcher. Duplicate deliveries must acquire the activity lease; interrupted reserved attempts count against the existing budget. No new model quota is granted.

## Failure handling

Provider transport and content failures retry only their own step within existing limits. At terminal enhancement failure the already validated baseline becomes the unpublished delivery candidate. Provider fragments and failure records remain private. Binding mismatches, unknown code/database failures, and uncertain persistence never trigger a fallback. The baseline itself must pass the same puzzle and PDF checks. Final copy policy v2 runs no model audit. PDF/storage retries reuse the checked story.

Baseline activation is resumable: once the private baseline mode is selected, a subsequent message finishes its bound local checks and publication checkpoint without asking the provider again. Existing published artifacts are never replaced by this new-order path.

## Observable progress

The owner response includes eight blueprint milestones, five checkpoints, puzzle validation and file delivery (15 saved milestones). It returns only safe enum/numeric state and timestamps, never provider candidates. A stale update is shown as waiting for recovery rather than asserted to be a currently running AI call.

## Verification without checkout

Run `npm run test:delivery` for invented themes and actual worker/queue integration with scripted providers, in-memory D1 and private-file bindings. It exercises all play styles, Home/Classroom, A4/Letter, timeouts, invalid material, lost dispatch, interrupted reservations, duplicate messages, source mismatch and PDF storage retries. It spends no provider credit and creates no customer order. This proves deterministic execution and fallback behavior; it is not a measurement of live provider latency or real-group play quality. Real-provider checks remain separately authorized and bounded.
