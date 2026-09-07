# OD-0005 — The new reference image, and the graphics-hardware checks in Phase 1 (Tier 3)

Status: **Accepted.** Issued by the owner in writing on 2026-09-07, in reply to a session's report of a new reference image and of a contradiction between the Phase 1 acceptance criteria and the hard limits in `CLAUDE.md`. The owner's words are the source; this file transcribes them and decides nothing itself. The owner accepted it on 2026-09-07 by instruction in the owner console, and this session filed it here on that instruction under the mechanism recorded in `OD-0006-recording-owner-decisions.md`, which holds the owner's verbatim words. It carries authority (layer 1) from that acceptance. Only this status line changed on filing; the decision text is unaltered.

## Question

Two questions, both put to the owner because a session may not settle either.

1. **The reference image.** The owner supplied a new high-quality reference image and was asked whether it replaces the approved art direction recorded in `docs/decisions/proposed/OD-0002-art-direction-checkpoint.md`.

2. **The graphics-hardware checks.** The Phase 1 acceptance criteria require desktop and mobile performance targets "met on representative devices" and visual regression baselines produced "on a GPU runner", and the stop conditions include "visual regression baselines unobtainable on a GPU runner". The session containers have no GPU, and `CLAUDE.md` forbids paid services, subscriptions and commercial assets outright — the ordinary way to obtain a GPU runner. An authority document and a process document therefore contradict each other. Under `CLAUDE.md` a session reports such a contradiction and does not resolve it silently, so it was reported.

## Decision

**One — the new reference image does not replace the approved art direction.** It is an example of the quality bar the owner is aiming for, and it carries no authority. The binding reference remains `docs/art-direction/approved/visual-canon/03-approved-hybrid.png` under OD-0002.

The image is **not imported into the repository.** Its origin and its licence are unrecorded, and `assets/licenses/ASSET_PROVENANCE.md` requires both before any file is imported under `assets/` or `docs/art-direction/approved/`. The owner may import it later, with a provenance record that satisfies that register.

So that the image can be identified later, its SHA-256 is recorded here:

```
cb0db97eae356b6beee9691d5bdb24ac401f21bce5cec701ad166a199c82192b
```

This hash matches no file currently in the repository. That is the intended state: recording the hash is not an import.

**Two — Phase 1 proceeds with the two graphics-hardware checks formally deferred and recorded as not performed.** The owner considered and rejected both alternatives: lifting the no-paid-services rule to buy a GPU runner, and rewriting the acceptance criteria to ask for less. The criteria stand as written and remain unmet, honestly recorded as unmet.

- Visual judgement in Phase 1 is the owner's own, made on the owner's own machine. No session substitutes its own judgement for it, and no automated visual baseline stands in for it.
- Performance stays unmeasured. It must be recorded as unmeasured, never as met. "No failure observed" is not a measurement and is not evidence that a target was met.
- The stop condition "visual regression baselines unobtainable on a GPU runner" is disapplied for that stated reason only — the absence of GPU hardware within the no-paid-services limit. It continues to apply to every other cause.

## Consequences

- The new reference image is not present in the repository and is not a binding reference. `03-approved-hybrid.png` remains the binding target under OD-0002, and the character direction under that record is unchanged. If the owner later imports the image, that import needs its own provenance record and does not by itself change the binding reference.
- Phase 1 may start (once the owner has moved the proposed decisions) without a GPU runner and without device performance measurements, but not without saying so. The Phase 1 run record and any Phase 1 report must state that the representative-device performance targets and the GPU visual regression baselines were not performed, and why.
- No session may report a deferred check as passed, skipped-because-irrelevant, or met. The deferral is recorded against the criteria themselves in `docs/process/PHASE_1_BRIEF.md`, and no other acceptance criterion or stop condition is weakened by it.
- The contradiction between the criteria and the hard limits is resolved by this decision alone. It is not resolved by editing `CLAUDE.md`, `constitution/`, or the criteria, and no session may do so on the strength of this transcription.
- Nothing here is ratified by its transcription. Phase 1 does not begin until the owner moves OD-0002, OD-0003, OD-0004 and this record from `docs/decisions/proposed/` into `docs/decisions/`.

Applies to: `docs/process/PHASE_1_BRIEF.md`, `docs/art-direction/approved/`, `assets/licenses/ASSET_PROVENANCE.md`, and the Phase 1 run record when it exists.

Decided at: 2026-09-07 (owner's written instruction). Transcribed by the post-merge record session on the same date.
