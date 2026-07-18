'use server';

import { createProjectForWorkspace, db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
import { redirect } from 'next/navigation';

export async function createProject(formData: FormData) {
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
  const project = await createProjectForWorkspace({
    workspaceId: workspace.id,
    createdById: session.user.id,
    name: String(formData.get('name')),
    slug: String(formData.get('slug')),
    description: String(formData.get('description') ?? ''),
  });
  redirect(`/app/prompts/new?workspace=${workspace.slug}&project=${project.id}`);
}
