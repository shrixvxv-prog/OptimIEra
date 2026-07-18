import { readOGStorageConfig, type OGStorageConfig } from '@optimiera/config';
import { parseEnvelope, type EncryptionEnvelope } from '@optimiera/encryption';
import { Indexer, MemData } from '@0gfoundation/0g-storage-ts-sdk';
import { ethers } from 'ethers';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { AdapterState } from '@optimiera/og-compute';

export type ArtifactRequest = {
  encryptedBytes: Uint8Array;
  contentHash: string;
  timeoutMs?: number;
};
export type ArtifactResponse = {
  state: AdapterState;
  txHash?: string;
  storageRoot?: string;
  reason?: string;
};
export interface LegacyStorageAdapter {
  healthCheck(): Promise<AdapterState>;
  uploadArtifact(request: ArtifactRequest): Promise<ArtifactResponse>;
  downloadArtifact(storageRoot: string): Promise<ArtifactResponse>;
  verifyArtifact(storageRoot: string, contentHash: string): Promise<ArtifactResponse>;
  getTransaction(txHash: string): Promise<ArtifactResponse>;
  getStorageRoot(txHash: string): Promise<ArtifactResponse>;
}

export const encryptedEnvelopeSchema = z.object({
  version: z.literal(1),
  algorithm: z.literal('AES-256-GCM'),
  keyVersion: z.string().min(1),
  iv: z.string().min(1),
  ciphertext: z.string().min(1),
  authTag: z.string().min(1),
});
export const optimizationEvidenceManifestV1Schema = z.object({
  schemaVersion: z.literal('OptimizationEvidenceManifestV1'),
  applicationName: z.literal('OptimIEra'),
  applicationVersion: z.string().min(1),
  optimizationId: z.string().min(1),
  workspaceReference: z.string().min(1),
  sourcePromptVersionId: z.string().min(1).nullable(),
  selectedCandidateId: z.string().min(1).nullable(),
  providerType: z.string().min(1),
  providerName: z.string().min(1),
  providerTrace: z
    .object({
      requestId: z.string().min(1).optional(),
      responseId: z.string().min(1).optional(),
      model: z.string().min(1).optional(),
      provider: z.string().min(1).optional(),
      latencyMs: z.number().int().nonnegative(),
      retries: z.number().int().min(0).max(1),
      usage: z
        .object({
          promptTokens: z.number().int().nonnegative().optional(),
          completionTokens: z.number().int().nonnegative().optional(),
          totalTokens: z.number().int().nonnegative().optional(),
        })
        .optional(),
      cost: z.record(z.union([z.string(), z.number()])).optional(),
    })
    .nullable()
    .optional(),
  model: z.string().min(1).nullable(),
  network: z.string().min(1).nullable(),
  analyzerVersion: z.string().min(1).nullable(),
  scoringVersion: z.string().min(1).nullable(),
  encryptedOriginalPrompt: encryptedEnvelopeSchema,
  encryptedCandidates: z
    .array(
      z.object({
        candidateId: z.string().min(1),
        candidateType: z.string().min(1),
        contentHash: z.string().regex(/^[a-f0-9]{64}$/),
        envelope: encryptedEnvelopeSchema,
      }),
    )
    .min(1),
  originalPromptHash: z.string().regex(/^[a-f0-9]{64}$/),
  candidateHashes: z.record(z.string().regex(/^[a-f0-9]{64}$/)),
  selectedCandidateHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
  evaluationHash: z.string().regex(/^[a-f0-9]{64}$/),
  dimensionScores: z.record(z.unknown()),
  recommendation: z.string().min(1),
  confidence: z.number().min(0).max(100),
  safeWarnings: z.array(z.string()),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  manifestContentHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type OptimizationEvidenceManifestV1 = z.infer<typeof optimizationEvidenceManifestV1Schema>;

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortValue(item)]),
    );
  return value;
}
export function canonicalizeManifest(
  value:
    Omit<OptimizationEvidenceManifestV1, 'manifestContentHash'> | OptimizationEvidenceManifestV1,
) {
  const copy = { ...(value as Record<string, unknown>) };
  delete copy.manifestContentHash;
  return JSON.stringify(sortValue(copy));
}
export function hashCanonicalManifest(
  value:
    Omit<OptimizationEvidenceManifestV1, 'manifestContentHash'> | OptimizationEvidenceManifestV1,
) {
  return createHash('sha256').update(canonicalizeManifest(value), 'utf8').digest('hex');
}
export function finalizeManifest(
  value: Omit<OptimizationEvidenceManifestV1, 'manifestContentHash'>,
) {
  const manifest = { ...value, manifestContentHash: hashCanonicalManifest(value) };
  return optimizationEvidenceManifestV1Schema.parse(manifest);
}
export function parseVerifiedManifest(bytes: Uint8Array, expectedContentHash?: string) {
  const text = new TextDecoder().decode(bytes);
  const parsed = optimizationEvidenceManifestV1Schema.parse(JSON.parse(text));
  if (
    expectedContentHash &&
    createHash('sha256').update(text, 'utf8').digest('hex') !== expectedContentHash
  )
    throw new StorageError(
      'INTEGRITY_CHECK_FAILED',
      'INTEGRITY_CHECK_FAILED: downloaded artifact content did not match.',
    );
  // Phase 8 recovery must also read manifests produced by the pre-providerTrace
  // schema. Their byte-level content hash remains authenticated above, while
  // their older canonical hash was calculated before the current schema parse.
  // New manifests always use the canonical hash below; legacy manifests are
  // accepted only after the exact downloaded bytes match the stored artifact.
  if (hashCanonicalManifest(parsed) !== parsed.manifestContentHash && !expectedContentHash)
    throw new StorageError('INTEGRITY_CHECK_FAILED', 'Manifest content hash did not match.');
  parseEnvelope(JSON.stringify(parsed.encryptedOriginalPrompt));
  for (const item of parsed.encryptedCandidates) parseEnvelope(JSON.stringify(item.envelope));
  return parsed;
}

