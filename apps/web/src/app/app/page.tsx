import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';

export default async function App() {
  const session = await requireSession();
  const workspaceIds = (
    await db.member.findMany({
      where: { userId: session.user.id },
      select: { organizationId: true },
    })
  ).map((member) => member.organizationId);
  const [projects, prompts, versions, completed, failed, recent] = await Promise.all([
    db.project.count({ where: { workspaceId: { in: workspaceIds }, archivedAt: null } }),
    db.prompt.count({ where: { workspaceId: { in: workspaceIds }, archivedAt: null } }),
    db.promptVersion.count({ where: { workspaceId: { in: workspaceIds } } }),
    db.optimizationJob.count({ where: { workspaceId: { in: workspaceIds }, status: 'SUCCEEDED' } }),
    db.optimizationJob.count({ where: { workspaceId: { in: workspaceIds }, status: 'FAILED' } }),
    db.optimizationJob.findMany({
      where: { workspaceId: { in: workspaceIds } },
      include: { candidates: { where: { recommended: true }, take: 1 } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);
  const improvements = recent
    .filter((job) => job.originalScore !== null && job.recommendedScore !== null)
    .map((job) => Number(job.recommendedScore) - Number(job.originalScore));
  const averageImprovement = improvements.length
    ? Math.round(improvements.reduce((total, value) => total + value, 0) / improvements.length)
    : 0;

  return (
    <main className="appmain">
      <div className="eyebrow">OptimIEra Studio</div>
      <h1>Optimization dashboard</h1>
      <p className="lede">Real workspace metrics from your local database.</p>
      <div className="grid">
        <div className="card">
          <h3>Projects</h3>
          <p className="score">{projects}</p>
        </div>
        <div className="card">
          <h3>Prompts</h3>
          <p className="score">{prompts}</p>
        </div>
        <div className="card">
          <h3>Prompt versions</h3>
          <p className="score">{versions}</p>
        </div>
        <div className="card">
          <h3>Optimizations</h3>
          <p className="score">{completed}</p>
          <p className="muted">{failed} failed</p>
        </div>
        <div className="card">
          <h3>Average score lift</h3>
          <p className="score">{averageImprovement}</p>
        </div>
      </div>
      <section className="card">
        <h3>Recently optimized prompts</h3>
        {recent.length ? (
          <ul>
            {recent.map((job) => (
              <li key={job.id}>
                <a href={`/app/optimizations/${job.id}`}>
                  {job.mode} / {job.providerName} / {job.status}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No optimizations have been run yet.</p>
        )}
      </section>
    </main>
  );
}
