# OD-0017 — The knowledge-lessons follow-up, and a prefix for findings a builder raises

**Authority: layer 1.** Filed under the mechanism `docs/decisions/OD-0006` describes — the owner instructs in the owner console, the instruction is transcribed, a session files the record.

**Owner:** Dan Iachini. **Date of the instruction:** 2026-09-13. **Filed:** 2026-09-13. **Branch:** `claude/virgil-knowledge`.

## The instruction, as it was given

A session reported four loose ends at the end of the knowledge-lessons build and asked the owner to settle them. His reply, in full and unedited:

> "Fix those four things. I take your recommendation as to the best way forward. And open the pull request and give me the brief for a new window."

**Nearly all of the detail below is a session's choice, not his words.** He delegated the "best way forward" and did not specify any of it. `OD-0006` states what that costs: *"the owner reading their own decision records is the only detection of a false one."* Everything a session decided under that delegation is marked **(delegated)** so he can reverse it by reading this page.

**What he did not say, and what is therefore not authorised here:** nothing about merging. No merge is proposed by this record, and the phrase `merge approved` naming a pull request has not been written.

## What was asked, item by item

The four were put to him in plain language. Each is restated here in the repository's own terms, with what was done.

### 1. The brief contained two defects that made it impossible to follow (delegated)

`docs/process/KNOWLEDGE_LESSONS_BRIEF.md` is amended in two places, and **the amendment is after the fact.** A reviewer should weigh the delivered work against the brief **as it stood when the work was done**, which is why both original passages are quoted here rather than only replaced.

**Defect one — the permitted paths omitted a file the work could not avoid.** The list did not contain `packages/test-fixtures/knowledge/seed-graph.json`. It is a derived artifact: `packages/knowledge-graph/scripts/export-seed-graph.ts` writes it and `packages/knowledge-graph/test/seed-graph.test.ts` fails while it is stale. Adding pages under `knowledge/wiki/lessons/` — which the brief commissions — changes the graph it is derived from. So the brief's first success criterion (`pnpm check` passes) and the brief's permitted paths could not both hold. The building session regenerated it with the repository's own command, declared it in the run record before pushing, and reported the gap rather than treating it as its own call. **That reporting was correct and the fix is the owner's**, which is this line.

The permitted-paths block gains the file and a sentence saying why. This is the finding `BR-02`.

**Defect two — criterion 7 named a mechanism the permitted paths put out of reach.** It read:

> 7. **Every new guard goes into the mutation manifest as it is written**, not retrofitted.

`apps/mission-control/e2e/mutation-manifest.ts` is outside the brief's permitted paths, is itself a governed tier-3 path, and runs `vitest` with its working directory set to the application — whose configuration includes `test/**` only. A guard in `packages/knowledge-graph` cannot be named in it without editing it *and* teaching it a second working directory. The criterion is rewritten to require the guard be **watched failing, by name, before it passes**, to keep the manifest where the manifest can reach, and to say plainly that a hand-run is weaker than a manifest entry. This is the finding `BR-01`.

**Extending the manifest to reach the other packages is real work and is not smuggled into this.** It belongs on the roadmap beside item 3, "separate the build system from the thing it builds."

### 2. A prefix and a detector word, so a builder's finding has somewhere to live (delegated)

`docs/process/FINDINGS.md` requires every finding to have a stable identity, and says: *"The identity is governed — `REVIEW_POLICY.md` — so a session does not mint a prefix for itself."* Its `found by` column takes `gate`, `review` or `owner` and nothing else.

A session building work, that finds a defect in the contract binding it, is none of the three — and filing under `review` would make the register say a review caught something no review has seen. The column is described in the register as *"the point of the register rather than a decoration on it"*, so that is not a cosmetic problem. The result was that four real findings sat in a run record instead of in the one file whose job is to hold them, which is `XR-02` in miniature.

**Chosen under the delegation, and the owner can overrule either by writing a different word here:**

| | chosen | why |
|---|---|---|
| prefix | **`BR`** — builder-raised | two letters, the shape `XR` and `KXR` already use, and it names the detector rather than the piece of work, so it does not expire |
| detector | **`builder`** | the fourth word in the `found by` vocabulary. `gate`, `review`, `owner`, `builder` |

**A session minting its own prefix is exactly what the register forbids, and this one is minted under delegation rather than under its own authority.** That distinction is only as good as this page, and this page is the thing to read if it is ever in doubt.

Five findings are filed under it — `BR-01` through `BR-05` — each carrying all five attributes `constitution/REVIEW_POLICY.md` requires, since the forward-only rule of 2026-09-12 applies and none of them is exempt. Four read `repaired` and one, `BR-05`, is open and is the owner's.

### 3. The founding document that has been fully absorbed — **half done, and the half that is not is the point**

The new lesson check reported, on its first run and without anybody pointing at it:

> 10 wiki pages rest on `src-master-commission` and its record still reads `ingestionState: sealed`.

It is correct. The rule adopted is that five or more pages resting on a raw source means the source has been absorbed, and its record advances to `ingestionState: compiled` so readers go to the pages rather than back to the source.

**The owner then authorised it outright.** Asked nothing further, he added, in the owner console on the same day:

> "I approve touching anything that I just said. Don't ask again."

