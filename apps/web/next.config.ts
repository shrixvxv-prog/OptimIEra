import path from 'node:path';
import type { NextConfig } from 'next';
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
