import { createProjectForWorkspace, db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
import { safeRouteError } from '@/lib/route-errors';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  try {
    const session = await requireSession();
    const { workspaceSlug } = await params;
    const workspace = await db.organization.findUnique({ where: { slug: workspaceSlug } });
    if (!workspace) throw new Error('NOT_FOUND');
    const member = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: workspace.id, userId: session.user.id } },
    });
    if (!member) throw new Error('NOT_FOUND');
    if (!['owner', 'admin', 'editor'].includes(member.role.toLowerCase()))
      throw new Error('FORBIDDEN');
    const body = await request.json();
    const project = await createProjectForWorkspace({
      workspaceId: workspace.id,
      createdById: session.user.id,
      name: String(body.name),
      slug: String(body.slug),
    });
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return safeRouteError(error);
  }
}
