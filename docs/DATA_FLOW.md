# Data flow

Phase 2 optimization flow:

1. Authenticated user submits a Zod-validated optimization request.
2. Server verifies workspace membership, project ownership, prompt ownership, and write permission.
3. Source prompt content is decrypted only after authorization.
4. OptimizationJob is created as `QUEUED`, then moved to `RUNNING`.
5. `OptimIEra Rules Engine` analyzes the prompt, scores dimensions, generates exactly three candidates, evaluates original plus candidates, and selects a recommendation.
6. Candidate prompt text is encrypted before database persistence.
7. EvaluationRun and EvaluationResult persist scores, warnings, confidence, tie information, and recommendation rationale.
8. The job moves to `SUCCEEDED` or `FAILED` with a safe failure code/message.
9. Authorized users can view result details, prompt diff, and optimization history.
10. A selected candidate can be saved as a new immutable encrypted PromptVersion; the source version remains unchanged.

Failure recovery stores encrypted retry request data and safe failure metadata. Audit records contain IDs and safe summaries, never raw private prompt content.

Future 0G flow remains planned: encrypted evidence manifest -> 0G Storage -> hash/provenance on 0G Chain -> Agentic ID association -> public certificate.
