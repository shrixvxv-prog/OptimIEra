import 'dotenv/config';
import { readOGStorageConfig } from '@optimiera/config';
import { encryptPrompt } from '@optimiera/encryption';
import { OGStorageAdapter, StorageError } from '@optimiera/og-storage';
import { ethers } from 'ethers';

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
      const bytes = new TextEncoder().encode(
        JSON.stringify(
          encryptPrompt(
            JSON.stringify({
              diagnostic: 'OptimIEra 0G Storage smoke',
              createdAt: new Date().toISOString(),
            }),
          ),
        ),
      );
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
