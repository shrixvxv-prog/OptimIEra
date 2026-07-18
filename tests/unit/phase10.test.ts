import { describe, expect, it, vi } from 'vitest';
import { readNousConfig } from '@optimiera/config';
import { NousPromptIntelligenceProvider } from '@optimiera/og-compute';
import { optimizationRequestSchema } from '@optimiera/schemas';
import {
  DEFAULT_USAGE_PAYMENT_WEI,
  readUsagePaymentConfig,
  UsagePaymentError,
  validateUsagePaymentEvidence,
} from '@optimiera/payment';

const recipient = '0x1111111111111111111111111111111111111111' as const;
const payer = '0x2222222222222222222222222222222222222222' as const;

describe('Nous prompt intelligence', () => {
  const request = optimizationRequestSchema.parse({
    promptId: 'prompt-1',
    rawPrompt: 'Write a concise summary.',
    intendedTask: 'Summarize',
    targetAudience: 'Readers',
    desiredOutputType: 'MARKDOWN',
    desiredTone: 'Clear',
    optimizationMode: 'BALANCED',
    outputLanguage: 'English',
    privacyLevel: 'PRIVATE',
    expectedLength: {},
  });
  const structuredResponse = {
    schemaVersion: '1',
    candidates: ['BALANCED', 'ACCURACY_FOCUSED', 'TOKEN_EFFICIENT'].map((mode) => ({
      mode,
      prompt: `${mode} summary prompt`,
      rationale: 'Clarified the requested output.',
    })),
    warnings: [],
  };

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

  it('runs one structured mocked inference with the Nous provider', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/models'))
        return Response.json({ data: [{ id: 'nousresearch/hermes-4-70b' }] });
      expect(init?.headers).toMatchObject({ authorization: 'Bearer secret' });
      return Response.json({
        choices: [{ message: { content: JSON.stringify(structuredResponse) } }],
        usage: { prompt_tokens: 12, completion_tokens: 24, total_tokens: 36 },
      });
    });
    const provider = new NousPromptIntelligenceProvider(
      readNousConfig({ NOUS_API_KEY: 'secret' }),
      fetchMock as typeof fetch,
    );

    const result = await provider.optimizeCombined(request, { requestId: 'nous-mock-1' });

    expect(result.candidates).toHaveLength(3);
    expect(result.candidates.map((candidate) => candidate.candidateType)).toEqual([
      'BALANCED',
      'ACCURACY_FOCUSED',
      'TOKEN_EFFICIENT',
    ]);
    expect(result.trace).toMatchObject({ usage: { totalTokens: 36 } });
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
