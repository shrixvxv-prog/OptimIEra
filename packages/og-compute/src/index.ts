import {
  readNousConfig,
  readOGComputeConfig,
  type NousConfig,
  type OGComputeConfig,
} from '@optimiera/config';
import {
  analyzePrompt,
  evaluateOptimization,
  estimatePromptTokens,
  type GeneratedCandidate,
  type OptimizationProvider,
  type ProviderContext,
  type ProviderEvaluation,
  type ProviderHealth,
  type PromptAnalysis,
  type OptimizationProviderType,
} from '@optimiera/optimizer-core';
import type { OptimizationRequest } from '@optimiera/schemas';
import { z } from 'zod';

export type OGHealthState = 'DISABLED' | 'UNCONFIGURED' | 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
/** Backward-compatible adapter state used by the pre-Phase-3 storage boundary. */
export type AdapterState = 'unconfigured' | 'unavailable' | 'ready';
export type OGModel = {
  id: string;
  type?: string;
  modality?: string;
  contextLength?: number;
  maxCompletionTokens?: number;
  providerCount?: number;
  capabilities?: string[];
  supportedParameters?: string[];
};
export type OGUsage = { promptTokens?: number; completionTokens?: number; totalTokens?: number };
export type OGTrace = {
  requestId?: string;
  responseId?: string;
  model?: string;
  provider?: string;
  cost?: Record<string, string | number>;
  latencyMs: number;
  usage?: OGUsage;
  finishReason?: string;
  retries: number;
};

const candidate = z.object({
  mode: z.enum(['BALANCED', 'ACCURACY_FOCUSED', 'TOKEN_EFFICIENT']),
  prompt: z.string().trim().min(1).max(12000),
  rationale: z.string().trim().min(1).max(240),
});
export const ogResponseSchema = z
  .object({
    schemaVersion: z.literal('1'),
    candidates: z.array(candidate).length(3),
    warnings: z.array(z.string().trim().min(1).max(240)).max(20),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.candidates.map((item) => item.mode)).size !== 3)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['candidates'],
        message: 'candidate modes must be unique',
      });
    if (new Set(value.candidates.map((item) => item.prompt)).size !== 3)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['candidates'],
        message: 'candidate prompts must be unique',
      });
  });
export type OGStructuredResponse = z.infer<typeof ogResponseSchema>;

