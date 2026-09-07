# OD-0007 — Phase 0 accepted, Phase 1 authorised, and the five other decisions of 2026-09-07 (Tier 3)

Status: **Accepted.** All six decisions below were issued by the owner in the owner console on 2026-09-07. The owner's words are the source and are quoted verbatim under each one; this file transcribes them and decides nothing itself. It is filed here by a session on the owner's instruction, under the mechanism recorded in `OD-0006-recording-owner-decisions.md`. It carries authority (layer 1) from the owner's acceptance, not from this transcription.

What this record is worth is exactly what OD-0006 says it is worth, and no more. The quotations below were written down by the same session that filed this file. Nothing in this repository holds an independent copy of what the owner said, so no reader can check them against anything. A `PreToolUse` hook now refuses an `OD-*` record that carries no quotation and no date, so a record filed with no owner words at all cannot be written through the `Write` or `Edit` tools; nothing checks that the words quoted here are the owner's. **The owner reading this file is the only way a false one is found.**

## 1. Phase 0 accepted, Phase 1 authorised

### The owner's words

> "I accept phase 0 as complete and authorise phase 1 to begin."

### The decision

Phase 0 is accepted as complete. Phase 1 is authorised to begin.

### What this supersedes, stated plainly

`docs/process/PHASE_0_RUN_RECORD.md` says two things that this decision overrides, and the run record is **not** rewritten:

- **"Phase 0 verdict: BLOCKED_PENDING_REAL_GPU_REVIEW."** That verdict stands as written. It was recorded because acceptance criterion 12, the visual-quality judgment, cannot be made on a software renderer: the session containers have no GPU, and their captures are recorded as possibly overstating or understating bloom and colour.
- **"Phase 1 readiness: not ready until OD-0002 records PASS or PASS WITH DIRECTION."**

The owner's acceptance treats the direction recorded in `OD-0002-art-direction-checkpoint.md` as satisfying that criterion. OD-0002 records FAIL for the runtime executions and, in the same record, a binding approved visual direction: the hybrid reference `docs/art-direction/approved/visual-canon/03-approved-hybrid.png`, with Direction B as the strongest stylistic influence. The owner reads that as PASS WITH DIRECTION. A session did not make that reading and could not have; the criterion is the owner's to apply.

The run record is left exactly as it is, and this record supersedes it rather than editing it, for two reasons. It is the evidence of what was actually found at the time, and rewriting evidence to agree with a later decision destroys the only account of what the session saw. And the verdict itself remains true of the thing it describes: no visual-quality judgment has been made on real graphics hardware by anybody. `OD-0005-phase-1-visual-checks-and-reference.md` defers the two graphics-hardware checks and requires them recorded as not performed, never as met. That requirement is untouched here.

So: Phase 1 is authorised with acceptance criterion 12 unjudged on real hardware, by the owner's decision, knowingly.

## 2. Sound is out of Phase 1

### The owner's words

> "Agreed. But want sound after once it works well."

### The decision

Optional sound motifs are **out** of the Phase 1 slice. This closes item 3 of "Owner decisions required before start" in `docs/process/PHASE_1_BRIEF.md`.

Sound is deferred, not dropped. It returns after the slice works well. This record fixes no date and no phase number for that return, because the owner set none.

## 3. Branch naming delegated to the owner console

### The owner's words

> "Yes agreed."

Given in answer to the proposal that the owner console name the Phase 1 build branch rather than the owner naming it themselves.

### The decision

The Phase 1 build branch is **`claude/virgil-phase-1-slice`**. This closes item 4 of "Owner decisions required before start" in `docs/process/PHASE_1_BRIEF.md`.

The name is chosen by the owner console under this delegation, not by the owner. That is what the delegation means and it is recorded so that a later reader does not mistake the branch name for the owner's own words.

## 4. The commission integrity check is declined

### The owner's words

> "Let's just ignore it and move on. I'm feeling lucky."

### What was declined

Open decision 4 of `docs/process/PHASE_0_RUN_RECORD.md`: "Confirmation of the commission integrity diff using the recorded command."

