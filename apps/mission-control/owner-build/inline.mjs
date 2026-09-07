/**
 * Owner Build inliner.
 *
 * Reads the Vite output in `dist/owner-build/` and writes one self-contained
 * `.html` file: markup, styles and all JavaScript in a single document with no
 * runtime request of any kind. See `docs/process/PHASE_1_PLAN.md` §1.3, which
 * prefers exactly this — a small Node script over a new dependency.
 *
 * It fails loudly rather than shipping a file that would half-work on the
 * owner's machine: if anything is left pointing outside the document, the build
 * stops here instead of at their double-click.
 *
 * Usage: node owner-build/inline.mjs   (run by `pnpm build:owner`)
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(appRoot, 'dist', 'owner-build');

const stageSlug = process.env.VIRGIL_OWNER_STAGE_SLUG ?? 's2-v4';
const shortSha = (
  process.env.VIRGIL_OWNER_SHA ??
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
).slice(0, 10);

/** Reads one emitted asset and removes it from the "still to account for" set. */
function readAsset(name, pending) {
  const path = join(outDir, name);
  pending.delete(name);
  return readFileSync(path, 'utf8');
}

/** A marker no HTML document or bundle can contain, used to hold a slot open. */
function placeholder(index) {
  return `\u0000owner-inline-${index}\u0000`;
}

function fail(message) {
  console.error(`owner build: ${message}`);
  process.exit(1);
}

const html = readFileSync(join(outDir, 'owner.html'), 'utf8');
const emitted = new Set(
  readdirSync(outDir).filter((name) => statSync(join(outDir, name)).isFile()),
);
emitted.delete('owner.html');

const styles = [];
const scripts = [];

const shell = html
  // Vite emits `<script type="module">` in the head for the entry even when
  // rollup produced a classic script. Over `file://` the module form is refused
  // outright, so the type attribute goes along with the src — and because a
  // classic script runs the moment it is parsed rather than after the document,
  // the bundle is moved to the end of the body where `#root` already exists.
  .replace(/<script\b[^>]*\bsrc="\.?\/?([^"]+)"[^>]*><\/script>/g, (_match, src) => {
    const js = readAsset(src, emitted).replace(/<\/script/gi, '<\\/script');
    scripts.push(`<script>\n${js}\n</script>`);
    return '';
  })
  .replace(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="\.?\/?([^"]+)"[^>]*>/g, (_match, href) => {
    const css = readAsset(href, emitted);
    if (/<\/style/i.test(css)) fail('stylesheet contains "</style" and cannot be inlined safely');
    return placeholder(styles.push(`<style>\n${css}\n</style>`) - 1);
  })
  .replace(/<link\b[^>]*\brel="modulepreload"[^>]*>/g, '');

// Everything Vite emitted must now be accounted for.
if (emitted.size > 0) fail(`assets not inlined: ${[...emitted].join(', ')}`);

// And the markup must not reach outside the document for anything. This is
// checked on the shell, before the bundle is pasted in, so that string literals
// inside the JavaScript cannot be mistaken for document references.
const external = [...shell.matchAll(/\b(?:src|href)="([^"]*)"/g)]
  .map((m) => m[1])
  .filter((value) => !value.startsWith('data:') && !value.startsWith('#'));
if (external.length > 0) fail(`document still references ${external.join(', ')}`);

if (scripts.length === 0) fail('no entry script found in owner.html');
if (!shell.includes('</body>')) fail('owner.html has no </body> to place the bundle before');

let inlined = shell
  .replace(/\u0000owner-inline-(\d+)\u0000/g, (_match, index) => styles[Number(index)])
  // A function replacer, because the minified bundle contains `$&` and `$1`
  // sequences that String.replace would otherwise interpret.
  .replace('</body>', () => `${scripts.join('\n')}\n</body>`);

inlined = `${inlined.trimEnd()}\n`;

const fileName = `virgil-${stageSlug}-${shortSha}.html`;
const filePath = join(outDir, fileName);
writeFileSync(filePath, inlined);

const bytes = Buffer.byteLength(inlined);
const sha256 = createHash('sha256').update(inlined).digest('hex');
writeFileSync(join(outDir, `${fileName}.sha256`), `${sha256}  ${fileName}\n`);

console.log(`owner build: ${filePath}`);
console.log(`owner build: ${(bytes / 1024 / 1024).toFixed(2)} MB (${bytes} bytes)`);
console.log(`owner build: sha256 ${sha256}`);
