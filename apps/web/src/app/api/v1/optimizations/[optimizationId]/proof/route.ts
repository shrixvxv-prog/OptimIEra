import {
  createLocalProofCommitment,
  getProofForOptimization,
  registerOptimizationProof,
} from '@/lib/chain-proof';
import { safeRouteError } from '@/lib/route-errors';

export async function GET(
  _request: Request,
  context: { params: Promise<{ optimizationId: string }> },
) {
  try {
    return Response.json({
      proof: await getProofForOptimization((await context.params).optimizationId),
    });
  } catch (error) {
    return safeRouteError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ optimizationId: string }> },
) {
  try {
    const { optimizationId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { register?: boolean };
    const proof = body.register
      ? await registerOptimizationProof(optimizationId)
      : await createLocalProofCommitment(optimizationId);
    return Response.json({ proof }, { status: 201 });
  } catch (error) {
    return safeRouteError(error);
  }
}
