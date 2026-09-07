import { describe, expect, it } from 'vitest';
import {
  normaliseRepoPath,
  normaliseRepoPathPattern,
  pathPermitted,
  pathsOutsidePatterns,
  patternsMayOverlap,
  RepoPath,
  RepoPathPattern,
} from '../src/index.js';

describe('repository path normalisation', () => {
  it('collapses dot segments and repeated separators', () => {
    expect(normaliseRepoPath('apps/./x//a.ts')).toEqual({ ok: true, path: 'apps/x/a.ts' });
    expect(normaliseRepoPath('./apps/x/')).toEqual({ ok: true, path: 'apps/x' });
    expect(normaliseRepoPathPattern('apps/x/')).toEqual({ ok: true, path: 'apps/x/' });
    expect(normaliseRepoPathPattern('apps/**/*.ts')).toEqual({ ok: true, path: 'apps/**/*.ts' });
  });
  it('rejects every form of escape rather than resolving it', () => {
    const bad = [
      '',
      '/etc/passwd',
      '~/x',
      'C:/x',
      'c:\\x',
      'apps\\x',
      '../x',
      'apps/../x',
      'apps/x/..',
      'apps/%2e%2e/x',
      'apps/%2Fx',
      'apps/%5cx',
      'apps/%00x',
      'apps/.../x',
      'https://example.test/x',
      'apps/x\0',
      'apps/x y',
      '.',
      './',
    ];
    for (const p of bad) {
      expect(normaliseRepoPath(p).ok, p).toBe(false);
      expect(normaliseRepoPathPattern(p).ok, p).toBe(false);
    }
    expect(normaliseRepoPath('apps/*.ts').ok).toBe(false);
    expect(normaliseRepoPathPattern('apps/a**b/x').ok).toBe(false);
    expect(normaliseRepoPath(42).ok).toBe(false);
  });
  it('is the contract behind RepoPath and RepoPathPattern', () => {
    expect(RepoPath.safeParse('apps/x/a.ts').success).toBe(true);
    expect(RepoPath.safeParse('apps/**').success).toBe(false);
    expect(RepoPath.safeParse('apps/../x').success).toBe(false);
    expect(RepoPathPattern.safeParse('apps/**').success).toBe(true);
    expect(RepoPathPattern.safeParse('apps/%2e%2e/**').success).toBe(false);
  });
});

describe('permitted-path matching', () => {
  const patterns = ['apps/x/src/**', 'docs/*.md', 'packages/y/', 'README.md', 'tools/**/*.ts'];
  it('permits normalised paths inside a pattern', () => {
    expect(pathPermitted('apps/x/src/a.ts', patterns)).toBe(true);
    expect(pathPermitted('apps/x/src', patterns)).toBe(true);
    expect(pathPermitted('apps/x/./src//deep/a.ts', patterns)).toBe(true);
    expect(pathPermitted('docs/a.md', patterns)).toBe(true);
    expect(pathPermitted('packages/y/z.ts', patterns)).toBe(true);
    expect(pathPermitted('README.md', patterns)).toBe(true);
    expect(pathPermitted('tools/a/b/c.ts', patterns)).toBe(true);
    expect(pathPermitted('anything', ['**'])).toBe(true);
  });
  it('refuses traversal, absolute and encoded paths whatever the pattern says', () => {
    for (const p of [
      'apps/x/src/../../../constitution/authority.json',
      '/apps/x/src/a.ts',
      'apps/x/src/%2e%2e/a.ts',
      'apps\\x\\src\\a.ts',
      'apps/x/srcfoo/a.ts',
      'docs/sub/a.md',
      'packages/yy/z.ts',
      'tools/a.js',
    ]) {
      expect(pathPermitted(p, patterns), p).toBe(false);
      expect(pathPermitted(p, ['**']), p).toBe(
        p === 'tools/a.js' ||
          p === 'docs/sub/a.md' ||
          p === 'packages/yy/z.ts' ||
          p === 'apps/x/srcfoo/a.ts',
      );
    }
    expect(pathPermitted('apps/x/src/a.ts', ['apps/../x/src/**'])).toBe(false);
    expect(pathsOutsidePatterns(['apps/x/src/a.ts', '../x', 'other'], patterns)).toEqual([
      '../x',
      'other',
    ]);
  });
  it('detects overlap conservatively and treats unnormalisable patterns as overlapping', () => {
    expect(patternsMayOverlap('docs/**', 'docs/decisions/OD-*')).toBe(true);
    expect(patternsMayOverlap('docs/product/acceptance/', 'docs/architecture/plans/')).toBe(false);
    expect(patternsMayOverlap('apps/../docs/**', 'packages/**')).toBe(true);
  });
});
