# 0G Storage architecture

Purpose: server-side encrypted optimization evidence storage. Implementation: **LIVE_VERIFIED on Galileo testnet; Aristotle mainnet configuration supported, live mainnet write/readback pending**. Sources: https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk and https://docs.0g.ai/developer-hub/testnet/testnet-overview · Verified: 2026-08-31.

Package: `@optimiera/og-storage`. The flow is a canonical `OptimizationEvidenceManifestV1` with AES-encrypted private envelopes, SDK `MemData`, Merkle-root calculation, upload, proof-enabled download, and manifest/content verification. Storage credentials remain server-side and plaintext prompts are never uploaded.

Evidence: the real Galileo flow uploaded a valid 1,720-byte `OptimizationEvidenceManifestV1`, returned root `0xa774bdf9ec59f11f13434705da94b15f6635b7347307f8828e718d4dc9f146f4`, submitted transaction `0x43a1228f8806e71d95d727ba3e0667c42fbf9374f59316a4b2807b787de99d1b`, found indexed replicas, downloaded with proof enabled, and matched the exact content and manifest hashes. The repeatable diagnostic is `pnpm og:live:testnet`.
