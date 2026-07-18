# Security model

The Phase 5 registry uses OpenZeppelin access roles, pause protection, registrar-only registration, admin-only revocation, deterministic duplicate-resistant proof IDs, bounded scores, and typed adapter errors. Transaction hashes are persisted before waiting for receipts so submitted transactions are not blindly resubmitted.

Credentials remain server-side through Better Auth. Protected operations require server-side session validation, workspace membership, resource ownership checks, and role permission checks. The centralized role matrix is not a client-side control.

Prompt versions and optimization candidates are encrypted with AES-256-GCM before database storage. Authorization happens before decrypting source prompt versions or candidate content. Retry request data is encrypted on the OptimizationJob. Request metadata contains safe summaries, counts, hashes, and configuration only; raw private prompt bodies are not stored in metadata.

Prompt text is untrusted input. The rules engine analyzes prompt-injection patterns but never executes code supplied inside prompts. Audit metadata is recursively redacted. Errors use typed safe codes and do not expose raw database errors or private content.

SIWE uses Better Auth's one-time nonce and signature verification flow for injected EIP-1193 wallets. 0G Compute, Storage, Chain, certificates, Agentic ID, payments, and DA are planned and not active security boundaries in Phase 2.
