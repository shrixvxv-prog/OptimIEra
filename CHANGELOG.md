# Changelog

## Production candidate — 2026-07-19

- Added a responsive authenticated application shell, safer public/provider states, privacy-safe proof details, branded loading/error/404 states, and accessibility coverage.
- Added testnet-only production validation and transactional per-user/global daily quotas for Compute, Storage, and Chain operations. Rules Engine remains local and external failures never silently fall back.
- Added managed-database deployment validation, production operations and route inventory, idempotent readback-only Galileo evidence restoration, and remote production smoke coverage.
- Linked the Vercel project. Managed Preview/Production deployment remains blocked until the account owner accepts Neon Marketplace terms and provisions isolated databases.

## 0.1.0 — Phase 0 foundation — 2026-07-15

- Established OptimIEra brand, monorepo, public site shell, Studio shell, Atlas hierarchy, typed adapter boundaries, source registry, CI, and roadmap.
- Marked all unimplemented runtime integrations and business capabilities as PLANNED or NOT CONFIGURED.

## Unreleased

- Added Wave 2 Vercel production-release preparation: workspace tracing, deterministic install/build commands, Prisma generation/migration deployment, safe demo/live-write flags, readiness endpoints, and an idempotent read-only Galileo evidence restoration workflow.

- Added Phase 1 Prisma 7 schema/client foundation, Better Auth route integration, workspace surfaces, role matrix helpers, seed policy, and domain-rule tests.
- Added AES-256-GCM prompt encryption, guarded local re-encryption, ciphertext-at-rest integration coverage, Playwright smoke coverage, and PostgreSQL-backed CI setup.
- Added transaction-backed invitation lifecycle, member role/removal services and UI, prompt review services and routes, recursive audit redaction, audit-log UI, and expanded integration coverage.
- Completed Phase 1E browser verification: five full Playwright workflows pass twice, covering invitation lifecycle, role/owner enforcement, review transitions, immutable history, and cross-workspace denial. SIWE remains blocked.
- Added Phase 2 OptimIEra Intelligence Engine and Phase 3 0G Compute Router integration: server-side model discovery, one combined structured inference request, strict validation with one repair, safe retries/errors, explicit provider selection, and focused Router tests. Live authenticated status remains UNCONFIGURED.
- Added Phase 4 encrypted evidence manifests, local Artifact persistence, official 0G Storage SDK adapter, Merkle-root comparison, proof-enabled download verification, explicit local fallback, storage diagnostics, evidence UI, and secure evidence API boundary. Live storage status remains UNCONFIGURED.
- Closed Phase 4 verification coverage with local evidence browser persistence/authorization flows and test-only adapter lifecycle, failure/retry, and idempotency coverage. Live storage remains UNCONFIGURED pending a funded signer-backed smoke test.
- Added Phase 5 hash-only 0G Chain registry contract, Cancun Foundry configuration, viem adapter, deterministic proof commitments, ChainProof persistence, local proof UI/API, and honest unconfigured-chain diagnostics. No live deployment is claimed.
- Completed Phase 5B verification closure with a deterministic test-only chain adapter through the real browser/service path, persisted transition and receipt metadata, timeout resume, duplicate prevention, readback verification, safe failure mapping, revocation, and authorization coverage. Live 0G Chain remains UNCONFIGURED.
- Added Phase 6 public-safe `OptimizationCertificateV1` issuance, deterministic trust levels, idempotent persistence, authenticated certificate management, public verification/download routes, Proof Center status, revocation, chain-revocation propagation, and tamper detection. Live Storage/Chain claims remain gated by actual verified integrations.
- Added Phase 7 unified 0G live preflight, testnet-only activation confirmation, safe credential redaction, network refusal, and `docs/submissions/LIVE_0G_EVIDENCE.md`. Live status remains `UNCONFIGURED`; no live calls were made.
- Closed Phase 7B database recovery: separate development/test databases are healthy, existing migrations are current, all 84 Vitest tests pass, and the enabled Playwright suite passes twice (12 passed, 1 intentional skip per run). The E2E runner now loads the existing local environment for encrypted test setup.
- Attempted Phase 8C Galileo proof recovery safely: diagnosed the Compute HTTP 400 as Galileo's `max_tokens` limit, added a 2048-token clamp, and corrected the diagnostic minimum from 8 to 10; a minimal Router diagnostic now succeeds, while structured adapter inference still fails validation. The existing Storage receipt/root/proof and four replicas were verified without re-uploading, while its diagnostic payload was correctly rejected as a non-manifest. Registry deployment and registrar-role readback remain valid; no proof or live certificate was claimed.
- Phase 8D completed one authenticated Galileo `qwen2.5-omni` structured optimization with immutable prompt selection, encrypted manifest proof recovery, one registry commitment, readback verification, and a public `FULLY_VERIFIED` certificate. The recovery path resumed the existing Storage transaction sequence without submitting a duplicate transaction.
