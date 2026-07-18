import { randomUUID } from 'node:crypto';
import { safeRouteError } from '@/lib/route-errors';
import { loadOptimizationResult, runOptimization } from '@/lib/optimization';
import { db, listOptimizationsForWorkspace } from '@optimiera/database';
import { requireSession } from '@/lib/authorization';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await runOptimization({
      request: body,
      providerType: body.providerType,
      paymentTxHash: request.headers.get('x-optimiera-payment-tx') ?? undefined,
      idempotencyKey: request.headers.get('idempotency-key') ?? randomUUID(),
      requestId: request.headers.get('x-request-id') ?? undefined,
    });
    return Response.json({ optimizationId: result.job.id, status: result.job.status });
  } catch (error) {
    return safeRouteError(error);
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const workspaceId = new URL(request.url).searchParams.get('workspaceId');
    if (!workspaceId) throw new Error('VALIDATION_ERROR');
    const member = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: workspaceId, userId: session.user.id } },
    });
    if (!member) throw new Error('FORBIDDEN');
    const jobs = await listOptimizationsForWorkspace(workspaceId);
    return Response.json({
      jobs: jobs.map((job) => ({
        id: job.id,
        status: job.status,
        mode: job.mode,
        providerName: job.providerName,
        originalScore: job.originalScore,
        recommendedScore: job.recommendedScore,
        createdAt: job.createdAt,
        recommendedCandidateId: job.recommendedCandidateId,
      })),
    });
  } catch (error) {
    return safeRouteError(error);
  }
}

export async function HEAD(request: Request) {
  try {
    const optimizationId = new URL(request.url).searchParams.get('id');
    if (!optimizationId) throw new Error('VALIDATION_ERROR');
    const result = await loadOptimizationResult(optimizationId);
    return new Response(null, {
      status: result.status === 'SUCCEEDED' ? 204 : 202,
      headers: { 'x-optimization-status': result.status },
    });
  } catch (error) {
    return safeRouteError(error);
  }
}
