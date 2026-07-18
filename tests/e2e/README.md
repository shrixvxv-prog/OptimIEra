# E2E tests

Playwright runs serially against the built Next.js web app and the local PostgreSQL-backed Better Auth configuration. Use `pnpm test:e2e` after Docker PostgreSQL is running, or `pnpm test:e2e:headed` for visible browser debugging. Tests use unique local records and never insert browser sessions directly.
