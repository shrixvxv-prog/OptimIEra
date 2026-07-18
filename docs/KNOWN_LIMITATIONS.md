# Known limitations

## Phase 2 local engine

- The active provider is `OptimIEra Rules Engine`, a deterministic local optimization engine.
- Rules-engine results are product heuristics, not external-model inference and not universal benchmark guarantees.
- Results should be reviewed before production use.
- No external model provider is configured.
- 0G Compute Router integration is implemented, but live authenticated inference remains UNCONFIGURED until a funded server-side `sk-` key and model are supplied.

## Still planned or blocked

- Phase 7 live activation is intentionally `UNCONFIGURED`: `OG_COMPUTE_API_KEY` and `OG_COMPUTE_MODEL`, `OG_STORAGE_PRIVATE_KEY`, and `OPTIMIERA_CHAIN_PRIVATE_KEY` plus `OPTIMIERA_REGISTRY_ADDRESS` are absent. The unified preflight refuses mainnet and never fabricates evidence.

- Phase 8 Galileo activation is complete for the captured testnet evidence record. Future live records still require funded server-side Compute, Storage, and Chain credentials; no credentials or private prompt content are included in public evidence.

- Phase 7B database recovery is complete against separate local `optimiera` and `optimiera_test` databases. Live 0G credentials and funding remain intentionally absent.

- Live 0G Storage upload/proof verification requires a funded server-side signer; without it the live status remains `UNCONFIGURED` and evidence stays local and encrypted. The test adapter is test-only infrastructure and is never reported as live storage.
- Live 0G Chain proof verification requires a deployed registry, funded deployment/registrar accounts, and explicit server-side chain configuration. Local proof commitments and the deterministic test-adapter browser workflow work without them. The test adapter is not a live-chain claim and is never enabled without its explicit test flag.
- Certificates expose public-safe hashes and status only. Public discovery is intentionally not a global listing; certificates are reachable by exact slug/URL. Live Storage/Chain trust levels require real verified integrations, while test-adapter certificates remain `TEST_VERIFIED`.
- Public certificates, Agentic ID, payments, 0G Data Availability, marketplace, scheduled monitoring, and production deployment remain out of scope.
- A later live Storage smoke test requires `OG_STORAGE_ENABLED=true`, verified RPC and indexer endpoints, a funded server-side private key, and an explicit `pnpm og:storage:check --upload-smoke` run.
- Wallet authentication supports injected EIP-1193 wallets such as MetaMask, Rabby, and OKX Wallet. WalletConnect and non-injected mobile connectors remain future compatibility work.
- Retention, deletion workflow, enterprise key management, and production incident processes remain future work.

## Verified baseline

- Phase 1E had 39 Vitest tests and 5 Playwright workflows passing twice.
- Phase 2 adds local optimizer unit tests, PostgreSQL optimization persistence tests, and browser optimization workflows.
# Wave 2 production limitations

- A Vercel project, managed PostgreSQL instance, and production secrets must be provisioned by the operator; this repository does not create them.
- Wave 2 leaves 0G Storage and Chain writes disabled by default. Existing live evidence can be verified and restored read-only.
- Live compute, storage, and chain credentials are not included and are never fabricated.
