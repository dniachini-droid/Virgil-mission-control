import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DISPLAY_FAMILY,
  decodeFont,
  MONO_FAMILY,
  SCREEN_FONTS,
} from '../src/world/screens/fonts.js';

/**
 * The bundled screen fonts, checked without a browser: each payload is the
 * bytes the subsetter recorded, is a well-formed TrueType file whose table
 * checksums and whole-file checksum adjustment hold, maps every character
 * the subsetter kept to a glyph that has an outline (space excepted), and is
 * registered from memory — `ADR-0010` forbids fetching a font, and nothing
 * here may reach for one.
 */

const src = (file: string) => readFileSync(resolve(import.meta.dirname, '../src', file), 'utf8');

function pad4(n: number) {
  return (n + 3) & ~3;
}

function checksum(view: DataView, offset: number, length: number): number {
  let sum = 0;
  for (let i = 0; i < pad4(length); i += 4) {
    let word = 0;
    for (let b = 0; b < 4; b += 1) {
      const at = offset + i + b;
      word = (word << 8) | (at < offset + length ? view.getUint8(at) : 0);
    }
    sum = (sum + (word >>> 0)) >>> 0;
  }
  return sum;
}

interface Table {
  offset: number;
  length: number;
  checksum: number;
}

function parse(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  expect(view.getUint32(0)).toBe(0x00010000);
  const numTables = view.getUint16(4);
  const tables = new Map<string, Table>();
  for (let i = 0; i < numTables; i += 1) {
    const o = 12 + i * 16;
    const tag = String.fromCharCode(
      view.getUint8(o),
      view.getUint8(o + 1),
      view.getUint8(o + 2),
      view.getUint8(o + 3),
    );
    tables.set(tag, {
      checksum: view.getUint32(o + 4),
      offset: view.getUint32(o + 8),
      length: view.getUint32(o + 12),
    });
  }
  return { view, tables };
}

/** Code point → glyph id from the one format-4 subtable the subsetter writes. */
function cmap(view: DataView, table: Table): Map<number, number> {
  const base = table.offset;
  expect(view.getUint16(base + 2)).toBe(1);
  const sub = base + view.getUint32(base + 8);
  expect(view.getUint16(sub)).toBe(4);
  const segCount = view.getUint16(sub + 6) / 2;
  const ends = sub + 14;
  const starts = ends + segCount * 2 + 2;
  const deltas = starts + segCount * 2;
  const ranges = deltas + segCount * 2;
  const map = new Map<number, number>();
  for (let s = 0; s < segCount; s += 1) {
    const end = view.getUint16(ends + s * 2);
    const start = view.getUint16(starts + s * 2);
    const delta = view.getInt16(deltas + s * 2);
    const rangeOffset = view.getUint16(ranges + s * 2);
    for (let c = start; c <= end && c !== 0xffff; c += 1) {
      let gid: number;
      if (rangeOffset === 0) gid = (c + delta) & 0xffff;
      else {
        gid = view.getUint16(ranges + s * 2 + rangeOffset + (c - start) * 2);
        if (gid !== 0) gid = (gid + delta) & 0xffff;
      }
      if (gid !== 0) map.set(c, gid);
    }
  }
  return map;
}