export class OGComputeError extends Error {
  constructor(
    public readonly code:
      | '400'
      | '401'
      | '402'
      | '403'
      | '429'
      | '502'
      | '503'
      | 'TIMEOUT'
      | 'UNAVAILABLE'
      | 'SCHEMA_INVALID',
    message: string,
    public readonly requestId?: string,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}
function mapError(
  status: number,
  requestId?: string,
  retryAfter?: string | null,
  providerName = '0G Compute Router',
) {
  const code = (
    [400, 401, 402, 403, 429, 502, 503].includes(status) ? String(status) : 'UNAVAILABLE'
  ) as OGComputeError['code'];
  return new OGComputeError(
    code,
    `${providerName} request failed (${code}).`,
    requestId,
    retryAfter ? Math.max(0, Number(retryAfter) * 1000) : undefined,
  );
}
function requestId(headers: Headers, body: unknown) {
  return (
    headers.get('x-request-id') ||
    (body && typeof body === 'object' && 'request_id' in body
      ? String((body as { request_id?: unknown }).request_id)
      : undefined)
  )?.slice(0, 200);
}
function responseId(body: unknown) {
  return body && typeof body === 'object' && 'id' in body
    ? String((body as { id?: unknown }).id).slice(0, 200)
    : undefined;
}
function extractJsonObject(content: string) {
  const unfenced = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  const start = unfenced.indexOf('{');
  if (start < 0) return unfenced;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < unfenced.length; index += 1) {
    const character = unfenced[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === '{') depth += 1;
    else if (character === '}' && --depth === 0) return unfenced.slice(start, index + 1);
  }
  return unfenced.slice(start);
}
function validationSummary(error: z.ZodError) {
  return error.issues
    .slice(0, 12)
    .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`);
}
function contextFor(request: OptimizationRequest, analysis: PromptAnalysis) {
  return {
    prompt: request.rawPrompt,
    intendedTask: request.intendedTask,
    audience: request.targetAudience,
    outputFormat: request.desiredOutputType,
    tone: request.desiredTone,
    constraints: request.constraints,
    required: request.requiredElements,
    forbidden: request.forbiddenElements,
    mode: request.optimizationMode,
    localFindings: analysis.weaknesses.slice(0, 8),
  };
}

export class OGComputeRouterProvider implements OptimizationProvider {
  get id() {
    return this.identity.id;
  }
  get name() {
    return this.identity.name;
  }
  get type(): OptimizationProviderType {
    return this.identity.type;
  }
  get version() {
    return this.identity.version;
  }
  private modelsCache?: { expires: number; models: OGModel[] };
  private lastTrace?: OGTrace;
  constructor(
    private readonly config: OGComputeConfig = readOGComputeConfig(),
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly identity: {
      id: string;
      name: string;
      type: OptimizationProviderType;
      version: string;
    } = {
      id: '0g-compute-router',
      name: '0G Compute Router',
      type: 'OG_COMPUTE',
      version: 'og-router-v1',
    },
  ) {}
  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.config.apiKey) headers.authorization = `Bearer ${this.config.apiKey}`;
    return headers;
  }
  async listModels(): Promise<OGModel[]> {
    if (this.modelsCache && this.modelsCache.expires > Date.now()) return this.modelsCache.models;
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.config.baseUrl}/models`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch {
      throw new OGComputeError('TIMEOUT', `${this.name} model discovery timed out.`);
    }
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok)
      throw mapError(
        response.status,
        requestId(response.headers, body),
        response.headers.get('retry-after'),
        this.name,
      );
    const parsed = z
      .object({
        data: z.array(
          z.object({
            id: z.string().min(1),
            type: z.string().optional(),
            architecture: z.object({ modality: z.string().optional() }).optional(),
            context_length: z.number().optional(),
            max_completion_tokens: z.number().optional(),
            provider_count: z.number().optional(),
            capabilities: z.array(z.string()).optional(),
            supported_parameters: z.array(z.string()).optional(),
          }),
        ),
      })
      .safeParse(body);
    if (!parsed.success)
      throw new OGComputeError('SCHEMA_INVALID', 'Router model list was invalid.');
    const models = parsed.data.data
      .filter((m) => !m.capabilities?.includes('image'))
      .map((m) => ({
        id: m.id,
        type: m.type,
        modality: m.architecture?.modality,
        contextLength: m.context_length,
        maxCompletionTokens: m.max_completion_tokens,
        providerCount: m.provider_count,
        capabilities: m.capabilities,
        supportedParameters: m.supported_parameters,
      }));
    this.modelsCache = { expires: Date.now() + 30000, models };
    return models;
  }
  async healthCheck(): Promise<
    ProviderHealth & { state: OGHealthState; network: string; model?: string }
  > {
    if (!this.config.enabled)
      return {
        state: 'DISABLED',
        configured: false,
        providerName: this.name,
        providerType: this.type,
        version: this.version,
        network: this.config.network,
        model: this.config.model,
      };
    if (!this.config.apiKey || !this.config.model)
      return {
        state: 'UNCONFIGURED',
        configured: false,
        providerName: this.name,
        providerType: this.type,
        version: this.version,
        network: this.config.network,
        model: this.config.model,
      };
    try {
      const exists = (await this.listModels()).some((m) => m.id === this.config.model);
      return {
        state: exists ? 'AVAILABLE' : 'DEGRADED',
        configured: exists,
        providerName: this.name,
        providerType: this.type,
        version: this.version,
        network: this.config.network,
        model: this.config.model,
      };
    } catch {
      return {
        state: 'UNAVAILABLE',
        configured: false,
        providerName: this.name,
        providerType: this.type,
        version: this.version,
        network: this.config.network,
        model: this.config.model,
      };
    }
  }
  private async complete(
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    context: ProviderContext,
  ): Promise<OGStructuredResponse> {
    if (!this.config.apiKey || !this.config.model)
      throw new OGComputeError('UNCONFIGURED' as never, `${this.name} is unconfigured.`);
    const started = Date.now();
    const model = (await this.listModels()).find((item) => item.id === this.config.model);
    const supportsJsonMode = model?.supportedParameters?.includes('response_format') ?? false;
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await this.fetchImpl(`${this.config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            model: this.config.model,
            temperature: 0.2,
            max_tokens: Math.min(
              this.config.maxOutputTokens,
              model?.maxCompletionTokens ?? 2048,
              2048,
            ),
            messages,
            ...(supportsJsonMode ? { response_format: { type: 'json_object' } } : {}),
          }),
          signal: context.signal ?? AbortSignal.timeout(this.config.timeoutMs),
        });
      } catch {
        throw new OGComputeError('TIMEOUT', `${this.name} timed out.`);
      }
      const body: any = await response.json().catch(() => null);
      const id = requestId(response.headers, body);
      if (!response.ok) {
        const error = mapError(response.status, id, response.headers.get('retry-after'), this.name);
        if ((error.code === '429' || error.code === '502') && attempt === 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(error.retryAfterMs ?? 250 * 2 ** attempt, 2000)),
          );
          continue;
        }
        throw error;
      }
      try {
        const content = body?.choices?.[0]?.message?.content;
        if (typeof content !== 'string') throw new Error('missing content');
        const parsed = ogResponseSchema.safeParse(JSON.parse(extractJsonObject(content)));
        if (!parsed.success) throw new Error(validationSummary(parsed.error).join('; '));
        this.lastTrace = {
          requestId: id,
          responseId: responseId(body),
          model: this.config.model,
          provider: typeof body?.provider === 'string' ? body.provider : undefined,
          cost: body?.usage?.cost,
          latencyMs: Date.now() - started,
          retries: attempt,
          usage: body.usage
            ? {
                promptTokens: body.usage.prompt_tokens,
                completionTokens: body.usage.completion_tokens,
                totalTokens: body.usage.total_tokens,
              }
            : undefined,
          finishReason: body.choices?.[0]?.finish_reason,
        };
        return parsed.data;
      } catch {
        throw new OGComputeError(
          'SCHEMA_INVALID',
          `${this.name} response failed structured validation.`,
          id,
        );
      }
    }
    throw new OGComputeError('UNAVAILABLE', `${this.name} request failed.`);
  }
  async optimizeCombined(request: OptimizationRequest, context: ProviderContext) {
    const local = analyzePrompt(request);
    const system = {
      role: 'system' as const,
      content:
        'Return exactly one valid JSON object matching schemaVersion "1" with exactly three candidates using modes BALANCED, ACCURACY_FOCUSED, TOKEN_EFFICIENT. Each candidate must contain only mode, prompt, and one short rationale sentence. Prompts must be distinct and non-empty. Do not include scores, analysis, markdown, or commentary.',
    };
    let result: OGStructuredResponse;
    try {
      result = await this.complete(
        [system, { role: 'user', content: JSON.stringify(contextFor(request, local)) }],
        context,
      );
    } catch (error) {
      if (!(error instanceof OGComputeError) || error.code !== 'SCHEMA_INVALID') throw error;
      result = await this.complete(
        [
          system,
          {
            role: 'user',
            content: JSON.stringify({
              validationErrors: [error.message],
              invalidResponse: 'omitted',
              requiredSchema:
                '{schemaVersion:"1",candidates:[{mode,prompt,rationale} x3],warnings:[string]}',
            }),
          },
        ],
        context,
      );
    }
    const candidates: GeneratedCandidate[] = result.candidates.map((item) => ({
      candidateType: item.mode,
      title: `${item.mode.replaceAll('_', ' ')} live candidate`,
      optimizedPrompt: item.prompt,
      changeSummary: item.rationale,
      improvements: [item.rationale],
      retainedRequirements: [],
      removedOrCondensedElements: [],
      expectedAdvantages: [item.rationale],
      tradeoffs: [],
      estimatedTokenImpact:
        estimatePromptTokens(item.prompt) - estimatePromptTokens(request.rawPrompt),
      id: `${context.requestId}-${item.mode.toLowerCase()}`,
      sourceAnalyzerVersion: local.analysisVersion,
      providerType: this.type,
      providerName: this.name,
      generationVersion: this.version,
      createdAt: new Date().toISOString(),
    }));
    return {
      analysis: {
        ...local,
        promptSummary: local.promptSummary,
        confidence: local.confidence,
      },
      candidates,
      evaluation: evaluateOptimization(request, candidates),
      trace: this.lastTrace,
      modelWarnings: result.warnings,
      rationale: result.candidates.map((item) => item.rationale).join(' '),
    };
  }
  async analyze(request: OptimizationRequest, context: ProviderContext) {
    return (await this.optimizeCombined(request, context)).analysis;
  }
  async generateCandidates(): Promise<GeneratedCandidate[]> {
    throw new Error('Use optimizeCombined for single-call inference.');
  }
  async evaluateCandidates(): Promise<ProviderEvaluation> {
    throw new Error('Use optimizeCombined for single-call inference.');
  }
}

export class NousPromptIntelligenceProvider extends OGComputeRouterProvider {
  constructor(config: NousConfig = readNousConfig(), fetchImpl: typeof fetch = fetch) {
    super(config, fetchImpl, {
      id: 'nous-prompt-intelligence',
      name: 'Nous Hermes Prompt Intelligence',
      type: 'EXTERNAL_MODEL',
      version: 'nous-hermes-v1',
    });
  }
}
export function redactSecret(value: string) {
  return value ? `${value.slice(0, 3)}…[REDACTED]` : '';
}
