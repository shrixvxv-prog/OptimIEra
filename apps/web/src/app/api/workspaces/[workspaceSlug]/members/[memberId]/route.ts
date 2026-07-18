import { changeWorkspaceMemberRole, db, removeWorkspaceMember } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
import { safeRouteError } from '@/lib/route-errors';

async function context(workspaceSlug: string) {
  const session = await requireSession();
  const workspace = await db.organization.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) throw new Error('NOT_FOUND');
  const actor = await db.member.findUnique({
    where: { organizationId_userId: { organizationId: workspace.id, userId: session.user.id } },
  });
  if (!actor) throw new Error('NOT_FOUND');
  return { session, workspace, actor };
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string; memberId: string }> },
) {
  try {
    const { workspaceSlug, memberId } = await params;
    const { session, workspace, actor } = await context(workspaceSlug);
    const body = await request.json();
    const member = await changeWorkspaceMemberRole({
      workspaceId: workspace.id,
      actorUserId: session.user.id,
      actorRole: actor.role,
      memberId,
      role: String(body.role),
    });
    return Response.json({ member });
  } catch (error) {
    return safeRouteError(error);
  }
}
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceSlug: string; memberId: string }> },
) {
  try {
    const { workspaceSlug, memberId } = await params;
    const { session, workspace, actor } = await context(workspaceSlug);
    const member = await removeWorkspaceMember({
      workspaceId: workspace.id,
      actorUserId: session.user.id,
      actorRole: actor.role,
      memberId,
    });
    return Response.json({ member });
  } catch (error) {
    return safeRouteError(error);
  }
}
