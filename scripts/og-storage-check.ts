import 'dotenv/config';
import { readOGStorageConfig } from '@optimiera/config';
import { encryptPrompt } from '@optimiera/encryption';
import { finalizeManifest, OGStorageAdapter, StorageError } from '@optimiera/og-storage';
import { ethers } from 'ethers';
import { createHash } from 'node:crypto';

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

async function main() {
  const smoke = process.argv.includes('--upload-smoke');
  const config = readOGStorageConfig();
  const result: Record<string, unknown> = {
    enabled: config.enabled,
    network: config.network,
    mode: config.mode,
    rpcHost: new URL(config.rpcUrl).host,
    indexerHost: new URL(config.indexerUrl).host,
    signerConfigured: Boolean(config.privateKey),
    sdkReadiness: 'available',
    uploadSmoke: smoke ? 'not attempted' : 'skipped',
  };
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    await provider.getBlockNumber();
    result.rpcReachability = 'reachable';
    const indexer = await fetch(config.indexerUrl, {
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    result.indexerReachability = indexer.status < 500 ? 'reachable' : 'unavailable';
    if (config.privateKey)
      result.signerBalance = ethers.formatEther(
        await provider.getBalance(new ethers.Wallet(config.privateKey).address),
      );
    if (smoke) {
      if (!config.enabled || !config.privateKey)
        throw new StorageError(
          'STORAGE_UNCONFIGURED',
          'Smoke upload requires enabled storage and a signer.',
        );
      const adapter = new OGStorageAdapter(config);
      const startedAt = new Date();
      const originalPrompt = 'OptimIEra Galileo storage diagnostic prompt.';
      const candidatePrompt = 'Create a concise Galileo storage diagnostic.';
      const originalPromptHash = sha256(originalPrompt);
      const candidateHash = sha256(candidatePrompt);
      const manifest = finalizeManifest({
        schemaVersion: 'OptimizationEvidenceManifestV1',
        applicationName: 'OptimIEra',
        applicationVersion: '0.1.0',
        optimizationId: `storage-smoke-${startedAt.toISOString()}`,
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
        evaluationHash: sha256('OptimIEra Galileo storage diagnostic evaluation'),
        dimensionScores: { clarity: { score: 100 } },
        recommendation: 'BALANCED',
        confidence: 100,
        safeWarnings: [],
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
      });
      const bytes = new TextEncoder().encode(JSON.stringify(manifest));
      const contentHash = ethers.sha256(bytes);
      const upload = await adapter.uploadArtifact({ encryptedBytes: bytes, contentHash });
      await adapter.verifyArtifact(upload.storageRoot as string, contentHash);
      result.uploadSmoke = {
        status: 'LIVE_VERIFIED',
        rootHash: upload.storageRoot,
        transactionHash: upload.txHash,
      };
    }
  } catch (error) {
    result.rpcReachability ??= 'unavailable';
    result.indexerReachability ??= 'unavailable';
    result.uploadSmoke = error instanceof StorageError ? error.code : 'FAILED';
  }
  console.log(JSON.stringify(result, null, 2));
}
void main();
