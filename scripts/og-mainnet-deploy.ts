import { spawnSync } from 'node:child_process';
import { config as loadEnv } from 'dotenv';
import { inspectMainnetEnvironment } from '@optimiera/config';
import {
  estimateMainnetRegistryDeployment,
  OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT,
  readMainnetBalance,
  readMainnetRegistryEvidence,
  serverSignerAddress,
} from '@optimiera/og-chain';
import { readRegistryArtifact, verifiedDeployment } from './og-mainnet-readiness';

loadEnv({ quiet: true });

const qualityGates = [
  { name: 'contract build', args: ['contracts:build'] },
  { name: 'contract unit suite', args: ['contracts:test'] },
  {
    name: 'contract fuzz suite',
    args: ['--filter', '@optimiera/contracts', 'foundry:test', '--match-test', 'testFuzz'],
  },
  {
    name: 'contract invariant suite',
    args: ['--filter', '@optimiera/contracts', 'foundry:test', '--match-test', 'invariant_'],
  },
  { name: 'workspace typecheck', args: ['typecheck'] },
  { name: 'safety scan', args: ['safety:scan'] },
] as const;

function runPnpm(args: readonly string[]) {
  const executable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  return spawnSync(executable, [...args], { cwd: process.cwd(), stdio: 'inherit', shell: false });
}

export async function deployMainnet(
  args: string[] = process.argv.slice(2),
  env: Record<string, string | undefined> = process.env,
) {
  if (!args.includes('--confirm-mainnet-deployment'))
    throw new Error('CONFIRM_MAINNET_DEPLOYMENT_REQUIRED');
  if (env.OPTIMIERA_MAINNET_DEPLOYMENT_ENABLED !== 'true')
    throw new Error('MAINNET_DEPLOYMENT_OPT_IN_REQUIRED');
  const environment = inspectMainnetEnvironment(env, { requireRegistry: false });
  if (environment.status !== 'READY')
    throw new Error(`MAINNET_ENVIRONMENT_NOT_READY:${environment.issues.join(',')}`);

  const artifact = await readRegistryArtifact();
  const canonical = await readMainnetRegistryEvidence(artifact.runtime);
  if (verifiedDeployment(canonical)) throw new Error('CANONICAL_MAINNET_REGISTRY_ALREADY_DEPLOYED');

  const deployer = serverSignerAddress(env.OPTIMIERA_DEPLOYER_PRIVATE_KEY!);
  const registrar = environment.safe.registrarAddress as `0x${string}`;
  const [balanceWei, estimate] = await Promise.all([
    readMainnetBalance(deployer),
    estimateMainnetRegistryDeployment(artifact.creation, deployer, registrar),
  ]);
  if (BigInt(balanceWei) < BigInt(estimate.estimatedRequirementWei))
    throw new Error('MAINNET_DEPLOYER_BALANCE_INSUFFICIENT');
  console.log(
    JSON.stringify(
      {
        status: 'READY_FOR_MANUAL_DEPLOYMENT',
        chainId: OPTIMIERA_MAINNET_REGISTRY_DEPLOYMENT.chainId,
        deployer,
        balanceWei,
        estimate,
        confirmation: 'CONFIRMED',
      },
      null,
      2,
    ),
  );

  for (const gate of qualityGates) {
    const result = runPnpm(gate.args);
    if (result.status !== 0) throw new Error(`QUALITY_GATE_FAILED:${gate.name}`);
  }
  const deployment = runPnpm([
    '--filter',
    '@optimiera/contracts',
    'foundry:deploy:mainnet',
  ]);
  if (deployment.status !== 0) throw new Error('MAINNET_DEPLOYMENT_FAILED');
  return { status: 'DEPLOYMENT_SUBMITTED', liveWritePerformed: true } as const;
}

async function main() {
  try {
    const result = await deployMainnet();
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'MAINNET_DEPLOYMENT_BLOCKED');
    process.exitCode = 2;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/og-mainnet-deploy.ts')) void main();
