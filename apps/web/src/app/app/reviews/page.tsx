import { db } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';
import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Reviews() {
  noStore();
  let session;
  try {
    session = await requireSession();
  } catch {
    redirect('/sign-in?next=/app/reviews');
  }
  const reviews = await db.promptReview.findMany({
    // Assignment is the authorization boundary for the review queue. Workspace
    // membership is checked again by the detail/action handlers.
    where: { reviewerId: session.user.id },
    include: { promptVersion: { include: { prompt: true } }, workspace: true },
    orderBy: { createdAt: 'desc' },
  });
  return (
    <main className="appmain">
      <div className="eyebrow">Review queue</div>
      <h1>Prompt reviews</h1>
      {reviews.length === 0 ? (
        <div className="card">
          <p className="muted">No review requests yet.</p>
        </div>
      ) : (
        <div className="grid">
          {reviews.map((review) => (
            <a className="card" href={`/app/reviews/${review.id}`} key={review.id}>
              <span className="status-pill">{review.status}</span>
              <h3>{review.promptVersion.prompt.title}</h3>
              <p className="muted">
                {review.workspace.name} · version {review.promptVersion.versionNumber}
              </p>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
