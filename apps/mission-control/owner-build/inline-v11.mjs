/**
 * The **V11** Owner Build inliner.
 *
 * A deliberate sibling of `inline.mjs` rather than a refactor of it. V10's
 * inliner may not be edited (`docs/process/V11_BRIEF.md`, "The preservation
 * contract"), and parameterising it would be an edit — so this file reads
 * `dist/owner-build-v11/owner-v11.html` and writes one self-contained document
 * beside it. The rules it enforces are the same rules, restated rather than
 * shared, and `test/owner-build-v11.test.ts` asserts they have not drifted
 * apart.
 *
 * Usage: node owner-build/inline-v11.mjs   (run by `pnpm build:owner:v11`)
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(appRoot, 'dist', 'owner-build-v11');

// The viewing point at the FRONT of the name, as V7 established, so a folder of
// downloads sorts and reads unambiguously.
const stageSlug = process.env.VIRGIL_OWNER_V11_STAGE_SLUG ?? 'v11-s4';
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
  console.error(`owner build v11: ${message}`);
  process.exit(1);
}

const html = readFileSync(join(outDir, 'owner-v11.html'), 'utf8');
const emitted = new Set(
  readdirSync(outDir).filter((name) => statSync(join(outDir, name)).isFile()),
);
emitted.delete('owner-v11.html');

const styles = [];
const scripts = [];

const shell = html
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

if (emitted.size > 0) fail(`assets not inlined: ${[...emitted].join(', ')}`);

const external = [...shell.matchAll(/\b(?:src|href)="([^"]*)"/g)]
  .map((m) => m[1])
  .filter((value) => !value.startsWith('data:') && !value.startsWith('#'));
if (external.length > 0) fail(`document still references ${external.join(', ')}`);

if (scripts.length === 0) fail('no entry script found in owner-v11.html');
if (!shell.includes('</body>')) fail('owner-v11.html has no </body> to place the bundle before');

let inlined = shell
  .replace(/\u0000owner-inline-(\d+)\u0000/g, (_match, index) => styles[Number(index)])
  .replace('</body>', () => `${scripts.join('\n')}\n</body>`);

inlined = `${inlined.trimEnd()}\n`;

const fileName = `${stageSlug}-virgil-${shortSha}.html`;
const filePath = join(outDir, fileName);
writeFileSync(filePath, inlined);

const bytes = Buffer.byteLength(inlined);
const sha256 = createHash('sha256').update(inlined).digest('hex');
writeFileSync(join(outDir, `${fileName}.sha256`), `${sha256}  ${fileName}\n`);

console.log(`owner build v11: ${filePath}`);
console.log(`owner build v11: ${(bytes / 1024 / 1024).toFixed(2)} MB (${bytes} bytes)`);
console.log(`owner build v11: sha256 ${sha256}`);
