import { describe, expect, it } from 'vitest';
import { ogComputeBenchmarkProvider } from '../../apps/web/src/lib/benchmark-service';
import { compareBenchmarkResults } from '../../packages/benchmark-engine/src';

describe('0G Compute benchmark provider wiring', () => {
  it('uses the existing 0G provider and reports UNCONFIGURED without credentials', async () => {
    const previous = {
      enabled: process.env.OG_COMPUTE_ENABLED,
      key: process.env.OG_COMPUTE_API_KEY,
      model: process.env.OG_COMPUTE_MODEL,
    };
    delete process.env.OG_COMPUTE_ENABLED;
    delete process.env.OG_COMPUTE_API_KEY;
    delete process.env.OG_COMPUTE_MODEL;
    const provider = ogComputeBenchmarkProvider();
    expect(provider.name).toContain('0G');
    await expect(
      provider.execute({ prompt: 'p', input: 'i', timeoutMs: 1000, privacy: 'PUBLIC' }),
    ).rejects.toThrow('UNCONFIGURED');
    if (previous.enabled !== undefined) process.env.OG_COMPUTE_ENABLED = previous.enabled;
    if (previous.key !== undefined) process.env.OG_COMPUTE_API_KEY = previous.key;
    if (previous.model !== undefined) process.env.OG_COMPUTE_MODEL = previous.model;
  });

  it('calculates candidate deltas only against an executed Original result', () => {
    const comparison = compareBenchmarkResults([
      {
        candidateId: 'ORIGINAL',
        successRate: 0.5,
        weightedScore: 0.5,
        formatCompliance: 1,
        safetyFailures: 0,
        privacyFailures: 0,
        latencyMs: 10,
        errorRate: 0,
        executions: [],
      },
      {
        candidateId: 'BALANCED',
        successRate: 0.75,
        weightedScore: 0.7,
        formatCompliance: 1,
        safetyFailures: 0,
        privacyFailures: 0,
        latencyMs: 12,
        errorRate: 0,
        executions: [],
      },
    ]);
    expect(comparison[1].deltaVsOriginal?.successRate).toBe(0.25);
    expect(comparison[1].deltaVsOriginal?.weightedScore).toBeCloseTo(0.2);
  });
});
