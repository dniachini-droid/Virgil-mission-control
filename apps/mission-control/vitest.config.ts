import { defineConfig } from 'vitest/config';
export default defineConfig({
  // `__LIVE__` is the flag that compiles the live-state reader into the hosted
  // build and out of the Owner Build (`src/world/live/liveState.ts`). Under test
  // it is **false**, which is the Owner Build's value: the honesty tests run
  // against the recording, which is the fixture, and nothing in the suite may
  // reach a network. A test that needs the live mapping calls `stateFromAnswer`
  // directly, which is a pure function and does not read the flag.
  define: { __LIVE__: false },
  test: { include: ['test/**/*.test.ts', 'test/**/*.test.tsx'], environment: 'node' },
});
