const productionLike =
  process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview';

if (!productionLike) {
  console.log('Production environment validation skipped outside Vercel Preview/Production.');
  process.exit(0);
}

const failures = [];
const databaseUrl = process.env.DATABASE_URL ?? '';
try {
  const parsed = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) failures.push('DATABASE_PROTOCOL');
  if (/^(localhost|127\.0\.0\.1|postgres)$/i.test(parsed.hostname)) failures.push('DATABASE_LOCAL');
  if (/test|development/i.test(parsed.pathname)) failures.push('DATABASE_NAME');
  const sslMode = parsed.searchParams.get('sslmode');
  if (sslMode && ['disable', 'allow'].includes(sslMode)) failures.push('DATABASE_TLS');
} catch {
  failures.push('DATABASE_URL');
}

const authUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
if (!authUrl.startsWith('https://')) failures.push('AUTH_HTTPS_URL');
if (!(process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET)) failures.push('AUTH_SECRET');
if (!process.env.OPTIMIERA_ENCRYPTION_MASTER_KEY) failures.push('ENCRYPTION_KEY');
if (process.env.OG_CHAIN_NETWORK && process.env.OG_CHAIN_NETWORK !== 'testnet')
  failures.push('CHAIN_NETWORK');
if (process.env.OG_CHAIN_CHAIN_ID && process.env.OG_CHAIN_CHAIN_ID !== '16602')
  failures.push('CHAIN_ID');
if (process.env.OG_COMPUTE_NETWORK && process.env.OG_COMPUTE_NETWORK !== 'testnet')
  failures.push('COMPUTE_NETWORK');
if (process.env.OG_STORAGE_NETWORK && process.env.OG_STORAGE_NETWORK !== 'testnet')
  failures.push('STORAGE_NETWORK');
if (process.env.OG_CHAIN_TEST_ADAPTER === 'true') failures.push('TEST_CHAIN_ADAPTER');
if (process.env.BETTER_AUTH_E2E === 'true') failures.push('E2E_AUTH_MODE');

if (failures.length) {
  console.error(`Production environment validation failed: ${[...new Set(failures)].join(', ')}`);
  process.exit(1);
}
console.log('Production environment validation passed.');
