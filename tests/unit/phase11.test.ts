import { describe, expect, it } from 'vitest';
import { readOGExecutionMode } from '@optimiera/config';
import { calculateTrustLevel } from '../../apps/web/src/lib/certificate';
import {
  assertVerificationTransition,
  deriveVerifiedPromptAssetState,
} from '../../apps/web/src/lib/verification-service';

describe('Phase 2 Galileo activation gates', () => {
  it('never classifies a test adapter as Galileo live', () => {
    expect(
      readOGExecutionMode({
        OG_CHAIN_TEST_ADAPTER: 'true',
        OG_COMPUTE_ENABLED: 'true',
        OG_STORAGE_ENABLED: 'true',
        OG_CHAIN_ENABLED: 'true',
        OG_COMPUTE_NETWORK: 'testnet',
        OG_STORAGE_NETWORK: 'testnet',
        OG_CHAIN_NETWORK: 'testnet',
      }),
    ).toBe('LOCAL');
  });

  it('classifies an explicitly enabled all-testnet profile as Galileo live', () => {
    expect(
      readOGExecutionMode({
        OG_COMPUTE_ENABLED: 'true',
        OG_STORAGE_ENABLED: 'true',
        OG_CHAIN_ENABLED: 'true',
        OG_COMPUTE_NETWORK: 'testnet',
        OG_STORAGE_NETWORK: 'testnet',
        OG_CHAIN_NETWORK: 'testnet',
      }),
    ).toBe('GALILEO_LIVE');
  });

  it('does not issue full trust without required Compute evidence', () => {
    expect(
      calculateTrustLevel({
        storageVerified: true,
        chainVerified: true,
        testAdapter: false,
        computeVerified: false,
      }),
    ).toBe('STORAGE_VERIFIED');
  });

  it('enforces the canonical verified asset state machine', () => {
    expect(assertVerificationTransition('EVIDENCE_CREATED', 'STORAGE_VERIFIED')).toBe(
      'STORAGE_VERIFIED',
    );
    expect(() => assertVerificationTransition('CHAIN_CONFIRMED', 'VERIFIED')).not.toThrow();
    expect(() => assertVerificationTransition('DRAFT', 'VERIFIED')).toThrow(
      'ILLEGAL_VERIFICATION_TRANSITION:DRAFT:VERIFIED',
    );
    expect(() => assertVerificationTransition('REVOKED', 'VERIFIED')).toThrow();
  });

  it('derives a chain-confirmed asset only after real storage and chain confirmation', () => {
    const base = {
      job: {
        id: 'job',
        workspaceId: 'workspace',
        requestedById: 'owner',
        status: 'SUCCEEDED',
        savedCandidateId: 'candidate',
        savedPromptVersionId: 'version',
        providerType: 'RULES_ENGINE',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        evaluationRuns: [{ evaluationVersion: 'eval-v1' }],
      },
      promptVersion: { id: 'version', contentHash: 'a'.repeat(64) },
    } as const;
    expect(deriveVerifiedPromptAssetState(base)).toBe('VERSIONED');
    expect(
      deriveVerifiedPromptAssetState({
        ...base,
        artifact: {
          id: 'artifact',
          status: 'DOWNLOAD_VERIFIED',
          storageProvider: '0G_STORAGE',
          network: 'GALILEO_LIVE',
          rootHash: 'b'.repeat(64),
          storageReference: null,
          contentHash: 'c'.repeat(64),
        },
        proof: {
          proofId: 'proof',
          status: 'VERIFIED',
          network: 'GALILEO_LIVE',
          chainId: 16602,
          transactionHash: '0xtx',
          contractAddress: '0xcontract',
        },
      }),
    ).toBe('CHAIN_CONFIRMED');
  });
});
