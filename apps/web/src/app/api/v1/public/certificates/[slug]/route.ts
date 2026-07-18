import { verifyOptimizationCertificate } from '@/lib/certificate';
import { safeRouteError } from '@/lib/route-errors';

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    return Response.json(await verifyOptimizationCertificate((await context.params).slug));
  } catch (error) {
    return safeRouteError(error);
  }
}
