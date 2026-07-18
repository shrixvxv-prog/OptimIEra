'use server';

import { redirect } from 'next/navigation';
import {
  changeWorkspaceMemberRole,
  createWorkspaceInvitation,
  db,
  removeWorkspaceMember,
  revokeWorkspaceInvitation,
} from '@optimiera/database';
import { requireSession } from '@/lib/authorization';

async function workspaceContext(workspaceSlug: string) {
  const session = await requireSession();
  const workspace = await db.organization.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) throw new Error('NOT_FOUND');
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: workspace.id, userId: session.user.id } },
  });
  if (!member) throw new Error('FORBIDDEN');
  return { session, workspace, member };
}

export async function inviteMember(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug'));
  const { session, workspace, member } = await workspaceContext(workspaceSlug);
  await createWorkspaceInvitation({
    workspaceId: workspace.id,
    inviterId: session.user.id,
    inviterRole: member.role,
    email: String(formData.get('email')),
    role: String(formData.get('role') ?? 'viewer'),
  });
  redirect(`/app/workspaces/${workspaceSlug}/members`);
}

export async function changeRole(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug'));
  const { session, workspace, member } = await workspaceContext(workspaceSlug);
  await changeWorkspaceMemberRole({
    workspaceId: workspace.id,
    actorUserId: session.user.id,
    actorRole: member.role,
    memberId: String(formData.get('memberId')),
    role: String(formData.get('role')),
  });
  redirect(`/app/workspaces/${workspaceSlug}/members`);
}

export async function removeMember(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug'));
  const { session, workspace, member } = await workspaceContext(workspaceSlug);
  await removeWorkspaceMember({
    workspaceId: workspace.id,
    actorUserId: session.user.id,
    actorRole: member.role,
    memberId: String(formData.get('memberId')),
  });
  redirect(`/app/workspaces/${workspaceSlug}/members`);
}

export async function revokeInvitation(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug'));
  const { session, workspace, member } = await workspaceContext(workspaceSlug);
  await revokeWorkspaceInvitation({
    invitationId: String(formData.get('invitationId')),
    actorUserId: session.user.id,
    actorRole: member.role,
  });
  redirect(`/app/workspaces/${workspaceSlug}/members`);
}
