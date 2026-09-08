import { execFileSync } from 'node:child_process';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The Owner Build: one self-contained `.html` file the owner downloads and
 * double-clicks. See `docs/process/PHASE_1_PLAN.md` §1.3 and stage S1.
 *
 * Two settings carry the whole mechanism and neither is cosmetic:
 *  - `format: 'iife'` — a `file://` document has an opaque origin, so the browser
 *    refuses to load `<script type="module">`. A classic script runs.
 *  - `inlineDynamicImports: true` — with one chunk there is nothing left to fetch
 *    at runtime, which matters because `fetch` and `XMLHttpRequest` are blocked
 *    over `file://` too.
 *
 * `assetsInlineLimit: Infinity` forces every asset into a `data:` URI for the
 * same reason. This build target adds no dependency to any `package.json`.
 */

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

const sha = process.env.VIRGIL_OWNER_SHA ?? git(['rev-parse', 'HEAD']);
const worktreeDirty = git(['status', '--porcelain']) !== '';
const stage =
  process.env.VIRGIL_OWNER_STAGE ??
  'Phase 1 S2 / viewing point V7 — the tabletop: faces on the head, screens as objects';
// Overridable so that a reviewer can rebuild a delivered artifact byte for byte.
// Without it the embedded minute is the only thing that stops the output being
// reproducible from the commit alone.
const buildDate =
  process.env.VIRGIL_OWNER_BUILD_DATE ??
  `${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`;

export default defineConfig({
  plugins: [react()],
  base: './',
  // Nothing in `public/` is referenced by the Owner Build entry, and a copied
  // file would be a file the owner never receives.
  publicDir: false,
  define: {
    __OWNER_BUILD_SHA__: JSON.stringify(worktreeDirty ? `${sha} (+uncommitted changes)` : sha),
    __OWNER_BUILD_SHORT_SHA__: JSON.stringify(sha.slice(0, 10)),
    __OWNER_BUILD_DATE__: JSON.stringify(buildDate),
    __OWNER_BUILD_STAGE__: JSON.stringify(stage),
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: Number.POSITIVE_INFINITY,
    outDir: 'dist/owner-build',
    emptyOutDir: true,
    chunkSizeWarningLimit: 8000,
    rollupOptions: {
      input: 'owner.html',
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'owner.js',
        assetFileNames: 'owner.[ext]',
      },
    },
  },
});
