/**
 * The two typefaces the screens are set in, bundled and subset — no fetch.
 *
 * `ADR-0010` chose canvas labels over troika because troika *fetches* a
 * default font, and its Consequences line reads: "Revisit with bundled SDF
 * fonts in Phase 1 if label density grows." This is that revisit, inside
 * the decision rather than an amendment of it: each face is subset to the
 * glyphs the screens draw (`asset-pipeline/subset-font.mjs`), carried in
 * the bundle as base64 like every model, and registered at runtime through
 * the `FontFace` constructor from an in-memory buffer. No CSS source, no
 * data URI, no request — `e2e/verify-owner-build.ts` still counts one
 * request, the document itself.
 *
 * Two faces and no more: **Tektur** (display; titles, headlines, the
 * honesty band, capitals only) and **Geist Mono** (data; states, counts,
 * hashes, small labels). One typeface doing both jobs is what made V4's
 * screens read as basic. Both are SIL Open Font License 1.1; the licence
 * texts are committed verbatim under `assets/licenses/` and the register
 * there records the subsetting as a modification.
 *
 * Until the faces have loaded — a few milliseconds from memory — canvas
 * text falls back to the system monospace stack, which is what V4 shipped.
 */
import geistMonoBase64 from './fonts/geist-mono-regular.b64.txt?raw';
import geistMonoMetadata from './fonts/geist-mono-regular.json';
import tekturBase64 from './fonts/tektur-medium.b64.txt?raw';
import tekturMetadata from './fonts/tektur-medium.json';

export interface SubsetFontMetadata {
  family: string;
  source: { path: string; sha256: string; bytes: number };
  subset: { characters: string; bytes: number; base64Bytes: number; sha256: string };
}

/** The family names the canvases ask for, with the fallback V4 shipped. */
export const DISPLAY_FAMILY = 'Tektur';
export const MONO_FAMILY = 'Geist Mono';
const FALLBACK = 'ui-monospace, Menlo, Consolas, "Liberation Mono", monospace';
export const DISPLAY = `"${DISPLAY_FAMILY}", ${FALLBACK}`;
export const MONO = `"${MONO_FAMILY}", ${FALLBACK}`;

export const SCREEN_FONTS: { metadata: SubsetFontMetadata; base64: string }[] = [
  { metadata: tekturMetadata, base64: tekturBase64 },
  { metadata: geistMonoMetadata, base64: geistMonoBase64 },
];

/** The font's bytes, checked against what the subsetter recorded. */
export function decodeFont(metadata: SubsetFontMetadata, base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  if (bytes.length !== metadata.subset.bytes) {
    throw new Error(
      `font ${metadata.family}: payload is ${bytes.length} bytes, metadata declares ${metadata.subset.bytes}`,
    );
  }
  return bytes.buffer;
}

let pending: Promise<void> | null = null;

/**
 * Registers both faces with the document, once. Resolves when they are
 * usable by canvas text; rejects if the browser refuses one, in which case
 * the fallback stack is used and the failure is on the console for the
 * verifier to see.
 */
export function loadScreenFonts(): Promise<void> {
  if (!pending) {
    pending = Promise.all(
      SCREEN_FONTS.map(async ({ metadata, base64 }) => {
        const face = new FontFace(metadata.family, decodeFont(metadata, base64));
        await face.load();
        document.fonts.add(face);
      }),
    ).then(() => undefined);
  }
  return pending;
}