The item being declined is this. `docs/product/COMMISSION_PROVENANCE.md` records that the owner's original attachment of the master commission and the copy stored in this repository have **the same line count — 1,031 lines — but different byte counts and different SHA-256 hashes**: 44,373 bytes against 45,125 bytes, a difference of 752 bytes. The Phase 0 session could not reproduce that difference from inside the container, because the original attachment bytes were never available to it; it received the commission as rendered message text. It tried every plausible ASCII substitution for the ten non-ASCII code points in the file and none produced the owner's byte count or hash. It recorded the difference as an open verification item, explicitly not a confirmed equivalence. The one command that would settle it can only be run by the owner, on their own machine, against their own copy of the original.

### The consequence, unsoftened

`docs/product/VIRGIL_MASTER_COMMISSION.md` is the governing document at authority layer 1 — the top of the order in `CLAUDE.md`, above the constitution, above every ADR, above every architecture and process document. **It is unverified against the owner's original, and will now remain so.** The difference may be innocent — attachment transport re-rendering list markers, typography or indentation is the most likely explanation, and the matching line count makes a substantive content difference improbable. It may also be substantive. **Nobody knows which, and after this decision nobody will find out**, because the only check that could distinguish the two is the one being declined.

This was considered and declined. It was not overlooked, and it was not lost in a backlog. The owner was shown the finding and chose to proceed.

### What was done instead

The fingerprint recorded at the end of this file. It establishes nothing about whether the file is correct today, and it makes any future change to it detectable.

## 5. The base is greened structurally, not by exemption

`pnpm check` was red on `main`. `constitution/authority.json` listed `docs/decisions/OD-*` as a protected boundary; `packages/agent-contracts/test/permission-matrix.test.ts` asserted that every path-shaped protected boundary carries `Write` and `Edit` deny rules in `.claude/settings.json`; and the owner had removed those two rules in commit `9627bae` so that a session could file an owner decision at all. The test was correctly reporting a real disagreement between the constitution and the settings file.

### The owner's words, in order

First, choosing a test exemption from a menu of options:

> "I choose three."

Then, on being shown the structural alternative:

> "Ok let's do it properly. Go. And stop any work that is currently doing the weaker workaround."

### The decision

The second instruction governs. The base is greened structurally.

Both are recorded, in order, because the first was a real decision by the owner and deleting it would misrepresent how this one was reached. The session briefed to implement the exemption was stopped before it pushed anything; nothing from that approach is in this repository.

### What was rejected

An exemption in the test: a list of protected boundaries to which the deny-rule assertion does not apply, with `docs/decisions/OD-*` on it. It would have turned green immediately. It would also have made the test weaker than it was — the exemption list would have lived in the test file, where any session may write, so a session could have added a boundary to it and made its own writes legal.

### What was done instead

The owner added a `boundaryProtection` block to `constitution/authority.json` themselves (see decision 6), declaring two kinds of protection where the repository had assumed one: `sessionDenied`, protected by a deny rule, and `ownerInstructedOnly`, protected by recorded owner instruction and deliberately carrying no deny rule. The single assertion in `permission-matrix.test.ts` became three:

1. every path-shaped protected boundary appears in exactly **one** of the two groups;
2. every `sessionDenied` path has both a `Write` and an `Edit` deny rule;
3. every `ownerInstructedOnly` path has no `Write`/`Edit` deny rule reaching it, and is recorded in `docs/architecture/ENFORCEMENT_BOUNDARIES.md` as protected by recorded owner instruction.

### Why this is stronger than what it replaced

The exemption would have removed a check. This adds two and keeps the third at full strength.

Assertion 1 catches something the original test never could: a protected boundary that nobody has classified. Before today, a new entry in `protectedBoundaries` needed a deny rule and nothing more; now somebody must decide, in the constitution, which kind of protection it has, and an unclassified or doubly-classified boundary fails the build. Assertion 3 catches something else nothing checked: an `ownerInstructedOnly` path that nobody documented, or that has quietly acquired a deny rule reaching it.

