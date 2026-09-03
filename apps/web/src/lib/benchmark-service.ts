import 'server-only';
import { db } from '@optimiera/database';
import { decryptPrompt, parseEnvelope } from '@optimiera/encryption';
import {
  executeBenchmark,
  createBenchmarkSuite,
  hashBenchmark,
  compareBenchmarkResults,
  type BenchmarkProvider,
  type BenchmarkSuite,
  type BenchmarkRun,
  type BenchmarkTarget,
} from '@optimiera/benchmark-engine';
import { requireSession } from './authorization';
import { OGComputeRouterProvider } from '@optimiera/og-compute';
import { readOGComputeConfig } from '@optimiera/config';

export function localBenchmarkProvider(): BenchmarkProvider {
  return {
    name: 'OptimIEra Rules Engine (deterministic)',
    async execute({ prompt, input }) {
      return { output: `${prompt}\n${input}` };
    },
  };
}

export function ogComputeBenchmarkProvider(): BenchmarkProvider {
  const provider = new OGComputeRouterProvider(readOGComputeConfig());
  return {
    name: provider.name,
    async execute({ prompt, input }) {
      const health = await provider.healthCheck();
      if (health.state === 'UNCONFIGURED' || !health.configured) throw new Error('UNCONFIGURED');
      const result = await provider.optimizeCombined(
        {
          rawPrompt: prompt,
          intendedTask: input,
          targetAudience: 'benchmark evaluator',
          desiredOutputType: 'PLAIN_TEXT',
          desiredTone: 'direct',
          optimizationMode: 'BALANCED',
          constraints: [],
          requiredElements: [],
          forbiddenElements: [],
          examples: [],
          expectedLength: {},
          outputLanguage: 'English',
          privacyLevel: 'PRIVATE',
        } as never,
        { requestId: `benchmark-${Date.now()}`, timeoutMs: 60000 },
      );
      const candidate = result.candidates[0];
      return {
        output: candidate?.optimizedPrompt ?? '',
        model: result.trace?.model,
        inputTokens: result.trace?.usage?.promptTokens,
        outputTokens: result.trace?.usage?.completionTokens,
      };
    },
  };
}

export function suiteFromRecord(suite: {
  id: string;
  name: string;
  description: string | null;
  testCases: Array<{
    id: string;
    input: string;
    expectedBehavior: string;
    assertionConfig: string;
  }>;
}): BenchmarkSuite {
  const cases = suite.testCases.map((test) => {
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(test.assertionConfig);
    } catch {
      /* legacy criteria remains supported */
    }
    return {
      id: test.id,
      input: test.input,
      criteria: test.expectedBehavior,
      expectedOutput: config.expectedOutput,
      tags: Array.isArray(config.tags) ? (config.tags as string[]) : [],
      weight: typeof config.weight === 'number' ? config.weight : 1,
      evaluator: (config.evaluator ?? 'CONTAINS') as never,
      evaluatorConfig: config,
      timeoutMs: typeof config.timeoutMs === 'number' ? config.timeoutMs : 60000,
      privacy: (config.privacy ?? 'INTERNAL') as never,
    };
  });
  return createBenchmarkSuite({
    id: suite.id,
    name: suite.name,
    version: 'evaluation-suite-v1',
    cases,
  });
}

