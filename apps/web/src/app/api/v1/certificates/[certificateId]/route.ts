import { getAuthenticatedCertificate } from '@/lib/certificate';
import { safeRouteError } from '@/lib/route-errors';

export async function GET(
  _request: Request,
  context: { params: Promise<{ certificateId: string }> },
) {
  try {
    return Response.json({
      certificate: await getAuthenticatedCertificate((await context.params).certificateId),
    });
  } catch (error) {
    return safeRouteError(error);
  }
}
