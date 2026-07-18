import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';

export default async function Team() {
  const session = await requireSession();
  const memberships = await db.member.findMany({
    where: { userId: session.user.id },
    include: { organization: { include: { _count: { select: { members: true } } } } },
  });
  return (
    <main className="appmain">
      <div className="eyebrow">Team governance</div>
      <h1>Members and roles</h1>
      {memberships.length ? (
        <div className="grid">
          {memberships.map(({ organization, role }) => (
            <a
              className="card"
              href={`/app/workspaces/${organization.slug}/members`}
              key={organization.id}
            >
              <h2>{organization.name}</h2>
              <p>{organization._count.members} member(s)</p>
              <p className="muted">Your role: {role}</p>
            </a>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <h2>No workspace memberships</h2>
          <a className="button primary" href="/app/workspaces/new">
            Create workspace
          </a>
        </div>
      )}
    </main>
  );
}
