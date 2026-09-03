import { readFile, realpath } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  benchmarkCaseSchema,
  createBenchmarkSuite,
  evaluateRegression,
  executeBenchmark,
  type BenchmarkProvider,
  type BenchmarkResult,
  type BenchmarkTarget,
  type RegressionPolicy,
  type RegressionReport,
} from '@optimiera/benchmark-engine';
import { analyzePrompt } from '@optimiera/optimizer-core';
import type { OptimizationRequest } from '@optimiera/schemas';
import { OGComputeRouterProvider } from '@optimiera/og-compute';
import { readOGComputeConfig } from '@optimiera/config';

export type CliPromptConfig = {
  id: string;
  file: string;
  intendedTask?: string;
  targetAudience?: string;
  desiredOutputType?: OptimizationRequest['desiredOutputType'];
  desiredTone?: string;
  privacyLevel?: OptimizationRequest['privacyLevel'];
};
export type OptimieraConfig = {
  prompts: CliPromptConfig[];
  benchmarkSuite: string;
  baseline?: string;
  provider: 'local' | 'og-compute';
  regressionPolicy?: RegressionPolicy;
  evidence?: Record<string, unknown>;
};
export type CliReport = {
  configFile: string;
  suite: { id: string; name: string; hash: string; cases: number };
  provider: string;
  analyzer: Array<{
    promptId: string;
    analysisVersion: string;
    findingCount: number;
    confidence: number;
  }>;
  benchmarks: Array<{
    candidateId: string;
    successRate: number;
    weightedScore: number;
    formatCompliance: number;
    safetyFailures: number;
    privacyFailures: number;
    latencyMs: number;
    errorRate: number;
    tokenUsage?: number;
    executionCost?: number;
  }>;
  comparisons: RegressionReport[];
  exitCode: 0 | 1 | 2;
};
export class CliConfigurationError extends Error {}
export class CliRuntimeError extends Error {}

function secretField(key: string) {
  return /(api[_-]?key|private[_-]?key|secret|password|credential|access[_-]?token|refresh[_-]?token)/i.test(
    key,
  );
}
function rejectSecretFields(value: unknown, path = 'config') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (secretField(key))
      throw new CliConfigurationError(`Secret-bearing config field is not allowed: ${path}.${key}`);
    rejectSecretFields(child, `${path}.${key}`);
  }
}
function asObject(value: unknown, message: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new CliConfigurationError(message);
  return value as Record<string, unknown>;
}

export async function readSafeProjectFile(projectRoot: string, fileName: string) {
  if (isAbsolute(fileName))
    throw new CliConfigurationError(`Absolute paths are not allowed: ${fileName}`);
  const root = await realpath(projectRoot);
  const candidate = resolve(root, fileName);
  const contained = relative(root, candidate);
  if (!contained || contained.startsWith('..') || isAbsolute(contained))
    throw new CliConfigurationError(`Path escapes project root: ${fileName}`);
  let actual: string;
  try {
    actual = await realpath(candidate);
  } catch {
    throw new CliRuntimeError(`Project file was not found: ${fileName}`);
  }
  const actualRelative = relative(root, actual);
  if (actualRelative.startsWith('..') || isAbsolute(actualRelative))
    throw new CliConfigurationError(`Path escapes project root: ${fileName}`);
  try {
    return await readFile(actual, 'utf8');
  } catch {
    throw new CliRuntimeError(`Project file could not be read: ${fileName}`);
  }
}

