# Paper Adventure Workshop — UI design handoff

Updated: 2026-10-08. This package describes the **noindex design preview**, not a released store.

## Product and chosen direction

- Product baseline: [`../../故事冒险网站_整合PRD_v1.3_商品定价文案合规.md`](../../故事冒险网站_整合PRD_v1.3_商品定价文案合规.md).
- Audience: English-first parents, party organisers and teachers in the US and Europe, with global reach planned.
- Three explored directions: [`01 Story Atlas`](concepts/01-story-atlas.jpg), [`02 Storybook Theatre`](concepts/02-storybook-theatre.jpg), and [`03 Paper Adventure Workshop`](concepts/03-paper-adventure-workshop-selected.jpg). The owner selected direction 03 on 2026-10-07.
- Selected composition: split hero, light-blue papercraft art, vermilion primary action, then a horizontal story-world gallery with four full cards and part of the next visible at desktop width. The site uses live text and interactive controls over generated raster art.
- Product promises in concept art were revised in the implementation where actual packs, prices, downloads and generation are not yet live.

## Source and design system

The runnable implementation is in `../src/`; `../index.html` is the entry template. `../scripts/generate-static-pages.mjs` generates 30 route-specific pages in `../dist/client/`, including the home, catalog, theme, pricing, creator, help and legal preview pages. This React/Vite implementation is the working equivalent of the manual's separate `landing.html` and keyword HTML files; it is not a Tailwind/Stitch export.

| Element | Current choice |
| --- | --- |
| Main background | `#d8f0fc` pale blue |
| Primary text | `#0d294f` navy |
| Main action / icon | `#ec4d35` vermilion |
| Card background | warm white / cream |
| Main UI font | Nunito Sans, locally bundled by the build |
| Editorial accent | Bree Serif on story-world names |
| Hero | asymmetric copy and papercraft collage |
| Icons | Phosphor UI icons; custom paper-plane brand mark |
| Primary component styles | `../src/styles.css`, `../src/productPages.css`, `../src/extended.css` |

## Brand and review assets

- Brand icon: [`../public/icon.svg`](../public/icon.svg). The same mark appears in the site navigation and browser tab.
- Browser icons: `../public/favicon.ico`, `../public/favicon-16.png`, `../public/favicon-32.png`; iOS icon: `../public/apple-touch-icon.png`; large icon: `../public/icon-512.png`.
- Social preview: [`../public/og-image.jpg`](../public/og-image.jpg), 1200 × 630. `og:image` and `twitter:image` point to it in generated pages.
- Hero and theme art: `../public/assets/`. The hero is `hero-workshop.png`; six theme illustrations are separate assets.
- Visual comparison: [`../qa-comparison.png`](../qa-comparison.png), [`../qa-cards-comparison.png`](../qa-cards-comparison.png), [`../qa-impl-mobile.png`](../qa-impl-mobile.png), [`../qa-impl-mobile-gallery.png`](../qa-impl-mobile-gallery.png). Other page screenshots and detailed findings are indexed in [`../design-qa.md`](../design-qa.md).

## Design and implementation checks

The selected desktop concept and responsive mobile layout were compared in Codex's in-app browser, as recorded in `../design-qa.md`. The 2026-10-08 static build adds favicon, Apple touch icon and social-card references to the generated HTML. `npm run build`, `npm run test:static`, and `npm run test:sites` pass locally. `npm run package:preview` produces `../output/paper-adventure-preview.zip` for Cloudflare upload.

The preview still intentionally blocks broad indexing and does not provide real checkout, playable downloads or custom generation. The front-end and release state are detailed in [`../FRONTEND_HANDOFF.md`](../FRONTEND_HANDOFF.md).

## Remaining design-document gaps

The manual's competitor **visual** comparison table and original page-generation/Logo/OG/Hero prompts are not preserved as a reviewed deliverable. A separate competitor **pricing** study exists in the root project, but it does not substitute for a visual comparison. The chosen concept, rendered pages, screenshots, brand files and build are now bundled or linked here. Before calling the original design-process checklist fully complete, record that visual research and the original prompts if they can be recovered; do not invent them retrospectively.
