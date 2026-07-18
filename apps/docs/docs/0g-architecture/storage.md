# 0G Storage architecture

Purpose: server-side encrypted optimization evidence storage. Implementation: **COMPLETE**; live status is **UNCONFIGURED** without a funded signer. Sources: https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk and https://docs.0g.ai/developer-hub/testnet/testnet-overview · Verified: 2026-07-16.

Package: `@optimiera/og-storage`. The flow is a canonical `OptimizationEvidenceManifestV1` with AES-encrypted private envelopes, SDK `MemData`, Merkle-root calculation, upload, proof-enabled download, and manifest/content verification. Storage credentials remain server-side and plaintext prompts are never uploaded.

Evidence: local manifest creation, browser persistence/authorization coverage, and test-only adapter lifecycle/failure-retry tests. No live upload is claimed. A live smoke test requires `OG_STORAGE_ENABLED=true`, verified RPC and indexer endpoints, a funded server-side private key, and an explicit `pnpm og:storage:check --upload-smoke` run.
