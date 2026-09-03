const productionLike =
  process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview';

const variableClassification = {
  PUBLIC: [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_0G_NETWORK',
    'NEXT_PUBLIC_0G_CHAIN_ID',
    'NEXT_PUBLIC_0G_RPC_URL',
    'NEXT_PUBLIC_0G_EXPLORER_URL',
    'NEXT_PUBLIC_0G_STORAGE_EXPLORER_URL',
  ],
  SERVER_SECRET: [
    'DATABASE_URL',
    'BETTER_AUTH_SECRET',
    'AUTH_SECRET',
    'OPTIMIERA_ENCRYPTION_MASTER_KEY',
    'OG_COMPUTE_API_KEY',
    'OG_STORAGE_PRIVATE_KEY',
    'OPTIMIERA_CHAIN_PRIVATE_KEY',
    'OPTIMIERA_DEPLOYER_PRIVATE_KEY',
    'NOUS_API_KEY',
  ],
  OPTIONAL: [
    'NEXT_PUBLIC_DOCS_URL',
    'NEXT_PUBLIC_API_URL',
    'DIRECT_URL',
    'NOUS_ENABLED',
    'NOUS_BASE_URL',
    'NOUS_MODEL',
    'NOUS_TIMEOUT_MS',
    'OPTIMIERA_USAGE_PAYMENTS_ENABLED',
    'OG_USAGE_PAYMENT_RECIPIENT',
    'OG_USAGE_PAYMENT_AMOUNT_WEI',
    'OPTIMIERA_MAINNET_SMOKE_COMMITMENT_FILE',
  ],
  TESTNET_ONLY: ['OG_CHAIN_TEST_ADAPTER', 'BETTER_AUTH_E2E'],
  MAINNET_ONLY: [
    'OPTIMIERA_0G_MAINNET_ENABLED',
    'OPTIMIERA_MAINNET_DEPLOYMENT_ENABLED',
    'OPTIMIERA_MAINNET_SMOKE_WRITE_ENABLED',
    'OPTIMIERA_DEPLOYER_PRIVATE_KEY',
    'OPTIMIERA_REGISTRAR_ADDRESS',
  ],
};

if (process.argv.includes('--describe')) {
  console.log(JSON.stringify(variableClassification, null, 2));
  process.exit(0);
}

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

if (process.env.DIRECT_URL) {
  try {
    const parsed = new URL(process.env.DIRECT_URL);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) failures.push('DIRECT_PROTOCOL');
    if (/^(localhost|127.0.0.1|postgres)$/i.test(parsed.hostname)) failures.push('DIRECT_LOCAL');
    if (/test|development/i.test(parsed.pathname)) failures.push('DIRECT_NAME');
    const sslMode = parsed.searchParams.get('sslmode');
    if (sslMode && ['disable', 'allow'].includes(sslMode)) failures.push('DIRECT_TLS');
  } catch {
    failures.push('DIRECT_URL');
  }
}

const authUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
if (!authUrl.startsWith('https://')) failures.push('AUTH_HTTPS_URL');
if (!process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://')) failures.push('APP_HTTPS_URL');
if (!(process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET)) failures.push('AUTH_SECRET');
if (!process.env.BETTER_AUTH_TRUSTED_ORIGINS) failures.push('AUTH_TRUSTED_ORIGINS');
else {
  const trustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!trustedOrigins.includes(authUrl)) failures.push('AUTH_ORIGIN_NOT_TRUSTED');
  if (trustedOrigins.some((origin) => origin.includes('*') || !origin.startsWith('https://')))
    failures.push('AUTH_TRUSTED_ORIGINS_HTTPS');
}
if (!process.env.OPTIMIERA_ENCRYPTION_MASTER_KEY) failures.push('ENCRYPTION_KEY');
else {
  try {
    if (Buffer.from(process.env.OPTIMIERA_ENCRYPTION_MASTER_KEY, 'base64').byteLength !== 32)
      failures.push('ENCRYPTION_KEY_LENGTH');
  } catch {
    failures.push('ENCRYPTION_KEY_ENCODING');
  }
}
if (process.env.PROMPT_STORAGE_MODE !== 'ENCRYPTED') failures.push('PROMPT_STORAGE_ENCRYPTED');
const configuredNetworks = [
  process.env.OG_COMPUTE_NETWORK,
  process.env.OG_STORAGE_NETWORK,
  process.env.OG_CHAIN_NETWORK,
].filter(Boolean);
const mainnetEnabled = process.env.OPTIMIERA_0G_MAINNET_ENABLED === 'true';
const mainnetRequested = configuredNetworks.includes('mainnet');
const testnetRequested = configuredNetworks.includes('testnet');
if (mainnetRequested && testnetRequested) failures.push('NETWORK_MISMATCH');
if (mainnetRequested && !mainnetEnabled) failures.push('MAINNET_ENABLE_FLAG');
if (mainnetEnabled && (!mainnetRequested || configuredNetworks.length !== 3))
  failures.push('MAINNET_NETWORKS');
const expectedChainId = mainnetRequested ? '16661' : '16602';
if (!['true', 'false'].includes(process.env.OPTIMIERA_0G_MAINNET_ENABLED ?? ''))
  failures.push('MAINNET_ENABLE_EXPLICIT');
if (!['true', 'false'].includes(process.env.OPTIMIERA_LIVE_WRITES_ENABLED ?? ''))
  failures.push('LIVE_WRITES_EXPLICIT');
if (!['true', 'false'].includes(process.env.OPTIMIERA_PUBLIC_LIVE_0G_ENABLED ?? ''))
  failures.push('PUBLIC_LIVE_EXPLICIT');
