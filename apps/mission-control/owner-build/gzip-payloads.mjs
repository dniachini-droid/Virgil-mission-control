/**
 * **The gzip pass, and it exists only in V11's build.**
 *
 * The owner, 10 September 2026: *"Make it smaller, gzip only."* Stage 4 had
 * already measured the options with real encoders and gzip is the one that
 * costs nothing: the browser owns the decoder, so the saving is the whole
 * saving (`asset-pipeline/assess-compression.mjs`, and stage 4 item 1a).
 *
 * ## Why a build plugin and not a change to the source
 *
 * **V10's world renders from the same payload files and the same decode
 * functions V11 does.** Gzipping a committed `.b64.txt`, or adding a branch to a
 * shared decoder, follows the import graph into V10's build. This branch has
 * caught four leaks of exactly that kind — 96, 2, 2 and 914 bytes.
 *
 * They were caught by V10's byte count, which `OD-0010` has since **retired**:
 * it is no longer a contract and a differing build is no longer a breach. This
 * paragraph stated it as live and quoted a figure a clean build no longer
 * produces (the Keeper's KP3-12). The reason for the plugin is unchanged — V10's
 * source is not edited — and what is honestly gone is the detector.
 *
 * So nothing V10 compiles is edited. This plugin is registered by
 * `vite.owner.v11.config.ts` and by nothing else: not `vite.config.ts` (the dev
 * server), not `vite.owner.config.ts` (V10), not `vitest.config.ts` (the unit
 * tests, which keep reading the uncompressed payloads and keep asserting what
 * they always asserted). V10's build is therefore unchanged **by construction**,
 * and it is still proved by building it.
 *
 * ## What it does, in two moves
 *
 * 1. **Every `*.b64.txt?raw` module** becomes the same payload gzipped: the
 *    base64 is decoded to the bytes it stands for, those bytes are gzipped at
 *    maximum level, and the result is base64 again. Base64 inflates by 4/3 both
 *    times, so the comparison that matters — and the one printed at the end of
 *    the build — is base64-of-gzip against the base64 that was there before.
 * 2. **The four decode sites** — `assets/meshyAsset.ts`, `virgil/virgilRigged.ts`,
 *    `screens/fonts.ts`, `room/WindowView.tsx` — have their three-line
 *    `atob`-and-copy replaced by a call to `gzBytes`, which returns bytes that
 *    were decompressed before the app mounted (`assets/gzipPayloads.ts`).
 *
 * **Both moves assert themselves.** The three lines are matched exactly, once
 * per file, and the build **fails loudly** if a file has been edited so that the
 * pattern no longer appears, or appears twice. A silent miss would ship a world
 * that half-loads; a failed build is read by whoever ran it.
 *
 * The byte-count check each decode site already performs — the payload against
 * what its metadata declares — is untouched and becomes a round-trip check on
 * the compression for free.
 */
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

/** The three lines every payload decode site shares, verbatim. */
const ATOB_BLOCK = `  const binary = atob(BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);`;

/** Which file uses which expression as the base64 to decode. */
const DECODE_SITES = {
  'src/world/assets/meshyAsset.ts': 'base64',
  'src/world/virgil/virgilRigged.ts': 'payloadBase64',
  'src/world/screens/fonts.ts': 'base64',
  'src/world/room/WindowView.tsx': 'base64',
};

const REGISTRY = 'src/world/assets/gzipPayloads.ts';

function toPosix(value) {
  return value.split('\\').join('/');
}

/**
 * @param {string} appRoot absolute path of `apps/mission-control`
 */
export function gzipPayloads(appRoot) {
  const registryPath = resolve(appRoot, REGISTRY);
  const seen = new Set();
  let before = 0;
  let after = 0;

  return {
    name: 'virgil-gzip-payloads',
    // Ahead of Vite's own `?raw` handling, which would otherwise answer first.
    enforce: 'pre',

    load(id) {
      const [path, query] = id.split('?');
      if (query !== 'raw' || !path.endsWith('.b64.txt')) return null;
      const base64 = readFileSync(path, 'utf8');
      const gz = gzipSync(Buffer.from(base64.trim(), 'base64'), { level: 9 }).toString('base64');
      before += base64.length;
      after += gz.length;
      // A relative specifier rather than a global, so the registry is an
      // ordinary import in the graph and rollup orders it for us.
      const from = toPosix(relative(resolve(path, '..'), registryPath)).replace(/\.ts$/, '.js');
      return `import { registerGzPayload } from '${from.startsWith('.') ? from : `./${from}`}';
export default registerGzPayload(${JSON.stringify(gz)});
`;
    },

    transform(code, id) {
      const path = toPosix(relative(appRoot, id.split('?')[0]));
      const expression = DECODE_SITES[path];
      if (expression === undefined) return null;
      const block = ATOB_BLOCK.replace('BASE64', expression);
      const parts = code.split(block);
      if (parts.length !== 2) {
        throw new Error(
          `virgil-gzip-payloads: ${path} does not contain the payload decode block exactly once (found ${parts.length - 1}). The gzip pass rewrites it by hand and will not guess; restore the block or update owner-build/gzip-payloads.mjs.`,
        );
      }
      seen.add(path);
      const from = toPosix(relative(resolve(id.split('?')[0], '..'), registryPath)).replace(
        /\.ts$/,
        '.js',
      );
      const importer = from.startsWith('.') ? from : `./${from}`;
      return `import { gzBytes } from '${importer}';\n${parts[0]}  const bytes = gzBytes(${expression});${parts[1]}`;
    },

    buildEnd(error) {
      if (error) return;
      const missing = Object.keys(DECODE_SITES).filter((path) => !seen.has(path));
      if (missing.length > 0) {
        throw new Error(
          `virgil-gzip-payloads: these decode sites were never transformed — ${missing.join(', ')}. Every payload in this build is gzipped, so a site left on atob would decode compressed bytes as if they were the asset.`,
        );
      }
    },

    closeBundle() {
      if (before === 0) return;
      console.log(
        `owner build v11: payloads gzipped — ${before} B of base64 became ${after} B, ${before - after} B saved in the document, 0 B of decoder`,
      );
    },
  };
}
