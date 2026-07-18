# Wave 2 production freeze

Wave 2 prepares OptimIEra for Vercel with an external PostgreSQL database, Better Auth, encrypted prompt storage, and read-only public evidence verification.

`OPTIMIERA_DEMO_MODE=true` and `OPTIMIERA_LIVE_WRITES_ENABLED=false` are the release defaults. Rules Engine optimization remains available. Storage uploads, chain registration, and revocation require an explicit live-write enablement and are otherwise rejected safely.

No 0G write, certificate issuance, or registry deployment is part of this release.
