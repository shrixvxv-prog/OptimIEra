import 'server-only';

import { db } from '@optimiera/database';
import {
  isVerifiedPromptAssetState,
  transitionVerificationState,
  type VerifiedPromptAsset,
  type VerifiedPromptAssetState,
} from '@optimiera/schemas';

export type VerificationInput = {
  job: {
    id: string;
    workspaceId: string;
    requestedById: string;
    status: string;
    savedCandidateId: string | null;
    savedPromptVersionId: string | null;
    providerType: string;
    createdAt: Date;
    evaluationRuns: Array<{ evaluationVersion: string | null }>;
  };
  artifact?: {
    id: string;
    status: string;
    storageProvider: string | null;
    network: string | null;
    rootHash: string | null;
    storageReference: string | null;
    contentHash: string | null;
  };
  proof?: {
    proofId: string;
    status: string;
    network: string;
    chainId: number;
    transactionHash: string | null;
    contractAddress: string | null;
  };
  certificate?: { verificationLevel: string; status: string };
  promptVersion?: { id: string; contentHash: string };
};

function stateFrom(input: VerificationInput): VerifiedPromptAssetState {
  if (input.certificate?.status === 'REVOKED' || input.proof?.status === 'REVOKED')
    return 'REVOKED';
  if (
    input.certificate?.verificationLevel === 'FULLY_VERIFIED' &&
    input.artifact?.storageProvider === '0G_STORAGE' &&
    input.artifact.status === 'DOWNLOAD_VERIFIED' &&
    input.proof?.status === 'VERIFIED' &&
    input.proof.network !== 'test-adapter'
  )
    return 'VERIFIED';
  if (input.certificate?.status === 'FAILED' || input.artifact?.status === 'FAILED')
    return 'FAILED';
  if (input.proof?.status === 'VERIFIED' && input.proof.network !== 'test-adapter')
    return 'CHAIN_CONFIRMED';
  if (input.proof?.status === 'CHAIN_PENDING' || input.proof?.status === 'SUBMITTED')
    return 'CHAIN_PENDING';
  if (input.artifact?.status === 'DOWNLOAD_VERIFIED') return 'STORAGE_VERIFIED';
  if (input.artifact?.status === 'UPLOADING') return 'STORAGE_PENDING';
  if (input.artifact) return 'EVIDENCE_CREATED';
  if (input.promptVersion) return 'VERSIONED';
  if (input.job.status === 'SUCCEEDED' && input.job.savedCandidateId) return 'OPTIMIZED';
  if (input.job.status === 'SUCCEEDED') return 'ANALYZED';
  return 'DRAFT';
}

export function deriveVerifiedPromptAssetState(input: VerificationInput) {
  return stateFrom(input);
}

export function assertVerificationTransition(
  from: VerifiedPromptAssetState,
  to: VerifiedPromptAssetState,
) {
  return transitionVerificationState(from, to);
}

export function assertVerifiedAsset(input: VerificationInput) {
  const state = stateFrom(input);
  if (!isVerifiedPromptAssetState(state)) throw new Error('VERIFIED_ASSET_REQUIRED');
  if (
    !input.artifact ||
    input.artifact.storageProvider !== '0G_STORAGE' ||
    input.artifact.status !== 'DOWNLOAD_VERIFIED' ||
    !input.artifact.rootHash ||
    !input.artifact.contentHash
  )
    throw new Error('STORAGE_VERIFICATION_REQUIRED');
  if (
    !input.proof ||
    input.proof.status !== 'VERIFIED' ||
    input.proof.network === 'test-adapter' ||
    !input.proof.transactionHash
  )
    throw new Error('CHAIN_VERIFICATION_REQUIRED');
  return state;
}

export function toVerifiedPromptAsset(input: VerificationInput): VerifiedPromptAsset {
  if (!input.promptVersion || !input.artifact) throw new Error('VERIFIED_ASSET_NOT_READY');
  const state = stateFrom(input);
  return {
    assetId: `asset_${input.job.id}`,
    owner: { userId: input.job.requestedById, ownerReferenceHash: input.proof?.proofId ?? '' },
    workspace: { workspaceId: input.job.workspaceId, workspaceReference: input.job.workspaceId },
    promptVersion: {
      id: input.promptVersion.id,
      versionId: input.promptVersion.id,
      hash: input.promptVersion.contentHash,
    },
    promptHash: input.promptVersion.contentHash,
    manifestHash: input.artifact.contentHash ?? '',
    evidenceRoot: input.artifact.rootHash,
    storageReference: {
      provider: input.artifact.storageProvider ?? 'LOCAL_ENCRYPTED',
      network: input.artifact.network,
      root: input.artifact.rootHash,
    },
    chainCommitment: {
      proofId: input.proof?.proofId ?? null,
      transactionHash: input.proof?.transactionHash ?? null,
      contractAddress: input.proof?.contractAddress ?? null,
      chainId: input.proof?.chainId ?? null,
    },
    registryTransaction: input.proof?.transactionHash ?? null,
    evaluationVersion: input.job.evaluationRuns[0]?.evaluationVersion ?? null,
    createdAt: input.job.createdAt.toISOString(),
    verificationState: state,
  };
}

export async function getVerificationRecord(optimizationId: string) {
  const job = await db.optimizationJob.findUnique({
    where: { id: optimizationId },
    include: {
      evaluationRuns: { orderBy: { createdAt: 'desc' }, take: 1 },
      artifacts: { where: { kind: 'OPTIMIZATION_EVIDENCE' }, take: 1 },
      chainProofs: { take: 1 },
      certificates: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!job) throw new Error('NOT_FOUND');
  const promptVersion = job.savedPromptVersionId
    ? await db.promptVersion.findUnique({
        where: { id: job.savedPromptVersionId },
        select: { id: true, contentHash: true },
      })
    : undefined;
  const input: VerificationInput = {
    job: { ...job, requestedById: job.requestedById },
    artifact: job.artifacts[0],
    proof: job.chainProofs[0],
    certificate: job.certificates[0],
    promptVersion: promptVersion ?? undefined,
  };
  return {
    state: stateFrom(input),
    input,
    asset: input.promptVersion && input.artifact ? toVerifiedPromptAsset(input) : null,
  };
}
