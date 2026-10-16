# Custom pack quality contract v7

New creator-v3 orders and eligible same-order rebuilds snapshot `packQualityVersion: 9`. The paper layout remains version 4.

Quality version 9 keeps the resumable story-frame, per-checkpoint material, closing, and full-game review flow introduced by version 8. It also preserves complete printed record facts when fitting them to cards. Grammar-only words are removed before shortening, record features may use up to 32 characters, and the story-grounding request receives only printed facts plus the intended action fragment. If an ordering checkpoint contains a noun, worksheet command, or premature final action, the engine replaces all four labels with a stable inspect-gather-prepare-position sequence derived from the approved action subject before story grounding. A repaired checkpoint is re-grounded before validation while all other checkpoint materials remain saved.

If the initial story frame accidentally describes the mission as already finished, the engine reopens that temporary finding or consequence from the approved action subject. The later grounding step still replaces it with a causal sentence based on the actual printed material, so this recovery does not publish invented evidence and does not spend another model call.

An unfinished or failed version-8 remake is eligible for a same-order quality recovery. The recovery starts a new quality epoch so cached version-8 blueprint parts cannot reintroduce a truncated printed fact. The purchaser is not charged again and the currently published PDFs remain downloadable until both replacements pass all checks.

