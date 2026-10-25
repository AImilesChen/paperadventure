# Theme covers and order-linked support — 25 October 2026

The owner approved fixing arbitrary-theme covers and adding a visible refund entry with operator notifications. Live payments remain enabled; this task never charges a card, refunds a purchase, regenerates a story or rebuilds customer PDFs.

## Cover correction

All 27 historical cover rows reported COVER_NETWORK with no saved provider request. The transport passed redirect:error to Cloudflare Workers, whose runtime rejects that option before dispatch. Both fal API and image-download calls now use redirect:manual and explicitly reject 3xx responses. API credentials never follow redirects or reach the image CDN. Strict queue URL, content, size, hash and one-submission guards remain.

Unknown themes use an explicitly labelled neutral placeholder instead of presenting shared promotional artwork as a generated cover. Matching existing theme art and stored order covers still take precedence.

The owner-approved train and upside-down-hotel checks are limited to the two screenshot orders. A one-use audit preserves their old pre-dispatch failure and releases exactly one actual image submission each, only after the fixed live Worker is available. The recovery SQL cannot run again after a real failure and cannot backfill other orders. No other historical cover is retried automatically. The verification workflow checks two ready private R2 files, distinct hashes and one submission each; visual review follows.

Cloudflare runtime source: [Request redirect parsing](https://github.com/cloudflare/workerd/blob/main/src/workerd/api/http.c%2B%2B). Provider: [fal FLUX schnell API](https://fal.ai/models/fal-ai/flux/schnell/api).

## Support and refund requests

Paid order details and library cards expose Request a refund. The form binds the owner and order, offers a refund reason, records a stable request reference and shows request history. An acknowledged submission means the request was saved, not that a refund was approved or completed. Fully refunded orders display provider-confirmed status.

New cases, evidence and an outbox row commit together. A case-specific submission key deduplicates repeat POSTs. A sending lease prevents concurrent delivery of one notice; failures retry on the existing cron up to eight attempts. The operator email contains the request reference, order, type, description and a verified purchasing email when available from Stripe. No private access token, card data or secret is emailed. A failed Stripe contact lookup does not suppress the notice. Only a new case reserves a notification; historical cases are not bulk emailed.

Cloudflare Email Service has no documented send-idempotency key; an ambiguous provider acknowledgement can still duplicate an email. The case reference stays stable so operators must review the case, never treat an email as a payment/refund instruction. Terminal notification failure is shown on the customer order with email as a fallback. Resend uses its existing idempotency header when selected. The normal path needs no second customer email.

Policy v5 updates only the support-contact description and effective version; previous purchase-bound policy rows remain immutable. New policy publication and the public site wait for the matching support-notification API. Existing Stripe refund reconciliation continues to determine actual refund completion.

## Verification

Tests cover ownership, repeated requests, atomic rollback, notification retry/concurrency, refund non-execution, Workers-compatible no-follow behavior, scoped one-use cover repair, neutral fallback, visible refund entry and existing generation/download behavior. Desktop and 390px mobile form checks use an isolated local fixture that sends no real support request or email. Live two-cover checks use the existing encrypted fal key inside the Worker, never export it.
