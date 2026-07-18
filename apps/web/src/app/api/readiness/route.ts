import { readWave2RuntimeConfig } from '../../../lib/runtime-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function encryptionReady() {
  const key = process.env.OPTIMIERA_ENCRYPTION_MASTER_KEY;
  if (!key) return false;
  try {
    return Buffer.from(key, 'base64').byteLength === 32;
  } catch {
    return false;
  }
}

export async function GET() {
  const checks: Record<string, 'ready' | 'not_ready'> = {
    database: 'not_ready',
    auth: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET ? 'ready' : 'not_ready',
    encryption: encryptionReady() ? 'ready' : 'not_ready',
  };
  try {
    const { databaseHealth } = await import('@optimiera/database');
    checks.database = (await databaseHealth()).status === 'ok' ? 'ready' : 'not_ready';
  } catch {
    checks.database = 'not_ready';
  }
  const runtimeConfig = readWave2RuntimeConfig();
  const ready = Object.values(checks).every((value) => value === 'ready');
  return Response.json(
    {
      status: ready ? 'ready' : 'not_ready',
      checks,
      demoMode: runtimeConfig.demoMode,
      liveWritesEnabled: runtimeConfig.liveWritesEnabled,
    },
    { status: ready ? 200 : 503 },
  );
}
