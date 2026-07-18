import { finalizeOptimizationEvidence, getEvidenceForOptimization } from '@/lib/evidence';
import { safeRouteError } from '@/lib/route-errors';

export async function GET(
  _request: Request,
  context: { params: Promise<{ optimizationId: string }> },
) {
  try {
    const { optimizationId } = await context.params;
    const artifact = await getEvidenceForOptimization(optimizationId);
    return Response.json({ artifact });
  } catch (error) {
    return safeRouteError(error);
  }
}
export async function POST(
  _request: Request,
  context: { params: Promise<{ optimizationId: string }> },
) {
  try {
    const { optimizationId } = await context.params;
    const artifact = await finalizeOptimizationEvidence(optimizationId);
    return Response.json({ artifact }, { status: 201 });
  } catch (error) {
    return safeRouteError(error);
  }
}
