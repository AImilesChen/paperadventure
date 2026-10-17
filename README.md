# Paper Adventure Workshop

**Current product/design source of truth:** [Pre-frontend handoff v1.4](content/前端开发前交付包_索引与阶段门_v1.4.md). It records the agreed free Celebration Home and Classroom sample, separate ready-made and custom prices, page copy, legal review conditions, and UI flow. Earlier prototype behavior and documents may differ.

English-first printable story adventure website prototype. The current public preview is https://paperadventure.app/en/ and deliberately blocks search indexing. The Celebration Home and Classroom v0.1 trial PDFs are free to download in A4 and US Letter, with separate Player Pack and adult guide files. A Google Web Client ID is configured, but public accounts remain gated pending a reviewed privacy notice and real-user login test. Paid checkout, public custom generation and analytics remain behind release gates until their service and publication checks pass.

## Local development

Requires Node.js 20+.

```sh
npm ci
npm run dev
```

For a production-style static build and checks:

```sh
npm run build
npm run test:static
npm run test:sites
npm run test:backend
```

On Windows, `npm run package:preview` creates `output/paper-adventure-preview.zip` for the existing Cloudflare static preview Worker. The upload does not include the separate production API implementation in `backend/`.

See [FRONTEND_HANDOFF.md](FRONTEND_HANDOFF.md) for deployment, SEO and analytics status, and [backend/RUNTIME_HANDOFF.md](backend/RUNTIME_HANDOFF.md) for the unreleased backend.
