import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
import { decideReview } from '../actions';
import { ConfirmButton } from '@/components/confirm-form';
import { RedirectingActionForm } from '@/components/redirecting-action-form';

export default async function ReviewDetail({ params }: { params: Promise<{ reviewId: string }> }) {
  const session = await requireSession();
  const { reviewId } = await params;
  const review = await db.promptReview.findUnique({
    where: { id: reviewId },
    include: {
      promptVersion: {
        include: { prompt: true, parentVersion: { select: { id: true, versionNumber: true } } },
      },
      workspace: true,
    },
  });
  if (!review)
    return (
      <main className="appmain">
        <h1>Review not found</h1>
      </main>
    );
  const member = await db.member.findFirst({
    where: { organizationId: review.workspaceId, user: { email: session.user.email } },
  });
  if (!member) throw new Error('NOT_FOUND');
  return (
    <main className="appmain">
      <div className="eyebrow">{review.workspace.name} / Review</div>
      <h1>{review.promptVersion.prompt.title}</h1>
      <div className="card">
        <p>
          Version {review.promptVersion.versionNumber} · parent{' '}
          {review.promptVersion.parentVersion?.versionNumber ?? 'none'}
        </p>
        <p className="muted">
          {review.promptVersion.changeSummary ?? 'No change summary provided.'}
        </p>
        <p>
          State: <span className="status-pill">{review.status}</span>
        </p>
        {review.status === 'REQUESTED' && (
          <RedirectingActionForm action={decideReview}>
            <input type="hidden" name="workspaceId" value={review.workspaceId} />
            <input type="hidden" name="reviewId" value={review.id} />
            <label>
              Review note
              <textarea name="note" />
            </label>
            <div className="actions">
              <ConfirmButton message="Approve this review?" name="decision" value="approve">
                Approve
              </ConfirmButton>
              <ConfirmButton message="Reject this review?" name="decision" value="reject">
                Reject
              </ConfirmButton>
            </div>
          </RedirectingActionForm>
        )}
      </div>
    </main>
  );
}
