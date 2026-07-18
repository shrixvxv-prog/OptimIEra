import 'dotenv/config';
import { afterAll, describe, expect, it } from 'vitest';
import {
  createProjectForWorkspace,
  createPromptWithInitialVersion,
  createPromptVersionForWorkspace,
  createWorkspaceInvitation,
  acceptWorkspaceInvitation,
  rejectWorkspaceInvitation,
  revokeWorkspaceInvitation,
  changeWorkspaceMemberRole,
  removeWorkspaceMember,
  requestPromptReview,
  decidePromptReview,
  activatePromptVersion,
  listWorkspaceAuditEvents,
  databaseHealth,
  db,
  getProjectByIdForWorkspace,
  getPromptVersionContentForWorkspace,
  createQueuedOptimizationJob,
  getCandidateContentForWorkspace,
  getOptimizationForWorkspace,
  getOptimizationRequestForRetry,
  listOptimizationsForPrompt,
  listOptimizationsForWorkspace,
  listPromptVersionsForWorkspace,
  markOptimizationRunning,
  persistOptimizationFailure,
  persistOptimizationSuccess,
  saveCandidateAsPromptVersion,
} from '../../packages/database/src/index';
import {
  analyzePrompt,
  evaluateOptimization,
  generateRulesCandidates,
} from '../../packages/optimizer-core/src/index';
import type { OptimizationRequest } from '../../packages/schemas/src/index';
process.env.OPTIMIERA_ENCRYPTION_MASTER_KEY ??= Buffer.alloc(32, 7).toString('base64');

