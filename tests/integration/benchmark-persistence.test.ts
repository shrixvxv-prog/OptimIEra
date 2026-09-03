import { afterAll, describe, expect, it } from 'vitest';
import {
  db,
  createProjectForWorkspace,
  createPromptWithInitialVersion,
  createQueuedOptimizationJob,
} from '../../packages/database/src';
import {
  aggregateBenchmarkResult,
  createBenchmarkSuite,
  executeBenchmark,
  hashBenchmark,
  type BenchmarkProvider,
} from '../../packages/benchmark-engine/src';

describe('benchmark immutable persistence provenance', () => {
  const suffix = `benchmark-${Date.now()}`;
  const userId = `user-${suffix}`;
  const workspaceId = `workspace-${suffix}`;
  let suiteId = '';
  let runId = '';

  afterAll(async () => {
    await db.organization.deleteMany({ where: { id: workspaceId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  });

  it('persists an immutable suite snapshot, hashes, links, metadata, and completed retrieval', async () => {
    process.env.OPTIMIERA_ENCRYPTION_MASTER_KEY = Buffer.alloc(32, 7).toString('base64');
    await db.user.create({
      data: { id: userId, name: 'Benchmark Test', email: `${suffix}@example.test` },
    });
    await db.organization.create({
      data: { id: workspaceId, name: 'Benchmark Test', slug: workspaceId },
    });
    await db.member.create({
      data: { id: `member-${suffix}`, organizationId: workspaceId, userId, role: 'owner' },
    });
    const project = await createProjectForWorkspace({
      workspaceId,
      createdById: userId,
      name: 'Benchmark Project',
      slug: `project-${suffix}`,
    });
    const prompt = await createPromptWithInitialVersion({
      workspaceId,
      projectId: project.id,
      createdById: userId,
      title: 'Benchmark Prompt',
      content: 'Answer clearly.',
    });
    const job = await createQueuedOptimizationJob({
      workspaceId,
      projectId: project.id,
      promptId: prompt.prompt.id,
      sourcePromptVersionId: prompt.version.id,
      requestedById: userId,
      mode: 'BALANCED',
      providerType: 'RULES_ENGINE',
      providerName: 'Local test provider',
      request: {
        rawPrompt: 'Answer clearly.',
        intendedTask: 'answer',
        targetAudience: 'test',
        desiredOutputType: 'PLAIN_TEXT',
        desiredTone: 'clear',
        optimizationMode: 'BALANCED',
        constraints: [],
        requiredElements: [],
        forbiddenElements: [],
        examples: [],
        expectedLength: {},
        outputLanguage: 'English',
        privacyLevel: 'PRIVATE',
      },
      idempotencyKey: `job-${suffix}`,
    });
    const candidate = await db.candidate.create({
      data: {
        workspaceId,
        optimizationJobId: job.id,
        candidateType: 'BALANCED',
        encryptedContent: 'encrypted-test',
        contentHash: 'candidate-hash',
        changeSummary: 'test',
        scoreData: '{}',
        providerType: 'RULES_ENGINE',
        providerName: 'Local test provider',
        tokenEstimate: 2,
        rank: 1,
        generationVersion: 'test-v1',
      },
    });
    const sourceSuite = await db.evaluationSuite.create({
      data: {
        workspaceId,
        projectId: project.id,
        name: 'Immutable suite',
        description: 'original',
        createdById: userId,
        testCases: {
          create: {
            input: 'hello',
            expectedBehavior: 'hello',
            assertionConfig: JSON.stringify({ evaluator: 'CONTAINS', value: 'hello', weight: 1 }),
          },
        },
      },
      include: { testCases: true },
    });
    suiteId = sourceSuite.id;
    const suite = createBenchmarkSuite({
      id: suiteId,
      name: sourceSuite.name,
      version: 'evaluation-suite-v1',
      cases: [
        {
          id: sourceSuite.testCases[0].id,
          input: 'hello',
          expectedOutput: undefined,
          criteria: 'hello',
          tags: [],
          weight: 1,
          evaluator: 'CONTAINS',
          evaluatorConfig: { value: 'hello' },
          timeoutMs: 60000,
          privacy: 'INTERNAL',
        },
      ],
    });
    const provider: BenchmarkProvider = {
      name: 'Local test provider',
      execute: async ({ input }) => ({ output: input, model: 'deterministic-test' }),
    };
    const result = await executeBenchmark(
      suite,
      [
        {
          candidateId: 'ORIGINAL',
          prompt: 'Answer clearly.',
          promptVersionId: prompt.version.id,
          contentHash: prompt.version.contentHash,
        },
        {
          candidateId: 'BALANCED',
          prompt: 'Answer clearly.',
          promptVersionId: undefined,
          contentHash: candidate.contentHash,
        },
      ],
      provider,
      () => 1000,
    );
    const runHash = hashBenchmark(result);
    const resultHashes = Object.fromEntries(
      result.results.map((item) => [item.candidateId, hashBenchmark(item)]),
    );
    const snapshot = {
      suite,
      targets: [
        {
          candidateId: 'ORIGINAL',
          promptVersionId: prompt.version.id,
          contentHash: prompt.version.contentHash,
        },
        { candidateId: 'BALANCED', contentHash: candidate.contentHash },
      ],
      provider: provider.name,
      runHash,
      resultHashes,
    };
    const persisted = await db.evaluationRun.create({
      data: {
        workspaceId,
        suiteId,
        optimizationJobId: job.id,
        evaluationVersion: 'benchmark:test',
        status: 'SUCCEEDED',
        executionMetadata: JSON.stringify({ ...snapshot, provenanceHash: hashBenchmark(snapshot) }),
        scoringDimensions: JSON.stringify({
          metrics: result.results.map(({ executions, ...metrics }) => metrics),
          runHash,
          resultHashes,
        }),
        createdAt: new Date(1000),
        updatedAt: new Date(1001),
      },
    });
    runId = persisted.id;
    await db.evaluationResult.createMany({
      data: result.results.map((item) => ({
        runId,
        candidateId: item.candidateId === 'ORIGINAL' ? null : candidate.id,
        label: item.candidateId,
        weightedTotal: 100,
        status: 'SUCCEEDED',
        scoreData: JSON.stringify(item),
      })),
    });
    const before = await db.evaluationRun.findUniqueOrThrow({
      where: { id: runId },
      include: { results: true },
    });
    await db.evaluationSuite.update({
      where: { id: suiteId },
      data: { name: 'edited later', description: 'changed' },
    });
    const after = await db.evaluationRun.findUniqueOrThrow({
      where: { id: runId },
      include: { results: true },
    });
    expect(after.executionMetadata).toBe(before.executionMetadata);
    expect(JSON.parse(after.executionMetadata!).suite.contentHash).toBe(suite.contentHash);
    const storedSuite = JSON.parse(after.executionMetadata!).suite;
    const {
      contentHash: storedSuiteHash,
      createdAt: _createdAt,
      ...suiteWithoutHash
    } = storedSuite;
    expect(hashBenchmark(suiteWithoutHash)).toBe(storedSuiteHash);
    const storedSnapshot = JSON.parse(after.executionMetadata!);
    const { provenanceHash, ...snapshotWithoutHash } = storedSnapshot;
    expect(provenanceHash).toBe(hashBenchmark(snapshotWithoutHash));
    expect(JSON.parse(after.executionMetadata!).runHash).toBe(runHash);
    expect(after.results).toHaveLength(2);
    expect(after.results.map((item) => item.label)).toEqual(['ORIGINAL', 'BALANCED']);
    expect(JSON.parse(after.scoringDimensions!).metrics[0].candidateId).toBe('ORIGINAL');
    expect(JSON.parse(after.executionMetadata!).provider).toBe('Local test provider');
    expect(after.status).toBe('SUCCEEDED');
  });
});

describe('benchmark provider and deterministic aggregation', () => {
  it('records provider failures without fabricating output and aggregates deterministically', async () => {
    const suite = createBenchmarkSuite({
      id: 'suite',
      name: 'suite',
      version: '1',
      cases: [
        {
          id: 'case',
          input: 'x',
          expectedOutput: 'x',
          tags: [],
          weight: 2,
          evaluator: 'EXACT_MATCH',
          evaluatorConfig: {},
          timeoutMs: 1000,
          privacy: 'PUBLIC',
        },
      ],
    });
    const run = await executeBenchmark(
      suite,
      [{ candidateId: 'ORIGINAL', prompt: 'p' }],
      {
        name: 'failing-test-provider',
        execute: async () => {
          throw new Error('provider unavailable');
        },
      },
      () => 1000,
    );
    expect(run.results[0].errorRate).toBe(1);
    expect(run.results[0].executions[0].output).toBeUndefined();
    expect(
      aggregateBenchmarkResult('x', suite, [
        {
          caseId: 'case',
          candidateId: 'x',
          provider: 'test',
          passed: true,
          score: 1,
          formatCompliant: true,
          safetyFailure: false,
          privacyFailure: false,
          latencyMs: 10,
        },
      ]).weightedScore,
    ).toBe(1);
  });
});
