# Phase 1 run record — stage S2, viewing points V0 to V8.1

Opened 2026-09-08 by the V6 pass, on finding KR-56 of the review of `a4f8b70`: no Phase 1 run record with commit SHAs existed. Every earlier viewing point is recorded here from the repository's own history (`git log`, the committed artifacts and their `.sha256` files, the `PHASE_1_HOW_TO_LOOK_V*.md` documents); V6 is recorded from the session that built it. This is a record of what was run and what it produced. It decides nothing. It is not an event log in `packages/domain/` — the backlog item "record real runs as events" stays open, and this file is the prose that item says should be events.

Everything below was built and checked on a machine that renders in software. No visual-quality judgment has been made on real graphics hardware by anybody; OD-0005 defers the two graphics-hardware checks and requires them recorded as **not performed**, never as met. This record does not relieve that.

## Viewing points to date

| Point | Source commit | Artifact (`docs/process/PHASE_1_owner-builds/`) | Owner document | What it asked |
|---|---|---|---|---|
| V0 | `cd49062eda` | `virgil-s1-v0-cd49062eda.html` | `PHASE_1_HOW_TO_LOOK.md` | Can you open it? |
| V1 | `ed68a46eb1` | `virgil-s2-v1-ed68a46eb1.html` | `PHASE_1_HOW_TO_LOOK_V1.md` | The room and the window |
| V2 | `2ad2191154` | `virgil-s2-v2-2ad2191154.html` | `PHASE_1_HOW_TO_LOOK_V2.md` | Virgil at the centre of the orrery |
| V3 | `532631a16d` | `virgil-s2-v3-532631a16d.html` | `PHASE_1_HOW_TO_LOOK_V3.md` | The ring console, the Prover at a station |
| V4 | `ca34062bcc` | `virgil-s2-v4-ca34062bcc.html` | `PHASE_1_HOW_TO_LOOK_V4.md` | Fitted faces, readable screens |
| V5 | `868971a375` | `virgil-s2-v5-868971a375.html` | `PHASE_1_HOW_TO_LOOK_V5.md` | The Prover in his station, slabs, receiving and working, stillness |
| V6 | `5b4b52fb8bc1c93ab9ee6ef789c16dd61a614d00` | `virgil-s2-v6-5b4b52fb8b.html` | `PHASE_1_HOW_TO_LOOK_V6.md` | The stylised set, in the room and on a tabletop, with the refusal |
| V7 | `ffa3e18cffb17ec55588ac8facc544d9ee1f4043` | `v7-s2-virgil-ffa3e18cff.html` | `PHASE_1_HOW_TO_LOOK_V7.md` | The tabletop: faces on the head, screens as objects |
| V8 | `934554159f8021478887603c9230d459eed763da` | `v8-s2-virgil-934554159f.html` | `PHASE_1_HOW_TO_LOOK_V8.md` | Symmetrical consoles carrying their own screens; the receiving and the return; four verdicts; the turn |
| **V8.1** | **`64e2e746782930c0efc6a494177511cc54f3956c`** | **`v8-1-s2-virgil-64e2e74678.html`** | **`PHASE_1_HOW_TO_LOOK_V8.md` (V8.1 note appended)** | **Four rendering defects repaired: the close-ups reach their pose and show the whole screen, the screens are flat, the chrome is opaque** |

The V5 source commit `868971a` and its documents were merged to `main` by the owner as pull request #7 (`90b116c`); the V6 branch was restarted forward from that merge.

## V6 — the pass of 2026-09-08

Branch `claude/virgil-phase-1-slice`, restarted with `git checkout -B claude/virgil-phase-1-slice origin/main` at `90b116c`; `git diff --stat origin/main` was empty before work began. Direction: `docs/process/PHASE_1_STYLISED_SPEC.md` (owner direction, written and pushed first).

| Commit | What |
|---|---|
| `5fe9fc0` | The specification written down as owner direction, before anything was built |
| `7f203e0` | Nine V6 models and two typefaces imported unmodified with provenance rows written first; two figures the brief gave for `prover-model-candidate-02.glb` corrected from measurement |
| `911640c` | The reduction pipeline extended for single-texture matte models with declared factors; payloads generated; Tektur retired. An intermediate commit, red on `pnpm check`, pushed against the risk of a container restart |
| `a927c5b` | The set: room and tabletop, the cast, the refusal, the screens, KR-55 and KR-57 |
| `81376cb` | A first V6 artifact built from `a927c5b` (SHA-256 `79a8c3bb…`, 9,804,673 bytes; reproduced byte for byte; verify PASS), this record opened, the owner document drafted. Superseded below and removed |
| `55e83f6` | The two voxel clearance tests given an explicit 120 s timeout, after one ran 9.98 s under a loaded machine and failed Vitest's 5 s default; no assertion changed |
| `5b4b52f` | The Keeper's station and the eye-level camera's side moved so "Look at Prover" no longer looks past the Keeper. **The source of the V6 artifact** |
| (this commit) | The artifact from `5b4b52f`, its digest, this record and the owner document completed from the captures, the register brought up to date |

### Checks run on `5b4b52f`, all with `TURBO_FORCE=true`

The same checks were run and passed on `a927c5b` and `55e83f6`; the results below are from the final source. One earlier `pnpm check` on `a927c5b`, run while two software-rendering captures were also running, failed a single test on a 5 s timeout (`cast-clearance.test.ts`, 9.98 s); alone it takes 2–3 s; `55e83f6` records the cause and gives the test an explicit timeout.

| Check | Result, as printed |
|---|---|
| `pnpm check` | lint clean (Biome, 161 files); typecheck clean; tests: 6 tasks successful; the application 51 tests in 6 files, all passed; `@virgil/agent-contracts` 70 passed; the other four packages passed. Turbo's "no output files found" warnings are its usual note about `outputs` in `turbo.json` and are not failures |
| `pnpm --filter @virgil/knowledge-lint run lint` | `knowledge graph: 82 nodes, 166 edges, 10 pages, 28 claims, 94 tethers (94 intact)`; `mind scan: no findings` |
| `pnpm --filter mission-control build:owner` (clean tree, `VIRGIL_OWNER_BUILD_DATE="2026-09-08 05:20 UTC"`) | `virgil-s2-v6-5b4b52fb8b.html`, 9,804,742 bytes, SHA-256 `80e64a1517829db7a660f02e67f4f4a54c5b9e9d7eb94a706109359f8c879f99` |
| Reproducibility rebuild (clean tree, `VIRGIL_OWNER_SHA=5b4b52fb8bc1c93ab9ee6ef789c16dd61a614d00`, same date) | SHA-256 `80e64a1517829db7a660f02e67f4f4a54c5b9e9d7eb94a706109359f8c879f99` — **identical byte for byte**. (On the earlier `a927c5b` artifact a first attempt disagreed, `93b6fa37…`, because the artifact had been copied into `docs/` before the rebuild, dirtying the tree so the footer read "(+uncommitted changes)"; repeated from a clean tree it matched. The `5b4b52f` rebuild was run before the copy.) |
| `sha256sum -c virgil-s2-v6-5b4b52fb8b.html.sha256` (in `docs/process/PHASE_1_owner-builds/`) | `virgil-s2-v6-5b4b52fb8b.html: OK` |
| `pnpm --filter mission-control verify:owner` | routes `(room), #/s1, #/spike/foundry, #/spike/mind`; requests 1, off-document 0; renderer `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)…), SwiftShader driver)`; console errors 0; **PASS — opens from file://, no console errors, no off-document requests**. Warnings printed and not failed on: the `THREE.Clock` deprecation, `PCFSoftShadowMap` deprecation, and SwiftShader's ReadPixels stalls |

### Size, against both readings of the budget

