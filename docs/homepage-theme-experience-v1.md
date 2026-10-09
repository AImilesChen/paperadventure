# Homepage and theme navigation design · 2026-10-09

## Goal

An English-speaking visitor should immediately understand that Paper Adventure offers themed printable story games for home and classroom, find the two free Celebration trial editions, and distinguish these downloads from other theme concepts and custom creation.

## Navigation

- First desktop and mobile item: **Themes & activities**, linking to `/en/themes/`.
- Keep **Free printable** prominent and take it to the Celebration Home download. The destination offers an obvious Classroom switch.
- Keep the **Create an adventure** primary action on desktop; add its route to the mobile menu.
- Preserve How it works, Pricing, Help, account and legal access.

## Homepage order

1. Shorter papercraft hero with the product proposition and two actions: explore themes or get the free Celebration games. Keep the selected light-blue concept art.
2. Horizontal gallery immediately after the hero. Six illustrated cards show a concrete story title and mission. Celebration alone carries the free-printable label when the API confirms publication.
3. Celebration spotlight with separate Home and Classroom story cards, each linked to its corresponding download page. Show the free price only when the API confirms the sample is published.
4. Custom-creation explanation: choose a world, describe the players, preview a direction. Route to the creator.
5. Home/Classroom format paths and concise answers.

## Product-state language

- Celebration Home and Classroom: downloadable free trial only when `/api/v1/health` reports a free sample.
- Other five worlds: themed story concepts and custom-creation starting points. Do not present their ready-made files as released.
- The custom payment path is Stripe test mode for the designated tester; no public live-payment claim.

## Responsive and QA criteria

- At 1440px and 390px, the theme entry and free path are discoverable without searching the footer.
- Mobile menu exposes both themed activities and custom creation, is keyboard operable, and closes on Escape.
- Gallery shows three focused desktop cards, two on a tablet and one plus a peek on mobile. It advances one card automatically every 4.8 seconds, wraps to the beginning, and provides arrow and pause/play controls. It pauses while hovered, keyboard-focused or being swiped; reduced-motion users start with autoplay off. Controls have accessible names, and the page has no horizontal overflow.
- Both Celebration spotlight links reach the appropriate sample route. Existing page, link, broken-image, accessibility and free-download checks remain green.
