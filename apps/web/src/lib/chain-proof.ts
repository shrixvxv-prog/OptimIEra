import 'server-only';

import { db } from '@optimiera/database';
import { decryptPrompt, parseEnvelope } from '@optimiera/encryption';
import {
  buildProofCommitment,
  createProofId,
  hashOwnerReference,
  OGChainAdapter,
  TestChainAdapter,
  type ProofCommitment,
  type ChainAdapter,
} from '@optimiera/og-chain';
import { keccak256 } from 'viem';
import { readOGChainConfig } from '@optimiera/config';
import { parseVerifiedManifest } from '@optimiera/og-storage';
import { requireSession, type Role } from './authorization';
import { assertLiveWritesEnabled } from './runtime-config';
import { completeLiveOperation, reserveLiveOperation } from './live-operation-quota';

const testChainAdapter = new TestChainAdapter();
function chainAdapter(config: ReturnType<typeof readOGChainConfig>) {
  if (process.env.OG_CHAIN_TEST_ADAPTER === 'true') {
    return testChainAdapter;
  }
  return new OGChainAdapter(config);
}
export async function getChainHealth() {
  try {
    const config = readOGChainConfig();
    return chainAdapter(config).healthCheck();
  } catch {
    return {
      state: 'UNAVAILABLE' as const,
      network: 'testnet',
      chainId: 16602,
      rpcHost: 'evmrpc-testnet.0g.ai',
      signerConfigured: false,
      registryConfigured: false,
      deployedBytecode: false,
    };
  }
}

function allowed(role: string): role is Role {
  return ['OWNER', 'ADMIN', 'EDITOR'].includes(role.toUpperCase());
}
function hashText(value: string) {
  return keccak256(new TextEncoder().encode(value));
}
function asBytes32(value: string | null | undefined) {
  return value
    ? (`0x${value.replace(/^0x/, '')}` as `0x${string}`)
    : (`0x${'0'.repeat(64)}` as `0x${string}`);
}

async function loadCommitment(optimizationJobId: string, userId: string) {
  const job = await db.optimizationJob.findUnique({
    where: { id: optimizationJobId },
    include: {
      candidates: { orderBy: { rank: 'asc' } },
      artifacts: true,
      evaluationRuns: { include: { results: true }, take: 1 },
    },
  });
  if (!job) throw new Error('NOT_FOUND');
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: job.workspaceId, userId } },
  });
  if (!member || !allowed(member.role)) throw new Error('FORBIDDEN');
  if (job.status !== 'SUCCEEDED') throw new Error('ILLEGAL_STATE_TRANSITION');
  const artifact = job.artifacts.find((item) => item.kind === 'OPTIMIZATION_EVIDENCE');
  if (!artifact?.encryptedManifest) throw new Error('MANIFEST_INVALID');
  const manifest = parseVerifiedManifest(
    new TextEncoder().encode(decryptPrompt(parseEnvelope(artifact.encryptedManifest))),
    artifact.contentHash ?? undefined,
  );
  const selected = job.candidates.find((candidate) => candidate.recommended) ?? job.candidates[0];
  const score = Number(JSON.parse(selected.scoreData).weightedTotal ?? 0);
  const commitment = buildProofCommitment({
    optimizationId: hashText(job.id),
    manifestHash: asBytes32(artifact.contentHash),
    storageRoot: asBytes32(artifact.rootHash),
    originalPromptHash: asBytes32(manifest.originalPromptHash),
    optimizedPromptHash: asBytes32(selected.contentHash),
    evaluationHash: asBytes32(manifest.evaluationHash),
    ownerRefHash: hashOwnerReference(job.workspaceId, userId),
    aggregateScore: Math.max(0, Math.min(100, Math.round(score))),
    evidenceMode: artifact.storageProvider === '0G_STORAGE' ? 'OG_STORAGE' : 'LOCAL_ENCRYPTED',
    applicationVersion: '0.1.0',
  }) as unknown as ProofCommitment;
  return { job, artifact, commitment, proofId: createProofId(commitment) };
}

export async function createLocalProofCommitment(optimizationJobId: string) {
  const session = await requireSession();
  const { job, artifact, commitment, proofId } = await loadCommitment(
    optimizationJobId,
    session.user.id,
  );
  const config = readOGChainConfig();
  const testMode = process.env.OG_CHAIN_TEST_ADAPTER === 'true';
  return db.chainProof.upsert({
    where: {
      workspaceId_optimizationJobId: { workspaceId: job.workspaceId, optimizationJobId: job.id },
    },
    create: {
      workspaceId: job.workspaceId,
      optimizationJobId: job.id,
      artifactId: artifact.id,
      proofId,
      chainId: testMode ? 31337 : config.chainId,
      network: testMode ? 'test-adapter' : config.network,
      manifestHash: commitment.manifestHash,
      storageRoot: commitment.storageRoot,
      aggregateScore: commitment.aggregateScore,
      status: 'LOCAL_READY',
    },
    update: {
      artifactId: artifact.id,
      proofId,
      chainId: testMode ? 31337 : config.chainId,
      network: testMode ? 'test-adapter' : config.network,
      manifestHash: commitment.manifestHash,
      storageRoot: commitment.storageRoot,
      aggregateScore: commitment.aggregateScore,
    },
  });
}