The artifact is **9,804,742 bytes**: 9.35 MiB, or 9.80 MB at a million bytes each. Of that, 8,002,492 bytes are the base64 payloads (the seven V6 models 3.95 MB, the rigged Virgil 1.62 MB, the porthole 1.11 MB, the three window layers 1.28 MB, the two font subsets 35 KB) and about 1.8 MB is code and CSS. `docs/architecture/PERFORMANCE_STRATEGY.md` sets ≤ 12 MB desktop and ≤ 6 MB mobile without saying which unit:

- desktop: **77.9 % of 12 MiB, 81.7 % of 12 MB — inside on both readings**, the first viewing point since V2 to be;
- mobile: **155.8 % of 6 MiB, 163.4 % of 6 MB — over on both readings**, as every viewing point has been.

V5 was 15,330,856 bytes; V6 is 5,526,114 bytes (36 %) smaller. The owner console's estimate for this pass was 6–8 MB; the artifact is over that estimate by 1.8–3.8 MB. Where the estimate went wrong: every payload is carried as base64, which is 4/3 of its bytes, and the porthole and window layers (2.4 MB encoded) were kept unchanged because the owner praised the window. Nothing was cut for the number.

### Findings from the review of `a4f8b70`, addressed

- **KR-55** — `Visor.tsx` no longer returns nothing under reduced motion: `faceAppearance` is a pure function that, with reduced motion, freezes time, opens the eyes, flattens the pulse and keeps each state's form and colour; a static face is drawn and redrawn only on a change of state. Tested in `test/demo.test.ts` (blocked and passed stay distinct). `PHASE_1_HOW_TO_LOOK_V5.md` carries a dated correction to "both are still with reduced motion".
- **KR-56** — the S2 scope contradiction is recorded in `PHASE_1_STYLISED_SPEC.md` §7.1, and this run record exists.
- **KR-57** — the visor mesh is built by `buildVisorMesh` in `visorFit.ts`, which sets the double-sided material, `frustumCulled = false` and `visible = true`; `test/visor.test.ts` asserts all three on the object it returns, and holds `Visor.tsx` by source to using that builder through `<primitive>` with no JSX mesh, no material of its own, no `.side =`, no `frustumCulled =`, no `visible =` and no `return null`. Honestly stated: the object-level checks are the real test; the source guards close the routes a component has to undo them, and a new route would need a new guard.

### The visor bound

`test/visor.test.ts` keeps `MAX_GAP = 0.015`. Measured worst gaps on the fitted panels: Fabricator 9.6 mm, Prover 8.0 mm, Keeper 12.0 mm; Virgil 8.6 mm in his joint's units, which is 5.1 mm at scale (his panel is fitted in the joint frame at 0.6 m per unit, so the bound is effectively 9 mm for him). The console's prediction that Virgil's head might trip the bound did not come true. The Prover's did, once: a panel top at 1.32 m was lifted 16.5 mm over the helmet's brim ridge; the panel's top was lowered to 1.295 m, under the ridge, and the bound was not touched.

### Three observations from the owner console's own render, recorded and not acted on

Recorded here and in `PHASE_1_HOW_TO_LOOK_V7.md` as known and not yet addressed; they are the next pass, not this one. One correction of fact is attached to the first, because a future reader acting on it would otherwise look for code that does not exist.

1. **The screens overlap and there are too many.** In the upper third of the portrait frame Virgil's three slabs, the three floating station panels and the three stations' own screens crowd together, and at least one panel is partly occluded by another. **Correction:** this pass did **not** map the consoles' own screens — that is queued in the spec (§0.9) for the pass after V7 — so the stations' screens in the frame are the models' own *baked, painted* screens, static as delivered. The crowding is the six code-built screens (three slabs, three panels) over those baked ones. The owner's intent, and §0.9's plan, is that the mapped console screens serve *instead of* the floating panels for the agents, Virgil's three slabs being the only exception the owner named; when that lands, the three floating panels go and the count falls, and the portrait frame's top third clears with them.
2. **Virgil does not read as the conductor.** He is small, low in the frame, and the least prominent of the four, which contradicts the metaphor the set is built on (he replaces the sun; the world turns around him). The depth arrangement that fixed the phone's framing put him nearest the camera but lowest in a frame seen from 30–38° above.
3. **The composition is bottom-heavy:** his console fills the lower half, the cast sits in a band across the middle, the screens crowd the top.

### What was not done

No performance measurement. No look on real graphics hardware. The three characters are unrigged by the owner's note, so the hand-off is one-sided. Generation prompts and times for all nine models are outstanding. The Prover and Keeper model assignments are provisional (`cast.ts`). The Owner Build's `#/s1` spikes are unchanged.

## V7 — the pass of 2026-09-08, from the owner's reaction to V6 on their phone

Branch `claude/virgil-phase-1-slice`, forward from V6's `e144e9f`. Direction: the owner's words as relayed by the owner console, written into `docs/process/PHASE_1_STYLISED_SPEC.md` §0 before and during the work. Every increment was committed and pushed as it landed, because a restart once cost this project an hour of unpushed work.

| Commit | What |
|---|---|
| `4bf2dfd` | Tabletop by default, the room retired (reachable behind `V` and `#/?view=room`); the cast arranged in depth and compacted; a camera that answers to the viewport's aspect; the control bar fitting 390 px and the footer publishing its height; the floor's inlay drawn as one texture on one face (`floorGraphic.ts`, `test/floor.test.ts`) |
| `40bb155` | The face on the head's own triangles: `asset-pipeline/fit-visor.mjs` records which triangles carry each head's painted visor; the runtime draws the face on them through a paint-masked shader, with the glass 6 mm out along the normals; Virgil first, then the three figures; `test/visor.test.ts` rewritten for the mechanism. Under the owner's permission ("You may edit the root config files"), one line in `biome.json` excludes the committed artifacts (KR-54); the spec records the V7 direction and the queued console-screens direction |
| `cc192e8` | The screens as objects: a cased, glassed slab in the cast's sampled cream; `glass.ts` shared by the visors and the screens |
| `9579dc1` | The walking seam: idle and working placements, `locomotion.ts` with the glide as the placeholder, `test/locomotion.test.ts`, the clearance test extended to the idle position and the path |
| `8ce66ce` | Smaller textures (characters 512², stations 256², Virgil 768², the porthole 512²/256²); masks regenerated against the new payload digests |
| `ffa3e18` | The artifact named with the viewing point in front; the footer's stage line; a formatting fix. **The source of the V7 artifact** |
| (this commit) | The artifact from `ffa3e18`, its digest, this record, the owner document and the spec's size section |

### Checks run on `ffa3e18`, all with `TURBO_FORCE=true`

All five were run **synchronously, in the foreground**, on the closing pass at `5e83e38` (whose only difference from `ffa3e18` is documents and the committed artifact, none of it in the bundle), from a clean tree (`git status --short` empty before the rebuild). Earlier background runs of the same checks agreed; these are the ones recorded.

