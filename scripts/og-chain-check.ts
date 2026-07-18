import 'dotenv/config';
import { readOGChainConfig } from '@optimiera/config';
import { OGChainAdapter } from '@optimiera/og-chain';

async function main() {
  let config;
  try {
    config = readOGChainConfig();
  } catch {
    console.log(
      JSON.stringify(
        {
          enabled: false,
          network: 'testnet',
          chainId: 16602,
          status: 'FAILED',
          reason: 'CONFIG_INVALID',
          transactionSubmission: 'skipped',
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }
  const adapter = new OGChainAdapter(config);
  const health = await adapter.healthCheck();
  let latestBlock: string | null = null;
  if (health.state !== 'UNCONFIGURED') {
    try {
      latestBlock = String(await adapter.getBlockNumber());
    } catch {
      latestBlock = null;
    }
  }
  console.log(
    JSON.stringify(
      {
        enabled: config.enabled,
        network: config.network,
        chainId: config.chainId,
        rpcHost: new URL(config.rpcUrl).host,
        latestBlock,
        signerConfigured: Boolean(config.privateKey),
        registryConfigured: Boolean(config.registryAddress),
        deployedBytecode: health.deployedBytecode,
        contractReadStatus: health.state,
        transactionSubmission: 'skipped',
      },
      null,
      2,
    ),
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Chain diagnostic failed.');
  process.exit(1);
});
