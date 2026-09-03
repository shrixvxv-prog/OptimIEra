import { describe, expect, it } from 'vitest';
import {
  evaluateRegression,
  type BenchmarkExecution,
  type BenchmarkResult,
  type RegressionPolicy,
} from '../../packages/benchmark-engine/src';

function result(
  overrides: Partial<BenchmarkResult> = {},
  executions: BenchmarkExecution[] = [],
): BenchmarkResult {
  return {
    candidateId: 'version',
    successRate: 1,
    weightedScore: 1,
    formatCompliance: 1,
    safetyFailures: 0,
    privacyFailures: 0,
    latencyMs: 100,
    errorRate: 0,
    executions,
    ...overrides,
  };
}
function execution(
  caseId: string,
  passed: boolean,
  extra: Partial<BenchmarkExecution> = {},
): BenchmarkExecution {
  return {
    caseId,
    candidateId: 'version',
    provider: 'test',
    passed,
    score: passed ? 1 : 0,
    formatCompliant: true,
    safetyFailure: false,
    privacyFailure: false,
    latencyMs: 1,
    ...extra,
  };
}

describe('regression engine', () => {
  const baseline = result({ candidateId: 'BASELINE' }, [
    execution('one', true),
    execution('two', false),
  ]);

  it('passes a better and unchanged version and records fixed failures', () => {
    const better = evaluateRegression(
      baseline,
      result({ candidateId: 'CANDIDATE', successRate: 1 }, [
        execution('one', true),
        execution('two', true),
      ]),
      'suite-hash',
      {},
      'v11',
      'v12',
      () => 1000,
    );
    expect(better.policyResult.status).toBe('PASS');
    expect(better.fixedFailures).toEqual(['two']);
    const same = evaluateRegression(
      baseline,
      result({ candidateId: 'CANDIDATE', successRate: 0.5 }, [
        execution('one', true),
        execution('two', false),
      ]),
      'suite-hash',
      {},
      'v11',
      'v12',
      () => 1000,
    );
    expect(same.policyResult.status).toBe('PASS');
    expect(same.contentHash).toBe(
      evaluateRegression(
        baseline,
        result({ candidateId: 'CANDIDATE', successRate: 0.5 }, [
          execution('one', true),
          execution('two', false),
        ]),
        'suite-hash',
        {},
        'v11',
        'v12',
        () => 1000,
      ).contentHash,
    );
  });

  it('returns WARNING for a configured minor regression', () => {
    const policy: RegressionPolicy = {
      maximumRegressionPercentage: 0.1,
      severities: { maximumRegressionPercentage: 'WARNING' },
    };
    const report = evaluateRegression(
      result({ candidateId: 'BASELINE', successRate: 0.9 }),
      result({ candidateId: 'CANDIDATE', successRate: 0.75 }),
      'suite-hash',
      policy,
      'v11',
      'v12',
      () => 1000,
    );
    expect(report.policyResult.status).toBe('WARNING');
  });

  it('blocks success, safety, and privacy regressions according to policy severity', () => {
    const policy: RegressionPolicy = {
      minimumSuccessScore: 0.9,
      maximumSafetyFailures: 0,
      maximumPrivacyFailures: 0,
      severities: {
        minimumSuccessScore: 'BLOCKING',
        maximumSafetyFailures: 'BLOCKING',
        maximumPrivacyFailures: 'BLOCKING',
      },
    };
    const report = evaluateRegression(
      result({ candidateId: 'BASELINE' }),
      result({ candidateId: 'CANDIDATE', successRate: 0.5, safetyFailures: 1, privacyFailures: 1 }),
      'suite-hash',
      policy,
      'v11',
      'v12',
      () => 1000,
    );
    expect(report.policyResult.status).toBe('BLOCKED');
    expect(report.policyResult.violations.map((item) => item.rule)).toEqual(
      expect.arrayContaining([
        'minimumSuccessScore',
        'maximumSafetyFailures',
        'maximumPrivacyFailures',
      ]),
    );
  });

  it('blocks complete execution failure and warns on partial provider failure', () => {
    const complete = evaluateRegression(
      baseline,
      result({ candidateId: 'CANDIDATE', errorRate: 1 }, [
        execution('one', false, { error: 'UNAVAILABLE' }),
        execution('two', false, { error: 'UNAVAILABLE' }),
      ]),
      'suite-hash',
      {},
      'v11',
      'v12',
      () => 1000,
    );
    expect(complete.policyResult.status).toBe('BLOCKED');
    const partial = evaluateRegression(
      baseline,
      result({ candidateId: 'CANDIDATE', errorRate: 0.5 }, [
        execution('one', true),
        execution('two', false, { error: 'TIMEOUT' }),
      ]),
      'suite-hash',
      {},
      'v11',
      'v12',
      () => 1000,
    );
    expect(partial.policyResult.status).toBe('WARNING');
    expect(partial.newFailures).toEqual([]);
  });
});
