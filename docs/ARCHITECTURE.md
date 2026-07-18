# Architecture

OptimIEra is a pnpm/Turborepo monorepo with a Next.js Studio, Docusaurus Atlas, API boundary, PostgreSQL/Prisma persistence, Better Auth sessions, workspace-scoped repositories, shared schemas, deterministic optimizer core, evaluation facade, encryption package, and adapter packages for later 0G work.

Phase 2 adds the provider-neutral OptimIEra Intelligence Engine:

- `@optimiera/schemas` validates optimization requests, modes, privacy levels, output types, expected length, and structured-output schema constraints.
- `@optimiera/optimizer-core` implements Prompt Analyzer, deterministic weighted scoring, `OptimIEraRulesProvider`, candidate generation, candidate evaluation, winner selection, tie handling, provider health, typed provider errors, and prompt diffing.
- `@optimiera/evaluation-engine` exposes the deterministic evaluation and diff contracts.
- `@optimiera/database` persists OptimizationJob, Candidate, EvaluationRun, EvaluationResult, encrypted retry request data, encrypted candidate content, history, and saved PromptVersion links.
- `apps/web` hosts `/app/optimize`, optimization result/history pages, API routes, dashboard metrics, and save-as-version actions.

Private prompt versions and candidate prompt bodies are stored as AES-256-GCM envelopes. Authorization happens before source-version decryption or candidate decryption. Request metadata is sanitized and does not contain raw prompt bodies. Audit events are recursively redacted.

The active provider is `OptimIEra Rules Engine`. It is deterministic local optimization, not external-model inference. `OG_COMPUTE`, encrypted Storage evidence, hash-only Chain proofs, and public certificates are adapter-backed and retain explicit `UNCONFIGURED`/test/live distinctions.

Phase 6 certificates are immutable snapshots of a completed optimization, saved PromptVersion, encrypted evidence manifest, and available proof records. Public projections contain hashes and safe metadata only. Verification recalculates canonical content hashes, checks available evidence and proof readback, propagates revocation, and never upgrades trust based on configuration alone.
