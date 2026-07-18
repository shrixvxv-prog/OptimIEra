# Certificate

`OptimizationCertificateV1` is an immutable, public-safe snapshot of an OptimIEra optimization. It contains hashes, provider/scoring metadata, available Storage/Chain references, a deterministic content hash, and an honest verification level. It never contains plaintext prompts, encrypted envelopes, keys, emails, or private workspace metadata.

Trust levels are `LOCAL_VERIFIED`, `STORAGE_VERIFIED`, `CHAIN_VERIFIED`, `FULLY_VERIFIED`, `TEST_VERIFIED`, `REVOKED`, and `FAILED`. Test-adapter records are explicitly excluded from live credibility claims.
