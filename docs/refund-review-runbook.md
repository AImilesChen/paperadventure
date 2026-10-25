# Refund review and order evidence

Current release: live checkout was enabled on 2026-10-25. This runbook describes manual refund review; it never authorizes an automatic refund. Policy v5 updates the order-form contact route while preserving the rules attached to earlier purchases.

## Customer rules

- Cancellation received before custom generation begins, or before ready-made digital supply: full-refund route.
- A personal plan already generated after an explicit request: no unconditional voluntary full refund solely for changing one's mind. Review individually; no automatic cost deduction.
- Normally delivered files with preference-only complaints: included changes, not an extra voluntary unconditional guarantee.
- Missing delivery, serious unusable defects that cannot be resolved, or confirmed duplicate/incorrect charges: appropriate correction or refund, preserving mandatory local rights. Preference quotas are not a prerequisite to a legal remedy.
- Aim to acknowledge emailed requests in two business days, decide within five business days after the necessary information arrives, and submit an approved refund within two business days or any shorter legal deadline. The 30-day reporting request does not shorten mandatory rights.

The checkout supply request is **not** a statutory cancellation waiver. A plan approval, download, repeated request, preview or exhausted quota alone is never an automatic reason to deny a legal remedy. Do not describe this as eliminating chargebacks or all free copying. Legal requirements depend on the customer and transaction.

## Manual handling

1. Verify ownership and payment mode from the order and Stripe. A test purchase cannot produce a monetary refund. The order form atomically records a case and reserves an operator notification. Notifications use a lease and case-specific key; failed sends retry up to eight times before requiring attention. Customers do not need a second email unless the page reports a terminal notification failure. Monitor the published support inbox for the stated response target. Cloudflare email does not offer provider-level idempotency, so an ambiguous delivery acknowledgement may still duplicate a notice; the case reference remains stable.
2. Inspect only this order's purchase-bound policy versions, explicit supply notice, support/refund-request time, generation usage, plan approvals, delivery and file-service evidence. Look at the actual defect if relevant. First-provider work means an attempt started, not that a usable plan was delivered. Missing evidence on an older order is not proof that nothing was supplied, nor consent to the new terms. Do not apply new voluntary terms retroactively.
3. Assess the request under its original terms and applicable mandatory rights. A cancellation received before work begins stays eligible even if work starts while support processes the request. Repeated requests may merit individual review, not automatic refusal. Tell the customer the concrete reason and remedy. Never demand child identity documents or full card details.
4. Before issuing an approved refund in Stripe, check the payment, previous full/partial refunds and any active dispute to avoid refunding twice. This repository does not issue refunds. Do not create a replacement purchase or reset allowances. Record the outcome through the existing support-case workflow.
5. Confirm Stripe success and delivery of signed refund events (`charge.refunded`, `refund.created`, `refund.updated`, `refund.failed`). Subscribe to all four before live release. The handler uses a complete list of succeeded refunds, making read-only Stripe status requests where the event has no complete list. A refund request, initiated/pending refund or failed bank refund alone is not a successful full refund. A confirmed full refund makes the order terminal, revokes future online access and stops new queued work/candidate acceptance. Partial refunds preserve access. Already submitted external calls and files already downloaded cannot be recalled.

## Evidence, privacy and races

`order_evidence` records checkout notice and purchase hash, first provider request, plan approval, artifact publication, first file/preview service per file and refund cases/events. It stores no added IP address, fingerprint, card details or private story text. A served file is not proof that it was read. File-access evidence is best-effort so a logging error does not block an otherwise valid paid download. Purchase confirmation is saved atomically with a new order. Existing order specs are unchanged.

For an authorized operator, the following is a **read-only, single-order** evidence query; replace the placeholder using a bound parameter in your database client. Never put private output in a public PR, ticket or workflow log:

```sql
SELECT event, reference, details_json, created_at
FROM order_evidence WHERE order_id = ? ORDER BY created_at, id;
```

Database triggers prevent a late payment event, provider response or version commit from restoring a refunded order. Queue dispatch checks the order and wraps every subsequent provider request; refunded messages are acknowledged rather than retried. A request already in flight may still incur its original cost, but cannot publish a usable replacement. Successful-change counters, preparation attempts, provider budgets, original PDFs and historical records are retained.

Candidate PDFs are marked only on the authenticated preview response with a small bottom-margin label. Stored candidate bytes and hashes stay clean; acceptance still verifies both files and atomically publishes the pair under the existing rules. This is a status mark, not DRM.

## Release and rollback

Apply additive migration `0040_refund_evidence_guards.sql` before publishing the API, then publish the matching checkout page. The public deploy waits for the matching API confirmation version before uploading its page. No migration replays orders, calls providers, resets quotas or rewrites PDFs. Keep the existing stable generation/baseline path. Do not roll back to API code that ignores refunded status or automatically reactivate an entitlement. If the preview mark has a display fault, disable only that response transformation while retaining authentication and refund guards. A policy change requires a new version, never editing purchase-bound published records in place.

Primary references for review: [UK digital-download consent requirements](https://www.gov.uk/online-and-distance-selling-for-businesses/online-selling), [Stripe refund lifecycle](https://docs.stripe.com/refunds), [Stripe dispute evidence](https://docs.stripe.com/disputes/best-practices). These references do not establish that one worldwide policy is legally sufficient everywhere.
