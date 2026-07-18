import { describe, expect, it } from 'vitest';
import { readOGComputeConfig } from '@optimiera/config';
import { OGComputeError, OGComputeRouterProvider, ogResponseSchema } from '@optimiera/og-compute';
import { optimizationRequestSchema } from '@optimiera/schemas';

const request = optimizationRequestSchema.parse({
  promptId: 'p1',
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
const response = {
  schemaVersion: '1',
  candidates: ['BALANCED', 'ACCURACY_FOCUSED', 'TOKEN_EFFICIENT'].map((mode) => ({
    mode,
    prompt: `Prompt ${mode}`,
    rationale: 'Clarified output.',
  })),
  warnings: [],
};
const config = {
  enabled: true,
  network: 'testnet' as const,
  baseUrl: 'https://router.example/v1',
  apiKey: 'sk-test',
  model: 'model-a',
  timeoutMs: 1000,
  maxOutputTokens: 100,
};
function fakeFetch(handler: (url: string, init?: RequestInit) => Response) {
  return handler as unknown as typeof fetch;
}

describe('Phase 3 0G Router', () => {
  it('validates configuration without exposing secrets', () => {
    const parsed = readOGComputeConfig({
      OG_COMPUTE_ENABLED: 'true',
      OG_COMPUTE_NETWORK: 'testnet',
      OG_COMPUTE_BASE_URL: 'https://router.example/v1',
      OG_COMPUTE_API_KEY: 'sk-secret',
      OG_COMPUTE_MODEL: 'model-a',
    });
    expect(parsed.apiKey).toBe('sk-secret');
    expect(JSON.stringify({ ...parsed, apiKey: '[redacted]' })).not.toContain('sk-secret');
  });
  it('parses the model catalog and confirms the configured model', async () => {
    const provider = new OGComputeRouterProvider(
      config,
      fakeFetch(() =>
        Response.json({ data: [{ id: 'model-a', context_length: 8192, provider_count: 2 }] }),
      ),
    );
    expect(await provider.listModels()).toEqual([
      { id: 'model-a', contextLength: 8192, providerCount: 2 },
    ]);
    expect((await provider.healthCheck()).state).toBe('AVAILABLE');
  });
  it('rejects duplicate candidate types', async () => {
    const duplicate = {
      ...response,
      candidates: [response.candidates[0], response.candidates[0], response.candidates[2]],
    };
    const provider = new OGComputeRouterProvider(
      config,
      fakeFetch((url) =>
        url.endsWith('/models')
          ? Response.json({ data: [{ id: 'model-a' }] })
          : Response.json({ choices: [{ message: { content: JSON.stringify(duplicate) } }] }),
      ),
    );
    await expect(
      provider.optimizeCombined(request, { requestId: 'r1', timeoutMs: 1000 }),
    ).rejects.toMatchObject({ code: 'SCHEMA_INVALID' });
  });
  it('repairs malformed output exactly once and captures request metadata', async () => {
    let calls = 0;
    const provider = new OGComputeRouterProvider(
      config,
      fakeFetch((url) => {
        if (url.endsWith('/models'))
          return Response.json({
            data: [{ id: 'model-a', supported_parameters: ['response_format'] }],
          });
        calls++;
        return Response.json(
          {
            choices: [{ message: { content: calls === 1 ? '{bad' : JSON.stringify(response) } }],
            usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
          },
          { headers: { 'x-request-id': 'router-1' } },
        );
      }),
    );
    const result = await provider.optimizeCombined(request, { requestId: 'r2', timeoutMs: 1000 });
    expect(calls).toBe(2);
    expect(result.trace).toMatchObject({ requestId: 'router-1', usage: { totalTokens: 7 } });
  });
  it('clamps Galileo output tokens to the Router limit', async () => {
    let sent: Record<string, unknown> | undefined;
    const provider = new OGComputeRouterProvider(
      { ...config, maxOutputTokens: 3500 },
      fakeFetch((url, init) => {
        if (url.endsWith('/models'))
          return Response.json({ data: [{ id: 'model-a', max_completion_tokens: 2048 }] });
        sent = JSON.parse(String(init?.body));
        return Response.json({ choices: [{ message: { content: JSON.stringify(response) } }] });
      }),
    );
    await provider.optimizeCombined(request, { requestId: 'r-limit', timeoutMs: 1000 });
    expect(sent?.max_tokens).toBe(2048);
  });
  it.each([401, 402, 429, 502, 503])('maps Router HTTP %s without fallback', async (status) => {
    const provider = new OGComputeRouterProvider(
      config,
      fakeFetch(() => new Response('{}', { status })),
    );
    await expect(
      provider.optimizeCombined(request, { requestId: 'r3', timeoutMs: 1000 }),
    ).rejects.toMatchObject({ code: String(status) });
  });
  it('validates score bounds and the strict response shape', () => {
    expect(ogResponseSchema.safeParse(response).success).toBe(true);
    expect(
      ogResponseSchema.safeParse({ ...response, candidates: response.candidates.slice(0, 2) })
        .success,
    ).toBe(false);
    expect(new OGComputeError('TIMEOUT', 'timeout').code).toBe('TIMEOUT');
  });
});
