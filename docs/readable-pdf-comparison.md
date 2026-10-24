# Readable saved-version comparison

This is a display-only update. The candidate-generation API, source/spec hash checks, published version selection, atomic acceptance, successful allowances and first-generation delivery are unchanged. No new provider call, storage migration or regeneration is needed to compare an existing ready candidate.

## Read the change first

`printedChanges.mjs` compares the current and candidate **verified printed views** returned by the existing workspace endpoint. Feedback text is not a change summary. Checkpoint requests show only their selected checkpoint; whole-game comparisons show changed checkpoint fields and explicitly direct the customer to the complete PDFs for opening, ending and materials.

Document buttons show how many checkpoint fields changed in Player Pack and adult guide. A guide-only change opens the guide view first. Changed passages render as selectable 16px HTML text, with original and proposed wording, semantic deletion/addition marks and a labelled legend. Matching fields are collapsed. A bounded deterministic word diff preserves each side's exact characters and renders text with React escaping, including customer/provider strings that look like HTML. If a document's checkpoint fields are unchanged, say so rather than claim it was improved.

## Inspect the actual files

PDF inspection is optional below the readable comparison. The saved original version stays pinned in its file URL; the candidate URL is pinned to its request. The preview downloads those authenticated PDFs and uses PDF.js to render them locally. Fit width, 100%, 150% and 200% change the display viewport and re-render the page, rather than stretch the old bitmap. Page turns, locating text and zoom reuse the loaded PDF document. Panning works through scroll, touch and mouse dragging; keyboard users can focus the scroll region. Opening/closing the full-screen viewer may re-read the same saved files, but never generates or accepts a candidate.

At widths below 900px the viewer displays one large version with Original/Modified switches, preserving the selected pages and zoom. Wider viewers display both versions. A shared zoom control applies to both documents, and the optional page-sync checkbox applies manual page-turn deltas to the counterpart. Exact source-specific guide page maps are retained. A native modal dialog provides full screen, Escape exit, focus containment and focus restoration. Temporary responsive-testing viewport overrides are reset after QA.

## Locate without inventing a highlight

The Show in PDFs action searches the actual PDF.js text items for the complete current/proposed passage within that checkpoint's page range. Only a unique exact normalized match produces a display overlay; ambiguous or absent text gets an explicit message, never a guessed box. The PDF remains byte-for-byte unchanged. The box marks the changed passage, while the HTML diff identifies exact word edits. Locating each document independently allows guide pagination to differ. Manual navigation away from that page reports the location instead of falsely claiming a visible highlight.

## Acceptance stays separate

The comparison explains the actual changed checkpoint fields before the existing Accept/Keep buttons. Accept still invokes the same existing API and transactional quota checks. Preview switches, text expansion, full screen, page turns and zoom issue no mutation request and spend no successful change. Original files, stored candidates, versions and proof remain untouched.

## Validation

Automated tests cover document/stage scope, guide-only changes, unchanged fields, exact reconstruction of each side from diff tokens, empty/Unicode/punctuation/large inputs, safe HTML rendering, unique wrapped PDF text matches and conservative non-matches. SSR checks establish readable text before optional PDF inspection, labelled changes and all zoom controls.

An isolated local read-only fixture with real saved PDFs was inspected in the Codex in-app browser at desktop and 390×844. Checks included readable 16px mobile text, original/proposed switching, both document roles, accurate passage/page location, high-resolution zoom, synchronized navigation, full-screen/Escape/focus return and no page-width overflow. The fixture's mutation counter remained zero. No private customer order or live provider was used for QA.
