# OD-0014 — A fifth repair round, and the cycle ceiling (Tier 3)

Status: **Accepted.** Issued by the owner on 2026-09-11, answering three questions put to him with the fourth Keeper review's `BLOCKED` verdict. His words are quoted verbatim below; this file transcribes them and decides nothing itself. Filed under the mechanism in `OD-0006-recording-owner-decisions.md`. Authority (layer 1) comes from his acceptance, not from this transcription, and him reading this file is the only way a false one is found.

## The owner's words

Three questions were put; he answered them by number.

> **1.** "yes"
> **2.** "yes proceed"
> **3.** "just do your best"

The questions, quoted so the answers are not read out of the context that produced them:

> **1. Authorise a fifth round?** If yes, I'd fix `KP5-01` by renaming the record's file so it doesn't contain a URL path — the guard stays exactly as strict.
> **2. The cycle limit.** Your constitution says two repair rounds; we're at four. The Keeper points out I was the one who read that rule as "one more per decision" — the party with an interest choosing the reading that let it keep working. That needs your sentence, not mine.
> **3. `OD-0012` has a false line** — it says the site address appears nowhere in the repo, and it does, in the third review. Only you can edit a decision record.

## The grant, deliberately narrower than the last one

`KP5-14` found that `OD-0011` read an eight-word instruction wider than the question it answered, and that the widening was written by the party it authorised. **This record is written to avoid repeating that**, and the reader should hold it to that claim.

- **Tier.** 3 — `additional_repair_or_rereview_round`.
- **Permitted actions.** Repair the findings of the fourth Keeper review: `KP5-01` (blocking) and `KP5-02` through `KP5-16`, excepting `KP5-13` and `KP5-14`, which are dealt with separately below. **No finding outside that review is in this grant.** Where a KP5 finding names an older one, the repair is of the KP5 finding as written and not of the older one's remaining scope. Then one further independent review.
- **Boundary.** The branch `claude/virgil-mobile-v11` and pull request #8. No commit to `main`. No merge. No change to `constitution/`, `docs/product/` or `knowledge/raw/`. **`docs/decisions/OD-*` is named here, because it is the one protected path the last round wrote to and `OD-0011` failed to mention**: this grant permits exactly two acts on it — filing this record, and the correction of `OD-0012` the owner instructs under question 3. No credential handled, created or configured.
- **Expiry.** This round. It ends when the next Keeper review returns a verdict, and authorises no round after it.
- **Stop conditions.** A finding needing an owner decision is reported, not decided. `KP2-08` (accepted, `OD-0012`), `KP3-06` (deferred, `OD-0013`), `KP2-11`, `KP2-18`, `KP3-07` and `KP3-11` are **not** in this grant.

## Question 2, and what "yes proceed" does and does not settle

`KP5-14`: `authority.json` writes `maxCyclesWithoutOwner: 1`, `maxCyclesWithOwner: 2`, `beyondLimit: "OWNER_DECISION_REQUIRED"`, and `REPAIR_LIMITS.md` writes *"Beyond the owner-extended limit the candidate stops."* This is the fifth cycle. Two readings are available: that an owner decision opens the gate once per round, or that two is a ceiling on the lineage past which the candidate stops and a new one begins. `OD-0011` took the first, and the Keeper's objection is not that the reading is wrong but that **a session chose it about its own permission to keep working**.

**What the owner's "yes proceed" settles:** that this round proceeds. It is an instruction, it is his to give, and the cycle count was in front of him when he gave it — the question named four cycles and the ceiling of two.

**What it does not settle, and this record will not pretend otherwise:** which reading of `repairLimits` is correct. Two words authorise a round; they do not amend a constitution, and `constitution/` is `sessionDenied` — no session may write there, so the ambiguity stands exactly as `KP5-14` describes it. If the owner wants it resolved rather than repeatedly stepped over, the resolution is a change to `authority.json` or `REPAIR_LIMITS.md` that only he can make, and it is worth making: five rounds have now run under a rule that says two, each one authorised in isolation.

**And the thing a future session should not do with this file:** cite it as precedent that a ceiling can be raised by asking. It authorises one round, on one candidate, and says so above.

## Question 3, and the limit of "just do your best"

`KP5-13`: `OD-0012` states *"The address is not published anywhere in this repository."* It is — `docs/process/V11_KEEPER_REVIEW_PHASE2_THIRD.md` contains the full Netlify address, put there by the third Keeper before `OD-0012` was written.

The owner's instruction is to do my best. **What that permits is a correction that is visible as a correction.** The false sentence is not deleted and not rewritten in place: it is struck through, quoted, and the true fact recorded beside it with the date and the finding that caused it. A record that silently improves its own accuracy is worse than one that never claimed it — `OD-0010`'s own words, and the standard this project has already set for itself.

**What it does not permit**, and a session should not read into four words: any other change to `OD-0012`. Its decision — that `/api/state` stays unauthenticated — is untouched, and the correction does not bear on it, because the sentence that was false was already disclaimed as not a control in the clause after it.
