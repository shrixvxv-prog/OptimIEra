import { createHash } from 'node:crypto';
import { db } from '@optimiera/database';
import { canonicalCertificate } from '../apps/web/src/lib/certificate';
import { OGChainAdapter } from '@optimiera/og-chain';
import { OGStorageAdapter, parseVerifiedManifest } from '@optimiera/og-storage';
import { readOGChainConfig, readOGStorageConfig } from '@optimiera/config';

const LIVE_EVIDENCE = {
  network: 'testnet',
  chainId: 16602,
  model: 'qwen2.5-omni',
  computeRequestId: 'cdb34928-eb85-9ef7-bdab-6eb68a38f0ae',
  computeResponseId: 'chatcmpl-95ae7584-5d2e-4d67-bdac-8bdce44c3574',
  latencyMs: 2478,
  storageRoot: '0x05ed3344b48d8ed4b1135ce4d7c8c281af38d17bb431c9a24f523d48180d7519',
  storageTransactionHash: '0x5a46149095145897f9a2e6df3cd60dff479f642081f9ed013dda37bb071bf850',
  manifestHash: '8d72ff61af909ad269706e45b801c657b020efae816e888285444cb178291d49',
  byteSize: 5557,
  registryAddress: '0xda91a3929107c74f27e2d3288d046e4a37f9b422',
  proofId: '0x4d57bf123b8647e0eaa856551e69cb6191ae63baabfdfedcb089011218591724',
  proofTransactionHash: '0x2b184562ae611fe11e79906d723cfa726ffd52a0edfde657ed9078ade095643b',
  blockNumber: 44693862,
  certificateId: 'cert_1343d8825f8905d881361fa39d7e2a1e',
  certificateSlug: 'cert_1343d8825f8905d881361fa39d7e2a1e',
} as const;

const confirmation = process.argv.includes('--confirm-production');
const ownerEmail = process.argv.find((value) => value.startsWith('--owner-email='))?.slice(14);
const sha = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const hex = (value: string) => `0x${value.replace(/^0x/, '')}`;

function assertProductionTarget() {
  const url = process.env.DATABASE_URL ?? '';
  if (process.env.NODE_ENV !== 'production' || !url || /localhost|127\.0\.0\.1/i.test(url))
    throw new Error('RESTORE_REQUIRES_PRODUCTION_DATABASE');
}

async function verifiedManifest() {
  const storage = new OGStorageAdapter(
    readOGStorageConfig({
      ...process.env,
      OG_STORAGE_ENABLED: 'true',
      OG_STORAGE_NETWORK: 'testnet',
    }),
  );
  const downloaded = await storage.downloadArtifact(LIVE_EVIDENCE.storageRoot);
  if (!downloaded.bytes || downloaded.bytes.byteLength !== LIVE_EVIDENCE.byteSize)
    throw new Error('LIVE_EVIDENCE_STORAGE_BYTES_MISMATCH');
  return parseVerifiedManifest(downloaded.bytes, LIVE_EVIDENCE.manifestHash);
}

async function verifiedChain(manifest: Awaited<ReturnType<typeof verifiedManifest>>) {
  const chain = new OGChainAdapter(
    readOGChainConfig({
      ...process.env,
      OG_CHAIN_ENABLED: 'true',
      OG_CHAIN_NETWORK: 'testnet',
      OPTIMIERA_REGISTRY_ADDRESS: LIVE_EVIDENCE.registryAddress,
      OPTIMIERA_CHAIN_PRIVATE_KEY: '',
    }),
  );
  const receipt = await chain.getTransactionReceipt(
    LIVE_EVIDENCE.proofTransactionHash as `0x${string}`,
  );
  const proof = (await chain.getProof(
    LIVE_EVIDENCE.proofId as `0x${string}`,
  )) as readonly unknown[];
  if (String(proof[1]).toLowerCase() !== hex(LIVE_EVIDENCE.manifestHash).toLowerCase())
    throw new Error('LIVE_EVIDENCE_CHAIN_MANIFEST_MISMATCH');
  if (String(proof[2]).toLowerCase() !== LIVE_EVIDENCE.storageRoot.toLowerCase())
    throw new Error('LIVE_EVIDENCE_CHAIN_STORAGE_MISMATCH');
  if (Number((receipt as { blockNumber?: bigint }).blockNumber) !== LIVE_EVIDENCE.blockNumber)
    throw new Error('LIVE_EVIDENCE_CHAIN_BLOCK_MISMATCH');
  return { proof, receipt };
}

