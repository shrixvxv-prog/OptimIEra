import { createHash } from 'node:crypto';
import { z } from 'zod';

export const evaluatorTypes = z.enum([
  'EXACT_MATCH',
  'CONTAINS',
  'DOES_NOT_CONTAIN',
  'JSON_SCHEMA',
  'REGEX',
  'CLASSIFICATION',
  'STRUCTURED_FIELDS',
  'MANUAL_REVIEW_REQUIRED',
]);
export const privacyClassifications = z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SENSITIVE']);
export type EvaluatorType = z.infer<typeof evaluatorTypes>;
export type PrivacyClassification = z.infer<typeof privacyClassifications>;
export const benchmarkCaseSchema = z.object({
  id: z.string().min(1),
  input: z.string(),
  expectedOutput: z.unknown().optional(),
  criteria: z.string().optional(),
  tags: z.array(z.string()).default([]),
  weight: z.number().positive().default(1),
  evaluator: evaluatorTypes,
  evaluatorConfig: z.record(z.unknown()).default({}),
  timeoutMs: z.number().int().positive().max(300000).default(60000),
  privacy: privacyClassifications,
});
export type BenchmarkCase = z.infer<typeof benchmarkCaseSchema>;
export type BenchmarkSuite = {
  id: string;
  name: string;
  version: string;
  cases: BenchmarkCase[];
  contentHash: string;
  createdAt: string;
};
export type BenchmarkExecution = {
  caseId: string;
  candidateId: string;
  provider: string;
  model?: string;
  output?: string;
  passed: boolean;
  score: number;
  formatCompliant: boolean;
  safetyFailure: boolean;
  privacyFailure: boolean;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  error?: string;
  manualReviewRequired?: boolean;
};
export type BenchmarkResult = {
  candidateId: string;
  successRate: number;
  weightedScore: number;
  formatCompliance: number;
  safetyFailures: number;
  privacyFailures: number;
  latencyMs: number;
  errorRate: number;
  tokenUsage?: number;
  executionCost?: number;
  executions: BenchmarkExecution[];
};
export type BenchmarkMetric = Pick<
  BenchmarkResult,
  | 'successRate'
  | 'weightedScore'
  | 'formatCompliance'
  | 'safetyFailures'
  | 'privacyFailures'
  | 'latencyMs'
  | 'errorRate'
  | 'tokenUsage'
  | 'executionCost'
>;
export type BenchmarkRun = {
  id: string;
  suiteHash: string;
  promptVersionHashes: Record<string, string>;
  provider: string;
  model?: string;
  startedAt: string;
  completedAt: string;
  results: BenchmarkResult[];
  contentHash: string;
};
export type BenchmarkProviderRequest = {
  prompt: string;
  input: string;
  timeoutMs: number;
  privacy: PrivacyClassification;
};
export type BenchmarkProviderResponse = {
  output: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
};
export interface BenchmarkProvider {
  readonly name: string;
  execute(request: BenchmarkProviderRequest): Promise<BenchmarkProviderResponse>;
}
export type BenchmarkJudgeRequest = {
  test: BenchmarkCase;
  output: string;
  provider: string;
};
/** Optional advisory judge. Its result must remain distinguishable from deterministic checks. */
export interface BenchmarkJudge {
  readonly name: string;
  judge(request: BenchmarkJudgeRequest): Promise<{
    score: number;
    rationale?: string;
    requiresManualReview?: boolean;
  }>;
}
export type BenchmarkTarget = {
  candidateId: string;
  prompt: string;
  promptVersionId?: string;
  contentHash?: string;
};
export const regressionSeverities = z.enum(['INFO', 'WARNING', 'BLOCKING']);
export const regressionStatuses = z.enum(['PASS', 'WARNING', 'BLOCKED']);
export type RegressionSeverity = z.infer<typeof regressionSeverities>;
export type RegressionStatus = z.infer<typeof regressionStatuses>;
export type RegressionPolicyRule =
  | 'minimumSuccessScore'
  | 'maximumRegressionPercentage'
  | 'maximumSafetyFailures'
  | 'maximumPrivacyFailures'
  | 'maximumTokenIncrease'
  | 'maximumLatencyIncrease'
  | 'executionFailure';