export async function registerOptimizationProof(optimizationJobId: string) {
  const session = await requireSession();
  const existing = await db.chainProof.findFirst({ where: { optimizationJobId } });
  if (existing?.status === 'VERIFIED') {
    await getProofForOptimization(optimizationJobId);
    return existing;
  }
  const local = await createLocalProofCommitment(optimizationJobId);
  const config = readOGChainConfig();
  if (
    process.env.OG_CHAIN_TEST_ADAPTER !== 'true' &&
    (!config.enabled || !config.privateKey || !config.registryAddress)
  )
    return local;
  if (process.env.OG_CHAIN_TEST_ADAPTER !== 'true') assertLiveWritesEnabled();
  if (local.status === 'VERIFIED') return local;
  const quotaReservation =
    process.env.OG_CHAIN_TEST_ADAPTER === 'true'
      ? null
      : await reserveLiveOperation({
          userId: session.user.id,
          workspaceId: local.workspaceId,
          operation: 'CHAIN',
          idempotencyKey: `chain:${local.id}`,
        });
  const claim = await db.chainProof.updateMany({
    where: { id: local.id, status: { in: ['LOCAL_READY', 'FAILED'] } },
    data: {
      status: 'CHAIN_PENDING',
      retryCount: { increment: 1 },
      safeErrorCode: null,
      safeErrorMessage: null,
    },
  });
  if (!claim.count) return db.chainProof.findUniqueOrThrow({ where: { id: local.id } });
  const { commitment } = await loadCommitment(optimizationJobId, session.user.id);
  const adapter = chainAdapter(config);
  try {
    const submitted: Awaited<ReturnType<ChainAdapter['registerProof']>> = local.transactionHash
      ? { proofId: local.proofId as `0x${string}`, txHash: local.transactionHash as `0x${string}` }
      : await adapter.registerProof(commitment);
    if (!local.transactionHash) {
      await db.chainProof.update({
        where: { id: local.id },
        data: {
          status: 'SUBMITTED',
          transactionHash: submitted.txHash,
          contractAddress: submitted.contractAddress,
          registrarAddress: submitted.registrar,
          submittedAt: new Date(),
        },
      });
    } else {
      await db.chainProof.update({ where: { id: local.id }, data: { status: 'SUBMITTED' } });
    }
    const receipt = await adapter.waitForReceipt(submitted.txHash);
    const blockNumber =
      'blockNumber' in (receipt as object)
        ? Number((receipt as { blockNumber: bigint }).blockNumber)
        : null;
    const blockHash =
      'blockHash' in (receipt as object)
        ? String((receipt as { blockHash: string }).blockHash)
        : null;
    const verified = await adapter.verifyProof(submitted.proofId, commitment);
    if (!verified) throw new Error('PROOF_MISMATCH');
    const persisted = await db.chainProof.update({
      where: { id: local.id },
      data: {
        status: 'VERIFIED',
        blockNumber,
        blockHash,
        confirmedAt: new Date(),
        verifiedAt: new Date(),
        confirmationCount:
          'confirmations' in (receipt as object)
            ? Number((receipt as { confirmations: number }).confirmations)
            : config.confirmations,
      },
    });
    if (quotaReservation) await completeLiveOperation(quotaReservation.id);
    return persisted;
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 80) : 'CHAIN_FAILED';
    return db.chainProof.update({
      where: { id: local.id },
      data: {
        status: 'FAILED',
        safeErrorCode: code,
        safeErrorMessage: '0G Chain proof operation failed safely.',
      },
    });
  }
}

export async function revokeOptimizationProof(optimizationJobId: string, reason: string) {
  const session = await requireSession();
  const job = await db.optimizationJob.findUnique({
    where: { id: optimizationJobId },
    select: { workspaceId: true },
  });
  if (!job) throw new Error('NOT_FOUND');
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: job.workspaceId, userId: session.user.id } },
  });
  if (!member || !['OWNER', 'ADMIN'].includes(member.role.toUpperCase()))
    throw new Error('FORBIDDEN');
  const proof = await db.chainProof.findUnique({
    where: { workspaceId_optimizationJobId: { workspaceId: job.workspaceId, optimizationJobId } },
  });
  if (!proof) throw new Error('PROOF_NOT_FOUND');
  const config = readOGChainConfig();
  if (
    process.env.OG_CHAIN_TEST_ADAPTER !== 'true' &&
    (!config.enabled || !config.privateKey || !config.registryAddress)
  )
    throw new Error('CHAIN_UNCONFIGURED');
  if (process.env.OG_CHAIN_TEST_ADAPTER !== 'true') assertLiveWritesEnabled();
  await chainAdapter(config).revokeProof(
    proof.proofId as `0x${string}`,
    hashText(`OptimIEra:revoke:V1:${reason}`),
  );
  return db.chainProof.update({
    where: { id: proof.id },
    data: { status: 'REVOKED', revokedAt: new Date() },
  });
}

export async function getProofForOptimization(optimizationJobId: string) {
  const session = await requireSession();
  const job = await db.optimizationJob.findUnique({
    where: { id: optimizationJobId },
    select: { workspaceId: true },
  });
  if (!job) return null;
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: job.workspaceId, userId: session.user.id } },
  });
  if (!member) throw new Error('FORBIDDEN');
  return db.chainProof.findUnique({
    where: { workspaceId_optimizationJobId: { workspaceId: job.workspaceId, optimizationJobId } },
  });
}
