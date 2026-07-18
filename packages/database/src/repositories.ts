import { db } from './client';
import { randomUUID } from 'node:crypto';
import {
  contentHash,
  decryptPrompt,
  encryptPrompt,
  parseEnvelope,
  serializeEnvelope,
} from '@optimiera/encryption';
import {
  assertInvitationCanBeUsed,
  assertOwnerProtection,
  invitationState,
  redactAuditMetadata,
} from './domain';
import type {
  GeneratedCandidate,
  PromptAnalysis,
  ProviderEvaluation,
} from '@optimiera/optimizer-core';
import type { OptimizationRequest } from '@optimiera/schemas';

export async function getProjectByIdForWorkspace(workspaceId: string, projectId: string) {
  return db.project.findFirst({ where: { id: projectId, workspaceId } });
}
export async function listProjectsForWorkspace(workspaceId: string) {
  return db.project.findMany({
    where: { workspaceId, archivedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}
export async function createProjectForWorkspace(input: {
  workspaceId: string;
  createdById: string;
  name: string;
  slug: string;
  description?: string;
}) {
  return db.project.create({ data: input });
}
export async function createPromptWithInitialVersion(input: {
  workspaceId: string;
  projectId: string;
  createdById: string;
  title: string;
  content: string;
}) {
  return db.$transaction(async (tx) => {
    const prompt = await tx.prompt.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        title: input.title,
        createdById: input.createdById,
      },
    });
    const version = await tx.promptVersion.create({
      data: {
        promptId: prompt.id,
        workspaceId: input.workspaceId,
        versionNumber: 1,
        encryptedContent: serializeEnvelope(encryptPrompt(input.content)),
        contentHash: contentHash(input.content),
        encryptionStatus: 'AES-256-GCM',
        createdById: input.createdById,
      },
    });
    return { prompt, version };
  });
}
export async function listPromptVersionsForWorkspace(workspaceId: string, promptId: string) {
  return db.promptVersion.findMany({
    where: { workspaceId, promptId },
    orderBy: { versionNumber: 'asc' },
  });
}
export async function createPromptVersionForWorkspace(input: {
  workspaceId: string;
  promptId: string;
  createdById: string;
  content: string;
  changeSummary?: string;
}) {
  const latest = await db.promptVersion.findFirst({
    where: { workspaceId: input.workspaceId, promptId: input.promptId },
    orderBy: { versionNumber: 'desc' },
  });
  return db.promptVersion.create({
    data: {
      promptId: input.promptId,
      workspaceId: input.workspaceId,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      parentVersionId: latest?.id,
      encryptedContent: serializeEnvelope(encryptPrompt(input.content)),
      contentHash: contentHash(input.content),
      encryptionStatus: 'AES-256-GCM',
      changeSummary: input.changeSummary,
      createdById: input.createdById,
    },
  });
}
export async function getPromptVersionContentForWorkspace(
  workspaceId: string,
  promptVersionId: string,
) {
  const version = await db.promptVersion.findFirst({ where: { workspaceId, id: promptVersionId } });
  if (!version) return null;
  if (version.encryptionStatus !== 'AES-256-GCM') throw new Error('ENCRYPTION_MIGRATION_REQUIRED');
  return { ...version, content: decryptPrompt(parseEnvelope(version.encryptedContent)) };
}

function safeJson(value: unknown) {
  return JSON.stringify(redactAuditMetadata(value));
}

function safeProviderMetadata(value: Record<string, unknown>) {
  const numberValue = (item: unknown) =>
    typeof item === 'number' && Number.isFinite(item) ? item : undefined;
  const stringValue = (item: unknown) =>
    typeof item === 'string' && item.length <= 200 ? item : undefined;
  const usage =
    value.usage && typeof value.usage === 'object' ? (value.usage as Record<string, unknown>) : {};
  const cost =
    value.cost && typeof value.cost === 'object'
      ? (value.cost as Record<string, unknown>)
      : undefined;
  return {
    requestId: stringValue(value.requestId),
    responseId: stringValue(value.responseId),
    model: stringValue(value.model),
    provider: stringValue(value.provider),
    latencyMs: numberValue(value.latencyMs) ?? 0,
    retries: numberValue(value.retries) ?? 0,
    usage: {
      promptTokens: numberValue(usage.promptTokens),
      completionTokens: numberValue(usage.completionTokens),
      totalTokens: numberValue(usage.totalTokens),
    },
    cost: cost
      ? Object.fromEntries(
          Object.entries(cost).filter(
            ([key, item]) =>
              key.length <= 80 && (typeof item === 'string' || typeof item === 'number'),
          ),
        )
      : undefined,
  };
}

