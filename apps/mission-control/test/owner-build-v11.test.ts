import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import v10Config from '../vite.owner.config.js';
import v11Config from '../vite.owner.v11.config.js';

/**
 * **The preservation contract, as a test.**
 *
 * `docs/process/V11_BRIEF.md` requires that V10 stays openable and unchanged so
 * the owner can compare and go back, and names the files that may not be
 * edited, renamed or refactored. Prose cannot enforce that; a future session
 * reading only the code would have no way to know. So the contract is asserted
 * here, and the assertions fail loudly rather than let V10 drift.
 *
 * What these assertions establish and what they do not, stated as
 * `ENFORCEMENT_BOUNDARIES.md` requires of every such claim: they read files.
 * They prove that V10's entry still names its four routes, that its build still
 * writes where it wrote, and that V11 adds rather than replaces. They do **not**
 * prove the artifact is unchanged — only `pnpm reproduce:owner`, which rebuilds
 * V10's committed artifact at its own source commit and compares with `cmp`,
 * can do that, and it is in `pnpm check`'s workflow for exactly this reason.
 */

const app = (path: string) => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');

const v10Entry = app('src/owner/main-owner.tsx');
const v11Entry = app('src/owner/main-owner-v11.tsx');

describe('V10 is untouched by V11', () => {
  it('still serves its four routes, by the same names', () => {
    for (const route of ['path="/"', 'path="/s1"', 'path="/spike/foundry"', 'path="/spike/mind"']) {
      expect(v10Entry).toContain(route);
    }
    // And has not acquired V11's.
    expect(v10Entry).not.toContain('main-owner-v11');
    expect(v10Entry).not.toContain('MobileRoom');
  });

  it('still routes the default at V10’s own room component', () => {
    expect(v10Entry).toContain('<Route path="/" element={<VirgilRoom />} />');
  });

  it('still builds into dist/owner-build, which V11 may not share', () => {
    const v10 = v10Config as { build?: { outDir?: string; rollupOptions?: { input?: string } } };
    const v11 = v11Config as { build?: { outDir?: string; rollupOptions?: { input?: string } } };
    expect(v10.build?.outDir).toBe('dist/owner-build');
    expect(v10.build?.rollupOptions?.input).toBe('owner.html');
    expect(v11.build?.outDir).toBe('dist/owner-build-v11');
    expect(v11.build?.rollupOptions?.input).toBe('owner-v11.html');
    expect(v11.build?.outDir).not.toBe(v10.build?.outDir);
  });

  it('keeps its own inliner and its own reproducer, neither of which V11 edits', () => {
    const inline = app('owner-build/inline.mjs');
    const reproduce = app('owner-build/reproduce.mjs');
    expect(inline).toContain("join(appRoot, 'dist', 'owner-build')");
    expect(inline).toContain("VIRGIL_OWNER_STAGE_SLUG ?? 'v10-s2'");
    expect(reproduce).toContain("const ARTIFACT_DIR = 'docs/process/PHASE_1_owner-builds'");
    expect(reproduce).toContain("'build:owner'");
    expect(reproduce).not.toContain('build:owner:v11');
  });

  it('is reachable inside the V11 build, rendered by its own component', () => {
    expect(v11Entry).toContain("from '../world/room/VirgilRoom.js'");
    expect(v11Entry).toContain('path="/v10"');
    // With its own provenance footer, so the route reads as V10 reads.
    expect(v11Entry).toContain('owner-footer');
  });
});

describe('the V11 build target', () => {
  const config = v11Config as { publicDir?: unknown; build?: Record<string, unknown> };
  const build = config.build ?? {};
  const output = (build.rollupOptions as { output?: Record<string, unknown> } | undefined)?.output;

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

  it('takes the build minute from the environment, so a rebuild can be byte-identical', () => {
    const source = app('vite.owner.v11.config.ts');
    expect(source).toContain('VIRGIL_OWNER_BUILD_DATE');
  });
});

describe('the V11 inliner enforces the same rules as V10’s', () => {
  const inline = app('owner-build/inline-v11.mjs');

  it('reads V11’s own output directory and entry', () => {
    expect(inline).toContain("join(appRoot, 'dist', 'owner-build-v11')");
    expect(inline).toContain("'owner-v11.html'");
  });

  it('fails rather than ship a document that reaches outside itself', () => {
    expect(inline).toContain('assets not inlined');
    expect(inline).toContain('document still references');
    expect(inline).toContain('no entry script found');
  });

  it('names the artifact with the viewing point at the front, as V7 established', () => {
    expect(inline).toContain("VIRGIL_OWNER_V11_STAGE_SLUG ?? 'v11-s1'");
    expect(inline).toContain('${stageSlug}-virgil-${shortSha}.html');
  });

  it('writes a digest beside the artifact', () => {
    expect(inline).toContain('.sha256`), `${sha256}  ${fileName}');
  });
});

