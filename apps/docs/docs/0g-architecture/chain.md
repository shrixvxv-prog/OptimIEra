# 0G Chain architecture

Purpose: hash-only optimization provenance and onchain proof state. Implementation: **LIVE_VERIFIED on Galileo testnet; Aristotle mainnet configuration supported, live mainnet proof pending**; local commitments, the live viem adapter, and test-adapter browser verification are complete. Official Galileo configuration: chain ID `16602`, RPC `https://evmrpc-testnet.0g.ai`, explorer `https://chainscan-galileo.0g.ai`, Cancun EVM target. Package: `@optimiera/og-chain`, `@optimiera/contracts`.

The registry stores only a deterministic proof ID, manifest/storage/prompt/evaluation hashes, a domain-separated owner reference hash, score, registrar, timestamp, and status. No plaintext prompt, candidate, encryption key, email, or private metadata is sent onchain. Local commitments remain available when chain is unconfigured; registration is disabled and no transaction values are invented.

The Galileo registry is deployed at `0xda91a3929107c74f27e2d3288d046e4a37f9b422`. A live proof commitment was registered in transaction `0x91f485dde3feceb31d410ff079a39fdd52e09ccccc03514040e270869858931d`, confirmed in block `52402711`, and read back with matching commitment fields. The repeatable storage-plus-proof diagnostic is `pnpm og:live:testnet`.
