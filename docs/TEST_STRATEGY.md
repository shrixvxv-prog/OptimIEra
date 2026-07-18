# Test strategy

Unit tests cover Phase 1 domain rules, AES-256-GCM behavior, Phase 2 request validation, empty prompt rejection, invalid structured schema rejection, analyzer determinism, ambiguity/contradiction/safety/privacy/injection findings, scoring-weight total, deterministic candidate generation, exactly three unique candidate types, winner selection, tie reporting, strong-original recommendation behavior, prompt diff, provider health, and typed provider errors.

PostgreSQL integration tests run against the separate local `optimiera_test` database. They cover Phase 1 invitation/member/review/audit workflows, ciphertext-at-rest, authorized decryption, workspace isolation, plus Phase 2 optimization job creation, encrypted candidate persistence, evaluation persistence, winner persistence, failed-job persistence, optimization history retrieval, encrypted retry request data, saving a candidate as an immutable PromptVersion, source-version immutability, duplicate submission protection, and wrong-workspace save denial.

Playwright runs the full Chromium workflow suite against a real Next server, Better Auth, and PostgreSQL. Phase 1 flows remain covered. Phase 2 adds a complete browser flow for Optimize -> analysis -> three candidates -> comparison/diff -> recommendation -> save as new version -> reload saved version -> provider label, plus viewer mutation denial. Phase 4 adds local encrypted evidence, hash/size/status display, reload persistence, and evidence authorization coverage. Configured upload, deterministic roots, proof-enabled download verification, failure mapping, retry, and duplicate-success prevention are covered by focused test-only adapter integration tests; the adapter is not part of the production runtime.

Phase 5 adds commitment determinism, privacy-safe owner references, unconfigured chain health, local proof persistence, and disabled registration browser coverage. Phase 5B adds a test-only chain adapter exercised through the real web services and browser UI: LOCAL_READY -> CHAIN_PENDING -> SUBMITTED -> CONFIRMED -> VERIFIED, receipt-timeout resume, deterministic metadata, readback mismatch/error mapping, duplicate rejection, revocation, and role authorization. The adapter is never described as live 0G Chain; live chain verification must never be represented by a fixture.

Phase 6 adds certificate canonicalization, idempotent issuance from saved immutable versions, local/test trust classification, public-safe verification and JSON downloads, certificate revocation, chain-revocation propagation, and tampered-evidence failure coverage.

## Phase 7 live activation controls

`tests/unit/phase7.test.ts` covers absent-credential classification, Galileo
network refusal, secret redaction, status separation, explicit confirmation,
and partial-evidence rejection. Live activation is not exercised without real
credentials; the command must report `liveCallsMade: false` in that state.

Phase 7B verification restores both local databases, applies the existing six
migrations without creating a new migration, runs the 84-test Vitest suite,
and runs the enabled Chromium suite twice from clean `optimiera_test` resets.
Both browser runs pass 12 tests with one intentional unconfigured-storage skip.
