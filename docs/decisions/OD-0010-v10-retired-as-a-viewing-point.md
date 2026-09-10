# OD-0010 — V10 is retired as a viewing point, and its byte count is no longer a contract (Tier 3)

Status: **Accepted.** Issued by the owner in the owner console on 2026-09-10. The owner's words are the source and are quoted verbatim below; this file transcribes them and decides nothing itself. Filed by a session on the owner's instruction under the mechanism recorded in `OD-0006-recording-owner-decisions.md`. It carries authority (layer 1) from the owner's acceptance, not from this transcription.

What this record is worth is exactly what OD-0006 says it is worth. The quotation was written down by the same session that filed this file, and nothing in this repository holds an independent copy of what the owner said. **The owner reading this file is the only way a false one is found.**

## The owner's words

> "V10 is retired as a viewing point. Its byte count is no longer a contract."

Preceded, in the same exchange, by the sentence that prompted it:

> "I wont open 10 anymore, so which one is best"

## The decision

V10 is no longer a viewing point. **8,528,318 bytes is no longer a contract**, and a build that differs from it is not a breach.

## What this closes

`docs/process/PRESERVATION_CONTRACT_CONTRADICTION.md` reported that two standing rules could not both hold: V10's byte count was fixed, and the knowledge seed graph must be freshly derived from this repository's documents — while V10's Mind spike compiles that graph. Filing an owner decision therefore changed V10's bytes, and the record showed it happening: the graph gained exactly one node, `OD-0009`, the owner's own authorisation, and V10 measured 8,528,591.

Three options were put to the owner. He chose none of them, on the ground that the contract was protecting something he no longer needs: the guarantee was never about V10's quality but about V11 not disturbing a version he could fall back to. This record retires it rather than amending it, because an amended contract would still read as a guarantee and would no longer be one.

## What is retired, and what is kept

**Retired.** The byte count as a contract. Passes no longer report a difference from 8,528,318 as a breach. The number is still measured and recorded, as an observation of what the build weighs.

**Kept, and unchanged.** The test that fingerprints V10's protected files — `owner.html`, `src/owner/main-owner.tsx`, `vite.owner.config.ts`, `owner-build/inline.mjs`, `owner-build/reproduce.mjs` — in `apps/mission-control/test/owner-build-v11.test.ts`. That is the part with substance: it proves nobody has edited V10 itself, it costs nothing, and it passes. It caught a session adding a `define` to V10's config on 2026-09-10 and refused it.

**Kept in the build.** V10 stays reachable at `#/v10` and is not removed. The owner was asked whether to remove it and the recommendation was to leave it: it costs nothing and it is the only fallback that exists.

## What is lost, recorded because it is real

The byte count was a coupling detector. It caught four changes to shared code silently reaching somewhere they should not have — 96 bytes, 2, 2, and 914, the last two on the day it was retired. V10 was the tripwire rather than the thing being protected. That class of accident will now be found later, or by a person, or not at all.

The argument for accepting that, made to the owner and accepted by him: a tripwire guarding a door nobody uses is eventually stepped over and ignored, and an ignored guard is worse than none because it still looks like one.

## What this does not change

- V10 is not deleted, not edited, and not unbuilt. `pnpm build:owner` and `pnpm verify:owner` are unchanged and still run.
- The Owner Build's promise that it makes **zero network requests** is untouched, and `verify:owner` still proves it.
- V11's Owner Build, the hosted build and the live-state work are unaffected.
- No other contract, test or record is retired by this one.
