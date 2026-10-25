# Existing live payment configuration — 25 October 2026

The owner confirmed the prior Stripe screenshots and existing Cloudflare secrets. Do not require duplicate configuration evidence. This release connects those stored values; no card payment, refund, fake purchase or AI call is authorized by the deployment.

The coordinated activation workflow stages new immutable Price versions, deploys with checkout closed and explicit staged_live credentials, and waits for one ordinary scheduled invocation to read the four actual Stripe Prices. The restricted key is used only in the Worker and never exported. A safe audit entry records success or a numeric/status-derived failure category with the SKU; it contains no secrets, Stripe error body or customer data. Each workflow attempt has a distinct release reference; terminal results are not repeatedly called on every cron.

Only after successful price verification does activation select the new prices, make already-uploaded complete ready packs available, disable test checkout and enable live checkout. Existing price amounts, customer orders, files, queue budgets and quotas remain intact. A catalog metadata snapshot supports rollback. A failed activation restores sandbox flags and any catalog state changed in that run. Published legal v4 and the original encrypted test secrets are retained.

Future regular deployments preserve configured variables. Their expected payment target becomes live; they must not report a test/closed runtime as a completed live release. The public-site workflow waits for matching live runtime before publishing. Runtime verification checks four live offers and published policies; it does not claim a real charge/webhook/fulfilled order has been tested. Those require the owner's eventual real purchase.
