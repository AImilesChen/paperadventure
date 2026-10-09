# Stripe sandbox activation for Paper Adventure

The production domain hosts the account and AI preview. The checkout path is **test-only** and remains closed until the three GitHub Actions repository secrets below are set. No live Stripe key is used; the live-payment release gates remain off.

1. In your Stripe account, switch to **Test mode** and get a secret API key beginning with `sk_test_`. Save it as the repository Actions secret `STRIPE_TEST_SECRET_KEY` in `AImilesChen/paperadventure`.
2. In Stripe Workbench → Webhooks, create an event destination for **Your account** using **Snapshot** events (the handler expects full event objects). Endpoint URL: `https://paperadventure.app/api/v1/stripe/webhook`. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `checkout.session.async_payment_failed`, and `charge.refunded`. Reveal the **test** endpoint signing secret beginning with `whsec_`; save it as the Actions secret `STRIPE_TEST_WEBHOOK_SECRET`.
3. Save the adult Google account email you will use for testing as the Actions secret `STRIPE_TEST_BUYER_EMAIL`. Do not post the API key, signing secret, or email in a public issue or commit.
4. After all three secrets are saved, tell Codex only “三个 Stripe 测试 Secret 已配置”. Codex can trigger the `Activate Stripe sandbox checkout` workflow by updating `backend/stripe-test-setup.trigger`. That workflow copies the credentials to the isolated Cloudflare Worker, seeds two **custom** test prices ($14.99 Home and $19.99 Classroom), deploys, and checks the apex health response.
5. Sign in with that Google account, create a custom adventure, choose one of the free story directions, and continue to the clearly marked Stripe test checkout. Use a Stripe test card from Stripe's documentation. A signed webhook changes the order status and queues DeepSeek generation; completed PDFs appear in My adventures. This tests a complete custom flow without a real charge.

The five other fixed themes are not published paid packs, so they stay unavailable for checkout. This sandbox does not establish real-world tax treatment or publish final paid terms. Those remain separate live-payment release tasks.

Sources: [Stripe API keys](https://docs.stripe.com/keys), [Stripe webhooks](https://docs.stripe.com/webhooks), [Stripe testing](https://docs.stripe.com/testing).