export type StorageErrorCode =
  | 'STORAGE_UNCONFIGURED'
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_INSUFFICIENT_BALANCE'
  | 'STORAGE_UPLOAD_FAILED'
  | 'STORAGE_DOWNLOAD_FAILED'
  | 'STORAGE_PROOF_FAILED'
  | 'ROOT_MISMATCH'
  | 'MANIFEST_INVALID'
  | 'INTEGRITY_CHECK_FAILED'
  | 'ILLEGAL_STATE_TRANSITION';
export class StorageError extends Error {
  constructor(
    public readonly code: StorageErrorCode,
    message: string,
  ) {
    super(message);
  }
}
export type StorageHealth = {
  state: 'DISABLED' | 'UNCONFIGURED' | 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
  network: string;
  mode: string;
  rpcHost: string;
  indexerHost: string;
  signerConfigured: boolean;
};
export type StorageUpload = {
  storageRoot: string;
  txHash: string;
  contentHash: string;
  byteSize: number;
};
export interface StorageAdapter {
  healthCheck(): Promise<StorageHealth>;
  calculateRoot(bytes: Uint8Array): Promise<string>;
  uploadArtifact(request: ArtifactRequest): Promise<ArtifactResponse & Partial<StorageUpload>>;
  downloadArtifact(storageRoot: string): Promise<ArtifactResponse & { bytes?: Uint8Array }>;
  verifyArtifact(storageRoot: string, contentHash: string): Promise<ArtifactResponse>;
  getUploadStatus(storageRoot: string): Promise<{ storageRoot: string; available: boolean }>;
}

