import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_DOCS_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
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
  OPTIMIERA_CHAIN_PRIVATE_KEY: z.string().trim().optional().or(z.literal('')),
  OPTIMIERA_DEPLOYER_PRIVATE_KEY: z.string().trim().optional().or(z.literal('')),
});
export type Env = z.infer<typeof envSchema>;

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
export const OG_COMPUTE_ENDPOINTS = {
  mainnet: 'https://router-api.0g.ai/v1',
  testnet: 'https://router-api-testnet.integratenetwork.work/v1',
} as const;
export function readOGComputeConfig(env: Record<string, string | undefined> = process.env) {
  const network = env.OG_COMPUTE_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
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
