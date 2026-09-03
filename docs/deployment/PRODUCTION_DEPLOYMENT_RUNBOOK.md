# OptimIEra production deployment runbook

Scope: Vercel-compatible deployment of `apps/web` backed by managed PostgreSQL, with 0G Galileo testnet only. This runbook does not enable or verify Aristotle mainnet functionality.

## 1. Vercel project setup

1. Import the repository into Vercel.
2. Set Root Directory to `apps/web`.
3. Use Node.js 24.x and pnpm 11.x.
4. Use install command `cd ../.. && pnpm install --frozen-lockfile`.
5. Use build command `cd ../.. && pnpm vercel-build`.
6. Keep Preview and Production as separate Vercel environments.
7. Do not deploy `apps/api` as a second public service unless that boundary is explicitly required; the web application owns the production API routes.

## 2. Managed PostgreSQL provisioning

Provision PostgreSQL through an approved managed provider such as Neon. If Vercel displays marketplace terms, the account owner must accept them manually. Do not use localhost, SQLite, a shared development database, or the test database for public deployments.

The database must support TLS and provide a production connection URL. Run migrations through the existing `vercel-build` command; do not use `prisma migrate dev` in Vercel.

## 3. Preview database

Create a database isolated from Production. Add its `DATABASE_URL` and optional `DIRECT_URL` only to the Vercel Preview environment. Use a Preview-specific encryption key and auth secrets. Never reuse Production credentials or data.

## 4. Production database

Create a separate Production database. Add its `DATABASE_URL` and optional `DIRECT_URL` only to the Vercel Production environment. Confirm TLS, backups, retention, access controls, and restoration procedures with the provider before promotion.

## 5. Environment configuration

Required classifications for this phase:

| Classification  | Variables / rules                                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC`        | `NEXT_PUBLIC_APP_URL`, optional docs/API URLs, public 0G explorer/network values. Never put secrets here.                                                       |
| `SERVER_SECRET` | `DATABASE_URL`, optional `DIRECT_URL`, auth secret, `OPTIMIERA_ENCRYPTION_MASTER_KEY`, and any Compute/Storage/Chain credentials. Server-only Vercel variables. |
| `OPTIONAL`      | Nous settings, optional docs/API URLs, usage payment settings when disabled, and tuning values.                                                                 |
| `TESTNET_ONLY`  | `OG_COMPUTE_NETWORK=testnet`, `OG_STORAGE_NETWORK=testnet`, `OG_CHAIN_NETWORK=testnet`, `OG_CHAIN_CHAIN_ID=16602`, and Galileo endpoints for this phase.        |
| `MAINNET_ONLY`  | None in Phase 1. Do not set Aristotle/mainnet values or claim mainnet verification.                                                                             |

Production/Preview must set:

```text
NODE_ENV=production
VERCEL_ENV=preview or production
NEXT_PUBLIC_APP_URL=https://<deployment-domain>
BETTER_AUTH_URL=https://<deployment-domain>
BETTER_AUTH_TRUSTED_ORIGINS=https://<deployment-domain>
PROMPT_STORAGE_MODE=ENCRYPTED
OPTIMIERA_DEMO_MODE=true
OPTIMIERA_USAGE_PAYMENTS_ENABLED=false
OG_COMPUTE_NETWORK=testnet
OG_STORAGE_NETWORK=testnet
OG_CHAIN_NETWORK=testnet
OG_CHAIN_CHAIN_ID=16602
```

For a public live Galileo profile, additionally configure the real server-side credentials and explicit Galileo endpoints required by `docs/deployment/VERCEL_ENVIRONMENT_MATRIX.md`. Keep live writes disabled during initial deployment by setting `OPTIMIERA_PUBLIC_LIVE_0G_ENABLED=false` or `OPTIMIERA_LIVE_WRITES_ENABLED=false`.

The build validator rejects localhost/test databases, non-HTTPS auth/app URLs, missing trusted origins, plaintext storage, invalid encryption keys, E2E auth mode, mismatched networks, and incomplete enabled payments. It never prints secret values. Inspect variable categories without values with:

```powershell
node scripts/validate-production-env.mjs --describe
```

## 6. Migration procedure

`pnpm vercel-build` performs, in order:

1. production environment validation;
2. Prisma Client generation;
3. `prisma migrate deploy` against the configured managed database;
4. the web production build.

Review migration status before promotion. Migrations are forward-only in deployment; test them against Preview first.

## 7. Preview verification

After a Preview deployment, set `PRODUCTION_SMOKE_URL` to the Preview URL and run:

```powershell
pnpm production:smoke
```

The script performs only GET requests to `/api/health`, `/api/readiness`, and `/api/version`. It does not sign in, mutate data, submit transactions, upload Storage artifacts, or call payments. Then manually verify sign-up, email/password auth, SIWE wallet auth, Rules Engine optimization, encrypted persistence, and logout using the Preview database.

## 8. Production verification

Promote only the tested configuration after Preview passes. Run `pnpm production:smoke` against the Production URL, then verify the same non-destructive surfaces. Perform authenticated product smoke only with designated test accounts and approved data. Galileo operations require explicit operator approval and must be evidenced separately; no mainnet operation belongs to this phase.

## 9. Health checks

- `/api/health`: process/application liveness; expected HTTP 200 and `status: ok`.
- `/api/readiness`: database, auth and encryption readiness; expected HTTP 200 and `status: ready`.
- `/api/version`: release identity; expected HTTP 200 and application `OptimIEra`.

Readiness failures must not be hidden by a generic success response. The endpoint returns HTTP 503 when required dependencies are not ready.

## 10. Rollback procedure

1. Disable new live writes with `OPTIMIERA_PUBLIC_LIVE_0G_ENABLED=false` or `OPTIMIERA_LIVE_WRITES_ENABLED=false`.
2. Roll back the Vercel deployment to the last verified deployment.
3. Re-run the smoke script and readiness check.
4. Preserve logs and request IDs without exporting secrets or prompt content.
5. Do not roll back database migrations destructively. Use a forward-compatible corrective migration after investigation.

## 11. Database recovery procedure

1. Stop promotion and disable writes.
2. Identify the affected environment and exact migration/deployment revision.
3. Restore a provider backup into an isolated recovery database first.
4. Validate migration status, row counts, encryption boundaries and application readiness there.
5. Obtain operator approval before any production restore or connection switch.
6. Re-run smoke and authenticated recovery checks, then document the result.

Never use the local test reset command against Preview or Production.

## 12. Security checklist

- [ ] Preview and Production use separate managed databases.
- [ ] Preview and Production use distinct auth secrets and encryption keys.
- [ ] No secret is `NEXT_PUBLIC_*`, committed, logged or sent to the browser.
- [ ] `BETTER_AUTH_URL` and trusted origins are HTTPS and exact.
- [ ] SIWE is tested with a designated wallet and correct domain.
- [ ] `PROMPT_STORAGE_MODE=ENCRYPTED` is set.
- [ ] Galileo network is chain 16602; no mainnet values are enabled.
- [ ] E2E auth mode and test adapters are disabled.
- [ ] Initial live writes and payments are disabled.
- [ ] Database backups and restoration are confirmed.
- [ ] Health/readiness/version smoke checks pass.
- [ ] Rollback owner, deployment revision and incident contact are recorded.
- [ ] No fabricated deployment, transaction, root, certificate or metric is published.
