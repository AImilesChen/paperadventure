# 页面与素材再生成提示词（补写版）

这些提示词根据已选概念、PRD、当前代码与素材**重新编写**，供后续 Stitch/Figma/设计工具复现或扩展。它们不是 2026-10-07 首轮出图时的原始输入记录；后续改动需以实际 PRD、已冻结英文文案和本地实现为准。

## 通用页面约束（附在每个页面提示词前）

> Design an English-first, responsive Paper Adventure Workshop page for adults planning printable, cooperative story adventures for children at home or in classrooms. Use pale blue #d8f0fc as the site canvas, navy #0d294f text, vermilion #ec4d35 for the primary action, Nunito Sans for UI and Bree Serif sparingly for world names. Follow the selected papercraft direction in `concepts/03-paper-adventure-workshop-selected.jpg`. Keep all product facts as live HTML text; do not bake headings, prices, ratings, reviews or buttons into illustrations. Use realistic desktop 1440 px and mobile 390 px artboards, with keyboard focus and readable form labels. This is a noindex design preview: payments, finished downloadable packs and custom generation are not live. Do not invent customer quotes, sales counts, endorsements, guarantees, live PDFs or legal terms. Preserve approved copy and SEO headings instead of shortening them to fit a mockup.

## P01 首页 `/en/`

> Split hero: left, the exact H1 “Turn their ideas into an adventure they solve together.”, a concise explanation of ready-made packs versus a new custom idea, and one dominant “Create My Adventure” action. Right, one coherent papercraft adventure scene with a recognisable otter and paper clues. Directly after the hero, a full-width horizontal “Choose a Story World” gallery: 4 cards plus a partial next card on desktop, one card plus a partial next card on mobile. Cards show cover art above live title, short description, and a quiet “Explore this world” link. Provide controls and swipe/scroll affordance, then a separate visible “Have your own idea?” link. Below: three short steps, home/classroom paths, FAQ and the same final CTA. Avoid a dense ecommerce poster, fake reviews and multiple equally strong purchase buttons.

## P02 目录、分类和主题详情

Routes: `/en/themes/`, `/en/for-classroom/`, `/en/occasions/halloween/`, `/en/themes/{id}/` for the six world IDs in `shared/catalog.mjs`.

> Build a calm catalog with search, Home/Classroom chips, a clear zero-results state and a custom-world entry. Each world card separates illustrative cover from status: story inspiration, candidate free sample, or published fixed pack only when data confirms it. Detail pages distinguish “ready-made fixed pack” from “new custom adventure”, including what each buys and whether it is actually available. Show the disabled/unpublished state without a false download or checkout. Use the same world art across gallery, catalog and detail.

## P03 创建器 `/en/create/`

> Four-step desktop/mobile flow: story world or custom idea; Home/Classroom setup; two story-direction examples; review. Classrooms ask for group count. Show required-field errors close to the control, preserve a saved local draft, and present a conflict choice before replacing it with a theme from the gallery. Present custom generation and checkout as planned until backend gates pass. Mobile keeps one form column, a legible progress indicator and a reachable primary action. No child profile or student list.

## P04 样例、价格和权益

Routes: `/en/samples/`, `/en/samples/home/`, `/en/samples/classroom/`, `/en/pricing/`.

> Visually distinguish a single candidate free fixed Celebration sample, other ready-made themes purchased per pack, and a separately priced custom generation. Home and Classroom are distinct editions. Show what Player Pack and Host/Teacher Guide would contain, but label all draft materials as unpublished. Planned prices are US dollars and one-time. The owner confirmed household/one-teacher use and 12 months of online re-download; tax, final legal wording and implementation still need review. No points or subscription. Keep disabled download and purchase states explicit.

## P05 支持、订单、账号与法律

Routes: `/en/help/`, `/en/help/print/`, `/en/help/recover/`, `/en/help/report/`, `/en/checkout/`, `/en/checkout/demo/`, `/en/orders/`, `/en/orders/demo/`, `/en/my-adventures/`, `/en/account/`, `/en/privacy/`, `/en/terms/`, `/en/cookies/`, `/en/refunds/`.

> Keep support and policy pages readable rather than compressed into cards. Order states include checking, preparing, ready and problem/refund; private files never appear merely because the browser returned from payment. Account/email recovery pages distinguish demo notice from actual sent email. Legal pages must prominently say “review-stage” until approved. Design loading, empty, error, disabled, success and permission/verification states, with mobile layouts for each. Do not fabricate successful orders, files, policies or email delivery.

## 素材提示词

**Logo / favicon（矢量重绘）：**

> Create a simple paper-airplane mark for Paper Adventure Workshop as editable SVG. One memorable silhouette, vermilion body #ec4d35, pale-blue square field #d8f0fc and a small navy outline #0d294f. It must remain distinguishable at 16 px and work without a gradient or shadow. Supply standalone icon, wordmark, horizontal and stacked lockups; keep website wordmark text selectable in HTML.

**Hero（新稿方向，原图已存在）：**

> One bright, tactile papercraft tabletop adventure for adults and children: an original friendly otter, folded map, clue papers, small compass and a few natural details. Pale sky-blue background, warm paper, vermilion accents, one focal scene with open edges for a split-layout hero. No readable text, price, stars, mock testimonial, fake PDF cover or borrowed fictional character. Produce desktop and mobile-safe crops; keep the hero asset separate from the website text.

**OG 社交分享图（现成资产可作基准）：**

> 1200×630 share card, warm paper field, small paper-plane mark, navy headline “Stories to solve together.”, compact line “Printable adventures for home and classroom play”, papercraft hero artwork on the right, visible `paperadventure.app` domain. Ensure social thumbnail legibility. Use true HTML metadata, not the hero's square crop as the social card.

**六主题封面（统一系列）：**

> Create six individual 4:3 paper-art world illustrations: Celebration, Dinosaur, Space, Forest, Halloween and Christmas. Each has one friendly focal subject, similar lighting/line density and enough crop safety for a 400/800 px card. Halloween must be playful, not frightening. No baked-in title, CTA, age label, price or rating. These are world-cover illustrations, not screenshots of finished puzzles.

## 审核与复用

每次生成后核对：是否对应 `shared/catalog.mjs` 的真实状态；桌面与手机是否能完整呈现英文文案；图是否没有假商品信息；素材版权/来源是否可记录；整页是否仍保留导航、键盘操作和辅助文字。若用 Stitch/Figma 生成新设计，需另存其实际 Prompt、源稿、导出截图和版本，不覆盖此补写稿。
