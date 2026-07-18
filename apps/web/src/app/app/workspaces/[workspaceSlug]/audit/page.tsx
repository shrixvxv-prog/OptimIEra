import { db, listWorkspaceAuditEvents } from '@optimiera/database';
import { can, requireSession } from '@/lib/authorization';

export default async function Audit({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ action?: string; resourceType?: string; page?: string }>;
}) {
  const session = await requireSession();
  const { workspaceSlug } = await params;
  const filters = await searchParams;
  const workspace = await db.organization.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) throw new Error('NOT_FOUND');
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: workspace.id, userId: session.user.id } },
  });
  if (!member || !can(member.role.toUpperCase() as never, 'members:manage' as never))
    throw new Error('FORBIDDEN');
  const result = await listWorkspaceAuditEvents({
    workspaceId: workspace.id,
    action: filters.action,
    resourceType: filters.resourceType,
    page: Number(filters.page ?? 1),
  });
  return (
    <main className="appmain">
      <div className="eyebrow">Workspace / {workspaceSlug} / Audit</div>
      <h1>Audit log</h1>
      <form className="actions" method="get">
        <label>
          Action
          <input name="action" defaultValue={filters.action} />
        </label>
        <label>
          Resource type
          <input name="resourceType" defaultValue={filters.resourceType} />
        </label>
        <button className="button" type="submit">
          Filter
        </button>
      </form>
      <div className="card" style={{ marginTop: 16 }}>
        <div role="table">
          {result.events.length === 0 ? (
            <p className="muted">No audit events match these filters.</p>
          ) : (
            result.events.map((event) => (
              <div key={event.id} style={{ borderTop: '1px solid var(--line)', padding: '14px 0' }}>
                <strong>{event.action}</strong>
                <p className="muted">
                  {event.createdAt.toISOString()} · {event.resourceType} ·{' '}
                  {event.resourceId ?? 'workspace'} · actor {event.actor?.name ?? 'system'}
                </p>
                {event.requestId && <p className="muted">Request {event.requestId}</p>}
                <p className="muted">{event.safeMetadata ?? 'No metadata'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
