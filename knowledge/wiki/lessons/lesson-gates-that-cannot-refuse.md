---
nodeId: lesson-gates-that-cannot-refuse
kind: lesson
title: "A check nobody has watched fail is not a check"
epistemicClass: durable_compiled_knowledge
authorityClass: compiled
status: current
scope: general
tags: [verification]
governs:
  - packages/gate-engine/test/refusals.test.ts
compiledAt: 2026-09-13T11:05:00+00:00
lastVerifiedAt: 2026-09-13T11:05:00+00:00
compiledBy: knowledge-lessons-session
sources:
  - { kind: code_path, ref: packages/gate-engine/src/gates.ts }
  - { kind: code_path, ref: docs/architecture/ENFORCEMENT_BOUNDARIES.md }
  - { kind: code_path, ref: docs/process/FOUNDATION_REPAIR_RUN_RECORD.md }
  - { kind: code_path, ref: docs/process/GATE_PROOF_AND_FINDINGS_BRIEF.md }
claims:
  - id: C-lesson-refusal-unobserved
    statement: "A suite that only asserts a healthy candidate passes cannot distinguish a check that works from a check that cannot fire; both directions must be exercised."
    sources: [docs/process/GATE_PROOF_AND_FINDINGS_BRIEF.md, docs/process/FOUNDATION_REPAIR_RUN_RECORD.md]
  - id: C-lesson-refusal-fixtures-only
    statement: "Where fixtures are the only thing feeding an engine, a check no fixture refuses has never executed its refusal path anywhere, not merely gone untested."
    sources: [docs/architecture/ENFORCEMENT_BOUNDARIES.md, packages/gate-engine/src/gates.ts]
  - id: C-lesson-refusal-reason-read
    statement: "A refusal case must assert the reason as well as the outcome: a check refusing for an unrelated cause satisfies a bare failure assertion and proves nothing about the path the case aims at."
    sources: [packages/gate-engine/src/gates.ts, docs/process/FOUNDATION_REPAIR_RUN_RECORD.md]
  - id: C-lesson-refusal-coverage-enforced
    statement: "Coverage of the refusal direction is enforced from the list of checks rather than remembered, so a new check with no refusal case fails on the commit that adds it."
    sources: [docs/process/GATE_PROOF_AND_FINDINGS_BRIEF.md, packages/gate-engine/src/gates.ts]
related: [governance-overview, agent-roster]
supersedes: []
supersededBy: null
---

# A check nobody has watched fail is not a check

Twenty gates existed in `packages/gate-engine` and eight of them had never been
observed refusing anything. One test asserted that a harmless candidate raised
no objection on any gate. Nothing asserted the other direction. For those eight,
a green suite could not tell a gate that works from a gate that cannot fire —
and one of them, `merge_authority`, had its only case buried inside a test about
something else, where deleting it would have gone unremarked.

## Why the second direction is the one that matters

The first direction — *this passes and should* — fails loudly when you break it,
because everything goes red at once. The second — *this is refused and should be*
— fails silently, because a check that can never say no looks exactly like a
check that has nothing to object to. Every dead check found in this repository
was found the same way: remove the guard by hand, rebuild, and see whether
anything goes red. That ritual belongs in the suite, from a written list, so it
happens every time instead of when somebody remembers.

## The sharper version, for a system with no real inputs yet

`docs/architecture/ENFORCEMENT_BOUNDARIES.md` records that this engine *"has no
evidence until Phase 2 adapters exist; today only fixtures feed it."* While that
is true, a fixture is the only thing that ever exercises a gate. So a gate no
fixture refuses has not merely gone untested — **its refusal path has never
executed at all**, not in continuous integration, not in a session, not
anywhere. The distinction is the difference between an untested branch and an
unreached one, and it applies to any young system whose only inputs are its own
test data.

## Three things that make the second direction real

**Spoil one field against a healthy candidate.** A refusal case built from an
empty object mostly proves the check reports missing evidence, which is a
different answer. One spoiled field against an otherwise clean candidate is what
a real refusal looks like.

**Read the reason, not just the outcome.** A check that refused for an unrelated
cause satisfies a bare assertion that it refused, and proves nothing about the
path the case is aiming at. That is exactly how a case came to exist that could
be deleted without anyone noticing.

**Enforce the coverage from the list of checks.** A new check with no refusal
case must fail by name on the commit that adds it, rather than being noticed by
a reader months later — which is precisely how eight of them accumulated.

## What this does not license

Making a check able to refuse is not evidence that the thing it guards is sound.
The gates here have still only ever judged candidates that do not exist. See
[[governance-overview]] for what a gate is and is not allowed to decide, and
`docs/process/FINDINGS.md` for what is open.