export type RegressionPolicy = {
  minimumSuccessScore?: number;
  maximumRegressionPercentage?: number;
  maximumSafetyFailures?: number;
  maximumPrivacyFailures?: number;
  maximumTokenIncrease?: number;
  maximumLatencyIncrease?: number;
  severities?: Partial<Record<RegressionPolicyRule, RegressionSeverity>>;
};
export type RegressionReport = {
  baselineVersionId: string;
  candidateVersionId: string;
  suiteHash: string;
  metricDeltas: Record<string, number | undefined>;
  failedCases: string[];
  newFailures: string[];
  fixedFailures: string[];
  policyResult: {
    status: RegressionStatus;
    violations: Array<{
      rule: RegressionPolicyRule;
      severity: RegressionSeverity;
      message: string;
    }>;
  };
  timestamp: string;
  contentHash: string;
};
export async function executeBenchmark(
  suite: BenchmarkSuite,
  targets: BenchmarkTarget[],
  provider: BenchmarkProvider,
  now = () => Date.now(),
): Promise<BenchmarkRun> {
  const startedAt = new Date(now()).toISOString();
  const results: BenchmarkResult[] = [];
  for (const target of targets) {
    const executions: BenchmarkExecution[] = [];
    for (const test of suite.cases) {
      const started = now();
      try {
        const response = await provider.execute({
          prompt: target.prompt,
          input: test.input,
          timeoutMs: test.timeoutMs,
          privacy: test.privacy,
        });
        const evaluation = evaluateCase(test, response.output);
        executions.push({
          caseId: test.id,
          candidateId: target.candidateId,
          provider: provider.name,
          model: response.model,
          output: response.output,
          ...evaluation,
          formatCompliant: evaluation.formatCompliant,
          safetyFailure: evaluation.safetyFailure,
          privacyFailure: evaluation.privacyFailure,
          latencyMs: Math.max(0, now() - started),
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          cost: response.cost,
        });
      } catch (error) {
        executions.push({
          caseId: test.id,
          candidateId: target.candidateId,
          provider: provider.name,
          passed: false,
          score: 0,
          formatCompliant: false,
          safetyFailure: false,
          privacyFailure: false,
          latencyMs: Math.max(0, now() - started),
          error: error instanceof Error ? error.message : 'PROVIDER_FAILED',
        });
      }
    }
    results.push(aggregateBenchmarkResult(target.candidateId, suite, executions));
  }
  const base = {
    suiteHash: suite.contentHash,
    promptVersionHashes: Object.fromEntries(
      targets.map((t) => [t.candidateId, t.contentHash ?? '']),
    ),
    provider: provider.name,
    startedAt,
    completedAt: new Date(now()).toISOString(),
    results,
  };
  return {
    id: `run_${hashBenchmark(base).slice(0, 24)}`,
    ...base,
    contentHash: hashBenchmark(base),
  };
}
export type Evaluation = {
  passed: boolean;
  score: number;
  formatCompliant: boolean;
  safetyFailure: boolean;
  privacyFailure: boolean;
  manualReviewRequired?: boolean;
  reason?: string;
};
function canonical(value: unknown) {
  return JSON.stringify(value, (k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([x, y]) => [x, y]),
        )
      : v,
  );
}
export function hashBenchmark(value: unknown) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}
export function createBenchmarkSuite(
  input: Omit<BenchmarkSuite, 'contentHash' | 'createdAt'>,
): BenchmarkSuite {
  const base = { ...input };
  return { ...base, contentHash: hashBenchmark(base), createdAt: new Date().toISOString() };
}
export function evaluateCase(test: BenchmarkCase, output: string): Evaluation {
  const cfg = test.evaluatorConfig;
  if (test.evaluator === 'MANUAL_REVIEW_REQUIRED')
    return {
      passed: false,
      score: 0,
      formatCompliant: true,
      safetyFailure: false,
      privacyFailure: false,
      manualReviewRequired: true,
      reason: 'MANUAL_REVIEW_REQUIRED',
    };
  if (test.evaluator === 'EXACT_MATCH') {
    const pass = output === String(test.expectedOutput ?? '');
    return {
      passed: pass,
      score: pass ? 1 : 0,
      formatCompliant: true,
      safetyFailure: false,
      privacyFailure: false,
      reason: pass ? undefined : 'EXACT_MATCH_FAILED',
    };
  }
  if (test.evaluator === 'CONTAINS' || test.evaluator === 'DOES_NOT_CONTAIN') {
    const needle = String(cfg.value ?? test.expectedOutput ?? '');
    const contains = output.includes(needle);
    const pass = test.evaluator === 'CONTAINS' ? contains : !contains;
    return {
      passed: pass,
      score: pass ? 1 : 0,
      formatCompliant: true,
      safetyFailure: false,
      privacyFailure: false,
      reason: pass ? undefined : 'TEXT_CRITERION_FAILED',
    };
  }
  if (test.evaluator === 'REGEX') {
    const pass = new RegExp(String(cfg.pattern ?? test.criteria ?? '')).test(output);
    return {
      passed: pass,
      score: pass ? 1 : 0,
      formatCompliant: true,
      safetyFailure: false,
      privacyFailure: false,
      reason: pass ? undefined : 'REGEX_FAILED',
    };
  }
  if (test.evaluator === 'JSON_SCHEMA') {
    try {
      const value = JSON.parse(output);
      const required = Array.isArray(cfg.required) ? (cfg.required as string[]) : [];
      const pass = required.every((key) => value && typeof value === 'object' && key in value);
      return {
        passed: pass,
        score: pass ? 1 : 0,
        formatCompliant: pass,
        safetyFailure: false,
        privacyFailure: false,
        reason: pass ? undefined : 'JSON_SCHEMA_FAILED',
      };
    } catch {
      return {
        passed: false,
        score: 0,
        formatCompliant: false,
        safetyFailure: false,
        privacyFailure: false,
        reason: 'INVALID_JSON',
      };
    }
  }
  if (test.evaluator === 'CLASSIFICATION') {
    const pass = output.trim() === String(test.expectedOutput ?? cfg.label ?? '');
    return {
      passed: pass,
      score: pass ? 1 : 0,
      formatCompliant: true,
      safetyFailure: false,
      privacyFailure: false,
      reason: pass ? undefined : 'CLASSIFICATION_FAILED',
    };
  }
  if (test.evaluator === 'STRUCTURED_FIELDS') {
    try {
      const value = JSON.parse(output);
      const fields = (cfg.fields ?? {}) as Record<string, unknown>;
      const pass = Object.entries(fields).every(([k, v]) => value?.[k] === v);
      return {
        passed: pass,
        score: pass ? 1 : 0,
        formatCompliant: pass,
        safetyFailure: false,
        privacyFailure: false,
        reason: pass ? undefined : 'STRUCTURED_FIELDS_FAILED',
      };
    } catch {
      return {
        passed: false,
        score: 0,
        formatCompliant: false,
        safetyFailure: false,
        privacyFailure: false,
        reason: 'INVALID_JSON',
      };
    }
  }
  return {
    passed: false,
    score: 0,
    formatCompliant: false,
    safetyFailure: false,
    privacyFailure: false,
    reason: 'UNSUPPORTED_EVALUATOR',
  };
}
export function aggregateBenchmarkResult(
  candidateId: string,
  suite: BenchmarkSuite,
  executions: BenchmarkExecution[],
): BenchmarkResult {
  const total = suite.cases.reduce((n, c) => n + c.weight, 0) || 1;
  const score =
    executions.reduce(
      (n, e) => n + (suite.cases.find((c) => c.id === e.caseId)?.weight ?? 1) * e.score,
      0,
    ) / total;
  const n = executions.length || 1;
  return {
    candidateId,
    successRate: executions.filter((e) => e.passed).length / n,
    weightedScore: score,
    formatCompliance: executions.filter((e) => e.formatCompliant).length / n,
    safetyFailures: executions.filter((e) => e.safetyFailure).length,
    privacyFailures: executions.filter((e) => e.privacyFailure).length,
    latencyMs: Math.round(executions.reduce((x, e) => x + e.latencyMs, 0) / n),
    errorRate: executions.filter((e) => e.error).length / n,
    tokenUsage: executions.some((e) => e.inputTokens || e.outputTokens)
      ? executions.reduce((x, e) => x + (e.inputTokens ?? 0) + (e.outputTokens ?? 0), 0)
      : undefined,
    executionCost: executions.some((e) => e.cost !== undefined)
      ? executions.reduce((x, e) => x + (e.cost ?? 0), 0)
      : undefined,
    executions,
  };
}
export function compareBenchmarkResults(results: BenchmarkResult[]) {
  const original = results.find((result) => result.candidateId === 'ORIGINAL');
  return results.map(({ executions, ...metrics }) => {
    const deltaVsOriginal =
      original && metrics.candidateId !== 'ORIGINAL'
        ? {
            successRate: metrics.successRate - original.successRate,
            weightedScore: metrics.weightedScore - original.weightedScore,
            formatCompliance: metrics.formatCompliance - original.formatCompliance,
            safetyFailures: metrics.safetyFailures - original.safetyFailures,
            privacyFailures: metrics.privacyFailures - original.privacyFailures,
            latencyMs: metrics.latencyMs - original.latencyMs,
            errorRate: metrics.errorRate - original.errorRate,
            tokenUsage:
              metrics.tokenUsage !== undefined && original.tokenUsage !== undefined
                ? metrics.tokenUsage - original.tokenUsage
                : undefined,
            executionCost:
              metrics.executionCost !== undefined && original.executionCost !== undefined
                ? metrics.executionCost - original.executionCost
                : undefined,
          }
        : undefined;
    return { candidateId: metrics.candidateId, metrics, deltaVsOriginal };
  });
}

