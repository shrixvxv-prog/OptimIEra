import { afterAll, describe, expect, it } from 'vitest';
import {
  db,
  createProjectForWorkspace,
  createPromptWithInitialVersion,
} from '../../packages/database/src';
import { evaluateRegression, hashBenchmark } from '../../packages/benchmark-engine/src';

describe('regression report persistence', () => {
  const suffix = `regression-${Date.now()}`;
  const userId = `user-${suffix}`;
  const workspaceId = `workspace-${suffix}`;

  afterAll(async () => {
    await db.organization.deleteMany({ where: { id: workspaceId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  });

  it('stores an immutable report linked to both PromptVersions and its suite', async () => {
    process.env.OPTIMIERA_ENCRYPTION_MASTER_KEY = Buffer.alloc(32, 7).toString('base64');
    await db.user.create({
      data: { id: userId, name: 'Regression Test', email: `${suffix}@example.test` },
    });
    await db.organization.create({
      data: { id: workspaceId, name: 'Regression Test', slug: workspaceId },
    });
    await db.member.create({
      data: { id: `member-${suffix}`, organizationId: workspaceId, userId, role: 'owner' },
    });
    const project = await createProjectForWorkspace({
      workspaceId,
      createdById: userId,
      name: 'Regression Project',
      slug: `project-${suffix}`,
    });
    const prompt = await createPromptWithInitialVersion({
      workspaceId,
      projectId: project.id,
      createdById: userId,
      title: 'Regression Prompt',
      content: 'v11',
    });
    const candidate = await db.promptVersion.create({
      data: {
        promptId: prompt.prompt.id,
        workspaceId,
        versionNumber: 2,
        encryptedContent: prompt.version.encryptedContent,
        contentHash: hashBenchmark('v12'),
        encryptionStatus: 'AES-256-GCM',
        createdById: userId,
        parentVersionId: prompt.version.id,
      },
    });
    const suite = await db.evaluationSuite.create({
      data: { workspaceId, projectId: project.id, name: 'Regression Suite', createdById: userId },
    });
    const report = evaluateRegression(
      {
        candidateId: 'BASELINE',
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
        candidateId: 'CANDIDATE',
        successRate: 1,
        weightedScore: 1,
        formatCompliance: 1,
        safetyFailures: 0,
        privacyFailures: 0,
        latencyMs: 10,
        errorRate: 0,
        executions: [],
      },
      'suite-hash',
      {},
      prompt.version.id,
      candidate.id,
      () => 1000,
    );
    const created = await db.regressionReport.create({
      data: {
        workspaceId,
        projectId: project.id,
        promptId: prompt.prompt.id,
        suiteId: suite.id,
        baselineVersionId: prompt.version.id,
        candidateVersionId: candidate.id,
        status: report.policyResult.status,
        reportJson: JSON.stringify(report),
        contentHash: report.contentHash,
      },
    });
    const before = await db.regressionReport.findUniqueOrThrow({ where: { id: created.id } });
    await db.evaluationSuite.update({
      where: { id: suite.id },
      data: { name: 'Edited after run' },
    });
    const after = await db.regressionReport.findUniqueOrThrow({ where: { id: created.id } });
    expect(after.reportJson).toBe(before.reportJson);
    expect(after.contentHash).toBe(report.contentHash);
    expect(after.baselineVersionId).toBe(prompt.version.id);
    expect(after.candidateVersionId).toBe(candidate.id);
    expect(after.suiteId).toBe(suite.id);
    expect(after.status).toBe('PASS');
  });
});
