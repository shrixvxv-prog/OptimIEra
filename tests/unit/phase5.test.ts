import { describe, expect, it } from 'vitest';
import { readOGChainConfig } from '@optimiera/config';
import {
  buildProofCommitment,
  createProofId,
  hashOwnerReference,
  OGChainAdapter,
  TestChainAdapter,
} from '@optimiera/og-chain';

const input = {
  optimizationId: `0x${'1'.repeat(64)}` as `0x${string}`,
  manifestHash: `0x${'2'.repeat(64)}` as `0x${string}`,
  storageRoot: `0x${'0'.repeat(64)}` as `0x${string}`,
  originalPromptHash: `0x${'3'.repeat(64)}` as `0x${string}`,
  optimizedPromptHash: `0x${'4'.repeat(64)}` as `0x${string}`,
  evaluationHash: `0x${'5'.repeat(64)}` as `0x${string}`,
  ownerRefHash: hashOwnerReference('workspace-internal', 'user-internal'),
  aggregateScore: 88,
  evidenceMode: 'LOCAL_ENCRYPTED' as const,
  applicationVersion: '0.1.0',
};

describe('Phase 5 hash-only chain proof', () => {
  it('validates Galileo defaults and rejects network/chain mismatches', () => {
    expect(readOGChainConfig({}).chainId).toBe(16602);
    expect(() =>
      readOGChainConfig({ OG_CHAIN_NETWORK: 'testnet', OG_CHAIN_CHAIN_ID: '1' }),
    ).toThrow('OG_CHAIN_CHAIN_ID_NETWORK_MISMATCH');
  });
  it('creates deterministic commitments and proof IDs', () => {
    const one = buildProofCommitment(input);
    const two = buildProofCommitment({ ...input });
    expect(createProofId(one)).toBe(createProofId(two));
    expect(one.ownerRefHash).not.toContain('workspace-internal');
    expect(one.optimizationId).toBe(input.optimizationId);
  });
  it('reports chain honestly without registry or signer configuration', async () => {
    const adapter = new OGChainAdapter(readOGChainConfig({}));
    const health = await adapter.healthCheck();
    expect(health.state).toBe('UNCONFIGURED');
    expect(health.signerConfigured).toBe(false);
    await expect(adapter.registerProof(input)).rejects.toMatchObject({
      code: 'SIGNER_UNCONFIGURED',
    });
  });
  it('covers the test-only adapter submit, receipt, readback, and revoke lifecycle', async () => {
    const adapter = new TestChainAdapter();
    const submitted = await adapter.registerProof(input);
    expect(submitted.proofId).toBe(createProofId(input));
    await expect(adapter.registerProof(input)).rejects.toThrow('PROOF_ALREADY_REGISTERED');
    await adapter.waitForReceipt(submitted.txHash);
    expect(await adapter.verifyProof(submitted.proofId, input)).toBe(true);
    expect(await adapter.getProof(submitted.proofId)).toEqual(input);
    await adapter.revokeProof(submitted.proofId, `0x${'b'.repeat(64)}`);
    await expect(adapter.getProof(submitted.proofId)).rejects.toThrow('PROOF_NOT_FOUND');
  });
  it('resumes after one deterministic receipt timeout without resubmitting', async () => {
    const adapter = new TestChainAdapter({ timeoutOnce: true });
    const submitted = await adapter.registerProof(input);
    await expect(adapter.waitForReceipt(submitted.txHash)).rejects.toThrow('RECEIPT_TIMEOUT');
    const receipt = await adapter.waitForReceipt(submitted.txHash);
    expect(receipt.status).toBe('success');
    expect((await adapter.getTransactionReceipt(submitted.txHash)).status).toBe('success');
  });
});
