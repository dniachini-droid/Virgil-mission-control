/** Deterministic fake identifiers. Never real repository state. */
export function sha(seed: number | string): string {
  let h = 0x811c9dc5;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let out = '';
  let x = h;
  while (out.length < 40) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    out += x.toString(16).padStart(8, '0');
  }
  return out.slice(0, 40);
}

export const BASE_SHA = sha('base');
export const HEAD_SHA = sha('head-1');
export const HEAD_SHA_2 = sha('head-2');
export const HEAD_SHA_3 = sha('head-3');
export const MERGE_SHA = sha('merge');

export function at(minutes: number): string {
  return new Date(Date.UTC(2026, 8, 6, 10, 0, 0) + minutes * 60_000)
    .toISOString()
    .replace('Z', '+00:00');
}
