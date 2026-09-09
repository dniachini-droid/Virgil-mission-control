# The overnight plan, 9 September 2026

The owner, going to sleep, asked for as much progress as possible past V11 stage 4, and lowered the
bar deliberately: *"I don't care if there's risk of something not right. It's just usage."* This is the
queue, written down so a container restart resumes it instead of losing it. Authority is the grant in
`OWNER_GRANT_2026-09-09-overnight.md`.

## What his tolerance for risk does and does not cover

It covers **polish, completeness and rough edges** — half-built features, unhandled cases, ugly
corners, things that would normally be sent back. Ship them; he wants usage, not perfection.

It does not cover **the two things that are not quality questions**:

1. **The hard limits.** No merge to `main`, no pull request, no deploy, no credentials, no other
   repository, no change to the approved default version, no change to `constitution/` or
   `docs/product/VIRGIL_MASTER_COMMISSION.md`. These are governance, not polish, and no instruction
   about risk tolerance touches them.
2. **A display that says something untrue.** The whole value of this product is that it does not claim
   what it does not know — it is the fault the owner has personally caught four times, and the reason
   V10 refused to draw eight duration bars. A rough edge is acceptable overnight; a screen that lies is
   not, because the owner cannot tell the difference by looking and would be misled by his own tool.

## The queue, in order, one branch so it stays one openable file

1. **V11 stage 4** — in flight. Performance, the twelve review states, the closing evidence.
2. **The independent Keeper review** — in flight on `de3c7d8`. Its findings are repaired as they land:
   anything objectively decidable is fixed; anything that is a matter of the owner's taste is listed
   for him rather than guessed.
3. **The dropped transcript.** He drags one of his own Claude Code session files onto the page and reads
   his real work in Virgil's interface: history, Markdown, code, terminal output, tool calls, diffs, the
   images embedded in it. Read-only, nothing uploaded, no network request — `verify:owner` fails the
   build if one appears. Decided on 8 September, deferred three times so the panel could be designed.
   **This is the step that answers whether he would actually use this**, which is why it is first past
   stage 4. His own transcripts are his data: none is committed as a fixture, and the parser's tests run
   against synthesised records.
4. **A real state snapshot, baked at build time.** The world stops playing a fixed schedule and reports
   this repository's actual state as of the build — branches, commits, check results, open findings.
   V10's replay proved the method. This is Phase 2's read-only Mission Control achieved without a
   server, and the step where the thing stops depicting and starts reporting.
5. **The Mind of Virgil**, if the night has room. A Phase 1 item never started: authority as orbital
   radius, tethers running inward, a broken tether visible from across the room.

Not overnight, and not without him: **live sessions**. That is Phase 3, it is owner-gated, and merge is
his alone in every phase.

## How each pass ends

Each is a normal pass: foreground checks, both owner builds, both digests, both reproducers, its own
section in the run record, committed and pushed. The one relaxation is that a pass may ship a rough
edge and name it, rather than spending another cycle perfecting it. Every rough edge it ships gets
written down where he will find it, so morning brings a list rather than a surprise.
