# Phase 0.5 — bounded visual recovery: scene and character implementation plan

Authority: OD-0002. Base commit 4b834a4. Branch `claude/virgil-phase-0-5-visual-recovery-durqrz`. Scope is the hero Foundry bay, the four characters, the success and failed-check choreography, one Mind cluster, and validation. Nothing here changes `packages/domain`, `packages/gate-engine`, `constitution/` or the event contracts.

## Preserved architecture

- Recorded fixture events (`packages/test-fixtures`) → `animationFor(event)` (`packages/visual-language`) → step list with grammar durations → scene. A step without a mapping or without its required evidence is a refusal and renders no motion. This chain is unchanged; Phase 0.5 replaces the presentation behind it.
- `SpikeShell`, `useSequence`, settings and tiers, `CameraRig`, `Effects`, `Nebula`, `StarField`, `Label` are kept and tuned. The Evidence View is kept and restyled as a compact console overlay that never covers the centre of the frame.

## Asset decision

KayKit licence verification is blocked in this session (`docs/art-direction/ASSET_PROVENANCE.md`), so no external rig or clip is imported. Characters are an original procedural robot rig: a shared body assembly (`characters/rig.ts`) with role shells and equipment layered on named sockets (head, chest, back, left hand, right hand, hip), procedural locomotion (stride, bob, arm swing), work poses driven only by the current authenticated step, wait and refusal poses, blink and micro-expression clocks. Ordinary meshes for four characters; geometry is shared per part so an instancing path remains open.

## Character family (shared rig, differentiated silhouettes)

| Role | Body shell | Head/screen | Equipment | Working accent | Refusal |
|---|---|---|---|---|---|
| Fabricator | broad barrel torso, short sturdy legs, wide shoulder yokes | wide rounded visor, squarish screen | two articulated construction arms with mismatched manipulators (clamp and three-finger), modular tool backpack with rack, luminous assembly wand | signalCyan | arms lock mid-reach, boundary volume flashes, stop glyph |
| Prover | narrow drum torso with a rotating sensor ring at the waist, antenna array on the pack | circular scanner screen with a reticle | deployable diagnostic mast, two precise probe manipulators | signalLime | probes cannot align with the sealed candidate; prohibition glyph on the ring |
| Keeper | slender rounded torso, no arms, hooded sensor cowl | tall calm screen with slow-blink lenses | folding magnifier boom, three orbiting inspection drones, archival reel on the back | evidenceIce | drones retreat, prohibition glyph on the lenses |
| Virgil | compact senior torso with a command mantle and rear shell, fold-out control vanes | the most expressive screen: larger, brighter, wider glyph set | three communication antennae, orbital navigation instrument ring above the shoulders | starWhite | vanes fold inward, prohibition glyph on the ring, one route stays lit |

Screens: one shared 4×4 mask atlas of original glyphs (rest, blink, focus, scan, think, wait, alert, refuse, pass, finding, seal, route, boot, calm, warn, off). Each role uses its own subset and eye colour; expressions change only with authenticated steps and ambient blink clocks.

## Hero bay layout (one scene, foreground → background)

- Foreground: Fabricator bench with holographic module racks, the magnetic staging cradle, and the commit press (a clamshell sealer that closes to form the capsule). The audit vent beside the bench.
- Middle left: the Prover scanner station: a ring gantry with three check channels (typecheck, lint, unit) and a skipped channel, the capsule dock at its centre.
- Middle right, across a visible gap bridged only by the evidence corridor: the Keeper inspection station on its own platform, magnifier arch, finding pins.
- Rear centre, raised: Virgil's control centre: a dais with a curved console bank, route levers, an orrery instrument, and the owner airlock behind it, closed, with one gold keyway and the eligibility key pedestal outside it.
- Background: nebula, star field, distant station hull and gantries, slow harmless transports.
- Transport route: one readable lane from the commit press → Prover dock → across the gap → Keeper dock → eligibility pedestal, with the capsule physically carried along it.

Lighting: one cool key from the station core, warm bioluminescent fill on the docks, nebula as environment reflection; controlled bloom (threshold ≥ 0.8, intensity ≤ 0.55); label plates kept to station names and SHA identity; evidence in the console overlay.

## Choreography (WP3)

Success run (`passingRun`): file_modified → file_created (unstaged modules hover at the bench, Fabricator assembles) → changes_staged (Fabricator loads the cradle) → candidate_committed (press closes, capsule sealed, SHA ignites) → handoff_started (capsule travels the lane to the Prover) → verification_started, check_started ×3, check_passed ×3, check_skipped, verification_completed (Prover operates channels; arcs close into bands; signature) → handoff_started to Keeper (lane across the gap) → review_started (Keeper drones orbit the capsule) → finding_raised (a pin attaches; non-blocking) → review_passed (ring closes with the pin) → safe_to_merge (eligibility key assembles outside the closed airlock; Virgil turns toward the airlock and presents; nothing opens).

Failed-check variant (`blockedThenRepairedRun` prefix): the same through verification, then check_failed (arc breaks at the failed surface with an evidence tether), verification_completed with a failure, candidate_quarantined (lattice), and a refused tampered step. No merge, no deployment in either variant.

Every step: the character's work pose and the station's mechanism respond only while the step is current or past; idle characters breathe, blink and shift weight only.

## Mind cluster (WP4)

One composed cluster: the sealed run-record source (monolith with hash band), the compiled durable node (faceted structure with a machine-verification band), a continuous provenance tether, and the contested pair with an interference lattice; depth from a foreground gantry and a background galaxy. Transition: a lane from the airlock side of the bay to the gateway ring, rendered as a continuous camera dolly on the same scene graph when the step list crosses into knowledge events; if it compromises the Foundry it stays a route change.

## Validation (WP5)

`pnpm check`, `pnpm --filter @virgil/knowledge-lint run lint`, production build, headless captures at desktop, mobile and reduced-motion, video where the environment supports it, comparison against the Phase 0 captures, run record, honest verdict.