describe('PostgreSQL Phase 1 persistence', () => {
  const suffix = Date.now().toString();
  const userId = `integration-user-${suffix}`;
  const userBId = `integration-user-b-${suffix}`;
  const workspaceId = `integration-workspace-${suffix}`;
  const slug = `integration-workspace-${suffix}`;

  afterAll(async () => {
    await db.liveOperationUsage.deleteMany({ where: { userId: { in: [userId, userBId] } } });
    await db.organization.deleteMany({ where: { id: workspaceId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.user.deleteMany({ where: { id: userBId } });
    await db.$disconnect();
  });

  it('reports a healthy local PostgreSQL connection', async () => {
    expect((await databaseHealth()).status).toBe('ok');
  });

  it('persists workspace-scoped projects and prompt version history', async () => {
    await db.user.create({
      data: { id: userId, name: 'Integration User', email: `${suffix}@integration.test` },
    });
    await db.user.create({
      data: { id: userBId, name: 'Second User', email: `second-${suffix}@integration.test` },
    });
    await db.organization.create({
      data: { id: workspaceId, name: 'Integration Workspace', slug },
    });
    await db.member.create({
      data: {
        id: `integration-member-${suffix}`,
        organizationId: workspaceId,
        userId,
        role: 'owner',
      },
    });
    await db.member.create({
      data: {
        id: `integration-member-b-${suffix}`,
        organizationId: workspaceId,
        userId: userBId,
        role: 'reviewer',
      },
    });
    const project = await createProjectForWorkspace({
      workspaceId,
      createdById: userId,
      name: 'Integration Project',
      slug: 'integration-project',
    });
    const first = await createPromptWithInitialVersion({
      workspaceId,
      projectId: project.id,
      createdById: userId,
      title: 'Integration Prompt',
      content: 'version one',
    });
    const second = await createPromptVersionForWorkspace({
      workspaceId,
      promptId: first.prompt.id,
      createdById: userId,
      content: 'version two',
    });
    expect(first.version.versionNumber).toBe(1);
    expect(second.versionNumber).toBe(2);
    const stored = await db.promptVersion.findUniqueOrThrow({ where: { id: first.version.id } });
    expect(stored.encryptedContent).not.toContain('version one');
    expect((await getPromptVersionContentForWorkspace(workspaceId, first.version.id)).content).toBe(
      'version one',
    );
    expect(
      (await listPromptVersionsForWorkspace(workspaceId, first.prompt.id)).map(
        (version) => version.versionNumber,
      ),
    ).toEqual([1, 2]);
  });

  it('does not resolve resources through another workspace context', async () => {
    const project = await db.project.findFirstOrThrow({ where: { workspaceId } });
    expect(await getProjectByIdForWorkspace(`other-${suffix}`, project.id)).toBeNull();
  });

  it('creates a pending invitation and records its audit event', async () => {
    const invitation = await createWorkspaceInvitation({
      workspaceId,
      inviterId: userId,
      inviterRole: 'owner',
      email: `invite-${suffix}@integration.test`,
    });
    expect(invitation.status).toBe('pending');
    expect(
      await db.auditEvent.findFirst({
        where: { resourceId: invitation.id, action: 'workspace.invitation.created' },
      }),
    ).not.toBeNull();
  });

  it('accepts an invitation transactionally', async () => {
    const invitation = await createWorkspaceInvitation({
      workspaceId,
      inviterId: userId,
      inviterRole: 'owner',
      email: `second-${suffix}@integration.test`,
      role: 'viewer',
    });
    await acceptWorkspaceInvitation({
      invitationId: invitation.id,
      userId: userBId,
      email: `second-${suffix}@integration.test`,
    });
    expect((await db.invitation.findUniqueOrThrow({ where: { id: invitation.id } })).status).toBe(
      'accepted',
    );
  });

  it('rejects an invitation and prevents reuse', async () => {
    const invitation = await createWorkspaceInvitation({
      workspaceId,
      inviterId: userId,
      inviterRole: 'owner',
      email: `second-${suffix}@integration.test`,
    });
    await rejectWorkspaceInvitation({
      invitationId: invitation.id,
      userId: userBId,
      email: `second-${suffix}@integration.test`,
    });
    await expect(
      rejectWorkspaceInvitation({
        invitationId: invitation.id,
        userId: userBId,
        email: `second-${suffix}@integration.test`,
      }),
    ).rejects.toThrow('INVITATION_ALREADY_USED');
  });

  it('revokes a pending invitation and prevents acceptance', async () => {
    const invitation = await createWorkspaceInvitation({
      workspaceId,
      inviterId: userId,
      inviterRole: 'owner',
      email: `second-${suffix}@integration.test`,
    });
    await revokeWorkspaceInvitation({
      invitationId: invitation.id,
      actorUserId: userId,
      actorRole: 'owner',
    });
    await expect(
      acceptWorkspaceInvitation({
        invitationId: invitation.id,
        userId: userBId,
        email: `second-${suffix}@integration.test`,
      }),
    ).rejects.toThrow('INVITATION_ALREADY_USED');
  });

  it('changes an eligible member role', async () => {
    const member = await db.member.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId: workspaceId, userId: userBId } },
    });
    await changeWorkspaceMemberRole({
      workspaceId,
      actorUserId: userId,
      actorRole: 'owner',
      memberId: member.id,
      role: 'editor',
    });
    expect((await db.member.findUniqueOrThrow({ where: { id: member.id } })).role).toBe('editor');
  });

  it('removes an eligible member', async () => {
    const member = await db.member.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId: workspaceId, userId: userBId } },
    });
    await removeWorkspaceMember({
      workspaceId,
      actorUserId: userId,
      actorRole: 'owner',
      memberId: member.id,
    });
    expect(await db.member.findUnique({ where: { id: member.id } })).toBeNull();
    await db.member.create({
      data: {
        id: `integration-member-b-restored-${suffix}`,
        organizationId: workspaceId,
        userId: userBId,
        role: 'reviewer',
      },
    });
  });

  it('protects the final owner', async () => {
    const owner = await db.member.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId: workspaceId, userId } },
    });
    await expect(
      changeWorkspaceMemberRole({
        workspaceId,
        actorUserId: userId,
        actorRole: 'owner',
        memberId: owner.id,
        role: 'viewer',
      }),
    ).rejects.toThrow('LAST_OWNER_PROTECTED');
    await expect(
      removeWorkspaceMember({
        workspaceId,
        actorUserId: userId,
        actorRole: 'owner',
        memberId: owner.id,
      }),
    ).rejects.toThrow('LAST_OWNER_PROTECTED');
  });

  it('requests a review for an immutable version', async () => {
    const prompt = await db.prompt.findFirstOrThrow({ where: { workspaceId } });
    const version = await createPromptVersionForWorkspace({
      workspaceId,
      promptId: prompt.id,
      createdById: userId,
      content: 'version three',
      changeSummary: 'third version',
    });
    const review = await requestPromptReview({
      workspaceId,
      promptVersionId: version.id,
      reviewerId: userBId,
      actorUserId: userId,
    });
    expect(review.status).toBe('REQUESTED');
    expect(
      (await db.promptVersion.findUniqueOrThrow({ where: { id: version.id } })).lifecycleStatus,
    ).toBe('IN_REVIEW');
  });

  it('approves a requested review', async () => {
    const review = await db.promptReview.findFirstOrThrow({
      where: { workspaceId, status: 'REQUESTED' },
    });
    await decidePromptReview({
      workspaceId,
      reviewId: review.id,
      reviewerId: userBId,
      approve: true,
      note: 'Looks good',
    });
    expect((await db.promptReview.findUniqueOrThrow({ where: { id: review.id } })).status).toBe(
      'APPROVED',
    );
  });

  it('rejects repeated review decisions', async () => {
    const review = await db.promptReview.findFirstOrThrow({
      where: { workspaceId, status: 'APPROVED' },
    });
    await expect(
      decidePromptReview({ workspaceId, reviewId: review.id, reviewerId: userBId, approve: false }),
    ).rejects.toThrow('ILLEGAL_STATE_TRANSITION');
  });

  it('publishes an approved version through the active-version service', async () => {
    const prompt = await db.prompt.findFirstOrThrow({ where: { workspaceId } });
    const version = await db.promptVersion.findFirstOrThrow({
      where: { promptId: prompt.id, lifecycleStatus: 'APPROVED' },
    });
    await activatePromptVersion({
      workspaceId,
      promptId: prompt.id,
      versionId: version.id,
      actorUserId: userId,
      actorRole: 'owner',
    });
    expect((await db.prompt.findUniqueOrThrow({ where: { id: prompt.id } })).activeVersionId).toBe(
      version.id,
    );
  });

  it('persists audit events with workspace isolation', async () => {
    await db.auditEvent.create({
      data: {
        workspaceId,
        actorUserId: userId,
        action: 'test.audit',
        resourceType: 'test',
        safeMetadata: JSON.stringify({ ok: true }),
      },
    });
    const result = await listWorkspaceAuditEvents({ workspaceId, action: 'test.audit' });
    expect(result.total).toBeGreaterThan(0);
    expect((await listWorkspaceAuditEvents({ workspaceId: `other-${suffix}` })).total).toBe(0);
  });

  it('denies cross-workspace mutation by scoped lookup', async () => {
    const project = await db.project.findFirstOrThrow({ where: { workspaceId } });
    expect(await getProjectByIdForWorkspace(`other-${suffix}`, project.id)).toBeNull();
  });
});

