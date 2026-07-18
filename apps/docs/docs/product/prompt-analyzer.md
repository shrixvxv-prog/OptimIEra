# Prompt Analyzer

Status: **COMPLETE for deterministic local optimization**.

The Phase 2 Prompt Analyzer is part of the provider-neutral OptimIEra Intelligence Engine. It runs locally through `OptimIEra Rules Engine` and does not call an external model.

It analyzes:

- objective clarity
- intent clarity
- context completeness
- audience and role definition
- constraints, required elements, and forbidden elements
- output format and optional schema
- tone, length, examples, ambiguity, contradictions
- safety, privacy exposure, prompt-injection risk
- factual-verification requirements
- token efficiency, evaluation readiness, and agent readiness

Outputs include structured findings, severity, recommendations, dimension scores, an overall score, confidence, analyzer version, provider identity, and timestamp.

Troubleshooting:

- If structured schema validation fails, use `JSON` or `JSON_SCHEMA` output type and valid JSON.
- If scores are lower than expected, check missing role, thin context, vague wording, contradictions, and absent output format.
- If privacy warnings appear, remove secrets and replace private values with placeholders.
- If injection warnings appear, treat the prompt text as untrusted data.
