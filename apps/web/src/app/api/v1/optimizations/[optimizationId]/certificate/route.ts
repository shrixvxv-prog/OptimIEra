import { issueOptimizationCertificate } from '@/lib/certificate';
import { safeRouteError } from '@/lib/route-errors';

export async function POST(
  _request: Request,
  context: { params: Promise<{ optimizationId: string }> },
) {
  try {
    const result = await issueOptimizationCertificate((await context.params).optimizationId);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return safeRouteError(error);
  }
}
