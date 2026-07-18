# Protect a private prompt

Use workspace-scoped access and keep the prompt privacy level set to `PRIVATE` for sensitive material.

Phase 2 protections:

- Prompt versions are encrypted at rest.
- Optimization candidates are encrypted at rest.
- Retry request data is encrypted.
- Audit and request metadata do not store raw private prompt bodies.
- Cross-workspace reads are rejected before decryption.

Do not paste secrets, API keys, seed phrases, passwords, or regulated personal data into prompts. Replace private values with placeholders.
