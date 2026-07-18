export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    application: 'OptimIEra',
    version: '0.1.0',
    release: 'wave-2',
    schema: '20260718173000_wallet_siwe',
  });
}
