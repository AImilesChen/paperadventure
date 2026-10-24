# Optional material-bound narration

New creator-v3 purchases snapshot `packMaterialNarrativeVersion: 1`. Existing saved specs do not acquire the field. No migration, provider request, new review gate, queue change or old-order replay is part of this update.

The earlier theme presentation only recompiles scenes and discovery summaries for baseline deliveries; enhanced deliveries retain the approved plan's story events. Those events can promise an unprinted discovery, such as decoding a corridor when the actual four-letter answer is only a label. The optional display layer now covers enhanced and baseline print views. It preserves the structured approved location and compiles the paper action from the material type, with adult summaries taken from the solved option and printed rules. It never claims that a decoded label supplies additional directions. Names, cards, rules, tasks, choices, answers, result digits, variants, opening, ending and approved goal remain unchanged. Awkward material names are intentionally outside this batch.

## Retain delivery first

The existing print path renders both PDFs first. Its selected printed story and the two byte arrays are retained. Only then does `renderMaterialNarrativePair` try the optional display on a clone. A narrow guard allows changes only to checkpoint `storyContext`, adult discovery `reason` and the adult final-code explanation. Any other change rejects the optional edition locally. If narration or either PDF render fails, return the exact retained original pair and printed story without rerendering, requeuing, invoking a model or marking the order failed.

Existing puzzle proofs remain outside this optional recovery; broken puzzle facts cannot be delivered by the fallback. Rewritten visible delivery-copy facts use their existing visible-fact solver. Failures of the original PDF renderer remain real delivery errors. This change does not claim to solve unrelated infrastructure, source or storage failures; existing recovery remains in place.

The PDF renderer and `buildInteractiveGameView` share the same pair selection. The workspace's verified comparison reads that printed story. Wording candidates apply their existing bounded clue/hint changes afterward. Both files still publish and switch atomically through the existing edition service, with its original quotas, source/spec hashes and attempt budgets. The new flag participates in delivery-copy spec bindings when present, preserving the previous hash shape when absent.

## Validation

- Enhanced and baseline synthetic packs, known and unknown themes, all four selected play styles, Home/Classroom and A4/Letter.
- Same independently solved puzzle answers/digits and unchanged protected content before and after presentation; saved source is never mutated.
- Simulated narration exception, complete-text overflow, attempted answer/material/ending changes and either-role layout failure return the original byte arrays together.
- Original renderer failure and broken puzzle proof are not hidden.
- Production-queue fixtures publish both saved PDFs with provider timeout fallback, storage retry and duplicate-message handling under the same call budgets; no final AI audit is added.
- Existing edition tests exercise candidate PDFs, rejection, quota preservation and atomic acceptance with the new-purchase flag.
- Generated paired PDFs are rendered for visual inspection. No live provider or customer order is used.
