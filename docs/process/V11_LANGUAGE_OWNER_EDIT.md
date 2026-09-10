# The owner's language edit, applied

**What this records.** The owner asked for every word V11 puts on screen in one
file so that he could rewrite it himself: *"Just give me all the language in one
file. You're fucking shit at writing the new wording. Give me all the language
and I'll edit it and send it back to you."* This is the record of extracting it,
receiving it back, and applying it — including the six entries that were **not**
applied and why, which is the part of this record that matters.

## What was sent and what came back

426 entries, one per distinct string, each carrying an `L` number so an edit
could be applied back to the exact place it came from. They were extracted from
twelve source files under `apps/mission-control/src/world/`, grouped by the file
they live in.

It came back in two parts. The first covered **L1–L390** with no gaps. The last
36 had been cut off — an output limit, not a decision — so they were sent again
on their own and returned complete as **L391–L426**.

## What was applied

- **309 entries changed**, at **327 places** in the source (some strings appear
  at more than one beat and every occurrence moved together).
- **61 entries** were marked `[CODE]` by the owner and left untouched: code
  fragments, command names and identifiers that the extraction had picked up
  because they sit in the same string tables as prose.
- **54 entries** came back unchanged.

`[KEEP]` markers — the owner's mark for a formal status name that must survive
in its exact form, such as `PASS WITH NON-BLOCKING FINDINGS` and `INSUFFICIENT
EVIDENCE` — were treated as annotation and stripped from the text, leaving the
formal name in place. That is what the marker asked for.

## What was NOT applied, and why

### 1. Five sentences that put "demo" back into the window

**Held at their existing wording. This is an owner decision, not a session
decision, and it is being reported rather than resolved** (`CLAUDE.md`,
*Authority order*: "A session that finds a contradiction reports it; it does not
resolve it silently").

On 9 September the owner instructed: *"Remove all signs of Demo from the entire
system except one small spot"*, and again: *"Remove the bands. That's it. I don't
want any other stupid changes as a result. No bands. No demo signage on the
screens."* That instruction is enforced by a test — `window-content-v11.test.ts`,
*"says nothing anywhere about being a demonstration"* — which walks every word of
every window document at every beat of every loop and fails if the vocabulary
reappears.

Five of the returned sentences use "demo" or "demonstration" as the plain way of
saying that nothing is running behind the build:

| L | The returned wording |
|---|---|
| 131 | This is a demonstration. Nothing here can change your project. |
| 178 | …This box shows where the screenshot would appear; **the demo** does not load one. |
| 190 | …**This demo** does not read or change any files. |
| 395 | …They do not work **in this demo** because no agents are running. |
| 420 | …**This demo** cannot restart the work. |

They are accurate. They may well be clearer than what is there now. But applying
them means reversing a standing instruction and loosening the test that enforces
it, and neither is a session's to do quietly. **The five are held at their
current text until the owner says which way it goes.** A sixth (L6, "Demo
information — what it means") is an aria-label in the mobile room, outside the
scope of both the instruction and the test, and was applied.

### 2. Two screen-reader suffixes (L104, L105)

`(in progress)` and `(not started)` are not shown on screen. They are appended,
inside a visually-hidden span, after a step's text so a screen reader says
*"Write the code only in the assigned files (in progress)"*. The returned words
are identical; only the brackets and the capital differ, and the brackets are
what keeps the two phrases from running together when read aloud. **Left as
they are** — nothing the owner wrote was rejected, because nothing about the
words changed.

### 3. One entry that was never screen text (L91)

`Escape` was extracted from `AgentWindow.tsx`, where both occurrences are the
keyboard key — `event.key === 'Escape'` and a comment about it — and neither is
shown to anybody. Applying the returned word turned the close-the-window
shortcut into a comparison against a key that does not exist. **The extraction
was wrong to include it**; the source is unchanged and the shortcut still works.

## Two comments that were rewritten and put back

Two block comments in `AgentWindow.tsx` quote *older* wording as history — what
V9's breadcrumb used to say, and what a spacing bug used to render. Rewriting
them to the new words made the comments false. Both were restored.

## The guards that changed with the words

Eight assertions named the old wording literally. Each was re-pointed at the new
wording; none was removed, and two were made stricter. No test was skipped,
disabled or weakened (`CLAUDE.md`, *Hard limits*).

| Test | Was | Now |
|---|---|---|
| `plain-language` — the two plain words | `SOURCE LINKS` | `LINKS TO THE SOURCES` |
| `plain-language` — ready-to-go-in is not gone-in | `/ready to go into the project/` | `/add (the\|this) change to your project/`, **plus a new negative**: the sentence may not say it has been merged, added, gone in or put in |
| `plain-language` — failed vs could-not-run | blocked must say `/failed/` | blocked must say `/failed\|found a problem\|confirmed a problem/`, **plus a new negative**: the could-not-run beat may not use the blocked vocabulary either |
| `screen-content` — a returned PASS is only a check | `/NOBODY HAS REVIEWED IT YET/` | `/NOBODY HAS REVIEWED IT YET\|HAS NOT REVIEWED IT YET/` |
| `screen-system` — COMPLETE is a claim | `/BUILDER SAYS\|CLAIM/` | `/BUILDER SAYS\|FABRICATOR SAYS\|CLAIM/` |
| `screen-system` — and denies being checked | `/NOTHING IS CHECKED\|NOT EVIDENCE/` | adds `\|HAVE NOT CONFIRMED` |
| `window-content` — the replay's own marking | `A recorded run, replayed` | `A saved example being replayed` |
| `window-v11` — every control is named | the old composer aria-label | the new one |
| `window-content` — nothing is reported as sent | `/nothing running behind this build/` | `/is not sent/` **and** `/no agents are actually running\|nothing running behind this build/` |

### The one that needed thought

The owner's sentence for a check that could not run is *"A check could not run,
so it could not be marked as passed or failed."* The guard banned the word
`failed` anywhere at that beat, because a check that could not run is not a
failure and no sentence there may call it one.

The owner's sentence uses the word to **deny** exactly that. The ban was written
when no sentence had a reason to use the word at all, and it now catches a
sentence that says the right thing.

Rather than delete the guard, it now removes that one denial — the literal
clause *"could not be marked as passed or failed"* — and then requires the word
to be absent from everything that remains. A sentence claiming a failure still
fails the test; it cannot hide behind the exception.

## Verification

- `pnpm run lint` — clean (six files reformatted by `biome format` first).
- `pnpm run typecheck` — clean.
- `pnpm run test` — **1,739 tests pass** across six packages, 1,504 of them in
  `mission-control`.

## One thing the owner may want to look at

In the controls table, the "Available" column now reads **"No — only you can
decide"** for the owner-only controls, which is the returned wording, and plain
lowercase **"no"** for the rest, which was too short to be extracted. They sit
in the same column. Changing it is a one-word decision and it is his.
