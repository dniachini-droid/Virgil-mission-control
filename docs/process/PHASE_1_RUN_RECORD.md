# Phase 1 run record — stage S2, viewing points V0 to V6

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
| **V6** | **`5b4b52fb8bc1c93ab9ee6ef789c16dd61a614d00`** | **`virgil-s2-v6-5b4b52fb8b.html`** | **`PHASE_1_HOW_TO_LOOK_V6.md`** | **The stylised set, in the room and on a tabletop, with the refusal** |

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

No performance measurement. No look on real graphics hardware. No test of the file on iOS — no session here can. The three walking rigs have not arrived; the seam is built and the glide is the placeholder. The consoles' own screens (spec §0.9) are queued for the next pass and not started. CI (KR-50/KR-59) is unblocked by the owner's root-config permission and deliberately deferred to its own pass. Generation prompts and times for the models remain outstanding. The Prover and Keeper model assignments remain provisional.
