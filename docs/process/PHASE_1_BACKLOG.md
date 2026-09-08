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

Partly answered in prose on 2026-09-08, not in events: `docs/process/PHASE_1_RUN_RECORD.md` now lists every viewing point with its source commit, artifact and digest, and the V6 pass's checks with their printed results; and `docs/process/PHASE_1_STYLISED_SPEC.md` wrote the owner's V6 direction down before anything was built, which is the first time a pass's direction has existed outside the console transcript. Still no event is recorded for any run.

### Cost and token visibility — open

One pass on 2026-09-07 consumed roughly 454,000 subagent tokens. No mechanism reports this, sums it, or puts it next to what the pass produced.

## Leanness

### CI — done, 2026-09-08

`.github/workflows/checks.yml` runs on push to any branch and on pull requests: `pnpm install --frozen-lockfile`, the Chromium the lockfile pins, `pnpm check`, the Mind Scan, `build:owner`, `verify:owner`, `sha256sum -c` over every committed Owner Build digest, and the byte-for-byte reproducibility rebuild of the newest committed artifact. Unblocked by the owner granting the repository root in the owner console on 2026-09-08 — "You may edit the root config files."

The part that matters is not the workflow file. `verify:owner` is now a turbo task depending on `build:owner`, both `cache: false`, and the root `check` script runs it, so `pnpm check` no longer passes without the Owner Build being built and opened from `file://`. `apps/mission-control/test/required-checks.test.ts` fails if that wiring is removed, if a step is dropped from the workflow, if the workflow file is deleted, or if a `continue-on-error` appears in it. `pnpm check` went from about 21s to about 75s as a result; that is the whole cost.

Where the boundary was drawn, and why: `verify:owner` is inside `pnpm check` because it takes 49s and needs only a browser. The reproducibility rebuild is a separate CI job and a root `pnpm reproduce:owner` script, not part of `pnpm check`, because it needs full git history and a second `pnpm install` in a detached worktree — putting that in the command every session runs would be the kind of cost that gets a check skipped.

It has run twice: green on `dd2c48f`, and red on a scratch branch carrying one external `fetch()` — which failed at `pnpm check`, on a runner with real egress where the request succeeds and only the off-document-request check can catch it. Both runs, and the reasoning that identifies the failing sub-step, are in `docs/process/PHASE_1_RUN_RECORD.md`, "Continuous integration — the pass of 2026-09-08". Recorded in full, including what it does **not** establish, in `docs/architecture/ENFORCEMENT_BOUNDARIES.md`, "Continuous integration: which checks now run without a human choosing to". One thing to know before trusting a green run: CI runs the Chromium the lockfile pins (153) and this container substitutes a preinstalled 141, so a local pass and a CI pass are not passes on the same browser. Every run now prints which browser it used.

### A generated index with a freshness test — open

Route "I need to do X" to "read Y". Generated, and freshness-tested the way the seed graph is (`pnpm --filter @virgil/knowledge-graph export-seed-graph`; a test fails when it is stale), so it cannot drift. A hand-written one already would be stale; two live examples, checked when this file was written:

- `docs/art-direction/approved/README.md` still cites OD-0002 at `docs/decisions/proposed/OD-0002-art-direction-checkpoint.md`; the record has been at `docs/decisions/OD-0002-art-direction-checkpoint.md` since the owner accepted it.
- `docs/architecture/ENFORCEMENT_BOUNDARIES.md` still says "the six filed decision records"; there are eight (`OD-0001` to `OD-0008`).

### Governing facts as data, prose to explain only — open

`constitution/authority.json` proves the pattern: the permission matrix is data, and a test holds the role definitions to it. By contrast the Phase 1 permitted paths live as one line of prose in `PHASE_1_BRIEF.md`, and on 2026-09-07 a coordinator paraphrased that line wrongly in a brief — an error caught only because the worker read the original. That is the motivating example. Facts that govern a session's boundary should be data that a check can read; prose should explain them.

### Fold or delete stale documents rather than annotating them — open

The habit so far has been to leave a superseded document standing and add a note beside it. The result is more to read and less that is true. Prefer folding what is still true into the current document and deleting the rest, with the history left to git. (Records the owner has accepted, and run records that stand as evidence of what a session found, are not stale documents and are not in this item.)

