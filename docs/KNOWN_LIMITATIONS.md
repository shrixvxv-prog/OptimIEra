# Known limitations

## Phase 2 local engine

- The active provider is `OptimIEra Rules Engine`, a deterministic local optimization engine.
- Rules-engine results are product heuristics, not external-model inference and not universal benchmark guarantees.
- Results should be reviewed before production use.
- The Rules Engine remains the default provider and is deterministic/local. Nous prompt intelligence is configured in the current local environment; external providers still require explicit provider selection, and local safe mode keeps them disabled.
- The 0G Compute Router has verified Galileo evidence, and the production configuration now supports explicit Aristotle mainnet opt-in. Deployment environments still need their own mainnet Router key and live-write policy.

## Still planned or blocked

- Final Vercel verification is blocked until the account owner accepts the Neon Marketplace terms and separate managed Preview/Production PostgreSQL databases are provisioned. No localhost or shared-database workaround is permitted.
- Public Vercel live 0G writes default to bounded Aristotle mainnet operations only after `OPTIMIERA_0G_MAINNET_ENABLED=true` and all required server-side configuration are present. Local development remains disabled by default, either live-write flag can disable public writes, and all live operations remain bounded by database-backed per-user and global daily quotas.

- Phase 7/8 Galileo live activation is verified locally for Compute, Storage, and Chain proof readback. A public deployment still requires managed PostgreSQL and server-side Vercel secrets; no public app deployment is claimed yet.

- Phase 8 Galileo activation is complete for the captured testnet evidence record. Future live records still require funded server-side Compute, Storage, and Chain credentials; no credentials or private prompt content are included in public evidence.

- Phase 7B database recovery was completed against separate local `optimiera` and `optimiera_test` databases when the Docker engine was available. The current machine must have Docker Desktop running before the database-backed suite can be rerun.

- Live 0G Storage upload/proof verification requires a funded server-side signer; without it the live status remains `UNCONFIGURED` and evidence stays local and encrypted. The test adapter is test-only infrastructure and is never reported as live storage.
- Live 0G Chain proof verification requires a deployed registry, funded deployment/registrar accounts, and explicit server-side chain configuration. Local proof commitments and the deterministic test-adapter browser workflow work without them. The test adapter is not a live-chain claim and is never enabled without its explicit test flag.
- Certificates expose public-safe hashes and status only. Public discovery is intentionally not a global listing; certificates are reachable by exact slug/URL. Live Storage/Chain trust levels require real verified integrations, while test-adapter certificates remain `TEST_VERIFIED`.
- Agentic ID, 0G Data Availability, marketplace, scheduled monitoring, and managed production deployment remain out of scope. Galileo usage payments are implemented but disabled locally until a deployment operator enables them.
- A repeatable real Galileo Storage + Chain evidence run is available through `pnpm og:live:testnet`; it requires `OG_STORAGE_ENABLED=true`, verified RPC/indexer endpoints, a funded server-side Storage signer, a deployed registry, and a funded Chain registrar.
- Wallet authentication supports injected EIP-1193 wallets such as MetaMask, Rabby, and OKX Wallet. WalletConnect and non-injected mobile connectors remain future compatibility work.
- Retention, deletion workflow, enterprise key management, and production incident processes remain future work.

## Verified baseline

- Phase 1E had 39 Vitest tests and 5 Playwright workflows passing twice.
- Phase 2 adds local optimizer unit tests, PostgreSQL optimization persistence tests, and browser optimization workflows.

# Public Aristotle mainnet release limitations

- The Vercel project is linked and the Aristotle non-secret configuration is code-ready, but the operator must provision isolated managed Preview/Production PostgreSQL databases and add server-side secrets before a public deployment can pass its build gate.
- Public Preview/Production defaults to bounded Aristotle mainnet live writes only when the explicit mainnet flag and required Compute, Storage, Chain, auth, encryption, and database configuration are present. Local development remains safe by default; either live-write flag disables public writes.
- Credentials are never committed to the repository or fabricated. Existing Galileo evidence is local and does not constitute authenticated Aristotle mainnet evidence or a public app deployment.
