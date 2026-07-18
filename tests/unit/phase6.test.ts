import { describe, expect, it } from 'vitest';
import {
  calculateTrustLevel,
  canonicalCertificate,
  projectPublicCertificate,
  type OptimizationCertificateV1,
} from '../../apps/web/src/lib/certificate';

const base: Omit<OptimizationCertificateV1, 'certificateContentHash'> = {
  schemaVersion: 'OptimizationCertificateV1',
  certificateId: 'cert_public',
  publicSlug: 'optimiera-demo',
  optimizationId: 'internal-job',
  issuerRefHash: '0xissuer',
  sourcePromptVersionId: 'internal-source',
  selectedPromptVersionId: 'internal-selected',
  selectedCandidateId: 'internal-candidate',
  analyzerVersion: 'analyzer-v1',
  scoringVersion: 'score-v1',
  providerType: 'LOCAL',
  providerName: 'Rules Engine',
  model: null,
  originalPromptHash: 'hash-original',
  optimizedPromptHash: 'hash-optimized',
  evaluationHash: 'hash-evaluation',
  manifestHash: 'hash-manifest',
  storageRoot: null,
  storageTransactionHash: null,
  chainProofId: null,
  chainTransactionHash: null,
  contractAddress: null,
  chainId: null,
  network: 'local',
  aggregateScore: 90,
  confidence: 80,
  issuedAt: '2026-07-18T00:00:00.000Z',
  expiresAt: null,
  revokedAt: null,
  verificationLevel: 'LOCAL_VERIFIED',
};

describe('Phase 6 certificates', () => {
  it('canonicalizes deterministically and classifies trust levels honestly', () => {
    expect(canonicalCertificate(base)).toBe(canonicalCertificate({ ...base }));
    expect(
      calculateTrustLevel({ storageVerified: false, chainVerified: false, testAdapter: false }),
    ).toBe('LOCAL_VERIFIED');
    expect(
      calculateTrustLevel({ storageVerified: true, chainVerified: false, testAdapter: false }),
    ).toBe('STORAGE_VERIFIED');
    expect(
      calculateTrustLevel({ storageVerified: false, chainVerified: true, testAdapter: false }),
    ).toBe('CHAIN_VERIFIED');
    expect(
      calculateTrustLevel({ storageVerified: true, chainVerified: true, testAdapter: false }),
    ).toBe('FULLY_VERIFIED');
    expect(
      calculateTrustLevel({ storageVerified: true, chainVerified: true, testAdapter: true }),
    ).toBe('TEST_VERIFIED');
  });
  it('projects only public-safe certificate fields', () => {
    const projected = projectPublicCertificate({ ...base, certificateContentHash: 'content-hash' });
    expect(projected).not.toHaveProperty('optimizationId');
    expect(projected).not.toHaveProperty('sourcePromptVersionId');
    expect(projected).not.toHaveProperty('selectedCandidateId');
    expect(JSON.stringify(projected)).not.toContain('internal-');
  });
  it('makes revocation and mismatch terminal trust outcomes', () => {
    expect(
      calculateTrustLevel({
        storageVerified: true,
        chainVerified: true,
        testAdapter: false,
        revoked: true,
      }),
    ).toBe('REVOKED');
    expect(
      calculateTrustLevel({
        storageVerified: true,
        chainVerified: true,
        testAdapter: false,
        failed: true,
      }),
    ).toBe('FAILED');
  });
});
