# OD-0002 — Art-direction checkpoint verdict and Phase 0.5 visual recovery direction

Status: Accepted by the owner in writing on 2026-09-06, after inspecting the Phase 0 spike screenshots on a real GPU-capable device. The owner's message commissioning the Phase 0.5 bounded visual recovery build is the source; this record transcribes the operative decisions. The owner instructed the Phase 0.5 session to create the accepted record; the repository's session tooling (`.claude/settings.json`) denies every write under `docs/decisions/OD-*`, so this file carries the full accepted text at the proposed path and the owner performs the final move to `docs/decisions/OD-0002-art-direction-checkpoint.md`. Phase 0.5 treats this text as binding on the owner's written authority.

## Verdict on the Phase 0 checkpoint (`docs/process/ART_DIRECTION_CHECKPOINT.md`)

The technical rendering pipeline is useful. The graphical execution failed the quality bar: it resembles a sparse developer/debug visualisation built from primitive geometry.

Checkpoint outcome: FAIL on graphical execution, with the pipeline retained. Phase 0 remains open. A bounded art-direction repair (Phase 0.5) is authorised before any Phase 1 work. Phase 1 does not begin on this decision.

## Binding art direction

The following direction overrides conflicting language in the master commission, the Art Bible and the Role Performance Bible. It applies to `docs/art-direction/`, `packages/visual-language/data/` and `apps/mission-control/`.

1. Virgil Mission Control will intentionally use charming, compact, stylised, screen-faced robot astronauts inspired by the warmth, readability, proportions and animation appeal of Bot Crossing (`https://github.com/jarrenrocks/bot-crossing`).
2. The prohibition on "cartoon astronauts" is corrected. It prohibits cheap clip-art, generic stock characters, incoherent asset-store mixtures and low-effort reskins. It does not prohibit charming stylised astro-bots.
3. "Premium" means excellent stylised modelling, proportions, materials, lighting, composition, animation and interaction. It does not mean realistic humanoids or severe science-fiction abstraction.
4. The creative formula is: Bot Crossing character charm + psychedelic cosmic space world + Virgil's evidence-driven operational choreography.
5. Virgil must not merely be a distant abstract observatory figure. Virgil is also a compact, appealing, cartoony screen-faced robot, visibly senior and substantially more elaborately equipped than the workers, occupying a stylised control centre and conducting operations without performing the workers' protected roles.

## Style requirements

Characters: compact, rounded, appealing robot-astronaut proportions; oversized expressive screen faces; small bodies with readable silhouettes; funny, distinctive and useful equipment; charming posture and movement; a cohesive shared character family; role recognition through body shape and equipment, not colour alone; individual face glyphs and operational expressions; polished low-poly or stylised modelling; no realistic human anatomy; no abstract cones used as worker substitutes; no generic glowing spheres presented as finished characters; no emoji faces or copied Bot Crossing faces.

World: psychedelic nebulae and surreal cosmic phenomena; readable, warmly lit foreground structures; tactile workstations, consoles, machinery, cables, gantries and capsules; a convincing sense of place, depth and scale; dark alloy and iridescent ceramic materials with controlled emissive accents; nebula used as atmosphere and reflection source, not distracting wallpaper; UI information integrated into physical consoles and selections where practical; evidence details may use an overlay, but it must not visually dominate the world.

## Character direction

- Fabricator: compact construction astro-bot; broad, sturdy body; articulated construction arms; modular tool backpack; luminous assembly instrument; physically stages modules and operates the commit cradle; funny details such as mismatched specialised manipulators; cyan working accents; cannot review or merge.
- Prover: scanner-oriented astro-bot; rotating sensor ring, antenna array or deployable diagnostic apparatus; expressive circular or scanner-like screen; physically operates test channels and diagnostic equipment; lime working accents; cannot modify the candidate under test.
- Keeper: observant inspection astro-bot; distinctive magnifying lenses, orbiting inspection drones or archival equipment; visibly separate inspection station across a physical gap; calmer movement than Fabricator; pale evidence-light accents; cannot build, open or repair the sealed candidate.
- Virgil: compact senior command astro-bot; especially expressive and memorable screen; multiple communication antennae; orbital navigation instrument; fold-out control vanes; command mantle, rear shell or other unique senior silhouette; surrounded by a dense stylised control centre; calm, deliberate motion; turns toward activity, opens communication routes, presents owner decisions and closes routes when blocked; never builds, tests, independently reviews, adjudicates, merges or deploys; never pretends to perform another role's work.

