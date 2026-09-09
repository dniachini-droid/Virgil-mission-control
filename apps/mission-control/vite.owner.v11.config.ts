import { execFileSync } from 'node:child_process';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The **V11** Owner Build. Additive: `vite.owner.config.ts` is untouched and
 * still builds V10, byte for byte, from its own commit
 * (`docs/process/V11_BRIEF.md`, "The preservation contract").
 *
 * Two differences from V10's config, and only two:
 *  - the entry is `owner-v11.html`, which mounts `src/owner/main-owner-v11.tsx`;
 *  - the output directory is `dist/owner-build-v11`, because
 *    `e2e/verify-owner-build.ts` requires **exactly one** built artifact in
 *    `dist/owner-build` and a second one there would fail V10's own verify.
 *
 * Everything else is copied deliberately rather than imported: a shared config
 * object is one edit away from changing V10's bytes, and V10's bytes are the
 * thing this stage may not change.
 */

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

const sha = process.env.VIRGIL_OWNER_SHA ?? git(['rev-parse', 'HEAD']);
const worktreeDirty = git(['status', '--porcelain']) !== '';
const stage =
  process.env.VIRGIL_OWNER_V11_STAGE ??
  'V11 stage 2 — the in-world screens: one shared display system, thin ivory-and-gold bezels over the owner’s own consoles, Virgil’s slabs rebuilt, tier-scaled textures with mipmaps and anisotropy';
// Overridable for the same reason as V10's: the embedded minute is the only
// part of the output the commit does not determine, so a reviewer needs to be
// able to feed it back in and get the same bytes.
const buildDate =
  process.env.VIRGIL_OWNER_BUILD_DATE ??
  `${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`;

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
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: Number.POSITIVE_INFINITY,
    outDir: 'dist/owner-build-v11',
    emptyOutDir: true,
    chunkSizeWarningLimit: 8000,
    rollupOptions: {
      input: 'owner-v11.html',
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'owner-v11.js',
        assetFileNames: 'owner-v11.[ext]',
      },
    },
  },
});
