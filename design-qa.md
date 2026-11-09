# Sudoku levels v39 — scoped design QA

final result: passed

## Source and accepted change
- Source visual truth: ../sudoku-levels-v38/tmp/qa/product-design-audit/01-entry.png, 02-chapter-footer.png, 05-learning-cards.png.
- Target: preserve this existing site and apply the user-approved audit recommendations: right-aligned teal chapter action before a quieter future notice; remove duplicate action copy; reduce supporting reading card weight while retaining technique examples.
- This is a scoped revision of the captured site, not a pixel clone of the old layout. No new visual direction, template, raster asset or icon replacement.
- Implementation: tmp/qa/entry.png, chapter-footer.png, chapters-expanded.png, teaching-examples.png, learning-hierarchy.png, mobile-chapters.png.
- Captures: 1265 x 712 pixels for source and desktop implementation, same browser viewport/density; no image rescaling before comparison. Content shell measured 1140 CSS px. Responsive frames measured 390 and 320 CSS px; not device emulation.

## Combined visual evidence
- Full-view side-by-side: tmp/qa/entry-comparison.png, footer-comparison.png, learning-comparison.png.
- Focused, aligned content crops: tmp/qa/footer-detail-comparison.png, examples-detail-comparison.png, support-detail-comparison.png.
- Teaching screenshots include different document scroll positions due to changed section heights. Aligned component crops compare the same collapsed example state; do not infer exact pixel fidelity from the full-view learning sheet.
- Source footer has keyboard focus visible; final pointer capture does not. Keyboard focus was separately checked and remains visible. This is an interaction-state difference, not a palette difference.
- Entry content pixels remain identical outside scrollbar gutter (difference bbox 1248,136 to1264,152).

## Findings and five fidelity surfaces
- Fonts/typography: existing font families and core game typography retained. Supporting headings reduced to21px, example captions increased12px and narrow candidate notes11px. No observed clipping in representative states.
- Spacing/layout: core 1140px edge retained, action right edge matches card edge,44px height,12px list-to-action gap; future notice after action. Final expanded chapter spans full row. Mobile full-width action and stacked supporting sections checked.
- Colours/tokens: collapsed #2f6b5d/white contrast6.21:1; expanded #e3eee7/#285e53 contrast6.27:1. Gold game action unchanged. Future notice retains a quieter purple cue.
- Image/asset fidelity: existing logo, Phosphor icons and shared teaching diagrams retained. No raster image substitutions or custom decorative assets introduced.
- Copy/content: quantity-free View all chapters/Show fewer chapters; duplicated helper removed. Actual technique names replace repeated stage title plus redundant technique-label line. All descriptions,100levels,independent diagrams,rules,saving,FAQ and real destinations retained.

## Interaction checks
- Five visible chapters by default; ten after expand.
- First newly shown chapter receives focus; Enter collapse returns to five; focus-visible outline works.
- Locked level100 remains aria-disabled when inspected.
- Desktop last chapter spans1140px; collapsed action right edge1202.5 matches shell edge.
- 390/320 content widths have no horizontal overflow, collapsed or expanded. Mobile button296px x44px at320width; candidate example262px wide/260px scrollWidth, deduction opens.
- Narrow supporting sections stack with no left border and296px content width.
- First-row bottom717.95px unchanged. Console errors observed at final desktop check:0.

## Comparison history
- Initial implementation comparison: no actionable P0/P1/P2 differences from the approved scope. No visual fixes were made in response to this comparison. Earlier work in v38 is source evidence, not claimed as a QA iteration.
- Local test harness body-key and cross-frame DOM access were unsupported; frame-scoped locators and documented browser scrolling completed the narrow checks. These were automation limitations, not product defects.

## Implementation checklist
- [x] Capture and compare source/current in the same visual inputs.
- [x] Apply approved position, order, colour and hierarchy changes.
- [x] Verify responsive interaction and visible focus.
- [x] Production build75routes/46sitemap/bootstrap parity and217static checks pass.
- [x] Public HTTP matches builtHTML, public content and canonical retained.
- [x] Local progress, wallet and first-clear records preserved; no fixture rewards or production writes.

## Limits / follow-up polish
- No full screen-reader,200%zoom,real-device,independent player or traffic/indexing outcome audit claimed.
- No remaining observed P0/P1/P2 issue in the scoped revision. Additional user aesthetic feedback can guide a later pass.
- Local only; not published. Preview5629 now serves v39, API5632. Weekly remains retired.


## Sudoku bank phase 1 v40 — local only

Preserved the released v39 layout and board emphasis. Added a compact collection selector above the existing chapter map, with ranges derived from published metadata. Each collection keeps the existing current-chapter-first layout and chapter toggle; future additions do not append an unbounded list. Later chapters have distinct descriptive titles and honest candidate-pair practice labels.

Observed desktop collection switching, locked later levels, current-collection return and total-only leaderboard. A separate local QA database verified actual level 100 completion, automatic transition to101, a one-point hint purchase on101, a verified101 clear and total rank101 after opt-in. No synthetic scores remain in the delivery database. The original two-account logical snapshot was restored exactly after local identity-link cleanup.

At measured usable widths390 and320, content had matching client/scroll widths with no horizontal overflow. Both native collection selectors worked. This visual inspection preceded shortening their option labels; the final desktop screenshot and12 final UI tests use the shorter labels. App console errors:0. Screenshots: tmp/qa/levels-final-preview.png, leaderboard-hinted-clear.png and levels-390-320.png.

230 static/431 backend/4 Sites/13 readiness checks,300+100 independent stock validation,75-route build/46 sitemap/bootstrap parity and API/site Wrangler4.149.0 dry-run bundles passed. The public browser bundle contains no published or reserve givens/solutions. No live deployment or remote scheduler activation was performed.