if (
  (process.env.OPTIMIERA_LIVE_WRITES_ENABLED === 'true') !==
  (process.env.OPTIMIERA_PUBLIC_LIVE_0G_ENABLED === 'true')
)
  failures.push('LIVE_WRITE_FLAGS_MISMATCH');
if (!process.env.OG_CHAIN_CHAIN_ID || process.env.OG_CHAIN_CHAIN_ID !== expectedChainId)
  failures.push('CHAIN_ID');
if (process.env.OG_CHAIN_TEST_ADAPTER === 'true') failures.push('TEST_CHAIN_ADAPTER');
if (process.env.BETTER_AUTH_E2E === 'true') failures.push('E2E_AUTH_MODE');
if (!['true', 'false'].includes(process.env.OPTIMIERA_USAGE_PAYMENTS_ENABLED ?? ''))
  failures.push('USAGE_PAYMENTS_EXPLICIT');
if (process.env.OPTIMIERA_USAGE_PAYMENTS_ENABLED === 'true') {
  if (!process.env.OG_USAGE_PAYMENT_RECIPIENT) failures.push('PAYMENT_RECIPIENT');
  if (!process.env.OG_USAGE_PAYMENT_AMOUNT_WEI) failures.push('PAYMENT_AMOUNT');
}

const publicLiveEnabled =
  process.env.OPTIMIERA_PUBLIC_LIVE_0G_ENABLED === 'true' &&
  process.env.OPTIMIERA_LIVE_WRITES_ENABLED === 'true';
if (publicLiveEnabled) {
  if (process.env.OG_COMPUTE_ENABLED !== 'true') failures.push('COMPUTE_ENABLED');
  if (!process.env.OG_COMPUTE_API_KEY) failures.push('COMPUTE_API_KEY');
  if (process.env.OG_STORAGE_ENABLED !== 'true') failures.push('STORAGE_ENABLED');
  if (!process.env.OG_STORAGE_PRIVATE_KEY) failures.push('STORAGE_PRIVATE_KEY');
  if (process.env.OG_CHAIN_ENABLED !== 'true') failures.push('CHAIN_ENABLED');
  if (!process.env.OPTIMIERA_CHAIN_PRIVATE_KEY) failures.push('CHAIN_PRIVATE_KEY');
  if (!process.env.OPTIMIERA_REGISTRY_ADDRESS) failures.push('REGISTRY_ADDRESS');
}

if (mainnetEnabled) {
  for (const name of ['OG_COMPUTE_ENABLED', 'OG_STORAGE_ENABLED', 'OG_CHAIN_ENABLED'])
    if (process.env[name] !== 'true') failures.push(`MAINNET_${name}`);
  const requiredMainnetValues = [
    'OG_COMPUTE_BASE_URL',
    'OG_COMPUTE_API_KEY',
    'OG_COMPUTE_MODEL',
    'OG_STORAGE_MODE',
    'OG_STORAGE_RPC_URL',
    'OG_STORAGE_INDEXER_URL',
    'OG_STORAGE_PRIVATE_KEY',
    'OG_CHAIN_RPC_URL',
    'OG_CHAIN_EXPLORER_URL',
    'OPTIMIERA_REGISTRY_ADDRESS',
    'OPTIMIERA_REGISTRAR_ADDRESS',
    'OPTIMIERA_CHAIN_PRIVATE_KEY',
    'OPTIMIERA_DEPLOYER_PRIVATE_KEY',
    'NEXT_PUBLIC_0G_NETWORK',
    'NEXT_PUBLIC_0G_CHAIN_ID',
    'NEXT_PUBLIC_0G_RPC_URL',
    'NEXT_PUBLIC_0G_EXPLORER_URL',
    'NEXT_PUBLIC_0G_STORAGE_EXPLORER_URL',
  ];
  for (const name of requiredMainnetValues)
    if (!process.env[name]) failures.push(`MAINNET_${name}`);
  if (process.env.NEXT_PUBLIC_0G_NETWORK !== 'mainnet') failures.push('MAINNET_PUBLIC_NETWORK');
  if (process.env.NEXT_PUBLIC_0G_CHAIN_ID !== '16661') failures.push('MAINNET_PUBLIC_CHAIN_ID');
  if (
    process.env.OPTIMIERA_REGISTRY_ADDRESS &&
    !/^0x[a-fA-F0-9]{40}$/.test(process.env.OPTIMIERA_REGISTRY_ADDRESS)
  )
    failures.push('MAINNET_REGISTRY_ADDRESS_INVALID');
  if (
    process.env.OPTIMIERA_REGISTRAR_ADDRESS &&
    !/^0x[a-fA-F0-9]{40}$/.test(process.env.OPTIMIERA_REGISTRAR_ADDRESS)
  )
    failures.push('MAINNET_REGISTRAR_ADDRESS_INVALID');
  for (const name of [
    'OG_COMPUTE_BASE_URL',
    'OG_STORAGE_RPC_URL',
    'OG_STORAGE_INDEXER_URL',
    'OG_CHAIN_RPC_URL',
    'OG_CHAIN_EXPLORER_URL',
    'NEXT_PUBLIC_0G_RPC_URL',
    'NEXT_PUBLIC_0G_EXPLORER_URL',
    'NEXT_PUBLIC_0G_STORAGE_EXPLORER_URL',
  ]) {
    const value = process.env[name];
    if (value && /testnet|galileo/i.test(value)) failures.push(`MAINNET_URL_${name}`);
  }
}

if (failures.length) {
  console.error(`Production environment validation failed: ${[...new Set(failures)].join(', ')}`);
  process.exit(1);
}
console.log('Production environment validation passed.');