export function sanitizeOptimizationRequestMetadata(request: OptimizationRequest) {
  return {
    promptId: request.promptId ?? null,
    sourcePromptVersionId: request.sourcePromptVersionId ?? null,
    newPrompt: request.newPrompt
      ? {
          workspaceId: request.newPrompt.workspaceId,
          projectId: request.newPrompt.projectId,
          title: request.newPrompt.title,
        }
      : null,
    rawPromptLength: request.rawPrompt.length,
    rawPromptHash: contentHash(request.rawPrompt),
    intendedTaskLength: request.intendedTask.length,
    targetAudienceLength: request.targetAudience.length,
    desiredOutputType: request.desiredOutputType,
    desiredTone: request.desiredTone,
    optimizationMode: request.optimizationMode,
    constraintsCount: request.constraints.length,
    requiredElementsCount: request.requiredElements.length,
    forbiddenElementsCount: request.forbiddenElements.length,
    examplesCount: request.examples.length,
    expectedLength: request.expectedLength,
    outputLanguage: request.outputLanguage,
    structuredOutputSchemaPresent: Boolean(request.structuredOutputSchema),
    structuredOutputSchemaLength: request.structuredOutputSchema?.length ?? 0,
    privacyLevel: request.privacyLevel,
    additionalContextPresent: Boolean(request.additionalContext),
  };
}

export async function createQueuedOptimizationJob(input: {
  workspaceId: string;
  projectId: string;
  promptId?: string;
  sourcePromptVersionId?: string;
  requestedById: string;
  mode: string;
  providerType: string;
  providerName: string;
  request: OptimizationRequest;
  idempotencyKey?: string;
}) {
  if (input.idempotencyKey) {
    const existing = await db.optimizationJob.findFirst({
      where: { workspaceId: input.workspaceId, idempotencyKey: input.idempotencyKey },
    });
    if (existing && ['QUEUED', 'RUNNING'].includes(existing.status))
      throw new Error('JOB_ALREADY_RUNNING');
    if (existing?.status === 'SUCCEEDED') throw new Error('JOB_ALREADY_COMPLETED');
  }
  return db.optimizationJob.create({
    data: {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      promptId: input.promptId,
      sourcePromptVersionId: input.sourcePromptVersionId,
      requestedById: input.requestedById,
      createdById: input.requestedById,
      mode: input.mode,
      status: 'QUEUED',
      providerType: input.providerType,
      providerName: input.providerName,
      requestMetadata: safeJson(sanitizeOptimizationRequestMetadata(input.request)),
      encryptedRequestData: serializeEnvelope(encryptPrompt(JSON.stringify(input.request))),
      idempotencyKey: input.idempotencyKey,
    },
  });
}

export async function getOptimizationRequestForRetry(
  workspaceId: string,
  optimizationJobId: string,
) {
  const job = await db.optimizationJob.findFirst({ where: { id: optimizationJobId, workspaceId } });
  if (!job) throw new Error('NOT_FOUND');
  if (job.status !== 'FAILED') throw new Error('ILLEGAL_STATE_TRANSITION');
  if (!job.encryptedRequestData) throw new Error('CONFLICT');
  return JSON.parse(decryptPrompt(parseEnvelope(job.encryptedRequestData))) as OptimizationRequest;
}