export async function loadProjectConfig(configFile: string) {
  const absoluteConfig = resolve(configFile);
  if (extname(absoluteConfig).toLowerCase() !== '.json')
    throw new CliConfigurationError(
      'Only JSON configuration is supported; executable config files are rejected.',
    );
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(absoluteConfig, 'utf8'));
  } catch {
    throw new CliConfigurationError(`Invalid JSON configuration: ${absoluteConfig}`);
  }
  rejectSecretFields(parsed);
  const raw = asObject(parsed, 'Configuration must be a JSON object.');
  if (typeof raw.benchmarkSuite !== 'string' || !raw.benchmarkSuite)
    throw new CliConfigurationError('benchmarkSuite is required.');
  const rawPrompts = Array.isArray(raw.prompts) ? raw.prompts : [];
  const prompts = rawPrompts.map((item, index) => {
    const prompt = asObject(item, `prompts[${index}] must be an object.`);
    if (
      typeof prompt.id !== 'string' ||
      !prompt.id ||
      typeof prompt.file !== 'string' ||
      !prompt.file
    )
      throw new CliConfigurationError(`prompts[${index}] requires id and file.`);
    return {
      id: prompt.id,
      file: prompt.file,
      intendedTask: typeof prompt.intendedTask === 'string' ? prompt.intendedTask : undefined,
      targetAudience: typeof prompt.targetAudience === 'string' ? prompt.targetAudience : undefined,
      desiredOutputType:
        typeof prompt.desiredOutputType === 'string'
          ? (prompt.desiredOutputType as CliPromptConfig['desiredOutputType'])
          : undefined,
      desiredTone: typeof prompt.desiredTone === 'string' ? prompt.desiredTone : undefined,
      privacyLevel:
        typeof prompt.privacyLevel === 'string'
          ? (prompt.privacyLevel as CliPromptConfig['privacyLevel'])
          : undefined,
    } satisfies CliPromptConfig;
  });
  if (!prompts.length) throw new CliConfigurationError('At least one prompt file is required.');
  const provider = raw.provider === undefined ? 'local' : raw.provider;
  if (provider !== 'local' && provider !== 'og-compute')
    throw new CliConfigurationError('provider must be local or og-compute.');
  if (raw.baseline !== undefined && typeof raw.baseline !== 'string')
    throw new CliConfigurationError('baseline must be a prompt id or project-relative file path.');
  return {
    root: dirname(absoluteConfig),
    configFile: absoluteConfig,
    config: {
      prompts,
      benchmarkSuite: raw.benchmarkSuite,
      baseline: raw.baseline as string | undefined,
      provider,
      regressionPolicy: raw.regressionPolicy as RegressionPolicy | undefined,
      evidence: raw.evidence as Record<string, unknown> | undefined,
    } satisfies OptimieraConfig,
  };
}

function analyzerRequest(prompt: CliPromptConfig, content: string): OptimizationRequest {
  return {
    promptId: prompt.id,
    rawPrompt: content,
    intendedTask: prompt.intendedTask ?? 'Validate prompt behavior against its benchmark suite',
    targetAudience: prompt.targetAudience ?? 'Prompt users',
    desiredOutputType: prompt.desiredOutputType ?? 'PLAIN_TEXT',
    desiredTone: prompt.desiredTone ?? 'Clear',
    optimizationMode: 'BALANCED',
    constraints: [],
    requiredElements: [],
    forbiddenElements: [],
    examples: [],
    expectedLength: {},
    outputLanguage: 'English',
    privacyLevel: prompt.privacyLevel ?? 'PRIVATE',
  };
}

async function loadSuite(projectRoot: string, suiteFile: string) {
  const parsed = asObject(
    JSON.parse(await readSafeProjectFile(projectRoot, suiteFile)),
    'Benchmark suite must be a JSON object.',
  );
  if (!Array.isArray(parsed.cases) || !parsed.cases.length)
    throw new CliConfigurationError('Benchmark suite requires at least one case.');
  const cases = parsed.cases.map((item, index) => {
    const raw = asObject(item, `Benchmark case ${index} must be an object.`);
    return benchmarkCaseSchema.parse({
      ...raw,
      id: typeof raw.id === 'string' && raw.id ? raw.id : `case-${index + 1}`,
      expectedOutput: raw.expectedOutput ?? raw.expected,
      evaluatorConfig: raw.evaluatorConfig ?? {},
      tags: raw.tags ?? [],
      weight: raw.weight ?? 1,
      timeoutMs: raw.timeoutMs ?? 60000,
      privacy: raw.privacy ?? 'INTERNAL',
    });
  });
  return createBenchmarkSuite({
    id:
      typeof parsed.id === 'string' && parsed.id
        ? parsed.id
        : basename(suiteFile, extname(suiteFile)),
    name:
      typeof parsed.name === 'string' && parsed.name ? parsed.name : 'OptimIEra benchmark suite',
    version: typeof parsed.version === 'string' && parsed.version ? parsed.version : '1',
    cases,
  });
}

