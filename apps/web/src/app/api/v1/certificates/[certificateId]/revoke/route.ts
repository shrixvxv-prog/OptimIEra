import { revokeOptimizationCertificate } from '@/lib/certificate';
import { safeRouteError } from '@/lib/route-errors';

export async function POST(
  request: Request,
  context: { params: Promise<{ certificateId: string }> },
) {
  try {
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const reason = String(body.reason ?? '').trim();
    if (!reason) throw new Error('VALIDATION_ERROR');
    return Response.json({
      certificate: await revokeOptimizationCertificate(
        (await context.params).certificateId,
        reason,
      ),
    });
  } catch (error) {
    return safeRouteError(error);
  }
}
