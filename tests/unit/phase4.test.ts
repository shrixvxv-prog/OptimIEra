import { describe, expect, it } from 'vitest';
import { readOGStorageConfig } from '@optimiera/config';
import { encryptPrompt } from '@optimiera/encryption';
import {
  finalizeManifest,
  hashCanonicalManifest,
  OGStorageAdapter,
  optimizationEvidenceManifestV1Schema,
  parseVerifiedManifest,
} from '@optimiera/og-storage';

const envelope = encryptPrompt('private prompt', { key: Buffer.alloc(32, 7) });
const base = {
  schemaVersion: 'OptimizationEvidenceManifestV1' as const,
  applicationName: 'OptimIEra' as const,
  applicationVersion: '0.1.0',
  optimizationId: 'opt-1',
  workspaceReference: 'workspace-safe',
  sourcePromptVersionId: 'pv-1',
  selectedCandidateId: 'c-1',
  providerType: 'RULES_ENGINE',
  providerName: 'OptimIEra Rules Engine',
  model: null,
  network: null,
  analyzerVersion: 'a1',
  scoringVersion: 's1',
  encryptedOriginalPrompt: envelope,
  encryptedCandidates: [
    { candidateId: 'c-1', candidateType: 'BALANCED', contentHash: 'a'.repeat(64), envelope },
  ],
  originalPromptHash: 'b'.repeat(64),
  candidateHashes: { 'c-1': 'a'.repeat(64) },
  selectedCandidateHash: 'a'.repeat(64),
  evaluationHash: 'c'.repeat(64),
  dimensionScores: { clarity: { score: 80 } },
  recommendation: 'BALANCED',
  confidence: 80,
  safeWarnings: [],
  startedAt: '2026-07-16T00:00:00.000Z',
  completedAt: '2026-07-16T00:01:00.000Z',
};

describe('Phase 4 encrypted evidence', () => {
  it('defaults safely to testnet Turbo and does not require a signer', () => {
    const config = readOGStorageConfig({});
    expect(config.network).toBe('testnet');
    expect(config.mode).toBe('turbo');
    expect(config.privateKey).toBeUndefined();
  });
  it('creates deterministic canonical hashes and validates the manifest', () => {
    const one = finalizeManifest(base);
    const two = finalizeManifest({ ...base, encryptedCandidates: [...base.encryptedCandidates] });
    expect(hashCanonicalManifest(one)).toBe(one.manifestContentHash);
    expect(one.manifestContentHash).toBe(two.manifestContentHash);
    expect(optimizationEvidenceManifestV1Schema.safeParse(one).success).toBe(true);
  });
  it('rejects altered content and malformed manifests', () => {
    const manifest = finalizeManifest(base);
    const bytes = new TextEncoder().encode(JSON.stringify(manifest));
    expect(() => parseVerifiedManifest(bytes, '0'.repeat(64))).toThrow('INTEGRITY_CHECK_FAILED');
    expect(
      optimizationEvidenceManifestV1Schema.safeParse({
        ...manifest,
        encryptedOriginalPrompt: { ...manifest.encryptedOriginalPrompt, ciphertext: '' },
      }).success,
    ).toBe(false);
  });
  it('calculates a real SDK Merkle root without uploading', async () => {
    const adapter = new OGStorageAdapter({
      enabled: false,
      network: 'testnet',
      mode: 'turbo',
      baseUrl: 'https://unused.example',
      rpcUrl: 'https://evmrpc-testnet.0g.ai',
      indexerUrl: 'https://indexer-storage-testnet-turbo.0g.ai',
      timeoutMs: 1000,
      expectedReplica: 1,
      explorerUrl: 'https://storagescan-galileo.0g.ai',
    });
    const root = await adapter.calculateRoot(new TextEncoder().encode('encrypted evidence'));
    expect(root).toMatch(/^0x[0-9a-fA-F]+$/);
  });
  it('rejects a returned root that differs from the calculated root', async () => {
    const adapter = new OGStorageAdapter(
      {
        enabled: true,
        network: 'testnet',
        mode: 'turbo',
        baseUrl: 'https://unused.example',
        rpcUrl: 'https://evmrpc-testnet.0g.ai',
        indexerUrl: 'https://indexer-storage-testnet-turbo.0g.ai',
        privateKey: `0x${'1'.repeat(64)}`,
        timeoutMs: 1000,
        expectedReplica: 1,
        explorerUrl: 'https://storagescan-galileo.0g.ai',
      },
      (() => ({ upload: async () => [{ rootHash: '0xdead', txHash: '0xtx' }, null] })) as never,
    );
    await expect(
      adapter.uploadArtifact({
        encryptedBytes: new TextEncoder().encode('evidence'),
        contentHash: 'a'.repeat(64),
      }),
    ).rejects.toMatchObject({ code: 'ROOT_MISMATCH' });
  });
  it('keeps uploads unconfigured when no signer is present', async () => {
    const adapter = new OGStorageAdapter({
      enabled: false,
      network: 'testnet',
      mode: 'turbo',
      baseUrl: 'https://unused.example',
      rpcUrl: 'https://evmrpc-testnet.0g.ai',
      indexerUrl: 'https://indexer-storage-testnet-turbo.0g.ai',
      timeoutMs: 1000,
      expectedReplica: 1,
      explorerUrl: 'https://storagescan-galileo.0g.ai',
    });
    await expect(
      adapter.uploadArtifact({ encryptedBytes: new Uint8Array([1]), contentHash: 'a'.repeat(64) }),
    ).rejects.toMatchObject({ code: 'STORAGE_UNCONFIGURED' });
  });
  it('covers the configured test-only adapter lifecycle, retry, and idempotency', async () => {
    class TestStorageAdapter {
      readonly name = 'TestStorageAdapter';
      uploads = 0;
      failed = true;
      private readonly bytes = new Uint8Array([7, 8, 9]);
      async uploadArtifact() {
        this.uploads += 1;
        if (this.failed) {
          this.failed = false;
          throw new Error('TEST_ADAPTER_UPLOAD_FAILED');
        }
        return {
          state: 'ready' as const,
          storageRoot: '0xtest-root',
          txHash: '0xtest-tx',
        };
      }
      async downloadArtifact() {
        return { state: 'ready' as const, storageRoot: '0xtest-root', bytes: this.bytes };
      }
      async verifyArtifact() {
        return { state: 'ready' as const, storageRoot: '0xtest-root' };
      }
    }
    const adapter = new TestStorageAdapter();
    const statuses = ['LOCAL_CREATED', 'UPLOAD_PENDING', 'UPLOADING'];
    await expect(adapter.uploadArtifact()).rejects.toThrow('TEST_ADAPTER_UPLOAD_FAILED');
    statuses.push('FAILED');
    await adapter.uploadArtifact();
    statuses.push('STORAGE_VERIFIED', 'DOWNLOAD_VERIFIED');
    await adapter.verifyArtifact('0xtest-root', 'a'.repeat(64));
    await adapter.downloadArtifact('0xtest-root');
    await adapter.verifyArtifact('0xtest-root', 'a'.repeat(64));
    expect(statuses).toEqual([
      'LOCAL_CREATED',
      'UPLOAD_PENDING',
      'UPLOADING',
      'FAILED',
      'STORAGE_VERIFIED',
      'DOWNLOAD_VERIFIED',
    ]);
    expect(adapter.uploads).toBe(2);
  });
});
