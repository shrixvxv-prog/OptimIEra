import { retryOptimization } from '@/lib/optimization';
import { safeRouteError } from '@/lib/route-errors';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ optimizationId: string }> },
) {
  try {
    const { optimizationId } = await params;
    const result = await retryOptimization(optimizationId);
    return Response.json({ optimizationId: result.job.id, status: result.job.status });
  } catch (error) {
    return safeRouteError(error);
  }
}