describe.each(SCREEN_FONTS)('bundled font $metadata.family', ({ metadata, base64 }) => {
  const buffer = decodeFont(metadata, base64);
  const { view, tables } = parse(buffer);

  it('is the file the subsetter recorded', () => {
    expect(buffer.byteLength).toBe(metadata.subset.bytes);
    expect(base64.length).toBe(metadata.subset.base64Bytes);
    const sha = createHash('sha256').update(Buffer.from(buffer)).digest('hex');
    expect(sha).toBe(metadata.subset.sha256);
  });

  it('is a well-formed TrueType file: every table checksum and the file adjustment hold', () => {
    for (const tag of [
      'head',
      'hhea',
      'maxp',
      'hmtx',
      'cmap',
      'loca',
      'glyf',
      'post',
      'name',
      'OS/2',
    ]) {
      expect(tables.has(tag), `table ${tag}`).toBe(true);
    }
    const head = tables.get('head') as Table;
    expect(view.getUint32(head.offset)).toBe(0x00010000);
    for (const [tag, table] of tables) {
      expect(table.offset + table.length).toBeLessThanOrEqual(buffer.byteLength);
      if (tag === 'head') continue;
      expect(checksum(view, table.offset, table.length), `checksum of ${tag}`).toBe(table.checksum);
    }
    // The whole file sums to the magic once checkSumAdjustment is included.
    expect(checksum(view, 0, buffer.byteLength)).toBe(0xb1b0afba);
  });

  it('maps every kept character to a glyph with an outline', () => {
    const map = cmap(view, tables.get('cmap') as Table);
    const head = tables.get('head') as Table;
    const long = view.getInt16(head.offset + 50) === 1;
    const loca = tables.get('loca') as Table;
    const glyphLength = (gid: number) =>
      long
        ? view.getUint32(loca.offset + (gid + 1) * 4) - view.getUint32(loca.offset + gid * 4)
        : (view.getUint16(loca.offset + (gid + 1) * 2) - view.getUint16(loca.offset + gid * 2)) * 2;
    for (const ch of metadata.subset.characters) {
      const gid = map.get(ch.codePointAt(0) as number);
      expect(gid, `"${ch}" has a glyph`).toBeDefined();
      if (ch !== ' ')
        expect(glyphLength(gid as number), `"${ch}" has an outline`).toBeGreaterThan(0);
    }
    // And the characters the screens rely on are among them.
    for (const ch of 'ILLUSTRATIVE · NOT REAL STATE0123456789') {
      expect(map.has(ch.codePointAt(0) as number), `"${ch}"`).toBe(true);
    }
  });

  it('keeps the copyright notice the licence requires with every copy', () => {
    const name = tables.get('name') as Table;
    const bytes = new Uint8Array(buffer, name.offset, name.length);
    // Name records are UTF-16BE on the Windows platform; look for the word with nulls between.
    const text = Array.from(bytes, (b) => (b === 0 ? '' : String.fromCharCode(b))).join('');
    expect(text.toLowerCase()).toContain('copyright');
  });
});

describe('how the screens use them', () => {
  it('registers the faces from memory and never from a URL', () => {
    const fonts = src('world/screens/fonts.ts');
    expect(fonts).toContain('new FontFace(metadata.family, decodeFont(');
    expect(fonts).not.toMatch(/url\(/);
    expect(fonts).not.toMatch(/['"`]data:/);
    expect(fonts).not.toContain('fetch(');
  });

  it('sets the screens in the two bundled families and no other', () => {
    const screens = src('world/screens/ScreenBank.tsx');
    expect(screens).toContain("from './fonts.js'");
    expect(screens).not.toMatch(/px (ui-monospace|Menlo|sans-serif|serif|Arial|Helvetica)/);
    const families = SCREEN_FONTS.map((f) => f.metadata.family);
    expect(families).toEqual([DISPLAY_FAMILY, MONO_FAMILY]);
    expect(families).toHaveLength(2);
  });

  it('draws no literal the mono subset cannot set', () => {
    const screens = src('world/screens/ScreenBank.tsx');
    const mono = SCREEN_FONTS.find((f) => f.metadata.family === MONO_FAMILY);
    const kept = new Set(mono?.metadata.subset.characters ?? '');
    const literals = screens.match(/'[^'\n]*'/g) ?? [];
    for (const literal of literals) {
      // Colour values, CSS-ish tokens and paths are not drawn.
      if (/^'(#|rgba?\(|\.\/|\.\.\/|@|\d+(\.\d+)?em)/.test(literal)) continue;
      const text = literal.slice(1, -1);
      if (/[a-z]/.test(text) === false && /[A-Z]/.test(text) === false) continue;
      for (const ch of text) {
        if (ch === '\\') continue;
        expect(kept.has(ch), `"${ch}" in ${literal}`).toBe(true);
      }
    }
  });
});