| Check | Result, as printed |
|---|---|
| `pnpm check` | lint: `Checked 171 files in 195ms. No fixes applied.` (the six committed artifacts excluded under the owner's root-config permission, so no KR-54 warning); typecheck: `Tasks: 8 successful, 8 total`; tests: `Tasks: 6 successful, 6 total` — the application 68 tests in 8 files, `@virgil/agent-contracts` 70, `@virgil/domain` 104, `@virgil/knowledge-graph` 24, `@virgil/gate-engine` 19, `@virgil/visual-language` 18, all passed (303 in all) |
| `pnpm --filter @virgil/knowledge-lint run lint` | `knowledge graph: 82 nodes, 166 edges, 10 pages, 28 claims, 94 tethers (94 intact)`; `graph hash sha256:a86250498e12d01d9be701610b1947b0bec39c34739816ddb2e0334ea6e0d6d1`; `mind scan: no findings` |
| `pnpm --filter mission-control build:owner` (clean tree, `VIRGIL_OWNER_BUILD_DATE="2026-09-08 08:10 UTC"`) | `v7-s2-virgil-ffa3e18cff.html`, 8,395,984 bytes, SHA-256 `11f043dfa3e73392c09a8204251778ce35a6b7af7280869a533407143d5201bc` |
| Reproducibility rebuild (clean tree, `VIRGIL_OWNER_SHA=ffa3e18cffb17ec55588ac8facc544d9ee1f4043`, same date), compared with `cmp` against the committed file | `owner build: 8.01 MB (8395984 bytes)`, `sha256 11f043df…5201bc`; `cmp` silent — **identical byte for byte to `docs/process/PHASE_1_owner-builds/v7-s2-virgil-ffa3e18cff.html`**. Run twice this pass (once at build time against the first artifact, once on the closing pass against the committed one); both matched |
| `sha256sum -c v7-s2-virgil-ffa3e18cff.html.sha256` (in `docs/process/PHASE_1_owner-builds/`) | `v7-s2-virgil-ffa3e18cff.html: OK`; 8,395,984 bytes |
| `pnpm --filter mission-control verify:owner` (on the rebuilt file, `cmp`-identical to the committed one) | routes `(tabletop), (retired room), #/s1, #/spike/foundry, #/spike/mind`; requests 1, off-document 0; renderer `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)…), SwiftShader driver)`; footer `Virgil Owner Build — Phase 1 S2 / viewing point V7 — the tabletop: faces on the head, screens as objects built from commit ffa3e18cffb17ec55588ac8facc544d9ee1f4043 built 2026-09-08 08:10 UTC …`; console errors 0; **PASS — opens from file://, no console errors, no off-document requests**. Warnings printed and not failed on, as in V6: the `THREE.Clock` deprecation, `PCFSoftShadowMap` deprecation, SwiftShader's ReadPixels stalls |

The owner console also rendered the committed artifact independently at 1280 × 800 and at 390 × 664 portrait: one canvas, one request, no console errors, all four characters in frame at both. That is the console's report, recorded as such.

### Size, against both readings of the budget

The artifact is **9,804,742 bytes**: 9.35 MiB, or 9.80 MB at a million bytes each. Of that, 8,002,492 bytes are the base64 payloads (the seven V6 models 3.95 MB, the rigged Virgil 1.62 MB, the porthole 1.11 MB, the three window layers 1.28 MB, the two font subsets 35 KB) and about 1.8 MB is code and CSS. `docs/architecture/PERFORMANCE_STRATEGY.md` sets ≤ 12 MB desktop and ≤ 6 MB mobile without saying which unit:

- desktop: **77.9 % of 12 MiB, 81.7 % of 12 MB — inside on both readings**, the first viewing point since V2 to be;
- mobile: **155.8 % of 6 MiB, 163.4 % of 6 MB — over on both readings**, as every viewing point has been.

V5 was 15,330,856 bytes; V6 is 5,526,114 bytes (36 %) smaller. The owner console's estimate for this pass was 6–8 MB; the artifact is over that estimate by 1.8–3.8 MB. Where the estimate went wrong: every payload is carried as base64, which is 4/3 of its bytes, and the porthole and window layers (2.4 MB encoded) were kept unchanged because the owner praised the window. Nothing was cut for the number.

### Findings from the review of `a4f8b70`, addressed

- **KR-55** — `Visor.tsx` no longer returns nothing under reduced motion: `faceAppearance` is a pure function that, with reduced motion, freezes time, opens the eyes, flattens the pulse and keeps each state's form and colour; a static face is drawn and redrawn only on a change of state. Tested in `test/demo.test.ts` (blocked and passed stay distinct). `PHASE_1_HOW_TO_LOOK_V5.md` carries a dated correction to "both are still with reduced motion".
- **KR-56** — the S2 scope contradiction is recorded in `PHASE_1_STYLISED_SPEC.md` §7.1, and this run record exists.
- **KR-57** — the visor mesh is built by `buildVisorMesh` in `visorFit.ts`, which sets the double-sided material, `frustumCulled = false` and `visible = true`; `test/visor.test.ts` asserts all three on the object it returns, and holds `Visor.tsx` by source to using that builder through `<primitive>` with no JSX mesh, no material of its own, no `.side =`, no `frustumCulled =`, no `visible =` and no `return null`. Honestly stated: the object-level checks are the real test; the source guards close the routes a component has to undo them, and a new route would need a new guard.

### The visor bound

`test/visor.test.ts` keeps `MAX_GAP = 0.015`. Measured worst gaps on the fitted panels: Fabricator 9.6 mm, Prover 8.0 mm, Keeper 12.0 mm; Virgil 8.6 mm in his joint's units, which is 5.1 mm at scale (his panel is fitted in the joint frame at 0.6 m per unit, so the bound is effectively 9 mm for him). The console's prediction that Virgil's head might trip the bound did not come true. The Prover's did, once: a panel top at 1.32 m was lifted 16.5 mm over the helmet's brim ridge; the panel's top was lowered to 1.295 m, under the ridge, and the bound was not touched.

### What was not done

No performance measurement. No look on real graphics hardware. The three characters are unrigged by the owner's note, so the hand-off is one-sided. Generation prompts and times for all nine models are outstanding. The Prover and Keeper model assignments are provisional (`cast.ts`). The Owner Build's `#/s1` spikes are unchanged.

## V7 — the pass of 2026-09-08, from the owner's reaction to V6 on their phone

Branch `claude/virgil-phase-1-slice`, forward from V6's `e144e9f`. Direction: the owner's words as relayed by the owner console, written into `docs/process/PHASE_1_STYLISED_SPEC.md` §0 before and during the work. Every increment was committed and pushed as it landed, because a restart once cost this project an hour of unpushed work.

| Commit | What |
|---|---|
| `4bf2dfd` | Tabletop by default, the room retired (reachable behind `V` and `#/?view=room`); the cast arranged in depth and compacted; a camera that answers to the viewport's aspect; the control bar fitting 390 px and the footer publishing its height; the floor's inlay drawn as one texture on one face (`floorGraphic.ts`, `test/floor.test.ts`) |
| `40bb155` | The face on the head's own triangles: `asset-pipeline/fit-visor.mjs` records which triangles carry each head's painted visor; the runtime draws the face on them through a paint-masked shader, with the glass 6 mm out along the normals; Virgil first, then the three figures; `test/visor.test.ts` rewritten for the mechanism. Under the owner's permission ("You may edit the root config files"), one line in `biome.json` excludes the committed artifacts (KR-54); the spec records the V7 direction and the queued console-screens direction |
| `cc192e8` | The screens as objects: a cased, glassed slab in the cast's sampled cream; `glass.ts` shared by the visors and the screens |
| `9579dc1` | The walking seam: idle and working placements, `locomotion.ts` with the glide as the placeholder, `test/locomotion.test.ts`, the clearance test extended to the idle position and the path |
| `8ce66ce` | Smaller textures (characters 512², stations 256², Virgil 768², the porthole 512²/256²); masks regenerated against the new payload digests |
| `ffa3e18` | The artifact named with the viewing point in front; the footer's stage line; a formatting fix. **The source of the V7 artifact** |
| (this commit) | The artifact from `ffa3e18`, its digest, this record, the owner document and the spec's size section |

### Checks run on `ffa3e18`, all with `TURBO_FORCE=true`

| Check | Result, as printed |
|---|---|
| `pnpm check` | lint clean (Biome, 171 files, no fixes applied — the six committed artifacts excluded under the owner's root-config permission, so no KR-54 warning); typecheck 8 tasks successful; tests 6 tasks successful: the application 68 tests in 8 files, `@virgil/agent-contracts` 70, `@virgil/domain` 104, `@virgil/knowledge-graph` 24, `@virgil/gate-engine` 19, `@virgil/visual-language` 18, all passed. Run while two software-rendering captures were also running; no timeout |
| `pnpm --filter @virgil/knowledge-lint run lint` | `knowledge graph: 82 nodes, 166 edges, 10 pages, 28 claims, 94 tethers (94 intact)`; `mind scan: no findings` |
| `pnpm --filter mission-control build:owner` (clean tree, `VIRGIL_OWNER_BUILD_DATE="2026-09-08 08:10 UTC"`) | `v7-s2-virgil-ffa3e18cff.html`, 8,395,984 bytes, SHA-256 `11f043dfa3e73392c09a8204251778ce35a6b7af7280869a533407143d5201bc` |
| Reproducibility rebuild (clean tree, `VIRGIL_OWNER_SHA=ffa3e18cffb17ec55588ac8facc544d9ee1f4043`, same date) | SHA-256 `11f043dfa3e73392c09a8204251778ce35a6b7af7280869a533407143d5201bc` — **identical byte for byte** |
| `sha256sum -c v7-s2-virgil-ffa3e18cff.html.sha256` (in `dist/owner-build/` and again in `docs/process/PHASE_1_owner-builds/`) | `v7-s2-virgil-ffa3e18cff.html: OK`, both |
| `pnpm --filter mission-control verify:owner` | routes `(tabletop), (retired room), #/s1, #/spike/foundry, #/spike/mind`; requests 1, off-document 0; renderer `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)…), SwiftShader driver)`; footer `… viewing point V7 — the tabletop: faces on the head, screens as objects built from commit ffa3e18cff… built 2026-09-08 08:10 UTC …`; console errors 0; **PASS**. Warnings printed and not failed on: the `THREE.Clock` deprecation, `PCFSoftShadowMap` deprecation, and SwiftShader's ReadPixels stalls, as in V6 |

### Size, against both readings of the budget

**8,395,984 bytes**: 8.01 MiB, or 8.40 MB. Payloads 6,576,392 bytes of base64 (the six V7 models 2,806,140; the rigged Virgil 1,545,896; the porthole 904,352; the three window layers 1,284,752; the two font subsets 35,252; the four visor masks 14,236 as JSON); code and styles about 1,819,592. `docs/architecture/PERFORMANCE_STRATEGY.md` sets ≤ 12 MB desktop and ≤ 6 MB mobile without saying which unit:

- desktop: **66.7 % of 12 MiB, 70.0 % of 12 MB — inside on both readings**;
- mobile: **133.5 % of 6 MiB, 139.9 % of 6 MB — over on both readings**, as every viewing point has been.

V6 was 9,804,742 bytes; V7 is 1,408,758 bytes (14.4 %) smaller. **That size is why V6 would not open from Files on iOS is the console's hypothesis and is untested**; other candidate causes are named in `PHASE_1_HOW_TO_LOOK_V7.md`.

### Measurements this pass made, for the record

- **Paint on the heads** (`fit-visor.mjs`, against the shipped 512²/768² textures): Virgil 458 head-front triangles carry visor paint (365 wholly, 93 at the edge), paint bounds x −0.749..0.712, y 0.155..0.946, z 0.152..0.537 in the `Head` joint's frame; the Fabricator 235 (73 / 162); the Prover 207 (41 / 166), with his rule relaxed to luminance 0.06 / chroma 0.06 because 15 % of the samples inside his mask were dark but tinted (99th percentile of the dark samples' chroma 0.046 against the default 0.03) and the region trimmed to start above his navy collar; the Keeper 549 (223 / 326). Against the earlier 1024² textures the counts were 466 / 259 / 222 / 523; the Prover's paint bounds tightened from y 1.0–1.417 to 1.047–1.283 (his true band, 3.16 : 1) once a stray dark speck near the helmet's top fell out of the smaller texture.
- **The cast's cream**, from the shipped base-colour maps: `#fcecd4` (Virgil, Keeper) and `#fceccc` (Fabricator, Prover), used for the screens' cases.
- **The visor bound** of V4–V6 (`MAX_GAP = 0.015`) is retired with the panel: the face is on the head's triangles at 0 mm by construction, and the glass is held to exactly `GLASS_GAP_M = 0.006` along the normals by the test.

### What was not done

No performance measurement. No look on real graphics hardware. No test of the file on iOS — no session here can. The three walking rigs have not arrived; the seam is built and the glide is the placeholder. The consoles' own screens (spec §0.9) are queued for the next pass and not started. CI (KR-50/KR-59) was unblocked by the owner's root-config permission and deferred to its own pass; that pass is recorded below. Generation prompts and times for the models remain outstanding. The Prover and Keeper model assignments remain provisional.

## V8 — the pass of 2026-09-08, from the owner's review of V7

Branch `claude/virgil-phase-1-slice`, forward from `d937b3b` (V7 delivered, CI live). Direction: the owner's eight changes and the amendments relayed during the pass, written into `docs/process/PHASE_1_STYLISED_SPEC.md` §0.10 **before** the work began (`0f041ea`) and extended as the amendments arrived. Every increment was committed and pushed as it landed. CI ran on every push; the runs are recorded below as the API reported them.

| Commit | What |
|---|---|
| `0f041ea` | The V8 direction written down first: §0.10.1–0.10.10 of the spec |
| `375d42f` | The set: symmetrical consoles carrying their own screens (`asset-pipeline/fit-screen.mjs`, `screens/ConsoleScreen.tsx`), no window, the level camera, the raised backdrop, the turn (`locomotion.ts`), the receiving and returning beats (`screens/stationScreen.ts`, `returning.ts`, `arrival.ts`), counters (`tally.ts`), the four verdicts (`verdicts.ts`), the CRT (`crt.ts`), the spotlight (`Models.tsx`), the owner gate, Virgil's slabs driven from the candidate state; the tests rewritten and added |
| `1cb9bec` | The standing point moved left of the screen and the close-up camera to its side, after the first capture showed the Fabricator's back hiding his own screen; the console pictures inset so the honesty band clears the bezel's lip; the planet and the station swapped sides; the clocks capped at 0.1 s a frame; the capture entry point (`#/?demo=&loop=`); the spec's §0.10.11–13 |
| `9345541` | The owner document and this record's V8 section, from the captures. **The source of the V8 artifact** |
| `7c48911` | The artifact from `9345541`, its digest, the check results below |
| (this commit) | The reproducibility rebuild's printed result |

### Checks run on `9345541`, all with `TURBO_FORCE=true`, every one in the foreground

| Check | Result, as printed |
|---|---|
| `pnpm check` | Biome: `Checked 188 files … No fixes applied`; typecheck clean; tests, all passed: `mission-control` **119 tests in 11 files** (of which `console-screens.test.ts` and `screen-motion.test.ts` are new, and `locomotion.test.ts`, `cast-clearance.test.ts`, `demo.test.ts` and `screen-fonts.test.ts` rewritten or extended), `@virgil/agent-contracts` 70, `@virgil/domain` 104, `@virgil/knowledge-graph` 24, `@virgil/gate-engine` 19, `@virgil/visual-language` 18 — **354 tests**; then `build:owner` (8,426,397 bytes on the then-dirty tree) and `verify:owner`: `routes (tabletop), (retired room), #/s1, #/spike/foundry, #/spike/mind`; `requests 1, off-document 0`; `console errors 0`; **PASS — opens from file://, no console errors, no off-document requests** |
| `pnpm --filter @virgil/knowledge-lint run lint` | `knowledge graph: 82 nodes, 166 edges, 10 pages, 28 claims, 94 tethers (94 intact)`; `graph hash sha256:a86250498e12d01d9be701610b1947b0bec39c34739816ddb2e0334ea6e0d6d1`; `mind scan: no findings` |
| `pnpm --filter mission-control build:owner` (clean tree at `9345541`, `VIRGIL_OWNER_BUILD_DATE="2026-09-08 10:30 UTC"`) | `v8-s2-virgil-934554159f.html`, **8,426,374 bytes**, SHA-256 `fbe7dcbfe81abb12e2eac44f9b2a2cb39103bfa77acf1a2845cb5ba16dd4ace2` |
| `pnpm --filter mission-control verify:owner` (on the `1cb9bec` build, before the documents were committed; the source is otherwise identical) | `browser chromium 141.0.7390.37 — /opt/pw-browsers/chromium (preinstalled, substituted for the pinned build)`; `routes (tabletop), (retired room), #/s1, #/spike/foundry, #/spike/mind`; `requests 1, off-document 0`; `renderer ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)…), SwiftShader driver)`; footer `… viewing point V8 — the tabletop: symmetrical consoles with their own screens, a level camera, the receiving and returning beats …`; `console errors 0`; **PASS**. Warnings printed and not failed on, as in V6 and V7: the `THREE.Clock` and `PCFSoftShadowMap` deprecations and SwiftShader's ReadPixels stalls |
| `sha256sum -c *.sha256` (in `dist/owner-build/` and again in `docs/process/PHASE_1_owner-builds/`) | `v8-s2-virgil-934554159f.html: OK`; and every earlier artifact `OK` (V0–V7, eight files) |
| `pnpm reproduce:owner` (after the artifact was committed at `7c48911`) | newest artifact `v8-s2-virgil-934554159f.html`; recovered source commit `934554159f8021478887603c9230d459eed763da`; rebuilt in a detached worktree at that commit; `cmp … identical`; `sha256 fbe7dcbfe81abb12e2eac44f9b2a2cb39103bfa77acf1a2845cb5ba16dd4ace2 (8426374 bytes)`; **PASS — the committed artifact is byte-for-byte derivable from its commit** |

CI ran on every push of this pass (`0f041ea`, `375d42f`, `1cb9bec`, `9345541`); the API's per-run conclusions were not read back into this session, so they are not quoted here — the runs are on the repository's Actions page under their commit SHAs.

### Size, against both readings of the budget

**8,426,374 bytes**: 8.04 MiB, or 8.43 MB. Payloads 6,596,138 bytes of base64 and JSON (the six V7 models 2,806,140; the rigged Virgil 1,545,896; the porthole 904,352, kept for the retired room's window frame; the three window layers 1,284,752; the two font subsets 35,252; the four visor masks 14,236; the three new screen masks 5,510); code and styles about 1,830,000. `docs/architecture/PERFORMANCE_STRATEGY.md` sets ≤ 12 MB desktop and ≤ 6 MB mobile without saying which unit:

- desktop: **67.0 % of 12 MiB, 70.2 % of 12 MB — inside on both readings**;
- mobile: **133.9 % of 6 MiB, 140.4 % of 6 MB — over on both readings**, as every viewing point has been.

V7 was 8,395,984 bytes; V8 is 30,390 bytes (0.36 %) larger: the screen masks and the new screen code, less the floating panels. Removing the arch from the tabletop saved nothing, because the retired room still uses the porthole payload; dropping it from the bundle would save 904,352 bytes of base64 and is one decision away. Nothing was cut for the number.

### Measurements this pass made, for the record

- **The consoles' screens** (`fit-screen.mjs`, on the shipped 256² payloads, 2026-09-08): each station has exactly one usable screen, a recessed navy panel in a cream bezel, tilted back, facing the front, with pale writing baked in. Selected by geometry — a region, a facing within 25°, and at least four of seven samples darker than luminance 0.15 — because the screens are navy (luminance about 0.03), the same as the trim, so the visor's near-black rule finds nothing, and because the baked writing (0.2–0.5) would be punched out of a per-pixel mask. The Fabricator's: 38 of 261 triangles in its region (194 rejected by facing, 22 wholly dark), 0.549 m², 0.959 × 0.565 m, mean normal (0, 0.24, 0.97). The Prover's: 23 of 84 (61, 12), 0.434 m², 0.933 × 0.521 m, (0, 0.22, 0.98). The Keeper's: 41 of 280 (166, 20), 0.518 m², 0.892 × 0.579 m, (−0.01, 0.23, 0.97). Rendered with the selected triangles highlighted, each selection is the screen surface to its bezel's edge, and `test/console-screens.test.ts` holds every triangle to the region, the facing and the payload's digest.
- **The turn** (`locomotion.ts`): the step response of a second-order system, damping 0.7, natural frequency 5 rad/s, 1.6 s long — overshoot 4.60 % of the way, peaking at 0.88 s, within 0.12 % of settled at 1.6 s, zero velocity at the start. On a 150° turn that is a 7° overshoot. `test/locomotion.test.ts` holds one overshoot, no more than that, and a settle; `test/cast-clearance.test.ts` sweeps every character through eight yaws of the turn and the overshoot past the screen facing, at both facings with every breathing extreme, and finds no shared surface voxel with their console.
- **The standing point**: the console's measured front plus 0.2 m plus the character's widest horizontal reach from its axis (`placedReach`), so no yaw can bring a shoulder nearer than the gap; 0.88 m to the console's left, because the screens span about x −0.66..0.36 and the first capture, at 0.55 m, showed the Fabricator's back hiding his own screen once he turned to it.
- **The layout**: the side consoles at x ±2.85, z −3.75, turned in 0.38 rad; the centre console at z −5.15; the slabs at y 3.05, z −1.35; the camera 11° above a target at chest height (1.05 m), 11 m out in landscape and 13 m in portrait, the lens widened only as far as ±4.35 m needs at that distance (36° landscape, 59° portrait at 390 × 664); the planet at (+9, 6.5, −36) and the station at (−11, 3.4, −29) from the disc's centre.
- **The demonstration**: three loops of 56, 44 and 44 s (PASS then the Keeper's PASS_WITH_NON_BLOCKING_FINDINGS and the owner gate; BLOCKED; INSUFFICIENT_EVIDENCE); receiving beats of 6 s; every candidate state a word from `constitution/authority.json` and every step an allowed transition, held by `test/demo.test.ts`.

### What was not done

No performance measurement. No look on real graphics hardware. No test of the file on iOS. The tubes (§0.10.9) are not built; the arrival point is. The walking rigs are not needed and not waited on. Generation prompts and times for the models remain outstanding. The Prover and Keeper model assignments remain provisional. The porthole payload stays in the bundle for the retired room.

## Continuous integration — the pass of 2026-09-08

The repository had no automated checks of any kind. It now has `.github/workflows/checks.yml`, running on push to any branch and on pull requests. Authority: the owner in the owner console on 2026-09-08 — "You may edit the root config files." Nothing else about the permitted paths changed.

What runs, in order: `pnpm install --frozen-lockfile`; the Chromium `pnpm-lock.yaml` pins; `pnpm check` (biome, `turbo run typecheck`, every workspace test, then `verify:owner`); the Mind Scan; `build:owner`; `verify:owner`; `sha256sum -c` over every committed Owner Build digest; and, as a second job with full git history, the byte-for-byte reproducibility rebuild of the newest committed artifact.

`verify:owner` is no longer reachable only from a workflow file. `turbo.json` gives it `dependsOn: ["build:owner"]` with `cache: false` on both, and the root `check` script runs it, so `pnpm check` cannot pass without the Owner Build being built and opened from `file://`. `apps/mission-control/test/required-checks.test.ts` (14 assertions) fails if that wiring is removed or a workflow step is dropped.

### The three defects it was made to fail on, with what they printed

No workflow run exists yet — GitHub Actions has never run on this repository — so these were run locally, as the exact commands the workflow declares. Every defect was reverted immediately and none is committed.

| Defect | `pnpm test` | `build:owner` (`inline.mjs`) | The check that caught it |
|---|---|---|---|
| `void fetch('https://example.com/virgil-telemetry.json')` in a `useEffect` in `src/world/room/VirgilRoom.tsx` | **317 passed**, 0 failed | **exit 0** — accepted it | `verify:owner` **exit 1**: `requests 2, off-document 1`; `off-document requests: https://example.com/virgil-telemetry.json`; `console: Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED` |
| `background-image: url(https://example.com/virgil-footer.png)` in `.owner-footer` in `src/owner/owner.css` | 6 tasks passed | **exit 0** — accepted it | `verify:owner` **exit 1**: `requests 2, off-document 1`; `off-document requests: https://example.com/virgil-footer.png` |
| One byte flipped in `docs/process/PHASE_1_owner-builds/v7-s2-virgil-ffa3e18cff.html` (offset 4,197,992, `y` → `A`) | — | — | `sha256sum -c` **exit 1**: `v7-s2-virgil-ffa3e18cff.html: FAILED`, other seven `OK`; and `pnpm reproduce:owner` **exit 1**: `cmp … differ: char 4197993, line 4707`, rebuilt `11f043df…` against committed `4d64249f…` |

Two further demonstrations, that the wiring itself cannot be quietly removed: deleting `&& pnpm verify:owner` from the root `check` script fails `required-checks.test.ts` with `expected 'pnpm lint && pnpm typecheck && pnpm t…' to contain 'pnpm verify:owner'`; deleting `.github/workflows/checks.yml` fails the same file with `ENOENT: no such file or directory, open '…/.github/workflows/checks.yml'`.

One demonstration was vacuous on the first attempt and is recorded because it is the reason the brief demanded proof. The remote `url()` was first inserted *above* the `background: rgba(5, 3, 15, 0.92)` shorthand in the same rule, which resets `background-image` to `none`; nothing was ever requested and `verify:owner` passed. Moved below the shorthand, it failed as above. A guard nobody has tried to defeat is decoration, and so is a defect that was never live.

### Two real runs on GitHub Actions, one green and one red

The workflow has now actually run. These are the first two runs this repository has ever had.

| Run | Commit | Result |
|---|---|---|
| [#1](https://github.com/dniachini-droid/Virgil-mission-control/actions/runs/34204016605) — `push` to `claude/virgil-phase-1-slice` | `dd2c48f` | **success**. Job *lint, typecheck, tests, owner build, owner verify*: all eleven steps green, 08:21:02Z → 08:26:09Z (5m 07s). Job *newest Owner Build rebuilds byte for byte*: green, 38s |
| [#2](https://github.com/dniachini-droid/Virgil-mission-control/actions/runs/34204596445) — `push` to the scratch branch `claude/ci-failure-demo`, commit `767d905`, carrying one deliberate `fetch('https://example.com/…')` in `VirgilRoom.tsx` | `767d905` | **failure** at step 7, `pnpm check`; the Mind Scan, `build:owner`, `verify:owner` and the digest check were skipped as a consequence. The reproducibility job passed, correctly: the defect is at `HEAD`, and that job rebuilds the committed artifact at *its own* commit |

Run #2 exercises a path local simulation could not. This container's egress proxy makes an external `fetch` fail, so locally the escape produced a console error *and* an off-document request, and either would have failed the check. A GitHub runner has real egress, so the request succeeds and there is no console error: only the off-document-request check can catch it, and it did.

What identifies the failing sub-step is elimination, not a log read: the egress proxy here refuses `results-receiver.actions.githubusercontent.com`, so no run log could be downloaded into this session, and only the API's per-step conclusions are quoted above. With that same defect present, `pnpm lint` (173 files), `pnpm typecheck` (8 tasks) and `pnpm test` (317 tests, 6 tasks) all pass locally, and `verify:owner` exits 1. `pnpm check` is those four in sequence. So `verify:owner` is what failed run #2. That inference is stated as an inference.

**The scratch branch could not be deleted and is still on the remote**, at `claude/ci-failure-demo`, commit `767d905`. `git push origin --delete` returns `HTTP 403`, and the REST ref deletion returns `Write access to this GitHub API path is not permitted through this proxy`; the session that made it has no way to remove it. It is left for the owner: one `git push origin --delete claude/ci-failure-demo` from a machine that can. Until then, note what it is — one commit on top of `dd2c48f` whose only change is a deliberate external `fetch()` in `VirgilRoom.tsx`, made to be red and proved red. Nothing from it is merged, no defect is committed on the build branch, and the run itself is kept by GitHub at the link above regardless of the branch.

### The reproducibility rebuild, on the artifact as committed

`pnpm reproduce:owner`, run clean: newest artifact `v7-s2-virgil-ffa3e18cff.html` (added 2026-09-08T07:46:37Z); recovered source commit `ffa3e18cffb17ec55588ac8facc544d9ee1f4043` from the artifact's own bytes; recovered build date `2026-09-08 08:10 UTC` likewise; rebuilt in a detached worktree at that commit; `cmp` identical; sha256 `11f043dfa3e73392c09a8204251778ce35a6b7af7280869a533407143d5201bc` (8,395,984 bytes), which is the committed digest. 36s including a second `pnpm install`.

It rebuilds at the artifact's **own** commit, not at `HEAD`, so a later commit touching the app does not turn the check red for no reason. The only value fed in is the build minute, because it is the one thing in the output the commit does not determine; `VIRGIL_OWNER_SHA` is deliberately not passed, so the worktree's own `HEAD` supplies it and a footer that disagrees with the bytes is a failure.

### `pnpm check` after the change

`TURBO_FORCE=true pnpm check`: biome 173 files clean; 8 typecheck tasks; **317 tests passed** across 25 test files in 6 packages (mission-control 82, of which 14 are new); then `build:owner` (8,395,984 bytes) and `verify:owner` — `browser chromium 141.0.7390.37 — /opt/pw-browsers/chromium (preinstalled, substituted for the pinned build)`; `routes (tabletop), (retired room), #/s1, #/spike/foundry, #/spike/mind`; `requests 1, off-document 0`; `console errors 0`; **PASS**. 1m15s, against 21s before. Warnings printed and not failed on, as in V6 and V7: the `THREE.Clock` and `PCFSoftShadowMap` deprecations and SwiftShader's ReadPixels stalls.

### What this pass did not do

Nothing here is a *test* that GitHub honours the workflow file — no test in this repository executes GitHub Actions, and none can. Two runs demonstrate it once each way (above); a demonstration is not a control, and if the workflow is disabled in the repository's settings nothing here will say so. CI runs the Chromium the lockfile resolves (`153.0.8010.12`); this container substitutes a preinstalled `141.0.7390.37`, so a local pass and a CI pass are not passes on the same browser; the divergence is not repaired, and every run now prints which browser it used. `inline.mjs` is unrepaired (KR-58): the class of defect it misses is caught by a required check, and its own blind spot is untouched. The reproducibility rebuild covers the newest artifact only; the older seven are covered by their digests. No design-level-only row in `docs/architecture/ENFORCEMENT_BOUNDARIES.md` moved, and that document says why.

## V8.1 — the repair pass of 2026-09-08, from four defects found by looking at the frames

Branch `claude/virgil-phase-1-slice`, from `77a01a6`. A bounded repair pass, not a viewing point of its own: no new direction was implemented and the V8 owner document still stands, with a note appended. Four defects, all found by rendering the committed V8 artifact `v8-s2-virgil-934554159f.html` and looking at the frames — **none of them was caught by any check**, and two of the four were not what they looked like.

### Defect 1 — the Fabricator close-up was dominated by the back of Virgil's head

**What was wrong.** Press `2` and the frame was filled by Virgil's head, with the Fabricator's console screen — the whole point of the view — a sliver behind his crown. Reproduced at three demonstration times.

**The cause, which was neither the pose nor the animation.** `cameraPose('tabletop', 'fabricator', 1.6)` returns a camera 1.00 m from Virgil's head and **141° off its own view axis**, where a 40° lens cannot see him at all. That was the puzzle, and it had a measured answer: the camera was never at that pose. `Rig` lifted the orbit limits through React state (`setLimits(UNBOUNDED)` inside the focus effect), which lands a frame or two after the effect runs; on this software renderer one frame is about a second, so the whole 0.9 s flight completed inside the *first* frame and `OrbitControls.update()` clamped the new pose against the **previous** view's bounds — the wide tabletop's `minDistance: 6`. Measured live in the V8 artifact, by publishing the camera and the controls' six limits per frame:

| | authored pose | where it came to rest | distance to target | `minDistance` in force |
|---|---|---|---|---|
| Fabricator | (−0.915, 1.555, −0.006) | (0.689, 1.827, 2.048) | 3.379 m → **6.000 m** | 6 (the wide view's) |
| Prover | (1.604, 1.495, −1.051) | (2.853, 1.706, 0.809) | 3.379 m → **6.000 m** | 6 |
| Keeper | (2.664, 1.567, −0.021) | (2.998, 1.843, 2.562) | 3.379 m → **6.000 m** | 6 |

The view direction was correct in every case; each camera was pushed 2.62 m straight backwards along its own axis, and for the Fabricator that axis runs through Virgil. The frame log shows it exactly: the flight completes on frame 1 with `minD 6`; the focused bounds (`minD 1.4`) arrive on frame 3, two frames too late, and OrbitControls only clamps — it never restores. This is why `#/?cam=fabricator`, which poses the camera at mount while the limits are still unbounded, looked correct while pressing `2` did not, and why every earlier capture of the close-ups was of a camera nobody had authored. `Rig`'s own comment claimed "no clamp can snatch the camera mid-flight"; asynchronous state is exactly how one did.

**The animated-bounds hypothesis is disproved, and that matters for another test.** `v2-virgil-anim.glb`'s 2.071 × 3.000 × 1.373 against `v2-virgil.glb`'s 1.381 × 2.000 × 0.915 is the whole of the difference: all three ratios are exactly 1.5, an export scale, which `src/world/virgil/virgil-rigged-asset.json` already records ("The 3.000-unit source height is an export scale (exactly 1.5× the static candidate 04), not a size"). Sampled through all three shipped clips at five times each, Virgil's world bounds stay within x −0.79..0.69, y 0.19..2.01, z −0.38..1.41, against a bind pose of x ±0.62, z 0.3 ± 0.41: the clips do not carry him metres from `layout.virgilAt`. **But they do carry him up to 0.70 m further forward in +z and 0.21 m higher than bind pose** (`Angry_Ground_Stomp` at t = 0.37 s reaches z = 1.41 and y = 1.39 with his weight thrown forward). `test/cast-clearance.test.ts` measures him at **bind pose only** — its own title says so — so its clearance claim is exactly as narrow as it is written and does not cover the clips. It is not a fiction; it is a narrower statement than a reader might take it for. The new test covers the clips.

### Defect 3 — a dial on the Prover's console covered the end of his screen

True, and worse than it looked from the clamped camera. Measured from V8's **authored** pose against the whole set, over sample points spread across each console's own screen triangles:

| | samples on the screen | visible looking straight down its own normal | behind something from V8's close-up |
|---|---|---|---|
| Fabricator | 223 | 132 (91 under its own bezel) | 0 |
| Prover | 144 | 139 (5) | **75** — his console's dial, and the Keeper, who stands almost exactly on that sight line |
| Keeper | 226 | 215 (11) | **23** — his console's own casing |

And the lens was fixed at 40° where the Fabricator's screen needed 44° at 390 × 599 and the Keeper's 54°, so a phone cropped all three.

**What counts as the screen, stated because it changes the bar.** A console's screen mask runs right up to and a little under the console's own bezel: looking straight down the Fabricator's screen's own normal from six metres off, **91 of its 223 sample points are behind its own casing** (border vertices with the bezel standing 11–29 mm proud of them), 5 of the Prover's and 11 of the Keeper's. No camera anywhere can see those. So the requirement asserted is the honest one — **the camera must hide nothing that the model does not already hide** — and the head-on reference is recomputed from the same geometry inside the test, so the bar cannot drift.

**The fix.** A close-up is no longer posed. `src/world/room/closeUp.ts` derives it from the screen: the camera stands **on the screen's own measured axis** (the mean normal `asset-pipeline/fit-screen.mjs` recorded, turned into the room by the station's yaw — the one direction from which nothing standing proud of a surface, on that surface's own object, can cover it), at 3.0 m, at 1.25 of the screen's own rise (the screens tilt back 12.6°–14.1°, so the camera is 16°–18° above the screen's centre, which is what clears the character standing in front of the console), aiming three tenths of the way toward the character's eyes, with the lens the screen's measured box needs at the viewport's aspect. The pose was chosen by search, not by eye: 162 and then 80 candidates over distance, swing and elevation, each ray-cast against the whole set, and the reported clear region was intersected across the three roles.

**The cost, named rather than hidden.** The characters stand about two metres in front of their consoles and up to a metre to the side — up to 47° off the screen's axis — so a camera that sees the whole screen cannot always hold the character too without a fisheye. **No single pose in the searched family holds both for all three roles**: the Fabricator's own body blocks his screen unless the camera is raised, and raising it brings the Prover's dial over his; at 4.6 m the Prover and Keeper are clear at zero swing while the Fabricator needs 8° of it, and vice versa. The three consoles are three different models with different furniture on them. The screen wins, so the character is now largely cropped in their own close-up — a loss against the owner's V8 direction (§0.10.8: the face registers the work and they turn). That is a choice between two things the owner asked for and it is his to overturn; the alternatives are recorded here rather than decided.

### Defect 2 — 3D text bled through the control panel

The panel was `rgba(5, 3, 15, 0.72)` over a lit world, and Virgil's three slabs sit directly behind it from the Keeper's and the Prover's close-ups, so their amber `ILLUSTRATIVE · NOT REAL STATE` bands and the magenta candidate id read through the 28% left transparent. Not cosmetic: it made the active `Demo On/Off` button ambiguous in a full-size capture, and the honesty band is the one label that must never be ambiguous about where it belongs. The panel, its buttons, the demonstration badge and the provenance footer are opaque now, with a shadow so the panel still reads as lying over the set. The band is untouched where it belongs — in the world, on the screens. The phone's slab bands at the wide view are still too small to read; that is an owner decision about type size and was deliberately not touched.

### Defect 4 — the console screens were not flat

The owner: *"the text on the screens are much better, but the screens dont look flat and smooth. I think it is the original meshy files. the screens on the consoles look all crooked and lots of different slants. Can you make it completely smooth like Virgils screens??"*

He is right about the cause. V8 drew the live screen onto the console's selected triangles, the way a visor is drawn onto a head. On a head that is right; a face should follow the skull. On a screen the text followed the lumps.

**Measured first, on the committed payloads, by fitting a plane to each selection by area-weighted least squares** (a height field over the recorded mean normal, which is the right parameterisation because the surface is nearly planar already — the residual of that fit *is* the number the owner is looking at):

| console | vertices | RMS residual | furthest out of the plane | furthest out **under the picture** | furthest behind |
|---|---|---|---|---|---|
| Fabricator | 58 | **1.85 mm** | 6.30 mm | 5.84 mm | 3.23 mm |
| Prover | 39 | **9.39 mm** | 29.21 mm | 25.98 mm | 4.08 mm |
| Keeper | 69 | **2.40 mm** | 1.76 mm | 1.76 mm | 7.21 mm |

The Prover's is the one the eye catches: the per-vertex distribution runs p50 −0.07 mm, p90 **+16.89 mm**, p99 +23.17 mm, p100 +29.21 mm — about a tenth of his screen stands one and a half to three centimetres out of its own plane, so a straight line of type ran over a ridge. The fitted normals sit within 1.2° of the recorded means. These numbers are recorded in `test/console-screens.test.ts` as values, so a re-fit or a new payload that moves them fails a check instead of passing silently.

**What changed.** `src/world/screens/screenPlane.ts` fits the plane and builds **one flat rectangle** in it — the selection's own extent (0.896 × 0.518, 0.883 × 0.512 and 0.824 × 0.527 m) inset 35 mm on every side so its edge stays under the console's bezel lip, stood off the plane by the highest lump **under the rectangle itself** plus 4 mm: **9.8, 30.0 and 5.8 mm**. Nothing pokes through it and nothing z-fights with it. The lump bound is the surface clipped exactly to the rectangle — each triangle cut against its four edges by Sutherland–Hodgman and the height read at the corners of what survives — not the whole selection's, because a ridge out under the bezel is not behind the picture and lifting for it would stand the picture needlessly proud; on these payloads the two differ by 0.46, 3.23 and 0.00 mm. The glass over it is `createConvexGlassGeometry`, the same profile and highlight as Virgil's slabs, 12 mm in front of the rectangle at its edges and swelling by the slabs' own 0.03 / 1.30 of the width at its centre. Same font, same treatment, the honesty band on the flat surface with the rest of the display.

**The selection is still the model's**, so this does not abandon "the consoles carry their own screens": `fit-screen.mjs` read which of the console's own triangles are its screen, and the plane, its extent, its aspect and its lift are all derived from that selection. The console's lumpy triangles stay exactly where they are, behind the rectangle. **No geometry is deleted from the owner's model.**

Also repaired while measuring it: the live canvas was sized from the paint bounds' aspect, but the selection's y extent spans a surface tilted back 12.6°–14.1°, so its height in the fitted plane is longer than its height in y. The canvas is drawn at the rectangle's own aspect now (1.731, 1.725, 1.562), which was stretching the picture about 2%.

### Nothing was weakened to make any of this pass

The screen builder's original behaviour is unchanged and still its default — a visor is never flattened — so `console-screens.test.ts`'s existing assertion that the glass is the selection pushed out along its normals by exactly the gap still runs and still passes, and `visor.test.ts` holds the same rule for all four heads. Two float tolerances in the **new** assertions were set to a micrometre rather than a nanometre, because the geometry attribute is float32; no pre-existing tolerance was touched. The payload-digest assertions are untouched.

### The tests that hold the four fixes

- **`apps/mission-control/test/close-up-sight.test.ts`** (new, 4 tests). For each role, a ray from the close-up camera to every sample point of that console's own screen triangles **and to the four corners of the flat rectangle**, against the whole set: all three console bodies with their screen triangles removed, all three characters at every yaw of the turn including the overshoot and both breathing extremes, Virgil's console, and the rigged Virgil frozen at seven times of each of his three clips. It fails if any point the model does not already hide is behind anything. It also holds every corner of every screen inside the frame at 1280 × 735 and 390 × 599, holds the camera on the screen's own axis to within 0.02 rad, and — the shape of defect 1, as a test — checks that the pose satisfies every one of the orbit bounds `limitsFor` hands the controls. Verified to fail: with the elevation set to 0.15 of the screen's rise it reports `fabricator: 14 of 132 visible screen samples are behind something`.
- **`apps/mission-control/test/console-screens.test.ts`** (6 new tests, nothing removed). The fit's residuals as recorded values; the rectangle two triangles with every corner the same distance off the fitted plane to a hundredth of a millimetre, opposite edges equal, corners square; corners inside both the selection's measured extent and the region `fit-screen.mjs` was allowed to look in; every original screen vertex behind the rectangle; the glass's edge at the screen's own gap and its centre at the gap plus the slabs' bulge, every point of it over the rectangle.
- **`limitsFor`** now derives every bound from the pose it is handed, and `Rig` writes the six numbers onto the controls imperatively in the frame that needs them, with no limit props on `<OrbitControls>` at all — so React can no longer race the rig for them.

### Two scratch diagnostics deleted

`apps/mission-control/test/zz-explore.test.ts` and `zz-diag.test.ts` were the pose search and the bezel measurement. Both are deleted. What they found is in this record and in the two named tests: the 91/5/11 self-hidden samples, the 11–29 mm bezel proudness, and the clear region of the pose family.

### Frames looked at

The V8 artifact, pressing `2` after `__virgilDemo` existed, at 1280 × 800: Virgil's head filling the right half, the Fabricator's screen a sliver at the upper left. The same route on the V8.1 build: the Fabricator's screen filling the frame, legible, unoccluded, the panel opaque. The Prover at loop 2 t = 33.8 s (`INSUFFICIENT_EVIDENCE`): V8's dial across the right end of the screen, V8.1's screen whole and flat. The Keeper at loop 0 t = 40 s. The Fabricator in portrait at 390 × 664, before and after. Before defect 4, the honesty band and the corner brackets are visibly warped on all three consoles; after, they are straight.

### Checks run on `64e2e74`, every one in the foreground

- **`pnpm check`** — biome 190 files clean, no fixes applied; `turbo run typecheck` 8 tasks; **129 tests passed** across 12 test files in `mission-control` and **235 across the five packages** (agent-contracts 70, domain 104, gate-engine 19, knowledge-graph 24, visual-language 18), 364 in total, 0 failed, 0 skipped; then `build:owner` and `verify:owner` — `browser chromium 141.0.7390.37 — /opt/pw-browsers/chromium (preinstalled, substituted for the pinned build)`; `routes (tabletop), (retired room), #/s1, #/spike/foundry, #/spike/mind`; `requests 1, off-document 0`; `console errors 0`; **PASS — opens from `file://`, no console errors, no off-document requests**. Warnings printed and not failed on, as in V6–V8: the `THREE.Clock` and `PCFSoftShadowMap` deprecations and SwiftShader's ReadPixels stalls.
- **Mind Scan** (`pnpm --filter @virgil/knowledge-lint run lint`) — `knowledge graph: 82 nodes, 166 edges, 10 pages, 28 claims, 94 tethers (94 intact)`; `graph hash sha256:a86250498e12d01d9be701610b1947b0bec39c34739816ddb2e0334ea6e0d6d1`; **`mind scan: no findings`**.
- **`build:owner` from a clean tree** at `64e2e74` (`git status --short` empty before it ran) — `v8-1-s2-virgil-64e2e74678.html`, `8.04 MB (8432557 bytes)`, `sha256 c6ade0cc0871b714cbdde45689cd02facd3f4cd6fa4d977311afd2968eb1390b`. The footer carries no `+uncommitted changes` marker.
- **`sha256sum -c`** over every committed Owner Build digest — all **ten OK**, including the new one.
- **`pnpm reproduce:owner`** — see below.

### Size, against both readings of the budget

**8,432,557 bytes**: 8.04 MiB, or 8.43 MB. `docs/architecture/PERFORMANCE_STRATEGY.md` sets ≤ 12 MB desktop and ≤ 6 MB mobile without saying which unit:

- desktop: **67.0 % of 12 MiB, 70.3 % of 12 MB — inside on both readings**;
- mobile: **134.0 % of 6 MiB, 140.5 % of 6 MB — over on both readings**, as every viewing point has been.

V8 was 8,426,374 bytes; V8.1 is **6,183 bytes (0.073 %) larger** — the plane fit, the flat-screen builder and the close-up rule, less the hand-posed camera. No payload changed: every model, mask, font and window layer is byte-identical to V8. Nothing was cut for the number.

### What this pass did not do

No performance measurement and no look on real graphics hardware; OD-0005's two checks remain **not performed**. The CRT collapse has still never been seen by anybody in a frame — it is built and held by `test/screen-motion.test.ts`, and the cheap deterministic entry point that would put a frame inside its 0.8 s does not exist: `#/?demo=` starts the clock at a beat, but the collapse is driven by a station's own power clock from the moment its state leaves `RECEIVING`/`WORKING`/`REPORTED`, not by the demonstration clock, so a `#/?off=<role>` or a `powerAt` seed would be needed. That is named as a gap, not built. The phone's slab bands are still unreadable at the wide view (an owner decision about type size). The characters are largely cropped in their own close-ups, as above. The `INSUFFICIENT EVIDENCE` verdict word still overlaps the tally line beneath it on the Prover's screen at his console's aspect; that is the screen drawing's own layout, it was there in V8, and it was left alone as outside this pass.
