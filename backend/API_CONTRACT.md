# Backend API contract v0.1

> This file describes the original fail-closed preview worker (`worker.mjs`). A separate implementation-stage Cloudflare runtime now exists in `production-worker.mjs`; see [`RUNTIME_HANDOFF.md`](RUNTIME_HANDOFF.md) for its routes, bindings and release gates. The preview worker remains unchanged so the local Sites prototype cannot accidentally sell or expose files.

Status: local scaffold only. `GET /api/v1/catalog` and `GET /api/v1/themes/:id` are read-only and return the shared product manifest. Payment, generation, order access and downloads are deliberately unavailable; the server returns HTTP 503 with a stable error code rather than creating a fake entitlement.

| Method and path | Auth | Response / current state |
|---|---|---|
| `GET /api/v1/health` | Public | Development capability flags. |
| `GET /api/v1/catalog` | Public | `version`, `publicationState`, `freeSampleThemeId`, `productRights`, four `offers`, six `themes`; all sales disabled. |
| `GET /api/v1/themes/:id` | Public | One world and custom offer definitions; unknown ID → `THEME_NOT_FOUND` 404. |
| `POST /api/v1/checkout-intents` | Future adult purchaser | `CHECKOUT_NOT_READY` 503; must later validate SKU, published pack, price version, tax, licence and idempotency. |
| `POST /api/v1/proposals` | Future rate-limited adult session | `GENERATION_NOT_READY` 503; no model is invoked. |
| `/api/v1/orders/*`, `/api/v1/files/*` | Future verified order/account | `ORDER_ACCESS_NOT_READY` 503; no public file access. |

Error envelope: `{ "error": { "code": "STABLE_CODE", "message": "Human-readable English text" } }`. Only API endpoint paths return JSON. A later implementation must add request/response schemas, rate limits, session design, Stripe signature verification, idempotent payment handling, D1 migrations, R2 private access, queue retries, email recovery and full contract tests before enabling sales.

## Data ownership

`shared/catalog.mjs` is the local source for design-stage price, theme and owner-confirmed product rights. It exposes cents, USD currency, product kind, setting, revision allowance, release status, 12-month online re-download policy and `saleEnabled: false`. A theme cover does not represent a purchasable file. The owner selected Celebration as the free-sample **candidate**; `freeSampleThemeId` remains `null` until the sample files pass release checks. The separate production worker snapshots the access-policy version and writes an expiry on paid ready-file authorization or first qualified custom delivery; its file endpoint refuses expired access. Production will use D1/Stripe price versions and a reviewed publication process; it must not silently treat this preview manifest as a production catalogue.

## Required Cloudflare bindings when integration starts

`DB` (D1), `PRIVATE_FILES` (R2), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SESSION_SECRET`, `OPENAI_API_KEY`, email provider secret, public origin, and optional queue/analytics bindings. Configure secrets in Cloudflare; never commit secret values. Keep the preview worker separate from the existing Sites adapter in `worker/index.js`.

## v1.4 implementation-stage additions

The separate `production-worker.mjs` exposes `GET /api/v1/auth/session` as a no-store, public-safe boolean status (`available`, `authenticated`); it never returns an email. `POST /api/v1/auth/logout` clears the HttpOnly session cookie after same-origin validation. The page header uses those endpoints to show `Sign in` to guests and `My adventures` / `Sign out` after verification. Transactional email must be configured before `account` is enabled.

Celebration is never a paid ready-made SKU. Its Home and Classroom packs may be exposed as `downloadable_trial` when **both** have four versioned files each, are marked `release_ready` or `published`, and `FREE_SAMPLE_ENABLED=true`. The guest download endpoint verifies R2 bytes against their D1 hash. This trial status is distinct from `published` paid packs; it requires content and asset rights review before public activation, but not completed human play-testing.
