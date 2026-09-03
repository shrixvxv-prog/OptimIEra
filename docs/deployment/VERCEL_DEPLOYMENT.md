# Vercel deployment

Configure the Vercel project root directory as `apps/web`. Vercel runs `pnpm install --frozen-lockfile`; the project build command runs `cd ../.. && pnpm vercel-build`, which validates the production environment, generates Prisma Client, applies existing migrations, and builds the web application.

Set the production environment values in `VERCEL_ENVIRONMENT_MATRIX.md`, run a Preview deployment first, verify `/api/health`, `/api/readiness`, and `/api/version`, then promote only after readiness is successful. Production must use external managed PostgreSQL; SQLite and localhost URLs are unsupported.

The `optimiera` Vercel project is linked. The existing OptimIEra registry is already deployed on Aristotle mainnet at `0xda91a3929107c74f27e2d3288d046e4a37f9b422` on chain `16661`; do not deploy another registry. The project still needs separate managed PostgreSQL URLs, auth secrets, the encryption master key, a mainnet Router API key, a funded Storage signer, and a funded Chain signer before a deployment can pass `vercel-build`. The account owner must accept the Neon Marketplace terms before managed database provisioning can continue. This is a legal/account action and must be completed manually. Do not deploy with a local or shared database as a workaround.

Aristotle mainnet requires `OPTIMIERA_0G_MAINNET_ENABLED=true` and aligned network variables on chain `16661`. Public Preview/Production then defaults to bounded live operations when required credentials are present. Set either `OPTIMIERA_PUBLIC_LIVE_0G_ENABLED=false` or `OPTIMIERA_LIVE_WRITES_ENABLED=false` to pause new live writes. Roll out across the wave window: provision Preview, run remote smoke and recovery checks, observe, then promote Production. A deployment is not considered live-verified until authenticated mainnet Compute succeeds and mainnet Storage/Chain evidence is read back successfully.

## Aristotle mainnet deployment sequence

1. In the 0G Router mainnet console, create a mainnet API key and fund the Router balance. Mainnet and testnet Router keys and balances are separate.
2. Fund the server-side Storage and Chain signer accounts with mainnet 0G. Never paste private keys into source files, `NEXT_PUBLIC_*` variables, tickets, or chat.
3. In Vercel, provision separate managed PostgreSQL databases for Preview and Production. If Neon Marketplace terms appear, the account owner must accept them.
4. Set the non-secret Aristotle values in both environments:

   ```text
   OPTIMIERA_0G_MAINNET_ENABLED=true
   OG_COMPUTE_ENABLED=true
   OG_COMPUTE_NETWORK=mainnet
   OG_COMPUTE_BASE_URL=https://router-api.0g.ai/v1
   OG_COMPUTE_MODEL=qwen3.8-flash
   OG_STORAGE_ENABLED=true
   OG_STORAGE_NETWORK=mainnet
   OG_STORAGE_MODE=turbo
   OG_STORAGE_RPC_URL=https://evmrpc.0g.ai
   OG_STORAGE_INDEXER_URL=https://indexer-storage-turbo.0g.ai
   NEXT_PUBLIC_0G_STORAGE_EXPLORER_URL=https://storagescan.0g.ai
   OG_CHAIN_ENABLED=true
   OG_CHAIN_NETWORK=mainnet
   OG_CHAIN_RPC_URL=https://evmrpc.0g.ai
   OG_CHAIN_CHAIN_ID=16661
   OG_CHAIN_EXPLORER_URL=https://chainscan.0g.ai
   OG_CHAIN_CONFIRMATIONS=1
   OPTIMIERA_REGISTRY_ADDRESS=0xda91a3929107c74f27e2d3288d046e4a37f9b422
   OPTIMIERA_DEMO_MODE=false
   PROMPT_STORAGE_MODE=ENCRYPTED
   OPTIMIERA_USAGE_PAYMENTS_ENABLED=false
   ```

5. Add distinct Preview and Production values for `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, `BETTER_AUTH_SECRET` or `AUTH_SECRET`, `OPTIMIERA_ENCRYPTION_MASTER_KEY`, `OG_COMPUTE_API_KEY`, `OG_STORAGE_PRIVATE_KEY`, and `OPTIMIERA_CHAIN_PRIVATE_KEY`. Add `NOUS_API_KEY` only if Nous is intentionally enabled. Keep `OPTIMIERA_PUBLIC_LIVE_0G_ENABLED=false` during the first deployment if a rollback gate is desired.
6. Deploy a Preview from the linked repository. Verify `/api/health`, `/api/readiness`, and `/api/version`, then sign up, connect a wallet, run Rules Engine, and confirm the UI displays Aristotle mainnet without exposing secrets.
7. Run the authenticated mainnet verification: Router model discovery and inference, one encrypted Storage upload/readback, and one Chain proof/readback. This is the point at which `LIVE_VERIFIED` may be claimed. Do not call a failed 0G request through another provider automatically.
8. Promote the same tested configuration to Production and repeat the health, readiness, wallet, payment, quota, certificate, and rollback smoke checks.

CLI shape (run from the repository root after the account owner has supplied the values securely):

```powershell
vercel link
vercel env ls preview
vercel env ls production
vercel deploy
vercel deploy --prod
```

Use `vercel env add NAME preview` and `vercel env add NAME production` for each secret, or enter them in the Vercel project dashboard. Values take effect on the next deployment. Do not run `vercel deploy --prod` until both managed database URLs and all required server-only credentials are present; otherwise the repository’s production validator intentionally stops the build.
