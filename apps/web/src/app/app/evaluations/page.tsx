import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';

export default async function Evaluations() {
  const session = await requireSession();
  const workspaceIds = (
    await db.member.findMany({
      where: { userId: session.user.id },
      select: { organizationId: true },
    })
  ).map(({ organizationId }) => organizationId);
  const jobs = await db.optimizationJob.findMany({
    where: { workspaceId: { in: workspaceIds }, status: 'SUCCEEDED' },
    orderBy: { completedAt: 'desc' },
    take: 50,
  });
  return (
    <main className="appmain">
      <div className="eyebrow">Evaluation history</div>
      <h1>Measured improvements</h1>
      {jobs.length ? (
        <div className="stack">
          {jobs.map((job) => (
            <a className="card" href={`/app/optimizations/${job.id}`} key={job.id}>
              <h2>{job.mode}</h2>
              <p>{job.providerName}</p>
              <p className="muted">
                Score {job.originalScore ?? '—'} → {job.recommendedScore ?? '—'}
              </p>
            </a>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <h2>No evaluations yet</h2>
          <p>
            Run an optimization to compare three candidates with deterministic dimension scores.
          </p>
          <a className="button primary" href="/app/optimize">
            Start optimizing
          </a>
        </div>
      )}
    </main>
  );
}
