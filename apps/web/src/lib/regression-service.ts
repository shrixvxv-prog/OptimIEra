import 'server-only';

import { db } from '@optimiera/database';
import { decryptPrompt, parseEnvelope } from '@optimiera/encryption';
import {
  evaluateRegression,
  executeBenchmark,
  type BenchmarkProvider,
  type RegressionPolicy,
} from '@optimiera/benchmark-engine';
import { requireSession } from './authorization';
import {
  localBenchmarkProvider,
  ogComputeBenchmarkProvider,
  suiteFromRecord,
} from './benchmark-service';

function parsePolicy(value: string | null | undefined): RegressionPolicy {
  if (!value) throw new Error('REGRESSION_POLICY_REQUIRED');
  try {
    return JSON.parse(value) as RegressionPolicy;
  } catch {
    throw new Error('REGRESSION_POLICY_INVALID');
  }
}

export async function attachRegressionSuite(input: {
  promptId: string;
  suiteId: string;
  policy: string;
}) {
  const session = await requireSession();
  const prompt = await db.prompt.findFirst({
    where: { id: input.promptId, workspace: { members: { some: { userId: session.user.id } } } },
  });
  const suite = prompt
    ? await db.evaluationSuite.findFirst({
        where: { id: input.suiteId, workspaceId: prompt.workspaceId },
      })
    : null;
  if (!prompt || !suite) throw new Error('REGRESSION_NOT_FOUND');
  parsePolicy(input.policy);
  return db.prompt.update({
    where: { id: prompt.id },
    data: { regressionSuiteId: suite.id, regressionPolicy: input.policy },
  });
}

export async function runRegressionForPrompt(input: {
  promptId: string;
  baselineVersionId: string;
  candidateVersionId: string;
  provider?: BenchmarkProvider;
}) {
  const session = await requireSession();
  const prompt = await db.prompt.findFirst({
    where: { id: input.promptId, workspace: { members: { some: { userId: session.user.id } } } },
    include: { project: true },
  });
  if (!prompt?.regressionSuiteId) throw new Error('REGRESSION_SUITE_REQUIRED');
  const suiteRecord = await db.evaluationSuite.findFirst({
    where: { id: prompt.regressionSuiteId, workspaceId: prompt.workspaceId },
    include: { testCases: true },
  });
  const [baseline, candidate] = await Promise.all([
    db.promptVersion.findFirst({
      where: { id: input.baselineVersionId, promptId: prompt.id, workspaceId: prompt.workspaceId },
    }),
    db.promptVersion.findFirst({
      where: { id: input.candidateVersionId, promptId: prompt.id, workspaceId: prompt.workspaceId },
    }),
  ]);
  if (!suiteRecord || !baseline || !candidate) throw new Error('REGRESSION_VERSION_NOT_FOUND');
  const policy = parsePolicy(prompt.regressionPolicy ?? prompt.project.regressionPolicy);
  const provider = input.provider ?? localBenchmarkProvider();
  const suite = suiteFromRecord(suiteRecord);
  const run = await executeBenchmark(
    suite,
    [
      {
        candidateId: 'BASELINE',
        prompt: decryptPrompt(parseEnvelope(baseline.encryptedContent)),
        promptVersionId: baseline.id,
        contentHash: baseline.contentHash,
      },
      {
        candidateId: 'CANDIDATE',
        prompt: decryptPrompt(parseEnvelope(candidate.encryptedContent)),
        promptVersionId: candidate.id,
        contentHash: candidate.contentHash,
      },
    ],
    provider,
  );
  const report = evaluateRegression(
    run.results[0],
    run.results[1],
    suite.contentHash,
    policy,
    baseline.id,
    candidate.id,
  );
  const persisted = await db.regressionReport.create({
    data: {
      workspaceId: prompt.workspaceId,
      projectId: prompt.projectId,
      promptId: prompt.id,
      suiteId: suiteRecord.id,
      baselineVersionId: baseline.id,
      candidateVersionId: candidate.id,
      status: report.policyResult.status,
      reportJson: JSON.stringify({
        ...report,
        provider: provider.name,
        model:
          run.results.flatMap((item) => item.executions).find((item) => item.model)?.model ?? null,
      }),
      contentHash: report.contentHash,
    },
  });
  return { ...report, id: persisted.id, provider: provider.name };
}

export const regressionProviders = {
  local: localBenchmarkProvider,
  'og-compute': ogComputeBenchmarkProvider,
};
