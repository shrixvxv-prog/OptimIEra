import 'dotenv/config';

const baseUrl = (process.env.PRODUCTION_SMOKE_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(
  /\/$/,
  '',
);

if (!baseUrl) {
  console.log(JSON.stringify({ status: 'SKIPPED', reason: 'PRODUCTION_SMOKE_URL_UNSET' }, null, 2));
  process.exit(0);
}

let parsed;
try {
  parsed = new URL(baseUrl);
} catch {
  console.error(
    JSON.stringify({ status: 'FAILED', reason: 'PRODUCTION_SMOKE_URL_INVALID' }, null, 2),
  );
  process.exit(1);
}

if (parsed.protocol !== 'https:' && process.env.ALLOW_HTTP_SMOKE !== 'true') {
  console.error(
    JSON.stringify({ status: 'FAILED', reason: 'PRODUCTION_SMOKE_REQUIRES_HTTPS' }, null, 2),
  );
  process.exit(1);
}

const checks = [
  ['/api/health', (body) => body?.status === 'ok'],
  ['/api/readiness', (body) => body?.status === 'ready'],
  ['/api/version', (body) => body?.application === 'OptimIEra'],
];
const results = [];
let failed = false;

for (const [path, validate] of checks) {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.json().catch(() => null);
    const passed = response.ok && validate(body);
    results.push({
      path,
      statusCode: response.status,
      result: passed ? 'PASS' : 'FAIL',
      latencyMs: Date.now() - started,
    });
    if (!passed) failed = true;
  } catch {
    failed = true;
    results.push({
      path,
      result: 'FAIL',
      reason: 'NETWORK_OR_TIMEOUT',
      latencyMs: Date.now() - started,
    });
  }
}

console.log(
  JSON.stringify(
    { status: failed ? 'FAILED' : 'PASS', baseUrl: parsed.origin, checks: results },
    null,
    2,
  ),
);
process.exit(failed ? 1 : 0);
