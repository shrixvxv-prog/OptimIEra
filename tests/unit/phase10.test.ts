import { describe, expect, it, vi } from 'vitest';
import { readNousConfig } from '@optimiera/config';
import { NousPromptIntelligenceProvider } from '@optimiera/og-compute';
import {
  DEFAULT_USAGE_PAYMENT_WEI,
  readUsagePaymentConfig,
  UsagePaymentError,
  validateUsagePaymentEvidence,
} from '@optimiera/payment';

const recipient = '0x1111111111111111111111111111111111111111' as const;
const payer = '0x2222222222222222222222222222222222222222' as const;

describe('Nous prompt intelligence', () => {
  it('enables safely when the server key exists and defaults to Hermes 4 70B', () => {
    const config = readNousConfig({ NOUS_API_KEY: 'secret' });
    expect(config.enabled).toBe(true);
    expect(config.model).toBe('nousresearch/hermes-4-70b');
    expect(config.baseUrl).toBe('https://inference-api.nousresearch.com/v1');
  });

  it('discovers the configured Nous model without exposing the key', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ data: [{ id: 'nousresearch/hermes-4-70b' }] }),
    );
    const provider = new NousPromptIntelligenceProvider(
      readNousConfig({ NOUS_API_KEY: 'secret' }),
      fetchMock as typeof fetch,
    );
    const health = await provider.healthCheck();
    expect(health.state).toBe('AVAILABLE');
    expect(health.providerType).toBe('EXTERNAL_MODEL');
    expect(JSON.stringify(health)).not.toContain('secret');
  });
});

describe('0G usage payments', () => {
  const config = {
    enabled: true,
    chainId: 16602,
    rpcUrl: 'https://evmrpc-testnet.0g.ai',
    recipient,
    amountWei: DEFAULT_USAGE_PAYMENT_WEI,
    confirmations: 1,
  };

  it('is disabled by default and uses exactly 0.0001 0G', () => {
    const value = readUsagePaymentConfig({});
    expect(value.enabled).toBe(false);
    expect(value.amountWei).toBe(100_000_000_000_000n);
  });

  it('accepts a successful Galileo payment with sufficient value', () => {
    expect(
      validateUsagePaymentEvidence(
        config,
        { to: recipient, from: payer, value: DEFAULT_USAGE_PAYMENT_WEI, chainId: 16602 },
        { status: 'success' },
      ),
    ).toMatchObject({ payerAddress: payer, recipientAddress: recipient, chainId: 16602 });
  });

  it('rejects wrong-chain, wrong-recipient, insufficient, and failed payments', () => {
    const base = { to: recipient, from: payer, value: DEFAULT_USAGE_PAYMENT_WEI, chainId: 16602 };
    const cases = [
      () => validateUsagePaymentEvidence(config, { ...base, chainId: 1 }, { status: 'success' }),
      () => validateUsagePaymentEvidence(config, { ...base, to: payer }, { status: 'success' }),
      () => validateUsagePaymentEvidence(config, { ...base, value: 1n }, { status: 'success' }),
      () => validateUsagePaymentEvidence(config, base, { status: 'reverted' }),
    ];
    for (const run of cases) expect(run).toThrow(UsagePaymentError);
  });
});
