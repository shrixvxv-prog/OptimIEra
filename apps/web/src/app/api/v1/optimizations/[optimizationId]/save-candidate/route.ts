import { saveOptimizationCandidate } from '@/lib/optimization';
import { safeRouteError } from '@/lib/route-errors';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ optimizationId: string }> },
) {
  try {
    const { optimizationId } = await params;
    const body = await request.json();
    const version = await saveOptimizationCandidate({
      optimizationJobId: optimizationId,
      candidateId: String(body.candidateId ?? ''),
      changeSummary: body.changeSummary ? String(body.changeSummary) : undefined,
      submitForReview: Boolean(body.submitForReview),
    });
    return Response.json({ promptVersionId: version.id, promptId: version.promptId });
  } catch (error) {
    return safeRouteError(error);
  }
}
