# Production freeze

The production candidate is frozen to the current OptimIEra DApp scope. It includes email/password and injected-wallet sign-in, workspace-scoped prompt optimization, encrypted evidence, public certificates, and the already-verified Galileo proof record, with explicit Aristotle mainnet configuration support.

Production safety rules:

- Aristotle mainnet requires `OPTIMIERA_0G_MAINNET_ENABLED=true`, all 0G networks set to `mainnet`, and chain ID `16661`; otherwise production rejects the configuration.
- Public live writes default to enabled only when the required public credentials are present; either live-write flag can disable them.
- Compute, Storage, and Chain writes have per-user and global UTC-day database quotas.
- Rules Engine selection never calls an external provider.
- An unsuccessful external-provider request never silently changes provider.
- Secrets and plaintext prompts never appear in public certificates, health responses, or browser configuration.
- The supplied Phase 8D evidence is restored by readback and database reconstruction only. The restore path does not upload or submit a transaction.

Out of scope for this freeze: new registry deployment, Agentic ID, DA, marketplace work, and new payment development.

Deployment is not complete until managed Preview and Production PostgreSQL instances exist, migrations pass, both environments pass smoke tests, and the canonical production URL is recorded.
