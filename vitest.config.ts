import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@optimiera/config': resolve(__dirname, 'packages/config/src/index.ts'),
      '@optimiera/og-compute': resolve(__dirname, 'packages/og-compute/src/index.ts'),
      '@optimiera/og-chain': resolve(__dirname, 'packages/og-chain/src/index.ts'),
      '@optimiera/og-storage': resolve(__dirname, 'packages/og-storage/src/index.ts'),
      '@optimiera/payment': resolve(__dirname, 'packages/payment/src/index.ts'),
      '@optimiera/encryption': resolve(__dirname, 'packages/encryption/src/index.ts'),
      '@optimiera/optimizer-core': resolve(__dirname, 'packages/optimizer-core/src/index.ts'),
      '@optimiera/schemas': resolve(__dirname, 'packages/schemas/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
