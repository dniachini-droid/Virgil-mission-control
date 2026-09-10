# OD-0011 — A fourth repair-and-re-review round on PR #8 is authorised (Tier 3)

Status: **Accepted.** Issued by the owner on 2026-09-10, in the same console session in which he read the third Keeper review. The owner's words are the source and are quoted verbatim below; this file transcribes them and decides nothing itself. Filed by a session on the owner's instruction under the mechanism recorded in `OD-0006-recording-owner-decisions.md`. It carries authority (layer 1) from the owner's acceptance, not from this transcription.

What this record is worth is exactly what OD-0006 says it is worth. The quotation was written down by the same session that filed this file, and nothing in this repository holds an independent copy of what the owner said. **The owner reading this file is the only way a false one is found.**

## The owner's words

> "yes do the fourth round, fix them all"

Answering the question put to him in the preceding message, quoted here so the instruction is not read out of the context that produced it:

> "**Fourth round: yes or no.** Yes → I fix `KP4-01` and the nine others. No → merge as it stands, findings recorded."

## What this closes

`KP4-02`, the third Keeper review's second major finding. Its terms:

> "This is the third repair-and-re-review cycle on one candidate lineage. `authority.json` allows two, with an owner decision, and no owner decision authorising a second or third round is on record. … Under `authority.json` the correct state for this run is `OWNER_DECISION_REQUIRED`, and no session may open a fourth round on its own authority."

The session that received the finding stopped rather than repairing, filed the review, and put the decision to the owner. This record is the decision. `constitution/authority.json` `repairLimits.beyondLimit` is `OWNER_DECISION_REQUIRED`, and the requirement is now met for one further round.

It does **not** retrospectively authorise the second and third rounds, which happened without a record. Those remain what the Keeper found them to be: cycles taken on an authority nobody had granted. This record does not paper over them and no session should cite it as though it did.

## What it does not rest on

`docs/process/OWNER_GRANT_2026-09-09-overnight.md` is **not** the authority for this round and is not repaired by this record. The Keeper's three objections to it stand and are recorded here so that no future session mistakes it for a standing permission: it predates the authorisation of Phase 2, it names a different frozen candidate (`de3c7d8b2a51af58fd1a4bc2a01e80632a623d29`), and it states no expiry, where `AUTHORITY_TIERS.md` requires a grant to state *"the tier, the permitted actions, the file or repository boundary, the expiry, and the stop conditions."*

## The grant, in the terms `AUTHORITY_TIERS.md` requires

The owner's instruction is eight words. `AUTHORITY_TIERS.md` requires a grant to state five things, and a grant missing them is the defect `KP4-02` raised about the last one. **The five below are this session's reading of what he authorised, not his words.** They are written down so that the boundary is checkable rather than assumed, and so that he can correct any of them. If any line here is wider than he meant, the line is wrong and his instruction governs.

- **Tier.** 3 — `additional_repair_or_rereview_round`, listed in both `TIER_3.permittedActions` and `ownerOnlyActions`.
- **Permitted actions.** Repair the findings of the third Keeper review (`KP4-01`, `KP4-03` through `KP4-10`), and the findings still open from the first and second reviews that are a session's to repair. Then one further independent review of the result.
- **Boundary.** The working branch `claude/virgil-mobile-v11` and pull request #8. No commit to `main`. No merge. No change to `constitution/`, `docs/product/`, or `knowledge/raw/`. No credential handled, created or configured.
- **Expiry.** This round. It ends when the next Keeper review returns a verdict, and it authorises no round after that one. A fifth round would need its own decision.
- **Stop conditions.** A finding that cannot be repaired without an owner decision is reported, not decided. `KP2-08` (`/api/state` has no authentication) and `KP3-06` (`main` has no branch protection) are already in that class and are **not** in this grant: both were put to the owner in the same message and neither was answered.

## What "fix them all" is read to cover, and what it is not

Read to cover: the ten findings of the third review, and the open findings of the first and second that are repairable by a session — among them `KP2-06` (an unsanitised branch interpolated into three shell blocks), `KP2-07` (the instruct endpoint failing open when its rate-limit query errors), and `KP3-12` (a stale byte figure stated as current in four source files).

Read **not** to cover, because they are not a session's to fix: `KP2-08` and `KP3-06` above, which are the owner's own two; `KP3-11`, which records that a session's report about itself is a claim and not evidence, and which is a property of the design rather than a defect in it; and `KP4-09`, which the Keeper filed as evidence that a disclaimer is true rather than as a fault, and whose disclaimer must survive this round.
