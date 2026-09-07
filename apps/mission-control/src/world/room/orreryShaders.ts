/**
 * The orrery's rings, drawn as light rather than as geometry.
 *
 * A ring made of metal needs an environment to reflect and reads as a hoop. The
 * reference's orrery is unambiguously luminous — concentric glowing tracks over
 * the console with planets riding them — so each ring here is a single quad
 * with the ring computed per fragment: a soft radial band, and one bright arc
 * travelling around it.
 *
 * Drawn additively with no depth write, so rings overlap and brighten each other
 * the way light does, and so the bloom pass has something above 1.0 to catch.
 * Computing the ring in the shader also side-steps `RingGeometry`'s UV layout,
 * which is projected from position and gives no usable angular coordinate.
 */

export const ringVertex = /* glsl */ `
varying vec2 vLocal;
void main() {
  vLocal = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const ringFragment = /* glsl */ `
precision highp float;

varying vec2 vLocal;

uniform vec3 uColour;
uniform vec3 uSweepColour;
uniform float uRadius;
uniform float uWidth;
uniform float uPhase;
uniform float uIntensity;
uniform float uSweepSharpness;

void main() {
  float r = length(vLocal);
  float a = atan(vLocal.y, vLocal.x);

  // A soft band centred on uRadius. Squared so the falloff is smooth rather
  // than a hard edge that would alias at glancing angles.
  float band = 1.0 - clamp(abs(r - uRadius) / uWidth, 0.0, 1.0);
  band = band * band;

  // The travelling arc. A high power on a cosine gives one bright head with a
  // long tail, which reads as motion along the track.
  float sweep = pow(0.5 + 0.5 * cos(a - uPhase), uSweepSharpness);

  // A faint tick pattern so the track reads as an instrument, not a neon hoop.
  float ticks = 0.86 + 0.14 * step(0.72, fract(a * 9.5493));

  float base = band * ticks * 0.30;
  vec3 colour = uColour * base + uSweepColour * band * sweep * 1.35;

  gl_FragColor = vec4(colour * uIntensity, band);
}
`;
