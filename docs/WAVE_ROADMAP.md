# Wave roadmap

Phase 1 is complete: persistence, Better Auth, workspace tenancy, roles, invitations, immutable encrypted prompt versions, review services, audit presentation, typed errors, loading/confirmation states, and browser isolation tests.

Phase 2 is the local OptimIEra Intelligence Engine: structured request validation, Prompt Analyzer, deterministic scoring, exactly three rules-engine candidates, original/candidate evaluation, recommendation, tie handling, prompt diff, encrypted optimization persistence, history, dashboard metrics, and save-candidate-as-version.

The active provider is `OptimIEra Rules Engine`, a deterministic local optimizer. It is not external-model inference.

Phase 3 recommended scope: 0G Compute provider implementation, provider health/configuration UI, model-assisted candidate generation/evaluation, provider trace metadata, timeout/retry hardening, and comparison against the local rules engine. Do not include 0G Storage, Chain, certificates, Agentic ID, payments, or DA until the Compute provider is real and tested.

Phase 4 and Phase 5 are complete for encrypted evidence, local/test proof workflows, and honest live-status gating. Phase 6 adds public-safe certificates, Proof Center verification, JSON downloads, and revocation. Phase 7 should focus on operational readiness and optional live-integration activation; Agentic ID, payments, and DA remain separately gated.

## Next wave — public Aristotle mainnet release

The 2026-08-31 Galileo closure verified a real encrypted Storage upload with
proof-enabled readback and a matching Chain registry proof transaction. The
next wave is intentionally release-oriented rather than another one-day import:

1. Ship a public Preview deployment with managed database provisioning and
   remote smoke evidence.
2. Promote the explicit Aristotle mainnet configuration, chain `16661`, and
   existing registry address through the deployment environment, keeping secrets
   server-side.
3. Enable live writes by default only after the public environment passes the
   wallet, quota, payment, Storage, Chain, and recovery gates.
4. Run the work across the full wave window: deploy, observe, test recovery,
   publish evidence, and then widen access.

Agentic ID, DA, and other new protocol surfaces remain out of this next-wave
scope.
