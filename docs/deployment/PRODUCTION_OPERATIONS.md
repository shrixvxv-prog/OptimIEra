# Production operations

## Release order

1. Provision isolated managed PostgreSQL databases for Preview and Production.
2. Configure the Vercel project root as `apps/web`, set the explicit Aristotle mainnet flag, and apply the environment matrix.
3. Deploy Preview. Confirm migrations, `/api/health`, `/api/readiness`, and `/api/version`.
4. Run the full authenticated Rules Engine workflow and the public certificate checks.
5. Deploy Production and repeat the smoke suite.
6. Create the designated owner account, run the live-evidence restore dry run, then run the confirmed database-only restore.
7. Verify the restored public certificate and record the canonical URL.

## Safe mode

Local development should set `OPTIMIERA_PUBLIC_LIVE_0G_ENABLED=false` and `OPTIMIERA_LIVE_WRITES_ENABLED=false`. Public Preview/Production defaults to bounded Aristotle mainnet live operations when the explicit mainnet flag and credentials are present; set either flag to `false` to stop new live writes. Rules Engine remains available, and external/server-funded operations remain bounded by the per-user and global quotas. Keep usage payments explicitly configured according to the release plan.

## Rollback

Use Vercel deployment rollback for application regressions. Do not roll back a database migration destructively. Restore from the managed provider backup or point-in-time recovery, then validate Prisma migration status before serving traffic.

## Incident checks

- Read `/api/health` for process health and `/api/readiness` for database/auth/encryption readiness.
- Review Vercel function logs using request IDs; never copy secrets or plaintext prompts into tickets.
- Disable public live 0G immediately if an external integration is unstable.
- Quota errors are expected HTTP 429 responses and must not trigger provider fallback.
- Authentication origin errors require correcting canonical URL/trusted origins, not weakening origin validation.

## Evidence restore

The restore command is idempotent and must first run without `--confirm-production`. It validates the managed production target, existing Storage bytes/proof, registry bytecode, transaction receipt, proof tuple, hashes, status, and block. Confirmation writes only the corresponding database records.
