import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
import { executeBenchmarkAction } from '../actions';

export default async function BenchmarkDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const suite = await db.evaluationSuite.findUnique({
    where: { id },
    include: { testCases: true },
  });
  const membership = suite
    ? await db.member.findUnique({
        where: {
          organizationId_userId: { organizationId: suite.workspaceId, userId: session.user.id },
        },
      })
    : null;
  if (!suite || !membership)
    return (
      <main className="appmain">
        <h1>Benchmark not found.</h1>
      </main>
    );
  const runs = await db.evaluationRun.findMany({
    where: { suiteId: id },
    include: { results: true },
    orderBy: { createdAt: 'desc' },
  });
  return (
    <main className="appmain wide">
      <div className="eyebrow">Benchmark Suite</div>
      <h1>{suite.name}</h1>
      <p className="lede">
        {suite.description ?? 'Reproducible PromptVersion evaluation dataset.'}
      </p>
      <section className="card">
        <h2>Execute benchmark</h2>
        <form action={executeBenchmarkAction} className="mini-form">
          <input type="hidden" name="suiteId" value={suite.id} />
          <label>
            Optimization ID
            <input name="optimizationId" required />
          </label>
          <label>
            Provider
            <select name="provider" defaultValue="local">
              <option value="local">Local test provider</option>
              <option value="og-compute">0G Compute (UNCONFIGURED if unavailable)</option>
            </select>
          </label>
          <button className="button" type="submit">
            Run against Original and candidates
          </button>
        </form>
      </section>
      <section className="card">
        <h2>Test cases</h2>
        {suite.testCases.map((test) => (
          <p key={test.id}>
            <strong>{test.id}</strong> · {test.input} · {test.assertionConfig}
          </p>
        ))}
      </section>
      <section className="card">
        <h2>Runs and candidate comparison</h2>
        {runs.length === 0 ? (
          <p className="muted">No benchmark executions have been recorded.</p>
        ) : (
          runs.map((run) => (
            <article key={run.id}>
              <h3>{run.evaluationVersion ?? 'Benchmark run'}</h3>
              <p className="muted">
                {run.createdAt.toISOString()} · {run.status}
              </p>
              {(() => {
                const metadata = run.executionMetadata
                  ? (JSON.parse(run.executionMetadata) as {
                      provider?: string;
                      provenanceHash?: string;
                      runHash?: string;
                    })
                  : {};
                const dimensions = run.scoringDimensions
                  ? (JSON.parse(run.scoringDimensions) as {
                      metrics?: Array<{
                        candidateId: string;
                        weightedScore: number;
                        successRate: number;
                      }>;
                      comparison?: Array<{
                        candidateId: string;
                        deltaVsOriginal?: { successRate: number; weightedScore: number };
                      }>;
                    })
                  : {};
                return (
                  <>
                    <p className="muted">
                      Provider: {metadata.provider ?? 'unknown'} · Run hash:{' '}
                      {metadata.runHash ?? 'n/a'}
                    </p>
                    <p className="muted">Provenance hash: {metadata.provenanceHash ?? 'n/a'}</p>
                    {dimensions.metrics?.map((metric) => (
                      <p key={metric.candidateId}>
                        Comparison {metric.candidateId}: {Math.round(metric.successRate * 100)}%
                        success · {Math.round(metric.weightedScore * 100)} weighted
                      </p>
                    ))}
                    {dimensions.comparison
                      ?.filter((item) => item.deltaVsOriginal)
                      .map((item) => (
                        <p key={`delta-${item.candidateId}`}>
                          vs Original {item.candidateId}:{' '}
                          {item.deltaVsOriginal!.successRate >= 0 ? '+' : ''}
                          {Math.round(item.deltaVsOriginal!.successRate * 100)} points success ·{' '}
                          {item.deltaVsOriginal!.weightedScore >= 0 ? '+' : ''}
                          {Math.round(item.deltaVsOriginal!.weightedScore * 100)} weighted
                        </p>
                      ))}
                  </>
                );
              })()}
              {run.results.map((result) => (
                <p key={result.id}>
                  {result.label ?? result.candidateId ?? 'candidate'}:{' '}
                  {result.weightedTotal ?? 'n/a'} · {result.status} ·{' '}
                  {result.scoreData
                    ? (
                        JSON.parse(result.scoreData) as {
                          executions?: Array<{ caseId: string; passed: boolean }>;
                        }
                      ).executions
                        ?.map((item) => `${item.caseId}:${item.passed ? 'PASS' : 'FAIL'}`)
                        .join(', ')
                    : 'no cases'}
                </p>
              ))}
            </article>
          ))
        )}
      </section>
    </main>
  );
}
