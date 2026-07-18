import { db, listWorkspaceInvitations, listWorkspaceMembers } from '@optimiera/database';
import { can, requireSession } from '@/lib/authorization';
import { changeRole, inviteMember, removeMember, revokeInvitation } from './actions';
import { ConfirmButton } from '@/components/confirm-form';

export default async function Members({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const session = await requireSession();
  const workspace = await db.organization.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) throw new Error('NOT_FOUND');
  const current = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: workspace.id, userId: session.user.id } },
  });
  if (!current) throw new Error('FORBIDDEN');
  const [members, invitations] = await Promise.all([
    listWorkspaceMembers(workspace.id),
    listWorkspaceInvitations(workspace.id),
  ]);
  const canManage = can(current.role.toUpperCase() as never, 'members:manage' as never);
  return (
    <main className="appmain">
      <div className="eyebrow">Workspace / {workspaceSlug} / Members</div>
      <h1>Members & roles</h1>
      <p className="lede">Workspace access is enforced on the server for every mutation.</p>
      <section className="grid">
        <div className="card">
          <h3>Members</h3>
          {members.length === 0 ? (
            <p className="muted">No members found.</p>
          ) : (
            members.map((member) => (
              <div
                className="actions"
                key={member.id}
                style={{
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--line)',
                  padding: '12px 0',
                }}
              >
                <span>
                  {member.user.name} · {member.user.email}
                </span>
                <span className="status-pill">{member.role.toUpperCase()}</span>
                {canManage && member.role.toLowerCase() !== 'owner' && (
                  <>
                    <form action={changeRole}>
                      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
                      <input type="hidden" name="memberId" value={member.id} />
                      <select name="role" defaultValue={member.role}>
                        <option>viewer</option>
                        <option>reviewer</option>
                        <option>editor</option>
                        <option>admin</option>
                      </select>
                      <ConfirmButton message="Change this member's role?">
                        Change role
                      </ConfirmButton>
                    </form>
                    <form action={removeMember}>
                      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
                      <input type="hidden" name="memberId" value={member.id} />
                      <ConfirmButton message="Remove this member from the workspace?">
                        Remove
                      </ConfirmButton>
                    </form>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        <div className="card">
          <h3>Invite a member</h3>
          {canManage ? (
            <form action={inviteMember}>
              <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
              <label>
                Email
                <input type="email" name="email" required />
              </label>
              <label>
                Role
                <select name="role" defaultValue="viewer">
                  <option>viewer</option>
                  <option>reviewer</option>
                  <option>editor</option>
                  <option>admin</option>
                </select>
              </label>
              <button className="button primary" type="submit">
                Create invitation
              </button>
            </form>
          ) : (
            <p className="muted">Your role cannot manage members or invitations.</p>
          )}
        </div>
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <h3>Pending invitations</h3>
        {invitations.length === 0 ? (
          <p className="muted">No invitations yet.</p>
        ) : (
          invitations.map((invitation) => (
            <div
              className="actions"
              key={invitation.id}
              style={{ justifyContent: 'space-between' }}
            >
              <span>{invitation.email}</span>
              <span className="status-pill">{invitation.state}</span>
              {canManage && invitation.state === 'pending' && (
                <form action={revokeInvitation}>
                  <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
                  <input type="hidden" name="invitationId" value={invitation.id} />
                  <ConfirmButton message="Revoke this invitation?">Revoke</ConfirmButton>
                </form>
              )}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
