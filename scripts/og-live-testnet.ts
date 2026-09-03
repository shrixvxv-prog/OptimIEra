import 'dotenv/config';

import { createHash, randomUUID } from 'node:crypto';
import { readOGChainConfig, readOGStorageConfig } from '@optimiera/config';
import { encryptPrompt, serializeEnvelope } from '@optimiera/encryption';
import {
  finalizeManifest,
  OGStorageAdapter,
  verifyEncryptedManifestBytes,
} from '@optimiera/og-storage';
import {
  buildProofCommitment,
  hashOwnerReference,
  OGChainAdapter,
  type ProofCommitment,
} from '@optimiera/og-chain';
import { keccak256, type Hex } from 'viem';

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function bytes32(value: string): Hex {
  return `0x${value.replace(/^0x/, '')}` as Hex;
}

async function main() {
  const storageConfig = readOGStorageConfig();
  const chainConfig = readOGChainConfig();
  if (
    storageConfig.network !== 'testnet' ||
    chainConfig.network !== 'testnet' ||
    chainConfig.chainId !== 16602
  ) {
    throw new Error('GALILEO_TESTNET_ONLY');
  }
  if (!storageConfig.enabled || !storageConfig.privateKey)
    throw new Error('STORAGE_SIGNER_UNCONFIGURED');
  if (!chainConfig.enabled || !chainConfig.privateKey || !chainConfig.registryAddress)
    throw new Error('CHAIN_SIGNER_OR_REGISTRY_UNCONFIGURED');

  const runId = randomUUID();
  const startedAt = new Date();
  const originalPrompt = 'OptimIEra Galileo proof integration diagnostic.';
  const candidatePrompt = 'Write a concise proof integration diagnostic.';
  const originalPromptHash = sha256(originalPrompt);
  const candidateHash = sha256(candidatePrompt);
  const manifest = finalizeManifest({
    schemaVersion: 'OptimizationEvidenceManifestV1',
    applicationName: 'OptimIEra',
    applicationVersion: '0.1.0',
    optimizationId: `live-galileo-${runId}`,
    workspaceReference: 'live-galileo-diagnostic',
    sourcePromptVersionId: null,
    selectedCandidateId: 'candidate-1',
    providerType: 'RULES_ENGINE',
    providerName: 'OptimIEra Rules Engine',
    providerTrace: null,
    model: null,
    network: 'testnet',
    analyzerVersion: 'diagnostic',
    scoringVersion: 'diagnostic',
    encryptedOriginalPrompt: encryptPrompt(originalPrompt),
    encryptedCandidates: [
      {
        candidateId: 'candidate-1',
        candidateType: 'BALANCED',
        contentHash: candidateHash,
        envelope: encryptPrompt(candidatePrompt),
      },
    ],
    originalPromptHash,
    candidateHashes: { 'candidate-1': candidateHash },
    selectedCandidateHash: candidateHash,
    evaluationHash: sha256(`live-galileo-evaluation-${runId}`),
    dimensionScores: { clarity: { score: 100 } },
    recommendation: 'BALANCED',
    confidence: 100,
    safeWarnings: [],
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
  });
  const encryptedManifest = serializeEnvelope(encryptPrompt(JSON.stringify(manifest)));
  const bytes = new TextEncoder().encode(encryptedManifest);
  const contentHash = sha256(encryptedManifest);
  const storage = new OGStorageAdapter(storageConfig);
  const uploaded = await storage.uploadArtifact({
    encryptedBytes: bytes,
    contentHash,
  });
  const verifiedStorage = await storage.verifyArtifact(uploaded.storageRoot!, contentHash);
  const downloaded = await storage.downloadArtifact(uploaded.storageRoot!);
  verifyEncryptedManifestBytes(downloaded.bytes!, contentHash);

  const commitment = buildProofCommitment({
    optimizationId: keccak256(new TextEncoder().encode(`OptimIEra:live:${runId}`)),
    manifestHash: bytes32(contentHash),
    storageRoot: bytes32(uploaded.storageRoot!),
    originalPromptHash: bytes32(originalPromptHash),
    optimizedPromptHash: bytes32(candidateHash),
    evaluationHash: bytes32(manifest.evaluationHash),
    ownerRefHash: hashOwnerReference('live-galileo-diagnostic', runId),
    aggregateScore: 100,
    evidenceMode: 'OG_STORAGE',
    applicationVersion: '0.1.0',
  }) as unknown as ProofCommitment;
  const chain = new OGChainAdapter(chainConfig);
  const health = await chain.healthCheck();
  if (health.state !== 'AVAILABLE') throw new Error(`CHAIN_${health.state}`);
  const submitted = await chain.registerProof(commitment);
  const receipt = await chain.waitForReceipt(submitted.txHash);
  if ('status' in (receipt as object) && receipt.status !== 'success')
    throw new Error('TRANSACTION_REVERTED');
  await chain.verifyProof(submitted.proofId, commitment);

  console.log(
    JSON.stringify(
      {
        schemaVersion: 'OGLiveGalileoEvidenceV1',
        status: 'LIVE_VERIFIED',
        network: 'testnet',
        chainId: chainConfig.chainId,
        storage: {
          status: 'LIVE_VERIFIED',
          rootHash: verifiedStorage.storageRoot,
          transactionHash: uploaded.txHash,
          contentHash,
          byteSize: bytes.byteLength,
          readback: 'MATCHED_AND_PROOF_VERIFIED',
        },
        chain: {
          status: 'LIVE_VERIFIED',
          proofId: submitted.proofId,
          transactionHash: submitted.txHash,
          contractAddress: submitted.contractAddress ?? chainConfig.registryAddress,
          registrar: submitted.registrar,
          blockNumber: 'blockNumber' in (receipt as object) ? String(receipt.blockNumber) : null,
          receiptStatus: 'status' in (receipt as object) ? String(receipt.status) : null,
          readback: 'MATCHED_AND_VERIFIED',
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : '0G Galileo live integration failed.');
  process.exit(1);
});
