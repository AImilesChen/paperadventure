# Policy, purchase-copy and payment-release readiness

This change addresses QA LEGAL-01, RIGHTS-01 and RELEASE-01. It does not enable real payment, change provider keys, seed prices, apply policy SQL, run a generation or change an order/file. Existing stable delivery and edition acceptance remain untouched.

## Policies

The four complete policy texts live in `shared/legal-documents.mjs`. They cover actual fixed/custom delivery, the labelled basic edition, licences and access, pre-approval and post-delivery changes, defects/cancellations/refunds, modification feedback and versions, text/image/email providers, essential storage and optional measurement. Mandatory consumer remedies are preserved; the text does not invent a blanket digital no-refund rule or assume cancellation consent that checkout does not collect.

The owner confirmed individual operation and worldwide customers. Do not invent a company, force a country whitelist, or equate worldwide browsing with a payment provider accepting every transaction. This implementation adds no buyer-country restriction.

`shared/legal-profile.mjs` contains public policy details only. The owner supplied the public name **mielschen**, individual operation in **Mainland China**, and support@paperadventure.app on 2026-10-24. This public name is not represented as a verified Stripe legal identity. No public correspondence address was supplied; keep that field empty rather than inventing one or storing “none” as a valid address. Correspondence details, effective date and final policy approval still require confirmation. Do not put credentials, identity documents, bank details or a private residential address here without explicit instruction to publish that particular information. Stripe verification belongs in its own dashboard. Confirm which public contact details apply to the actual individual business before policy publication.

Until those details are confirmed, the site shows readable **POLICY PREVIEW** documents with no filler paragraphs or invented effective date. It must not claim these drafts are reviewed/published. The existing DB/API/LEGAL_RELEASED gate is unchanged. Formal policies are not automatically inserted by a migration or deployment.

`npm run prepare:legal` writes four Markdown documents and draft-only SQL to ignored `output/legal/`. It has no database/network side effects. After owner review and the public profile have been completed, `node scripts/prepare-legal-release.mjs --published` prepares publication SQL; it refuses an incomplete/unapproved profile. A content digest in each version prevents changing the contents under an existing version. SQL uses insert-only records and does not retire or overwrite purchase-bound older policies. Applying it and changing legal-release flags is a separately reviewed release action.

All four published pages, including privacy, use the version actually returned by the legal API. They do not keep showing a stale hardcoded privacy notice once published policies exist. Failed loads remain visible as errors and do not silently substitute a draft as a published version.

The refund wording preserves legal remedies and describes the existing manual support path; it does not introduce an automatic refund feature, claim case filing alerts an operator, or invent a refund turnaround guarantee. Support operations, accounting retention and any additional market-specific requirements must be checked against actual arrangements before approval.

Primary references checked on 2026-10-24:

- [Stripe business information](https://support.stripe.com/questions/business-information-requirements-to-use-stripe): account verification and business identity.
- [Stripe website information](https://support.stripe.com/embedded-connect/questions/information-required-on-your-business-website-to-process-payments): product/currency, contact, refund and privacy disclosures; exact account requirements depend on the merchant setup.
- [Hong Kong PCPD PICS/PPS guidance](https://www.pcpd.org.hk/english/publications/files/GN_picspps_e.pdf): data kinds, purposes and disclosure clarity. Operator jurisdiction is not assumed from an old draft.
- [UK digital download rules](https://www.gov.uk/online-and-distance-selling-for-businesses/online-selling) and [digital content remedies](https://www.legislation.gov.uk/ukpga/2015/15/part/1/chapter/3): do not assume cancellation waiver from an ordinary button; mandatory remedies survive. These are examples of why a worldwide policy must preserve applicable local rights, not a claim to certify every jurisdiction.

## Purchase copy

The pricing comparison now agrees with the FAQ and order flow: 2 successful whole-plan reworks + 3 targeted edits before approval; 3 successful checkpoint changes + 2 whole-game remakes in 30 days from first qualified delivery; separate 6/4 candidate preparation caps. Failed/discarded candidates do not use successful replacements. This is copy alignment, not a backend allowance change. The shared copy is also used in the policy documents.

## Declared release mode

Repository variable `PAYMENTS_EXPECTED_MODE` declares `test` or `live`; unset means `test`. It is an expectation, **not** a runtime switch and contains no key. Current configuration remains test.

- Frontend and backend deployment verification compare health with the declared mode. Live requires checkout active, mode live and published policies. A test-mode deployment may remain closed; it cannot accidentally pass a live checkout. Invalid modes fail.
- Sandbox staging requires an explicitly compatible test target before R2/D1 writes; the uploader also checks when invoked directly.
- Legacy bootstrap and Stripe test activation refuse a live target before writes. Their explicit `--allow-closed` permits initial closed sandbox setup, never live. They are not production activation workflows.
- Do not change the expected mode until a separately authorised live-key/webhook/tax/policy rollout is prepared. When moving to live, set the expectation as part of that coordinated rollout and keep old test tools disabled. Existing bootstrap scripts still include legacy test-only feature/version assertions and are not an upgrade route for the production service.
- Checks do not print full health responses, environment contents or credentials. Nothing auto-retries an order or modifies payment/generation flags.

## Validation and remaining release work

`npm run test:release` covers mode mismatch/closed/live/invalid cases, sandbox refusal before writes, CLI failure redaction, individual/global profile, policy approval refusal, complete draft content, immutable/escaped SQL and workflow ordering. Build/static checks verify all four real generated page documents and the consistent pricing table. Existing backend and packaging suites remain required.

UI screenshots, if obtained, are evidence only for the stated local views. Unit/CI tests do not prove a real charge, webhook delivery, refund, cross-account access or new-theme generation. No such provider/customer operation is part of this change.


## Fixed listed-price checkout (owner decision 2026-10-24)

This supersedes the earlier Stripe Tax enrollment/inclusive-default requirement. The customer pays the exact listed USD price once. Checkout always disables automatic_tax and promotion codes, supplies one item with quantity one, and attaches no manual tax rates, shipping charges or optional paid items. New live checkout verifies the actual Price ID, active/live status, one-time type, USD and exact catalog amount without requiring tax_behavior or Tax Settings API access. Existing unspecified Prices need no tax-setting change for this mode.

Every new purchase snapshots checkoutPricing=fixed_total_v1. Payment confirmation must equal the saved price exactly, rejecting both surcharges and discounts before fulfillment. Old order snapshots retain their original validation. Page copy presents the price and purchase terms without tax explanations or promises about tax compliance.

Stripe Tax enrollment and TAX_CONFIGURED are not checkout requirements for fixed listed-price purchases. The existing checkout enable, live enable, legal-release, published-policy and credential checks remain. Policy v4 effective 2026-10-24 is approved and published; operator name, correspondence address and date are complete.

PAYMENT_CREDENTIAL_SOURCE=staged_live selects the already configured STRIPE_LIVE_SECRET_KEY and STRIPE_LIVE_WEBHOOK_SECRET at runtime in API, queued work and scheduled notifications. This does not overwrite stored sandbox secrets. Missing/wrong live credentials close checkout without falling back to sandbox. Keep LIVE_PAYMENTS_ENABLED and CHECKOUT_ENABLED off until live prices and the matching webhook are connected; then coordinate the deployment expected mode. Do not claim a real charge or delivery has been verified from fixture tests.
