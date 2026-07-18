import { describe, expect, it } from 'vitest';
import { readWave2RuntimeConfig } from '../../apps/web/src/lib/runtime-config';
import { readOGStorageConfig } from '../../packages/config/src/index';

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
});
