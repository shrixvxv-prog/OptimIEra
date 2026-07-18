# Privacy model

Phase 5 onchain proofs are hash-only. The registry receives no plaintext prompts, candidates, encryption keys, emails, or raw internal database identifiers; owner references use a domain-separated hash. Evidence remains encrypted offchain and authorized readback compares hashes only.

OptimIEra separates private prompt content from shareable metadata. Plaintext private prompts, candidate prompt bodies, and private test data must never be written to a public blockchain.

Phase 2 stores prompt versions, optimization candidates, and retry request payloads as AES-256-GCM envelopes. OptimizationJob metadata stores lengths, counts, hashes, mode, output type, privacy level, and provider identity, not raw private prompt bodies. Audit events contain IDs and safe summaries only.

Authorized result pages may display decrypted source/candidate content after workspace access succeeds. Browser responses contain only data available to the authenticated user. Cross-workspace access is rejected before decryption.

Retention, deletion workflows, key rotation beyond local re-encryption utilities, external model data-processing controls, and public verification disclosure policies remain future work.
