'use server';

import { createPromptWithInitialVersion, db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
import { redirect } from 'next/navigation';

export async function createPrompt(formData: FormData) {
  const session = await requireSession();
  const workspaceSlug = String(formData.get('workspaceSlug'));
  const workspace = await db.organization.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) throw new Error('NOT_FOUND');
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: workspace.id, userId: session.user.id } },
  });
  if (!member) throw new Error('FORBIDDEN');
  if (!['owner', 'admin', 'editor'].includes(member.role.toLowerCase()))
    throw new Error('FORBIDDEN');
  const result = await createPromptWithInitialVersion({
    workspaceId: workspace.id,
    projectId: String(formData.get('projectId')),
    createdById: session.user.id,
    title: String(formData.get('title')),
    content: String(formData.get('content')),
  });
  redirect(`/app/prompts/${result.prompt.id}`);
}