async function restore(
  ownerId: string,
  manifest: Awaited<ReturnType<typeof verifiedManifest>>,
  proof: readonly unknown[],
) {
  const workspace = await db.organization.upsert({
    where: { slug: 'live-galileo-evidence' },
    update: { name: 'OptimIEra Live Galileo Evidence' },
    create: {
      id: 'live_galileo_evidence',
      name: 'OptimIEra Live Galileo Evidence',
      slug: 'live-galileo-evidence',
    },
  });
  await db.member.upsert({
    where: { organizationId_userId: { organizationId: workspace.id, userId: ownerId } },
    update: { role: 'OWNER' },
    create: {
      id: `member_${workspace.id}_${ownerId}`,
      organizationId: workspace.id,
      userId: ownerId,
      role: 'OWNER',
    },
  });
  const project = await db.project.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: 'galileo-live-evidence' } },
    update: {},
    create: {
      workspaceId: workspace.id,
      slug: 'galileo-live-evidence',
      name: 'Galileo Live Evidence',
      createdById: ownerId,
    },
  });
  const prompt = await db.prompt.upsert({
    where: { id: 'live_galileo_prompt' },
    update: {},
    create: {
      id: 'live_galileo_prompt',
      workspaceId: workspace.id,
      projectId: project.id,
      title: 'Live Galileo evidence',
      createdById: ownerId,
    },
  });
  const source = await db.promptVersion.upsert({
    where: { promptId_versionNumber: { promptId: prompt.id, versionNumber: 1 } },
    update: {},
    create: {
      id: manifest.sourcePromptVersionId,
      promptId: prompt.id,
      workspaceId: workspace.id,
      versionNumber: 1,
      encryptedContent: JSON.stringify(manifest.encryptedOriginalPrompt),
      contentHash: manifest.originalPromptHash,
      encryptionStatus: 'ENCRYPTED',
      lifecycleStatus: 'APPROVED',
      createdById: ownerId,
    },
  });
  const candidateData =
    manifest.encryptedCandidates.find(
      (item) => item.candidateId === manifest.selectedCandidateId,
    ) ?? manifest.encryptedCandidates[0];
  if (!candidateData) throw new Error('LIVE_EVIDENCE_SELECTED_CANDIDATE_MISSING');
  const selected = await db.promptVersion.upsert({
    where: { promptId_versionNumber: { promptId: prompt.id, versionNumber: 2 } },
    update: {},
    create: {
      id: 'live_galileo_selected_version',
      promptId: prompt.id,
      workspaceId: workspace.id,
      versionNumber: 2,
      encryptedContent: JSON.stringify(candidateData.envelope),
      contentHash: candidateData.contentHash,
      encryptionStatus: 'ENCRYPTED',
      lifecycleStatus: 'APPROVED',
      createdById: ownerId,
    },
  });
  await db.prompt.update({
    where: { id: prompt.id },
    data: { activeVersionId: selected.id, lifecycleStatus: 'ACTIVE' },
  });
  const job = await db.optimizationJob.upsert({
    where: {
      workspaceId_idempotencyKey: {
        workspaceId: workspace.id,
        idempotencyKey: 'live-galileo-evidence-v1',
      },
    },
    update: {},
    create: {
      id: manifest.optimizationId,
      workspaceId: workspace.id,
      projectId: project.id,
      promptId: prompt.id,
      sourcePromptVersionId: source.id,
      requestedById: ownerId,
      createdById: ownerId,
      mode: 'LIVE_EVIDENCE_RESTORE',
      status: 'SUCCEEDED',
      providerType: 'OG_COMPUTE',
      providerName: '0G Compute Router',
      analyzerVersion: manifest.analyzerVersion,
      scoringVersion: manifest.scoringVersion,
      requestMetadata: JSON.stringify({
        providerTrace: {
          requestId: LIVE_EVIDENCE.computeRequestId,
          responseId: LIVE_EVIDENCE.computeResponseId,
          model: LIVE_EVIDENCE.model,
          latencyMs: LIVE_EVIDENCE.latencyMs,
          restored: true,
        },
      }),
      idempotencyKey: 'live-galileo-evidence-v1',
      startedAt: new Date(manifest.startedAt),
      completedAt: new Date(manifest.completedAt),
      savedPromptVersionId: selected.id,
    },
  });
  const score = Number(proof[7] ?? 0);
  const candidate = await db.candidate.upsert({
    where: { id: candidateData.candidateId },
    update: { savedPromptVersionId: selected.id, recommended: true, selected: true },
    create: {
      id: candidateData.candidateId,
      workspaceId: workspace.id,
      optimizationJobId: job.id,
      candidateType: candidateData.candidateType,
      encryptedContent: JSON.stringify(candidateData.envelope),
      contentHash: candidateData.contentHash,
      changeSummary: 'Restored verified Galileo candidate.',
      scoreData: JSON.stringify({ weightedTotal: score }),
      providerType: 'OG_COMPUTE',
      providerName: '0G Compute Router',
      tokenEstimate: 0,
      rank: 1,
      recommended: true,
      selected: true,
      savedPromptVersionId: selected.id,
      generationVersion: 'live-restored-v1',
    },
  });
  await db.optimizationJob.update({
    where: { id: job.id },
    data: {
      recommendedCandidateId: candidate.id,
      savedCandidateId: candidate.id,
      recommendedScore: score,
    },
  });
  const artifact = await db.artifact.upsert({
    where: {
      workspaceId_optimizationJobId_kind: {
        workspaceId: workspace.id,
        optimizationJobId: job.id,
        kind: 'OPTIMIZATION_EVIDENCE',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      optimizationJobId: job.id,
      kind: 'OPTIMIZATION_EVIDENCE',
      status: 'DOWNLOAD_VERIFIED',
      schemaVersion: manifest.schemaVersion,
      storageProvider: '0G_STORAGE',
      network: 'testnet',
      storageMode: 'turbo',
      rootHash: LIVE_EVIDENCE.storageRoot,
      transactionHash: LIVE_EVIDENCE.storageTransactionHash,
      contentHash: LIVE_EVIDENCE.manifestHash,
      byteSize: LIVE_EVIDENCE.byteSize,
      uploadStatus: 'STORAGE_VERIFIED',
      proofVerificationStatus: 'VERIFIED',
      encryptedManifest: JSON.stringify(manifest),
      uploadedAt: new Date(),
      verifiedAt: new Date(),
    },
  });
  const chainProof = await db.chainProof.upsert({
    where: {
      workspaceId_optimizationJobId: { workspaceId: workspace.id, optimizationJobId: job.id },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      optimizationJobId: job.id,
      artifactId: artifact.id,
      proofId: LIVE_EVIDENCE.proofId,
      contractAddress: LIVE_EVIDENCE.registryAddress,
      chainId: LIVE_EVIDENCE.chainId,
      network: 'testnet',
      manifestHash: hex(LIVE_EVIDENCE.manifestHash),
      storageRoot: LIVE_EVIDENCE.storageRoot,
      transactionHash: LIVE_EVIDENCE.proofTransactionHash,
      blockNumber: BigInt(LIVE_EVIDENCE.blockNumber),
      aggregateScore: score,
      status: 'VERIFIED',
      confirmationCount: 1,
      submittedAt: new Date(),
      confirmedAt: new Date(),
      verifiedAt: new Date(),
    },
  });
  const base = {
    schemaVersion: 'OptimizationCertificateV1' as const,
    certificateId: LIVE_EVIDENCE.certificateId,
    publicSlug: LIVE_EVIDENCE.certificateSlug,
    optimizationId: job.id,
    issuerRefHash: `0x${sha(`OptimIEra:issuer:V1:${workspace.id}`)}`,
    sourcePromptVersionId: source.id,
    selectedPromptVersionId: selected.id,
    selectedCandidateId: candidate.id,
    analyzerVersion: job.analyzerVersion,
    scoringVersion: job.scoringVersion,
    providerType: job.providerType,
    providerName: job.providerName,
    model: LIVE_EVIDENCE.model,
    originalPromptHash: source.contentHash,
    optimizedPromptHash: candidate.contentHash,
    evaluationHash: manifest.evaluationHash,
    manifestHash: LIVE_EVIDENCE.manifestHash,
    storageRoot: LIVE_EVIDENCE.storageRoot,
    storageTransactionHash: LIVE_EVIDENCE.storageTransactionHash,
    chainProofId: LIVE_EVIDENCE.proofId,
    chainTransactionHash: LIVE_EVIDENCE.proofTransactionHash,
    contractAddress: LIVE_EVIDENCE.registryAddress,
    chainId: LIVE_EVIDENCE.chainId,
    network: 'testnet',
    aggregateScore: score,
    confidence: manifest.confidence,
    issuedAt: new Date().toISOString(),
    expiresAt: null,
    revokedAt: null,
    verificationLevel: 'FULLY_VERIFIED' as const,
  };
  await db.certificate.upsert({
    where: { publicSlug: LIVE_EVIDENCE.certificateSlug },
    update: {},
    create: {
      workspaceId: workspace.id,
      optimizationJobId: job.id,
      sourcePromptVersionId: source.id,
      selectedPromptVersionId: selected.id,
      candidateId: candidate.id,
      status: 'VERIFIED',
      artifactId: artifact.id,
      chainProofId: chainProof.id,
      certificateId: base.certificateId,
      publicSlug: base.publicSlug,
      schemaVersion: base.schemaVersion,
      contentHash: base.manifestHash,
      certificateContentHash: sha(canonicalCertificate(base)),
      verificationLevel: base.verificationLevel,
      aggregateScore: base.aggregateScore,
      confidence: base.confidence,
      issuerRefHash: base.issuerRefHash,
      providerType: base.providerType,
      providerName: base.providerName,
      model: base.model,
      analyzerVersion: base.analyzerVersion,
      scoringVersion: base.scoringVersion,
      originalPromptHash: base.originalPromptHash,
      optimizedPromptHash: base.optimizedPromptHash,
      evaluationHash: base.evaluationHash,
      manifestHash: base.manifestHash,
      storageRoot: base.storageRoot,
      storageTransactionHash: base.storageTransactionHash,
      chainProofPublicId: base.chainProofId,
      chainTransactionHash: base.chainTransactionHash,
      contractAddress: base.contractAddress,
      chainId: base.chainId,
      network: base.network,
      issuedAt: new Date(base.issuedAt),
    },
  });
}

async function main() {
  assertProductionTarget();
  if (!ownerEmail) throw new Error('RESTORE_OWNER_EMAIL_REQUIRED');
  const owner = await db.user.findUnique({ where: { email: ownerEmail } });
  if (!owner) throw new Error('RESTORE_OWNER_NOT_FOUND');
  const manifest = await verifiedManifest();
  const { proof } = await verifiedChain(manifest);
  if (!confirmation) {
    console.log(
      JSON.stringify({
        status: 'DRY_RUN_VERIFIED',
        storage: LIVE_EVIDENCE.storageRoot,
        proof: LIVE_EVIDENCE.proofId,
      }),
    );
    return;
  }
  await restore(owner.id, manifest, proof);
  console.log(JSON.stringify({ status: 'RESTORED', certificate: LIVE_EVIDENCE.certificateSlug }));
}

main().finally(async () => db.$disconnect());
