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
 * V6 (`docs/process/PHASE_1_STYLISED_SPEC.md` §4.1): **Outfit Bold** for
 * headlines — geometric, round, chunky — and **Geist Mono Bold** for
 * anything data-shaped. Tektur, which is squarish and technical and has no
 * bold weight, is retired with its licence entry and payload. Both faces
 * are SIL Open Font License 1.1; the licence texts are committed verbatim
 * under `assets/licenses/` and the register there records the subsetting
 * as a modification.
 *
 * Until the faces have loaded — a few milliseconds from memory — canvas
 * text falls back to the system monospace stack.
 */
import geistMonoBase64 from './fonts/geist-mono-bold.b64.txt?raw';
import geistMonoMetadata from './fonts/geist-mono-bold.json';
import outfitBase64 from './fonts/outfit-bold.b64.txt?raw';
import outfitMetadata from './fonts/outfit-bold.json';

export interface SubsetFontMetadata {
  family: string;
  source: { path: string; sha256: string; bytes: number };
  subset: { characters: string; bytes: number; base64Bytes: number; sha256: string };
}

/** The family names the canvases ask for, with a fallback for the first frames. */
export const DISPLAY_FAMILY = 'Outfit';
export const MONO_FAMILY = 'Geist Mono';
const FALLBACK = 'ui-monospace, Menlo, Consolas, "Liberation Mono", monospace';
export const DISPLAY = `"${DISPLAY_FAMILY}", ${FALLBACK}`;
export const MONO = `"${MONO_FAMILY}", ${FALLBACK}`;

export const SCREEN_FONTS: { metadata: SubsetFontMetadata; base64: string; weight: number }[] = [
  { metadata: outfitMetadata, base64: outfitBase64, weight: 700 },
  { metadata: geistMonoMetadata, base64: geistMonoBase64, weight: 700 },
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
 * Registers both faces with the document, once, at weight 700 so that a
 * `700` font string matches the real bold rather than a synthetic one.
 * Resolves when they are usable by canvas text; rejects if the browser
 * refuses one, in which case the fallback stack is used and the failure is
 * on the console for the verifier to see.
 */
export function loadScreenFonts(): Promise<void> {
  if (!pending) {
    pending = Promise.all(
      SCREEN_FONTS.map(async ({ metadata, base64, weight }) => {
        const face = new FontFace(metadata.family, decodeFont(metadata, base64), {
          weight: String(weight),
        });
        await face.load();
        document.fonts.add(face);
      }),
    ).then(() => undefined);
  }
  return pending;
}
