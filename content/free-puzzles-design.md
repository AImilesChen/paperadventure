# Free puzzle workshop

Scope approved 4 November 2026: `/en/escape-room-puzzles/`, six original standalone puzzles, online checking, progressive hints, separate A4/US Letter player and adult PDFs, links to existing games. No changes to paid packs, answers, checkout, accounts or generation. Local implementation; production publication is a separate state.

## Design references

Read the following public source, documentation and licenses. The implementation in this project is original; no upstream runtime, sample campaign, story text or illustrations were copied.

- [Mystery Forge](https://github.com/guplem/mystery-forge), [MIT license](https://github.com/guplem/mystery-forge/blob/main/LICENSE): story/task/result organisation, graduated hints, answer-format clarity, checking before publication. Its automated hints check is not a substitute for a human playtest.
- [Simon Tatham's puzzles](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/), [license](https://github.com/ghewgill/puzzles/blob/master/LICENCE): bounded route reasoning and readable rules. We do not embed its C engine or reproduce its game layouts.
- [csurfer/escaperoom](https://github.com/csurfer/escaperoom), [MIT license](https://github.com/csurfer/escaperoom/blob/main/LICENSE): lightweight story/puzzle/hint/answer structure. No new Python/Django service is required by the web page.

The shared `free-puzzles.mjs` is the source of truth for wording, clues, diagrams, accepted answers, online cards and PDF source. `tests/free-puzzles.test.mjs` independently enumerates queue arrangements, evidence candidates and harbour routes and traces the letter path. Puzzle 1 infers a key from shared symbols; its 24 label assignments and all 720 letter bijections are enumerated. The second cipher is derived from its supplied alphabet rows.

## PDF rebuild

1. Run `node scripts/prepare-free-puzzle-art.mjs <path-to-sharp-module>` with sharp available (the Codex bundled Node dependencies include it). This creates six 4x diagram PNGs and a data snapshot under `tmp/free-puzzles-build`.
2. Run `python scripts/build_free_puzzles.py` with reportlab installed. The Codex bundled Python includes reportlab. Four stable PDFs are written under `public/assets/free-puzzles/` and shipped by the normal static build.
3. Check each PDF's paper dimensions, page count and separation, render using Poppler and inspect the current pages before delivery. Fixed outputs do not require PDF tooling in production or in the frontend CI.

## Interaction and measurement

Moves, undo history, hints and completion are saved in this browser using the versioned workshop key. No email/account/server storage or provider call. The edition-3 stamp investigation resets only the obsolete first-puzzle save; the other five remain intact. Client-side answers are intentionally inspectable; this is a free learning activity, not a secure exam. Viewing a solution does not itself count as solving; a later successful check is labelled solution-assisted. Switching puzzles keeps their state.

Use the existing independently opted-in basic/consented enhanced analytics path. New events accept only fixed puzzle IDs, assistance enums, paper/file enums or game-destination enums. No typed answers or clue text is sent. `puzzle_attempt` records the first explicit final check; `puzzle_solved` includes assistance and is not a purchase conversion. `puzzle_pdf_download` means the response was received and a browser download initiated, not proof of saving or printing. Dashboard custom goals and live ingestion are not configured by this code change.

## Content boundaries

The six puzzles are a new free resource, not a new paid game. Preserve the existing full Home/Classroom adventures and their product facts. Do not claim physical playtesting, educational gains, runtime estimates, Google indexing or ranking. Player sheets have no printed solutions; the separate guide has all hints and explanations. All diagrams use shapes/text in addition to any colour.


## Puzzle 1 revision - 7 November 2026

The owner approved replacing the direct OAK lookup with a two-stage investigation, The rain-soaked post office. No competitor content is used in this revision.

Four old records: A diamond-triangle-star-cross; B cross-triangle-diamond-star; C star-triangle-cross; D circle-triangle-square. Loose labels are deliberately shuffled: PALM, OAK, LAMP, MAP, with short meanings. Each is used once. The same shape always has the same letter and different shapes have different letters.

The only consistent assignment is A=LAMP, B=PALM, C=MAP, D=OAK. Guessing A=PALM makes B read MAPL and contradicts the remaining labels. Successful checking unlocks a new letter: cross-circle-circle-diamond, which decodes to POOL. Matching alone does not count as completing the puzzle. The new key is shown only after a successful archive check, never as an initial lookup table.

Online play supports click/keyboard label placement, swaps, clearing and undo; contextual contradiction messages; a restored key; four final answer slots with a letter bank and keyboard; return to matching; three hints and confirmed solution viewing. Opening the explanation never fills or completes the puzzle. Editing a record invalidates verification and clears the final answer. Browser saves preserve the checked stage and entered destination. Completion is independent, with hints, or after viewing a solution.

The first player page and guide pages 1-2 are revised in both paper sizes; each pack remains six player pages plus a separate four-page Adult Guide. Unaffected player pages 2-6 and guide pages 3-4 retain text, drawing commands and image bytes, apart from generated image resource identifiers. Physical printing and independent child/family playtests are not claimed.


## Compact workbench and demo credits - 7 November 2026

The owner requested a one-screen desktop workbench and visible text descriptions, then approved a local credit-help preview. Essential rules and A-D text clues are always displayed; no important clue is behind the old printable-reference disclosure. Duplicate diagram/copy and idle feedback space are removed. Undo/restart sit with the clue column. The first and second stages fit at1280x720 (about633px and670px high respectively); phone layouts retain readable controls and vertical scrolling.

The local demo uses eight sample credits, free first hints, further hints at1 and2 credits and a full solution at5. A full solution includes all three hint tiers. Quotes and cancellations do not spend; repeated reads, refresh and puzzle restarts do not rebill the same edition. Completion classifications are preserved. These are demo settings, not a live account balance or approved commercial price list. See content/puzzle-credit-preview.md for the required server/payment/content boundaries before real sales.

No PDFs or other public assets are changed by this compact-layout/credit-preview revision. All201 remain identical to the approved stamp-investigation-v3 snapshot. The earlier four revised PDFs remain part of the full pending release.


## Game-first entry - 7 November 2026

The owner requested that opening the resource should lead directly to playing. The workbench is now the first main section. A compact page title, native six-puzzle selector, previous/next buttons, solved count and print link replace the large pre-game hero and card grid. New visitors start with puzzle1; returning visitors retain their saved active puzzle and moves. The selector waits for saved-state restoration, supports keyboard operation and does not take focus away on each selection.

Case headings sit with task and clues; nonessential story context and storage management follow the game. Required first-case rules and A-D descriptions remain visible. The old promotional preview, intro, complete-game recommendations, print downloads and FAQ remain after the playable area. The base URL has no automatic scroll-to-game workaround: the source order itself is game first, with one H1. Explicit deep links and switching are preserved.

Measured at page scroll0: both stages, site header, navigation and help fit1280x720 and the current677x884 browser viewport (662px content width). At620x884 stage2's primary submit fits, but the whole card may extend below the fold. Phones390/320 keep readable normal vertical scrolling. All14 phase/viewport cases have no horizontal overflow. The lower promotional sticker was inset on narrow screens to remove its6px overflow.

Real browser checks: first label placed at scroll0 without a Start button; all six choices and keyboard controls; previous/next; restored forest progress after opening the base URL; retained first-puzzle moves; print jump; cancel/confirm clear; full POOL completion independently and completion-next navigation; credit quote cancellation with balance8 unchanged. Production-build browser confirms game-first markup and free hints with no demo credit controls. No puzzle rules, actual billing or public assets changed from v4.


## Clear premise and readable hierarchy — 7 November 2026 (current)

This revision supersedes the earlier compact typography and screen-fit measurements. The first question is now “Which word matches each stamp record?” with the always-visible premise: “Each row is one of these four words written in symbols. The word labels have been shuffled.” Two visible rules explain the shared one-to-one substitution code and using each word once, left to right. Stage 2 changes the question to the new letter’s destination. Essential information is never gated behind hints or payment.

Question 28px (26px on phones), premise 17px, rules and operation 16px, word tiles 22px (20px on phones). The visible duplicate A–D transcription and irrelevant word meanings are removed; each symbol row keeps its descriptive accessible name, and the shared print model/201 public assets are unchanged. One dynamic instruction replaces duplicate selection messages. Case name and tools are secondary.

The desktop1280x720 first-stage card fits the initial viewport. The677x884 window retains the full first-stage card with readable typography and compact one-line rows; second-stage submission fits, while its complete help area can require scrolling. Phone390/320 intentionally use vertical scrolling. Five final first-stage widths have no horizontal overflow. Actual browser checks covered incomplete feedback, keyboard matching and final POOL completion, reload and selector restoration, undo, credit quote cancellation without debit, and production free hints/no demo wallet. Final build/hydration and static145 checks passed. Local preview only; no publication or real charging.


## Missing delivery route — 7 November 2026 (edition 4, current)

The second stage replaces the earlier POOL lookup. First-stage records and unique key are unchanged. After verifying them, players decode place names in records 1 and 3 and arrange five stops using all five constraints. The shuffled bank is LOOM, POOL, OAK, PALM, MALL. All stops are used once; the post office does not take a slot. The only solution is OAK > MALL > POOL > LOOM > PALM; the letter is delivered to PALM.

Shared postalClues/parts supply the encoded evidence, readable record text and solver constraints. Exhaustive120 permutations prove uniqueness; omitting any condition permits multiple routes. No per-position correctness indicators or automatic checking. Check reports a single violated record. Click, keyboard and native HTML drag are implemented. Any adjacent pair selected by the player can be linked and moved together; pair creation never certifies correctness. Undo includes route/group/notes/read-mark changes. Notes are explicitly not checked.

Stage 2 keeps question28px/phone26, body16-17px, visible evidence and an earned reference key. On narrower screens a compact sticky key accompanies the evidence. Undo/restart sit beside route submission; View the five records links back to evidence. Correct completion plays a brief letter-delivery animation, with a static final state under reduced motion. Normal vertical scrolling is intentional; all five clues and controls are not promised to fit a phone screen.

Each phase has its own three-hint read count. Help-tier entitlements are shared across phases of this edition, so already unlocked tiers are not charged again; existing demo prices and DEV/local-only gate are unchanged. The full explanation includes both phases and never fills or completes the route.

Edition3 saves retain valid archive labels and checked keys. The former POOL completion is recorded separately and cannot complete the new route. Earlier assistance stays recorded, new route hints start at0, and the other five puzzles are retained. Older direct OAK-lookup saves still reset only puzzle1.

Print packs now have7 player pages (two for the post office) and5 guide pages. The new player route page contains encoded records, five-place bank, route blanks and final-destination blank, with no solved key or route. All24 PDF pages rendered and reviewed in A4/Letter. Existing197 non-PDF public assets are byte-identical to v6.

Final build/hydration and151 static checks passed. Real browser independent/solution-assisted completion, errors, click/keyboard, linked movement/undo, reload/selector restore, mobile undo and evidence return, credit quote/cancel/spend/disclosure, completion animation and production free hints verified. Six widths320-1280 have no horizontal overflow. Native drag gesture, physical printing, full screen-reader review and independent family difficulty/timing tests remain unclaimed. Local preview only; no deployment or real commerce.


## Stacked task/evidence/route layout — 7 November 2026 (current)

This revision reorganises the post-office screen without changing edition4, puzzle conditions, help prices, save schemas or PDFs. Both phases use a full-width task and stage header. The route phase follows task > compact earned key > five expanded evidence cards > place bank and route > check/tools > quiet help > optional notes. Desktop evidence uses3+2 cards; medium2+2+1, phone1 column. Question28px/phone26, premise17px and evidence16px. The earlier fixed left/right columns and repeated case title/number are removed from this case. Other five puzzle mechanics remain as before; navigation and help/action styling stay consistent.

Notes and reading checklist move into a closed-by-default My notes disclosure with saved counts. Required rules and evidence are never collapsed. Stage1 can be reviewed from the header, retaining labels/route until a label actually changes. Stage1 checking/undo/restart are grouped below its two-column desktop records.

Route selection is explicit: choose a bank card or occupied position, then choose a target. One Remove selected button replaces five Clear buttons; selecting a linked pair removes the pair, while removing an unrelated stop preserves that pair. Empty selection cannot be removed. Visual and keyboard action order agree. Pair creation appears only when neighbouring occupied positions exist; mode-specific help appears on entry. Mobile has read/arrange anchors, an earned sticky key during evidence reading and nearby undo/remove/restart.

At initial1280x720/scroll0, all five evidence cards, route positions and main check button fit (route bottom663.11px/check bottom718.11px). Help and optional notes may require scrolling at this height. At1280x900 the full initial workbench fits. Phone scrolling is intentional. Six widths per phase plus five other puzzles at desktop/phone produced22 no-horizontal-overflow checks.

Actual browser checks: first-phase matching and review/recheck; route selection/swap/group movement, single/pair removal and undo; removing an unrelated stop preserves the pair; notes/read marks reload and default closed disclosure; cross-puzzle saves and forest move restore; independent route completion; restart cancel/confirm; mobile jump/place/remove/undo; credit quote cancellation keeps8 samples; production free hints in both phases/no sample UI and one H1. Final build/hydration and151 static tests passed. All201 public asset bytes and all shared models are identical to postal-route-v7. No remote publication, actual commerce, new game rules or new PDF edition. Native drag gesture, full screen-reader review and family testing remain unclaimed.


## First puzzle, second stage only — 7 November 2026 (current)

The owner clarified that “second level” means the route phase within puzzle01, formerly The secret stamp and now The rain-soaked post office. Puzzle02 is out of scope. This implementation branches from puzzle-stacked-v8 and excludes moon-simple-v9.

The route phase now follows an explicit visible How to play, restored key, five delivery records, five answer positions and Check delivery route. All necessary clues remain expanded. Before permits gaps; immediately after means the next stop. Record1 removes repeated prose while retaining the same condition. Place cards and numbered answer positions have clear instructions, selection and placement counts. A placed card swaps with an occupied destination; a new card replaces it. No pair modes or translation/checklist tools are rendered. Remove appears only for a selected placed card and names that card. Confirmed Clear route retains the first-stage key, matches and help entitlements; it supports Undo. Legacy working pairs never become a hidden mode. Stored notes remain preserved by the unchanged model. The first route hint now describes keeping consecutive stops together without referring to a movable-pair control.

The five constraints, unique route, edition4, scoring, save model, credit prototype and PDFs are unchanged. First-stage component and other five board functions are byte-identical to v8. All201 public asset files, including10 PDFs, are byte-identical. Only first-puzzle route hint text changes in shared content. No release or real payment was requested.

Final build/hydration and151 existing static checks pass, including all120 route permutations and constraint necessity. Browser checks covered first-stage entry, incomplete/invalid route feedback, keyboard swaps, selection/removal/Undo, reload retention, independent correct completion, cancel/confirm Clear route and first-stage retention. Five responsive widths320/390/677/947/1280 showed no horizontal overflow and no menus or collapsed clue sections inside stage2. Production build retained free hints, no demo credit UI and no console errors. The retained preview is archive checked and blank route. Phones scroll vertically; a whole-screen fit is not promised. Native drag, physical printing, screen-reader audit and independent first-time family usability remain unclaimed.


## Postal game visual hierarchy — 8 November 2026 (current)

Canonical snapshot is tmp/postal-visual-v11, based on postal-stage-two-v10. Scope is game01 only, with its two internal stages. Rules use grey, restored key lavender, evidence warm cream, answers white/dashed and selection navy plus text. Error/success use text and red/green panels. Stage labels explicitly say GAME01 and STAGE1/2 OF2. Stage1 removes repeated Clear controls, adds contextual named removal, placement status and conflict-record outlines. Verification shows the earned key and an explicit Continue button. Review retains route and offers Revise matches; editing still invalidates the route as before. Route failures highlight only the referenced record, never supposedly correct positions; editing clears prior error. Help has a quiet labelled section. All puzzle rules, schemas, hints, credit rules, PDFs and other five board components remain unchanged.

Build/hydration and151 static checks passed. Actual browser wrong symbol assignment (A/B/C highlighted), correct archive and earned key, explicit continuation, wrong-route record5 outline, correction/independent completion, contextual removal/Undo/reload, clear/review/revise retaining the partial route, reset and production free hints in both stages were checked. Production had no demo credits or console errors. Responsive checks cover320/390/1280 for both stages, with no horizontal overflow. Phones scroll vertically. Native drag, full screen-reader auditing and independent child/family usability testing are not claimed. No publication or real charge. The retained preview starts with blank stage1 and8 sample credits.


## Game02 Moon signal rescue — 8 November 2026 (current local design)

Scope is the independent second game, not a phase of the post office. Canonical pending source is tmp/moon-signal-v13, based on the sources published by PR161. Game01 and games03–06 are retained. A single continuous task replaces the old red-star message: infer the equal forward shift from MOON > PRRQ, restore a decoder, decode VRO HDVW, select one of ARC/ION/SOL/ZEN and one compass direction, and send. All26 shift values and16 antenna/direction combinations have exactly one valid combination:3/SOL/EAST. Alphabet wrap is explicit. Calibration input is an answer, not an unexplained rotor. A checked rule becomes a compact summary with an explicit review action. Notes are optional, repeated cipher letters update together, and notes never gate or grade completion. Correct result shows the rescue link, signal pulse and ship arrival, respecting reduced motion.

The Moon edition2 model has checked calibration, bounded draft, antenna and direction. Wrong shift cannot remain calibrated. Legacy red-star saves reset only Moon state; old completion is separately retained, other five games stay unchanged. Existing demo entitlements remain available without automatic spending; real payments are unchanged. Contextual first hints change once the rule is checked. Production builds keep free help and exclude the DEV/local demo wallet.

Four A4/Letter packs now include the new Moon task and explained answer. All24 pages rendered and reviewed, with full-size review of the changed Letter player/guide pages. All other PDF page text matches PR161 packs. Player sheets contain no plaintext SOL EAST answer. Build/hydration and155 tests passed. Browser tested wrong/correct calibration, linked draft letters, wrong/missing selections, independent completion with largely empty drafts, reload restoration, Undo, restart and mobile completion.320/390/1280 layouts had no horizontal overflow; final320 header25px. Production preview verified free/contextual hint, no sample-credit controls and no console errors. Preview retained blank shift/0of6/8 samples. No remote publication. Native dragging is irrelevant; independent children/family timing, full screen-reader audit and physical printing are not claimed.


## Game02 evidence-led discovery — 8 November 2026 (supersedes Moon v13)

Canonical local source is tmp/moon-evidence-v14, preview localhost:5571/en/escape-room-puzzles/#signal-shift. This remains the independent second game; game01 and games03–06 are preserved. Players compare three original/received records (NOON/QRRQ, SUN/QXV, STAR/UDWV), propose a common method and test NFRG. Initial instructions disclose only consistent processing, separate words and unchanged word order/counts. There is no numeric shift question or automatic rule reveal. The intended method reverses each word then moves each letter forward3; the first palindrome supports a tempting incomplete hypothesis, the second disproves shift-only, and the third distinguishes full reversal from endpoint swapping. Enumeration of those three operation families and26 shifts leaves one fit; arbitrary cipher uniqueness is not claimed.

DOCK checks the test, unlocking ORV WVDH. Final antenna SOL and EAST completes rescue. Optional transcription notes are saved but never graded. Hints progress from comparison to partial evidence to complete method. Edition3 invalidates both earlier Moon editions, preserving earlier completion separately and all five other game saves. Existing hint/credit prototype remains, with no real commerce and free production hints.

Build/hydration and156 static checks passed. Browser covered hidden initial rule, wrong/correct test, wrong/missing targets, independent completion with empty notes, reload, Undo, restart cancel/confirm and320px completion.320/390/1280 checks have no horizontal overflow and no internal menus; phone vertical scrolling is intentional. Production build has free help, no demo wallet or console errors. Four PDFs updated, all24 pages rendered/reviewed; other20 pages retain prior text,197 other public files retain bytes. No deployment, physical printing, full screen-reader audit or independent child/family timing test. Preview retained blank test/0of6/8demo credits.


## Game02 single complete puzzle — 8 November 2026 (supersedes v14)

Owner removed the second stage. Canonical local source is tmp/moon-single-v15, preview localhost:5573/en/escape-room-puzzles/#signal-shift. Keep all three records and hidden reversal/shift method. NFRG is now explicitly the final received message and its original word is the rescue meeting point. One answer field, one Check answer button and Enter submission lead directly to communication restored, completion and the next-game entry. There is no calibrated gate, additional instruction, antenna, direction or transcription menu. Initial rules do not reveal the method. Evidence uses cream cards on grey; final-message/answer panel uses lavender. Initial1280x720/scroll0 answer/control bottoms624/708px; phones scroll. Existing hints, undo, confirmed restart and assisted-result distinctions remain.

Edition4 stores only answer. Edition3 test-word progress/history becomes the final answer, while existing hints and completion are retained when valid; a checked test alone never auto-completes. Earlier unrelated Moon rules still reset only Moon and preserve their earlier completion separately. Other five games are retained. All four print packs use the same final answer DOCK with no residual second-stage tasks, and player answer/guide separation is verified.24 PDF pages rendered, other20 page texts unchanged,197 other public assets identical to v14. Post-office components/model and other four board functions remain unchanged.

Build/hydration and156 static tests pass. Actual browser covered incorrect/correct answers, direct Enter completion, completed reload, partial-answer reload/undo, next-game entry, restart cancellation/confirmation and320px completion.320/390/1280 show no horizontal overflow; one input/no internal menus. Production preview has free hints, no demo wallet, correct hint-assisted completion and no console errors. No publication, real charge, physical print test, full screen-reader audit or independent child/family usability/timing validation. Retained preview is blank answer,0/6 and8 demo credits.


## Game03: The blocked loading bay — 8 November 2026 (canonical local version)

Canonical source tmp/loading-bay-v16 contains the owner's approved Moon single-puzzle version plus the new independent third game. Preview localhost:5575/en/escape-room-puzzles/#parcel-queue. Retain the old hash/internal ID for existing links. The former four-word queue is replaced by an original5x5 board with X/A/B/C/D/E/F/G crates. Horizontal crates slide horizontally; vertical crates vertically; no rotation, overlap or jumping; only X leaves at the right of row3. Initial rows: DDFF.;..CC.;XXBE.;G.BE.;G.AAA. There is one board and no second stage, timer, typing or check button. Any legal solution delivers X automatically at the right boundary, followed by exit feedback and next-game entry.

Click a crate then a numbered landing marker, optionally drag or focus a crate/use axis arrow keys. Marker numbers are distances; hovering/focusing previews the whole destination footprint. Blocked moves explain the blocker without recording a move. Undo, confirmed restart, browser saves and completion assistance labels remain. The selected crate/landing controls are scoped to this board; no additional menus. Rules always visible, red X and directional arrows/letter IDs convey meaning without colour alone. Initial1280x720 task/rules/board/tools fit with tools bottom717px; help lies below. Phones scroll;320/390/1280 have no horizontal overflow. Full print play requires adult cutting; online play needs no printout.

Shared model enumerates121 reachable states. Every state can reach delivery; initial shortest solution8 slides. Movement checks the full path, preventing jumps. Save positions must belong to this connected state graph. Hints are recalculated from the current position: exit blockers, useful crate, executable next move; unlocking hint3 highlights rather than executes it. Full solution is an independent step-by-step board that never moves the player's board; completed games review the initial layout. Legacy queue results reset only game03 and are recorded separately. New help edition2 cannot reuse obsolete queue hints; demo wallet prices and real commerce are unchanged. Other five game saves stay intact.

Four A4/Letter packs now have8 player/6 guide pages. Bay board is player4, cut-outs player5, explained moves guide4. Eight cut-out rectangles match the actual board-piece dimensions in each PDF; cell26mm at100%.28 pages rendered and visually reviewed;18 other puzzle pages retain text ignoring pagination,197 other public assets unchanged. Physical printing/cutting/handling is not tested. Post-office and Moon components/models/styles are byte-identical to v15; game04–06 board functions unchanged.

Final build/hydration and161 static checks passed. Browser independent desktop/mixed-keyboard completion,320px all-click completion, native mouse drag, blocked movement, reload/Undo (including completed undo), restart cancel/confirm and next-game entry passed. Production preview checked free hints/no demo wallet, current-state hints, solution disclosure/cancel/forward/back demonstration, after-solution completion, completed review and no console errors. Separate local demo origin checked quote cancellation keeps8, solution unlock5 leaves3, reopening costs0, and demo board preserves the actual puzzle. Retained preview starts at the original layout,0of6,8 samples and no opened hints. No remote publication, real payment, independent family usability/timing validation or full screen-reader audit.


## Game03 challenge revision — 8 November 2026 (supersedes v16)

Owner found v16 too easy and requested a larger game screen and clearer text/tools. Canonical local source is tmp/loading-bay-v17, preview localhost:5577/en/escape-room-puzzles/#parcel-queue. Original6x6 layout has11 crates,906 reachable states, all solvable, and an18-slide shortest solution (previously5x5/8slides). It requires moving X left and later right and returning several blockers to earlier spaces. No timer, required optimum, new stage or extra control mode. Shared reverse distance map makes current-state hints deterministic and fast. Edition3 resets only obsolete game03 layouts, retaining previous completion separately; other five saves are untouched.

Desktop board427px at1280x720, previously254px. A narrow right panel groups compact rules, Undo/Restart and help. Main board remains the focus. Phone/tablet rules precede the board; tools follow beneath. Rule text shortened without hiding required instructions. Production explanation spans the full workbench; the demo remains separate from the actual puzzle. Legal landing markers, drag/keyboard capability, automatic completion, undo and saves remain.

Four PDFs synchronised:8player/6guide pages per format,28 total. Player4 has6x6 board;player5 has11 matching cut-outs;guide4 has18 explained moves in two columns. Actual PDF rectangles match23mm grid cells at100%. All28 pages rendered;20 other puzzle pages retain prior text.197 other public assets unchanged. First two game components/models/styles and game04–06 board functions remain byte-identical.

Build/hydration and162 static checks pass. All906 reachable states and current-position hints tested. Browser desktop and320px all-click18-move independent completion passed; midpoint reload, completion Undo, reset,390px layout and no horizontal overflow checked. Production free hints change A-down to C-down after the first slide; current-state step demo works without changing the real board; no console errors. Retained preview is initial layout,0of6,8demo credits, no opened hints. No publication or real charge. New-layout physical printing/handling, independent family difficulty/timing, full screen-reader audit and physical touch dragging untested.
