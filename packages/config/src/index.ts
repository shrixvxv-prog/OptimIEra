import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_DOCS_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NOUS_ENABLED: z.enum(['true', 'false', '']).default(''),
  NOUS_BASE_URL: z.string().url().optional().or(z.literal('')),
  NOUS_API_KEY: z.string().trim().optional().or(z.literal('')),
  NOUS_MODEL: z.string().trim().optional().or(z.literal('')),
  NOUS_TIMEOUT_MS: z.coerce.number().int().positive().max(120000).default(60000),
  OPTIMIERA_DEMO_MODE: z.enum(['true', 'false', '']).default(''),
  OPTIMIERA_LIVE_WRITES_ENABLED: z.enum(['true', 'false', '']).default(''),
  OPTIMIERA_PUBLIC_LIVE_0G_ENABLED: z.enum(['true', 'false', '']).default(''),
  OPTIMIERA_0G_MAINNET_ENABLED: z.enum(['true', 'false', '']).default(''),
  OPTIMIERA_MAINNET_DEPLOYMENT_ENABLED: z.enum(['true', 'false', '']).default(''),
  OPTIMIERA_MAINNET_SMOKE_WRITE_ENABLED: z.enum(['true', 'false', '']).default(''),
  OPTIMIERA_MAINNET_SMOKE_COMMITMENT_FILE: z.string().trim().optional().or(z.literal('')),
  OPTIMIERA_USER_DAILY_COMPUTE_LIMIT: z.coerce.number().int().positive().max(10000).default(3),
  OPTIMIERA_USER_DAILY_STORAGE_LIMIT: z.coerce.number().int().positive().max(10000).default(2),
  OPTIMIERA_USER_DAILY_CHAIN_LIMIT: z.coerce.number().int().positive().max(10000).default(2),
  OPTIMIERA_GLOBAL_DAILY_COMPUTE_LIMIT: z.coerce.number().int().positive().max(100000).default(50),
  OPTIMIERA_GLOBAL_DAILY_STORAGE_LIMIT: z.coerce.number().int().positive().max(100000).default(20),
  OPTIMIERA_GLOBAL_DAILY_CHAIN_LIMIT: z.coerce.number().int().positive().max(100000).default(20),
  OG_COMPUTE_ENABLED: z.enum(['true', 'false', '']).default(''),
  OG_COMPUTE_NETWORK: z.enum(['mainnet', 'testnet', '']).default(''),
  OG_COMPUTE_BASE_URL: z.string().url().optional().or(z.literal('')),
  OG_COMPUTE_API_KEY: z.string().trim().optional().or(z.literal('')),
  OG_COMPUTE_MODEL: z.string().trim().optional().or(z.literal('')),
  OG_COMPUTE_TIMEOUT_MS: z.coerce.number().int().positive().max(120000).default(60000),
  OG_COMPUTE_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().max(16000).default(3500),
  OG_STORAGE_ENABLED: z.enum(['true', 'false', '']).default(''),
  OG_STORAGE_NETWORK: z.enum(['mainnet', 'testnet', '']).default(''),
  OG_STORAGE_MODE: z.enum(['turbo', 'standard', '']).default(''),
  OG_STORAGE_RPC_URL: z.string().url().optional().or(z.literal('')),
  OG_STORAGE_INDEXER_URL: z.string().url().optional().or(z.literal('')),
  OG_STORAGE_PRIVATE_KEY: z.string().trim().optional().or(z.literal('')),
  OG_STORAGE_TIMEOUT_MS: z.coerce.number().int().positive().max(300000).default(60000),
  OG_STORAGE_EXPECTED_REPLICA: z.coerce.number().int().positive().max(20).default(1),
  NEXT_PUBLIC_0G_STORAGE_EXPLORER_URL: z.string().url().optional().or(z.literal('')),
  OG_CHAIN_ENABLED: z.enum(['true', 'false', '']).default(''),
  OG_CHAIN_NETWORK: z.enum(['mainnet', 'testnet', '']).default(''),
  OG_CHAIN_RPC_URL: z.string().url().optional().or(z.literal('')),
  OG_CHAIN_CHAIN_ID: z.coerce.number().int().positive().optional(),
  OG_CHAIN_EXPLORER_URL: z.string().url().optional().or(z.literal('')),
  OG_CHAIN_CONFIRMATIONS: z.coerce.number().int().positive().max(100).default(1),
  OPTIMIERA_REGISTRY_ADDRESS: z.string().trim().optional().or(z.literal('')),
  OPTIMIERA_REGISTRAR_ADDRESS: z.string().trim().optional().or(z.literal('')),
  OPTIMIERA_CHAIN_PRIVATE_KEY: z.string().trim().optional().or(z.literal('')),
  OPTIMIERA_DEPLOYER_PRIVATE_KEY: z.string().trim().optional().or(z.literal('')),
});
export type Env = z.infer<typeof envSchema>;

