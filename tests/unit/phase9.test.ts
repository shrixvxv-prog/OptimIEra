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

  it('keeps live writes disabled in public environments without explicit opt-ins', () => {
    expect(readWave2RuntimeConfig({ VERCEL_ENV: 'preview' })).toEqual({
      demoMode: true,
      liveWritesEnabled: false,
    });
    expect(
      readWave2RuntimeConfig({
        VERCEL_ENV: 'development',
      }),
    ).toEqual({ demoMode: true, liveWritesEnabled: false });
  });

  it('requires both public and live-write opt-ins', () => {
    expect(
      readWave2RuntimeConfig({
        VERCEL_ENV: 'production',
        OPTIMIERA_LIVE_WRITES_ENABLED: 'false',
      }),
    ).toEqual({ demoMode: true, liveWritesEnabled: false });
    expect(
      readWave2RuntimeConfig({
        VERCEL_ENV: 'production',
        OPTIMIERA_DEMO_MODE: 'false',
        OPTIMIERA_PUBLIC_LIVE_0G_ENABLED: 'true',
        OPTIMIERA_LIVE_WRITES_ENABLED: 'true',
      }),
    ).toEqual({ demoMode: false, liveWritesEnabled: true });
  });

  it('permits read-only storage verification without a signer', () => {
    const config = readOGStorageConfig({ OG_STORAGE_ENABLED: 'true' });
    expect(config.enabled).toBe(true);
    expect(config.privateKey).toBeUndefined();
  });

  it('defaults local live operations to disabled with bounded quotas', () => {
    const config = readPublicLive0GConfig({});
    expect(config.enabled).toBe(false);
    expect(config.userDailyLimits).toEqual({ COMPUTE: 3, STORAGE: 2, CHAIN: 2 });
    expect(config.globalDailyLimits).toEqual({ COMPUTE: 50, STORAGE: 20, CHAIN: 20 });
  });

  it('enables public live-operation quotas only with both explicit opt-ins', () => {
    expect(readPublicLive0GConfig({ VERCEL_ENV: 'production' }).enabled).toBe(false);
    expect(
      readPublicLive0GConfig({
        VERCEL_ENV: 'production',
        OPTIMIERA_PUBLIC_LIVE_0G_ENABLED: 'true',
        OPTIMIERA_LIVE_WRITES_ENABLED: 'true',
      }).enabled,
    ).toBe(true);
  });

  it('requires an explicit mainnet opt-in in Production', () => {
    expect(() =>
      readOGComputeConfig({ NODE_ENV: 'production', OG_COMPUTE_NETWORK: 'mainnet' }),
    ).toThrow('PRODUCTION_REQUIRES_EXPLICIT_0G_MAINNET_ENABLE');
    expect(() =>
      readOGStorageConfig({ NODE_ENV: 'production', OG_STORAGE_NETWORK: 'mainnet' }),
    ).toThrow('PRODUCTION_REQUIRES_EXPLICIT_0G_MAINNET_ENABLE');
    expect(() =>
      readOGChainConfig({ NODE_ENV: 'production', OG_CHAIN_NETWORK: 'mainnet' }),
    ).toThrow('PRODUCTION_REQUIRES_EXPLICIT_0G_MAINNET_ENABLE');
  });

  it('accepts aligned Aristotle mainnet configuration after explicit opt-in', () => {
    const env = {
      NODE_ENV: 'production',
      OPTIMIERA_0G_MAINNET_ENABLED: 'true',
      OG_COMPUTE_NETWORK: 'mainnet',
      OG_STORAGE_NETWORK: 'mainnet',
      OG_CHAIN_NETWORK: 'mainnet',
      OG_CHAIN_CHAIN_ID: '16661',
    };
    expect(readOGComputeConfig(env).baseUrl).toBe('https://router-api.0g.ai/v1');
    expect(readOGStorageConfig(env).rpcUrl).toBe('https://evmrpc.0g.ai');
    expect(readOGChainConfig(env).chainId).toBe(16661);
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
  }, 20_000);
});
