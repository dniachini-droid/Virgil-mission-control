/**
 * The galaxy beyond the window.
 *
 * The approved reference puts a spiral galaxy with a hot magenta core in the
 * circular window, and that window is the strongest compositional element in
 * the frame — it is also the entire cool half of the room's lighting contrast.
 * A generic fractal cloud does not read as it, so this is a spiral rather than
 * plain noise: logarithmic arms wound around a core, dust lanes between them,
 * and a star field that thickens towards the galactic plane.
 *
 * Everything is procedural and evaluated per fragment. There is no texture to
 * download, which is what keeps the Owner Build a single offline file.
 */

export const spaceVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const spaceFragment = /* glsl */ `
precision highp float;

varying vec3 vDir;

uniform float uTime;
uniform vec3 uCore;
uniform vec3 uArm;
uniform vec3 uMid;
uniform vec3 uOuter;
uniform vec3 uDust;
uniform float uExposure;

const float PI = 3.14159265359;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  return fract(p * (p + p));
}

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x),
        mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x),
        mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * noise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return sum;
}

/**
 * Star field. Cells on the direction sphere, one candidate star per cell, most
 * rejected — so the sky is mostly empty with occasional bright points rather
 * than an even dusting, which is what a photograph of a star field looks like.
 */
vec3 stars(vec3 dir, float galacticPlane) {
  vec3 total = vec3(0.0);
  for (int layer = 0; layer < 3; layer++) {
    float scale = 90.0 + float(layer) * 130.0;
    vec3 cell = floor(dir * scale);
    vec3 local = fract(dir * scale) - 0.5;
    float seed = hash13(cell + float(layer) * 37.0);
    // Density rises towards the galactic plane, as it does in the reference.
    float density = 0.982 - 0.03 * galacticPlane;
    if (seed < density) continue;
    vec3 offset = vec3(hash11(seed * 71.3), hash11(seed * 129.7), hash11(seed * 213.1)) - 0.5;
    float d = length(local - offset * 0.6);
    float brightness = pow(hash11(seed * 411.9), 3.0);
    // A little twinkle, slow enough not to read as noise.
    float twinkle = 0.75 + 0.25 * sin(uTime * 0.7 + seed * 90.0);
    float point = smoothstep(0.16, 0.0, d) * brightness * twinkle;
    // Cool stars mostly, a few warm ones.
    vec3 tint = mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.86, 0.68), hash11(seed * 913.0));
    total += tint * point * (1.4 - float(layer) * 0.25);
  }
  return total;
}

void main() {
  vec3 dir = normalize(vDir);

  // The galactic plane is tilted so the spiral is seen at an angle rather than
  // face on, which is how the reference frames it.
  vec3 axis = normalize(vec3(0.34, 0.86, 0.38));
  vec3 basisA = normalize(cross(axis, vec3(0.0, 0.0, 1.0)));
  vec3 basisB = cross(axis, basisA);

  float height = dot(dir, axis);
  vec2 planar = vec2(dot(dir, basisA), dot(dir, basisB));
  float radius = length(planar);
  float theta = atan(planar.y, planar.x);

  // Logarithmic spiral arms. Two arms, wound tight near the core.
  float wind = 2.6;
  float arms = 2.0;
  float spiral = cos(arms * (theta + wind * log(radius + 0.16)) + 0.4);
  // Arms sharpen away from the core so the centre stays a blob, not a pinwheel.
  float armMask = pow(max(spiral, 0.0), 1.6);
  armMask *= smoothstep(0.02, 0.30, radius);

  // Clouds. Two octave sets at different scales keep the arms from looking
  // like a mathematical curve.
  float cloud = fbm(dir * 3.1 + vec3(0.0, uTime * 0.008, 0.0));
  float fine = fbm(dir * 9.4 - vec3(uTime * 0.011, 0.0, 0.0));
  float body = armMask * (0.45 + 0.75 * cloud) + 0.16 * cloud * cloud;

  // Confinement to the galactic plane: a thin disc, thicker at the core.
  float thickness = 0.20 + 0.34 * exp(-radius * 3.4);
  float disc = exp(-(height * height) / (thickness * thickness));
  body *= disc;

  // Dust lanes: the fine noise eats into the arms rather than adding to them.
  body *= 0.55 + 0.45 * smoothstep(0.28, 0.72, fine);

  // The core. Hot, warm-magenta, and the brightest thing in the window.
  float coreFalloff = exp(-radius * 7.5);
  float coreGlow = coreFalloff * (0.55 + 0.45 * disc);

  vec3 colour = uOuter * 0.24;
  colour = mix(colour, uMid, clamp(body * 1.5, 0.0, 1.0));
  colour = mix(colour, uArm, clamp(body * body * 2.1, 0.0, 1.0));
  colour += uCore * coreGlow * 2.3;
  // A soft halo so the core reads as luminous rather than pasted on.
  colour += uArm * exp(-radius * 2.6) * 0.30 * disc;

  // Dust in front of everything, towards the disc edges.
  float lane = smoothstep(0.62, 0.16, fine) * armMask * disc;
  colour = mix(colour, uDust, lane * 0.45);

  colour += stars(dir, disc);

  // Emissive: this surface is a light source in the frame, not a lit object, so
  // it is written above 1.0 where it is hot and left untone-mapped. The bloom
  // pass is what turns the core into glare.
  gl_FragColor = vec4(colour * uExposure, 1.0);
}
`;