export type OGNetwork = 'mainnet' | 'testnet';
export type OGDeploymentProfile = 'LOCAL' | 'GALILEO' | 'MAINNET';

export type OGExecutionMode = 'LOCAL' | 'GALILEO_LIVE' | 'MAINNET';

export const OG_DEPLOYMENT_PROFILES = {
  LOCAL: { live: false, network: null, chainId: null },
  GALILEO: { live: true, network: 'testnet', chainId: 16602 },
  MAINNET: { live: true, network: 'mainnet', chainId: 16661 },
} as const;

export function readOGDeploymentProfile(
  env: Record<string, string | undefined> = process.env,
): OGDeploymentProfile {
  if (env.OG_CHAIN_TEST_ADAPTER === 'true') return 'LOCAL';
  const enabled = [
    env.OG_COMPUTE_ENABLED === 'true',
    env.OG_STORAGE_ENABLED === 'true',
    env.OG_CHAIN_ENABLED === 'true',
  ];
  if (!enabled.some(Boolean)) return 'LOCAL';
  const networks = [env.OG_COMPUTE_NETWORK, env.OG_STORAGE_NETWORK, env.OG_CHAIN_NETWORK];
  if (networks.some((network) => network !== 'testnet' && network !== 'mainnet'))
    throw new Error('OG_NETWORK_PROFILE_INCOMPLETE');
  if (new Set(networks).size !== 1) throw new Error('OG_NETWORK_PROFILE_MISMATCH');
  if (networks[0] === 'mainnet') {
    if (env.OPTIMIERA_0G_MAINNET_ENABLED !== 'true')
      throw new Error('MAINNET_OPT_IN_REQUIRED');
    return 'MAINNET';
  }
  return 'GALILEO';
}

export function readOGExecutionMode(
  env: Record<string, string | undefined> = process.env,
): OGExecutionMode {
  const profile = readOGDeploymentProfile(env);
  return profile === 'GALILEO' ? 'GALILEO_LIVE' : profile;
}

export function isOGMainnetEnabled(env: Record<string, string | undefined> = process.env) {
  return env.OPTIMIERA_0G_MAINNET_ENABLED === 'true';
}

export function ogNetworkLabel(network: OGNetwork) {
  return network === 'mainnet' ? '0G Aristotle Mainnet' : '0G Galileo Testnet';
}

function assertProductionNetworkOptIn(env: Record<string, string | undefined>, network: OGNetwork) {
  if (env.NODE_ENV === 'production' && network === 'mainnet' && !isOGMainnetEnabled(env))
    throw new Error('PRODUCTION_REQUIRES_EXPLICIT_0G_MAINNET_ENABLE');
}

export type LiveOperation = 'COMPUTE' | 'STORAGE' | 'CHAIN';
export type PublicLive0GConfig = {
  enabled: boolean;
  userDailyLimits: Record<LiveOperation, number>;
  globalDailyLimits: Record<LiveOperation, number>;
};

function boundedLimit(value: string | undefined, fallback: number, maximum: number) {
  const parsed = value ? Number(value) : fallback;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum)
    throw new Error('LIVE_0G_QUOTA_CONFIGURATION_INVALID');
  return parsed;
}

