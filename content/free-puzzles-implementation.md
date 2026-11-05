# Free puzzle workshop: implementation and verification

Date: 4 November 2026. Environment: local. Publication: not performed in this task.

Preview: http://127.0.0.1:5504/en/escape-room-puzzles/

## Delivered

- Six original puzzles (two codes, two logic, two routes) with shared deterministic content/diagrams, case/spacing-tolerant checking, three graduated hints and explained solutions.
- Accessible controlled solution disclosures; viewing a solution is recorded synchronously, including rapid answer entry. Correct checks after viewing are labelled solution-assisted. Opening a solution alone does not count as a completed check.
- Category filters keep card state; explicit reset confirmation; page-memory-only answers and progress.
- Four static PDFs: six player pages and four adult-guide pages in each of A4/US Letter. Player 4 has three outlined cut-apart clue cards. Player pages include working space. Existing game pack bytes are unchanged.
- Header For home submenu, contextual Guides/sample/catalogue links, complete-game recommendations, practical hosting content and factual FAQ.
- Search title/description, canonical, pre-rendered six-card HTML, collection/breadcrumb schema and sitemap entry. No paid-product offer schema on the free puzzle resource.
- Enum-only participation, hint, correct-check, PDF-download and game-click events through the existing analytics preferences. Typed answers never enter event properties.

## Evidence

- `npm run build`: passed. Public availability/bootstrap hydration verified for all indexable routes; 61 pre-rendered routes and 35 sitemap URLs.
- Existing static/analytics/content/route suite: 71 tests passed; Sites worker/packaging suite: 4 passed. After final puzzle disclosure changes, targeted puzzle and route regression: 14 passed. The puzzle test file is now included in `test:static`.
- Unique-answer checks independently derive both ciphers, enumerate all queue permutations and shared-clue candidates, trace every forest step and enumerate valid harbour crossings.
- `scripts/check_free_puzzle_pdfs.py`: four PDFs passed page-count, paper-dimension and answer-separation checks. Shared diagram images present on every player page. Poppler render and visual review completed for all 20 pages; the latest 12 player pages reviewed after adding cut lines and working space.
- In-app browser: empty/wrong/correct answers, all six correct answers, progressive hints and exhaustion, category filtering, confirmation before reset, solution-view-assisted check, header current link and Escape dismissal verified.
- Browser downloads completed for A4 players and US Letter guide. All four promised assets exist, have PDF headers and correct independent structural checks. No user purchase or paid provider call.
- Responsive browser: 390px and 1440px; no horizontal overflow, no broken images; visible controls remain within the phone viewport. No captured console errors. Temporary viewport override reset.
- Local HTTP: new page, robots.txt and sitemap.xml return 200 with expected MIME types.
- Evidence files: `tmp/free-puzzles-qa/build.log`, `final-tests.log`, `pdf-audit.json`, `desktop.jpg`, `mobile.jpg`, `final-player-pages.png`.

## Remaining boundaries

- Production deployment, production URL/HTTP verification, GSC/Bing recrawl status and live analytics ingestion are not claimed. Existing integrations and consent are preserved. New dashboard custom goals have not been configured.
- No physical print or unfamiliar-child/family playtest has been performed. Automated uniqueness and screen review establish mathematical consistency and layout, not a measured child difficulty or play duration.
- The working tree already contains earlier unrelated changes. No blanket staging, reset, commit, pull request or production mutation was performed.

## Main source changes

`src/freePuzzles.jsx`, `src/freePuzzles.css`, `shared/free-puzzles.mjs`, `shared/seo.mjs`, `shared/site-identity.mjs`, `shared/page-manifest.mjs`, `src/conversionEvents.mjs`; focused entry changes in `App.jsx`, `guides.jsx`, `freeDownload.jsx` and `productPages.jsx`; PDF generation/audit scripts, four assets and `tests/free-puzzles.test.mjs`. Original source-reference notes are in `content/free-puzzles-design.md`.
