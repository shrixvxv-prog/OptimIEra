import path from 'node:path';
import { config as loadEnvironment } from 'dotenv';
import type { NextConfig } from 'next';

// Local monorepo commands keep the authoritative development variables at
// the workspace root. Vercel supplies the same names through project settings.
loadEnvironment({ path: path.join(__dirname, '../../.env'), override: false, quiet: true });
const nextConfig: NextConfig = {
  // The Vercel project is rooted at apps/web, while production dependencies
  // live in the workspace root and packages/*.  Trace the whole monorepo.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: [
    '@optimiera/config',
    '@optimiera/contracts',
    '@optimiera/database',
    '@optimiera/encryption',
    '@optimiera/og-chain',
    '@optimiera/og-compute',
    '@optimiera/og-storage',
    '@optimiera/optimizer-core',
    '@optimiera/schemas',
  ],
};
export default nextConfig;
