import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { createResolveAliases } from './alias.config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: createResolveAliases(),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Large simulation batches override via CLI --test-timeout=0
    testTimeout: 120_000,
  },
})
