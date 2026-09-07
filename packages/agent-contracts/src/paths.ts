/**
 * Repository path normalisation and permitted-path matching, shared by the contracts, the domain
 * reducer and the gate engine so that every layer agrees on what a path is.
 *
 * A path that cannot be normalised is never permitted and never matches a pattern. Normalisation
 * rejects, rather than resolves, anything that could escape a repository-relative boundary:
 * absolute paths, drive letters, home-relative paths, URLs, backslash separators, NUL bytes,
 * percent-encoded separators or dots, and any `..` segment. `.` segments and repeated slashes are
 * collapsed so that `apps/./x//a.ts` and `apps/x/a.ts` are the same path.
 */
export type NormalisedPath = { ok: true; path: string } | { ok: false; reason: string };

const percentEncodedSeparatorOrDot = /%(2e|2f|5c|00)/i;
const driveLetter = /^[A-Za-z]:/;
const urlScheme = /^[a-z][a-z0-9+.-]*:\/\//i;

function normalise(input: unknown, opts: { pattern: boolean }): NormalisedPath {
  if (typeof input !== 'string') return { ok: false, reason: 'path is not a string' };
  if (input.length === 0) return { ok: false, reason: 'empty path' };
  if (input.length > 4096) return { ok: false, reason: 'path longer than 4096 characters' };
  if (input.includes('\0')) return { ok: false, reason: 'NUL byte in path' };
  if (input.includes('\\')) return { ok: false, reason: 'backslash separator' };
  if (percentEncodedSeparatorOrDot.test(input))
    return { ok: false, reason: 'percent-encoded separator or dot' };
  if (driveLetter.test(input)) return { ok: false, reason: 'drive-letter absolute path' };
  if (urlScheme.test(input)) return { ok: false, reason: 'URL is not a repository path' };
  if (input.startsWith('/')) return { ok: false, reason: 'absolute path' };
  if (input.startsWith('~')) return { ok: false, reason: 'home-relative path' };
  if (/\s/.test(input)) return { ok: false, reason: 'whitespace in path' };
  const trailingSlash = input.endsWith('/');
  const out: string[] = [];
  for (const seg of input.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') return { ok: false, reason: 'parent traversal segment' };
    if (/^\.{3,}$/.test(seg)) return { ok: false, reason: 'dot-only segment' };
    if (seg.includes('*')) {
      if (!opts.pattern) return { ok: false, reason: 'glob character in a concrete path' };
      if (seg.includes('**') && seg !== '**') return { ok: false, reason: 'malformed ** segment' };
    }
    out.push(seg);
  }
  if (out.length === 0) return { ok: false, reason: 'path resolves to the repository root' };
  const path = out.join('/');
  return { ok: true, path: trailingSlash && opts.pattern ? `${path}/` : path };
}

/** A concrete repository-relative file or directory path. Globs are rejected. */
export function normaliseRepoPath(input: unknown): NormalisedPath {
  return normalise(input, { pattern: false });
}

/** A permitted-path pattern: a concrete path, a directory prefix ending in `/`, or a glob with `*` and `**`. */
export function normaliseRepoPathPattern(input: unknown): NormalisedPath {
  return normalise(input, { pattern: true });
}

export const isValidRepoPath = (input: unknown): boolean => normaliseRepoPath(input).ok;
export const isValidRepoPathPattern = (input: unknown): boolean =>
  normaliseRepoPathPattern(input).ok;

function escapeRegExp(s: string): string {
  return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

/** Whether one normalised pattern permits one normalised path. */
function matches(path: string, pattern: string): boolean {
  if (pattern === '**') return true;
  if (pattern.endsWith('/**')) {
    const dir = pattern.slice(0, -3);
    return path === dir || path.startsWith(`${dir}/`);
  }
  if (pattern.endsWith('/')) return path === pattern.slice(0, -1) || path.startsWith(pattern);
  if (pattern.includes('*')) {
    const re = pattern
      .split('/')
      .map((seg) =>
        seg === '**' ? '(?:[^/]+/)*[^/]+' : seg.split('*').map(escapeRegExp).join('[^/]*'),
      )
      .join('/');
    return new RegExp(`^${re}$`).test(path);
  }
  return path === pattern;
}

/**
 * True when `path` normalises and at least one pattern normalises and permits it. Every path is
 * normalised before comparison, so `apps/x/../../constitution/authority.json` cannot match
 * `apps/x/**` (it is rejected outright) and `apps//x/./a.ts` matches `apps/x/**`.
 */
export function pathPermitted(path: unknown, patterns: readonly unknown[]): boolean {
  const p = normaliseRepoPath(path);
  if (!p.ok) return false;
  return patterns.some((pattern) => {
    const n = normaliseRepoPathPattern(pattern);
    return n.ok && matches(p.path, n.path);
  });
}

/** Paths in `paths` that are not permitted by `patterns`; unnormalisable paths are always listed. */
export function pathsOutsidePatterns(
  paths: readonly unknown[],
  patterns: readonly unknown[],
): string[] {
  return paths.filter((p) => !pathPermitted(p, patterns)).map((p) => String(p));
}

/** The literal prefix of a pattern before its first glob character. */
export function patternLiteralPrefix(pattern: string): string {
  return pattern.split('*')[0] ?? '';
}

/**
 * True when two patterns could cover a common path (conservative, prefix-based). Both are
 * normalised first; an unnormalisable pattern is treated as overlapping everything, because it
 * cannot be shown to stay inside any boundary.
 */
export function patternsMayOverlap(a: unknown, b: unknown): boolean {
  const na = normaliseRepoPathPattern(a);
  const nb = normaliseRepoPathPattern(b);
  if (!na.ok || !nb.ok) return true;
  const pa = patternLiteralPrefix(na.path);
  const pb = patternLiteralPrefix(nb.path);
  return pa.startsWith(pb) || pb.startsWith(pa);
}
