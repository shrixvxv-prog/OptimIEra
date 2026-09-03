# OptimIEra Winning Upgrade Checklist

Phase 0 is the baseline audit. All future work remains unchecked. This checklist is planning state only and does not authorize starting a later phase.

## Phase 1 — Reproducible foundation and release hygiene

- [ ] Preserve and isolate the Phase 0 worktree baseline.
- [ ] Restore deterministic local PostgreSQL and separate `optimiera_test` setup.
- [ ] Make all database integration and Playwright gates reproducible.
- [ ] Freeze capability/status/evidence vocabulary and release checklist.
- [ ] Add baseline artifact provenance without changing business behavior.

## Phase 2 — Winning prompt intelligence

- [ ] Define benchmark datasets and evaluation methodology.
- [ ] Add regression fixtures for analyzer, scoring, candidates and recommendations.
- [ ] Measure explainable quality deltas against the deterministic baseline.
- [ ] Add reviewer-facing comparison and proof narratives.
- [ ] Preserve deterministic local mode as the safe fallback/default.

## Phase 3 — Production 0G Compute hardening

- [ ] Harden provider contracts, trace metadata and structured response validation.
- [ ] Add bounded timeout, retry, backoff and failure-recovery coverage.
- [ ] Add explicit model/version selection and cost/quota accounting.
- [ ] Reproduce Galileo Compute evidence from clean environments.
- [ ] Keep Aristotle Compute claims unverified until real evidence exists.

## Phase 4 — 0G Storage evidence productization

- [ ] Harden encrypted manifest lifecycle and proof-aware retrieval.
- [ ] Add upload/readback/retry/recovery operational drills.
- [ ] Add integrity, replica and content-hash monitoring.
- [ ] Publish only reproducible, redacted evidence records.
- [ ] Keep test adapters separate from live Storage status.

## Phase 5 — 0G Chain proof hardening

- [ ] Establish contract release provenance and ABI compatibility checks.
- [ ] Harden idempotent submission, confirmation, readback and revocation recovery.
- [ ] Add independently reproducible proof verification artifacts.
- [ ] Verify network/address/chain-ID alignment before every live operation.
- [ ] Keep test-adapter proofs classified as test-only.

## Phase 6 — Public deployment and operations

- [ ] Provision isolated managed Preview and Production PostgreSQL databases.
- [ ] Configure server-only secrets through the deployment platform.
- [ ] Pass production environment validation and readiness checks.
- [ ] Run remote Preview smoke tests and recovery drills.
- [ ] Establish backups, observability, incident response and rollback procedures.
- [ ] Enable bounded live writes only after explicit operator approval and evidence.

## Phase 7 — Developer platform

- [ ] Define stable versioned SDK contracts.
- [ ] Implement real SDK operations against authenticated APIs.
- [ ] Implement real CLI commands, configuration and redacted diagnostics.
- [ ] Add SDK/CLI integration, compatibility and release tests.
- [ ] Remove status-only placeholders only when the implementations are real.

## Phase 8 — Agentic ID and data availability

- [ ] Confirm the latest official protocol specifications and reference implementations.
- [ ] Design production security, ownership and recovery model.
- [ ] Implement real Agentic ID integration; do not use simplified proof logic.
- [ ] Implement real DA integration with verifiable availability evidence.
- [ ] Add independent integration tests and honest environment classification.

## Cross-cutting release requirements

- [ ] Never expose or commit secrets, private keys, credentials or encryption keys.
- [ ] Never fabricate transactions, roots, certificates, metrics or deployment status.
- [ ] Keep `LOCAL`, `TEST`, `GALILEO_TESTNET`, `MAINNET`, `UNCONFIGURED` and `VERIFIED` distinct.
- [ ] Run applicable format, lint, typecheck, unit, E2E, docs, web, build, safety and contract gates.
- [ ] Record exact command results and environmental blockers for every phase.
- [ ] Do not rewrite existing deterministic or security-critical behavior without an approved migration plan.