export async function runBenchmarkForOptimization(
  suiteId: string,
  optimizationId: string,
  provider?: BenchmarkProvider,
) {
  const activeProvider = provider ?? localBenchmarkProvider();
  const session = await requireSession();
  const suite = await db.evaluationSuite.findUnique({
    where: { id: suiteId },
    include: { testCases: true },
  });
  const job = await db.optimizationJob.findUnique({
    where: { id: optimizationId },
    include: { candidates: true },
  });
  if (!suite || !job || suite.workspaceId !== job.workspaceId)
    throw new Error('BENCHMARK_NOT_FOUND');
  const member = await db.member.findUnique({
    where: {
      organizationId_userId: { organizationId: suite.workspaceId, userId: session.user.id },
    },
  });
  if (!member) throw new Error('FORBIDDEN');
  const source = job.sourcePromptVersionId
    ? await db.promptVersion.findUnique({ where: { id: job.sourcePromptVersionId } })
    : null;
  if (!source) throw new Error('PROMPT_VERSION_REQUIRED');
  const targets: BenchmarkTarget[] = [
    {
      candidateId: 'ORIGINAL',
      prompt: decryptPrompt(parseEnvelope(source.encryptedContent)),
      promptVersionId: source.id,
      contentHash: source.contentHash,
    },
  ];
  for (const candidate of job.candidates.filter((item) =>
    ['BALANCED', 'ACCURACY_FOCUSED', 'TOKEN_EFFICIENT'].includes(item.candidateType),
  ))
    targets.push({
      candidateId: candidate.candidateType,
      prompt: decryptPrompt(parseEnvelope(candidate.encryptedContent)),
      promptVersionId: candidate.savedPromptVersionId ?? undefined,
      contentHash: candidate.contentHash,
    });
  const benchmarkSuite = suiteFromRecord(suite);
  const run = await executeBenchmark(benchmarkSuite, targets, activeProvider);
  const snapshot = {
    suite: benchmarkSuite,
    targets: targets.map(({ prompt, ...target }) => target),
    provider: activeProvider.name,
  };
  const runHash = hashBenchmark(run);
  const resultHashes = Object.fromEntries(
    run.results.map((result) => [result.candidateId, hashBenchmark(result)]),
  );
  const provenanceHash = hashBenchmark({ ...snapshot, runHash, resultHashes });
  const persisted = await db.evaluationRun.create({
    data: {
      workspaceId: suite.workspaceId,
      suiteId: suite.id,
      optimizationJobId: job.id,
      evaluationVersion: `benchmark:${run.id}`,
      status: 'SUCCEEDED',
      executionMetadata: JSON.stringify({ ...snapshot, runHash, resultHashes, provenanceHash }),
      scoringDimensions: JSON.stringify({
        metrics: run.results.map(({ executions, ...metrics }) => metrics),
        comparison: compareBenchmarkResults(run.results),
        runHash,
        resultHashes,
      }),
      createdAt: new Date(run.startedAt),
      updatedAt: new Date(run.completedAt),
    },
  });
  await db.evaluationResult.createMany({
    data: run.results.map((result) => ({
      runId: persisted.id,
      candidateId:
        result.candidateId === 'ORIGINAL'
          ? null
          : job.candidates.find((c) => c.candidateType === result.candidateId)?.id,
      label: result.candidateId,
      weightedTotal: Math.round(result.weightedScore * 100),
      status: 'SUCCEEDED',
      details: JSON.stringify({
        successRate: result.successRate,
        formatCompliance: result.formatCompliance,
        latencyMs: result.latencyMs,
        errorRate: result.errorRate,
      }),
      scoreData: JSON.stringify(result),
    })),
  });
  return {
    ...run,
    id: persisted.id,
    contentHash: runHash,
  };
}

export async function getBenchmarkRun(runId: string) {
  const session = await requireSession();
  const run = await db.evaluationRun.findUnique({
    where: { id: runId },
    include: { results: true, optimizationJob: { include: { candidates: true } } },
  });
  if (!run) throw new Error('BENCHMARK_RUN_NOT_FOUND');
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: run.workspaceId, userId: session.user.id } },
  });
  if (!member) throw new Error('FORBIDDEN');
  const snapshot = run.executionMetadata ? JSON.parse(run.executionMetadata) : null;
  if (snapshot?.provenanceHash) {
    const { provenanceHash, ...unsigned } = snapshot;
    if (hashBenchmark(unsigned) !== provenanceHash) throw new Error('BENCHMARK_HASH_INVALID');
    if (snapshot.runHash && run.scoringDimensions) {
      const scoring = JSON.parse(run.scoringDimensions) as {
        runHash?: string;
        resultHashes?: Record<string, string>;
      };
      if (scoring.runHash !== snapshot.runHash) throw new Error('BENCHMARK_RUN_HASH_INVALID');
      for (const result of run.results) {
        const data = result.scoreData ? JSON.parse(result.scoreData) : null;
        if (data && snapshot.resultHashes?.[result.label ?? ''] !== hashBenchmark(data))
          throw new Error('BENCHMARK_RESULT_HASH_INVALID');
      }
    }
  }
  return { run, snapshot };
}
