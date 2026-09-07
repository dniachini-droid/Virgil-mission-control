# Performance strategy and device tiers

Deliverable 17. Source: master commission sections 5.5, 5.7 and 10; Amendment 1 sections R and S.

## Status

Using the vocabulary of `ENFORCEMENT_BOUNDARIES.md`:

- **Implemented now:** a tier setting with five values, a device-pixel-ratio range per tier, antialiasing only at `ultra`, a heuristic initial tier from core count, device memory and viewport size (`apps/mission-control/src/ui/settings.ts` `detectTier`), a software-renderer flag set from the WebGL renderer string, and a manual tier selector in the spike HUD.
- **Validated by tests:** none of the above. No test measures a frame time, a draw call, a triangle count or a byte budget.
- **Design-level only:** every budget in the tier table; the reduction order; runtime adaptation from 120-frame sampling with step-down and step-up rules; forcing `constrained` from the renderer string; making tier changes visible in the Evidence View; the load and transfer budgets; the Performance Examiner role (a definition exists in `.claude/agents/`, no session runs it).
- **Deferred to a later runtime:** measurement on representative devices and Playwright traces (Phase 1 on a GPU runner); reporting against budgets in a run record.

Nothing here is enforced. The table below is a target, not a measured or gated property of any branch.

## Tiers

| Tier | Representative device | Frame budget | Draw calls | Triangles | Texture memory | Post-processing | Particles |
|---|---|---|---|---|---|---|---|
| ultra | desktop with discrete GPU, 1440p+ | 16.6 ms (60 fps) | ≤ 600 | ≤ 1.5 M | ≤ 512 MB | bloom, chromatic edge, volumetric fog full | 100 % |
| desktop | integrated-GPU desktop or laptop, 1080p | 16.6 ms | ≤ 400 | ≤ 900 k | ≤ 256 MB | bloom half-res, light fog | 60 % |
| laptop | thin laptop, battery, 1080p | 22 ms (45 fps) | ≤ 300 | ≤ 600 k | ≤ 192 MB | bloom quarter-res, no fog | 35 % |
| mobile | recent phone or tablet | 33 ms (30 fps) | ≤ 200 | ≤ 300 k | ≤ 128 MB | bloom quarter-res only | 15 % |
| constrained | old phone, low-power mode, software rendering | 50 ms (20 fps) | ≤ 120 | ≤ 120 k | ≤ 64 MB | none | 0 % |

Reduced motion is orthogonal to tier: any tier can run with reduced motion.

## Reduction order (Amendment 1 section S)

1. Particle density. 2. Volumetric resolution. 3. Reflection and shadow quality. 4. Background traffic. 5. Geometry detail. 6. Post-processing intensity.

Never removed: role identity, evidence markings, state geometry, SHA identity, authority tokens, provenance tethers, blocked-versus-passed distinctions, owner-gate meaning.

## Detection and adaptation

Intended: initial tier from `navigator.hardwareConcurrency`, device memory, screen size, `prefers-reduced-motion`, WebGL renderer string (software renderers force `constrained`). Runtime adaptation samples frame time over 120 frames; two consecutive windows over budget step down one tier; sixty seconds under 70 % of budget may step up one tier, never above the initial tier without user action. Tier changes are visible in the Evidence View footer and are never silent.

Implemented today: only the heuristic initial tier (cores, memory, viewport) and a software-renderer flag; no runtime adaptation, no forced `constrained`, no Evidence View footer. Reduced motion is read separately and is orthogonal to tier.

## Budgets for the Phase 1 slice

Load ≤ 3 s to first interactive frame on desktop, ≤ 6 s on mobile over a fast connection; total transferred ≤ 12 MB desktop, ≤ 6 MB mobile; no frame over 100 ms during any authenticated animation; camera transitions hold the frame budget of the tier.

## Measurement

None has been performed on any branch: the Phase 0 container renders through SwiftShader and no GPU device has been measured. Phase 1: Playwright traces with `performance.now()` frame sampling on a desktop with a discrete GPU, an integrated-GPU laptop, and a mid-range phone via remote debugging; results recorded per tier in the run record. The Performance Examiner reports against these budgets and cannot redefine the premium visual standard as unnecessary. The Phase 0 and Phase 0.5 runtime visuals were rejected by the owner (`docs/decisions/proposed/OD-0002-art-direction-checkpoint.md`), so no performance figure from those spikes would describe the intended production scene.
