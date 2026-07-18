import {
  createProviderContext,
  diffPrompts,
  OptimIEraRulesProvider,
  validateOptimizationRequest,
  type GeneratedCandidate,
  type PromptDiff,
} from '@optimiera/optimizer-core';
import {
  createPromptWithInitialVersion,
  createQueuedOptimizationJob,
  db,
  getCandidateContentForWorkspace,
  getOptimizationForWorkspace,
  getOptimizationRequestForRetry,
  getPromptVersionContentForWorkspace,
  markOptimizationRunning,
  persistOptimizationFailure,
  persistOptimizationSuccess,
  saveCandidateAsPromptVersion,
} from '@optimiera/database';
import type { OptimizationRequest } from '@optimiera/schemas';
import { can, requireSession, type Role } from './authorization';
import { OGComputeRouterProvider, type OGComputeError } from '@optimiera/og-compute';

const provider = new OptimIEraRulesProvider();
const ogProvider = new OGComputeRouterProvider();

function normalizeRole(role: string): Role {
  const normalized = role.toUpperCase();
  if (!['OWNER', 'ADMIN', 'EDITOR', 'REVIEWER', 'VIEWER'].includes(normalized))
    throw new Error('FORBIDDEN');
  return normalized as Role;
}

function requireWriteRole(role: string) {
  if (!can(normalizeRole(role), 'prompts:write')) throw new Error('FORBIDDEN');
}

async function memberForWorkspace(workspaceId: string, userId: string) {
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: workspaceId, userId } },
  });
  if (!member) throw new Error('FORBIDDEN');
  return member;
}

function classifyOptimizationFailure(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as OGComputeError).code);
    if (
      [
        '400',
        '401',
        '402',
        '403',
        '429',
        '502',
        '503',
        'TIMEOUT',
        'UNAVAILABLE',
        'SCHEMA_INVALID',
      ].includes(code)
    )
      return {
        code: `OG_COMPUTE_${code}`,
        message: `0G Compute failed safely (${code}). Choose Retry 0G Compute or run with the Rules Engine.`,
      };
  }
  if (error instanceof Error) {
    if (
      [
        'PROVIDER_UNAVAILABLE',
        'ANALYSIS_FAILED',
        'GENERATION_FAILED',
        'EVALUATION_FAILED',
        'VALIDATION_ERROR',
        'FORBIDDEN',
        'NOT_FOUND',
        'CONFLICT',
      ].includes(error.message)
    ) {
      return { code: error.message, message: error.message };
    }
  }
  return { code: 'INTERNAL_ERROR', message: 'Optimization failed safely. Retry the request.' };
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  return JSON.parse(value) as T;
}

