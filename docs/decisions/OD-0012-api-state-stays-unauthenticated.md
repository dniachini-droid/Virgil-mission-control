# OD-0012 — `/api/state` stays unauthenticated (Tier 3)

Status: **Accepted.** Issued by the owner on 2026-09-11, answering a finding put to him by three successive Keeper reviews. The owner's words are the source and are quoted verbatim below; this file transcribes them and decides nothing itself. Filed by a session on the owner's instruction under the mechanism recorded in `OD-0006-recording-owner-decisions.md`. It carries authority (layer 1) from the owner's acceptance, not from this transcription.

What this record is worth is exactly what OD-0006 says it is worth. The quotation was written down by the same session that filed this file, and nothing in this repository holds an independent copy of what the owner said. **The owner reading this file is the only way a false one is found.**

## The owner's words

> "no passord needed."

Answering this, put to him in the preceding message:

> "**`/api/state` has no password**, on a private repo. Anyone with the link reads your branch, commits and check results."

## The decision

`/api/state` is not given authentication. `KP2-08` is **accepted, not repaired**, by the owner's decision.

## What that means, stated plainly because he should be able to check it against what he agreed to

The endpoint is readable by anyone who knows the address. No password, no token, no origin check. What it returns about `dniachini-droid/Virgil-mission-control`, which is a **private** repository (`KP3-07`):

- the branch it is configured to read, and that branch's head commit — SHA, message and time;
- the open pull requests: number, title, draft state, base branch;
- the check results on that commit, including the name of every check and whether it passed;
- the whole of `.virgil/state.json` when a session has written one: who is holding the work, what each station is doing, any note a session wrote, and the candidate's state.

It does **not** return the repository's code, its history beyond the head commit's message, the token, or anything a session has not itself written into the status file.

The address is not published anywhere in this repository, and the site is not linked from it. That is obscurity, which is not a control, and this record does not describe it as one.

## What does not change

- The token stays server-side. It is never returned, never logged, and no build contains it.
- `/api/instruct` — the endpoint that can **start work** — is unaffected and still requires the shared secret, still refuses the default branch, still runs one at a time and still has a daily ceiling. This decision is about reading, not about acting.
- The finding is not deleted from the reviews that raised it. It remains in `V11_KEEPER_REVIEW_PHASE2.md` (`KP2-08`) and in both re-reviews, as an open finding the owner has accepted, which is a different thing from one that has been closed.

## If this is ever to be revisited

The smallest honest change is the one already implemented for the other endpoint: a shared secret in a header, given to the device once. It costs the owner one paste per device and costs a session nothing to implement. This record exists so that a future session proposes that rather than assuming the gap was never noticed.