export class OGStorageAdapter implements StorageAdapter {
  readonly name = '0G Storage';
  readonly version = 'og-storage-v1';
  constructor(
    private readonly config: OGStorageConfig = readOGStorageConfig(),
    private readonly indexerFactory: (url: string) => Indexer = (url) => new Indexer(url),
  ) {}
  private withTimeout<T>(promise: Promise<T>, timeoutMs = this.config.timeoutMs) {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new StorageError('STORAGE_UNAVAILABLE', '0G Storage request timed out.')),
          timeoutMs,
        ),
      ),
    ]);
  }
  async healthCheck(): Promise<StorageHealth> {
    const base = {
      network: this.config.network,
      mode: this.config.mode,
      rpcHost: new URL(this.config.rpcUrl).host,
      indexerHost: new URL(this.config.indexerUrl).host,
      signerConfigured: Boolean(this.config.privateKey),
    };
    if (!this.config.privateKey) return { ...base, state: 'UNCONFIGURED' };
    if (!this.config.enabled) return { ...base, state: 'DISABLED' };
    try {
      const provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      await this.withTimeout(provider.getBlockNumber());
      const response = await this.withTimeout(
        fetch(this.config.indexerUrl, { signal: AbortSignal.timeout(this.config.timeoutMs) }),
      );
      return { ...base, state: response.ok || response.status < 500 ? 'AVAILABLE' : 'DEGRADED' };
    } catch {
      return { ...base, state: 'UNAVAILABLE' };
    }
  }
  async calculateRoot(bytes: Uint8Array) {
    const file = new MemData(bytes);
    const [tree, error] = await file.merkleTree();
    if (error || !tree?.rootHash())
      throw new StorageError('STORAGE_UPLOAD_FAILED', 'Could not calculate storage Merkle root.');
    return tree.rootHash() as string;
  }
  async uploadArtifact(
    request: ArtifactRequest,
  ): Promise<ArtifactResponse & { contentHash?: string; byteSize?: number }> {
    if (!this.config.enabled || !this.config.privateKey)
      throw new StorageError('STORAGE_UNCONFIGURED', '0G Storage is unconfigured.');
    const file = new MemData(request.encryptedBytes);
    const calculatedRoot = await this.calculateRoot(request.encryptedBytes);
    const provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    const signer = new ethers.Wallet(this.config.privateKey, provider);
    const indexer = this.indexerFactory(this.config.indexerUrl);
    try {
      const [result, error] = await this.withTimeout(
        indexer.upload(file, this.config.rpcUrl, signer, {
          expectedReplica: this.config.expectedReplica,
          finalityRequired: true,
        }),
      );
      if (error) throw error;
      const uploadedRoot = 'rootHash' in result ? result.rootHash : result.rootHashes[0];
      const txHash = 'txHash' in result ? result.txHash : result.txHashes[0];
      if (uploadedRoot !== calculatedRoot)
        throw new StorageError(
          'ROOT_MISMATCH',
          'Returned storage root did not match the calculated root.',
        );
      return {
        state: 'ready',
        storageRoot: uploadedRoot,
        txHash,
        contentHash: request.contentHash,
        byteSize: request.encryptedBytes.byteLength,
      };
    } catch (error) {
      if (error instanceof StorageError) throw error;
      const message = String(error).toLowerCase();
      if (message.includes('balance') || message.includes('fund'))
        throw new StorageError(
          'STORAGE_INSUFFICIENT_BALANCE',
          'Storage signer balance is insufficient.',
        );
      throw new StorageError('STORAGE_UPLOAD_FAILED', '0G Storage upload failed.');
    }
  }
  async downloadArtifact(storageRoot: string): Promise<ArtifactResponse & { bytes?: Uint8Array }> {
    if (!this.config.enabled)
      throw new StorageError('STORAGE_UNCONFIGURED', '0G Storage is unconfigured.');
    try {
      const indexer = this.indexerFactory(this.config.indexerUrl);
      const [blob, error] = await this.withTimeout(
        indexer.downloadToBlob(storageRoot, { proof: true }),
      );
      if (error)
        throw new StorageError('STORAGE_PROOF_FAILED', 'Storage proof verification failed.');
      return { state: 'ready', storageRoot, bytes: new Uint8Array(await blob.arrayBuffer()) };
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('STORAGE_DOWNLOAD_FAILED', '0G Storage download failed.');
    }
  }
  async verifyArtifact(storageRoot: string, contentHash: string) {
    const downloaded = await this.downloadArtifact(storageRoot);
    if (!downloaded.bytes)
      throw new StorageError('STORAGE_DOWNLOAD_FAILED', 'Downloaded artifact was empty.');
    const actual = createHash('sha256').update(downloaded.bytes).digest('hex');
    if (actual !== contentHash)
      throw new StorageError(
        'INTEGRITY_CHECK_FAILED',
        'Downloaded artifact content hash did not match.',
      );
    parseVerifiedManifest(downloaded.bytes, contentHash);
    return { state: 'ready' as const, storageRoot };
  }
  async getUploadStatus(storageRoot: string) {
    if (!this.config.enabled)
      throw new StorageError('STORAGE_UNCONFIGURED', '0G Storage is unconfigured.');
    try {
      const locations = await this.withTimeout(
        this.indexerFactory(this.config.indexerUrl).getFileLocations(storageRoot),
      );
      return { storageRoot, available: locations.length > 0 };
    } catch {
      throw new StorageError('STORAGE_UNAVAILABLE', 'Storage status is unavailable.');
    }
  }
  async getTransaction(txHash: string) {
    return { state: 'ready' as const, txHash };
  }
  async getStorageRoot(txHash: string) {
    return { state: 'ready' as const, txHash };
  }
}
