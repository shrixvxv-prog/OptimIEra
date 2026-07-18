export type Wave2RuntimeConfig = {
  demoMode: boolean;
  liveWritesEnabled: boolean;
};

/**
 * Wave 2 is safe by default.  A production deployment may read and verify
 * existing public evidence, but it cannot spend funds or create new 0G state
 * until an operator explicitly enables live writes.
 */
export function readWave2RuntimeConfig(
  env: Record<string, string | undefined> = process.env,
): Wave2RuntimeConfig {
  return {
    demoMode: env.OPTIMIERA_DEMO_MODE !== 'false',
    liveWritesEnabled:
      env.OPTIMIERA_PUBLIC_LIVE_0G_ENABLED === 'true' ||
      env.OPTIMIERA_LIVE_WRITES_ENABLED === 'true',
  };
}

export function assertLiveWritesEnabled() {
  if (!readWave2RuntimeConfig().liveWritesEnabled) throw new Error('LIVE_WRITES_DISABLED');
}
