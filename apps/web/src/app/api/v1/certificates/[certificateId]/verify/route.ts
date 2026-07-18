import { verifyOptimizationCertificate } from '@/lib/certificate';
import { safeRouteError } from '@/lib/route-errors';

export async function POST(
  _request: Request,
  context: { params: Promise<{ certificateId: string }> },
) {
  try {
    return Response.json(await verifyOptimizationCertificate((await context.params).certificateId));
  } catch (error) {
    return safeRouteError(error);
  }
}
