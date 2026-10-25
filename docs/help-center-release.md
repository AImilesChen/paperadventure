# Practical public help — 25 October 2026

The owner approved replacing the early Help prototype with useful guidance and working destinations while retaining the existing palette, type and card system.

The Help hub exposes downloads, stopped-game guidance, order problems/refunds and printing, followed by current-service FAQs and a support contact panel. The existing four guide routes now explain sign-in and order history, ZIP/PDF downloads, order-linked requests, plan approval and delivery recovery, paper-size/printing preparation, and adult-led hosting. No public recovery-email or local-only feedback form remains.

Downloads select My games; finding a purchase selects paid Order history. Problem/refund tasks select paid orders and show the matching action on each eligible order. The selected task survives the sign-in return link. The existing authenticated order page opens its real support form with the correct type. The navigation helper accepts only known task/view values, never a caller-supplied destination. Ownership and request notification continue to be enforced by the existing API.

This is a frontend/content release. No new routes, provider call, purchase, refund, database migration, old-order update or backend/payment-mode deployment is needed. Existing policy, account, sample, game and refund behavior remains authoritative; the new guides explain rather than replace it.

Checks cover declared routes/assets, valid help anchors, useful sign-in return destinations, task whitelisting and removal of misleading public draft/recovery forms. Browser QA covers desktop and mobile layout, native FAQ keyboard expansion, guide navigation and the signed-out handoff after publication. Authenticated support submission and email delivery are not artificially exercised during this release.
