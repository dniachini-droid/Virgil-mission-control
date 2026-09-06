# Operational animation art direction

Amendment 1 deliverables 1, 2 and 4. Data: `packages/visual-language/data/animation-grammar.json` (74 mappings, 6 ambient entries) validated against `schemas/operational-animation-grammar.schema.json`. Tests: `packages/visual-language/test/contracts.test.ts`.

## Foundational rule

Virgil makes authenticated work visible. Every consequential animation corresponds to a typed event carrying the evidence kinds its mapping requires. `animationFor(event)` in `packages/visual-language` is the only way the world obtains an authenticated animation; it returns a refusal when the event type has no mapping, when a required evidence kind is missing, or when a telemetry signal is offered instead of an event. Ambient life needs no event, claims no work and is visibly quieter.

## Four layers

| Layer | Events | Character |
|---|---|---|
| Tool activity | file_read, repository_searched, file_created, file_modified, file_moved, file_deleted, command_started, command_completed, command_failed | Local, small, close to the worker; never sealed |
| Git manufacturing | branch_created, worktree_created, changes_staged, candidate_committed, push_started, candidate_pushed, push_failed, remote_artifact_mismatch, pr_opened, repair_completed, candidate_changed_after_review | The capsule lifecycle; each step distinct from the next |
| Governance and review | idea, scope, plan, work order, authority, assignment, agent start and wait, handoffs, verification and checks, review and findings, quarantine, adjudication, repair, eligibility, owner decisions, merge, deployment | Authority and evidence; the airlock only moves for the owner |
| Knowledge | gateway deposit, source arrival and hashing, non-destructive reading, compilation proposal, tethers, support, contest, supersession, approval, page creation and update, gaps, scan, outputs | The Mind; nothing becomes durable without approval or verification |
| Ambient | nebula drift, station breath, distant transports, idle posture, galaxy parallax, archive dust | Never attached to instruments, artifacts, tethers or gates |

## Each mapping defines

Triggering event, required evidence kinds, actor role, source and destination, entity, state before, transitional state, state after, full motion (description, duration, camera hint), persistent visual, reduced-motion equivalent, mobile and low-performance equivalent, failure and interruption behaviour, replay behaviour, Evidence View destination, optional sound or haptic motif, and the mappings it must never resemble.

## Distinctions enforced

- Reading (inspection beam, cross-section in place) never resembles editing (diff plane, audit stream).
- Search scope is visible: one file, one directory and the repository sweep differently.
- Unstaged modules hover; staging converges into a cradle and repels out-of-boundary files; a commit compresses into a sealed capsule with an ignited short SHA; none of these implies verification.
- Push started shows unequal beacons; push confirmed phase-locks them only from remote evidence; mismatch splits into parallax.
- A PR ring is not a verification band, an inspection ring or an eligibility key.
- Each check has its own arc; skipped is an unpowered labelled arc; failed is a broken arc with a tether; passed is a closed band; the signature covers completed checks only.
- Review resolves the ring; blocked is a rigid lattice; insufficient evidence is an open frame; the geometry differs, not only the colour.
- Eligibility assembles a key outside the airlock; only merged_by_owner with an owner decision moves the interlocks; deployment started, failed and succeeded are separate states.
- A changed SHA breaks the seal visibly and leaves the owner-gate route.
- Handoffs travel through named corridors; authority tokens travel on their own lanes only when a grant event exists; an unsealed cradle cannot transit; an interrupted corridor freezes at the last proven position.

## Modes

Reduced motion: fades, path illumination, before/after poses, static evidence marks, limited camera. Mobile: fewer actors, shorter routes, simplified particles, one chain segment at a time, tap-to-follow, compact Evidence View. Low-performance tiers reduce particles, volumetrics, reflections and shadows, background traffic, geometry detail and post-processing in that order and never remove role identity, evidence marks, state geometry, SHA identity, authority tokens, tethers, blocked-versus-passed distinctions or owner-gate meaning. Replay restores persistent visuals from recorded events and never fabricates a transition.

## Sound and haptics

Optional reinforcements only: magnetic convergence (staging), deep seal (commit), rising resonance (push), phase-lock (remote equality), scanner harmonics (checks), muted fracture (failure), containment pulse (quarantine), singular owner-airlock tone (merge), distinct gateway sound (Foundry to Mind). All non-essential sound can be muted; no meaning is carried by sound alone.
