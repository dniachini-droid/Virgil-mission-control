# Commissioning the review automatically

**Status: proposed, not started. Nothing in this document is authority.**

The owner, 2026-09-13:

> *"I want Raphael (or Virgil when we finalise the skill) to know when it's
> done, write the review brief and conduct the review in a new window,
> automatically."*

`OD-0018` decided the first half — a builder opens its own pull request. This is
the second half, and it is not one change. "Automatically" can mean three
different things, costing three different amounts, and only one of them is free.

## First, something that has to be said

**The mechanism for this partly existed this morning and this session deleted
it.** `.github/workflows/instruct.yml` ran a Claude Code session inside a
container on the owner's own subscription, triggered from outside. It was Phase
2 slice three and it worked.

It was deleted in #21 as part of *"no trace of the app"*, because the interface
that drove it was the application's. **The workflow itself was build-system
machinery and the judgement to delete it was arguably wrong.** It is whole at
`a182b196` and comes back with one command. Saying so here rather than
rediscovering it during the build.

## What "automatic" can mean

### Level 1 — one window, no new machinery. Available today, free.

The owner opens a session and says *"review pull request 23"*. That session
reads the pull request, writes the review brief and runs an independent Keeper
in a subagent with no part in the building. This is exactly how #17's review
ran on 2026-09-12.

**What it costs him:** opening one window and typing one line.
**What it buys:** everything else — the brief, the independence, the verdict.

### Level 2 — the builder hands off. Small, free, and probably the right first step.

The session that opens the pull request **writes the review brief as part of
finishing**, into `docs/process/REVIEW_BRIEF_PR<n>.md`: the candidate SHA, the
contract it was built against, what to attack first, and what it knows it did
badly. Then the owner's one line becomes *"review 23"* and the reviewing session
needs nothing else.

A builder writing the brief for its own review is not a conflict: it is not
choosing the verdict, and a brief that hides a weakness is a brief the reviewer
will notice is missing one. **#20's own pull request already did this
voluntarily** — it pointed a reviewer at its five weakest seams, including
*"four read `repaired` — repaired by the session that raised them, on its own
branch. That is not evidence."* That is the standard.

### Level 3 — nobody opens anything. A workflow on `pull_request: opened`.

A GitHub Actions workflow fires when a pull request opens, runs a session in a
fresh container, and posts the review. This is what the owner asked for and it
is the restored `instruct.yml` pattern pointed at a different trigger.

**What it costs, and this is the part to weigh before building it:**

- **Actions minutes.** This repository ran out once already, on 10 September,
  and it is the reason `checks.yml` was split into parallel jobs. A review is a
  long job. It is now much cheaper than it was — the whole check set is
  twenty-four seconds since the application went — but a review session is
  minutes, not seconds, and it runs on every pull request whether or not one is
  wanted.
- **A credential in the repository's secrets.** `CLAUDE.md` forbids a session
  connecting one; the owner installs it. The old one, `INSTRUCT_SECRET`, is
  recorded as never rotated.
- **`No paid services`** — the owner's own hard limit, which he was offered the
  chance to lift on 2026-09-12 for faster conversation and deliberately kept.
  Actions minutes beyond the free tier are a paid service. Whether this crosses
  that line is his to say, not a session's.
- **A review nobody asked for is a review that has to be read.** The repository
  spent two days on eleven review rounds of a small change. An automatic
  reviewer on every pull request, with risk tiers not yet consuming its own
  answer, would reproduce that by construction. **It should fire at tier 3 and
  stay silent at tier 1**, and `pnpm tier` already derives that.

## What to build, and in what order

1. **Level 2 now.** The builder writes the review brief when it opens the pull
   request. One template, one habit, no new machinery, no cost.
2. **Wire the tier into the decision** — a tier-1 change does not need a review
   commissioned at all. This is `KXR-42`, already open: `tierOf` computes the
   answer and nothing consumes it.
3. **Level 3 only after 1 and 2**, and only once the owner has decided the
   minutes question. Restoring `instruct.yml` is the smaller half of it; the
   trigger and the tier gate are the rest.

## What this must not become

**A reviewer that reports to the thing it reviews.** The verdict goes to the
pull request and to the owner. A session that commissions a review does not get
to decide what the review found, and the register is the only place a finding
lives.

**A loop.** `REPAIR_LIMITS.md` allows one repair cycle, two with an owner
decision, and beyond that the run stops for him. An automatic reviewer makes it
cheap to start another round, which is exactly why the cap has to be enforced
before the automation exists rather than after.

## What the owner needs to decide

1. **Level 2 alone, or go on to Level 3?**
2. **The minutes.** Does a per-pull-request review session cross `No paid
   services`? Only he can answer that.
3. **Restore `instruct.yml`?** It is build-system machinery that was deleted
   with the application's records. One command brings it back.