export function readPublicLive0GConfig(
  env: Record<string, string | undefined> = process.env,
): PublicLive0GConfig {
  return {
    enabled:
      env.OPTIMIERA_PUBLIC_LIVE_0G_ENABLED === 'true' &&
      env.OPTIMIERA_LIVE_WRITES_ENABLED === 'true',
    userDailyLimits: {
      COMPUTE: boundedLimit(env.OPTIMIERA_USER_DAILY_COMPUTE_LIMIT, 3, 10000),
      STORAGE: boundedLimit(env.OPTIMIERA_USER_DAILY_STORAGE_LIMIT, 2, 10000),
      CHAIN: boundedLimit(env.OPTIMIERA_USER_DAILY_CHAIN_LIMIT, 2, 10000),
    },
    globalDailyLimits: {
      COMPUTE: boundedLimit(env.OPTIMIERA_GLOBAL_DAILY_COMPUTE_LIMIT, 50, 100000),
      STORAGE: boundedLimit(env.OPTIMIERA_GLOBAL_DAILY_STORAGE_LIMIT, 20, 100000),
      CHAIN: boundedLimit(env.OPTIMIERA_GLOBAL_DAILY_CHAIN_LIMIT, 20, 100000),
    },
  };
}

export type MainnetEnvironmentStatus = 'READY' | 'UNCONFIGURED' | 'BLOCKED';
export type MainnetEnvironmentReport = {
  status: MainnetEnvironmentStatus;
  issues: string[];
  profile: OGDeploymentProfile | 'INVALID';
  safe: {
    applicationUrl: string | null;
    chainId: number | null;
    chainRpcHost: string | null;
    storageRpcHost: string | null;
    storageIndexerHost: string | null;
    computeHost: string | null;
    computeModel: string | null;
    registryAddress: string | null;
    registrarAddress: string | null;
  };
  credentials: {
    compute: boolean;
    storage: boolean;
    chainSigner: boolean;
    deployer: boolean;
  };
};

