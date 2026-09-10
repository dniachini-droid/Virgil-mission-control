# OD-0009 — Netlify authorised, and Phase 2 authorised (Tier 3)

Status: **Accepted.** Both decisions below were issued by the owner in the owner console on 2026-09-10. The owner's words are the source and are quoted verbatim under each one; this file transcribes them and decides nothing itself. It is filed here by a session on the owner's instruction, under the mechanism recorded in `OD-0006-recording-owner-decisions.md`. It carries authority (layer 1) from the owner's acceptance, not from this transcription.

What this record is worth is exactly what OD-0006 says it is worth, and no more. The quotations below were written down by the same session that filed this file, and nothing in this repository holds an independent copy of what the owner said. **The owner reading this file is the only way a false one is found.**

## 1. Netlify is authorised

### The owner's words

> "Netlify is authorised. I already pay for it."

### The decision

Netlify may be used to host the application. This is a named exception to the hard limit in `CLAUDE.md`:

> "No paid services, subscriptions or commercial assets."

### What it covers, and what it does not

It covers **Netlify**, on the subscription the owner already holds. Nothing else. It is not a general licence to spend, to sign up for anything, or to read the limit as lifted: the next paid service needs its own decision, and a session that treats this one as precedent has misread it.

It does not authorise a session to hold, enter or configure the owner's Netlify credentials. `CLAUDE.md` forbids connecting credentials without explicit written authorisation for that session, and this record gives none. The site is connected by the owner in his own account; the repository side — `netlify.toml` and the `build:web` target, committed at `61c5c5f` — is the session's part and is already done.

### Why it was needed at all

The owner asked to open the world on his phone without carrying a file: *"so I can use it on my phone??? Because the files wont be on my phone."* A hosted page answers that. He then asked whether it could be hosted as a Claude artifact instead, and it cannot become what he is describing: an artifact is a page, a private repository's state needs a token, and a token cannot live in a page that anyone who opens it can read. A server side is required, which is what Netlify supplies and an artifact cannot.

## 2. Phase 2 is authorised

### The owner's words

> "Phase 2 is authorised."

### The decision

Phase 2 may begin.

### What this unblocks

One thing named and carried as blocked in this repository until now: **the application reporting this repository's real state** rather than replaying a script. It is recorded as Phase 2 work and as unauthorised in `docs/process/V11_RUN_RECORD.md` ("A real state snapshot baked at build time — **This is Phase 2 work and Phase 2 is not authorised**, so it needs your word, not just your go-ahead"). That sentence is now answered.

### What this record does NOT say, stated plainly because a later session will be tempted to read it as saying so

**Phase 2 has no written brief.** Phase 0 and Phase 1 each had one before they began — `docs/process/PHASE_1_BRIEF.md` opens by requiring the owner to accept the previous phase's run record — and no equivalent document exists for Phase 2. So this authorisation names a phase whose scope no document defines. A session may not resolve that by deciding for itself what Phase 2 contains. The scope of the first slice is to be written down, and the owner is to see it, before it is built.

**It does not authorise credentials.** Real state means reading GitHub, GitHub means a token, and a token is credential material. `CLAUDE.md`:

> "Never open a pull request, merge, deploy, or connect credentials unless the owner explicitly authorised it in writing for that session."

> "Never write secrets, tokens or credential material into files, logs, fixtures or the interface."

Both stand untouched. A session that reads "Phase 2 is authorised" as permission to create, hold, paste or configure a token has exceeded this record. The token is the owner's to create and to place in Netlify's own environment settings, where no session sees it.

**It does not authorise merging, deploying, opening a pull request, touching `main`, or working in any other repository.** Those are owner-only actions in `constitution/authority.json` (`ownerOnlyActions`, `virgilProhibitions`) and layer 2 is unchanged by this record.

**It does not change `constitution/` or `docs/product/VIRGIL_MASTER_COMMISSION.md`**, which remain out of bounds to every session under `boundaryProtection.sessionDenied`.

**It does not close the four accepted gaps** — KR-03, KR-06, KR-07 and KR-09 (`docs/architecture/ENFORCEMENT_BOUNDARIES.md`) — which remain open and are unaffected.

**And it does not make anything live.** Nothing in the application reads real state today. The world replays a run that really happened, and says so. This record authorises the work; it does not report it done.
