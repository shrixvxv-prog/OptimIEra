import { config as loadEnv } from 'dotenv';
import { readOGChainConfig, readOGComputeConfig, readOGStorageConfig } from '@optimiera/config';
import {
  componentStatus,
  hostOf,
  networkGate,
  redactedCredentialSummary,
  safeConfig,
} from './og-live-utils';

loadEnv({ quiet: true });

function parseConfig<T>(reader: () => T) {
  try {
    return { value: reader() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'CONFIG_INVALID' };
  }
}

export function buildPreflight(env: Record<string, string | undefined> = process.env) {
  const compute = parseConfig(() => readOGComputeConfig(env));
  const storage = parseConfig(() => readOGStorageConfig(env));
  const chain = parseConfig(() => readOGChainConfig(env));
  const computeGate = networkGate({
    network: env.OG_COMPUTE_NETWORK,
    rpcUrl: env.OG_COMPUTE_BASE_URL,
  });
  const storageGate = networkGate({
    network: env.OG_STORAGE_NETWORK,
    rpcUrl: env.OG_STORAGE_RPC_URL,
  });
  const chainGate = networkGate({
    network: env.OG_CHAIN_NETWORK,
    chainId: chain.value?.chainId,
    rpcUrl: env.OG_CHAIN_RPC_URL,
  });
  const computeResult = compute.value
    ? componentStatus({
        enabled: compute.value.enabled,
        required: { apiKey: Boolean(compute.value.apiKey), model: Boolean(compute.value.model) },
        blocked: computeGate.reason,
      })
    : { status: 'FAILED' as const, missing: [], reason: compute.error };
  const storageResult = storage.value
    ? componentStatus({
        enabled: storage.value.enabled,
        required: { privateKey: Boolean(storage.value.privateKey) },
        blocked: storageGate.reason,
      })
    : { status: 'FAILED' as const, missing: [], reason: storage.error };
  const chainResult = chain.value
    ? componentStatus({
        enabled: chain.value.enabled,
        required: {
          privateKey: Boolean(chain.value.privateKey),
          registryAddress: Boolean(chain.value.registryAddress),
        },
        blocked: chainGate.reason,
      })
    : { status: 'FAILED' as const, missing: [], reason: chain.error };
  const statuses = [computeResult.status, storageResult.status, chainResult.status];
  const overall = statuses.includes('BLOCKED')
    ? 'BLOCKED'
    : statuses.includes('FAILED')
      ? 'FAILED'
      : statuses.every((status) => status === 'READY')
        ? 'READY'
        : 'UNCONFIGURED';
  return {
    schemaVersion: 'OGLivePreflightV1',
    liveCallsMade: false,
    overall,
    network: 'testnet',
    chainId: 16602,
    components: {
      compute: {
        status: computeResult.status,
        missing: computeResult.missing,
        reason: computeResult.reason,
        endpointHost: compute.value ? hostOf(compute.value.baseUrl) : null,
        model: compute.value?.model ?? null,
      },
      storage: {
        status: storageResult.status,
        missing: storageResult.missing,
        reason: storageResult.reason,
        rpcHost: storage.value ? hostOf(storage.value.rpcUrl) : null,
        indexerHost: storage.value ? hostOf(storage.value.indexerUrl) : null,
      },
      chain: {
        status: chainResult.status,
        missing: chainResult.missing,
        reason: chainResult.reason,
        rpcHost: chain.value ? hostOf(chain.value.rpcUrl) : null,
        registryConfigured: Boolean(chain.value?.registryAddress),
      },
    },
    application: { status: 'READY', database: 'checked-by-build-and-migrations' },
    safeEnvironment: safeConfig(env),
    credentials: redactedCredentialSummary(env),
  };
}

if (process.argv[1]?.replaceAll('\\', '/').includes('og-live-check')) {
  console.log(JSON.stringify(buildPreflight(), null, 2));
}
