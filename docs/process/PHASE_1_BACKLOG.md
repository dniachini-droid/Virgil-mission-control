# Backlog

The owner asked for one place that lists what is not done. This is it. It is a list, not a decision: nothing here is resolved by being written down, and nothing here is authorised by being written down. Items are grouped as the owner console grouped them, and each carries one of three statuses — **open** (a session could take it under an ordinary grant), **needs owner** (it cannot start without an owner decision or an owner action), **blocked** (it waits on something other than the owner).

Where this file sits: the owner console asked for `docs/process/BACKLOG.md`. The Phase 1 grant (`PHASE_1_BRIEF.md`, "Permitted and protected areas") permits `docs/process/PHASE_1_*` and no other name in `docs/process/`, so the session that wrote this filed it under the permitted name rather than crossing the boundary. Moving it is one `git mv` by whoever holds the grant for that path.

Dates below are 2026-09-07 unless stated.

## System rigour

### Agent evals — open

No way currently exists to know whether a Keeper review is *good*, only that it happened. `packages/test-fixtures/` already contains defective candidates (`packages/test-fixtures/src/candidates.ts`); feed them to the reviewer roles and score whether the planted defects are found. Highest-value open item in this group.

### Structured reports instead of prose — open

Every agent handoff to date was English that a human read carefully. `packages/agent-contracts/` exists for exactly this — every role definition says its result is an `agent-result` record with a payload validated against a schema in `schemas/` — and no handoff has yet been one. Named as the principal Phase 3 blocker.

### Record real runs as events — open

The event-sourced domain in `packages/domain/` recorded **zero events** for the four build passes and two reviews of 2026-09-07. The irony is stated plainly: the repository's own model of what a governed build looks like was not used to record its own governed builds. Every run of that day exists only as commits, prose documents and the owner console's transcript.

### Cost and token visibility — open

One pass on 2026-09-07 consumed roughly 454,000 subagent tokens. No mechanism reports this, sums it, or puts it next to what the pass produced.

## Leanness

### CI — needs owner

The repository runs no automated checks at all: nothing runs on push, and every check that has ever been reported was run by hand inside a session. It should run `pnpm check`, `build:owner`, `verify:owner` and the byte-for-byte reproducibility rebuild on every push. Closes **KR-50**. Needs the owner because it requires the root `turbo.json` and `biome.json`, and the repository root is outside every session's grant.

### A generated index with a freshness test — open

Route "I need to do X" to "read Y". Generated, and freshness-tested the way the seed graph is (`pnpm --filter @virgil/knowledge-graph export-seed-graph`; a test fails when it is stale), so it cannot drift. A hand-written one already would be stale; two live examples, checked when this file was written:

- `docs/art-direction/approved/README.md` still cites OD-0002 at `docs/decisions/proposed/OD-0002-art-direction-checkpoint.md`; the record has been at `docs/decisions/OD-0002-art-direction-checkpoint.md` since the owner accepted it.
- `docs/architecture/ENFORCEMENT_BOUNDARIES.md` still says "the six filed decision records"; there are eight (`OD-0001` to `OD-0008`).

### Governing facts as data, prose to explain only — open

`constitution/authority.json` proves the pattern: the permission matrix is data, and a test holds the role definitions to it. By contrast the Phase 1 permitted paths live as one line of prose in `PHASE_1_BRIEF.md`, and on 2026-09-07 a coordinator paraphrased that line wrongly in a brief — an error caught only because the worker read the original. That is the motivating example. Facts that govern a session's boundary should be data that a check can read; prose should explain them.

### Fold or delete stale documents rather than annotating them — open

The habit so far has been to leave a superseded document standing and add a note beside it. The result is more to read and less that is true. Prefer folding what is still true into the current document and deleting the rest, with the history left to git. (Records the owner has accepted, and run records that stand as evidence of what a session found, are not stale documents and are not in this item.)

## Open review findings

