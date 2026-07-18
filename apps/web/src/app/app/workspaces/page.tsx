import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';

export default async function Workspaces() {
  const session = await requireSession();
  const memberships = await db.member.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: 'asc' },
  });
  return (
    <main className="appmain">
      <div className="eyebrow">Workspace directory</div>
      <h1>Your workspaces</h1>
      <div className="actions">
        <a className="button primary" href="/app/workspaces/new">
          Create workspace
        </a>
      </div>
      {memberships.length ? (
        <div className="grid">
          {memberships.map(({ organization, role }) => (
            <a className="card" href={`/app/workspaces/${organization.slug}`} key={organization.id}>
              <h2>{organization.name}</h2>
              <p className="muted">{organization.slug}</p>
              <span className="status-pill">{role}</span>
            </a>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <h2>Create your first workspace</h2>
          <p>A workspace keeps projects, prompts, members, evidence, and certificates isolated.</p>
        </div>
      )}
    </main>
  );
}
