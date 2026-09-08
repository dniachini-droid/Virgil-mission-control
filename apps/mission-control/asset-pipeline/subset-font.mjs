/**
 * Subsets a TrueType font to the glyphs the screens draw, and packs it as a
 * base64 payload the bundle imports — the same route the models take, so the
 * Owner Build still issues no request and still contains no `data:` URI. The
 * font is registered at runtime through the `FontFace` constructor from an
 * in-memory buffer (`src/world/screens/fonts.ts`).
 *
 * ADR-0010 forbids *fetching* a font (troika's network default); its own
 * Consequences line anticipates bundled fonts in Phase 1. This is inside
 * that decision, not an amendment of it.
 *
 * What is kept: `head`, `hhea`, `maxp`, `OS/2`, `hmtx`, `name`, `glyf`,
 * `loca`, a rebuilt `cmap` (one format-4 subtable mapping only the kept
 * characters) and a rebuilt `post` (format 3, no glyph names). Every glyph
 * outline not reachable from the kept characters — including through
 * composite components, which are followed — is replaced by an empty glyph,
 * so glyph indices do not change and `hmtx` stays valid. Dropped outright:
 * `GPOS`, `GSUB`, `GDEF`, `STAT`, `gasp`, `prep`, `fpgm`, `cvt `, `meta`,
 * `DSIG` — kerning and hinting, which the screens do not use at their sizes.
 *
 * Subsetting is a modification of the Font Software under the SIL Open
 * Font License 1.1 and is recorded as one in
 * `assets/licenses/ASSET_PROVENANCE.md`. The unmodified source fonts are
 * committed under `assets/fonts/` with their licence texts beside them
 * under `assets/licenses/`; this script refuses a source whose SHA-256
 * differs from the one the register records, as `pack-window.mjs` does.
 *
 * Usage: node asset-pipeline/subset-font.mjs
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '../..');
const outDir = join(appRoot, 'src/world/screens/fonts');

/** ASCII printable plus the few typographic marks the screens use. */
const PUNCTUATION = ' .,:;-–—·/%()_+#\'"?!&[]<>=|*';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';

/** Source digests as recorded in `assets/licenses/ASSET_PROVENANCE.md`. */
const FONTS = [
  {
    name: 'tektur-medium',
    family: 'Tektur',
    source: 'assets/fonts/Tektur-Medium.ttf',
    sourceSha256: '52bbe8c9b057b3d2da4eeace31a524b1ea26a1375ae34319cf6900ccc57a4c82',
    licence: 'assets/licenses/TEKTUR-OFL.txt',
    // Display: the screens set it in capitals only.
    characters: UPPER + DIGITS + PUNCTUATION,
  },
  {
    name: 'geist-mono-regular',
    family: 'Geist Mono',
    source: 'assets/fonts/GeistMono-Regular.ttf',
    sourceSha256: 'a55c1b51cda4afeab9e471e7947b85a20f7c8831d7e6b1470c1b7fbdc0f0f15e',
    licence: 'assets/licenses/GEISTMONO-OFL.txt',
    // Data: hashes, counts and small labels, upper and lower case.
    characters: UPPER + LOWER + DIGITS + PUNCTUATION,
  },
];

const KEEP = new Set(['head', 'hhea', 'maxp', 'OS/2', 'hmtx', 'name']);

function fail(message) {
  console.error(`subset-font: ${message}`);
  process.exit(1);
}

function pad4(n) {
  return (n + 3) & ~3;
}

function checksum(buf) {
  let sum = 0;
  const padded = Buffer.concat([buf, Buffer.alloc(pad4(buf.length) - buf.length)]);
  for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0;
  return sum;
}

