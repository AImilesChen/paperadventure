# Global header navigation — v45

Completed locally, 2026-11-10. Canonical source: `tmp/header-navigation-v45`. Preview: http://127.0.0.1:5643/en/ ; isolated local API: http://127.0.0.1:5644 . Production remains v44 / PR177 (`a9db799b30f60a11643696610e27948ccd296f85`). No publication was requested or performed in this turn.

## Approved changes delivered

- Six primary entries: For home, For classrooms, Sudoku, How it works, Resources, Pricing. The existing Create with AI action remains on the right; its duplicate primary entry is removed. Footer and page calls to action are retained.
- Primary type is 16px on wide desktops and 15px at the narrower desktop range. Removed the old Sudoku-specific 12px squeeze. Minimum primary control height is 44px; spacing and alignments are shared across pages.
- For home opens a 600px panel with two columns (Browse adventures / For the occasion) and a separate Start free row. The six existing destinations remain reachable. Duotone vector icons, 16px item titles and 13px descriptions support scanning.
- Resources groups the existing Guides, Free puzzles and Help routes. The global Sudoku menu now uses readable 16px titles/13px descriptions and duotone icons. Its local section navigation remains unchanged.
- At 1240px and below, primary navigation collapses into a vertical disclosure list with an independently scrollable viewport. On phones, the creation action moves into the list; sign-in/account remains in the header. Text does not shrink to fit the full desktop row.
- Home, Resources, Sudoku and Account menus close one another. Arrow Up/Down enters and moves through discovery links; Escape closes a disclosure and returns focus, and a second Escape closes the phone navigation. Tab exits normally. Outside clicks, link selection and brand navigation close the relevant menus. The original Sudoku leave/save guard is preserved through the existing Link component.
- Active states include Home theme pages, occasions and free Home samples; shared free puzzles highlight Resources. Header layers above the floating feedback trigger while a disclosure is open, below existing modal overlays.
- Removed the old global Sudoku 1300px responsive override, so resizing an open phone menu back into the desktop range does not leave the Sudoku panel in the wrong positioning mode. Service-worker shell version is v45-1.

## Verification

- Final build/hydration and bootstrap parity: 75 prerendered routes, 47 sitemap URLs. No new routes or SEO/analytics behavior changes. Existing large-chunk warning remains.
- 250 static/function checks passed, including existing route and Sudoku save-navigation safeguards; 4 Sites worker and 13 readiness checks passed. Final site Worker dry-run bundle passed. Backend code is byte-identical to live v44 and was not redeployed or migrated.
- Actual browser checks on the built preview: authenticated and guest headers; 1440px / 16px type, 1280px / 15px type; 1241px desktop without action overlap; 1024px collapse; 390px and 320px reflow without horizontal overflow. The narrow usable widths were 375px and 305px respectively.
- Actual interactions: menu exclusivity, Arrow Down entry, Escape focus return/two-stage phone close, outside click, same-homepage brand close, phone-to-desktop resizing with the Sudoku panel still absolute, route selection and closure. Resources led to Guides, Free Home game led to its sample page, the Home Dinosaur theme retained its active group, and the Sudoku Level map link opened the level page. Final browser console error query returned no entries.
- No live Google sign-in, payment, downloads or production navigation audit is claimed. Authenticated UI used the existing local test account; guest UI used the separate localhost cookie scope.

Screenshots: `tmp/qa/header-final.png`, `resources-desktop.png`, `mobile390.png`, `mobile320-final.png`, `sudoku-dropdown-final.png`. All are actual local captures, not generated mocks. Browser viewport overrides were reset and QA tabs closed.

The isolated local database was restored from the preserved v44 original using SQLite backup after closing QA tabs. All rows in all three application tables compare exactly: 2 original accounts, no speed attempts/reviews. No game rules, scores, hints, wallet, bank, API or production data was changed.

## Handoff

Use the scoped source hashes in root `docs/header-navigation-v45-development.json`. A future authorized release needs the site changes only; the existing production API protocol 4 is retained. Do not publish the dirty root or temporary QA files. Preserve player databases and the published bank when rolling back frontend code.
