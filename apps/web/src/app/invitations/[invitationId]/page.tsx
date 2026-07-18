import { db, invitationState } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
import { acceptInvitation, rejectInvitation } from './actions';

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  const invitation = await db.invitation.findUnique({
    where: { id: invitationId },
    include: { organization: true },
  });
  if (!invitation)
    return (
      <main className="appmain">
        <h1>Invitation not found</h1>
        <p className="muted">This invitation may have been removed.</p>
      </main>
    );
  const state = invitationState(invitation.status, invitation.expiresAt);
  let session = null;
  try {
    session = await requireSession();
  } catch {
    /* public invitation details remain visible */
  }
  const matchingUser =
    session && session.user.email.toLowerCase() === invitation.email.toLowerCase();
  return (
    <main className="appmain">
      <div className="eyebrow">Workspace invitation</div>
      <h1>Join {invitation.organization.name}</h1>
      <p className="lede">
        Invitation for {invitation.email}. State: <span className="status-pill">{state}</span>
      </p>
      {state !== 'pending' ? (
        <div className="card">
          <p>This invitation is no longer usable.</p>
        </div>
      ) : !session ? (
        <div className="card">
          <p>Sign in with the invited email to continue.</p>
          <a className="button primary" href="/sign-in">
            Sign in
          </a>
        </div>
      ) : !matchingUser ? (
        <div className="card">
          <p className="muted">The signed-in email does not match this invitation.</p>
        </div>
      ) : (
        <div className="actions">
          <form action={acceptInvitation}>
            <input type="hidden" name="invitationId" value={invitation.id} />
            <button className="button primary" type="submit">
              Accept invitation
            </button>
          </form>
          <form action={rejectInvitation}>
            <input type="hidden" name="invitationId" value={invitation.id} />
            <button className="button" type="submit">
              Reject invitation
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
