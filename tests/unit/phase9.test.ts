import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readWave2RuntimeConfig } from '../../apps/web/src/lib/runtime-config';
import { readOGStorageConfig } from '../../packages/config/src/index';
import {
  readOGChainConfig,
  readOGComputeConfig,
  readPublicLive0GConfig,
} from '../../packages/config/src/index';

describe('Phase 9 production release controls', () => {
  it('defaults to safe demo mode with live writes disabled', () => {
    expect(readWave2RuntimeConfig({})).toEqual({ demoMode: true, liveWritesEnabled: false });
  });

  it('requires an explicit opt-in for live writes', () => {
    expect(
      readWave2RuntimeConfig({
        OPTIMIERA_DEMO_MODE: 'false',
        OPTIMIERA_LIVE_WRITES_ENABLED: 'true',
      }),
    ).toEqual({ demoMode: false, liveWritesEnabled: true });
  });

  it('permits read-only storage verification without a signer', () => {
    const config = readOGStorageConfig({ OG_STORAGE_ENABLED: 'true' });
    expect(config.enabled).toBe(true);
    expect(config.privateKey).toBeUndefined();
  });

  it('defaults public live operations to disabled with bounded quotas', () => {
    const config = readPublicLive0GConfig({});
    expect(config.enabled).toBe(false);
    expect(config.userDailyLimits).toEqual({ COMPUTE: 3, STORAGE: 2, CHAIN: 2 });
    expect(config.globalDailyLimits).toEqual({ COMPUTE: 50, STORAGE: 20, CHAIN: 20 });
  });

  it('rejects mainnet configuration in Production', () => {
    expect(() =>
      readOGComputeConfig({ NODE_ENV: 'production', OG_COMPUTE_NETWORK: 'mainnet' }),
    ).toThrow('PRODUCTION_REQUIRES_0G_TESTNET');
    expect(() =>
      readOGStorageConfig({ NODE_ENV: 'production', OG_STORAGE_NETWORK: 'mainnet' }),
    ).toThrow('PRODUCTION_REQUIRES_0G_TESTNET');
    expect(() =>
      readOGChainConfig({ NODE_ENV: 'production', OG_CHAIN_NETWORK: 'mainnet' }),
    ).toThrow('PRODUCTION_REQUIRES_0G_TESTNET');
  });

  it('rejects invalid quota limits', () => {
    expect(() => readPublicLive0GConfig({ OPTIMIERA_USER_DAILY_COMPUTE_LIMIT: '0' })).toThrow(
      'LIVE_0G_QUOTA_CONFIGURATION_INVALID',
    );
  });

  it('refuses live evidence restoration against a local database before any network read', () => {
    const workspace = path.resolve(import.meta.dirname, '../..');
    const result = spawnSync(
      process.execPath,
      [path.join(workspace, 'node_modules/tsx/dist/cli.mjs'), 'scripts/live-evidence-restore.ts'],
      {
        cwd: workspace,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PROMPT_STORAGE_MODE: 'ENCRYPTED',
          DATABASE_URL: 'postgresql://user:password@127.0.0.1:5432/optimiera',
          LIVE_EVIDENCE_OWNER_EMAIL: 'restore-test@example.invalid',
        },
        encoding: 'utf8',
      },
    );
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain('RESTORE_REQUIRES_PRODUCTION_DATABASE');
  });
});
