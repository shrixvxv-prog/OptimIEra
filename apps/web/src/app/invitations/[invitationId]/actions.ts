'use server';

import { redirect } from 'next/navigation';
import { acceptWorkspaceInvitation, db, rejectWorkspaceInvitation } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';

export async function acceptInvitation(formData: FormData) {
  const session = await requireSession();
  const invitation = await db.invitation.findUnique({
    where: { id: String(formData.get('invitationId')) },
    include: { organization: true },
  });
  if (!invitation) throw new Error('NOT_FOUND');
  await acceptWorkspaceInvitation({
    invitationId: invitation.id,
    userId: session.user.id,
    email: session.user.email,
  });
  redirect(`/app/workspaces/${invitation.organization.slug}/members`);
}

export async function rejectInvitation(formData: FormData) {
  const session = await requireSession();
  const invitation = await db.invitation.findUnique({
    where: { id: String(formData.get('invitationId')) },
    include: { organization: true },
  });
  if (!invitation) throw new Error('NOT_FOUND');
  await rejectWorkspaceInvitation({
    invitationId: invitation.id,
    userId: session.user.id,
    email: session.user.email,
  });
  redirect('/app/workspaces');
}
