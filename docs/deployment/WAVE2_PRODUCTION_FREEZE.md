# Wave 2 production freeze

Wave 2 prepares OptimIEra for Vercel with an external PostgreSQL database, Better Auth, encrypted prompt storage, and read-only public evidence verification.

Local development keeps `OPTIMIERA_DEMO_MODE=true` and live writes disabled. Public Preview/Production uses the explicitly opted-in Aristotle mainnet profile when configured; either live-write variable set to `false` disables live writes as an emergency kill switch. Rules Engine optimization remains available, and Storage uploads, Chain registration, and revocation remain bounded by the existing database-backed quotas.

No additional registry deployment is part of this release because the OptimIEra registry already exists on Aristotle mainnet. Mainnet writes and certificate issuance are enabled only in a correctly configured public environment and remain bounded by the existing quotas and emergency kill switches.
