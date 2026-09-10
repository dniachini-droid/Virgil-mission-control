/**
 * **The gzipped payloads, and the browser's own decoder.**
 *
 * The owner, 10 September 2026: *"Make it smaller, gzip only."*
 * (`docs/process/OWNER_DECISIONS_2026-09-10.md`, item 5.) Stage 4 measured every
 * option with real encoders (`pnpm measure:compression:v11`): Draco saves more
 * and costs a 334 kB decoder and a real risk of visual change, Meshopt saves
 * less and costs 29 kB, KTX2 would *add* 34 kB at best — and gzip saves
 * **1,316,316 bytes for nothing at all**, because every browser that can run
 * this build already contains the decoder. He chose gzip and nothing else.
 *
 * ## Why this module exists at all, rather than the payload files being gzipped
 *
 * **The preservation contract.** V10 must build to exactly 8,528,318 bytes, and
 * V10's world renders from these same payload files through these same decode
 * functions. Gzipping a file, or adding a branch to a shared decoder, moves
 * V10's bytes and breaks the contract — this is the class of leak that has been
 * caught three times on this branch, at 96 bytes, 2 bytes and 2 bytes.
 *
 * So **not one line that V10 compiles is changed.** The whole of the difference
 * is a Vite plugin that exists only in `vite.owner.v11.config.ts`
 * (`owner-build/gzip-payloads.mjs`): in V11's build, and only there, it replaces
 * each payload module with the gzipped bytes and rewrites the four decode sites
 * to come here instead of to `atob`. V10's build never loads the plugin, never
 * imports this module, and comes out of the same source bit for bit — which is
 * proved by building it, not by reasoning about it.
 *
 * ## What the runtime actually does
 *
 * `DecompressionStream('gzip')` is asynchronous and the four decode sites are
 * synchronous, so the payloads are decompressed **once, before anything is
 * rendered**: `main-owner-v11.tsx` awaits `decompressPayloads()` and only then
 * mounts the app. After that, `gzBytes` is an ordinary synchronous lookup.
 *
 * **Nothing is fetched.** The compressed bytes are base64 literals inside the
 * one document, exactly as the uncompressed ones were; `DecompressionStream`
 * runs over an in-memory stream. `verify:owner:v11` fails the build on any
 * off-document request and counts them at zero.
 *
 * **The round trip checks itself.** Each decode site already compares the byte
 * count it got against what the asset's metadata declares, and those checks are
 * untouched: a payload that came back wrong throws by name rather than drawing
 * something subtly wrong.
 *
 * ## The one thing this costs, stated rather than buried
 *
 * `DecompressionStream` needs **Safari 16.4 (March 2023)**, Chrome 80 or
 * Firefox 113. On anything older the payloads cannot be read at all, because
 * the uncompressed bytes are no longer in the document and no decoder is
 * shipped — that is the whole of what makes the saving free. An older browser
 * therefore gets a plain sentence saying so instead of a blank world
 * (`main-owner-v11.tsx`). V10's own artifact is unaffected and needs none of
 * this.
 */

/** Every compressed payload the document carries, in the order they registered. */
const registered: string[] = [];
/** What each one decompressed to. Empty until `decompressPayloads` has run. */
const decoded = new Map<string, Uint8Array>();
let done = false;

/**
 * Called by the payload modules the plugin generates, at module evaluation, so
 * that the pre-pass knows the whole set without a manifest that could drift
 * from the files. Returns its argument so the module can export it unchanged.
 */
export function registerGzPayload(base64: string): string {
  registered.push(base64);
  return base64;
}

/** The browsers that cannot do this, named where the failure is handled. */
export const NEEDS_DECOMPRESSION_STREAM =
  'This build needs a browser with DecompressionStream: Safari 16.4 or newer, Chrome 80 or newer, Firefox 113 or newer.';

export function canDecompress(): boolean {
  return typeof DecompressionStream !== 'undefined';
}

/** base64 text → the bytes it stands for, without a copy per character. */
function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Decompresses everything the document carries, once. Awaited by the V11 entry
 * before the app mounts, because the decode sites that consume these are
 * synchronous and always were.
 */
export async function decompressPayloads(): Promise<void> {
  if (done) return;
  if (!canDecompress()) throw new Error(NEEDS_DECOMPRESSION_STREAM);
  for (const base64 of registered) {
    if (decoded.has(base64)) continue;
    decoded.set(base64, await gunzip(fromBase64(base64)));
  }
  done = true;
}

/**
 * What a decode site asks for: the payload's real bytes.
 *
 * It throws rather than returning something empty, because an asset that
 * silently decodes to nothing is a world that renders wrong instead of a build
 * that stops.
 */
export function gzBytes(base64: string): Uint8Array {
  const bytes = decoded.get(base64);
  if (!bytes) {
    throw new Error(
      done
        ? 'gzipped payload: a decode site asked for bytes that were never registered'
        : 'gzipped payload: decompressPayloads() has not run yet',
    );
  }
  return bytes;
}

/** For tests: how many payloads registered, and whether the pre-pass has run. */
export function gzState(): { registered: number; decoded: number; done: boolean } {
  return { registered: registered.length, decoded: decoded.size, done };
}
