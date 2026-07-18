# Threat model

Onchain provenance is treated as public metadata. Hash commitments, not prompt content, are published. Threats include hash mismatch, wrong-chain configuration, duplicate registration, unauthorized registrar/revocation, receipt loss, and privacy correlation; network/contract checks, role gates, atomic claims, receipt resumption, and readback comparison address these risks.

Assets: prompts, optimized candidates, retry request payloads, scores, evaluation results, audit logs, encryption keys, sessions, workspace membership, and future provenance records.

Threats include prompt leakage, unauthorized cross-workspace reads, forged invitations, illegal role changes, candidate plaintext persistence, prompt-injection content, malicious prompt text that asks the system to reveal secrets, retry/result leakage, provider compromise, replay, denial of service, and misconfiguration.

Controls in Phase 2:

- Server-side Better Auth session checks.
- Workspace membership, resource ownership, and role checks before mutation or decryption.
- AES-256-GCM encryption for PromptVersion content, Candidate content, and retry request payloads.
- Sanitized OptimizationJob metadata without raw private prompt bodies.
- Typed safe API errors.
- Idempotency keys for duplicate optimization submissions.
- Deterministic local provider health and typed provider errors.
- Recursive audit redaction.
- Prompt Analyzer warnings for privacy exposure, injection risk, safety issues, ambiguity, and contradictions.
- Size limits and structured-output schema validation.

Prompts are treated as untrusted text. OptimIEra does not execute code supplied inside prompts.

Future threats for 0G Compute, 0G Storage, 0G Chain, certificates, Agentic ID, payments, and DA remain planned until those integrations exist.
