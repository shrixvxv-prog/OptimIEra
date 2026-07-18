import { revokeOptimizationProof } from '@/lib/chain-proof';
import { safeRouteError } from '@/lib/route-errors';

export async function POST(
  request: Request,
  context: { params: Promise<{ optimizationId: string }> },
) {
  try {
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const proof = await revokeOptimizationProof(
      (await context.params).optimizationId,
      body.reason ?? '',
    );
    return Response.json({ proof });
  } catch (error) {
    return safeRouteError(error);
  }
}
