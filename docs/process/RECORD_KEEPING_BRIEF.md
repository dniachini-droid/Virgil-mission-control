# Record-keeping repair — twelve findings that exist only on branches, and six decisions that exist only in a chat

**Status: proposed, not started. Nothing in this document is authority.**

**Drafted by the session that built `claude/virgil-foundation-repair`, at the owner's request on 2026-09-12.** That session is not independent of the work this brief follows from, and the brief is a proposal to the owner rather than a finding against anybody.

This is not a third repair cycle on candidate `ec53d98`. `constitution/authority.json` sets `maxCyclesWithOwner: 2` and two have run; the final Keeper review said explicitly that none of its four findings warrants breaching that, and this brief agrees and repairs none of them. It is a new, bounded piece of work with its own candidate and its own review.

**It could be read as routing around the repair limit, and that reading deserves an answer rather than a denial.** What distinguishes it: it repairs no finding, changes no guard, and closes nothing. Every finding named below stays exactly as open as it is today. What it does is stop three sets of records from depending on things that are about to disappear.

## The problem, in three sentences

**Twelve findings — `KXR-01` to `KXR-12` — have their text only in review documents on branches nobody has merged**, and eight of them are in no register anywhere. **Four of those findings describe ways the register's own guards can be walked past**, and two of them are false claims waiting to happen rather than theory. And **the register has no word for a claim withdrawn while the gap it exposed still stands**: `KXR-01` reads `repaired` because a sentence was corrected, `KXR-07` reads `open` because the thing that sentence exposed is untouched, and they are one gap wearing two statuses.

### Finding one, and how to check it

Run `git log --oneline origin/main..claude/virgil-foundation-repair` and read `docs/process/FINDINGS.md`. Twelve `KXR` findings have been raised across three reviews. Four are in the register. `KXR-09` to `KXR-12` are in no file on any branch that is not a reviewer's.

The four review documents live on `claude/keeper-virgil-review-qu3pvr` (`5edc9ff`), `claude/keeper-review-candidate-23af6acf-3ed0pw` (`5f932ab`), `claude/keeper-virgil-review-final-axici6` (`65abd44`) — and none of those branches is merged. Delete them and twelve findings' full text goes with them.

**That is `XR-02` returning by the back door**, in the branch built to end it. `constitution/REVIEW_POLICY.md`: findings are *"never renumbered, merged silently or dropped."* A finding whose only copy is on a branch somebody will tidy up is a finding already half dropped.

### Finding two, and how to check it

`grep -rl "2026-09-12" docs/decisions/` returns nothing. Six owner decisions were taken that day — the `XR` prefix, forward-only seeding of the register, the branch name, the build-and-review split, the `KXR` prefix, and two paths outside a contract's permitted list — and none is filed. Two reviewers found this independently, from opposite directions, without seeing each other's work: `KXR-01` and `KXR-07`.

**And it is deliberately not repaired by this work.** A decision record was drafted and the owner was asked the one question that decides whether it is worth anything — would he read it before it was committed. **He answered no**, on 2026-09-12, and that answer is the reason no `OD-0016` appears below.

`docs/decisions/OD-0006` states the mechanism's cost: *"the owner reading their own decision records is the only detection of a false one."* Remove that reading and a filed record is an unverified claim sitting at authority layer 1, which is the precise shape of `SA-G-03` — the only blocking finding this project has had, where a fabricated owner decision passed every machine control in one command. A record that looks verified and is not is worse than the corrected sentence standing today.

So `KXR-01` and `KXR-07` stay open, the decisions stay in commit messages and run records described as what they are, and this brief records the refusal rather than working around it. It is reversible the day the owner wants it reversed.

### Finding three, and how to check it

Read the two rows. `KXR-01` is `repaired` and `KXR-07` is `open`, and they are the same gap. The final reviewer raised this as an observation rather than a finding: the vocabulary has no word for *"the claim was corrected, the gap it exposed is still there."* A reader scanning statuses sees one closed item and one open one, and the register is quietly overstating itself by exactly one row.

## What gets built

1. **The review documents copied into `docs/process/`, byte for byte**, so twelve findings' text stops depending on branches surviving. A check holds each copy to the SHA-256 of its source, so a copy quietly summarised or tidied fails.
2. **`KXR-09` to `KXR-12` in the register**, pinned. `KXR-11` and `KXR-12` are repaired here; `KXR-09` and `KXR-10` are repaired here for the reason given below; nothing else is.
3. **`KXR-09` repaired: the pin holds every cell, not one.** The final review showed all twenty detectors can be flipped from `review` to `gate` with the suite green — making the register assert the gate engine caught every finding in a repository whose engine `ENFORCEMENT_BOUNDARIES.md` records as having no adapters. `FINDINGS.md` calls that column *"the point of the register rather than a decoration on it"*, and it is false in the one direction the column exists to detect. That is not a future risk; it is a claim the register will make the moment anyone edits it carelessly.
4. **`KXR-10` repaired: a pointer must be somewhere other than the register, and ids match whole.** Twenty rows repointed at `FINDINGS.md` pass today, because every row contains its own id. And ids match as substrings, so a file naming only `KXR-01` satisfies `XR-01` — confirmed by running it. That is the check `KXR-08`'s repair rests on.
5. **`KXR-11` repaired:** a finding in a second table headed anything but `id` is invisible to every check. Every table in the file is read, or the file refuses to parse.
6. **`KXR-12` repaired:** `FINDINGS.md` tells readers that adding a row means two edits *"and nothing else"* and lists what the test enforces without mentioning two of the guards. The instructions are made true.
7. **All five attributes required of a new finding, forward-only.** `REVIEW_POLICY.md` is layer 2 and requires a stable identity, a severity, an affected surface, reproduction evidence and the criterion or authority concerned. The register carries two, which is not a preference but non-compliance. New rows carry five; the ten historical rows stay incomplete and the register says which they are, because back-filling severity and reproduction for findings whose text states neither is the guessing the forward-only rule exists to exclude. That is `KXR-03`.
8. **A word for the third finding.** `withdrawn_gap_open` added to the vocabulary for a claim corrected while its gap stands, and `KXR-01` moved onto it — a status *changing*, which costs an edit to `PINNED` in the same commit, exactly as `KXR-06` requires.

