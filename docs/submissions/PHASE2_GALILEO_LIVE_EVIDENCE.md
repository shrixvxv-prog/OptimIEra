# Phase 2 Galileo Live Evidence

This record contains the output of the repository command `pnpm og:live:testnet`
executed on 2026-09-03. It is a real adapter-level Galileo diagnostic, not a
claim that the authenticated web application workflow was completed.

## Verified scope

- Network: 0G Galileo Testnet
- Chain ID: `16602`
- Storage: encrypted payload upload, returned root validation, proof-enabled download, byte/hash validation
- Chain: registry transaction, successful receipt, and contract readback
- Prompt plaintext: not included

## Storage evidence

- Status: `LIVE_VERIFIED`
- Root: `0x00b4c30eb2e8e9bcfe7a4fbdf1c5ab62b194a20c60d127d752827fa33bdba543`
- Transaction: `0xc41e99872d6980faac275b6ef22b826499a2c32584cfacc8c7ca89daaed29c5a`
- Encrypted content hash: `665a85be057bced0aa25037ad89e76e093a6e8fa5fa07a214cab8b89586836dd`
- Readback: `MATCHED_AND_PROOF_VERIFIED`

## Chain evidence

- Status: `LIVE_VERIFIED`
- Proof ID: `0xfeaae764e1443969a62d94982c138c424619858bcb424340428912eb91322c8c`
- Transaction: `0xaaefdb3d936ce55ca0088116cc5a6a153839fb5e6c700487c6ca1f670338842d`
- Contract: `0xda91a3929107c74f27e2d3288d046e4a37f9b422`
- Block: `52832556`
- Receipt: `success`
- Readback: `MATCHED_AND_VERIFIED`

## Scope limitation

The smoke command uses the existing server-side Storage and Chain adapters with
a diagnostic rules-engine manifest. It does not authenticate a browser user,
persist a PostgreSQL optimization, invoke optional 0G Compute, or issue an
application certificate. Those remaining application steps require a reachable
managed/local PostgreSQL instance and a configured authenticated session.
