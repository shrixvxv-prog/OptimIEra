# Vercel deployment

Configure the Vercel project root directory as `apps/web`. Vercel runs `pnpm install --frozen-lockfile`; the project build command runs `cd ../.. && pnpm vercel-build`, which generates Prisma Client, applies the existing migrations, and builds the web application.

Set the production environment values in `VERCEL_ENVIRONMENT_MATRIX.md`, run a Preview deployment first, verify `/api/health`, `/api/readiness`, and `/api/version`, then promote only after readiness is successful. Production must use external managed PostgreSQL; SQLite and localhost URLs are unsupported.