describe('PostgreSQL Phase 2 optimization persistence', () => {
  const suffix = `phase2-${Date.now()}`;
  const userId = `phase2-user-${suffix}`;
  const workspaceId = `phase2-workspace-${suffix}`;
  const otherWorkspaceId = `phase2-other-${suffix}`;
  let projectId = '';
  let promptId = '';
  let sourceVersionId = '';
  let jobId = '';
  let recommendedCandidateId = '';

  const request = (): OptimizationRequest => ({
    promptId,
    sourcePromptVersionId: sourceVersionId,
    rawPrompt:
      'Write a good onboarding email. Include the setup steps, expected timeline, support contact, and a clear call to action.',
    intendedTask: 'Create a customer onboarding email',
    targetAudience: 'New enterprise workspace admins',
    desiredOutputType: 'EMAIL',
    desiredTone: 'Friendly, concise, and professional',
    optimizationMode: 'BALANCED',
    constraints: ['Do not mention unavailable features', 'Keep the email under 300 words'],
    requiredElements: ['setup steps', 'timeline', 'support contact', 'call to action'],
    forbiddenElements: ['discount claims'],
    examples: ['Subject: Welcome to OptimIEra'],
    expectedLength: { label: 'Under 300 words' },
    outputLanguage: 'English',
    privacyLevel: 'PRIVATE',
    additionalContext: 'The customer has already created a workspace.',
  });

  afterAll(async () => {
    await db.organization.deleteMany({ where: { id: { in: [workspaceId, otherWorkspaceId] } } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  });

  it('creates an optimization job, encrypted candidates, evaluation results, and history', async () => {
    await db.user.create({
      data: { id: userId, name: 'Phase 2 User', email: `${suffix}@integration.test` },
    });
    await db.organization.create({
      data: { id: workspaceId, name: 'Phase 2 Workspace', slug: workspaceId },
    });
    await db.organization.create({
      data: { id: otherWorkspaceId, name: 'Other Phase 2 Workspace', slug: otherWorkspaceId },
    });
    await db.member.create({
      data: { id: `phase2-member-${suffix}`, organizationId: workspaceId, userId, role: 'owner' },
    });
    const project = await createProjectForWorkspace({
      workspaceId,
      createdById: userId,
      name: 'Phase 2 Project',
      slug: `phase2-project-${suffix}`,
    });
    projectId = project.id;
    const prompt = await createPromptWithInitialVersion({
      workspaceId,
      projectId,
      createdById: userId,
      title: 'Phase 2 Prompt',
      content: request().rawPrompt,
    });
    promptId = prompt.prompt.id;
    sourceVersionId = prompt.version.id;
    const job = await createQueuedOptimizationJob({
      workspaceId,
      projectId,
      promptId,
      sourcePromptVersionId: sourceVersionId,
      requestedById: userId,
      mode: 'BALANCED',
      providerType: 'RULES_ENGINE',
      providerName: 'OptimIEra Rules Engine',
      request: request(),
      idempotencyKey: `phase2-${suffix}`,
    });
    jobId = job.id;
    await markOptimizationRunning(job.id);
    const analysis = analyzePrompt(request());
    const candidates = generateRulesCandidates(request(), analysis);
    const evaluation = evaluateOptimization(request(), candidates);
    recommendedCandidateId = evaluation.winnerCandidateId ?? candidates[0].id;
    const persisted = await persistOptimizationSuccess({
      jobId,
      workspaceId,
      actorUserId: userId,
      analysis,
      candidates,
      evaluation,
    });
    expect(persisted.candidates).toHaveLength(3);
    const rawCandidate = await db.candidate.findFirstOrThrow({
      where: { optimizationJobId: jobId },
    });
    expect(rawCandidate.encryptedContent).not.toContain('onboarding email');
    expect(
      (await getCandidateContentForWorkspace(workspaceId, rawCandidate.id))?.content,
    ).toContain('Objective');
    expect(await getOptimizationForWorkspace(otherWorkspaceId, jobId)).toBeNull();
    expect(await listOptimizationsForPrompt(workspaceId, promptId)).toHaveLength(1);
    expect(await listOptimizationsForWorkspace(workspaceId)).toHaveLength(1);
    expect(await db.evaluationResult.count({ where: { run: { optimizationJobId: jobId } } })).toBe(
      4,
    );
  });

  it('saves a selected candidate as a new immutable encrypted PromptVersion', async () => {
    const before = await listPromptVersionsForWorkspace(workspaceId, promptId);
    const version = await saveCandidateAsPromptVersion({
      workspaceId,
      optimizationJobId: jobId,
      candidateId:
        (
          await db.candidate.findFirst({
            where: { optimizationJobId: jobId, id: recommendedCandidateId },
          })
        )?.id ?? (await db.candidate.findFirstOrThrow({ where: { optimizationJobId: jobId } })).id,
      actorUserId: userId,
      changeSummary: 'Saved Phase 2 candidate',
    });
    const after = await listPromptVersionsForWorkspace(workspaceId, promptId);
    expect(after).toHaveLength(before.length + 1);
    expect(version.versionNumber).toBe(before.length + 1);
    expect((await getPromptVersionContentForWorkspace(workspaceId, sourceVersionId)).content).toBe(
      request().rawPrompt,
    );
    expect(
      (await db.promptVersion.findUniqueOrThrow({ where: { id: version.id } })).encryptedContent,
    ).not.toContain('Objective');
  });

  it('persists failed-job state and encrypted retry request data', async () => {
    const failed = await createQueuedOptimizationJob({
      workspaceId,
      projectId,
      promptId,
      sourcePromptVersionId: sourceVersionId,
      requestedById: userId,
      mode: 'BALANCED',
      providerType: 'RULES_ENGINE',
      providerName: 'OptimIEra Rules Engine',
      request: request(),
      idempotencyKey: `phase2-failed-${suffix}`,
    });
    await persistOptimizationFailure({
      jobId: failed.id,
      workspaceId,
      actorUserId: userId,
      failureCode: 'GENERATION_FAILED',
      safeFailureMessage: 'Generation failed safely.',
    });
    expect((await db.optimizationJob.findUniqueOrThrow({ where: { id: failed.id } })).status).toBe(
      'FAILED',
    );
    expect((await getOptimizationRequestForRetry(workspaceId, failed.id)).rawPrompt).toContain(
      'onboarding email',
    );
  });

  it('prevents duplicate running submissions and wrong-workspace candidate save', async () => {
    const running = await createQueuedOptimizationJob({
      workspaceId,
      projectId,
      promptId,
      sourcePromptVersionId: sourceVersionId,
      requestedById: userId,
      mode: 'BALANCED',
      providerType: 'RULES_ENGINE',
      providerName: 'OptimIEra Rules Engine',
      request: request(),
      idempotencyKey: `phase2-running-${suffix}`,
    });
    await markOptimizationRunning(running.id);
    await expect(
      createQueuedOptimizationJob({
        workspaceId,
        projectId,
        promptId,
        sourcePromptVersionId: sourceVersionId,
        requestedById: userId,
        mode: 'BALANCED',
        providerType: 'RULES_ENGINE',
        providerName: 'OptimIEra Rules Engine',
        request: request(),
        idempotencyKey: `phase2-running-${suffix}`,
      }),
    ).rejects.toThrow('JOB_ALREADY_RUNNING');
    await expect(
      saveCandidateAsPromptVersion({
        workspaceId: otherWorkspaceId,
        optimizationJobId: jobId,
        candidateId: recommendedCandidateId,
        actorUserId: userId,
      }),
    ).rejects.toThrow('NOT_FOUND');
  });

  it('enforces one live-operation reservation per user, operation, and idempotency key', async () => {
    const data = {
      userId,
      workspaceId,
      operation: 'COMPUTE',
      dayStart: new Date(Date.UTC(2026, 6, 19)),
      idempotencyKey: `quota-${suffix}`,
      requestId: `request-${suffix}`,
    };
    await db.liveOperationUsage.create({ data });
    await expect(
      db.liveOperationUsage.create({ data: { ...data, requestId: `retry-${suffix}` } }),
    ).rejects.toThrow();
  });
});
