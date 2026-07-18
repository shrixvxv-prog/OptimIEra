import { db, listPromptVersionsForWorkspace } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
import { requestReview } from '../../reviews/actions';

export default async function Prompt({ params }: { params: Promise<{ promptId: string }> }) {
  const session = await requireSession();
  const { promptId } = await params;
  const prompt = await db.prompt.findFirst({
    where: { id: promptId, workspace: { members: { some: { userId: session.user.id } } } },
  });
  if (!prompt)
    return (
      <main className="appmain">
        <h1>Prompt not found</h1>
        <p className="muted">This prompt is not available in your workspace.</p>
      </main>
    );
  const [versions, reviewers, optimizations] = await Promise.all([
    listPromptVersionsForWorkspace(prompt.workspaceId, prompt.id),
    db.member.findMany({
      where: { organizationId: prompt.workspaceId, role: { in: ['owner', 'admin', 'reviewer'] } },
      include: { user: { select: { id: true, name: true } } },
    }),
    db.optimizationJob.findMany({
      where: { workspaceId: prompt.workspaceId, promptId: prompt.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);
  return (
    <main className="appmain">
      <div className="eyebrow">Prompt Registry</div>
      <h1>{prompt.title}</h1>
      <p className="lede">Immutable encrypted versions and review history.</p>
      <div className="actions">
        <a className="button" href={`/app/prompts/${prompt.id}/versions/new`}>
          Create new version
        </a>
        <a className="button" href="/app/optimize">
          Optimize
        </a>
      </div>
      <div className="card">
        <h3>Versions</h3>
        {versions.map((version) => (
          <div className="actions" key={version.id} style={{ justifyContent: 'space-between' }}>
            <a href={`/app/prompts/${prompt.id}/versions/${version.id}`}>
              Version {version.versionNumber}
            </a>
            <span className="status-pill">{version.lifecycleStatus}</span>
            {version.lifecycleStatus === 'DRAFT' && reviewers.length > 0 && (
              <form action={requestReview}>
                <input type="hidden" name="workspaceId" value={prompt.workspaceId} />
                <input type="hidden" name="versionId" value={version.id} />
                <select name="reviewerId" defaultValue={reviewers[0].userId}>
                  {reviewers.map((reviewer) => (
                    <option key={reviewer.userId} value={reviewer.userId}>
                      {reviewer.user.name}
                    </option>
                  ))}
                </select>
                <button className="button" type="submit">
                  Request review
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Optimization history</h3>
        {optimizations.length ? (
          <ul>
            {optimizations.map((job) => (
              <li key={job.id}>
                <a href={`/app/optimizations/${job.id}`}>
                  {job.status} / {job.mode} / {job.providerName} / original{' '}
                  {job.originalScore ?? 'n/a'} / recommended {job.recommendedScore ?? 'n/a'}
                </a>
                {job.savedPromptVersionId && (
                  <a
                    className="button"
                    href={`/app/prompts/${prompt.id}/versions/${job.savedPromptVersionId}`}
                  >
                    Saved version
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No optimization history yet.</p>
        )}
      </div>
    </main>
  );
}
