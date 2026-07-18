import 'server-only';

import { createHash } from 'node:crypto';
import { db } from '@optimiera/database';
import { decryptPrompt, parseEnvelope } from '@optimiera/encryption';
import { parseVerifiedManifest } from '@optimiera/og-storage';
import { requireSession } from './authorization';
import {
  canonicalCertificate,
  type CertificateVerificationLevel,
  type OptimizationCertificateV1,
} from './certificate-canonical';

export {
  canonicalCertificate,
  certificateLevels,
  type CertificateVerificationLevel,
  type OptimizationCertificateV1,
} from './certificate-canonical';

export type CertificateCheck = {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
};

const publicFields = [
  'certificateId',
  'publicSlug',
  'issuerRefHash',
  'analyzerVersion',
  'scoringVersion',
  'providerType',
  'providerName',
  'model',
  'originalPromptHash',
  'optimizedPromptHash',
  'evaluationHash',
  'manifestHash',
  'storageRoot',
  'storageTransactionHash',
  'chainProofId',
  'chainTransactionHash',
  'contractAddress',
  'chainId',
  'network',
  'aggregateScore',
  'confidence',
  'issuedAt',
  'expiresAt',
  'revokedAt',
  'verificationLevel',
  'certificateContentHash',
] as const;

function sha(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
function normalizeHash(value: string | null | undefined) {
  return (value ?? '').replace(/^0x/, '').toLowerCase();
}
function issuerHash(workspaceId: string) {
  return `0x${sha(`OptimIEra:issuer:V1:${workspaceId}`)}`;
}
function slugFor(jobId: string, versionId: string) {
  return `optimiera-${sha(`${jobId}:${versionId}`).slice(0, 20)}`;
}
function certificateIdFor(jobId: string, versionId: string) {
  return `cert_${sha(`${jobId}:${versionId}`).slice(0, 32)}`;
}

export function calculateTrustLevel(input: {
  storageVerified: boolean;
  chainVerified: boolean;
  testAdapter: boolean;
  revoked?: boolean;
  failed?: boolean;
}): CertificateVerificationLevel {
  if (input.revoked) return 'REVOKED';
  if (input.failed) return 'FAILED';
  if (input.testAdapter) return 'TEST_VERIFIED';
  if (input.storageVerified && input.chainVerified) return 'FULLY_VERIFIED';
  if (input.storageVerified) return 'STORAGE_VERIFIED';
  if (input.chainVerified) return 'CHAIN_VERIFIED';
  return 'LOCAL_VERIFIED';
}

export function projectPublicCertificate(certificate: OptimizationCertificateV1) {
  return Object.fromEntries(publicFields.map((key) => [key, certificate[key]]));
}

async function authorizedJob(optimizationId: string) {
  const session = await requireSession();
  const job = await db.optimizationJob.findUnique({
    where: { id: optimizationId },
    include: {
      candidates: true,
      artifacts: true,
      chainProofs: true,
      evaluationRuns: { include: { results: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!job) throw new Error('CERTIFICATE_NOT_READY');
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: job.workspaceId, userId: session.user.id } },
  });
  if (!member || !['OWNER', 'ADMIN', 'EDITOR'].includes(member.role.toUpperCase()))
    throw new Error('FORBIDDEN');
  return { job, session, member };
}

function verifySource(job: Awaited<ReturnType<typeof authorizedJob>>['job']) {
  if (
    job.status !== 'SUCCEEDED' ||
    !job.sourcePromptVersionId ||
    !job.savedPromptVersionId ||
    !job.savedCandidateId
  )
    throw new Error('CERTIFICATE_NOT_READY');
  const source = job.sourcePromptVersionId;
  const candidate = job.candidates.find(
    (item) =>
      item.id === job.savedCandidateId && item.savedPromptVersionId === job.savedPromptVersionId,
  );
  if (!candidate) throw new Error('CERTIFICATE_NOT_READY');
  return { sourceId: source, candidate, selectedVersionId: job.savedPromptVersionId };
}

export async function issueOptimizationCertificate(optimizationId: string) {
  const { job, session } = await authorizedJob(optimizationId);
  const selected = verifySource(job);
  const existing = await db.certificate.findFirst({
    where: { optimizationJobId: job.id, selectedPromptVersionId: selected.selectedVersionId },
  });
  if (existing) return { certificate: existing, publicUrl: `/verify/${existing.publicSlug}` };
  const sourceVersion = await db.promptVersion.findFirst({
    where: { id: selected.sourceId, workspaceId: job.workspaceId },
  });
  const selectedVersion = await db.promptVersion.findFirst({
    where: { id: selected.selectedVersionId, workspaceId: job.workspaceId },
  });
  const artifact = job.artifacts.find((item) => item.kind === 'OPTIMIZATION_EVIDENCE');
  if (!sourceVersion || !selectedVersion || !artifact?.encryptedManifest || !artifact.contentHash)
    throw new Error('CERTIFICATE_NOT_READY');
  const manifest = parseVerifiedManifest(
    new TextEncoder().encode(decryptPrompt(parseEnvelope(artifact.encryptedManifest))),
    artifact.contentHash,
  );
  if (
    normalizeHash(manifest.originalPromptHash) !== normalizeHash(sourceVersion.contentHash) ||
    normalizeHash(manifest.selectedCandidateHash) !==
      normalizeHash(selected.candidate.contentHash) ||
    normalizeHash(selectedVersion.contentHash) !== normalizeHash(selected.candidate.contentHash)
  )
    throw new Error('EVIDENCE_MISMATCH');
  const proof = job.chainProofs[0];
  if (proof?.status === 'REVOKED') throw new Error('CHAIN_PROOF_REVOKED');
  if (
    proof &&
    proof.status === 'VERIFIED' &&
    normalizeHash(proof.manifestHash) !== normalizeHash(artifact.contentHash)
  )
    throw new Error('CHAIN_PROOF_MISMATCH');
  const storageVerified =
    artifact.storageProvider === '0G_STORAGE' && artifact.status === 'DOWNLOAD_VERIFIED';
  const chainVerified = proof?.status === 'VERIFIED' && proof.network !== 'test-adapter';
  const testAdapter = proof?.status === 'VERIFIED' && proof.network === 'test-adapter';
  const evaluation = job.evaluationRuns[0];
  const providerTrace = job.requestMetadata ? JSON.parse(job.requestMetadata).providerTrace : null;
  const aggregateScore = Math.max(
    0,
    Math.min(
      100,
      selected.candidate.scoreData
        ? Number(JSON.parse(selected.candidate.scoreData).weightedTotal ?? 0)
        : 0,
    ),
  );
  const confidence = Math.max(0, Math.min(100, evaluation?.confidence ?? 0));
  const base = {
    schemaVersion: 'OptimizationCertificateV1' as const,
    certificateId: certificateIdFor(job.id, selected.selectedVersionId),
    publicSlug: slugFor(job.id, selected.selectedVersionId),
    optimizationId: job.id,
    issuerRefHash: issuerHash(job.workspaceId),
    sourcePromptVersionId: selected.sourceId,
    selectedPromptVersionId: selected.selectedVersionId,
    selectedCandidateId: selected.candidate.id,
    analyzerVersion: job.analyzerVersion,
    scoringVersion: job.scoringVersion,
    providerType: job.providerType,
    providerName: job.providerName,
    model: typeof providerTrace?.model === 'string' ? providerTrace.model : null,
    originalPromptHash: sourceVersion.contentHash,
    optimizedPromptHash: selected.candidate.contentHash,
    evaluationHash: manifest.evaluationHash,
    manifestHash: artifact.contentHash,
    storageRoot: storageVerified ? artifact.rootHash : null,
    storageTransactionHash: storageVerified ? artifact.transactionHash : null,
    chainProofId: proof && proof.status === 'VERIFIED' ? proof.proofId : null,
    chainTransactionHash: proof && proof.status === 'VERIFIED' ? proof.transactionHash : null,
    contractAddress: proof && proof.status === 'VERIFIED' ? proof.contractAddress : null,
    chainId: proof && proof.status === 'VERIFIED' ? proof.chainId : null,
    network: proof?.network ?? artifact.network,
    aggregateScore,
    confidence,
    issuedAt: new Date().toISOString(),
    expiresAt: null,
    revokedAt: null,
    verificationLevel: calculateTrustLevel({ storageVerified, chainVerified, testAdapter }),
  };
  const certificate: OptimizationCertificateV1 = {
    ...base,
    certificateContentHash: sha(canonicalCertificate(base)),
  };
  const record = await db.certificate.create({
    data: {
      workspaceId: job.workspaceId,
      optimizationJobId: job.id,
      sourcePromptVersionId: selected.sourceId,
      selectedPromptVersionId: selected.selectedVersionId,
      candidateId: selected.candidate.id,
      status: 'VERIFIED',
      artifactId: artifact.id,
      chainProofId: proof?.id,
      certificateId: certificate.certificateId,
      publicSlug: certificate.publicSlug,
      schemaVersion: certificate.schemaVersion,
      contentHash: certificate.manifestHash,
      certificateContentHash: certificate.certificateContentHash,
      verificationLevel: certificate.verificationLevel,
      aggregateScore,
      confidence,
      issuerRefHash: certificate.issuerRefHash,
      providerType: certificate.providerType,
      providerName: certificate.providerName,
      model: certificate.model,
      analyzerVersion: certificate.analyzerVersion,
      scoringVersion: certificate.scoringVersion,
      originalPromptHash: certificate.originalPromptHash,
      optimizedPromptHash: certificate.optimizedPromptHash,
      evaluationHash: certificate.evaluationHash,
      manifestHash: certificate.manifestHash,
      storageRoot: certificate.storageRoot,
      storageTransactionHash: certificate.storageTransactionHash,
      chainProofPublicId: certificate.chainProofId,
      chainTransactionHash: certificate.chainTransactionHash,
      contractAddress: certificate.contractAddress,
      chainId: certificate.chainId,
      network: certificate.network,
      issuedAt: new Date(certificate.issuedAt),
      expiresAt: null,
    },
  });
  await db.auditEvent.create({
    data: {
      workspaceId: job.workspaceId,
      actorUserId: session.user.id,
      action: 'certificate.issued',
      resourceType: 'certificate',
      resourceId: record.id,
      safeMetadata: JSON.stringify({
        certificateId: record.certificateId,
        verificationLevel: record.verificationLevel,
      }),
    },
  });
  return { certificate: record, publicUrl: `/verify/${record.publicSlug}` };
}

function toCertificate(record: Record<string, unknown>): OptimizationCertificateV1 {
  return {
    schemaVersion: record.schemaVersion as 'OptimizationCertificateV1',
    certificateId: record.certificateId as string,
    publicSlug: record.publicSlug as string,
    optimizationId: record.optimizationJobId as string,
    issuerRefHash: record.issuerRefHash as string,
    sourcePromptVersionId: record.sourcePromptVersionId as string,
    selectedPromptVersionId: record.selectedPromptVersionId as string,
    selectedCandidateId: record.candidateId as string,
    analyzerVersion: record.analyzerVersion as string | null,
    scoringVersion: record.scoringVersion as string | null,
    providerType: record.providerType as string,
    providerName: record.providerName as string,
    model: record.model as string | null,
    originalPromptHash: record.originalPromptHash as string,
    optimizedPromptHash: record.optimizedPromptHash as string,
    evaluationHash: record.evaluationHash as string,
    manifestHash: record.manifestHash as string,
    storageRoot: record.storageRoot as string | null,
    storageTransactionHash: record.storageTransactionHash as string | null,
    chainProofId: record.chainProofPublicId as string | null,
    chainTransactionHash: record.chainTransactionHash as string | null,
    contractAddress: record.contractAddress as string | null,
    chainId: record.chainId as number | null,
    network: record.network as string | null,
    aggregateScore: record.aggregateScore as number,
    confidence: record.confidence as number,
    issuedAt: new Date(record.issuedAt as string | Date).toISOString(),
    expiresAt: record.expiresAt ? new Date(record.expiresAt as string | Date).toISOString() : null,
    revokedAt: record.revokedAt ? new Date(record.revokedAt as string | Date).toISOString() : null,
    verificationLevel: record.verificationLevel as CertificateVerificationLevel,
    certificateContentHash: record.certificateContentHash as string,
  };
}

export async function verifyOptimizationCertificate(certificateIdOrSlug: string) {
  const certificate = await db.certificate.findFirst({
    where: { OR: [{ certificateId: certificateIdOrSlug }, { publicSlug: certificateIdOrSlug }] },
    include: {
      artifact: true,
      chainProof: true,
      selectedPromptVersion: true,
      sourcePromptVersion: true,
      optimizationJob: { select: { requestMetadata: true } },
    },
  });
  if (!certificate) throw new Error('CERTIFICATE_NOT_FOUND');
  const checks: CertificateCheck[] = [];
  const record = toCertificate(certificate as unknown as Record<string, unknown>);
  const { certificateContentHash, ...unsigned } = record;
  checks.push({
    name: 'certificate-content-hash',
    status: sha(canonicalCertificate(unsigned)) === certificateContentHash ? 'PASS' : 'FAIL',
    message: 'Canonical certificate content hash matches.',
  });
  checks.push({
    name: 'selected-version-immutable',
    status:
      certificate.selectedPromptVersion.contentHash === certificate.optimizedPromptHash
        ? 'PASS'
        : 'FAIL',
    message: 'Selected PromptVersion hash matches the certificate.',
  });
  checks.push({
    name: 'source-version-hash',
    status:
      certificate.sourcePromptVersion.contentHash === certificate.originalPromptHash
        ? 'PASS'
        : 'FAIL',
    message: 'Source PromptVersion hash matches the certificate.',
  });
  checks.push({
    name: 'manifest-hash',
    status:
      normalizeHash(certificate.artifact?.contentHash) === normalizeHash(certificate.manifestHash)
        ? 'PASS'
        : 'FAIL',
    message: 'Evidence manifest hash matches.',
  });
  if (certificate.chainProof)
    checks.push({
      name: 'chain-readback',
      status:
        certificate.chainProof.status === 'REVOKED'
          ? 'FAIL'
          : certificate.chainProof.manifestHash.replace(/^0x/, '').toLowerCase() ===
              certificate.manifestHash.replace(/^0x/, '').toLowerCase()
            ? 'PASS'
            : 'FAIL',
      message: 'Available chain proof matches the certificate.',
    });
  const failed = checks.some((check) => check.status === 'FAIL');
  const revoked = certificate.status === 'REVOKED' || certificate.chainProof?.status === 'REVOKED';
  const expired = Boolean(certificate.expiresAt && certificate.expiresAt < new Date());
  const level = revoked
    ? 'REVOKED'
    : failed || expired
      ? 'FAILED'
      : (certificate.verificationLevel as CertificateVerificationLevel);
  let providerRequestId: string | null = null;
  let providerResponseId: string | null = null;
  try {
    const metadata = certificate.optimizationJob.requestMetadata
      ? (JSON.parse(certificate.optimizationJob.requestMetadata) as {
          providerTrace?: { requestId?: unknown; responseId?: unknown };
        })
      : null;
    providerRequestId =
      typeof metadata?.providerTrace?.requestId === 'string'
        ? metadata.providerTrace.requestId
        : null;
    providerResponseId =
      typeof metadata?.providerTrace?.responseId === 'string'
        ? metadata.providerTrace.responseId
        : null;
  } catch {
    providerRequestId = null;
  }
  return {
    certificate: projectPublicCertificate({ ...record, verificationLevel: level }),
    overall: level !== 'FAILED' && level !== 'REVOKED',
    verificationLevel: level,
    checks,
    warnings: expired ? ['Certificate expired.'] : [],
    failedChecks: checks.filter((check) => check.status === 'FAIL'),
    verifiedAt: new Date().toISOString(),
    providerStatus: certificate.providerName,
    storageStatus: certificate.artifact?.storageProvider ?? 'LOCAL_ENCRYPTED',
    chainStatus: certificate.chainProof?.status ?? 'UNCONFIGURED',
    providerRequestId,
    providerResponseId,
    proofBlock: certificate.chainProof?.blockNumber?.toString() ?? null,
    contractReadbackStatus:
      certificate.chainProof?.status === 'VERIFIED' ? 'VERIFIED' : 'UNVERIFIED',
  };
}

export async function getAuthenticatedCertificate(id: string) {
  const session = await requireSession();
  const certificate = await db.certificate.findUnique({
    where: { id },
    include: { optimizationJob: true },
  });
  if (!certificate) throw new Error('CERTIFICATE_NOT_FOUND');
  const member = await db.member.findUnique({
    where: {
      organizationId_userId: { organizationId: certificate.workspaceId, userId: session.user.id },
    },
  });
  if (!member) throw new Error('FORBIDDEN');
  return certificate;
}

export async function revokeOptimizationCertificate(id: string, reason: string) {
  const session = await requireSession();
  const certificate = await db.certificate.findUnique({ where: { id } });
  if (!certificate) throw new Error('CERTIFICATE_NOT_FOUND');
  const member = await db.member.findUnique({
    where: {
      organizationId_userId: { organizationId: certificate.workspaceId, userId: session.user.id },
    },
  });
  if (!member || !['OWNER', 'ADMIN'].includes(member.role.toUpperCase()))
    throw new Error('FORBIDDEN');
  if (certificate.status === 'REVOKED') return certificate;
  const revoked = await db.certificate.update({
    where: { id },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
      safeFailureCode: 'CERTIFICATE_REVOKED',
      safeFailureMessage: 'Certificate revoked by an authorized workspace administrator.',
    },
  });
  await db.auditEvent.create({
    data: {
      workspaceId: certificate.workspaceId,
      actorUserId: session.user.id,
      action: 'certificate.revoked',
      resourceType: 'certificate',
      resourceId: certificate.id,
      safeMetadata: JSON.stringify({ reasonLength: reason.trim().length }),
    },
  });
  return revoked;
}

export function publicCertificateJson(
  result: Awaited<ReturnType<typeof verifyOptimizationCertificate>>,
) {
  return JSON.stringify(
    {
      ...result.certificate,
      verification: {
        overall: result.overall,
        checks: result.checks,
        warnings: result.warnings,
        verifiedAt: result.verifiedAt,
      },
    },
    null,
    2,
  );
}
