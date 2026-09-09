import { defineConfig } from 'vitest/config';

/**
 * The sweep's own runner. `study/sweep-cluster.ts` imports the shipped model
 * payloads, which arrive through Vite's `?raw` loader, so it cannot be run by
 * `tsx`; this is the smallest thing that gives it Vite's resolution. It is a
 * separate config so the ordinary `pnpm test` include list is untouched.
 *
 * Usage: npx vitest run --config study/vitest.sweep.config.ts
 *        VIRGIL_SWEEP=portrait npx vitest run --config study/vitest.sweep.config.ts
 */
export default defineConfig({
  root: process.cwd(),
  test: { include: ['study/sweep-cluster.run.ts'], environment: 'node', testTimeout: 600_000 },
});
