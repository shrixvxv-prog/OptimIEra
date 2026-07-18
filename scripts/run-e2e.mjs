import { spawnSync } from 'node:child_process';
import 'dotenv/config';

const env = {
  ...process.env,
  NODE_ENV: 'test',
  SEED_DEVELOPMENT_DATA: 'false',
  OG_COMPUTE_ENABLED: 'false',
  OG_COMPUTE_API_KEY: '',
  NOUS_ENABLED: 'false',
  NOUS_API_KEY: '',
  OG_STORAGE_ENABLED: 'false',
  OG_STORAGE_PRIVATE_KEY: '',
  OG_CHAIN_ENABLED: 'false',
  OG_CHAIN_TEST_ADAPTER: 'true',
  OPTIMIERA_USAGE_PAYMENTS_ENABLED: 'false',
  OPTIMIERA_CHAIN_PRIVATE_KEY: '',
  OPTIMIERA_DEPLOYER_PRIVATE_KEY: '',
  OPTIMIERA_REGISTRY_ADDRESS: '',
  BETTER_AUTH_URL: 'http://localhost:3000',
  DATABASE_URL:
    process.env.E2E_DATABASE_URL ??
    'postgresql://optimiera:optimiera@localhost:5432/optimiera_test?schema=public',
};
if (!env.DATABASE_URL.includes('localhost') || !env.DATABASE_URL.includes('optimiera_test')) {
  throw new Error('E2E tests require a local optimiera_test database.');
}
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const reset = spawnSync(
  pnpm,
  [
    '--filter',
    '@optimiera/database',
    'exec',
    'prisma',
    'migrate',
    'reset',
    '--force',
    '--config',
    'prisma.config.ts',
  ],
  {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  },
);
if (reset.error) {
  console.error(`E2E reset process failed: ${reset.error.message}`);
  process.exit(1);
}
if (reset.status !== 0) process.exit(reset.status ?? 1);
const migrate = spawnSync(pnpm, ['--filter', '@optimiera/database', 'db:migrate:deploy'], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});
if (migrate.error) {
  console.error(`E2E migration process failed: ${migrate.error.message}`);
  process.exit(1);
}
if (migrate.status !== 0) process.exit(migrate.status ?? 1);
const build = spawnSync(pnpm, ['--filter', '@optimiera/web', 'build'], {
  stdio: 'inherit',
  env: { ...env, PROMPT_STORAGE_MODE: 'ENCRYPTED', BETTER_AUTH_E2E: 'true' },
  shell: process.platform === 'win32',
});
if (build.error) {
  console.error(`E2E web build failed: ${build.error.message}`);
  process.exit(1);
}
if (build.status !== 0) process.exit(build.status ?? 1);
const testArgs = ['exec', 'playwright', 'test'];
if (process.env.PLAYWRIGHT_GREP) testArgs.push(`--grep=${process.env.PLAYWRIGHT_GREP}`);
const test = spawnSync(pnpm, testArgs, {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});
if (test.error) {
  console.error(`E2E test process failed: ${test.error.message}`);
  process.exit(1);
}
process.exit(test.status ?? 1);
