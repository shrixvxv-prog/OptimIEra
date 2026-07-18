import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';

export default async function PromptVersion({
  params,
}: {
  params: Promise<{ promptId: string; versionId: string }>;
}) {
  const session = await requireSession();
  const { promptId, versionId } = await params;
  const version = await db.promptVersion.findFirst({
    where: {
      id: versionId,
      promptId,
      prompt: { workspace: { members: { some: { userId: session.user.id } } } },
    },
    include: { prompt: true, parentVersion: { select: { versionNumber: true } } },
  });
  if (!version)
    return (
      <main className="appmain">
        <h1>Version not found</h1>
      </main>
    );
  return (
    <main className="appmain">
      <div className="eyebrow">Prompt / Version {version.versionNumber}</div>
      <h1>{version.prompt.title}</h1>
      <div className="card">
        <p>
          State: <span className="status-pill">{version.lifecycleStatus}</span>
        </p>
        <p>Parent version: {version.parentVersion?.versionNumber ?? 'none'}</p>
        <p>Change summary: {version.changeSummary ?? 'None'}</p>
        <p className="muted">
          Content is encrypted at rest and is not rendered in this metadata view.
        </p>
      </div>
    </main>
  );
}
