import { execFileSync } from 'node:child_process';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * **The hosted build: the same V11 world, served from an address instead of
 * carried as a file.**
 *
 * The owner's instruction of 10 September — *"I want this to be running repos in
 * the cloud like this one"*, and then, on being told a baked-in state would go
 * stale on his phone, *"so I can use it on my phone??? Because the files wont be
 * on my phone."* A link answers both: nothing to copy, and nothing to go stale.
 *
 * **What this config is not.** It is not a second Owner Build. The Owner Build's
 * defining property is that it makes **zero** network requests and therefore
 * works from `file://` with no server at all, and `e2e/verify-owner-build*.ts`
 * fails the build if it makes one. This build's whole point is the opposite, so
 * it is a separate target with a separate output directory, and the two are
 * never compared.
 *
 * **Three differences from `vite.owner.v11.config.ts`, and only three:**
 *  - no `assetsInlineLimit: Infinity`, no `iife`, no `inlineDynamicImports` — a
 *    hosted page has no reason to be one file, and hashed chunks are what let a
 *    returning visit skip most of the download;
 *  - the output goes to `dist/web`, so neither owner build's directory is
 *    touched and neither verifier can see this artifact;
 *  - **no gzip pass.** It exists in the owner build because a file on a disk has
 *    no server to compress it. A server does, and Netlify compresses on the
 *    wire, so the pass would buy nothing and add a decode step.
 *
 * **What it deliberately keeps:** the same entry, the same commit stamp, and the
 * same honesty about what performance figures mean. `owner-v11.html` mounts
 * `src/owner/main-owner-v11.tsx`, so this serves the identical world; nothing
 * about the app is branched for the web.
 *
 * Everything is copied from the owner config rather than imported from it, for
 * the reason that config gives for copying from V10's: a shared object is one
 * edit away from moving bytes that may not move.
 */

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

const sha = process.env.VIRGIL_OWNER_SHA ?? git(['rev-parse', 'HEAD']);
const worktreeDirty = git(['status', '--porcelain']) !== '';
const buildDate =
  process.env.VIRGIL_OWNER_BUILD_DATE ??
  `${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`;
const stage =
  process.env.VIRGIL_OWNER_V11_STAGE ??
  'V11 · hosted build — the same world the Owner Build carries, served from an address rather than opened from a file. It is not the Owner Build: it fetches its own chunks, which the Owner Build may never do.';

export default defineConfig({
  plugins: [react()],
  base: './',
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
    outDir: 'dist/web',
    emptyOutDir: true,
    chunkSizeWarningLimit: 8000,
    rollupOptions: { input: 'owner-v11.html' },
  },
});
