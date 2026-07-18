# 0G Chain architecture

Purpose: hash-only optimization provenance and onchain proof state. Implementation: **IMPLEMENTED**; local commitments, the production adapter boundary, and configured test-adapter browser verification are complete. Live status is **UNCONFIGURED** without a registry address and funded registrar. Official Galileo configuration: chain ID `16602`, RPC `https://evmrpc-testnet.0g.ai`, explorer `https://chainscan-galileo.0g.ai`, Cancun EVM target. Package: `@optimiera/og-chain`, `@optimiera/contracts`.

The registry stores only a deterministic proof ID, manifest/storage/prompt/evaluation hashes, a domain-separated owner reference hash, score, registrar, timestamp, and status. No plaintext prompt, candidate, encryption key, email, or private metadata is sent onchain. Local commitments remain available when chain is unconfigured; registration is disabled and no transaction values are invented.

Deployment and verification require Foundry, explicit chain configuration, funded deployment and registrar accounts, deployed bytecode, receipt confirmation, and readback field comparison. No live deployment is claimed.
