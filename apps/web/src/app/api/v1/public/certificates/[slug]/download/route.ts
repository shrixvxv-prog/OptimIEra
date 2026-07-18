import { publicCertificateJson, verifyOptimizationCertificate } from '@/lib/certificate';
import { safeRouteError } from '@/lib/route-errors';

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const slug = (await context.params).slug;
    const result = await verifyOptimizationCertificate(slug);
    return new Response(publicCertificateJson(result), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="optimiera-certificate-${slug}.json"`,
      },
    });
  } catch (error) {
    return safeRouteError(error);
  }
}
