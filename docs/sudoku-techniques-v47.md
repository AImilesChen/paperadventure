# Sudoku learning centre and complete tutorials v47

Local implementation of the user-approved content redesign after the v46 audit. Production remains v45 / PR178 and API protocol 4. Nothing was published.

## Canonical local delivery

- Source snapshot: `tmp/sudoku-techniques-v47`, extending unpublished v46. Compare the final release scope against LIVE `tmp/header-navigation-v45`, not only v46.
- Same review URL now serves v47: http://127.0.0.1:5645/en/sudoku/techniques/ . Preview session 5079, isolated API 5648/session 74375. The old v46 preview on 5645 was stopped; v46 source and original DB remain preserved. Temporary v47 preview 5647 was stopped after testing.
- Four real public tutorial routes under `/en/sudoku/techniques/`: `single-candidate/`, `hidden-single/`, `locked-candidates/`, `naked-pair/`.

## Content and experience

The centre now teaches how candidates are derived from the row/column/box, presents four illustrated method overviews and prerequisites, compares proof conditions and next actions, and provides contextual learning FAQ. Old `#technique-single`, `#technique-hidden`, `#technique-locked`, `#technique-pair` links land on real overview sections; `#speed-practice` remains. Tutorial links open distinct documents rather than switching a shared first-screen widget.

Each complete article includes a full-board worked example, all three explanation steps readable without clicking, reversible diagram emphasis, a magnified candidate cell, a complete evidence table, definition and prerequisites, method-specific explanations, an actual changed-clue counterexample with inspectable board, a different independent exercise, FAQ and next-lesson/parent/game links. Body text is 17px; figures include R/C coordinates, scope explanations, underlined fixed blockers and non-colour-only labels. Narrow screens retain the full board and a larger candidate inspection control. The tutorial styles are scoped; rules/game/rank pages keep their presentation.

Teaching fixtures are generated reproducibly by `scripts/build-sudoku-tutorial-fixtures.mjs` from new independent boards, not campaign levels. All eight original boards have independently checked unique solutions and differ from published/reserve puzzle fingerprints. Candidate lists are computed from actual givens. Every named blocking digit exists in a shared constraint; placements match the independently solved board and removals never remove its solution digit. Each counterexample removes exactly one clue, stays consistent, and demonstrably breaks the claimed rule. Counterexamples are illustrations of invalid deductions and are not claimed to be uniquely solvable puzzles. No completed teaching solutions or campaign solution arrays are exported to the client.

Practice begins without answer highlights. Placement exercises initially hide computed notes; users may enable them for free. Selection works through either the board or a labelled menu plus digit controls. Exact grading rejects empty, partial and extra selections and removals of reserved clues. Success feedback identifies actual constraints/coordinates; retry/reset is local. No hint-point charge, reward, campaign update, leaderboard or backend change.

## Verification and evidence

- Build: 79 prerendered pages, 51 sitemap URLs; public bootstrap hydration parity verified. Existing large bundle warning remains.
- `npm run test:static`: **259 passed**. Includes independent coordinate candidate calculation, independent uniqueness and bank separation, complete pattern/removal checks, real blocking witnesses, invalidating counterexamples, exact immutable grading and new route/HTML/metadata/anchor/privacy coverage.
- `npm run test:sites`: **4 passed**. `npm run test:release`: **13 passed**. Focused learning/navigation/offline run: 19 passed before final display-only refinements, included again in the final full run.
- Wrangler 4.149.0 site dry-run: passed. No API or production deploy. Source offline cache v47-1 and build cache suffix use the current bank version; each new tutorial precaches/restores its own public shell.
- Actual browser: real hub-to-hidden tutorial navigation, refresh of the independent route, full-board evidence inspection, changed-board expansion, demonstration 2→3→2 result marking, native fragment positioning, FAQ Enter open/close, correct answers for all four exercises, wrong placement / reserved-box removal / incomplete pair rejection, reset and candidate visibility. Native smooth fragment scrolling was allowed to settle before the final screenshots; the worked section was measured at 20px from the viewport top.
- Desktop default width and 1440×900, phones 390×844 and 320×780 inspected. Document widths respectively 1425 / 375 / 305px at the explicit test widths: no horizontal page overflow. At 320px the pair selector and digit control worked; locked counterexample and hub also fit. Body/step text measured 17px; magnified notes 20–21px. No browser console errors.
- Tutorial → game → start level 1 → 81-cell board → centre flow checked against the isolated API. Not a full campaign solve or authenticated Google cross-device test.
- Five local HTTP route responses, titles, canonical URLs and matching schema checked: `tmp/qa/http-seo.json`. Each article has its own canonical and Article schema with actual publisher, plus parent breadcrumbs. The centre has CollectionPage/ItemList schema. New pages follow the restricted public-Sudoku analytics consent boundary, not general private/game tracking.
- Rules/levels/leaderboard prerendered `<main>` markup exactly matches LIVE v45. Every backend and bank file remains byte-identical to v45.
- After closing the QA tab, restored all three isolated DB logical tables exactly from the preserved baseline: two accounts, zero speed attempts and zero reviews; `tmp/qa/database-restored.json`. Private test DB backup is under `tmp/qa/browser-test.sqlite`, excluded from delivery. Production and baseline databases were not modified.

Visual evidence under `tmp/qa`: `techniques-hub-desktop.png`, `hidden-single-worked-desktop.png`, `hidden-single-phone.png`, `phone-practice-feedback.png`. Logs: `build-v47.log`, `static-v47.log`, `sites-v47.log`, `release-v47.log`, `learning-v47.log`, `bundle-v47.log`. Parent workspace `docs/sudoku-techniques-v47-development.json` contains complete scoped hashes versus LIVE v45.

## Release and limits

Local review only. Search indexing, ranking and analytics-platform receipt have not been verified; do not describe technical SEO checks as proof of search traffic or teaching mastery. No production Google sign-in, physical accessibility certification or complete campaign playthrough claim.

On a later explicit publication request, deploy the complete scoped frontend/prerender/site-worker files using the established workflow. No API deploy or DB migration is needed. Keep current published bank, player records, timing and wallet data when reverting UI changes. Never add-all/reset the dirty parent workspace.
