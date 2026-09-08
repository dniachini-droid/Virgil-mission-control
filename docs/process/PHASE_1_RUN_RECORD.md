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
| **V6** | **`a927c5b70c68de288ccbcb8e740c2c5ab54d8985`** | **`virgil-s2-v6-a927c5b70c.html`** | **`PHASE_1_HOW_TO_LOOK_V6.md`** | **The stylised set, in the room and on a tabletop, with the refusal** |

The V5 source commit `868971a` and its documents were merged to `main` by the owner as pull request #7 (`90b116c`); the V6 branch was restarted forward from that merge.

## V6 — the pass of 2026-09-08

Branch `claude/virgil-phase-1-slice`, restarted with `git checkout -B claude/virgil-phase-1-slice origin/main` at `90b116c`; `git diff --stat origin/main` was empty before work began. Direction: `docs/process/PHASE_1_STYLISED_SPEC.md` (owner direction, written and pushed first).

| Commit | What |
|---|---|
| `5fe9fc0` | The specification written down as owner direction, before anything was built |
| `7f203e0` | Nine V6 models and two typefaces imported unmodified with provenance rows written first; two figures the brief gave for `prover-model-candidate-02.glb` corrected from measurement |
| `911640c` | The reduction pipeline extended for single-texture matte models with declared factors; payloads generated; Tektur retired. An intermediate commit, red on `pnpm check`, pushed against the risk of a container restart |
| `a927c5b` | The set: room and tabletop, the cast, the refusal, the screens, KR-55 and KR-57. **The source of the V6 artifact** |
| (this commit) | The artifact, its digest, this record, the V6 owner document, the register brought up to date |

### Checks run on `a927c5b`, all with `TURBO_FORCE=true`

| Check | Result, as printed |
|---|---|
| `pnpm check` | lint clean (Biome, 161 files); typecheck clean; tests: 6 tasks successful; the application 51 tests in 6 files, all passed; `@virgil/agent-contracts` 70 passed; the other four packages passed. Turbo's "no output files found" warnings are its usual note about `outputs` in `turbo.json` and are not failures |
| `pnpm --filter @virgil/knowledge-lint run lint` | `knowledge graph: 82 nodes, 166 edges, 10 pages, 28 claims, 94 tethers (94 intact)`; `mind scan: no findings` |
| `pnpm --filter mission-control build:owner` (clean tree, `VIRGIL_OWNER_BUILD_DATE="2026-09-08 04:50 UTC"`) | `virgil-s2-v6-a927c5b70c.html`, 9,804,673 bytes, SHA-256 `79a8c3bbc4f908aa3f87c93301334e19967049ed147181367372533b2b2b89af` |
| Reproducibility rebuild (clean tree, `VIRGIL_OWNER_SHA=a927c5b70c68de288ccbcb8e740c2c5ab54d8985`, same date) | SHA-256 `79a8c3bbc4f908aa3f87c93301334e19967049ed147181367372533b2b2b89af` — **identical byte for byte**. A first attempt disagreed (`93b6fa37…`) because the artifact had been copied into `docs/` before the rebuild, dirtying the tree so the footer read "(+uncommitted changes)"; the rebuild was repeated from a clean tree and matched |
| `sha256sum -c virgil-s2-v6-a927c5b70c.html.sha256` (in `docs/process/PHASE_1_owner-builds/`) | `virgil-s2-v6-a927c5b70c.html: OK` |
| `pnpm --filter mission-control verify:owner` | routes `(room), #/s1, #/spike/foundry, #/spike/mind`; requests 1, off-document 0; renderer `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)…), SwiftShader driver)`; console errors 0; **PASS — opens from file://, no console errors, no off-document requests**. Warnings printed and not failed on: the `THREE.Clock` deprecation, `PCFSoftShadowMap` deprecation, and SwiftShader's ReadPixels stalls |

### Size, against both readings of the budget

The artifact is **9,804,673 bytes**: 9.35 MiB, or 9.80 MB at a million bytes each. Of that, 8,002,492 bytes are the base64 payloads (the seven V6 models 3.95 MB, the rigged Virgil 1.62 MB, the porthole 1.11 MB, the three window layers 1.28 MB, the two font subsets 35 KB) and about 1.8 MB is code and CSS. `docs/architecture/PERFORMANCE_STRATEGY.md` sets ≤ 12 MB desktop and ≤ 6 MB mobile without saying which unit:

- desktop: **77.9 % of 12 MiB, 81.7 % of 12 MB — inside on both readings**, the first viewing point since V2 to be;
- mobile: **155.8 % of 6 MiB, 163.4 % of 6 MB — over on both readings**, as every viewing point has been.

V5 was 15,330,856 bytes; V6 is 5,526,183 bytes (36 %) smaller. The owner console's estimate for this pass was 6–8 MB; the artifact is over that estimate by 1.8–3.8 MB. Where the estimate went wrong: every payload is carried as base64, which is 4/3 of its bytes, and the porthole and window layers (2.4 MB encoded) were kept unchanged because the owner praised the window. Nothing was cut for the number.

### Findings from the review of `a4f8b70`, addressed

- **KR-55** — `Visor.tsx` no longer returns nothing under reduced motion: `faceAppearance` is a pure function that, with reduced motion, freezes time, opens the eyes, flattens the pulse and keeps each state's form and colour; a static face is drawn and redrawn only on a change of state. Tested in `test/demo.test.ts` (blocked and passed stay distinct). `PHASE_1_HOW_TO_LOOK_V5.md` carries a dated correction to "both are still with reduced motion".
- **KR-56** — the S2 scope contradiction is recorded in `PHASE_1_STYLISED_SPEC.md` §7.1, and this run record exists.
- **KR-57** — the visor mesh is built by `buildVisorMesh` in `visorFit.ts`, which sets the double-sided material, `frustumCulled = false` and `visible = true`; `test/visor.test.ts` asserts all three on the object it returns, and holds `Visor.tsx` by source to using that builder through `<primitive>` with no JSX mesh, no material of its own, no `.side =`, no `frustumCulled =`, no `visible =` and no `return null`. Honestly stated: the object-level checks are the real test; the source guards close the routes a component has to undo them, and a new route would need a new guard.

### The visor bound

`test/visor.test.ts` keeps `MAX_GAP = 0.015`. Measured worst gaps on the fitted panels: Fabricator 9.6 mm, Prover 8.0 mm, Keeper 12.0 mm; Virgil 8.6 mm in his joint's units, which is 5.1 mm at scale (his panel is fitted in the joint frame at 0.6 m per unit, so the bound is effectively 9 mm for him). The console's prediction that Virgil's head might trip the bound did not come true. The Prover's did, once: a panel top at 1.32 m was lifted 16.5 mm over the helmet's brim ridge; the panel's top was lowered to 1.295 m, under the ridge, and the bound was not touched.

### What was not done

No performance measurement. No look on real graphics hardware. The three characters are unrigged by the owner's note, so the hand-off is one-sided. Generation prompts and times for all nine models are outstanding. The Prover and Keeper model assignments are provisional (`cast.ts`). The Owner Build's `#/s1` spikes are unchanged.