export async function runOptimization(input: {
  request: OptimizationRequest;
  idempotencyKey?: string;
  requestId?: string;
  providerType?: 'RULES_ENGINE' | 'OG_COMPUTE';
}) {
  const session = await requireSession();
  let request = validateOptimizationRequest(input.request);
  let promptId = request.promptId;
  let projectId = request.newPrompt?.projectId;
  let workspaceId = request.newPrompt?.workspaceId;
  let sourcePromptVersionId = request.sourcePromptVersionId;

  if (promptId) {
    const prompt = await db.prompt.findFirst({
      where: { id: promptId, archivedAt: null },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    if (!prompt) throw new Error('NOT_FOUND');
    workspaceId = prompt.workspaceId;
    projectId = prompt.projectId;
    sourcePromptVersionId = sourcePromptVersionId ?? prompt.versions[0]?.id;
  }
  if (!workspaceId || !projectId) throw new Error('VALIDATION_ERROR');

  const member = await memberForWorkspace(workspaceId, session.user.id);
  requireWriteRole(member.role);
  const project = await db.project.findFirst({ where: { id: projectId, workspaceId } });
  if (!project) throw new Error('NOT_FOUND');

  if (!promptId && request.newPrompt) {
    const created = await createPromptWithInitialVersion({
      workspaceId,
      projectId,
      createdById: session.user.id,
      title: request.newPrompt.title,
      content: request.rawPrompt,
    });
    promptId = created.prompt.id;
    sourcePromptVersionId = created.version.id;
    request = { ...request, promptId, sourcePromptVersionId };
  }

  const selectedProvider = input.providerType === 'OG_COMPUTE' ? ogProvider : provider;
  const job = await createQueuedOptimizationJob({
    workspaceId,
    projectId,
    promptId,
    sourcePromptVersionId,
    requestedById: session.user.id,
    mode: request.optimizationMode,
    providerType: selectedProvider.type,
    providerName: selectedProvider.name,
    request,
    idempotencyKey: input.idempotencyKey,
  });

  try {
    await markOptimizationRunning(job.id);
    const context = createProviderContext({ requestId: input.requestId });
    if (selectedProvider === ogProvider) {
      const combined = await ogProvider.optimizeCombined(request, context);
      return persistOptimizationSuccess({
        jobId: job.id,
        workspaceId,
        actorUserId: session.user.id,
        analysis: combined.analysis,
        candidates: combined.candidates,
        evaluation: combined.evaluation,
        requestId: combined.trace?.requestId ?? input.requestId,
        providerMetadata: combined.trace as Record<string, unknown> | undefined,
      });
    }
    const analysis = await provider.analyze(request, context);
    const candidates = await provider.generateCandidates(request, analysis, context);
    if (candidates.length !== 3) throw new Error('GENERATION_FAILED');
    const evaluation = await provider.evaluateCandidates(request, candidates, context);
    return persistOptimizationSuccess({
      jobId: job.id,
      workspaceId,
      actorUserId: session.user.id,
      analysis,
      candidates,
      evaluation,
      requestId: input.requestId,
    });
  } catch (error) {
    const failure = classifyOptimizationFailure(error);
    await persistOptimizationFailure({
      jobId: job.id,
      workspaceId,
      actorUserId: session.user.id,
      failureCode: failure.code,
      safeFailureMessage: failure.message,
      requestId: input.requestId,
    });
    throw new Error(failure.code);
  }
}

export async function loadOptimizationResult(optimizationId: string) {
  const session = await requireSession();
  const job = await db.optimizationJob.findUnique({ where: { id: optimizationId } });
  if (!job) throw new Error('NOT_FOUND');
  await memberForWorkspace(job.workspaceId, session.user.id);
  const result = await getOptimizationForWorkspace(job.workspaceId, optimizationId);
  if (!result) throw new Error('NOT_FOUND');
  const candidates = await Promise.all(
    result.candidates.map(async (candidate) => {
      const withContent = await getCandidateContentForWorkspace(job.workspaceId, candidate.id);
      return { ...candidate, content: withContent?.content ?? '' };
    }),
  );
  const recommended = candidates.find((candidate) => candidate.recommended) ?? candidates[0];
  const source = result.sourcePromptVersionId
    ? await getPromptVersionContentForWorkspace(result.workspaceId, result.sourcePromptVersionId)
    : null;
  const diff: PromptDiff | null = recommended
    ? diffPrompts(source?.content ?? '', recommended.content)
    : null;
  return {
    ...result,
    analysis: parseJson(result.analysisData),
    requestMetadata: parseJson(result.requestMetadata),
    candidates,
    evaluation: result.evaluationRuns[0] ?? null,
    diff,
  };
}

export async function saveOptimizationCandidate(input: {
  optimizationJobId: string;
  candidateId: string;
  changeSummary?: string;
  submitForReview?: boolean;
}) {
  const session = await requireSession();
  const job = await db.optimizationJob.findUnique({ where: { id: input.optimizationJobId } });
  if (!job) throw new Error('NOT_FOUND');
  const member = await memberForWorkspace(job.workspaceId, session.user.id);
  requireWriteRole(member.role);
  const version = await saveCandidateAsPromptVersion({
    workspaceId: job.workspaceId,
    optimizationJobId: input.optimizationJobId,
    candidateId: input.candidateId,
    actorUserId: session.user.id,
    changeSummary: input.changeSummary,
  });
  if (input.submitForReview) {
    await db.promptVersion.update({
      where: { id: version.id },
      data: { lifecycleStatus: 'IN_REVIEW' },
    });
  }
  return version;
}

export async function retryOptimization(optimizationJobId: string) {
  const session = await requireSession();
  const job = await db.optimizationJob.findUnique({ where: { id: optimizationJobId } });
  if (!job) throw new Error('NOT_FOUND');
  const member = await memberForWorkspace(job.workspaceId, session.user.id);
  requireWriteRole(member.role);
  const request = await getOptimizationRequestForRetry(job.workspaceId, optimizationJobId);
  return runOptimization({
    request,
    idempotencyKey: `${optimizationJobId}:retry:${Date.now()}`,
  });
}

export function serializeCandidateForApi(candidate: {
  id: string;
  candidateType: string;
  changeSummary: string;
  scoreData: string;
  providerType: string;
  providerName: string;
  tokenEstimate: number;
  rank: number;
  recommended: boolean;
  selected: boolean;
  savedPromptVersionId: string | null;
  content?: string;
}) {
  return {
    id: candidate.id,
    candidateType: candidate.candidateType,
    changeSummary: candidate.changeSummary,
    scoreData: parseJson(candidate.scoreData),
    providerType: candidate.providerType,
    providerName: candidate.providerName,
    tokenEstimate: candidate.tokenEstimate,
    rank: candidate.rank,
    recommended: candidate.recommended,
    selected: candidate.selected,
    savedPromptVersionId: candidate.savedPromptVersionId,
    optimizedPrompt: candidate.content,
  };
}

export type OptimizationFormCandidate = GeneratedCandidate;
