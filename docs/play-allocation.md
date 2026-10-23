# Phase one: selected paper play allocation

New creator-v3 purchases snapshot `packPlayAllocationVersion: 1`. This is separate from quality version 14, copy policy 2 and step delivery version 1. No database migration or new model allowance is needed. Existing purchases without the flag retain their exact allocation rules.

The first four checkpoints use `[main, supporting A, main, supporting B]`. Selected supporting styles are canonicalized; empty slots use complementary supported activities. Both selected supporting styles therefore become real playable checkpoints. The fifth checkpoint has the internal mechanic `finale` and is labelled as a combined-results finale, rather than being counted as a main or supporting activity.

The plan carries `playAllocationVersion: 1`. Narrative prompts, the adult-approved plan, deterministic material compilation and the prevalidated baseline all use the same shared allocation. Validation requires that saved plan allocation; it never asks the model to invent or repair the mechanic list. The material allocator chooses at least three types across the first four checkpoints with no type repeated more than twice. Existing proven puzzle rules, answer generation, PDF layouts, queue boundaries, retry limits and final local checks are unchanged.

This phase does not introduce new puzzle variants, richer narrative generation or another AI editorial audit. A failed enhancement still uses the approved-spec-bound baseline and publishes the same selected play types. It never changes old orders or replaces existing PDFs.

Local verification covers all 40 ordered main/support selections, narrative-only plan generation in one scripted call, 160 A4/Letter Player/Guide baseline renderings, the preview's independent finale label, legacy plan compatibility, and actual queue-worker publication through both healthy enhancement and simulated provider failure. These checks use invented data and scripted providers; they do not spend live AI credit or modify customer orders.