## What it does NOT do

- **It does not file an owner decision record.** See finding two. The owner was asked whether he would read one and said no, and a record whose only verification is a reading that will not happen belongs at no authority layer at all.
- **It does not close `KXR-01` or `KXR-07`.** `KXR-01` moves to `withdrawn_gap_open`, which is a more accurate word for where it already is, not a repair. `KXR-07` stays `open`.
- **It departs from the final review on one point, and says so.** That review grouped `KXR-09` and `KXR-10` with `KXR-03` as one design question and advised against answering two thirds of it. This brief answers all of it — `KXR-03` included, forward-only — which removes the objection. `KXR-09` and `KXR-10` are also not really design: they are the `KXR-06` pin being incomplete, and they make the register capable of asserting something false today.
- **It changes no guard and no gate.** Nothing under `packages/gate-engine/src/`, and no existing assertion is loosened or removed.
- **It does not touch `constitution/`, the master commission, or `knowledge/raw/`.**
- **It does not make `OD-0016` verified.** `OD-0006` states the cost plainly: nothing enforces that a transcription is faithful, and the owner reading their own decision record is the only detection of a false one. A filed record moves the gap from *nothing exists* to *one thing exists and the owner can check it*. That is smaller than it sounds and is not recorded as more.
- **It does not close `KXR-01` or `KXR-07` by being filed.** Whether `OD-0016` closes them is the owner's judgment after reading it, and a session must not record that judgment on his behalf — which is the whole substance of `KXR-01`.

## Permitted paths

```
docs/process/FINDINGS.md
docs/process/KEEPER_*.md
apps/mission-control/test/findings-register.test.ts
docs/process/RECORD_KEEPING_BRIEF.md
```

The last is this document, committed before the work as the record of what was asked. It is named here rather than left for `diff_within_permitted_paths` to flag — that check was satisfied twice on the previous branch by prose, which is `KXR-07`, and naming the exception inside the contract is the smallest honest improvement available without an owner decision.

## How you will know it works, without taking anyone's word

1. **`pnpm check` passes in CI on the candidate SHA**, not in the session that wrote it.
2. **Every id from `KXR-01` to `KXR-12` is in the register and in `PINNED`.** Countable by reading, in under a minute.
3. **Delete one of the new rows — the suite must fail, naming it.** Quoted in the run record.
4. **Corrupt one copied review document by a single character — the SHA-256 check must fail, naming the file.** A copy nothing verifies is a summary wearing a quotation's clothes.
5. **Re-run the final review's own four attacks and watch three of them now fail.** Flip all twenty detectors to `gate`; rewrite a summary; repoint every row at the register itself; point `XR-01` at a file naming only `KXR-01`. Each must be refused, by name, and the output quoted in the run record. The fourth — a second table headed anything but `id` — must also fail.
6. **Nothing is claimed about the owner's decisions that a reader cannot check.** No `OD-*` is added. The run record describes them as instructions given in the owner console, unverified, with `KXR-01` and `KXR-07` left open.

## Cost, stated before it is spent

Near zero. Four document copies, one decision record, four register rows, one status word, and roughly a dozen assertions. No browser, no new job, no new workflow, no GitHub API call, no new dependency. It runs in the `fast` job every push already pays for.

## Size

Small.

## What I need from you

**All four questions this brief opened with were answered by the owner on 2026-09-12, and the answers are written into it above rather than left pending.**

1. **Would he read a decision record before it was committed? — No.** So none is filed, and `KXR-01` and `KXR-07` stay open. Finding two records this as a refusal rather than an oversight.
2. **Must a finding carry all five attributes `REVIEW_POLICY.md` requires? — Yes, forward-only.** The owner delegated the choice; the session's answer, stated so it can be overruled, is that `REVIEW_POLICY.md` is layer 2 and already requires five, so the register carrying two is non-compliance rather than a preference, and the only real question was whether compliance starts now or is faked backwards. It starts now.
3. **The new status word — `withdrawn_gap_open`**, as drafted.
4. **Branch `claude/virgil-record-keeping`.** The session that built `claude/virgil-foundation-repair` builds this; a session that has not seen it reviews it.

**What remains open and is the owner's alone:** whether `KXR-01` and `KXR-07` are ever closed. Nothing in this work can close them, and nothing in it pretends to.
