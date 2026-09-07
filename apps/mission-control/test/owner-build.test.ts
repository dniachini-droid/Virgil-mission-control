import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import ownerConfig from '../vite.owner.config.js';

/**
 * The Owner Build's whole purpose is to open from a `file://` URL on a machine
 * that has no toolchain. A few settings decide whether it does, and all of them
 * are easy to lose in a routine config edit — so they are asserted here rather
 * than discovered by the owner double-clicking a blank page.
 */

const config = ownerConfig as {
  publicDir?: unknown;
  build?: Record<string, unknown>;
};
const build = config.build ?? {};
const output = (build.rollupOptions as { output?: Record<string, unknown> } | undefined)?.output;

describe('Owner Build target', () => {
  it('emits a classic script, because a file:// origin refuses ES modules', () => {
    expect(output?.format).toBe('iife');
  });

  it('emits exactly one chunk, because nothing may be fetched at runtime', () => {
    expect(output?.inlineDynamicImports).toBe(true);
    expect(build.cssCodeSplit).toBe(false);
    expect(build.modulePreload).toBe(false);
    expect(build.assetsInlineLimit).toBe(Number.POSITIVE_INFINITY);
  });

  it('copies no public directory, since a sibling file never reaches the owner', () => {
    expect(config.publicDir).toBe(false);
  });
});

describe('Owner Build entry', () => {
  const entry = readFileSync(resolve(import.meta.dirname, '../src/owner/main-owner.tsx'), 'utf8');

  it('routes on the hash, because a file:// document has no server to resolve paths', () => {
    const routerImport = entry.match(/import \{[^}]*\} from 'react-router';/)?.[0] ?? '';
    expect(routerImport).toContain('HashRouter');
    expect(routerImport).not.toContain('BrowserRouter');
  });

  it('renders the unchanged Phase 0 spikes rather than a copy of them', () => {
    expect(entry).toContain("from '../spikes/foundry/FoundrySpike.js'");
    expect(entry).toContain("from '../spikes/mind/MindSpike.js'");
  });

  it('states the commit it was built from and that speed is not measured here', () => {
    expect(entry).toContain('__OWNER_BUILD_SHA__');
    expect(entry).toContain('__OWNER_BUILD_DATE__');
    expect(entry).toContain('Performance on this machine is not a measurement');
  });
});
