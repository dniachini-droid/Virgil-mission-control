---
captureId: cap-2026-09-13-gates-that-cannot-refuse
title: A gate no fixture has refused has never run its refusal path at all
observedAt: 2026-09-13T09:20:00+00:00
observedBy: knowledge-lessons-session
evidence:
  - packages/gate-engine/test/refusals.test.ts
  - packages/gate-engine/src/gates.ts
  - docs/architecture/ENFORCEMENT_BOUNDARIES.md
  - docs/process/FOUNDATION_REPAIR_RUN_RECORD.md
destination: lesson-gates-that-cannot-refuse
state: ingested
ingestedAt: 2026-09-13T11:05:00+00:00
ingestedInto: lesson-gates-that-cannot-refuse
---

Found while reading `refusals.test.ts` for the conversion proof, not while
looking for it. The file's header carries thirty lines of prose explaining that
twenty gates existed, eight had never been observed refusing anything, and a
suite asserting only that a healthy candidate passes cannot tell a working gate
from one that cannot fire. That reasoning generalises to any check anywhere and
it was legible only to somebody already inside that file.

The sharpest part is the bit that is specific to a young system: where nothing
but fixtures feeds an engine, a gate no fixture refuses has not merely gone
untested — its refusal path has never executed, in CI or anywhere else.

Ingested into `lesson-gates-that-cannot-refuse` in the same pass, which is the
proof the brief asked for rather than the habit it describes. Normally a capture
waits.