export async function markOptimizationRunning(jobId: string) {
  return db.optimizationJob.update({
    where: { id: jobId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });
}

export async function persistOptimizationSuccess(input: {
  jobId: string;
  workspaceId: string;
  actorUserId: string;
  analysis: PromptAnalysis;
  candidates: GeneratedCandidate[];
  evaluation: ProviderEvaluation;
  requestId?: string;
  providerMetadata?: Record<string, unknown>;
}) {
  return db.$transaction(async (tx) => {
    const createdCandidates = [];
    for (const candidate of input.candidates) {
      const evaluation = input.evaluation.candidates.find(
        (item) => item.candidateId === candidate.id,
      );
      const created = await tx.candidate.create({
        data: {
          workspaceId: input.workspaceId,
          optimizationJobId: input.jobId,
          candidateType: candidate.candidateType,
          encryptedContent: serializeEnvelope(encryptPrompt(candidate.optimizedPrompt)),
          contentHash: contentHash(candidate.optimizedPrompt),
          changeSummary: candidate.changeSummary,
          scoreData: safeJson({
            weightedTotal: evaluation?.weightedTotal ?? null,
            improvementVsOriginal: evaluation?.improvementVsOriginal ?? null,
            dimensionScores: evaluation?.dimensionScores ?? null,
            warnings: evaluation?.warnings ?? [],
            tradeoffs: evaluation?.tradeoffs ?? candidate.tradeoffs,
            recommendationRationale: evaluation?.recommendationRationale ?? '',
          }),
          providerType: candidate.providerType,
          providerName: candidate.providerName,
          tokenEstimate: candidate.estimatedTokenImpact,
          rank:
            [...input.evaluation.candidates]
              .sort((a, b) => b.weightedTotal - a.weightedTotal)
              .findIndex((item) => item.candidateId === candidate.id) + 1,
          recommended: input.evaluation.winnerCandidateId === candidate.id,
          generationVersion: candidate.generationVersion,
        },
      });
      createdCandidates.push(created);
    }
    const evaluationRun = await tx.evaluationRun.create({
      data: {
        workspaceId: input.workspaceId,
        suiteId: null,
        optimizationJobId: input.jobId,
        status: 'SUCCEEDED',
        evaluationVersion: input.evaluation.evaluationVersion,
        scoringDimensions: safeJson(input.evaluation.original.dimensionScores),
        originalScore: input.evaluation.original.weightedTotal,
        winnerCandidateId: input.evaluation.winnerCandidateId,
        winnerLabel: input.evaluation.winnerLabel,
        confidence: input.evaluation.confidence,
        warnings: safeJson(input.evaluation.warnings),
        recommendationRationale: input.evaluation.rationale,
        executionMetadata: safeJson({
          provider: 'OptimIEra Rules Engine',
          deterministic: true,
          tie: input.evaluation.tie,
          tieLabels: input.evaluation.tieLabels,
        }),
      },
    });
    await tx.evaluationResult.create({
      data: {
        runId: evaluationRun.id,
        label: 'ORIGINAL',
        weightedTotal: input.evaluation.original.weightedTotal,
        improvementVsOriginal: 0,
        status: 'SUCCEEDED',
        scoreData: safeJson(input.evaluation.original.dimensionScores),
      },
    });
    for (const candidate of input.evaluation.candidates) {
      await tx.evaluationResult.create({
        data: {
          runId: evaluationRun.id,
          candidateId: candidate.candidateId,
          label: candidate.label,
          weightedTotal: candidate.weightedTotal,
          improvementVsOriginal: candidate.improvementVsOriginal,
          status: 'SUCCEEDED',
          scoreData: safeJson(candidate.dimensionScores),
          details: safeJson({
            warnings: candidate.warnings,
            tradeoffs: candidate.tradeoffs,
            recommendationRationale: candidate.recommendationRationale,
          }),
        },
      });
    }
    const recommendedScore =
      input.evaluation.candidates.find(
        (item) => item.candidateId === input.evaluation.winnerCandidateId,
      )?.weightedTotal ?? input.evaluation.original.weightedTotal;
    const current = await tx.optimizationJob.findUniqueOrThrow({
      where: { id: input.jobId },
      select: { requestMetadata: true },
    });
    const existingMetadata = current.requestMetadata ? JSON.parse(current.requestMetadata) : {};
    const job = await tx.optimizationJob.update({
      where: { id: input.jobId },
      data: {
        status: 'SUCCEEDED',
        completedAt: new Date(),
        analyzerVersion: input.analysis.analysisVersion,
        scoringVersion: 'rules-score-v1',
        analysisData: safeJson(input.analysis),
        originalScore: input.evaluation.original.weightedTotal,
        recommendedScore,
        recommendedCandidateId: input.evaluation.winnerCandidateId,
        requestMetadata: input.providerMetadata
          ? JSON.stringify({
              ...existingMetadata,
              providerTrace: safeProviderMetadata(input.providerMetadata),
            })
          : undefined,
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        action: 'optimization.job.succeeded',
        resourceType: 'optimizationJob',
        resourceId: input.jobId,
        safeMetadata: safeJson({
          providerName: job.providerName,
          mode: job.mode,
          candidateCount: createdCandidates.length,
          recommendedCandidateId: job.recommendedCandidateId,
        }),
        requestId: input.requestId,
      },
    });
    return { job, candidates: createdCandidates, evaluationRun };
  });
}

export async function persistOptimizationFailure(input: {
  jobId: string;
  workspaceId: string;
  actorUserId: string;
  failureCode: string;
  safeFailureMessage: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const job = await tx.optimizationJob.update({
      where: { id: input.jobId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        failureCode: input.failureCode,
        safeFailureMessage: input.safeFailureMessage,
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        action: 'optimization.job.failed',
        resourceType: 'optimizationJob',
        resourceId: input.jobId,
        safeMetadata: safeJson({
          failureCode: input.failureCode,
          safeFailureMessage: input.safeFailureMessage,
        }),
        requestId: input.requestId,
      },
    });
    return job;
  });
}

