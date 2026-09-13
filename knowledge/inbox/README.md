# The inbox — a way in that does not stop the work

**A session that learns something writes one small file here and keeps going.**

That is the whole point. Knowledge only ever entered this wiki when somebody sat
down and wrote a page, and during a build nobody does — so it went into a
comment instead, which is why the comments became essays. `refusals.test.ts` was
327 lines with a quarter of it prose, valuable and invisible to anyone not
already reading that file.

Writing a capture takes a minute. Writing a page does not, and the minute is why
one happens and the other does not.

## A capture is not a wiki page and must not be read as one

It is raw material: one session's observation, unreviewed, uncompiled, tethered
to nothing. It sits here until a later pass turns it into a lesson under
`knowledge/wiki/lessons/`, or decides it should not be one.

Nothing here is authority. Nothing here is cited. `knowledge/SCHEMA.md` governs
what a lesson must carry before it becomes one; a capture carries far less on
purpose.

**This is not `knowledge/raw/`.** Raw sources are owner-curated, sealed and
immutable. Captures are working notes, and a capture that has been ingested may
be deleted once the lesson carries what it said.

## The shape

`knowledge/inbox/<captureId>.capture.md`:

```yaml
---
captureId: cap-2026-09-13-gates-that-cannot-refuse
title: A gate no fixture refuses has never run its refusal path
observedAt: 2026-09-13T09:20:00+00:00
observedBy: knowledge-lessons-session
evidence:
  - packages/gate-engine/test/refusals.test.ts
  - docs/architecture/ENFORCEMENT_BOUNDARIES.md
destination: lesson-gates-that-cannot-refuse
state: open
---

Two or three sentences. What was observed, and why the next session would want
to know it.
```

Every field is checked by `scanLessons`
(`packages/knowledge-graph/src/lessons.ts`) and a capture missing one is a
blocking finding. Small is not the same as vague: a capture with no evidence is
a note about a feeling.

- **`evidence`** — at least one path, command or output. Where somebody else
  looks to see the same thing.
- **`destination`** — the lesson this probably belongs to. **It may name a page
  that does not exist yet**; that is normal and is the point of guessing.
- **`state`** — `open` until a pass compiles it, then `ingested`. An `ingested`
  capture must name a lesson page that exists, or the check fails.

## Ingesting

Follow `.claude/skills/knowledge-maintenance`'s **compile** operation and
`knowledge/SCHEMA.md`. In short: write or extend the lesson page, tie it to the
files it governs and them to it, add it to `knowledge/index.md`, append to
`knowledge/log.md`, then set the capture's `state` to `ingested`.

**The honest cost, stated rather than discovered:** captures accumulate unless
somebody ingests them. That is a habit, not a line of code, and habits are what
this kind of system lives or dies on. The check can tell you a capture is
malformed. It cannot tell you nobody has read it.