function localProvider(): BenchmarkProvider {
  return {
    name: 'OptimIEra CLI local provider',
    async execute({ prompt, input }) {
      return { output: `${prompt}\n${input}` };
    },
  };
}
function ogComputeProvider(): { provider: BenchmarkProvider; preflight: () => Promise<void> } {
  let adapter: OGComputeRouterProvider;
  let config: ReturnType<typeof readOGComputeConfig>;
  try {
    config = readOGComputeConfig();
    adapter = new OGComputeRouterProvider(config);
  } catch {
    throw new CliRuntimeError('0G Compute configuration is invalid or unavailable.');
  }
  return {
    provider: {
      name: adapter.name,
      async execute({ prompt, input }) {
        const result = await adapter.optimizeCombined(
          {
            rawPrompt: prompt,
            intendedTask: input,
            targetAudience: 'CLI benchmark evaluator',
            desiredOutputType: 'PLAIN_TEXT',
            desiredTone: 'direct',
            optimizationMode: 'BALANCED',
            constraints: [],
            requiredElements: [],
            forbiddenElements: [],
            examples: [],
            expectedLength: {},
            outputLanguage: 'English',
            privacyLevel: 'PRIVATE',
          } as OptimizationRequest,
          { requestId: `cli-benchmark-${Date.now()}`, timeoutMs: 60000 },
        );
        return {
          output: result.candidates[0]?.optimizedPrompt ?? '',
          model: result.trace?.model,
          inputTokens: result.trace?.usage?.promptTokens,
          outputTokens: result.trace?.usage?.completionTokens,
        };
      },
    },
    async preflight() {
      const health = await adapter.healthCheck();
      if (!config.apiKey || !config.model) throw new CliRuntimeError('0G Compute is UNCONFIGURED.');
      if (health.state === 'UNCONFIGURED' || !health.configured)
        throw new CliRuntimeError(`0G Compute is ${health.state}.`);
    },
  };
}
function safeMetrics(results: BenchmarkResult[]) {
  return results.map(({ executions: _executions, ...metrics }) => metrics);
}
function statusRank(status: RegressionReport['policyResult']['status']) {
  return status === 'BLOCKED' ? 2 : status === 'WARNING' ? 1 : 0;
}

