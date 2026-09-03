export type Wave2RuntimeConfig = {
  demoMode: boolean;
  liveWritesEnabled: boolean;
};

/** Live 0G writes require two explicit operator opt-ins in every environment. */
export function readWave2RuntimeConfig(
  env: Record<string, string | undefined> = process.env,
): Wave2RuntimeConfig {
  return {
    demoMode: env.OPTIMIERA_DEMO_MODE !== 'false',
    liveWritesEnabled:
      env.OPTIMIERA_PUBLIC_LIVE_0G_ENABLED === 'true' &&
      env.OPTIMIERA_LIVE_WRITES_ENABLED === 'true',
  };
}

export function assertLiveWritesEnabled() {
  if (!readWave2RuntimeConfig().liveWritesEnabled) throw new Error('LIVE_WRITES_DISABLED');
}
