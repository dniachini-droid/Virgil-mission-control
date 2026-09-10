import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
// @ts-expect-error — a plain .mjs build script, deliberately not part of the app's
// TypeScript program: it must never be reachable from anything V10 compiles.
import { gzipPayloads } from './owner-build/gzip-payloads.mjs';

/**
 * The **V11** Owner Build. Additive: `vite.owner.config.ts` is untouched and
 * still builds V10, byte for byte, from its own commit
 * (`docs/process/V11_BRIEF.md`, "The preservation contract").
 *
 * Three differences from V10's config, and only three:
 *  - the entry is `owner-v11.html`, which mounts `src/owner/main-owner-v11.tsx`;
 *  - the output directory is `dist/owner-build-v11`, because
 *    `e2e/verify-owner-build.ts` requires **exactly one** built artifact in
 *    `dist/owner-build` and a second one there would fail V10's own verify;
 *  - **the gzip pass** (`owner-build/gzip-payloads.mjs`), which is the owner's
 *    decision of 10 September — *"Make it smaller, gzip only"* — and which is
 *    registered here and nowhere else. It compresses every payload in this
 *    build and rewrites the four decode sites to read the decompressed bytes.
 *    **It is a build plugin precisely so that V10 stays untouched**: V10's world
 *    renders from the same payload files through the same decode functions, so
 *    gzipping a file or branching a shared decoder would move V10's bytes. The
 *    plugin is not in `vite.config.ts`, not in `vite.owner.config.ts` and not in
 *    `vitest.config.ts`, so nothing else in this repository sees a compressed
 *    payload.
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
// The stage line is the build-identity signal the brief's first caution is
// about: it is what diagnosed the day the owner was served a stale build. It is
// changed whenever what the file contains changes, which is why it names this
// pass rather than still naming stage 3 alone.
// **The Keeper's KS4-03.** This string claimed *"the cast loaded before the
// backdrop"*, which is a property the same pass **measured and switched off**:
// the split puts the cast eleven seconds *later* than the backdrop, so the
// default is one boundary in V10's order and `#/?defer=1` keeps the experiment
// reproducible. A build-identity signal that describes something the build does
// not do is the one thing the brief's first caution is about, so the clause is
// replaced by what the artifact actually contains.
const stage =
  process.env.VIRGIL_OWNER_V11_STAGE ??
  'V11 stage 4, and the pass that acts on the owner’s decisions of 10 September — tapping a station is two steps now, the camera first and the record on the next tap, reversing his own decision of 8 September on his instruction; V11 is the version he opens and V10 is still in this same file at #/v10, unchanged, now one press away in the hidden menu; every payload is gzipped and decoded by the browser’s own DecompressionStream, which needs Safari 16.4 or newer and ships no decoder at all; and the tracked scratch is out of the tree. Carried from stage 4: performance — a graceful reduced-performance mode that gives up invisible work before sharpness, a pixel ratio derived from the tier’s own pixel budget rather than assumed, the world slowed under an open window and stopped when the page is hidden, the load-order split measured and left OFF (the cast loads eleven seconds after the backdrop when it is on; #/?defer=1 re-runs it); the twelve review states each reachable from a URL';
// Overridable for the same reason as V10's: the embedded minute is the only
// part of the output the commit does not determine, so a reviewer needs to be
// able to feed it back in and get the same bytes.
const buildDate =
  process.env.VIRGIL_OWNER_BUILD_DATE ??
  `${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`;

const appRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [gzipPayloads(resolve(appRoot)), react()],
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
