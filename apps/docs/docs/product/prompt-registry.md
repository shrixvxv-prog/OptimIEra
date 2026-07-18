# Prompt Registry

Status: **COMPLETE for local encrypted prompt assets**.

The Prompt Registry stores workspace-scoped prompts and immutable PromptVersion records. PromptVersion content is encrypted with AES-256-GCM. New optimized candidates are saved as new versions; existing source versions are not mutated.

The registry also supports review requests, reviewer decisions, active-version publication, and optimization history links.

Public provenance and certificates remain planned for later phases.
