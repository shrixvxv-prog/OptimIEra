import { loadOptimizationResult, serializeCandidateForApi } from '@/lib/optimization';
import { safeRouteError } from '@/lib/route-errors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ optimizationId: string }> },
) {
  try {
    const { optimizationId } = await params;
    const result = await loadOptimizationResult(optimizationId);
    return Response.json({
      id: result.id,
      status: result.status,
      providerName: result.providerName,
      providerType: result.providerType,
      mode: result.mode,
      analysis: result.analysis,
      requestMetadata: result.requestMetadata,
      candidates: result.candidates.map(serializeCandidateForApi),
      evaluation: result.evaluation,
      diff: result.diff,
      savedPromptVersionId: result.savedPromptVersionId,
    });
  } catch (error) {
    return safeRouteError(error);
  }
}
