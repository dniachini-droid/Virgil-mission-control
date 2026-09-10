# The preservation contract and the seed graph cannot both hold

**Status: reported, and closed by the owner on 2026-09-10 — `docs/decisions/OD-0010-v10-retired-as-a-viewing-point.md`. He chose none of the three options below, on the ground that the contract was protecting something he no longer needs: *"V10 is retired as a viewing point. Its byte count is no longer a contract."* The report is left exactly as written, because it is the evidence the decision was made on.**

**Originally: reported, not resolved.** `CLAUDE.md`, *Authority order*: "A session that finds a contradiction reports it; it does not resolve it silently." This is the report. Nothing here changes a rule, and the owner's decision is what closes it.

## The two rules

1. **The preservation contract** (`docs/process/V11_BRIEF.md`): V10's Owner Build, built from a clean tree, is **exactly 8,528,318 bytes**. V11 is additive and may not move it by a byte. This has caught four unintended leaks — 96 bytes, 2, 2, and 914 — and it is the strongest evidence in the project that V10 is untouched.

2. **Seed-graph freshness** (`packages/knowledge-graph`, `test/seed-graph.test.ts`): the committed `packages/test-fixtures/knowledge/seed-graph.json` must match a fresh derivation from this repository's files, byte for byte. A stale one fails the suite.

## Why they collide

`apps/mission-control/src/spikes/mind/MindScene.tsx` imports that seed graph as data, and V10's Owner Build compiles the Mind spike (it is reachable at `#/spike/mind`, kept so that viewing point V0 stays reproducible).

The seed graph is **derived from the repository's documents**. So:

> Filing an owner decision record changes the seed graph, which changes V10's Owner Build.

That is not a hypothesis. On 2026-09-10 the graph was regenerated after failing the freshness test, and the regeneration added exactly one node:

```
"id": "docs/decisions/OD-0009-netlify-and-phase-2-authorisation.md",
"nodeType": "owner_decision",
"epistemicClass": "owner_approved_decision",
```

V10 measured **8,528,591** bytes from a clean tree afterwards, against the contract's 8,528,318 — **273 bytes**, and every one of them is the owner's own decision record being recorded in the knowledge graph.

## What is not the cause, because it was found first and is fixed

The same measurement was initially **914 bytes** over. That part was a real defect and mine: Phase 2 slice two's `SessionStatusReport` schema was added to `packages/agent-contracts/src/index.ts`, and V10 imports that package, so the barrel carried a schema V10 never uses into V10's bundle. The schema is now imported directly by `scripts/export-schemas.ts` and is not in the barrel; `schemas/session-status-report.schema.json` is exported exactly as before. That leak is closed and is not part of what this record is about.

## What this means, stated plainly

- **The contract cannot be met while both rules stand.** Any owner decision, and any document the graph scans, moves V10's bytes.
- **It went unnoticed until now** because the committed seed graph had drifted from the repository and the freshness test only failed when Phase 2's new files pushed it over. The regeneration then absorbed every accumulated document at once, OD-0009 among them.
- **Nothing in the test suite enforces the byte count.** `test/owner-build-v11.test.ts` fingerprints V10's protected *files*, and they are all unchanged. The 8,528,318 figure is held by measurement and by the run records, which is how this was found — by measuring, as every pass here does — and not by anything that would have failed on its own.

## The options, for the owner

1. **Amend the contract to name its own exception.** V10's bytes are invariant except through the derived seed graph, and the recorded figure moves when a document does. Honest, cheap, and it weakens the strongest guard in the project: a number that is allowed to change on a document is a number nobody can check at a glance.
2. **Break the coupling.** Stop V10's Mind spike compiling a derived fixture — freeze the graph it draws at the commit V10 was built from. This keeps the contract exact, and it requires **editing V10**, which is the thing the contract exists to forbid. It cannot be done by a session without the owner saying so.
3. **Leave both rules standing and record every breach.** The contract stays at 8,528,318, the number is knowingly wrong whenever a document lands, and each pass records the difference and its cause. Honest, and it turns the guard into paperwork.

**A session's recommendation, which is not a decision:** option 2, at the next moment V10 is legitimately opened for any reason, and option 3 until then. Option 1 spends the guard to buy tidiness, and this repository has been saved by that guard four times.

## What is true right now

- V10's protected files are **unchanged** and the fingerprint test passes.
- V10's clean build is **8,528,591 bytes**, 273 over the recorded figure, and the whole of the difference is traceable to one node in a derived file.
- The 914-byte leak that was found in the same measurement is **fixed**, and was a genuine defect the contract caught doing its job.
