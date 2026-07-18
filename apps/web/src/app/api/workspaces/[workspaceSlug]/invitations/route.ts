import { createWorkspaceInvitation, db } from '@optimiera/database';
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
    const body = await request.json();
    const invitation = await createWorkspaceInvitation({
      workspaceId: workspace.id,
      inviterId: session.user.id,
      inviterRole: member.role,
      email: String(body.email),
      role: String(body.role ?? 'viewer'),
    });
    return Response.json({ invitation }, { status: 201 });
  } catch (error) {
    return safeRouteError(error);
  }
}