describe('the V11 entry', () => {
  it('routes on the hash, because a file:// document has no server to resolve paths', () => {
    const routerImport = v11Entry.match(/import \{[^}]*\} from 'react-router';/)?.[0] ?? '';
    expect(routerImport).toContain('HashRouter');
    expect(routerImport).not.toContain('BrowserRouter');
  });

  it('renders the unchanged Phase 0 spikes rather than a copy of them', () => {
    expect(v11Entry).toContain("from '../spikes/foundry/FoundrySpike.js'");
    expect(v11Entry).toContain("from '../spikes/mind/MindSpike.js'");
  });

  it('states the commit it was built from, and passes it into the world', () => {
    expect(v11Entry).toContain('__OWNER_BUILD_SHA__');
    expect(v11Entry).toContain('__OWNER_BUILD_DATE__');
    expect(v11Entry).toContain('__OWNER_BUILD_SHORT_SHA__');
  });

  it('keeps the performance disclaimer in the build, moved rather than deleted', () => {
    // It has left the ordinary interface for the development menu, which is
    // the brief's instruction; it has not left the product.
    expect(app('src/world/mobile/MobileRoom.tsx')).toContain(
      'Performance on this machine is not a measurement',
    );
  });
});

describe('the V11 chrome file cannot reach V10’s', () => {
  const css = app('src/world/mobile/mobile.css');

  it('styles nothing V10 owns', () => {
    for (const selector of ['.room-controls', '.room-demo-badge', '.owner-footer']) {
      // `.v11-stage .panel-*` rules are scoped and are the one exception,
      // asserted separately below.
      expect(css.includes(`${selector} {`), selector).toBe(false);
    }
  });

  it('scopes its one panel change under the V11 stage', () => {
    const panelRules = [...css.matchAll(/^\.[^\n{]*\.panel[^\n{]*\{/gm)].map((m) => m[0]);
    for (const rule of panelRules) expect(rule.startsWith('.v11-stage ')).toBe(true);
  });

  it('declares a static fallback before every dynamic viewport unit', () => {
    // `100dvh` with no `100vh` before it is a blank page on an older browser.
    const dvh = [...css.matchAll(/height: 100dvh;/g)];
    expect(dvh.length).toBeGreaterThan(0);
    for (const match of dvh) {
      const before = css.slice(0, match.index ?? 0);
      expect(before.endsWith('height: 100vh;\n  ')).toBe(true);
    }
  });

  it('positions its chrome from the safe-area insets, not from raw pixels', () => {
    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(css).toContain(`env(safe-area-inset-${side}, 0px)`);
    }
  });
});

describe('the V11 document asks the browser to paint under the insets', () => {
  const html = app('owner-v11.html');

  it('sets viewport-fit=cover, which is what makes env() return anything at all', () => {
    expect(html.replace(/\s+/g, ' ')).toContain('viewport-fit=cover');
  });

  it('does not refuse pinch zoom', () => {
    // The meta tag's own content, not the file: the comment above it explains
    // why `user-scalable=no` is absent and would match a naive search.
    const meta = html.replace(/<!--[\s\S]*?-->/g, '').match(/name="viewport"[\s\S]*?>/)?.[0] ?? '';
    expect(meta).not.toContain('user-scalable');
    expect(meta).not.toContain('maximum-scale');
  });

  it('mounts the V11 entry and no other', () => {
    expect(html).toContain('/src/owner/main-owner-v11.tsx');
    expect(html).not.toContain('/src/owner/main-owner.tsx');
  });
});

describe('a fingerprint of V10’s protected files', () => {
  /**
   * Not a security measure and not claimed as one: anyone editing these files
   * can update the digests below in the same commit. It is a **tripwire**, so
   * that a change to V10 is a deliberate act with a diff a reviewer will see,
   * rather than a refactor that swept through and nobody noticed until the
   * owner opened the file.
   */
  const digests: Record<string, string> = {
    'owner.html': '0f849748ab137c4885d92cbbdaf824240630e34649fed723a23ed766f7a17f76',
    'src/owner/main-owner.tsx': '57fe69bb9d3c6bb50d3454fbcf4fda9dd9418373e8948da5926c20a8ade5dcd8',
    'vite.owner.config.ts': '0c27ec7ef6fc4774d21127f04fbbc4bf7a8cef9747ee286e3c95c2ba787b1c8b',
    'owner-build/inline.mjs': 'b6c588a57344dd6e0e8a23553b578f1cc00e45621e7109c113eb673de35f8311',
    'owner-build/reproduce.mjs': '01b2f367d6ed07a3e29511fe4f77c812646a47f9bcdfb100220daa772ccff4b6',
  };

  it('records what they hash to now', () => {
    const actual: Record<string, string> = {};
    for (const path of Object.keys(digests)) {
      actual[path] = createHash('sha256')
        .update(readFileSync(resolve(import.meta.dirname, '..', path)))
        .digest('hex');
    }
    expect(actual).toEqual(digests);
  });
});
