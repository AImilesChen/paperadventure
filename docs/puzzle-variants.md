# Phase two: finite checked puzzle formats

New creator-v3 purchases snapshot `packPuzzleVariantVersion: 1` alongside phase-one allocation. Story quality remains 14; delivery policy 2, queue boundaries, call budgets and source bindings are unchanged. There is no migration or automatic upgrade of an old order.

The shared planner saves `puzzleVariantVersion`, `puzzleSeed` and five `puzzleVariants` on the paid plan. The seed is derived from immutable purchase settings, not random values generated during checkout or retries. Narrative edits do not change the saved format selection. The same configuration can reuse a finite set of formats; this is not a promise that every order has an entirely unique puzzle. Repeated material types alternate between their two formats.

| Material | Format A | Format B |
| --- | --- | --- |
| Evidence cards | Match both printed facts | Cross-reference numbered records with a separate register |
| Order tiles | Before/after chain | First/last and neighbouring steps |
| Symbol key | Four-entry numeric message | Four drawn shapes with a complete letter key |
| Route board | Trace two open links | Compare crossing and landing conditions |
| Cooperative witness record | Combine two required properties | Combine two independent exclusions |

Discussion checkpoints use witness records with separate Reader/Checker clues. Either clue alone leaves two candidates; both together leave one. Instructions explain distributing the notes and an adult-read alternative without cutting. All clues remain printed in the game; no outside facts or materials are required. The fifth checkpoint still combines the first four saved digits.

The engine keeps the same correct fictional record or action expected by story-frame generation. It varies result digits and answer-choice positions from the saved seed. Earlier stages, final action codes, the adult answer and future PDF rebuilds therefore agree without additional model work.

Before choosing a richer format, the compiler independently proves and page-preflights a same-type mature format. It then builds, independently solves and page-preflights the richer format. A local format failure returns that already checked fallback. A model, queue or storage failure continues through the existing step-delivery mechanisms and complete proven baseline. An invalid source binding or an unprovable fallback remains an error; no safety check is skipped to publish a broken puzzle.

`backend/puzzle-variants.test.mjs` exercises every format, both paper sizes, serialization/rebuilds, changing result/choice mappings, both-role necessity, deliberately corrupted printed facts, local proof/layout failure, all 40 play selections in Home/Classroom, long fields, old-policy compatibility and wording-only revisions. The queue-worker test covers enhanced and failed-provider delivery with PDF storage retry. These are scripted local checks without payment, live AI credit, private orders or existing-PDF replacement. Sample PDFs under `tmp/pdfs/puzzle-variants-qa` are synthetic layout fixtures, not customer deliveries.