**The change was attempted under that authorisation and the tooling refused it.** The `Edit` tool returned:

```
File is in a directory that is denied by your permission settings.
```

`.claude/settings.json` carries `Write(./knowledge/raw/**)` and `Edit(./knowledge/raw/**)` as hard denials rather than prompts, and `.claude/settings.json` is itself denied to every session, so a session cannot lift the lock either. **That is the control working.** The owner's word and the machine's configuration disagreed and the machine won, which is the right order when the machine is the thing he set up deliberately.

**`CLAUDE.md` records that those deny rules name the tools and not the file**, so `python3` from `Bash`, `sed -i`, `cat >` and `tee` all reach past them. **None was used, and the reason is written here rather than left to be assumed.** That paragraph in `CLAUDE.md` exists to say the self-protection is a hurdle and not a wall; the only thing that makes a hurdle worth anything is a session that stops at it while holding a verbal permission to jump. This is that case, on the record, so the owner can weigh it.

That leaves the state itself unchanged — `BR-05`, open — and one thing that could be repaired: the two documents disagreeing about whether anybody may make the change at all. `CLAUDE.md`, hard limits:

> `knowledge/raw/` is append-only. Never edit or delete a raw source record.

`knowledge/SCHEMA.md`, raw source records:

> records are created, never edited or deleted, **except that `ingestionState` advances by appending a new record version line in `log.md` and updating that one field**

The second describes a mechanism that requires editing a raw record. The first forbids editing a raw record. A session reading both could not tell which half to obey — which is `KXR-20` in a new place, and `CLAUDE.md` itself says why that is worse than either rule alone: *"a rule that contradicts itself makes them guess which half to obey."*

**That contradiction is repaired and the repair is a correction, not a permission.** Both lines now say the same thing, and what they say is what the machine already does: raw records are append-only; `SCHEMA.md`'s one exception exists; **and it is the owner's alone**, because `.claude/settings.json` denies every write under `knowledge/raw/**` to every session. Nothing was widened. A session reading either file now learns the true state instead of guessing. That is the finding `BR-04`, **repaired** — by the session that raised it, on its own branch, which the register says plainly is not evidence.

**The underlying state is untouched and is a separate finding.** `src-master-commission` still reads `ingestionState: sealed` with ten pages resting on it, and the lesson check reports it on every run as a minor, non-blocking finding. That is **`BR-05`, open**, and it stays open until the owner acts. Three ways, so it is a choice and not an essay:

1. **He edits the one field himself** — `knowledge/raw/src-master-commission.source.md`, `sealed` → `compiled` — and appends the line to `knowledge/log.md`. Nothing else changes. This is the one `SCHEMA.md` already describes.
2. **He changes `.claude/settings.json`** to make `knowledge/raw/**` an `ask` rather than a `deny`, and a session can then do it with him approving each time. That widens what every future session may reach and should not be done for one field.
3. **He decides the threshold rule is wrong** and it comes out of `packages/knowledge-graph/src/lessons.ts`. The signal disappears and so does the thing that noticed.

Until one of those, the finding is a true non-blocking signal on every run. It stops no check and blocks no work.

### 4. The roadmap entry (delegated)

`docs/process/ROADMAP.md` item 4 read *"Brief written and queued"*. The work is built. The line is updated to say so and to point at the run record. `PHASE_1_BACKLOG.md` names the habit this avoids: *"leave a superseded document standing and add a note beside it. The result is more to read and less that is true."*

## Paths this record authorises, named before they were taken

The knowledge-lessons brief governs the build. It does not govern this round, so this record carries its own list rather than widening that one:

```
docs/decisions/OD-0017-knowledge-lessons-follow-up.md
docs/process/ROADMAP.md
docs/process/KNOWLEDGE_LESSONS_BRIEF.md
docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md
docs/process/FINDINGS.md
packages/repo-checks/test/findings-register.test.ts
CLAUDE.md
knowledge/SCHEMA.md
```

**`CLAUDE.md` is on that list and a reader should stop at it.** `KXR-18` is the finding that a session once changed the two files declaring this repository's own limits under no contract at all. This is a contract, filed before the change and naming the change: one hard-limit line, corrected to say what the tooling already enforces, widening nothing. A reviewer who thinks a session should never touch that file whatever the authorisation is raising a real finding, and it is theirs to raise.

Everything outside that list is untouched by this round. `knowledge/raw/`, `constitution/` and the commission are untouched by the whole branch — `knowledge/raw/` because the tooling refused, which is recorded above.

## What this is not

**It is not a repair cycle.** `constitution/REPAIR_LIMITS.md` counts cycles per candidate lineage, and a cycle begins with an independent review. **No review has seen this work.** This is the owner adding scope before review, not repairing findings a reviewer raised, so no cycle is consumed and none is authorised. The first review, when it comes, is the first review.

**It is not a review, and it is not evidence.** The session that wrote this built the thing it is writing about. `CLAUDE.md`: a builder's success report is not evidence. Four findings filed by a builder against its own contract are a builder's account of its own work, and a reviewer should treat them as the starting point rather than the answer.

**It is not a merge and does not propose one.** The owner asked for a pull request, which is a request to be shown the work. It is not `merge approved`, and nothing here reads it as one.
