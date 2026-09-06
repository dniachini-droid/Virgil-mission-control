# Phase 0.5 prototype: hero Foundry bay, character family, Mind cluster

Authority: OD-0002 (accepted text at `docs/decisions/proposed/OD-0002-art-direction-checkpoint.md`, pending the owner's file move). Plan: `docs/process/PHASE_0_5_PLAN.md`. Provenance: `ASSET_PROVENANCE.md`. Captures: `phase-0-5/*.png` with `phase-0-5/capture-report.json`; the Phase 0 captures remain in `spikes/` for comparison. Routes: `/spike/characters`, `/spike/foundry`, `/spike/foundry?run=failed`, `/spike/mind`.

## Run

```sh
pnpm install
pnpm --filter mission-control dev            # http://localhost:5173/
pnpm --filter mission-control build && pnpm --filter mission-control capture   # headless captures
pnpm --filter mission-control exec tsx e2e/record.ts "/spike/foundry" video 26 2600   # video (software)
```

Query parameters: `step`, `run=failed`, `tier` (ultra, desktop, laptop, mobile, constrained), `reduced=1`, `hold=1`, `mono=1` (greyscale post-effect for the silhouette test). Keyboard: left and right arrows step, Home and End jump.

## What changed from Phase 0

| Phase 0 | Phase 0.5 |
|---|---|
| Ring of primitive discs and tori labelled by billboards | One bay: bench, cradle, commit press, scanner gantry, Keeper platform across a real gap, raised control centre, closed airlock, hull, gantry, far ring |
| Worker stand-ins: capsule with cylinder arms, torus, cone | Four original screen-faced astro-bots on a shared procedural rig with role shells, equipment, expression atlas and mode poses |
| Capsule: capsule geometry with two tori | Iridescent hull, brass seal collars, engraved SHA plate, carried on physical lanes by a sled |
| Labels carry most meaning | Meaning in mechanisms: press closes, arcs sweep and close into bands, drones orbit, key assembles; labels reduced to identity plates |
| Evidence View dominates the lower right | Narrower, translucent overlay; compact timeline |
| Mind: nodes on a floor with tethers | Archive rack with monoliths, reader arm and projection, forge plinth, contested pair with lattice, monument, galaxy behind, walkway in front |

## The operational sequence, as choreography

Every step is a recorded fixture event (`packages/test-fixtures`, `passingRun` or `blockedThenRepairedRun`) admitted by `animationFor` in `packages/visual-language`. The step list folds into a `BayState` (`world/foundry/state.ts`); stations and characters read that state and never invent progress. A refused event contributes nothing but the refusal marker.

| Step | Event | Characters | Mechanism |
|---|---|---|---|
| file read | file_read | Fabricator works at the bench, thinking face | lamp beam, module opens as a cross-section |
| search | repository_searched | Fabricator | pulse ring sweeps the directory scope |
| file edit | file_modified | Fabricator, focus face, wand lit | module lifts, diff plane, chips to the audit vent, parts arrive |
| unstaged modules | file_created | Fabricator | second module fabricates from a frame; both hover in racks |
| staging | changes_staged | Fabricator walks to the cradle, load pose | modules rise into the cradle seats, field rings spin |
| commit sealing | candidate_committed | Fabricator at the press, press pose, seal face | lid closes, compresses, opens on the sealed capsule; readout lights |
| push, remote confirmed | push_started, candidate_pushed | Fabricator operates the readout, pass face | (beacons are in the Evidence View this phase) |
| handoff → Prover | handoff_started | Virgil opens one route (vanes, route face); Fabricator presents; Prover waits | lane A charges; sled carries the capsule to the dock |
| received, verification | handoff_received, verification_started | Prover works: mast deploys, waist ring spins | dock lights |
| static checks, passes | check_started ×2, check_passed ×2 | Prover, scan face | tsc and biome arcs sweep together, then close into bands |
| unit running, passed, visual skipped | check_started, check_passed, check_skipped | Prover | unit arc sweeps alone; visual channel stays grey and labelled |
| signature | verification_completed | Prover, pass face | signature ring engages |
| handoff → Keeper | handoff_started | Virgil opens the second route; Keeper waits | lane B crosses the gap |
| received, review, finding, pass | handoff_received, review_started, finding_raised, review_passed | Keeper works: boom unfolds, drones orbit, finding face, pass face | rings spin, pin attaches, verdict ring lights |
| safe to merge | safe_to_merge | Virgil presents toward the pedestal, seal face; Keeper calm | lane C to the pedestal; key assembles; airlock stays closed |
| refused | tampered candidate_pushed | Fabricator and Virgil refuse; routes closed | nothing moves; refusal glyph and struck step |

Failed-check run: identical through `unit running`, then `check_failed` (arc breaks at Capsule.tsx:42 with a fault tether; Prover warns), `check_skipped`, `verification_completed` with a failure (no signature), `candidate_quarantined` (violet lattice closes over the dock; Virgil closes routes and warns; the corridor to the Keeper stays dark), then the refused tampered push. No merge and no deployment appear in either run.

## Characters

Shared rig (`characters/rig.ts`): rounded torso, big screen head with bezel and collar, stubby legs with boots, optional arms; procedural stride from distance travelled, bob and breath, damped pose blending, independent blink clocks. Screens (`characters/faces.ts`, `screen.ts`): a 4×4 mask atlas of original glyphs (rest, blink, focus, scan, think, wait, alert, refuse, pass, finding, seal, route, boot, calm, warn, off) coloured per role. Modes: idle, walk, work, wait, refuse, present; work poses are only requested by choreography.

| Role | Silhouette and equipment | Working accent |
|---|---|---|
| Fabricator | broad barrel torso, shoulder yokes, thick arms with a clamp and a three-finger hand, tool backpack with three cartridges, assembly wand | cyan |
| Prover | narrow drum torso, waist sensor ring with studs, antenna array, deployable dish mast, two-prong probes, reticle screen | lime |
| Keeper | no arms, hooded cowl with side and back flaps, magnifier boom, three orbiting drones that park on the hood, archive reel | evidence ice |
| Virgil | command collar and pauldrons, rear shell with glyph, six fold-out vanes, orbital instrument rings with beads, three antennae, mitts with studs, the largest screen | star white |

Greyscale check: `/spike/characters?mono=1` and `/spike/foundry?mono=1`.

## Mind cluster

Gateway ring and lane (run artifact arrives) → archive rack: `src-master-commission` and `src-run-pass` monoliths in clamped cradles with hash bands and seal caps → reader arm casts a wireframe projection → fragments drift to the forge plinth with dashed tethers → tethers become continuous → one fragment splits into amber halves with an interference lattice → the supported fragment assembles into a faceted durable structure with a lime signature band → one scan wave; a beacon pins the contested pair. OD-0001 stands as a gold sealed monument; the seed wiki's ten pages hang behind as faceted structures tethered to the commission.

## Modes

Reduced motion: locomotion snaps, bob and sway vanish, rings and drones hold, arcs show their end state; poses, faces and every state object remain. Mobile tier: same world at lower DPR and bloom; constrained tier disables shadows and post-processing. Both are captured.

## Honest limitations

- Rendering in this container is software (SwiftShader). Colour, bloom, shadow softness and frame rate in the captures are not representative; the owner judges on a GPU.
- Push transit and remote confirmation have no physical beacon pair in the bay yet; their evidence is shown in the overlay and the press readout.
- The Foundry-to-Mind crossing is a threshold ring at each end and a route link, not a continuous camera move on one scene graph (Phase 1).
- Characters use ordinary meshes; geometry is cached per part so an instancing pass can follow, but none exists yet.
- No character walks a navigation grid; goals are straight-line and the stations are laid out so no path crosses an obstacle.
- Performance per tier was not measured on representative devices.

Verdict rules per OD-0002: BLOCKED_PENDING_REAL_GPU_REVIEW until the owner inspects on a GPU; NEEDS_ITERATION if it still reads as placeholder geometry there.