Where the finding records are: only **KR-01 to KR-10** appear in any file in this repository (`docs/architecture/ENFORCEMENT_BOUNDARIES.md`, `docs/decisions/OD-0004-non-blocking-findings-disposition.md`). The findings from KR-26 onward were reported to this session by the owner console and are listed here as reported; no file in the repository holds their text, which is itself an instance of the "record real runs as events" and "structured reports" items above.

- **KR-03, KR-06, KR-07, KR-09** — open. Phase 0 findings, accepted open under `docs/decisions/OD-0004-non-blocking-findings-disposition.md`, carried as Phase 1 entries; KR-03 and KR-07 are the first two in `PHASE_1_BRIEF.md`.
- **KR-26, KR-27, KR-40 to KR-47** — open. Carried into stage S0.
- **KR-48 to KR-54** — open. From the S1 review of `1e05d47`. KR-50 (no CI) is the "CI" item above and needs the owner.
- **Review of `6503c8b`** — blocked. In flight; its findings will number from KR-55.
- **KR-41, the character form gate** — open. It is a name and not a check: nothing runs, nothing fails, nothing records a result.

## Product direction — the owner's directions of 2026-09-07

Recorded as direction the owner gave, not as decisions. None of it is a decision record and none of it carries authority layer 1. Each item's status says what it would take to start.

- **Mobile-first UI** — needs owner. Character portraits rather than figures, tap to expand a panel, and "Virgil needs you" notifications. The owner stated they would use a phone more often than a desktop. A change of this size to the interface is an art-direction change and needs the checkpoint decision the brief requires.
- **A star map of repositories** — blocked. Driven by real session scope, **never a hand-written list**, distinguishing read from write. Blocked on real session scope existing as data (Phase 3), and on Phase 1's non-goal of real repositories.
- **A hologram console** — blocked. Read-only over real repository records first; typing into it depends on Phase 3. Blocked on real repository records being in the product, which Phase 1 excludes.
- **Per-agent panels rendering actual contract objects** — blocked on "structured reports instead of prose" above: there are no contract objects to render until handoffs produce them.
- **Spawn-in/out with a hand-off animation** — open. Constraint from the owner: **anything that spawns out must leave its evidence behind.**
- **Independence reading spatially** — open. Reviewers opposite Virgil, not alongside him.
- **Mind of Virgil** — open. Authority as orbital radius, tethers running inward, and a broken tether visible from across the room.
- **Set dressing** — open. Instanced from one wall panel, one plant, one shelf; skip the monorail.
- **Remaining characters** — needs owner. Cartographer, Architect and Arbiter as individuals, then the seven conditional specialists as one badged family. Needs the owner because the models come from the owner (`assets/licenses/ASSET_PROVENANCE.md`, `docs/decisions/OD-0008-meshy-licence-attestation.md`).
- **A refusal/blocked animation clip** — needs owner. The owner said they would supply it (`PHASE_1_HOW_TO_LOOK_V3.md`, "Owner direction, recorded", item 4); until then a blocked state is expressed through face, light and colour.
- **Mobile performance levers** — open. 512² textures, a faked floor reflection, quarter-resolution bloom, characters loaded on demand. None is measured; `docs/decisions/OD-0005-phase-1-visual-checks-and-reference.md` requires performance recorded as unmeasured until it is measured on real hardware.

## Waiting on the owner

- **Root-config permission** — needs owner. Blocks CI (above).
- **Whether `CLAUDE.md`'s "No paid services, subscriptions or commercial assets" binds sessions rather than the owner** — needs owner. The owner generates models with a paid Meshy subscription (`docs/decisions/OD-0008-meshy-licence-attestation.md`); the line has been read as binding sessions, and only the owner can say so.
- **The Meshy prompts and generation times** still outstanding in the provenance rows of `assets/licenses/ASSET_PROVENANCE.md` — needs owner. OD-0008 requires them for every Meshy row.
- **Meshy's terms text** — needs owner. Once read and filed as `assets/licenses/MESHY-TERMS.txt`, it retires OD-0008's attestation by the two steps that record sets out.
