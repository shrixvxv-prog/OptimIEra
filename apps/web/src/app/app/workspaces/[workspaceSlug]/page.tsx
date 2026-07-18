import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';

export default async function Workspace({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const session = await requireSession();
  const workspace = await db.organization.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) throw new Error('NOT_FOUND');
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: workspace.id, userId: session.user.id } },
  });
  if (!member) throw new Error('NOT_FOUND');
  return (
    <main className="appmain">
      <div className="eyebrow">Workspace / {workspaceSlug}</div>
      <h1>Prompt registry</h1>
      <div className="grid">
        <a className="card" href={`/app/workspaces/${workspaceSlug}/projects/new`}>
          <h3>Projects</h3>
          <p className="muted">Workspace-scoped project registry.</p>
        </a>
        <a className="card" href="/app/prompts">
          <h3>Prompts</h3>
          <p className="muted">Versioned prompt assets and review state.</p>
        </a>
        <a className="card" href={`/app/workspaces/${workspaceSlug}/members`}>
          <h3>Members</h3>
          <p className="muted">Workspace roles and invitations.</p>
        </a>
      </div>
    </main>
  );
}
