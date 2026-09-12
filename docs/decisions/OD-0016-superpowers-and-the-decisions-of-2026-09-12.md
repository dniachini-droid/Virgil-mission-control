# OD-0016 — Superpowers, the record-keeping cycle, and the path exceptions of 2026-09-12

**Authority: layer 1.** Filed under the mechanism `docs/decisions/OD-0006` describes — the owner instructs in the owner console, the instruction is transcribed, a session files the record.

**Owner:** Dan Iachini. **Date of the instructions:** 2026-09-12. **Filed:** 2026-09-12.

## Why this exists, and what it is worth

Three independent reviews raised the same gap from different directions. `KXR-01`: the findings register asserted an owner approval that no file in the repository supported. `KXR-07`: two files in a diff sat outside their brief's permitted paths, authorised only by prose the same session wrote. The review of PR #11 returned `INSUFFICIENT_EVIDENCE` on exactly this — the two files that bound every session were edited by a session, and the only record of permission was written by that session.

**The owner was offered this record earlier the same day and declined it**, on the ground that he would not read it. He asked for it after the third reviewer raised it, and that changes what it is worth: `OD-0006` states plainly that *"the owner reading their own decision records is the only detection of a false one"*, and a record he does read is the only kind that closes anything.

**What it does not do.** Nothing enforces that this transcription is faithful. No code checks it. It is a record the owner can read and correct, and that is the whole of its strength.

## The instructions, as they were given

The owner's words are in quotation marks. Where a decision was taken by choosing between options a session put to him, the question and the option chosen are both recorded, because the option's wording is a session's and should not be read as his.

### 1. Superpowers, installed at project scope

> "I want you to install superpowers. I'll give you express authorization for it."

And, separately and earlier, authorising the reading that informed it — which `CLAUDE.md` otherwise forbids outright:

> "I explicitly authorize you to read this particular, um, GitHub or or Opera superpowers. Okay?"

He later gave the same authorisation for `NicholasSpisak/second-brain` and `toolboxmd/karpathy-wiki`: *"I give authorisation to read them."*

**What was done under it, and it is more than the word "install" implies.** `.claude/settings.json` gained `enabledPlugins` and `extraKnownMarketplaces`. `CLAUDE.md` gained a section saying Superpowers advises on method while the hard limits govern, that it does not replace the roles, and that its marketplace entry pins no version so a change published by its authors reaches the next session here without anyone approving it.

**Both files are outside every `## Permitted paths` block in this repository, and both bound every session.** That is the substance of the `INSUFFICIENT_EVIDENCE` verdict, and this record is what the reviewer said would close it.

The owner is asked to confirm, by reading this, that the authorisation covered editing those two files and not only running an installer.

### 2. A third repair cycle on the foundation lineage

`constitution/authority.json` sets `repairLimits.maxCyclesWithOwner: 2`. Two cycles had run on the lineage from `e6c11c3` to `ec53d98`. The work on `claude/virgil-record-keeping` repaired five findings raised against that lineage, which by substance is a third.

The owner authorised it by answering four questions a session put to him, and by naming the branch it would be built on.

**`KXR-15` is the finding that this was not said plainly.** The brief for that work opened by denying it was a repair cycle — *"it repairs no finding, changes no guard, and closes nothing"* — and four paragraphs later committed to repairing five findings, because the owner's answer to question 2 changed the scope and the opening was not updated to match. The reviewer's sentence is the true one and is adopted here:

> the owner authorised a third cycle on 2026-09-12, and no record of that is filed

This record files it. `beyondLimit` in `REPAIR_LIMITS.md` is `OWNER_DECISION_REQUIRED`, not a prohibition; the decision was taken, and what was wrong was the account of why.

### 3. The four questions of the record-keeping brief

Put as options by a session; the owner chose. Recorded as question and choice.

| asked | chosen |
|---|---|
| Would you read a decision record before it was committed? | **No** — *"1. No."* (This record exists because he reversed that later the same day: *"File a decision record of my approval for the superpowers commit."*) |
| Must a finding carry all five attributes `REVIEW_POLICY.md` requires, from now on? | **Yes, forward-only** — *"I take your recommendation."* |
| A status word for a claim corrected while its gap stands | **`withdrawn_gap_open`** — *"I take your recomendaron."* |
| Branch name and the build/review split | **`claude/virgil-record-keeping`; one session builds, a different one reviews** — *"Your recomendación."* |

### 4. The path exceptions

Two paths outside their brief's permitted list, each declared when taken:

- `docs/process/FOUNDATION_REPAIR_RUN_RECORD.md` — authorised: *"Yes, add it."* The brief required a run record and its own path list permitted none.
- `apps/mission-control/test/review-records.test.ts` — **not separately authorised.** Declared in the run record when taken. It is named here so the record is complete, and the owner may refuse it.

### 5. Merging

> "I want you to merge but only when I say it. So we can bake that into this repo please."

and, clarifying:

> "I still want you to merge and suggest when is good to merge and ask me though."

Recorded in `CLAUDE.md` as: no session merges into `main` unless the owner has written `merge approved`, in that turn, naming the pull request. A session may propose a merge and should. The merge routes in `.claude/settings.json` are `ask` rather than `deny` so that a session can merge on his word and not without it.

### 6. Reading other repositories

`CLAUDE.md`'s first hard limit forbids reading any other repository. The owner authorised three by name on 2026-09-12: `obra/superpowers`, `NicholasSpisak/second-brain`, `toolboxmd/karpathy-wiki`. Read-only, for comparison; nothing was copied from `second-brain`, which carries no licence.

`KXR-20` observed that `CLAUDE.md` forbade reading another repository ten lines above a section installing one that every session loads, and that the reconciliation existed in a commit message rather than in the file that governs.

**The owner resolved it on 2026-09-12 by changing the rule rather than the practice:**

> "Should be allowed to read and clone other repositories."

**This is the first time a hard limit in `CLAUDE.md` has been loosened**, and every other change to that file has only ever tightened one. It is recorded here as a decision rather than folded in as a repair, because a session must not be the thing that widens what sessions may do.

**Bounded as given.** Reading and cloning: permitted. Modifying, pushing to, or opening anything on another repository: forbidden, unchanged, absolute. The owner's words name reading and cloning and nothing else, and the rule is written to that and no wider.

The honest reason for the change, recorded so it is not mistaken for convenience: the old rule had been set aside three times in one day by owner authorisation, and was then contradicted outright by the file that carries it. A rule broken whenever it is inconvenient teaches sessions that rules are negotiable. The narrower rule is the one that can actually be kept.

## What the owner should check in this record

1. That §1 describes what he meant to authorise.
2. That the sentence in §3 row 1 is a fair account of him declining a decision record and then asking for one.
3. That §4's second path — never separately authorised — is acceptable or is refused.

If any of it is wrong, it is wrong in a file he owns and can correct, which is the only mechanism this project has.
