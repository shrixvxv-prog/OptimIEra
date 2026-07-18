'use server';

import { createPromptVersionForWorkspace, db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';

export async function createVersion(formData: FormData) {
  const session = await requireSession();
  const prompt = await db.prompt.findFirst({
    where: {
      id: String(formData.get('promptId')),
      workspace: { members: { some: { userId: session.user.id } } },
    },
  });
  if (!prompt) throw new Error('NOT_FOUND');
  const member = await db.member.findUnique({
    where: {
      organizationId_userId: { organizationId: prompt.workspaceId, userId: session.user.id },
    },
  });
  if (!member || !['owner', 'admin', 'editor'].includes(member.role.toLowerCase()))
    throw new Error('FORBIDDEN');
  const version = await createPromptVersionForWorkspace({
    workspaceId: prompt.workspaceId,
    promptId: prompt.id,
    createdById: session.user.id,
    content: String(formData.get('content')),
    changeSummary: String(formData.get('changeSummary')),
  });
  return `/app/prompts/${prompt.id}/versions/${version.id}`;
}
