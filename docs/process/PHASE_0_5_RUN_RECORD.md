# Phase 0.5 run record

Session: Claude Code, branch `claude/virgil-phase-0-5-visual-recovery-durqrz` (harness-supplied name; the owner asked for `claude/virgil-phase-0-5-visual-recovery`), repository `dniachini-droid/Virgil-mission-control`. Base commit `4b834a4b496bb07a45bfb8c9ca1f0384b644b1f3` (Phase 0 complete, containing WP6 `34c43a3`). Authority: OD-0002 (owner's written Phase 0.5 commission).

## Commits (all on the feature branch; no PR, no merge, no deploy)

| Package | Commit | Content |
|---|---|---|
| WP0 | 9da3a04 | OD-0002 transcription, asset provenance, plan, narrow art-doc and role-data amendments |
| WP1 | 71b21c0 | Original screen-faced astro-bot family, shared rig, expression atlas, line-up route |
| WP2+WP3 | a94adff | Hero Foundry bay, stations, lanes, event-driven choreography, failed-check variant, fixture evidence |
| WP4 | b2baeb4 | Mind knowledge cluster, gateway continuity, supporting overlay, capture manifest |
| WP5 | (final) | Captures, video, docs, run record |

## External sources and licences

| Source | Licence | Verified | Use |
|---|---|---|---|
| Bot Crossing (`jarrenrocks/bot-crossing` @ 87ec837) | MIT | from the repository `LICENSE` in a read-only shallow clone outside this repository | study only; no code or assets copied |
| KayKit packs (Character Animations 1.1, Space Base Bits, Forest) | stated CC0 by Bot Crossing | NOT verified: `kaylousberg.itch.io`, `kaylousberg.com` and the KayKit GitHub organisation are refused by the session egress policy | not imported |

All shipped characters, equipment, stations, screens, textures and shaders are original and procedural (`docs/art-direction/ASSET_PROVENANCE.md`). No new npm dependencies were added.

## Architectural changes

- Presentation only. `packages/domain`, `packages/gate-engine`, `constitution/`, the event catalogue and the animation grammar are unchanged.
- `packages/test-fixtures`: `check_started` and `candidate_quarantined` events now carry the `event` evidence kind the grammar requires (previously empty or check-run-only, which the grammar refuses). No reducer or gate behaviour changes; all 130+ tests pass.
- `packages/visual-language/data/role-performance.json`: the four core role entries describe the astro-bot family (OD-0002). Schema and tests unchanged.
- `apps/mission-control`: new `characters/` (rig, faces, screen, parts, hook), `world/foundry/` (state, layout, materials, props, fabrication, verification, command, backdrop), `world/mind/cluster.ts`, `spikes/foundry/choreography.ts`, extended `sequence.ts` with the failed variant, `spikes/characters/`, `e2e/snap.ts`, `e2e/record.ts`; canvas shadows; `Effects` gains a greyscale option. The animation-gating chain (event → `animationFor` → step → state → scene) is preserved.

## Checks run

| Check | Result |
|---|---|
| `pnpm check` (biome lint and format, typecheck across 8 targets, unit tests) | clean; tests: agent-contracts 37, domain 30, gate-engine 19, knowledge-graph 21, visual-language 18, mission-control 7 |
| `pnpm --filter @virgil/knowledge-lint run lint` | 10 pages, 28 claims, 94/94 tethers intact, no findings |
| `vite build` | ok (single 1.7 MB chunk; code splitting deferred) |
| Headless captures (`pnpm --filter mission-control capture`) | see `docs/art-direction/phase-0-5/capture-report.json` |
| Video (`e2e/record.ts`) | see below |

## Captures and video

Captures: `docs/art-direction/phase-0-5/*.png` (character line-up idle, work, refuse, greyscale; Foundry success steps 0, 3, 5, 6, 9, 13, 18, 19, 22, 24, 25 and greyscale; failed run steps 16 and 19; reduced-motion mobile and desktop; Mind steps 0, 1, 3, 4, 6, 7, 8, 9 and reduced-motion mobile). Phase 0 baselines stay in `docs/art-direction/spikes/`.

Video: `docs/art-direction/phase-0-5/spike-foundry.webm` (success run auto-stepped at 2.6 s per step, software rendering, laptop tier).

## Comparison with Phase 0

Phase 0 (`spikes/foundry-00-overview.png`): a ring of flat discs with tori seams, one capsule-and-cylinders worker, labels doing the work. Phase 0.5 (`phase-0-5/foundry-00-bay-overview.png`): a bay with a bench, cradle and press in the foreground, a scanner gantry, a separated Keeper platform, a raised control centre and closed airlock, four distinct characters at their stations, a hull and gantry behind. The same events drive both; every animation in Phase 0.5 still requires its recorded event and evidence.

## Known visual shortcomings

- Software rendering: bloom, shadow softness, iridescence and frame rate in captures are not representative.
- Characters are appealing at line-up distance; at the wide overview they are small. A follow camera per character is not implemented.
- Push transit has no physical beacon pair; the press readout and overlay carry that evidence.
- The Foundry-to-Mind crossing is two thresholds and a link, not one continuous camera move.
- Surfaces are flat-shaded procedural forms; no baked ambient occlusion or texture detail beyond the deck plating.
- Some identity plates are still text (station names, criteria ids, SHA plate); the operational sequence is readable without them, the identities are not.

## Performance limitations

Not measured on representative devices. Draw calls are dominated by many small meshes (roughly 700 objects in the bay); the character parts share cached geometry but are not instanced. Shadows use one 2048 map. Software captures take 2 to 5 s per frame in this container.

## Verdict

BLOCKED_PENDING_REAL_GPU_REVIEW. The prototype renders in every required mode with the operational sequence driven by recorded events, and it is a substantial change from the Phase 0 spikes, but the container cannot judge the quality bar. The session does not award an artistic GO.

## One recommended next action

Open `/spike/foundry`, `/spike/foundry?run=failed`, `/spike/characters?mono=1` and `/spike/mind` on a GPU machine (`pnpm --filter mission-control dev`), then record the checkpoint re-check verdict (PASS WITH DIRECTION or NEEDS_ITERATION) and move the OD-0002 text into `docs/decisions/`.