## Bot Crossing research rules

Study Bot Crossing for proportions and appeal, shared rig plus modular equipment, screen-expression atlas, state-to-animation mapping, locomotion and workstation interaction, animation blending, equipment attachment, instancing or baked animation, navigation, environmental life, camera control, lighting and material economy, and mobile performance. A related family of cute screen-faced space workers is intended; the similarity is not inherently undesirable. Do not clone its exact characters, faces, buildings or world; do not copy code without licence compliance and attribution; do not assume its code licence covers third-party models; verify KayKit or other asset licences from a primary source before importing anything; record asset name, creator, version, source URL, licence, verification date and modifications; if licence verification is blocked, do not import the asset; prefer lawful reuse of verified free/CC0 foundations over rebuilding every generic rig and locomotion clip from nothing.

## Operational truth (unchanged)

The existing event and evidence system remains authoritative: recorded event → validated evidence → authenticated animation selection → bot and workstation choreography → persistent visual state → inspectable evidence. No authenticated work animation may play without its required event and evidence. Ambient life is permitted only when it clearly reads as ambient (blinking, screen-face micro-expressions, breathing or weight shifts, antenna twitches, equipment settling, distant harmless station motion). Idle characters must not mime coding, testing, reviewing, committing or pushing.

## Phase 0.5 authority

Authorised: create, commit and push only to the Phase 0.5 feature branch (harness name `claude/virgil-phase-0-5-visual-recovery-durqrz`, from exact commit 4b834a4); inspect this repository; read-only study of Bot Crossing; follow primary public sources to verify licences; install genuinely necessary free open-source dependencies; use assets only after licence and provenance verification is recorded; continue autonomously through the bounded work packages; multiple checkpoint commits.

Not authorised: modifying `main` or the completed Phase 0 branch; opening a pull request; merging or deploying; accessing private or unrelated repositories; paid assets or services; any asset whose licence is unverified; beginning the full Phase 1 implementation; weakening the event, evidence, authority, replay or epistemic contracts; claiming artistic success without owner inspection; expanding beyond the bounded prototype; replacing working foundational architecture merely to improve appearance.

## Bounded scope

One polished hero Foundry work bay (Fabricator bench, staging cradle and commit mechanism; Prover scanner station; Keeper inspection station across a visible gap; Virgil's control centre overlooking the bay; the four characters; one sealed SHA capsule; one readable transport route; one closed owner airlock; a cohesive psychedelic environment) showing file modification → unstaged modules → staging → commit sealing → verification → evidence-backed handoff → independent Keeper review → non-blocking finding → review pass → safe-to-merge eligibility outside the closed airlock, plus a failed-check variant. Owner merge and deployment are not part of the successful sequence: safe-to-merge is not merged. One bounded Mind knowledge cluster (sealed raw source, compiled durable node, provenance tether, contested interference) with a transition from the Foundry if feasible.

## Quality bar and verdict rules

The prototype does not pass merely because it renders. A real-GPU owner review remains mandatory. The session uses BLOCKED_PENDING_REAL_GPU_REVIEW when environment limitations prevent reliable judgment and NEEDS_ITERATION when the result renders but still reads as placeholder geometry. The session never awards its own final artistic GO.

Applies to: `docs/art-direction/`, `packages/visual-language/data/`, `apps/mission-control/`, `docs/process/ART_DIRECTION_CHECKPOINT.md`, `docs/process/PHASE_1_BRIEF.md` (owner decision 2, character direction, is now decided by this record).

Decided at: 2026-09-06.
