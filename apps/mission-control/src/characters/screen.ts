import * as THREE from 'three';
import { FACE_COLS, FACE_ROWS, faceAtlas, faceFrameOffset } from './faces.js';

/**
 * The screen-face material: a dark glass panel with a rounded-rectangle silhouette cut by an
 * SDF, a lit bezel, faint scanlines, and the expression mask coloured with the character's
 * eye colour. Emissive values sit above 1.0 so the bloom pass catches the glyph, never the panel.
 */
const vertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const fragment = /* glsl */ `
precision highp float;
uniform sampler2D uMask; uniform vec2 uFrame; uniform vec2 uFrameScale;
uniform vec3 uEye; uniform vec3 uPanel; uniform vec3 uBezel;
uniform float uGlow; uniform float uTime; uniform float uPower; uniform vec2 uHalf; uniform float uRadius;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  vec2 q = abs(p) - uHalf + uRadius;
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
  if (sd > 0.0) discard;
  float bezel = smoothstep(-0.16, -0.02, sd);
  // Slight inner shading so the panel reads as recessed glass.
  float vig = smoothstep(1.35, 0.35, length(p));
  vec3 col = uPanel * (0.55 + 0.45 * vig);
  float scan = 0.94 + 0.06 * sin(vUv.y * 140.0 + uTime * 0.6);
  col *= scan;
  float mask = texture2D(uMask, vUv * uFrameScale + uFrame).r;
  // Soft halo around the glyph inside the panel, then the glyph itself above 1.0 for bloom.
  float halo = texture2D(uMask, vUv * uFrameScale + uFrame, 3.0).r;
  col += uEye * halo * 0.35 * uPower;
  col = mix(col, uEye * uGlow, mask * uPower);
  col += uBezel * bezel * 0.9;
  gl_FragColor = vec4(col, 1.0);
}
`;

export interface ScreenOptions {
  eye: THREE.ColorRepresentation;
  panel?: THREE.ColorRepresentation;
  bezel?: THREE.ColorRepresentation;
  glow?: number;
  /** Half extents of the visible rounded rectangle in -1..1 panel space. */
  half?: [number, number];
  radius?: number;
}

export class ScreenMaterial extends THREE.ShaderMaterial {
  constructor(opts: ScreenOptions) {
    super({
      uniforms: {
        uMask: { value: faceAtlas() },
        uFrame: { value: new THREE.Vector2(...faceFrameOffset(0)) },
        uFrameScale: { value: new THREE.Vector2(1 / FACE_COLS, 1 / FACE_ROWS) },
        uEye: { value: new THREE.Color(opts.eye) },
        uPanel: { value: new THREE.Color(opts.panel ?? '#070a16') },
        uBezel: { value: new THREE.Color(opts.bezel ?? '#1b2440') },
        uGlow: { value: opts.glow ?? 2.4 },
        uTime: { value: 0 },
        uPower: { value: 1 },
        uHalf: { value: new THREE.Vector2(...(opts.half ?? [0.88, 0.82])) },
        uRadius: { value: opts.radius ?? 0.42 },
      },
      vertexShader: vertex,
      fragmentShader: fragment,
      toneMapped: false,
    });
  }
  setFrame(frame: number) {
    const [x, y] = faceFrameOffset(frame);
    (this.uniforms.uFrame!.value as THREE.Vector2).set(x, y);
  }
  setTime(t: number) {
    this.uniforms.uTime!.value = t;
  }
  setPower(p: number) {
    this.uniforms.uPower!.value = p;
  }
  setEye(c: THREE.ColorRepresentation) {
    (this.uniforms.uEye!.value as THREE.Color).set(c);
  }
}
