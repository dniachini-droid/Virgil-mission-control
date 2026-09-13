# OD-0018 — A builder opens its own pull request, and the review follows automatically

**Authority: layer 1.** An owner decision, filed by a session on his
instruction, per the mechanism `OD-0006` records.

**Date:** 2026-09-13. **Decided by:** the owner, in the owner console.

## What he was answering

A session that had finished building stopped and asked him for permission to
open a pull request. Its own words, relayed by him:

> *"A pull request just means 'here is a finished piece of work, please look at
> it.' I need one for two reasons: the project's automatic testing robot only
> runs its full set of tests on a pull request. Right now it ran a partial set
> and skipped the most important one — the one that actually tests my two
> fixes. Your rules say someone other than me has to check my work. They check
> it through the pull request. I'm not allowed to open one unless you say so."*

## The decision, in his words

> *"I want to change my rules so that the builder can open a pull request when
> it's finished building, and I want Raphael (or Virgil when we finalise the
> skill) to know when it's done, write the review brief and conduct the review
> in a new window, automatically."*

## What changes

**A session that has finished building opens its own pull request.** It does not
ask. The hard limit in `CLAUDE.md` that required written authorisation for each
one is replaced.

## Why the old rule was wrong, and it is worth being exact

It was not merely inconvenient. It made the repository's own verification worse
in two specific ways.

**The full check set only runs on a pull request.** A push runs the fast half.
So work waiting for permission to be opened is work whose most important checks
have not run — and a session reporting "built and verified" in that state is
reporting less than it believes. The rule that was supposed to add caution was
subtracting evidence.

**Review happens through the pull request.** Requiring permission to open one is
requiring permission to be reviewed. That is the wrong thing to gate, in a
repository whose first principle is that a builder's success report is not
evidence.

## What this does not loosen, and the distinction is the whole of it

**Opening a pull request merges nothing, deploys nothing, and moves no branch.**
It is a request to be looked at. The gate that matters is untouched:

> No session merges anything into `main` unless the owner has written
> `merge approved` in the owner console, in that turn, naming the pull request.

A session still may not review its own work. An open pull request is not an
approval, a verdict, or evidence of anything beyond the checks that ran on it.

## The second half, which is not yet built

The owner also asked that the review be commissioned **automatically** — that
something notices a pull request is ready, writes the review brief, and runs the
review in a fresh session without him starting it.

**That is not decided by this record and it is not built.** It needs a design
and it has real constraints, which are stated in
`docs/process/AUTOMATIC_REVIEW_BRIEF.md` rather than discovered later. This
record authorises the first half — the builder opens the pull request — which
stands on its own and is useful immediately.
