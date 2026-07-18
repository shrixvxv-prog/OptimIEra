# Production freeze

The production candidate is frozen to the current OptimIEra testnet DApp scope. It includes email/password and injected-wallet sign-in, workspace-scoped prompt optimization, encrypted evidence, public certificates, and the already-verified Galileo proof record.

Production safety rules:

- 0G is restricted to Galileo testnet (chain ID `16602`). Mainnet configuration is rejected.
- Public live writes are disabled unless `OPTIMIERA_PUBLIC_LIVE_0G_ENABLED=true`.
- Compute, Storage, and Chain writes have per-user and global UTC-day database quotas.
- Rules Engine selection never calls an external provider.
- An unsuccessful external-provider request never silently changes provider.
- Secrets and plaintext prompts never appear in public certificates, health responses, or browser configuration.
- The supplied Phase 8D evidence is restored by readback and database reconstruction only. The restore path does not upload or submit a transaction.

Out of scope for this freeze: mainnet, Agentic ID, DA, marketplace work, and new payment development.

Deployment is not complete until managed Preview and Production PostgreSQL instances exist, migrations pass, both environments pass smoke tests, and the canonical production URL is recorded.