export async function runValidation(configOrPrompt: string, format: 'human' | 'json' = 'human') {
  const requested = resolve(configOrPrompt);
  const loaded =
    extname(requested).toLowerCase() === '.json'
      ? await loadProjectConfig(requested)
      : await loadProjectConfig(resolve(dirname(requested), 'optimiera.config.json'));
  if (extname(requested).toLowerCase() !== '.json')
    loaded.config.prompts = [
      {
        id: basename(requested, extname(requested)),
        file: relative(loaded.root, requested),
        intendedTask: undefined,
        targetAudience: undefined,
        desiredOutputType: undefined,
        desiredTone: undefined,
        privacyLevel: undefined,
      },
    ];
  const suite = await loadSuite(loaded.root, loaded.config.benchmarkSuite);
  let loadedPrompts: Array<{ prompt: CliPromptConfig; content: string }> = await Promise.all(
    loaded.config.prompts.map(async (prompt) => ({
      prompt,
      content: await readSafeProjectFile(loaded.root, prompt.file),
    })),
  );
  let baselineId = loaded.config.baseline
    ? loadedPrompts.find(
        ({ prompt }) =>
          prompt.id === loaded.config.baseline || prompt.file === loaded.config.baseline,
      )?.prompt.id
    : undefined;
  if (loaded.config.baseline && !baselineId) {
    const baselinePrompt: CliPromptConfig = {
      id: 'baseline',
      file: loaded.config.baseline,
      intendedTask: undefined,
      targetAudience: undefined,
      desiredOutputType: undefined,
      desiredTone: undefined,
      privacyLevel: undefined,
    };
    loadedPrompts = [
      {
        prompt: baselinePrompt,
        content: await readSafeProjectFile(loaded.root, baselinePrompt.file),
      },
      ...loadedPrompts,
    ];
    baselineId = baselinePrompt.id;
  }
  const analyzer = loadedPrompts.map(({ prompt, content }) => {
    const analysis = analyzePrompt(analyzerRequest(prompt, content));
    return {
      promptId: prompt.id,
      analysisVersion: analysis.analysisVersion,
      findingCount: analysis.weaknesses.length,
      confidence: analysis.confidence,
    };
  });
  let provider: BenchmarkProvider;
  let preflight: (() => Promise<void>) | undefined;
  if (loaded.config.provider === 'og-compute') ({ provider, preflight } = ogComputeProvider());
  else provider = localProvider();
  if (preflight) await preflight();
  const targets: BenchmarkTarget[] = loadedPrompts.map(({ prompt, content }) => ({
    candidateId: prompt.id,
    prompt: content,
  }));
  const run = await executeBenchmark(suite, targets, provider);
  const baseline = baselineId
    ? run.results.find((result) => result.candidateId === baselineId)
    : undefined;
  const comparisons = baseline
    ? run.results
        .filter((result) => result.candidateId !== baselineId)
        .map((result) =>
          evaluateRegression(
            baseline,
            result,
            suite.contentHash,
            loaded.config.regressionPolicy ?? {},
            baselineId!,
            result.candidateId,
          ),
        )
    : [];
  const regressionRank = comparisons.reduce(
    (rank, report) => Math.max(rank, statusRank(report.policyResult.status)),
    0,
  );
  const exitCode: 0 | 1 | 2 =
    regressionRank === 2 ||
    (!baseline && run.results.some((result) => result.errorRate > 0 || result.successRate < 1))
      ? 1
      : 0;
  const report: CliReport = {
    configFile: loaded.configFile,
    suite: { id: suite.id, name: suite.name, hash: suite.contentHash, cases: suite.cases.length },
    provider: provider.name,
    analyzer,
    benchmarks: safeMetrics(run.results),
    comparisons,
    exitCode,
  };
  if (format === 'json') process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else printHuman(report);
  return report;
}

export function printHuman(report: CliReport) {
  console.log(`OptimIEra Prompt CI — ${report.suite.name}`);
  console.log(`Provider: ${report.provider}`);
  console.log(`Suite: ${report.suite.hash} (${report.suite.cases} cases)`);
  for (const item of report.analyzer)
    console.log(
      `Analyzer ${item.promptId}: ${item.findingCount} findings, confidence ${item.confidence}`,
    );
  for (const item of report.benchmarks)
    console.log(
      `Benchmark ${item.candidateId}: success ${(item.successRate * 100).toFixed(1)}%, weighted ${(item.weightedScore * 100).toFixed(1)}%, errors ${(item.errorRate * 100).toFixed(1)}%`,
    );
  for (const comparison of report.comparisons) {
    console.log(
      `Regression ${comparison.baselineVersionId} → ${comparison.candidateVersionId}: ${comparison.policyResult.status}`,
    );
    for (const violation of comparison.policyResult.violations)
      console.log(`  ${violation.severity}: ${violation.message}`);
  }
  console.log(report.exitCode === 0 ? 'RESULT: PASS' : 'RESULT: BLOCKED/FAILED');
}

export async function main(argv = process.argv.slice(2)) {
  const [command, target, ...flags] = argv;
  if (!command || command === 'help') {
    console.error('Usage: optimiera test <prompt-or-config> [--json]');
    return command === 'help' ? 0 : 2;
  }
  if (command === 'publish' || command === 'verify') {
    console.error(
      'Release operations are explicit only. Use the server-side release workflow with approved credentials; pull-request validation never publishes 0G data.',
    );
    return 2;
  }
  if (command !== 'test' || !target) {
    console.error('Usage: optimiera test <prompt-or-config> [--json]');
    return 2;
  }
  try {
    return (
      await runValidation(
        target,
        flags.includes('--json') || flags.includes('--format=json') ? 'json' : 'human',
      )
    ).exitCode;
  } catch (error) {
    console.error(
      `OptimIEra CI ERROR: ${error instanceof Error ? error.message : 'CLI_RUNTIME_FAILURE'}`,
    );
    return 2;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().then((code) => {
    process.exitCode = code;
  });
