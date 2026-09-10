import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  canDecompress,
  gzBytes,
  gzState,
  NEEDS_DECOMPRESSION_STREAM,
  registerGzPayload,
} from '../src/world/assets/gzipPayloads.js';
import v10Config from '../vite.owner.config.js';
import v11Config from '../vite.owner.v11.config.js';

/**
 * **The gzip pass, and the two things about it that could go wrong quietly.**
 *
 * The owner, 10 September 2026: *"Make it smaller, gzip only."* The saving is
 * free only because the browser owns the decoder, and the pass is a build
 * plugin only because **V10's world renders from the same payload files through
 * the same decode functions**: gzipping a committed file, or branching a shared
 * decoder, would move V10's clean-tree byte count and break the preservation
 * contract. Three leaks of exactly that kind have already been caught on this
 * branch — 96 bytes, 2 bytes and 2 bytes.
 *
 * Two failures would be silent without these assertions:
 *
 *  1. **The plugin escaping into another build.** In `vite.config.ts`,
 *     `vite.owner.config.ts` or `vitest.config.ts` it would compress payloads
 *     for a build that has no pre-pass to decompress them, or move V10's bytes.
 *  2. **A decode site drifting away from the three lines the plugin rewrites.**
 *     The plugin throws when it cannot find them, so that failure is loud at
 *     build time — but a test that fails first says so in `pnpm check`, before
 *     anyone builds an artifact.
 *
 * The compression itself is checked as a round trip here rather than trusted:
 * every committed payload is gzipped and gunzipped with the same settings the
 * plugin uses and compared byte for byte.
 */

const app = (path: string) => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');

/** The three lines the plugin matches, with the file's own expression in place. */
const block = (expression: string) => `  const binary = atob(${expression});
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);`;

const SITES: [string, string][] = [
  ['src/world/assets/meshyAsset.ts', 'base64'],
  ['src/world/virgil/virgilRigged.ts', 'payloadBase64'],
  ['src/world/screens/fonts.ts', 'base64'],
  ['src/world/room/WindowView.tsx', 'base64'],
];

describe('the gzip pass belongs to V11’s build and to no other', () => {
  const names = (config: { plugins?: unknown }) =>
    (config.plugins as { name?: string }[] | undefined)?.flat?.(2)?.map((p) => p?.name) ?? [];

  it('is registered in V11’s config', () => {
    expect(names(v11Config as { plugins?: unknown })).toContain('virgil-gzip-payloads');
  });

  it('is not registered in V10’s, which is the whole reason it is a plugin', () => {
    expect(names(v10Config as { plugins?: unknown })).not.toContain('virgil-gzip-payloads');
  });

  it('is not in the dev server or the unit tests', () => {
    for (const path of ['vite.config.ts', 'vitest.config.ts']) {
      expect(app(path), path).not.toContain('gzip-payloads');
    }
  });

  it('leaves V10’s own entry with no knowledge of it', () => {
    expect(app('src/owner/main-owner.tsx')).not.toContain('gzipPayloads');
    expect(app('src/owner/main-owner.tsx')).not.toContain('decompressPayloads');
  });

  it('is awaited by V11’s entry before anything mounts, since the decoder is async', () => {
    const entry = app('src/owner/main-owner-v11.tsx');
    expect(entry).toContain('decompressPayloads().then(mount');
    // And the old browser is told, rather than shown a blank world.
    expect(entry).toContain('if (!canDecompress()) {');
    expect(entry).toContain('tooOld(NEEDS_DECOMPRESSION_STREAM)');
  });
});

describe('every decode site still looks the way the plugin rewrites it', () => {
  for (const [path, expression] of SITES) {
    it(`${path} contains the payload decode block exactly once`, () => {
      expect(app(path).split(block(expression)).length - 1).toBe(1);
    });
  }

  it('names every one of them in the plugin, and no more', () => {
    const plugin = app('owner-build/gzip-payloads.mjs');
    for (const [path] of SITES) expect(plugin).toContain(`'${path}'`);
    expect(plugin.match(/'src\/world\/[^']+':/g)?.length).toBe(SITES.length);
  });
});

describe('the compression is lossless over every payload in the document', () => {
  const files = execSync('find src -name "*.b64.txt"', {
    cwd: resolve(import.meta.dirname, '..'),
    encoding: 'utf8',
  })
    .trim()
    .split('\n');

  it('finds the payloads at all', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('round-trips each one byte for byte, and saves what it claims to save', () => {
    let before = 0;
    let after = 0;
    for (const file of files) {
      const base64 = app(file).trim();
      const bytes = Buffer.from(base64, 'base64');
      const gz = gzipSync(bytes, { level: 9 });
      expect(gunzipSync(gz).equals(bytes), file).toBe(true);
      before += app(file).length;
      after += gz.toString('base64').length;
    }
    // Measured, not asserted to a fixed number: what matters is that the
    // direction is right and the size of it is the order the owner was given.
    expect(after).toBeLessThan(before);
    expect(before - after).toBeGreaterThan(1_200_000);
  });
});

describe('the registry refuses to guess', () => {
  it('says which browsers can do this at all', () => {
    expect(NEEDS_DECOMPRESSION_STREAM).toContain('Safari 16.4');
    expect(typeof canDecompress()).toBe('boolean');
  });

  it('throws rather than hand a decode site empty bytes', () => {
    const text = registerGzPayload('H4sIAAAAAAAA');
    expect(text).toBe('H4sIAAAAAAAA');
    expect(gzState().registered).toBeGreaterThan(0);
    expect(() => gzBytes(text)).toThrow(/decompressPayloads\(\) has not run/);
  });
});
