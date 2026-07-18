import { db, decidePromptReview } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
import { safeRouteError } from '@/lib/route-errors';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  try {
    const session = await requireSession();
    const { reviewId } = await params;
    const review = await db.promptReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new Error('NOT_FOUND');
    const member = await db.member.findUnique({
      where: {
        organizationId_userId: { organizationId: review.workspaceId, userId: session.user.id },
      },
    });
    if (!member) throw new Error('NOT_FOUND');
    if (!['owner', 'admin', 'reviewer'].includes(member.role.toLowerCase()))
      throw new Error('FORBIDDEN');
    const body = await request.json();
    const updated = await decidePromptReview({
      workspaceId: review.workspaceId,
      reviewId,
      reviewerId: session.user.id,
      approve: Boolean(body.approve),
      note: typeof body.note === 'string' ? body.note : undefined,
    });
    return Response.json({ review: updated });
  } catch (error) {
    return safeRouteError(error);
  }
}