function subset(font) {
  const file = readFileSync(join(repoRoot, font.source));
  const sourceSha = createHash('sha256').update(file).digest('hex');
  if (sourceSha !== font.sourceSha256) {
    fail(`${font.name}: ${font.source} is ${sourceSha}, the register records ${font.sourceSha256}`);
  }
  const licence = readFileSync(join(repoRoot, font.licence), 'utf8');
  if (!licence.includes('SIL OPEN FONT LICENSE Version 1.1'))
    fail(`${font.name}: licence is not OFL 1.1`);
  if (file.readUInt32BE(0) !== 0x00010000) fail(`${font.name}: not a TrueType (glyf) font`);

  const numTables = file.readUInt16BE(4);
  const tables = new Map();
  for (let i = 0; i < numTables; i += 1) {
    const o = 12 + i * 16;
    const tag = file.toString('latin1', o, o + 4);
    const offset = file.readUInt32BE(o + 8);
    const length = file.readUInt32BE(o + 12);
    tables.set(tag, file.subarray(offset, offset + length));
  }
  for (const tag of [
    'head',
    'hhea',
    'maxp',
    'OS/2',
    'hmtx',
    'name',
    'cmap',
    'loca',
    'glyf',
    'post',
  ]) {
    if (!tables.has(tag)) fail(`${font.name}: no ${tag} table`);
  }

  const head = Buffer.from(tables.get('head'));
  const indexToLocFormat = head.readInt16BE(50);
  const numGlyphs = tables.get('maxp').readUInt16BE(4);

  // ---- cmap: find the (3,1) format 4 or (3,10) format 12 subtable.
  const cmap = tables.get('cmap');
  const map = new Map();
  const n = cmap.readUInt16BE(2);
  for (let i = 0; i < n; i += 1) {
    const platform = cmap.readUInt16BE(4 + i * 8);
    const encoding = cmap.readUInt16BE(6 + i * 8);
    const offset = cmap.readUInt32BE(8 + i * 8);
    const format = cmap.readUInt16BE(offset);
    if (platform === 3 && (encoding === 1 || encoding === 10) && format === 4 && map.size === 0) {
      const segX2 = cmap.readUInt16BE(offset + 6);
      const seg = segX2 / 2;
      const ends = offset + 14;
      const starts = ends + segX2 + 2;
      const deltas = starts + segX2;
      const ranges = deltas + segX2;
      for (let s = 0; s < seg; s += 1) {
        const end = cmap.readUInt16BE(ends + s * 2);
        const start = cmap.readUInt16BE(starts + s * 2);
        const delta = cmap.readInt16BE(deltas + s * 2);
        const rangeOffset = cmap.readUInt16BE(ranges + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c += 1) {
          let gid;
          if (rangeOffset === 0) gid = (c + delta) & 0xffff;
          else {
            const addr = ranges + s * 2 + rangeOffset + (c - start) * 2;
            gid = cmap.readUInt16BE(addr);
            if (gid !== 0) gid = (gid + delta) & 0xffff;
          }
          if (gid !== 0) map.set(c, gid);
        }
      }
    }
  }
  if (map.size === 0) fail(`${font.name}: no usable cmap subtable`);

  // ---- which glyphs to keep, following composites.
  const loca = tables.get('loca');
  const glyf = tables.get('glyf');
  const locaAt = (i) =>
    indexToLocFormat === 0 ? loca.readUInt16BE(i * 2) * 2 : loca.readUInt32BE(i * 4);
  const glyphData = (gid) => glyf.subarray(locaAt(gid), locaAt(gid + 1));
  const kept = new Set([0]);
  const chars = [];
  const missing = [];
  for (const ch of font.characters) {
    const code = ch.codePointAt(0);
    const gid = map.get(code);
    if (gid === undefined) {
      missing.push(ch);
      continue;
    }
    chars.push([code, gid]);
    const stack = [gid];
    while (stack.length > 0) {
      const g = stack.pop();
      if (kept.has(g)) continue;
      kept.add(g);
      const data = glyphData(g);
      if (data.length >= 10 && data.readInt16BE(0) < 0) {
        // Composite: walk the component records.
        let p = 10;
        for (;;) {
          const flags = data.readUInt16BE(p);
          const component = data.readUInt16BE(p + 2);
          stack.push(component);
          p += 4;
          p += flags & 0x0001 ? 4 : 2; // ARG_1_AND_2_ARE_WORDS
          if (flags & 0x0008)
            p += 2; // WE_HAVE_A_SCALE
          else if (flags & 0x0040)
            p += 4; // WE_HAVE_AN_X_AND_Y_SCALE
          else if (flags & 0x0080) p += 8; // WE_HAVE_A_TWO_BY_TWO
          if (!(flags & 0x0020)) break; // MORE_COMPONENTS
        }
      }
    }
  }

  // ---- new glyf and loca (long format).
  const newLoca = Buffer.alloc((numGlyphs + 1) * 4);
  const parts = [];
  let offset = 0;
  for (let g = 0; g < numGlyphs; g += 1) {
    newLoca.writeUInt32BE(offset, g * 4);
    if (kept.has(g)) {
      const data = glyphData(g);
      const padded = Buffer.concat([data, Buffer.alloc(pad4(data.length) - data.length)]);
      parts.push(padded);
      offset += padded.length;
    }
  }
  newLoca.writeUInt32BE(offset, numGlyphs * 4);
  const newGlyf = Buffer.concat(parts);
  head.writeInt16BE(1, 50);
  head.writeUInt32BE(0, 8); // checkSumAdjustment, set at the end

  // ---- new cmap: one format 4 subtable, one segment per kept character.
  chars.sort((a, b) => a[0] - b[0]);
  const segCount = chars.length + 1;
  const sub = Buffer.alloc(16 + segCount * 8);
  sub.writeUInt16BE(4, 0);
  sub.writeUInt16BE(sub.length, 2);
  sub.writeUInt16BE(0, 4);
  sub.writeUInt16BE(segCount * 2, 6);
  const entrySelector = Math.floor(Math.log2(segCount));
  const searchRange = 2 ** entrySelector * 2;
  sub.writeUInt16BE(searchRange, 8);
  sub.writeUInt16BE(entrySelector, 10);
  sub.writeUInt16BE(segCount * 2 - searchRange, 12);
  const endAt = 14;
  const startAt = endAt + segCount * 2 + 2;
  const deltaAt = startAt + segCount * 2;
  const rangeAt = deltaAt + segCount * 2;
  chars.forEach(([code, gid], i) => {
    sub.writeUInt16BE(code, endAt + i * 2);
    sub.writeUInt16BE(code, startAt + i * 2);
    sub.writeInt16BE(((gid - code) << 16) >> 16, deltaAt + i * 2);
    sub.writeUInt16BE(0, rangeAt + i * 2);
  });
  const last = segCount - 1;
  sub.writeUInt16BE(0xffff, endAt + last * 2);
  sub.writeUInt16BE(0xffff, startAt + last * 2);
  sub.writeInt16BE(1, deltaAt + last * 2);
  sub.writeUInt16BE(0, rangeAt + last * 2);
  const newCmap = Buffer.alloc(12 + sub.length);
  newCmap.writeUInt16BE(0, 0);
  newCmap.writeUInt16BE(1, 2);
  newCmap.writeUInt16BE(3, 4);
  newCmap.writeUInt16BE(1, 6);
  newCmap.writeUInt32BE(12, 8);
  sub.copy(newCmap, 12);

  // ---- new post: format 3 (the 32-byte header, no names).
  const newPost = Buffer.from(tables.get('post').subarray(0, 32));
  newPost.writeUInt32BE(0x00030000, 0);

  // ---- assemble.
  const out = new Map();
  for (const tag of KEEP) out.set(tag, tag === 'head' ? head : Buffer.from(tables.get(tag)));
  out.set('cmap', newCmap);
  out.set('glyf', newGlyf);
  out.set('loca', newLoca);
  out.set('post', newPost);
  const tags = [...out.keys()].sort();
  const dirSize = 12 + tags.length * 16;
  const header = Buffer.alloc(dirSize);
  header.writeUInt32BE(0x00010000, 0);
  header.writeUInt16BE(tags.length, 4);
  const es = Math.floor(Math.log2(tags.length));
  const sr = 2 ** es * 16;
  header.writeUInt16BE(sr, 6);
  header.writeUInt16BE(es, 8);
  header.writeUInt16BE(tags.length * 16 - sr, 10);
  let cursor = dirSize;
  const bodies = [];
  let headOffset = 0;
  tags.forEach((tag, i) => {
    const body = out.get(tag);
    const o = 12 + i * 16;
    header.write(tag.padEnd(4), o, 4, 'latin1');
    header.writeUInt32BE(checksum(body), o + 4);
    header.writeUInt32BE(cursor, o + 8);
    header.writeUInt32BE(body.length, o + 12);
    if (tag === 'head') headOffset = cursor;
    const padded = Buffer.concat([body, Buffer.alloc(pad4(body.length) - body.length)]);
    bodies.push(padded);
    cursor += padded.length;
  });
  const result = Buffer.concat([header, ...bodies]);
  const adjustment = (0xb1b0afba - checksum(result)) >>> 0;
  result.writeUInt32BE(adjustment, headOffset + 8);

  mkdirSync(outDir, { recursive: true });
  const b64 = result.toString('base64');
  writeFileSync(join(outDir, `${font.name}.b64.txt`), b64);
  const metadata = {
    $comment: `Generated by asset-pipeline/subset-font.mjs from the unmodified source font. Do not hand-edit; regenerate.`,
    family: font.family,
    source: {
      path: font.source,
      sha256: sourceSha,
      bytes: file.length,
      licence: 'SIL Open Font License 1.1',
      licenceText: font.licence,
      provenance: 'assets/licenses/ASSET_PROVENANCE.md',
    },
    subset: {
      characters: chars.map(([code]) => String.fromCodePoint(code)).join(''),
      charactersMissing: missing.join(''),
      glyphsKept: kept.size,
      glyphsInSource: numGlyphs,
      tablesKept: tags,
      tablesDropped: [...tables.keys()].filter((t) => !tags.includes(t)),
      bytes: result.length,
      base64Bytes: b64.length,
      sha256: createHash('sha256').update(result).digest('hex'),
    },
  };
  writeFileSync(join(outDir, `${font.name}.json`), `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(
    `subset-font[${font.name}]: ${file.length} B -> ${result.length} B (${b64.length} B base64), ` +
      `${kept.size} of ${numGlyphs} glyphs, ${chars.length} characters` +
      (missing.length ? `, missing "${missing.join('')}"` : ''),
  );
  console.log(`subset-font[${font.name}]: dropped ${metadata.subset.tablesDropped.join(' ')}`);
  console.log(`subset-font[${font.name}]: licence ${font.licence} read, OFL 1.1`);
}

for (const font of FONTS) subset(font);
