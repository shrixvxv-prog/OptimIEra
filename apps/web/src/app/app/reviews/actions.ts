'use server';

import { db, decidePromptReview, requestPromptReview } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
import { redirect } from 'next/navigation';

async function workspaceMember(workspaceId: string) {
  const session = await requireSession();
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: workspaceId, userId: session.user.id } },
  });
  if (!member) throw new Error('FORBIDDEN');
  return { session, member };
}

export async function requestReview(formData: FormData) {
  const workspaceId = String(formData.get('workspaceId'));
  const { session, member } = await workspaceMember(workspaceId);
  if (!['owner', 'admin', 'editor'].includes(member.role.toLowerCase()))
    throw new Error('FORBIDDEN');
  await requestPromptReview({
    workspaceId,
    promptVersionId: String(formData.get('versionId')),
    reviewerId: String(formData.get('reviewerId')),
    actorUserId: session.user.id,
  });
  redirect('/app/reviews');
}

export async function decideReview(formData: FormData) {
  const workspaceId = String(formData.get('workspaceId'));
  const { session, member } = await workspaceMember(workspaceId);
  if (!['owner', 'admin', 'reviewer'].includes(member.role.toLowerCase()))
    throw new Error('FORBIDDEN');
  await decidePromptReview({
    workspaceId,
    reviewId: String(formData.get('reviewId')),
    reviewerId: session.user.id,
    approve: String(formData.get('decision')) === 'approve',
    note: String(formData.get('note') ?? ''),
  });
  return `/app/reviews/${String(formData.get('reviewId'))}`;
}
