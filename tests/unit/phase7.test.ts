import { describe, expect, it } from 'vitest';
import { buildPreflight } from '../../scripts/og-live-check';
import {
  activationGate,
  componentStatus,
  hasSecretLeak,
  liveEvidenceStatus,
  networkGate,
  redactedCredentialSummary,
} from '../../scripts/og-live-utils';

describe('Phase 7 live activation controls', () => {
  it('reports absent credentials as UNCONFIGURED without live calls', () => {
    const result = buildPreflight({});
    expect(result.overall).toBe('UNCONFIGURED');
    expect(result.liveCallsMade).toBe(false);
    expect(result.components.compute.status).toBe('UNCONFIGURED');
    expect(result.components.storage.status).toBe('UNCONFIGURED');
    expect(result.components.chain.status).toBe('UNCONFIGURED');
  });
  it('blocks mainnet and non-Galileo chain IDs', () => {
    expect(networkGate({ network: 'mainnet' }).status).toBe('BLOCKED');
    expect(networkGate({ network: 'testnet', chainId: 16661 }).reason).toBe(
      'TESTNET_CHAIN_ID_REQUIRED',
    );
  });
  it('redacts secret values and never leaks them', () => {
    const env = {
      OG_COMPUTE_API_KEY: 'secret-router-key',
      OPTIMIERA_CHAIN_PRIVATE_KEY: '0xprivate',
    };
    const output = JSON.stringify(redactedCredentialSummary(env));
    expect(output).toContain('[REDACTED]');
    expect(hasSecretLeak(output, Object.values(env))).toEqual([]);
  });
  it('classifies incomplete, invalid, and ready components distinctly', () => {
    expect(componentStatus({ enabled: false, required: { apiKey: false } }).status).toBe(
      'UNCONFIGURED',
    );
    expect(
      componentStatus({ enabled: true, required: { apiKey: true }, invalid: 'AUTH_FAILED' }).status,
    ).toBe('FAILED');
    expect(componentStatus({ enabled: true, required: { apiKey: true } }).status).toBe('READY');
  });
  it('requires confirmation and a complete preflight', () => {
    expect(activationGate(false, true)).toMatchObject({
      allowed: false,
      reason: 'CONFIRM_TESTNET_REQUIRED',
    });
    expect(activationGate(true, false)).toMatchObject({
      allowed: false,
      reason: 'PREFLIGHT_NOT_READY',
    });
    expect(activationGate(true, true)).toEqual({ allowed: true });
  });
  it('does not claim live verification from partial evidence', () => {
    expect(
      liveEvidenceStatus({
        authenticatedInference: true,
        storageReadback: false,
        chainReadback: true,
      }),
    ).toBe('UNCONFIGURED');
    expect(
      liveEvidenceStatus({
        authenticatedInference: true,
        storageReadback: true,
        chainReadback: true,
      }),
    ).toBe('LIVE_VERIFIED');
  });
});
