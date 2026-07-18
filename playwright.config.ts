import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm --filter @optimiera/web exec next start -p 3000',
    url: 'http://localhost:3000/sign-in',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      BETTER_AUTH_E2E: 'true',
      BETTER_AUTH_URL: 'http://localhost:3000',
      PROMPT_STORAGE_MODE: 'ENCRYPTED',
      DATABASE_URL:
        process.env.E2E_DATABASE_URL ??
        'postgresql://optimiera:optimiera@localhost:5432/optimiera_test?schema=public',
    },
  },
});
