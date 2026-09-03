import { describe, expect, it } from 'vitest';
import {
  aggregateBenchmarkResult,
  benchmarkCaseSchema,
  createBenchmarkSuite,
  evaluateCase,
} from '../../packages/benchmark-engine/src';

describe('Phase 4 benchmark engine', () => {
  const testCase = benchmarkCaseSchema.parse({
    id: 'case-1',
    input: 'x',
    expectedOutput: 'ok',
    evaluator: 'EXACT_MATCH',
    privacy: 'PUBLIC',
  });
  it('evaluates supported deterministic criteria', () => {
    expect(evaluateCase(testCase, 'ok').passed).toBe(true);
    expect(
      evaluateCase(
        { ...testCase, evaluator: 'CONTAINS', evaluatorConfig: { value: 'yes' } },
        'yes indeed',
      ).passed,
    ).toBe(true);
    expect(
      evaluateCase({ ...testCase, evaluator: 'REGEX', evaluatorConfig: { pattern: '^ok$' } }, 'ok')
        .passed,
    ).toBe(true);
    expect(
      evaluateCase({ ...testCase, evaluator: 'MANUAL_REVIEW_REQUIRED' }, 'anything')
        .manualReviewRequired,
    ).toBe(true);
  });
  it('produces reproducible suite hashes and weighted metrics', () => {
    const suite = createBenchmarkSuite({
      id: 'suite',
      name: 'Smoke',
      version: '1',
      cases: [testCase],
    });
    const result = aggregateBenchmarkResult('original', suite, [
      {
        caseId: 'case-1',
        candidateId: 'original',
        provider: 'rules',
        passed: true,
        score: 1,
        formatCompliant: true,
        safetyFailure: false,
        privacyFailure: false,
        latencyMs: 10,
      },
    ]);
    expect(suite.contentHash).toHaveLength(64);
    expect(result.successRate).toBe(1);
    expect(result.weightedScore).toBe(1);
  });
});
