# Sudoku techniques v46 — local development

Based on the released v45 snapshot `tmp/header-navigation-v45` (PR178). This version has not been published. Local production-build preview: http://127.0.0.1:5645/en/sudoku/techniques/ ; isolated API: 5646. Preview session 8656, API session 42405.

## Delivered

- Compact introduction, four coloured method selectors and a shared 60/40 diagram/explanation workbench. The default desktop first screen includes the first example and step controls.
- Three reversible demonstration steps for single candidates, hidden singles, locked candidates and naked pairs. Candidate highlights and crossed-out eliminations appear with their corresponding step and disappear when stepping back.
- One different, independent exercise per method. Placement exercises require a cell and digit; elimination exercises require the complete removal set. Wrong answers provide a constraint to reconsider; correct answers explain the deduction. No default answer highlights in practice. Reset and mode/method switches clear the current attempt. Session-only badges say exercise completed, not mastery.
- Candidate selection can use the diagram or an explicitly labelled dropdown and large digit controls. At narrow widths, a candidate row wraps into three groups with C labels and a visible explanation; it is still one row. Locked diagrams include R/C labels and distinguish excluded positions from out-of-scope cells.
- Visible prerendered method comparisons, speed-learning advice, five FAQ answers and links to rules, levels, game and the existing separate daily practice. Preserved incoming `#technique-single`, `#technique-hidden`, `#technique-locked`, `#technique-pair` and `#speed-practice` anchors. Updated metadata and offline-shell cache to v46-1.

## Verification

- Production build: 75 prerendered routes, 47 sitemap URLs; public bootstrap hydration parity passes. Existing large-chunk warning remains.
- `npm run test:static`: 255/255. Five new tests independently enumerate row assignments and prove placements/eliminations across every assignment, verify whole-box confinement, reject partial/extra/clue removals, verify retry/immutability and readable initial HTML.
- `npm run test:sites`: 4/4. `npm run test:release`: 13/13. Wrangler 4.149.0 site dry-run completed; no deployment command executed without `--dry-run`.
- Actual browser: all four exercises completed; wrong digit, incomplete pair and removal inside the reserved box rejected; retry/reset and method switching checked. Demonstration backward step removes derived marks. Direct pair anchor selects the right lesson. FAQ mouse/Enter operation checked.
- Actual 1440 desktop: diagram/explanation 752.39/501.61 CSS px (60/40). Default-width first screen visually inspected. 390 and 320 phone widths: document widths 375 and 305 respectively, no horizontal overflow; completed the naked-pair exercise at 320. Locked exercise dropdown and removal control also checked at 390. No browser console errors.
- Return to game, start level 1, 81-cell board, return to techniques verified against the isolated local API. This was not a full campaign solve.
- Rules, levels and leaderboard prerendered `<main>` content exactly matches v45. Backend, bank and payment files are byte-unchanged. Tutorial grading has no campaign/API/wallet inputs.
- After closing the browser test tab, restored the isolated database's original three logical tables exactly: two accounts, zero speed attempts and zero speed reviews. Original v45 DB was not modified. QA backup remains private under `tmp/qa` and must not be packaged.

Evidence: `tmp/qa/techniques-desktop.png`, `techniques-phone.png`, `techniques-phone-exercise.png`, `techniques-pair-demo.png`; `build-v46.log`, `static-v46.log`, `sites-v46.log`, `release-v46.log`, `bundle-v46.log`. Complete source hashes are in the parent workspace's `docs/sudoku-techniques-v46-development.json`.

## Limits and release scope

Local verification only. No production rollout, search-engine indexing receipt, external analytics-console verification or real Google sign-in claim. Four independent learning exercises are not a new daily reward bank. Existing paid hint pricing, wallet, ranking, daily rewards, campaign saves and automatic bank maintenance remain unchanged.

If subsequently authorised, publish the scoped frontend files through the existing site workflow. No API deployment or DB migration is required. Production remains v45/API protocol 4 until then. Preserve the latest puzzle bank and player database when rolling back a UI release.
