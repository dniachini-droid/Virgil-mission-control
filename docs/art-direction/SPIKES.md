# Phase 0 rendering spikes

Deliverables 14 and 15, and Amendment 1 outputs 8 and 9. Location: `apps/mission-control`, routes `/spike/foundry` and `/spike/mind`. Captures: `docs/art-direction/spikes/*.png` with `capture-report.json` (renderer string and page errors per capture). These are art-direction and data-contract proofs, not the interface.

## Run

```sh
pnpm install
pnpm --filter mission-control dev        # http://localhost:5173/spike/foundry and /spike/mind
pnpm --filter mission-control build && pnpm --filter mission-control capture   # headless captures
```

Query parameters: `step` (0-based), `tier` (ultra, desktop, laptop, mobile, constrained), `reduced=1`, `hold=1` (suppress camera travel). Keyboard: left and right arrows step, Home and End jump. The HUD exposes reduced motion, camera follow and tier.

## What the Foundry spike proves

Every step is a recorded event from `packages/test-fixtures` (`passingRun`) passed through `animationFor` in `packages/visual-language`. The step duration comes from the grammar. The Evidence View shows the event, actor, evidence kinds, grant, durability and the candidate state form.

| Step | Event | What is shown |
|---|---|---|
| 00 | — | One project station: observatory, ring, isolated worktree bay, Prover chamber with three unpowered arcs, Keeper station across a visible gap, remote station beyond the gulf, closed gold owner airlock |
| 01 | file_read | Inspection beam; module opens as a cross-section in place |
| 02 | repository_searched | Pulse over the directory scope only; scope labelled |
| 03 | file_modified | Diff plane; added components assemble; removed material streams to the audit vent; module hovers unstaged |
| 04 | file_created | Second module fabricated from a wireframe frame; both unstaged |
| 05 | changes_staged | Modules converge into the magnetic cradle; zero repelled |
| 06 | candidate_committed | Assembly compresses into a sealed capsule; short SHA band ignites; no verification marks |
| 07 | push_started | Mass-driver lane charges; packet in transit; beacons out of phase |
| 08 | candidate_pushed | Remote registers the capsule; beacons phase-lock on remote evidence only |
| 09 | handoff_started | Sealed capsule travels the named corridor to the Prover; no authority token travels |
| 10 | tampered candidate_pushed | Evidence removed. The grammar refuses; nothing moves; the refusal is displayed and the timeline strikes the step |

A reduced-motion mobile capture (`foundry-06-reduced-motion-mobile.png`) shows the same state at the same step with motion replaced by poses.

## What the Mind spike proves

Every step is a recorded knowledge event (`mindSequence`). The galaxy is derived from the real seed wiki by `packages/knowledge-graph` (`seed-graph.json`): ten pages placed by kind (principles as bright stars, governance as octahedra, architecture as knots, roles as constellations, visual language as a prism, glossary as a small solid), each tethered to the sealed commission source. Forms follow the epistemic visual contract.

| Step | Event | What is shown |
|---|---|---|
| 00 | — | Archive Nebula, Synaptic Forge, Living Knowledge Galaxy; gateway ring at the edge; OD-0001 as a gold sealed monument |
| 01 | run_record_deposited | Verified run artifact crosses the gateway: evidence, not knowledge |
| 02 | raw_source_added | Transmission becomes a source object with path and ingestion state |
| 03 | raw_source_hashed | Hash band engraves; the seal closes |
| 04 | raw_source_read | Non-destructive light projection beside the unchanged source |
| 05 | knowledge_compilation_proposed | Two translucent fragments drift to the Forge with dashed tethers |
| 06 | provenance_tether_created | Tethers become continuous to the run record and the commission |
| 07 | claim_contested | The bloom claim and the art-bible claim form an interference node; both remain inspectable |
| 08 | wiki_page_created | After verification approval the supported fragment assembles into a solid structure with a machine-verification band |
| 09 | wiki_lint_finding_raised | A scan wave crosses once; a beacon attaches to the contested pair with evidence |

## Techniques demonstrated

Custom GLSL nebula (domain-warped fbm, three palette bands, dust), three-layer parallax star field, emissive transit-lane shader with travelling packet, interference-lattice shader, scan-wave shader, physically based materials with iridescence and clearcoat under a procedural environment, bloom with a luminance threshold above label luminance, chromatic edge and vignette, canvas-texture labels, authored camera poses with smooth dollies, tier-dependent quality, reduced-motion fallbacks.

## Limitations and honest assessment

- Rendering in this container is software (SwiftShader). Colour, bloom and frame rate in the captures do not represent the product; the Evidence View prints the renderer string.
- Worker figures are silhouette stand-ins built from primitives that follow the role performance bible's shapes; they are not the final modelled ensemble.
- Ambient motion is present (nebula drift, star rotation, breathing seams) but not tested visually here.
- No 3D interaction tests run in the unit suite: the label system needs a 2D canvas, unavailable under Node. Captures serve as the baseline for Phase 1 visual regression.
- The judgment of the psychedelic-space quality bar is the owner's, on a real GPU, at the art-direction checkpoint (`docs/process/ART_DIRECTION_CHECKPOINT.md`).
