import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CliConfigurationError,
  loadProjectConfig,
  main,
  readSafeProjectFile,
  runValidation,
} from '../../tools/cli/src';

const temporary: string[] = [];
async function project() {
  const root = await mkdtemp(join(tmpdir(), 'optimiera-cli-'));
  temporary.push(root);
  await mkdir(join(root, 'prompts'));
  await mkdir(join(root, 'benchmarks'));
  await writeFile(join(root, 'prompts', 'baseline.txt'), 'Answer with the requested value.');
  await writeFile(
    join(root, 'prompts', 'candidate.txt'),
    'Answer with the requested value clearly.',
  );
  await writeFile(
    join(root, 'benchmarks', 'suite.json'),
    JSON.stringify({
      id: 'suite',
      name: 'CLI suite',
      cases: [{ id: 'case', input: 'example', evaluator: 'CONTAINS', expected: 'example' }],
    }),
  );
  await writeFile(
    join(root, 'optimiera.config.json'),
    JSON.stringify({
      prompts: [
        { id: 'baseline', file: 'prompts/baseline.txt' },
        { id: 'candidate', file: 'prompts/candidate.txt' },
      ],
      benchmarkSuite: 'benchmarks/suite.json',
      baseline: 'baseline',
      provider: 'local',
      regressionPolicy: { minimumSuccessScore: 0.5 },
    }),
  );
  return root;
}
afterEach(async () => {
  while (temporary.length) await rm(temporary.pop()!, { recursive: true, force: true });
});

describe('OptimIEra Prompt CI CLI', () => {
  it('loads config, analyzes, benchmarks, and reports a regression comparison', async () => {
    const root = await project();
    const report = await runValidation(join(root, 'optimiera.config.json'), 'json');
    expect(report.exitCode).toBe(0);
    expect(report.comparisons[0].baselineVersionId).toBe('baseline');
    expect(report.comparisons[0].candidateVersionId).toBe('candidate');
    expect(report.benchmarks).toHaveLength(2);
  });

  it('returns configuration/runtime exit code 2 and rejects unsafe config', async () => {
    const root = await project();
    await expect(loadProjectConfig(join(root, 'optimiera.config.js'))).rejects.toThrow(
      CliConfigurationError,
    );
    await expect(readSafeProjectFile(root, '../outside.txt')).rejects.toThrow(
      CliConfigurationError,
    );
    expect(await main(['test', join(root, 'optimiera.config.js')])).toBe(2);
  });

  it('rejects secret-bearing configuration and release auto-publishing', async () => {
    const root = await project();
    await writeFile(
      join(root, 'unsafe.json'),
      JSON.stringify({
        benchmarkSuite: 'suite.json',
        apiKey: 'do-not-store',
        prompts: [{ id: 'p', file: 'prompts/baseline.txt' }],
      }),
    );
    await expect(loadProjectConfig(join(root, 'unsafe.json'))).rejects.toThrow('Secret-bearing');
    expect(await main(['publish', join(root, 'optimiera.config.json')])).toBe(2);
  });

  it('reports 0G Compute as unconfigured without attempting paid inference', async () => {
    const root = await project();
    await writeFile(
      join(root, 'optimiera.config.json'),
      JSON.stringify({
        prompts: [{ id: 'candidate', file: 'prompts/candidate.txt' }],
        benchmarkSuite: 'benchmarks/suite.json',
        provider: 'og-compute',
      }),
    );
    expect(await main(['test', join(root, 'optimiera.config.json')])).toBe(2);
  });
});
