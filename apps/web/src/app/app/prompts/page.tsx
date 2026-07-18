import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';

export default async function Prompts({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireSession();
  const { q = '' } = await searchParams;
  const workspaceIds = (
    await db.member.findMany({
      where: { userId: session.user.id },
      select: { organizationId: true },
    })
  ).map(({ organizationId }) => organizationId);
  const prompts = await db.prompt.findMany({
    where: {
      workspaceId: { in: workspaceIds },
      archivedAt: null,
      ...(q.trim() ? { title: { contains: q.trim(), mode: 'insensitive' } } : {}),
    },
    include: { project: { select: { name: true } }, versions: { select: { id: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  return (
    <main className="appmain">
      <div className="eyebrow">Prompt Registry</div>
      <h1>Your prompt assets</h1>
      <form className="toolbar" role="search">
        <label>
          Search prompts
          <input name="q" defaultValue={q} placeholder="Search by title" />
        </label>
        <button className="button" type="submit">
          Search
        </button>
      </form>
      {prompts.length ? (
        <div className="grid">
          {prompts.map((prompt) => (
            <a className="card" href={`/app/prompts/${prompt.id}`} key={prompt.id}>
              <h2>{prompt.title}</h2>
              <p>{prompt.project.name}</p>
              <p className="muted">
                {prompt.versions.length} immutable version(s) · {prompt.lifecycleStatus}
              </p>
            </a>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <h2>{q ? 'No prompts match your search' : 'Your registry is ready'}</h2>
          <p>
            {q
              ? 'Try a different title.'
              : 'Create a workspace and project, then add your first encrypted prompt.'}
          </p>
          {!q && (
            <a className="button primary" href="/app/workspaces">
              Open workspaces
            </a>
          )}
        </div>
      )}
    </main>
  );
}
