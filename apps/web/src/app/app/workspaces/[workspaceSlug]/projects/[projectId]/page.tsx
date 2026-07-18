import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';

export default async function Project({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const session = await requireSession();
  const { workspaceSlug, projectId } = await params;
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      workspace: { slug: workspaceSlug, members: { some: { userId: session.user.id } } },
    },
    include: {
      prompts: true,
    },
  });
  if (!project) throw new Error('NOT_FOUND');
  const optimizations = await db.optimizationJob.findMany({
    where: { workspaceId: project.workspaceId, projectId: project.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  return (
    <main className="appmain">
      <div className="eyebrow">Workspace / {workspaceSlug} / Project</div>
      <h1>{project.name}</h1>
      <p className="lede">{project.description ?? 'No description.'}</p>
      <div className="card">
        <h3>Prompts</h3>
        {project.prompts.length === 0 ? (
          <p className="muted">No prompts yet.</p>
        ) : (
          project.prompts.map((prompt) => (
            <a className="button" href={`/app/prompts/${prompt.id}`} key={prompt.id}>
              {prompt.title}
            </a>
          ))
        )}
      </div>
      <div className="card">
        <h3>Optimization history</h3>
        {optimizations.length ? (
          <ul>
            {optimizations.map((job) => (
              <li key={job.id}>
                <a href={`/app/optimizations/${job.id}`}>
                  {job.status} / {job.mode} / {job.providerName} / saved{' '}
                  {job.savedPromptVersionId ?? 'not selected'}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No optimizations have been run for this project.</p>
        )}
      </div>
    </main>
  );
}
