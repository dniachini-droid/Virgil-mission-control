# ADR-0003 — Rendering stack: three.js, React Three Fiber, drei, postprocessing

Status: Accepted. Date: 2026-09-06. Deciders: owner (via OD-0001 dependency authority); authored by the Phase 0 session.

## Context
Commission section 5.4 prefers Three.js through React Three Fiber with drei, a maintained post-processing pipeline, glTF workflow, physically based materials, custom shaders and an animation system, without locking versions from the brief.

## Decision
three 0.185.1; @react-three/fiber 9.7.0 (React 19 peer); @react-three/drei 10.7.8 (CameraControls, Environment, Lightformer used); @react-three/postprocessing 3.1.1 over postprocessing 6.39.4 (Bloom, ChromaticAberration, Vignette); camera-controls 3.1.2 via drei. WebGL2 renderer. Custom GLSL for the nebula, lanes, interference and scan effects. Procedural environment lighting (no HDR download). Labels as canvas textures (ADR-0010). Animation: procedural easing in `useFrame` driven by grammar durations; authored glTF clips arrive with modelled characters in Phase 1.

## Not adopted
@react-three/rapier 2.2: the spikes showed no interaction that needs physics (owner condition satisfied by evidence, not by default). @react-spring/three: procedural easing sufficed for the spikes; reconsider for Phase 1 sequencing. @react-three/test-renderer: installed for scene tests but the label system needs a 2D canvas unavailable under Node; removed until Phase 1 provides a canvas shim. R3F 10 and drei 11 alphas: not stable.

## Deferred
WebGPU with three's TSL node materials: revisit when @react-three/postprocessing or three's own post pipeline supports it in a stable release and the target devices report WebGPU availability above 80 percent.

## Licences
three MIT, @react-three/fiber MIT, @react-three/drei MIT, @react-three/postprocessing MIT, postprocessing Zlib, camera-controls MIT, @types/three MIT.

## Evidence
Both spikes build and render through SwiftShader (`docs/art-direction/spikes`). Visual judgment is deferred to the owner's GPU review.
