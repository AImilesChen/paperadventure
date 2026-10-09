import { writeFileSync } from 'node:fs';
import { googleClientId } from '../shared/google-client.mjs';

const databaseId = process.env.PAPER_ADVENTURE_STAGE_D1_ID;
if (!/^[0-9a-f-]{36}$/i.test(databaseId || '')) throw new Error('A valid stage D1 UUID is required');

const config = {
  $schema: '../node_modules/wrangler/config-schema.json',
  name: 'paper-adventure-api-stage',
  main: './production-worker.mjs',
  compatibility_date: '2026-10-07',
  workers_dev: true,
  assets: { directory: '../dist/client', binding: 'ASSETS', run_worker_first: ['/api/*'] },
  d1_databases: [{ binding: 'DB', database_name: 'paper-adventure-stage-db', database_id: databaseId, migrations_dir: './migrations' }],
  r2_buckets: [{ binding: 'PRIVATE_FILES', bucket_name: 'paper-adventure-stage-private' }],
  send_email: [{ name: 'EMAIL', allowed_sender_addresses: ['support@paperadventure.app'] }],
  queues: {
    producers: [{ binding: 'GENERATION_QUEUE', queue: 'paper-adventure-stage-generation' }],
    consumers: [{ queue: 'paper-adventure-stage-generation', max_batch_size: 1, max_retries: 2 }],
  },
  vars: {
    STAGE_PREVIEW: 'true',
    CHECKOUT_ENABLED: 'false',
    LEGAL_RELEASED: 'false',
    TAX_CONFIGURED: 'false',
    LIVE_PAYMENTS_ENABLED: 'false',
    FREE_SAMPLE_ENABLED: 'true',
    PROPOSALS_ENABLED: 'false',
    ACCOUNT_ENABLED: 'true',
    GOOGLE_CLIENT_ID: googleClientId,
    ACCOUNT_TEST_EMAIL: 'support@paperadventure.app',
    EMAIL_PUBLIC_DESTINATIONS_READY: 'true',
    EMAIL_FROM: 'support@paperadventure.app',
    PUBLIC_ORIGIN: 'https://paperadventure.app',
    AI_PROVIDER: 'deepseek',
    DEEPSEEK_MODEL: 'deepseek-flash',
    SUPPORTED_AGE_MIN: '0',
    SUPPORTED_AGE_MAX: '0',
    HOME_PLAYER_MAX: '0',
    CLASSROOM_STUDENT_MAX: '0',
  },
};
writeFileSync(new URL('../backend/wrangler.stage.generated.jsonc', import.meta.url), `${JSON.stringify(config, null, 2)}\n`);