export async function getOptimizationForWorkspace(workspaceId: string, optimizationJobId: string) {
  return db.optimizationJob.findFirst({
    where: { id: optimizationJobId, workspaceId },
    include: {
      candidates: { orderBy: [{ recommended: 'desc' }, { rank: 'asc' }, { createdAt: 'asc' }] },
      evaluationRuns: {
        include: { results: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      artifacts: true,
    },
  });
}

export async function listOptimizationsForPrompt(workspaceId: string, promptId: string) {
  return db.optimizationJob.findMany({
    where: { workspaceId, promptId },
    include: { candidates: { where: { recommended: true }, take: 1 } },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });
}

export async function listOptimizationsForWorkspace(workspaceId: string) {
  return db.optimizationJob.findMany({
    where: { workspaceId },
    include: { candidates: { where: { recommended: true }, take: 1 } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function getCandidateContentForWorkspace(workspaceId: string, candidateId: string) {
  const candidate = await db.candidate.findFirst({
    where: { id: candidateId, workspaceId },
    include: { optimizationJob: true },
  });
  if (!candidate) return null;
  return { ...candidate, content: decryptPrompt(parseEnvelope(candidate.encryptedContent)) };
}

export async function saveCandidateAsPromptVersion(input: {
  workspaceId: string;
  optimizationJobId: string;
  candidateId: string;
  actorUserId: string;
  changeSummary?: string;
  requestId?: string;
}) {
  const candidate = await getCandidateContentForWorkspace(input.workspaceId, input.candidateId);
  if (!candidate || candidate.optimizationJobId !== input.optimizationJobId)
    throw new Error('NOT_FOUND');
  const job = candidate.optimizationJob;
  if (job.status !== 'SUCCEEDED') throw new Error('ILLEGAL_STATE_TRANSITION');
  if (!job.promptId) throw new Error('VALIDATION_ERROR');
  const promptId = job.promptId;
  return db.$transaction(async (tx) => {
    const latest = await tx.promptVersion.findFirst({
      where: { workspaceId: input.workspaceId, promptId },
      orderBy: { versionNumber: 'desc' },
    });
    const version = await tx.promptVersion.create({
      data: {
        promptId,
        workspaceId: input.workspaceId,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        parentVersionId: latest?.id,
        encryptedContent: serializeEnvelope(encryptPrompt(candidate.content)),
        contentHash: contentHash(candidate.content),
        encryptionStatus: 'AES-256-GCM',
        changeSummary: input.changeSummary ?? candidate.changeSummary,
        createdById: input.actorUserId,
      },
    });
    await tx.candidate.update({
      where: { id: candidate.id },
      data: { selected: true, savedPromptVersionId: version.id },
    });
    await tx.optimizationJob.update({
      where: { id: input.optimizationJobId },
      data: { savedCandidateId: candidate.id, savedPromptVersionId: version.id },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        action: 'optimization.candidate.saved',
        resourceType: 'promptVersion',
        resourceId: version.id,
        safeMetadata: safeJson({
          optimizationJobId: input.optimizationJobId,
          candidateId: candidate.id,
          promptId,
        }),
        requestId: input.requestId,
      },
    });
    return version;
  });
}

function requireManagementRole(role: string) {
  if (!['owner', 'admin'].includes(role.toLowerCase())) throw new Error('FORBIDDEN');
}

async function writeAudit(input: {
  workspaceId: string;
  actorUserId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
}) {
  return db.auditEvent.create({
    data: {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      safeMetadata: input.metadata ? JSON.stringify(redactAuditMetadata(input.metadata)) : null,
      requestId: input.requestId,
    },
  });
}

export async function listWorkspaceMembers(workspaceId: string) {
  return db.member.findMany({
    where: { organizationId: workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function listWorkspaceInvitations(workspaceId: string, now = new Date()) {
  const invitations = await db.invitation.findMany({
    where: { organizationId: workspaceId },
    orderBy: { createdAt: 'desc' },
  });
  return invitations.map((invitation) => ({
    ...invitation,
    state: invitationState(invitation.status, invitation.expiresAt, now),
  }));
}

export async function createWorkspaceInvitation(input: {
  workspaceId: string;
  inviterId: string;
  inviterRole: string;
  email: string;
  role?: string;
  expiresAt?: Date;
  requestId?: string;
}) {
  requireManagementRole(input.inviterRole);
  const invitation = await db.invitation.create({
    data: {
      id: randomUUID(),
      organizationId: input.workspaceId,
      inviterId: input.inviterId,
      email: input.email.trim().toLowerCase(),
      role: input.role?.toLowerCase() ?? 'viewer',
      status: 'pending',
      expiresAt: input.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  await writeAudit({
    workspaceId: input.workspaceId,
    actorUserId: input.inviterId,
    action: 'workspace.invitation.created',
    resourceType: 'invitation',
    resourceId: invitation.id,
    requestId: input.requestId,
  });
  return invitation;
}

export async function acceptWorkspaceInvitation(input: {
  invitationId: string;
  userId: string;
  email: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({ where: { id: input.invitationId } });
    if (!invitation) throw new Error('NOT_FOUND');
    assertInvitationCanBeUsed(invitationState(invitation.status, invitation.expiresAt));
    if (invitation.email.toLowerCase() !== input.email.toLowerCase()) throw new Error('FORBIDDEN');
    const member = await tx.member.upsert({
      where: {
        organizationId_userId: { organizationId: invitation.organizationId, userId: input.userId },
      },
      update: { role: invitation.role ?? 'viewer' },
      create: {
        id: `member-${invitation.id}`,
        organizationId: invitation.organizationId,
        userId: input.userId,
        role: invitation.role ?? 'viewer',
      },
    });
    await tx.invitation.update({ where: { id: invitation.id }, data: { status: 'accepted' } });
    await tx.auditEvent.create({
      data: {
        workspaceId: invitation.organizationId,
        actorUserId: input.userId,
        action: 'workspace.invitation.accepted',
        resourceType: 'invitation',
        resourceId: invitation.id,
        requestId: input.requestId,
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: invitation.organizationId,
        actorUserId: input.userId,
        action: 'member.joined',
        resourceType: 'member',
        resourceId: member.id,
        requestId: input.requestId,
      },
    });
    return member;
  });
}

export async function rejectWorkspaceInvitation(input: {
  invitationId: string;
  userId: string;
  email: string;
  requestId?: string;
}) {
  const invitation = await db.invitation.findUnique({ where: { id: input.invitationId } });
  if (!invitation) throw new Error('NOT_FOUND');
  assertInvitationCanBeUsed(invitationState(invitation.status, invitation.expiresAt));
  if (invitation.email.toLowerCase() !== input.email.toLowerCase()) throw new Error('FORBIDDEN');
  const updated = await db.invitation.update({
    where: { id: invitation.id },
    data: { status: 'rejected' },
  });
  await writeAudit({
    workspaceId: invitation.organizationId,
    actorUserId: input.userId,
    action: 'workspace.invitation.rejected',
    resourceType: 'invitation',
    resourceId: invitation.id,
    requestId: input.requestId,
  });
  return updated;
}

export async function revokeWorkspaceInvitation(input: {
  invitationId: string;
  actorUserId: string;
  actorRole: string;
  requestId?: string;
}) {
  requireManagementRole(input.actorRole);
  const invitation = await db.invitation.findUnique({ where: { id: input.invitationId } });
  if (!invitation) throw new Error('NOT_FOUND');
  if (invitation.status !== 'pending' || invitation.expiresAt <= new Date())
    throw new Error('CONFLICT');
  const updated = await db.invitation.update({
    where: { id: invitation.id },
    data: { status: 'canceled' },
  });
  await writeAudit({
    workspaceId: invitation.organizationId,
    actorUserId: input.actorUserId,
    action: 'workspace.invitation.revoked',
    resourceType: 'invitation',
    resourceId: invitation.id,
    requestId: input.requestId,
  });
  return updated;
}

export async function changeWorkspaceMemberRole(input: {
  workspaceId: string;
  actorUserId: string;
  actorRole: string;
  memberId: string;
  role: string;
  requestId?: string;
}) {
  requireManagementRole(input.actorRole);
  const target = await db.member.findFirst({
    where: { id: input.memberId, organizationId: input.workspaceId },
  });
  if (!target) throw new Error('NOT_FOUND');
  assertOwnerProtection(
    await db.member.findMany({
      where: { organizationId: input.workspaceId },
      select: { role: true },
    }),
    target.role,
    target.userId,
    input.actorUserId,
  );
  if (!['owner', 'admin', 'editor', 'reviewer', 'viewer'].includes(input.role.toLowerCase()))
    throw new Error('VALIDATION_ERROR');
  if (target.role.toLowerCase() === 'owner') throw new Error('FORBIDDEN');
  const updated = await db.member.update({
    where: { id: target.id },
    data: { role: input.role.toLowerCase() },
  });
  await writeAudit({
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    action: 'member.role.changed',
    resourceType: 'member',
    resourceId: target.id,
    metadata: { role: input.role },
    requestId: input.requestId,
  });
  return updated;
}

export async function removeWorkspaceMember(input: {
  workspaceId: string;
  actorUserId: string;
  actorRole: string;
  memberId: string;
  requestId?: string;
}) {
  requireManagementRole(input.actorRole);
  const target = await db.member.findFirst({
    where: { id: input.memberId, organizationId: input.workspaceId },
  });
  if (!target) throw new Error('NOT_FOUND');
  if (target.role.toLowerCase() === 'owner') throw new Error('LAST_OWNER_PROTECTED');
  const removed = await db.member.delete({ where: { id: target.id } });
  await writeAudit({
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    action: 'member.removed',
    resourceType: 'member',
    resourceId: target.id,
    requestId: input.requestId,
  });
  return removed;
}

export async function listWorkspaceAuditEvents(input: {
  workspaceId: string;
  action?: string;
  resourceType?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const where = {
    workspaceId: input.workspaceId,
    ...(input.action ? { action: input.action } : {}),
    ...(input.resourceType ? { resourceType: input.resourceType } : {}),
  };
  const [events, total] = await db.$transaction([
    db.auditEvent.findMany({
      where,
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditEvent.count({ where }),
  ]);
  return { events, total, page, pageSize };
}

export async function requestPromptReview(input: {
  workspaceId: string;
  promptVersionId: string;
  reviewerId: string;
  actorUserId: string;
  requestId?: string;
}) {
  const version = await db.promptVersion.findFirst({
    where: { id: input.promptVersionId, workspaceId: input.workspaceId },
  });
  if (!version) throw new Error('NOT_FOUND');
  if (version.createdById !== input.actorUserId) throw new Error('FORBIDDEN');
  if (version.lifecycleStatus !== 'DRAFT') throw new Error('ILLEGAL_STATE_TRANSITION');
  const existing = await db.promptReview.findFirst({
    where: { workspaceId: input.workspaceId, promptVersionId: version.id, status: 'REQUESTED' },
  });
  if (existing) throw new Error('CONFLICT');
  return db.$transaction(async (tx) => {
    const review = await tx.promptReview.create({
      data: {
        workspaceId: input.workspaceId,
        promptVersionId: version.id,
        reviewerId: input.reviewerId,
      },
    });
    await tx.promptVersion.update({
      where: { id: version.id },
      data: { lifecycleStatus: 'IN_REVIEW' },
    });
    await tx.prompt.update({
      where: { id: version.promptId },
      data: { lifecycleStatus: 'IN_REVIEW' },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        action: 'prompt.review.requested',
        resourceType: 'promptReview',
        resourceId: review.id,
        requestId: input.requestId,
      },
    });
    return review;
  });
}

export async function decidePromptReview(input: {
  workspaceId: string;
  reviewId: string;
  reviewerId: string;
  approve: boolean;
  note?: string;
  requestId?: string;
}) {
  const review = await db.promptReview.findFirst({
    where: { id: input.reviewId, workspaceId: input.workspaceId },
  });
  if (!review) throw new Error('NOT_FOUND');
  if (review.reviewerId !== input.reviewerId) throw new Error('FORBIDDEN');
  if (review.status !== 'REQUESTED') throw new Error('ILLEGAL_STATE_TRANSITION');
  const status = input.approve ? 'APPROVED' : 'REJECTED';
  const versionStatus = input.approve ? 'APPROVED' : 'DRAFT';
  const version = await db.promptVersion.findUniqueOrThrow({
    where: { id: review.promptVersionId },
  });
  return db.$transaction(async (tx) => {
    const updated = await tx.promptReview.update({
      where: { id: review.id },
      data: { status, note: input.note },
    });
    await tx.promptVersion.update({
      where: { id: review.promptVersionId },
      data: { lifecycleStatus: versionStatus },
    });
    await tx.prompt.update({
      where: { id: version.promptId },
      data: { lifecycleStatus: input.approve ? 'APPROVED' : 'DRAFT' },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: input.workspaceId,
        actorUserId: input.reviewerId,
        action: input.approve ? 'prompt.review.approved' : 'prompt.review.rejected',
        resourceType: 'promptReview',
        resourceId: review.id,
        requestId: input.requestId,
      },
    });
    return updated;
  });
}

export async function activatePromptVersion(input: {
  workspaceId: string;
  promptId: string;
  versionId: string;
  actorUserId: string;
  actorRole: string;
  requestId?: string;
}) {
  requireManagementRole(input.actorRole);
  const version = await db.promptVersion.findFirst({
    where: { id: input.versionId, promptId: input.promptId, workspaceId: input.workspaceId },
  });
  if (!version || version.lifecycleStatus !== 'APPROVED')
    throw new Error('ILLEGAL_STATE_TRANSITION');
  return db.$transaction(async (tx) => {
    const prompt = await tx.prompt.update({
      where: { id: input.promptId },
      data: { activeVersionId: version.id, lifecycleStatus: 'PUBLISHED' },
    });
    await tx.promptVersion.update({
      where: { id: version.id },
      data: { lifecycleStatus: 'PUBLISHED' },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        action: 'prompt.active_version.changed',
        resourceType: 'prompt',
        resourceId: prompt.id,
        requestId: input.requestId,
      },
    });
    return prompt;
  });
}