export function evaluateRegression(
  baseline: BenchmarkResult,
  candidate: BenchmarkResult,
  suiteHash: string,
  policy: RegressionPolicy,
  baselineVersionId: string,
  candidateVersionId: string,
  now = () => Date.now(),
): RegressionReport {
  const baselineByCase = new Map(
    baseline.executions.map((execution) => [execution.caseId, execution]),
  );
  const failedCases = candidate.executions
    .filter((execution) => !execution.passed)
    .map((execution) => execution.caseId);
  const newFailures = candidate.executions
    .filter((execution) => !execution.passed && baselineByCase.get(execution.caseId)?.passed)
    .map((execution) => execution.caseId);
  const fixedFailures = candidate.executions
    .filter(
      (execution) => execution.passed && baselineByCase.get(execution.caseId)?.passed === false,
    )
    .map((execution) => execution.caseId);
  const metricDeltas: Record<string, number | undefined> = {
    successRate: candidate.successRate - baseline.successRate,
    weightedScore: candidate.weightedScore - baseline.weightedScore,
    formatCompliance: candidate.formatCompliance - baseline.formatCompliance,
    safetyFailures: candidate.safetyFailures - baseline.safetyFailures,
    privacyFailures: candidate.privacyFailures - baseline.privacyFailures,
    latencyMs: candidate.latencyMs - baseline.latencyMs,
    errorRate: candidate.errorRate - baseline.errorRate,
    tokenUsage:
      candidate.tokenUsage !== undefined && baseline.tokenUsage !== undefined
        ? candidate.tokenUsage - baseline.tokenUsage
        : undefined,
    executionCost:
      candidate.executionCost !== undefined && baseline.executionCost !== undefined
        ? candidate.executionCost - baseline.executionCost
        : undefined,
  };
  const violations: RegressionReport['policyResult']['violations'] = [];
  const add = (rule: RegressionPolicyRule, condition: boolean, message: string) => {
    if (condition)
      violations.push({ rule, severity: policy.severities?.[rule] ?? 'WARNING', message });
  };
  add(
    'minimumSuccessScore',
    policy.minimumSuccessScore !== undefined && candidate.successRate < policy.minimumSuccessScore,
    `Success rate ${candidate.successRate.toFixed(3)} is below minimum ${(policy.minimumSuccessScore ?? 0).toFixed(3)}.`,
  );
  add(
    'maximumRegressionPercentage',
    policy.maximumRegressionPercentage !== undefined &&
      -metricDeltas.successRate! > policy.maximumRegressionPercentage,
    `Success regression ${(-metricDeltas.successRate!).toFixed(3)} exceeds maximum ${(policy.maximumRegressionPercentage ?? 0).toFixed(3)}.`,
  );
  add(
    'maximumSafetyFailures',
    policy.maximumSafetyFailures !== undefined &&
      candidate.safetyFailures > policy.maximumSafetyFailures,
    `Safety failures ${candidate.safetyFailures} exceed maximum ${policy.maximumSafetyFailures ?? 0}.`,
  );
  add(
    'maximumPrivacyFailures',
    policy.maximumPrivacyFailures !== undefined &&
      candidate.privacyFailures > policy.maximumPrivacyFailures,
    `Privacy failures ${candidate.privacyFailures} exceed maximum ${policy.maximumPrivacyFailures ?? 0}.`,
  );
  add(
    'maximumTokenIncrease',
    policy.maximumTokenIncrease !== undefined &&
      metricDeltas.tokenUsage !== undefined &&
      metricDeltas.tokenUsage > policy.maximumTokenIncrease,
    `Token increase ${metricDeltas.tokenUsage ?? 0} exceeds maximum ${policy.maximumTokenIncrease ?? 0}.`,
  );
  const latencyIncrease =
    baseline.latencyMs > 0 ? (candidate.latencyMs - baseline.latencyMs) / baseline.latencyMs : 0;
  add(
    'maximumLatencyIncrease',
    policy.maximumLatencyIncrease !== undefined && latencyIncrease > policy.maximumLatencyIncrease,
    `Latency increase ${latencyIncrease.toFixed(3)} exceeds maximum ${(policy.maximumLatencyIncrease ?? 0).toFixed(3)}.`,
  );
  if (candidate.errorRate > 0)
    violations.push({
      rule: 'executionFailure',
      severity: candidate.errorRate >= 1 ? 'BLOCKING' : 'WARNING',
      message: `Candidate benchmark execution error rate is ${(candidate.errorRate * 100).toFixed(1)}%.`,
    });
  const status: RegressionStatus = violations.some((item) => item.severity === 'BLOCKING')
    ? 'BLOCKED'
    : violations.some((item) => item.severity === 'WARNING')
      ? 'WARNING'
      : 'PASS';
  const unsigned = {
    baselineVersionId,
    candidateVersionId,
    suiteHash,
    metricDeltas,
    failedCases,
    newFailures,
    fixedFailures,
    policyResult: { status, violations },
    timestamp: new Date(now()).toISOString(),
  };
  return { ...unsigned, contentHash: hashBenchmark(unsigned) };
}