function configuredHost(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

function validAddress(value: string | undefined) {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

function validPrivateKey(value: string | undefined) {
  return Boolean(value && /^(?:0x)?[a-fA-F0-9]{64}$/.test(value));
}

export function inspectMainnetEnvironment(
  env: Record<string, string | undefined> = process.env,
  options: { requireRegistry?: boolean } = {},
): MainnetEnvironmentReport {
  const issues: string[] = [];
  const required = [
    'NEXT_PUBLIC_APP_URL',
    'OPTIMIERA_0G_MAINNET_ENABLED',
    'OPTIMIERA_LIVE_WRITES_ENABLED',
    'OPTIMIERA_PUBLIC_LIVE_0G_ENABLED',
    'OG_COMPUTE_ENABLED',
    'OG_COMPUTE_NETWORK',
    'OG_COMPUTE_BASE_URL',
    'OG_COMPUTE_API_KEY',
    'OG_COMPUTE_MODEL',
    'OG_STORAGE_ENABLED',
    'OG_STORAGE_NETWORK',
    'OG_STORAGE_MODE',
    'OG_STORAGE_RPC_URL',
    'OG_STORAGE_INDEXER_URL',
    'OG_STORAGE_PRIVATE_KEY',
    'OG_CHAIN_ENABLED',
    'OG_CHAIN_NETWORK',
    'OG_CHAIN_RPC_URL',
    'OG_CHAIN_CHAIN_ID',
    'OG_CHAIN_EXPLORER_URL',
    'OPTIMIERA_REGISTRAR_ADDRESS',
    'OPTIMIERA_CHAIN_PRIVATE_KEY',
    'OPTIMIERA_DEPLOYER_PRIVATE_KEY',
  ];
  if (options.requireRegistry !== false) required.push('OPTIMIERA_REGISTRY_ADDRESS');
  for (const name of required) if (!env[name]) issues.push(`MISSING_${name}`);
  for (const name of ['OPTIMIERA_0G_MAINNET_ENABLED', 'OG_COMPUTE_ENABLED', 'OG_STORAGE_ENABLED', 'OG_CHAIN_ENABLED'])
    if (env[name] && env[name] !== 'true') issues.push(`${name}_MUST_BE_TRUE`);
  for (const name of ['OPTIMIERA_LIVE_WRITES_ENABLED', 'OPTIMIERA_PUBLIC_LIVE_0G_ENABLED'])
    if (env[name] && !['true', 'false'].includes(env[name]!)) issues.push(`${name}_MUST_BE_EXPLICIT`);
  for (const name of ['OG_COMPUTE_NETWORK', 'OG_STORAGE_NETWORK', 'OG_CHAIN_NETWORK'])
    if (env[name] && env[name] !== 'mainnet') issues.push(`${name}_MUST_BE_MAINNET`);
  if (env.OG_CHAIN_CHAIN_ID && env.OG_CHAIN_CHAIN_ID !== '16661')
    issues.push('OG_CHAIN_CHAIN_ID_MUST_BE_16661');
  if (env.NEXT_PUBLIC_APP_URL && !env.NEXT_PUBLIC_APP_URL.startsWith('https://'))
    issues.push('NEXT_PUBLIC_APP_URL_MUST_BE_HTTPS');
  for (const name of [
    'OG_COMPUTE_BASE_URL',
    'OG_STORAGE_RPC_URL',
    'OG_STORAGE_INDEXER_URL',
    'OG_CHAIN_RPC_URL',
    'OG_CHAIN_EXPLORER_URL',
  ]) {
    const value = env[name];
    if (value && (!configuredHost(value) || /testnet|galileo/i.test(value)))
      issues.push(`${name}_MUST_BE_MAINNET_URL`);
  }
  if (env.OPTIMIERA_REGISTRY_ADDRESS && !validAddress(env.OPTIMIERA_REGISTRY_ADDRESS))
    issues.push('OPTIMIERA_REGISTRY_ADDRESS_INVALID');
  if (env.OPTIMIERA_REGISTRAR_ADDRESS && !validAddress(env.OPTIMIERA_REGISTRAR_ADDRESS))
    issues.push('OPTIMIERA_REGISTRAR_ADDRESS_INVALID');
  for (const name of [
    'OG_COMPUTE_API_KEY',
    'OG_STORAGE_PRIVATE_KEY',
    'OPTIMIERA_CHAIN_PRIVATE_KEY',
    'OPTIMIERA_DEPLOYER_PRIVATE_KEY',
  ]) {
    if (name !== 'OG_COMPUTE_API_KEY' && env[name] && !validPrivateKey(env[name]))
      issues.push(`${name}_INVALID`);
  }
  let profile: MainnetEnvironmentReport['profile'] = 'INVALID';
  try {
    profile = readOGDeploymentProfile(env);
    if (profile !== 'MAINNET') issues.push('OG_PROFILE_MUST_BE_MAINNET');
  } catch (error) {
    issues.push(error instanceof Error ? error.message : 'OG_PROFILE_INVALID');
  }
  const uniqueIssues = [...new Set(issues)];
  return {
    status: uniqueIssues.length
      ? uniqueIssues.some((issue) => issue.startsWith('MISSING_'))
        ? 'UNCONFIGURED'
        : 'BLOCKED'
      : 'READY',
    issues: uniqueIssues,
    profile,
    safe: {
      applicationUrl: env.NEXT_PUBLIC_APP_URL ?? null,
      chainId: env.OG_CHAIN_CHAIN_ID ? Number(env.OG_CHAIN_CHAIN_ID) : null,
      chainRpcHost: configuredHost(env.OG_CHAIN_RPC_URL),
      storageRpcHost: configuredHost(env.OG_STORAGE_RPC_URL),
      storageIndexerHost: configuredHost(env.OG_STORAGE_INDEXER_URL),
      computeHost: configuredHost(env.OG_COMPUTE_BASE_URL),
      computeModel: env.OG_COMPUTE_MODEL ?? null,
      registryAddress: validAddress(env.OPTIMIERA_REGISTRY_ADDRESS)
        ? env.OPTIMIERA_REGISTRY_ADDRESS!
        : null,
      registrarAddress: validAddress(env.OPTIMIERA_REGISTRAR_ADDRESS)
        ? env.OPTIMIERA_REGISTRAR_ADDRESS!
        : null,
    },
    credentials: {
      compute: Boolean(env.OG_COMPUTE_API_KEY),
      storage: validPrivateKey(env.OG_STORAGE_PRIVATE_KEY),
      chainSigner: validPrivateKey(env.OPTIMIERA_CHAIN_PRIVATE_KEY),
      deployer: validPrivateKey(env.OPTIMIERA_DEPLOYER_PRIVATE_KEY),
    },
  };
}

export const ogComputeConfigSchema = z.object({
  enabled: z.boolean(),
  network: z.enum(['mainnet', 'testnet']),
  baseUrl: z.string().url(),
  apiKey: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  timeoutMs: z.number().int().positive().max(120000).default(60000),
  maxOutputTokens: z.number().int().positive().max(16000).default(3500),
  temperature: z.number().min(0).max(2).default(0.2),
});
export type OGComputeConfig = z.infer<typeof ogComputeConfigSchema>;
export type NousConfig = OGComputeConfig;
export const NOUS_INFERENCE_BASE_URL = 'https://inference-api.nousresearch.com/v1';
export const DEFAULT_NOUS_MODEL = 'nousresearch/hermes-4-70b';
export function readNousConfig(env: Record<string, string | undefined> = process.env): NousConfig {
  const apiKey = env.NOUS_API_KEY || undefined;
  return ogComputeConfigSchema.parse({
    enabled: env.NOUS_ENABLED === 'true' || (env.NOUS_ENABLED !== 'false' && Boolean(apiKey)),
    network: 'mainnet',
    baseUrl: env.NOUS_BASE_URL || NOUS_INFERENCE_BASE_URL,
    apiKey,
    model: env.NOUS_MODEL || DEFAULT_NOUS_MODEL,
    timeoutMs: env.NOUS_TIMEOUT_MS ? Number(env.NOUS_TIMEOUT_MS) : 60000,
    maxOutputTokens: 2048,
    temperature: 0.2,
  });
}
export const OG_COMPUTE_ENDPOINTS = {
  mainnet: 'https://router-api.0g.ai/v1',
  testnet: 'https://router-api-testnet.integratenetwork.work/v1',
} as const;
export function readOGComputeConfig(env: Record<string, string | undefined> = process.env) {
  const network = env.OG_COMPUTE_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
  assertProductionNetworkOptIn(env, network);
  return ogComputeConfigSchema.parse({
    enabled: env.OG_COMPUTE_ENABLED === 'true',
    network,
    baseUrl: env.OG_COMPUTE_BASE_URL || OG_COMPUTE_ENDPOINTS[network],
    apiKey: env.OG_COMPUTE_API_KEY || undefined,
    model: env.OG_COMPUTE_MODEL || undefined,
    timeoutMs: env.OG_COMPUTE_TIMEOUT_MS ? Number(env.OG_COMPUTE_TIMEOUT_MS) : 60000,
    maxOutputTokens: env.OG_COMPUTE_MAX_OUTPUT_TOKENS
      ? Number(env.OG_COMPUTE_MAX_OUTPUT_TOKENS)
      : 3500,
    temperature: 0.2,
  });
}

export const ogStorageConfigSchema = z.object({
  enabled: z.boolean(),
  network: z.enum(['mainnet', 'testnet']),
  mode: z.enum(['turbo', 'standard']),
  rpcUrl: z.string().url(),
  indexerUrl: z.string().url(),
  privateKey: z.string().trim().min(1).optional(),
  timeoutMs: z.number().int().positive().max(300000).default(60000),
  expectedReplica: z.number().int().positive().max(20).default(1),
  explorerUrl: z.string().url().optional(),
});
export type OGStorageConfig = z.infer<typeof ogStorageConfigSchema>;
export const OG_STORAGE_DEFAULTS = {
  testnet: {
    rpcUrl: 'https://evmrpc-testnet.0g.ai',
    turboIndexerUrl: 'https://indexer-storage-testnet-turbo.0g.ai',
    explorerUrl: 'https://storagescan-galileo.0g.ai',
  },
  mainnet: {
    rpcUrl: 'https://evmrpc.0g.ai',
    turboIndexerUrl: 'https://indexer-storage-turbo.0g.ai',
    explorerUrl: 'https://storagescan.0g.ai',
  },
} as const;
export function readOGStorageConfig(env: Record<string, string | undefined> = process.env) {
  const network = env.OG_STORAGE_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
  assertProductionNetworkOptIn(env, network);
  const mode = env.OG_STORAGE_MODE === 'standard' ? 'standard' : 'turbo';
  const defaults = OG_STORAGE_DEFAULTS[network];
  if (mode === 'standard' && !env.OG_STORAGE_INDEXER_URL)
    throw new Error('OG_STORAGE_STANDARD_INDEXER_REQUIRED');
  return ogStorageConfigSchema.parse({
    enabled: env.OG_STORAGE_ENABLED === 'true',
    network,
    mode,
    rpcUrl: env.OG_STORAGE_RPC_URL || defaults.rpcUrl,
    indexerUrl: env.OG_STORAGE_INDEXER_URL || defaults.turboIndexerUrl,
    privateKey: env.OG_STORAGE_PRIVATE_KEY || undefined,
    timeoutMs: env.OG_STORAGE_TIMEOUT_MS ? Number(env.OG_STORAGE_TIMEOUT_MS) : 60000,
    expectedReplica: env.OG_STORAGE_EXPECTED_REPLICA ? Number(env.OG_STORAGE_EXPECTED_REPLICA) : 1,
    explorerUrl: env.NEXT_PUBLIC_0G_STORAGE_EXPLORER_URL || defaults.explorerUrl,
  });
}

export const ogChainConfigSchema = z.object({
  enabled: z.boolean(),
  network: z.enum(['mainnet', 'testnet']),
  rpcUrl: z.string().url(),
  chainId: z.number().int().positive(),
  explorerUrl: z.string().url(),
  confirmations: z.number().int().positive().max(100),
  registryAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  privateKey: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional(),
});
export type OGChainConfig = z.infer<typeof ogChainConfigSchema>;
function normalizePrivateKey(value: string | undefined) {
  if (!value) return undefined;
  return value.startsWith('0x') ? value : `0x${value}`;
}
export const OG_CHAIN_DEFAULTS = {
  testnet: {
    rpcUrl: 'https://evmrpc-testnet.0g.ai',
    chainId: 16602,
    explorerUrl: 'https://chainscan-galileo.0g.ai',
  },
  mainnet: {
    rpcUrl: 'https://evmrpc.0g.ai',
    chainId: 16661,
    explorerUrl: 'https://chainscan.0g.ai',
  },
} as const;
export function readOGChainConfig(env: Record<string, string | undefined> = process.env) {
  const network = env.OG_CHAIN_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
  assertProductionNetworkOptIn(env, network);
  const defaults = OG_CHAIN_DEFAULTS[network];
  const chainId = env.OG_CHAIN_CHAIN_ID ? Number(env.OG_CHAIN_CHAIN_ID) : defaults.chainId;
  if (chainId !== defaults.chainId) throw new Error('OG_CHAIN_CHAIN_ID_NETWORK_MISMATCH');
  return ogChainConfigSchema.parse({
    enabled: env.OG_CHAIN_ENABLED === 'true',
    network,
    rpcUrl: env.OG_CHAIN_RPC_URL || defaults.rpcUrl,
    chainId,
    explorerUrl: env.OG_CHAIN_EXPLORER_URL || defaults.explorerUrl,
    confirmations: env.OG_CHAIN_CONFIRMATIONS ? Number(env.OG_CHAIN_CONFIRMATIONS) : 1,
    registryAddress: env.OPTIMIERA_REGISTRY_ADDRESS || undefined,
    privateKey: normalizePrivateKey(env.OPTIMIERA_CHAIN_PRIVATE_KEY),
  });
}
