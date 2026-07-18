# OptimIEra

**Optimize. Evaluate. Verify.** Verifiable Prompt Intelligence.

OptimIEra turns raw prompts into analyzed, scored, optimized, versioned prompt assets. Phase 2 includes a provider-neutral local intelligence engine that works without external AI credentials.

![Implementation status: Phase 2 local intelligence engine](https://img.shields.io/badge/status-Phase%202%20local%20engine-16c7d9)

Documentation: **not deployed**. Application: **not deployed**.

## Product foundation

OptimIEra Studio now supports `raw prompt -> context -> analysis -> deterministic scoring -> three optimized candidates -> comparison -> recommendation -> prompt diff -> encrypted immutable version`. The active provider is clearly labeled:

```text
Provider: OptimIEra Rules Engine
Mode: Deterministic local optimization
```

The rules engine is not external-model inference and does not fabricate AI-provider metadata.

## Architecture

The pnpm/Turborepo monorepo contains a Next.js Studio, API boundary, Docusaurus OptimIEra Atlas, shared schemas, deterministic optimizer core, evaluation facade, PostgreSQL/Prisma persistence, AES-256-GCM prompt storage, and future integration adapters. 0G integrations remain interfaces or documentation only in this phase.

## Local setup on Windows 11

Prerequisites: Node 24+, pnpm 11+, Git, and Docker Desktop. PowerShell is the supported shell.

```powershell
pnpm install
Copy-Item .env.example .env
docker compose up -d postgres
pnpm db:migrate:deploy
pnpm dev
```

## Commands

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm docs:build`, `pnpm web:build`, `pnpm build`, `pnpm db:validate`, `pnpm db:generate`, `pnpm db:migrate:deploy`, and `pnpm safety:scan` are the main quality gates.

## Status and roadmap

Phase 1 is complete. Phase 2 implements the local OptimIEra Intelligence Engine: Prompt Analyzer, deterministic scoring, three rules-engine candidates, recommendation, prompt diff, encrypted optimization persistence, optimization history, dashboard metrics, and save-candidate-as-version.

0G Compute Router, encrypted 0G Storage evidence, hash-only 0G Chain commitments, and public certificate verification are implemented. Phase 8D completed one authenticated Galileo structured optimization, encrypted evidence proof, registry commitment, and `FULLY_VERIFIED` public certificate. Agentic ID, payments, and DA remain later-phase scope.

## Privacy principle

Private prompts and candidate bodies are encrypted at rest with AES-256-GCM. Optimization request metadata stores safe summaries and sizes; retry request data is encrypted. Audit events contain IDs and safe summaries only. Private prompt data must never be written to a public blockchain.

## Known limitations

The OptimIEra Rules Engine is deterministic product heuristics, not universal benchmark truth. Results should be reviewed before production use. Live 0G activation remains `UNCONFIGURED` until authenticated Compute, Storage, and Chain evidence exists.

## Credits and license

0G official documentation and starter-kit patterns were researched and recorded in `docs/OFFICIAL_0G_SOURCES.md`; no starter repository was copied. Licensed MIT.
