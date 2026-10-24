# Policy review — 24 October 2026

Scope: terms, privacy and refunds against the deployed PR #102 source, actual checkout consent, account/email code and official UK/EU references. Public web fetch of the three live pages failed, so this review is of deployment source, not a claimed visual inspection. Not a certification of compliance in all jurisdictions.

## Findings and local corrections

- Operator spelling: owner clarified English name mileschen. Use individual trading as mileschen with the supplied geographical address and support email. No identity document or new identity verification is requested. Do not conflate merchant private verification with public contact information.
- Refunds: existing voluntary restrictions did not explain the applicable 14-day statutory cancellation period or cancellation form. Add qualified UK/EU period measured from contract, clear notice instructions/optional form, and applicable reimbursement deadline. Retain current non-waiver checkout and mandatory remedies; no automatic deduction or extra voluntary universal guarantee.
- Terms: add PDF reader, English, paper/printer and physical preparation requirements.
- Privacy: add controller responsibility, purpose-specific UK/EU legal bases, portable-copy request and usual one-month response, correct the supported Cloudflare/Resend email paths, and disclose possible Mainland China operator access.
- No blanket no-refund clause, liability exclusion, fictitious company, local-only storage claim, or consent waiver introduced. Historical order policies remain immutable.

## Remaining publication issue

The deployed Privacy Notice only says data may be processed abroad. Actual applicable processor agreements and international-transfer safeguards for production Cloudflare/AI/email processing have not been established in project evidence. Cloudflare publishes a DPA and SCCs, but public availability alone does not verify the account's contractual arrangements. The downstream DeepSeek API arrangement cannot be established using its consumer chatbot privacy policy. Do not invent completed SCCs, adequacy findings, no-training promises, fixed deletion schedules or local data residency. Resolve the actual arrangements and make the notice accurately describe relevant safeguards/access to them before declaring all three policies approved for the intended UK/EU-facing service.

Current local profile remains ownerApproved=false and effectiveAt empty. Conditional authorization was to publish if review found no substantive errors; the international-processing evidence gap is unresolved. No published SQL, legal release flag, payment switch or policy approval has been applied.

## Primary references

- https://www.legislation.gov.uk/uksi/2013/3134/schedule/2?view=plain
- https://www.legislation.gov.uk/uksi/2013/3134/regulation/37/made?view=plain
- https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02011L0083-20220528
- https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en
- https://www.cloudflare.com/cloudflare-customer-dpa/
- https://www.cloudflare.com/cloudflare-customer-scc/


## Verified data inventory and clarification

This is a source-code review, not inspection/export of customer database rows.

| Data flow | Actual code evidence | Disclosure consequence |
|---|---|---|
| Adult account link | production-worker emailHash + orders.purchaser_email_hash | No raw account email is required in the order row, but account-linked records remain personal data; do not claim anonymous/no personal information. |
| Saved planning draft | adult_drafts(email_hash,draft_json) | Cloudflare D1 stores signed-in adults' saved settings. |
| Purchases and files | orders purchase_spec_json/payment references; custom_activities; private R2 artifacts | The service needs order and delivery records to operate downloads and access control. |
| Support | support_cases order_id/email_hash/description | Customer descriptions are stored; users should avoid unnecessary identifying information. |
| Text AI | openai.mjs selects api.deepseek.com/responses or configured OpenAI; sends story spec/context | Do not claim that account email/card data is intentionally required for story generation. Free text can contain personal information if submitted. Do not infer API terms from consumer chatbot policy. |
| Email | sendAccessEmail/dispatchNotification use Cloudflare Email or Resend and recipient email | Sending an email is processing even if a raw email is not retained in the order table. |
| Payment | Stripe hosted Checkout | Card details are entered with Stripe, not the story form; this does not mean no personal data is processed anywhere. |

The previous explanation overstated uncertainty as a universal prerequisite to produce a bespoke agreement or proof screenshot. Absence of that evidence in this workspace is not proof that the operator lacks the provider's standard contractual protections, nor is it a Stripe refusal. Review actual applicable vendor terms and disclose observed flows; never invent signed safeguards or certify worldwide compliance from code tests. No identity document is needed for this review. Do not add speculative code gates for these documentation uncertainties.


## Publication decision

The owner authorized publication after corrections and repeated that authorization. Correct the earlier blanket publication blocker: missing workspace proof of an individually signed agreement does not establish missing protections. The reviewed notice states actual data categories, processing purposes, service recipients and possible overseas/operator access. It makes no claim of a verified bespoke SCC, adequacy decision, zero retention or worldwide legal certification. Cloudflare's published DPA and DeepSeek's Open Platform Terms (effective 29 April 2026, sections 3.3 and 5.5) were consulted; consumer chatbot policy is not substituted for API terms. Supplier-account-specific contract/transfer assessment remains an operational responsibility, not represented as completed by this publication.

Formal v4 effective 2026-10-24 publishes the corrected terms/privacy/refunds and the associated cookie notice together. Source profile ownerApproved=true records this authorization. Publish additive immutable legal_documents rows only; do not change historical purchases, secrets, checkout flags or payment mode.

Additional source: https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html
