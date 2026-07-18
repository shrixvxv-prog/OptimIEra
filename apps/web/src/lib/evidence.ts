import 'server-only';

import { createHash } from 'node:crypto';
import { db } from '@optimiera/database';
import {
  decryptPrompt,
  encryptPrompt,
  parseEnvelope,
  serializeEnvelope,
} from '@optimiera/encryption';
import {
  finalizeManifest,
  OGStorageAdapter,
  parseVerifiedManifest,
  StorageError,
  type OptimizationEvidenceManifestV1,
} from '@optimiera/og-storage';
import { readOGComputeConfig, readOGStorageConfig } from '@optimiera/config';
import { requireSession, type Role } from './authorization';
import { assertLiveWritesEnabled } from './runtime-config';
import { completeLiveOperation, reserveLiveOperation } from './live-operation-quota';

const artifactKind = 'OPTIMIZATION_EVIDENCE';
function role(value: string): Role {
  const normalized = value.toUpperCase();
  if (!['OWNER', 'ADMIN', 'EDITOR', 'REVIEWER', 'VIEWER'].includes(normalized))
    throw new Error('FORBIDDEN');
  return normalized as Role;
}
function sha(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
function json(value: string | null) {
  return value ? (JSON.parse(value) as Record<string, unknown>) : {};
}
function readOGStorageSafeComputeModel() {
  return readOGComputeConfig().model ?? null;
}
function readOGStorageSafeComputeNetwork() {
  return readOGComputeConfig().network;
}
function readProviderTrace(value: string | null) {
  const trace = json(value).providerTrace;
  return trace && typeof trace === 'object'
    ? (trace as OptimizationEvidenceManifestV1['providerTrace'])
    : null;
}

export async function finalizeOptimizationEvidence(optimizationJobId: string) {
  const session = await requireSession();
  const job = await db.optimizationJob.findUnique({
    where: { id: optimizationJobId },
    include: {
      candidates: { orderBy: { rank: 'asc' } },
      evaluationRuns: { include: { results: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      artifacts: true,
    },
  });
  if (!job) throw new Error('NOT_FOUND');
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: job.workspaceId, userId: session.user.id } },
  });
  if (!member || !['OWNER', 'ADMIN', 'EDITOR'].includes(role(member.role)))
    throw new Error('FORBIDDEN');
  if (job.status !== 'SUCCEEDED') throw new Error('ILLEGAL_STATE_TRANSITION');
  const existing = job.artifacts.find((artifact) => artifact.kind === artifactKind);
  if (existing?.status === 'DOWNLOAD_VERIFIED') return existing;
  const source = job.sourcePromptVersionId
    ? await db.promptVersion.findFirst({
        where: { id: job.sourcePromptVersionId, workspaceId: job.workspaceId },
      })
    : null;
  if (!source || !job.candidates.length) throw new Error('MANIFEST_INVALID');
  decryptPrompt(parseEnvelope(source.encryptedContent));
  for (const candidate of job.candidates) decryptPrompt(parseEnvelope(candidate.encryptedContent));
  const selected = job.candidates.find((candidate) => candidate.recommended) ?? null;
  const evaluation = job.evaluationRuns[0];
  const originalPromptHash = source.contentHash;
  const candidateHashes = Object.fromEntries(
    job.candidates.map((candidate) => [candidate.id, candidate.contentHash]),
  );
  const base: Omit<OptimizationEvidenceManifestV1, 'manifestContentHash'> = {
    schemaVersion: 'OptimizationEvidenceManifestV1',
    applicationName: 'OptimIEra',
    applicationVersion: '0.1.0',
    optimizationId: job.id,
    workspaceReference: job.workspaceId,
    sourcePromptVersionId: source.id,
    selectedCandidateId: selected?.id ?? null,
    providerType: job.providerType,
    providerName: job.providerName,
    providerTrace: readProviderTrace(job.requestMetadata),
    model:
      job.providerType === 'OG_COMPUTE'
        ? readOGStorageSafeComputeModel()
        : (readProviderTrace(job.requestMetadata)?.model ?? null),
    network:
      job.providerType === 'OG_COMPUTE'
        ? readOGStorageSafeComputeNetwork()
        : job.providerType === 'EXTERNAL_MODEL'
          ? 'nous-api'
          : null,
    analyzerVersion: job.analyzerVersion,
    scoringVersion: job.scoringVersion,
    encryptedOriginalPrompt: JSON.parse(source.encryptedContent),
    encryptedCandidates: job.candidates.map((candidate) => ({
      candidateId: candidate.id,
      candidateType: candidate.candidateType,
      contentHash: candidate.contentHash,
      envelope: JSON.parse(candidate.encryptedContent),
    })),
    originalPromptHash,
    candidateHashes,
    selectedCandidateHash: selected?.contentHash ?? null,
    evaluationHash: sha(
      JSON.stringify({
        scoringDimensions: evaluation?.scoringDimensions,
        results:
          evaluation?.results.map((result) => ({
            candidateId: result.candidateId,
            weightedTotal: result.weightedTotal,
            scoreData: result.scoreData,
          })) ?? [],
      }),
    ),
    dimensionScores: json(evaluation?.scoringDimensions ?? null),
    recommendation: evaluation?.winnerLabel ?? 'ORIGINAL',
    confidence: evaluation?.confidence ?? 0,
    safeWarnings: Object.values(json(evaluation?.warnings ?? null))
      .filter((item): item is string => typeof item === 'string')
      .slice(0, 20),
    startedAt: job.startedAt?.toISOString() ?? job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? new Date().toISOString(),
  };
  const manifest = finalizeManifest(base);
  const bytes = new TextEncoder().encode(JSON.stringify(manifest));
  const contentHash = createHash('sha256').update(bytes).digest('hex');
  const localEnvelope = serializeEnvelope(encryptPrompt(JSON.stringify(manifest)));
  const config = readOGStorageConfig();
  const artifact = await db.artifact.upsert({
    where: {
      workspaceId_optimizationJobId_kind: {
        workspaceId: job.workspaceId,
        optimizationJobId: job.id,
        kind: artifactKind,
      },
    },
    create: {
      workspaceId: job.workspaceId,
      optimizationJobId: job.id,
      kind: artifactKind,
      status: 'LOCAL_CREATED',
      schemaVersion: manifest.schemaVersion,
      storageProvider: config.enabled && config.privateKey ? '0G_STORAGE' : 'LOCAL_ENCRYPTED',
      network: config.network,
      storageMode: config.mode,
      indexerHost: new URL(config.indexerUrl).host,
      contentHash,
      byteSize: bytes.byteLength,
      uploadStatus: 'NOT_UPLOADED',
      proofVerificationStatus: 'NOT_VERIFIED',
      encryptedManifest: localEnvelope,
    },
    update: {
      encryptedManifest: localEnvelope,
      contentHash,
      byteSize: bytes.byteLength,
      schemaVersion: manifest.schemaVersion,
      status: 'LOCAL_CREATED',
      safeErrorCode: null,
      safeErrorMessage: null,
    },
  });
  if (!config.enabled || !config.privateKey) return artifact;
  assertLiveWritesEnabled();
  const quotaReservation = await reserveLiveOperation({
    userId: session.user.id,
    workspaceId: job.workspaceId,
    operation: 'STORAGE',
    idempotencyKey: `storage:${artifact.id}`,
  });
  const claim = await db.artifact.updateMany({
    where: { id: artifact.id, status: { in: ['LOCAL_CREATED', 'FAILED'] } },
    data: { status: 'UPLOADING', uploadStatus: 'UPLOADING', retryCount: { increment: 1 } },
  });
  if (claim.count === 0) return db.artifact.findUniqueOrThrow({ where: { id: artifact.id } });
  const adapter = new OGStorageAdapter(config);
  try {
    const uploaded = await adapter.uploadArtifact({ encryptedBytes: bytes, contentHash });
    const verified = await adapter.verifyArtifact(uploaded.storageRoot as string, contentHash);
    parseVerifiedManifest(
      (await adapter.downloadArtifact(uploaded.storageRoot as string)).bytes as Uint8Array,
      contentHash,
    );
    const persisted = await db.artifact.update({
      where: { id: artifact.id },
      data: {
        status: 'DOWNLOAD_VERIFIED',
        uploadStatus: 'STORAGE_VERIFIED',
        proofVerificationStatus: 'VERIFIED',
        rootHash: verified.storageRoot,
        transactionHash: uploaded.txHash,
        uploadedAt: new Date(),
        verifiedAt: new Date(),
      },
    });
    await completeLiveOperation(quotaReservation.id);
    return persisted;
  } catch (error) {
    const safe =
      error instanceof StorageError
        ? error
        : new StorageError('STORAGE_UPLOAD_FAILED', '0G Storage upload failed.');
    await db.artifact.update({
      where: { id: artifact.id },
      data: {
        status: 'FAILED',
        uploadStatus: 'FAILED',
        safeErrorCode: safe.code,
        safeErrorMessage: safe.message,
      },
    });
    throw new Error(safe.code);
  }
}

export async function getEvidenceForOptimization(optimizationJobId: string) {
  const session = await requireSession();
  const artifact = await db.artifact.findFirst({
    where: { optimizationJobId, kind: artifactKind },
  });
  if (!artifact) return null;
  const member = await db.member.findUnique({
    where: {
      organizationId_userId: { organizationId: artifact.workspaceId, userId: session.user.id },
    },
  });
  if (!member) throw new Error('FORBIDDEN');
  return artifact;
}
