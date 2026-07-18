import { retryOptimization } from '@/lib/optimization';
import { safeRouteError } from '@/lib/route-errors';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ optimizationId: string }> },
) {
  try {
    const { optimizationId } = await params;
    const result = await retryOptimization(
      optimizationId,
      request.headers.get('x-optimiera-payment-tx') ?? undefined,
    );
    return Response.json({ optimizationId: result.job.id, status: result.job.status });
  } catch (error) {
    return safeRouteError(error);
  }
}