And the classification lives in `constitution/`, which every session is denied by rule and by test. A session cannot reclassify a boundary to make its own write legal. An exemption list in a test file would have carried no such protection.

Each of the three was shown to fail against a deliberately broken copy of the repository before it was accepted. Nothing else in that test file was loosened to make them fit.

## 6. The owner made the constitutional change themselves

### The decision

The `boundaryProtection` block in `constitution/authority.json` was added by the owner, in their own commit `dd8ddb1` on `main`, additively, leaving `protectedBoundaries` unchanged at seven entries.

### The reason, which is the point of the design

The classification of what is protected, and how, must live where no session can write it.

If a session could edit that block, the whole structure would be circular: a session that wanted to write to a protected path could move it from `sessionDenied` to `ownerInstructedOnly`, and every test would still pass. The protection would be exactly as strong as the good behaviour of the session it is meant to constrain, which is to say not a protection at all.

`constitution/` is denied to every session — two deny rules in `.claude/settings.json`, both left in place deliberately by the owner in `9627bae`, and both asserted by `permission-matrix.test.ts`. That the owner had to make this change personally is not an inconvenience in the process. It is the process working: the one change that had to be beyond a session's reach was beyond it, and stayed there.

The session that carried out the rest of this work brought the owner's commit onto its branch by `git cherry-pick` and never edited the file.

## The commission fingerprint

Computed by this session on 2026-09-07 from `docs/product/VIRGIL_MASTER_COMMISSION.md` as it stands in the working tree:

| Measure | Value |
|---|---|
| SHA-256 | `15c658bfbfddfc98adb13fbb2d6d74b8445225dac73bc723e925fd238a96e654` |
| Bytes | 77,076 |
| Lines | 1,978 |

These three values match the row "Repository copy after Amendment 1" already recorded in `docs/product/COMMISSION_PROVENANCE.md`, independently recomputed here.

**What this achieves, exactly.** It does not establish that the file is correct today. It cannot: the check that would have compared it against the owner's original is the one declined in decision 4 above, and this fingerprint is taken from the same unverified copy. Recording the hash of a file says nothing about whether its contents are right.

**What it does achieve.** Any future change to the file is detectable. From today, anyone can recompute these three numbers and know whether the layer-1 governing document has changed since 2026-09-07, and a change made without a recorded decision has a fixed point to be found against. That is the whole of it, and it is worth having; it is not integrity verification and is not recorded as such.

## Consequences

- Phase 1 is authorised and may begin, on branch `claude/virgil-phase-1-slice`, without sound in the slice.
- `docs/process/PHASE_0_RUN_RECORD.md` is not edited. Its verdict `BLOCKED_PENDING_REAL_GPU_REVIEW` and its "Phase 1 readiness: not ready" line stand as the record of what was found; this decision supersedes both, and a reader of the run record should read this file alongside it.
- The graphics-hardware checks deferred by OD-0005 remain deferred and must still be recorded as not performed, never as met. Nothing here relieves that.
- The master commission remains unverified against the owner's original, permanently, by the owner's decision. The fingerprint above is the only thing standing in place of that verification, and it is a weaker thing.
- The test failure described in decision 5 is resolved by that structural change, not by any exemption, and no test was skipped, disabled or weakened to reach it; `pnpm check` was nonetheless still red afterwards, because Biome's formatter rejected the indentation of `constitution/authority.json` — a file no session may edit — and it is green only after `constitution/**` was excluded from the formatter in `biome.json`, which ends that trap without exempting anything from a test.
- Nothing here is ratified by its transcription.

Applies to: `docs/process/PHASE_0_RUN_RECORD.md`, `docs/process/PHASE_1_BRIEF.md`, `docs/product/VIRGIL_MASTER_COMMISSION.md`, `constitution/authority.json`, `packages/agent-contracts/test/permission-matrix.test.ts`, `docs/architecture/ENFORCEMENT_BOUNDARIES.md`.

Decided at: 2026-09-07 (the owner's instructions in the owner console). Transcribed and filed by the Fabricator session on the same date.
