# Free puzzle workshop

Scope approved 4 November 2026: `/en/escape-room-puzzles/`, six original standalone puzzles, online checking, progressive hints, separate A4/US Letter player and adult PDFs, links to existing games. No changes to paid packs, answers, checkout, accounts or generation. Local implementation; production publication is a separate state.

## Design references

Read the following public source, documentation and licenses. The implementation in this project is original; no upstream runtime, sample campaign, story text or illustrations were copied.

- [Mystery Forge](https://github.com/guplem/mystery-forge), [MIT license](https://github.com/guplem/mystery-forge/blob/main/LICENSE): story/task/result organisation, graduated hints, answer-format clarity, checking before publication. Its automated hints check is not a substitute for a human playtest.
- [Simon Tatham's puzzles](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/), [license](https://github.com/ghewgill/puzzles/blob/master/LICENCE): bounded route reasoning and readable rules. We do not embed its C engine or reproduce its game layouts.
- [csurfer/escaperoom](https://github.com/csurfer/escaperoom), [MIT license](https://github.com/csurfer/escaperoom/blob/main/LICENSE): lightweight story/puzzle/hint/answer structure. No new Python/Django service is required by the web page.

The shared `free-puzzles.mjs` is the source of truth for wording, clues, diagrams, accepted answers, online cards and PDF source. `tests/free-puzzles.test.mjs` independently enumerates queue arrangements, evidence candidates and harbour routes and traces the letter path. Cipher answers are derived from the supplied keys.

## PDF rebuild

1. Run `node scripts/prepare-free-puzzle-art.mjs <path-to-sharp-module>` with sharp available (the Codex bundled Node dependencies include it). This creates six 4x diagram PNGs and a data snapshot under `tmp/free-puzzles-build`.
2. Run `python scripts/build_free_puzzles.py` with reportlab installed. The Codex bundled Python includes reportlab. Four stable PDFs are written under `public/assets/free-puzzles/` and shipped by the normal static build.
3. Check each PDF's paper dimensions, page count and separation, render using Poppler and inspect the current pages before delivery. Fixed outputs do not require PDF tooling in production or in the frontend CI.

## Interaction and measurement

Answers and progress remain in React memory, and reset when leaving or reloading. No email/account/server storage or provider call. Client-side answers are intentionally inspectable; this is a free learning activity, not a secure exam. Viewing a solution does not itself count as solving; a later successful check is labelled solution-assisted. Filtering keeps card state.

Use the existing independently opted-in basic/consented enhanced analytics path. New events accept only fixed puzzle IDs, assistance enums, paper/file enums or game-destination enums. No typed answers or clue text is sent. `puzzle_attempt` means a nonempty answer was submitted; `puzzle_solved` includes assistance and is not a purchase conversion. `puzzle_pdf_download` means the response was received and a browser download initiated, not proof of saving or printing. Dashboard custom goals and live ingestion are not configured by this code change.

## Content boundaries

The six puzzles are a new free resource, not a new paid game. Preserve the existing full Home/Classroom adventures and their product facts. Do not claim physical playtesting, educational gains, runtime estimates, Google indexing or ranking. Player sheets have no printed solutions; the separate guide has all hints and explanations. All diagrams use shapes/text in addition to any colour.
