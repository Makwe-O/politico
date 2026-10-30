import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Each test file spins up its own in-memory PGlite; WASM boot takes a moment.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