## Open review findings

Where the finding records are: **KR-01 to KR-10** appear in `docs/architecture/ENFORCEMENT_BOUNDARIES.md` and `docs/decisions/OD-0004-non-blocking-findings-disposition.md`, and since 2026-09-08 **KR-50, KR-58 and KR-59** are described in that same document's continuous-integration section. Everything else from KR-26 onward was reported to a session by the owner console and is listed here as reported; no file in the repository holds its text, which is itself an instance of the "record real runs as events" and "structured reports" items above.

- **KR-03, KR-06, KR-07, KR-09** — open. Phase 0 findings, accepted open under `docs/decisions/OD-0004-non-blocking-findings-disposition.md`, carried as Phase 1 entries; KR-03 and KR-07 are the first two in `PHASE_1_BRIEF.md`.
- **KR-26, KR-27, KR-40 to KR-47** — open. Carried into stage S0.
- **KR-48 to KR-54** — open, except KR-50. From the S1 review of `1e05d47`. **KR-50 (no CI) is addressed** by `.github/workflows/checks.yml` and the wiring test `apps/mission-control/test/required-checks.test.ts` (the "CI" item above). Not closed — that is a reviewer's to say.
- **KR-58** — **caught, not repaired.** `apps/mission-control/owner-build/inline.mjs` scans for external references before it reinserts the CSS and before it pastes the bundle, so it inspects only the bare shell; a remote `url()` in the stylesheet and a `fetch()` to an external host in a component both survive it and both survive the entire test suite. That blind spot is untouched. What changed is that `verify:owner` catches that class of defect and now runs on every push and inside `pnpm check`, so it can no longer be skipped. Both were demonstrated failing on 2026-09-08. The distinction is the point: a required check catches the escape; the guard that should have caught it still does not. Repairing `inline.mjs` to scan the finished document is open work.
- **KR-59** — **addressed.** `build:owner` and `verify:owner` are reachable from a required check, not only from a workflow file: `pnpm check` runs `verify:owner` through the turbo graph, and a test fails if that stops being true.
- **Review of `6503c8b`** — blocked. In flight; its findings will number from KR-55.
- **KR-55, KR-56, KR-57** — from the review of `a4f8b70` (V5), all medium; **addressed by the V6 pass** (`docs/process/PHASE_1_RUN_RECORD.md`, "Findings from the review of `a4f8b70`, addressed"): a static face under reduced motion with a test and a correction to the V5 owner document; the S2 scope contradiction recorded in `PHASE_1_STYLISED_SPEC.md` §7.1 and a run record opened; the visor mesh built by one tested builder with source guards on the component. Not closed — that is the reviewer's to say.
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

- **Delete the scratch branch `claude/ci-failure-demo`** — needs owner. One commit on top of `dd2c48f` carrying a deliberate external `fetch()`, pushed on 2026-09-08 to prove CI fails on a network escape (it did). The session cannot remove it: `git push origin --delete` returns 403 and the REST ref deletion is refused by the proxy. One `git push origin --delete claude/ci-failure-demo` from a machine that can. Nothing from it is merged.
- **Root-config permission** — **granted 2026-09-08**, by the owner in the owner console: "You may edit the root config files." `turbo.json`, the root `package.json` and `biome.json` are in scope, and `.github/` may be created. Nothing else moved: `constitution/**`, `docs/product/VIRGIL_MASTER_COMMISSION.md`, `knowledge/raw/**` and `schemas/gate-*` remain out of bounds. This unblocked the CI item above.
- **Whether `CLAUDE.md`'s "No paid services, subscriptions or commercial assets" binds sessions rather than the owner** — needs owner. The owner generates models with a paid Meshy subscription (`docs/decisions/OD-0008-meshy-licence-attestation.md`); the line has been read as binding sessions, and only the owner can say so.
- **The Meshy prompts and generation times** still outstanding in the provenance rows of `assets/licenses/ASSET_PROVENANCE.md` — needs owner. OD-0008 requires them for every Meshy row.
- **Meshy's terms text** — needs owner. Once read and filed as `assets/licenses/MESHY-TERMS.txt`, it retires OD-0008's attestation by the two steps that record sets out.
