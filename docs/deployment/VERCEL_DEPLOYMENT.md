# Vercel deployment

Configure the Vercel project root directory as `apps/web`. Vercel runs `pnpm install --frozen-lockfile`; the project build command runs `cd ../.. && pnpm vercel-build`, which validates the production environment, generates Prisma Client, applies existing migrations, and builds the web application.

Set the production environment values in `VERCEL_ENVIRONMENT_MATRIX.md`, run a Preview deployment first, verify `/api/health`, `/api/readiness`, and `/api/version`, then promote only after readiness is successful. Production must use external managed PostgreSQL; SQLite and localhost URLs are unsupported.

The Vercel project currently requires the account owner to accept the Neon Marketplace terms before CLI provisioning can continue. This is a legal/account action and must be completed manually. Do not deploy with a local or shared database as a workaround.
