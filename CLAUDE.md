# Virgil Mission Control — session rules

Read this file before any change. It applies to every Claude Code session and subagent in this repository.

## Authority order

When documents conflict, the higher one governs:

1. `docs/product/VIRGIL_MASTER_COMMISSION.md` (including its amendments register) and owner decisions in `docs/decisions/OD-*.md`.
2. `constitution/` (VIRGIL_CONSTITUTION, AUTHORITY_TIERS, REVIEW_POLICY, REPAIR_LIMITS, STATE_LANGUAGE) and `constitution/authority.json`.
3. Accepted ADRs in `docs/decisions/ADR-*.md`.
4. `docs/architecture/`, `docs/security/`, `docs/testing/`, `docs/process/`.
5. `knowledge/wiki/` explains; it never overrides the layers above and never holds live operational values.

Only the owner may change layers 1 and 2. A session that finds a contradiction reports it; it does not resolve it silently.

## Hard limits for every session

- **Change only this repository.** Never modify, push to, open a pull request on, or in any way write to another repository. Reading and cloning one is permitted — the owner decided this on 2026-09-12 (`docs/decisions/OD-0016`), replacing the blanket prohibition that stood here. What a session may never do is act on another repository, and that half of the rule is unchanged and absolute.
  - **Why it changed.** The old line read *"Never read, clone or modify any other repository"*, and by 2026-09-12 it had been set aside three times in one day by owner authorisation — to compare `obra/superpowers`, `NicholasSpisak/second-brain` and `toolboxmd/karpathy-wiki` — and then contradicted outright by a section ten lines below installing a plugin every session loads. That is `KXR-20`. A rule broken whenever it is inconvenient teaches sessions that rules are negotiable; a rule that contradicts itself makes them guess which half to obey. Both are worse than the honest narrower rule.
  - **What reading another repository still does not confer.** Nothing from it is authority here. Its code is not copied without checking its licence, and a repository with no licence is read and not copied at all. What is taken is recorded in the work that takes it.
- Commit only to the branch assigned to the session. Never touch `main`. Never merge, deploy, or connect credentials unless the owner explicitly authorised it in writing for that session.
- **A session that has finished building opens its own pull request, and should.** The owner decided this on 2026-09-13 (`docs/decisions/OD-0018`), replacing a rule that made a session stop and ask. Two reasons, both his:
  - **The full check set only runs on a pull request.** A push runs the fast half. Work that sits on a branch waiting for permission is work whose most important checks have not run, and a session reporting "built and verified" in that state is reporting less than it thinks.
  - **Review happens through the pull request.** Asking permission to open one is asking permission to be reviewed, which is the wrong thing to gate.
  **What this does not loosen.** Opening a pull request merges nothing, deploys nothing and moves no branch. The gate that matters is unchanged and is in `## Merging` below: `merge approved`, naming the pull request, in the owner's own turn. A session still may not review its own work, and a draft or open pull request is not an approval of anything.
- No paid services, subscriptions or commercial assets.
- Never write secrets, tokens or credential material into files, logs, fixtures or the interface.
- Never copy live operational values (HEAD, SHAs, PR status, check results, agent status, gate eligibility) into `knowledge/wiki/`. Link to the authority instead.
- `knowledge/raw/` is append-only. Never edit or delete a raw source record.
- Never skip, disable or weaken a test to make a check pass.
- Every role performs one hop. A session assigned one role does not perform the next role's work.
- A builder's success report is not evidence. Deterministic checks and independent review are.

## Merging

**No session merges anything into `main` unless the owner has written `merge approved` in the owner console, in that turn, naming the pull request.**

Not implied by "yes", not by "go", not by "clean it up", not by having authorised the pull request that carries the work, and not by having said it about a different pull request an hour earlier. The phrase, and which pull request it applies to. It authorises that one merge and expires with it.

**A session may propose a merge, and should.** The owner's instruction of 2026-09-12 is that a session does the merging and asks first — it suggests when the moment is right, says what is and is not reviewed, and waits. What it may not do is decide.

**What enforces it, in descending order of how much it is worth:**

1. **GitHub branch protection requiring an approving review from the owner.** The only one that cannot be touched by a session, because it lives in the repository's ruleset rather than in the tree. It is the one that matters.
2. **The `ask` rules in `.claude/settings.json`** — `mcp__github__merge_pull_request`, `mcp__github__enable_pr_auto_merge`, `Bash(gh pr merge*)`. `ask` rather than `deny` deliberately: a flat refusal would stop the owner having a session merge on his word, which is what he asked for. These stop the tool and put the decision in front of him. They are enumerated, so a route nobody listed stays open — `curl` against GitHub's API is the obvious one and is not enumerable.
3. **`Bash(git merge*)` stays denied outright.** A local merge is not a thing a session here has any reason to do.
4. **This paragraph**, which works on a session that reads it and means nothing to one that does not.

**And one thing this does not do, found by doing it rather than by reasoning about it.** `.claude/settings.json` and `.claude/hooks/` carry `Write` and `Edit` deny rules so the list cannot be widened by the party it constrains — `SA-G-03`, whose auditor demonstrated that gap rather than arguing it. **Those rules did not stop the session that wrote this paragraph from editing that same file**, because it used `python3` from `Bash`, and the rules name the `Write` and `Edit` tools rather than the file. The same is true of `sed -i`, `cat >`, `tee`, and every other way a shell writes.

So the self-protection is thinner than it reads. It stops an honest session reaching for the obvious tool. It does not stop a determined one, and it is written down here as a hurdle rather than a wall — which is the only thing that makes the difference safe to rely on.

## Superpowers

`obra/superpowers` is installed at project scope (`.claude/settings.json`), so every session on this repository has it — including the ones `instruct.yml` runs in a fresh container. It is a methodology: brainstorming, writing plans, test-first development, systematic debugging, verification before claiming completion. MIT licensed, free, and it makes a session build better.

**It advises on method. The hard limits above govern.** Where a Superpowers skill and this file disagree, this file wins, and a session that finds them in conflict reports it rather than choosing. Superpowers does not widen what a session may touch, does not relax the branch rule, and does not make a session's own verification into evidence — its `verification-before-completion` skill produces a better builder's report, and a builder's report is still not evidence here.

**What it does not replace:** the roles in `.claude/agents/`. Superpowers is how a session works; a role is what it is allowed to do. A Fabricator with Superpowers is still bounded by its permitted paths, still hands off to an independent reviewer, and is still counted against the repair limit.

**One thing to know about it:** the marketplace entry tracks `obra/superpowers` with no pinned version, so a change they publish reaches this repository's next session without anyone here approving it. That is the ordinary cost of a live plugin and it is written down rather than discovered.

## Repository map

- `packages/repo-checks/` — checks about the repository itself: the findings register, the kept reviews, the test cache's declared inputs, the conversation contract.
- `packages/domain/` — states, events, transition table, reducer, replay.
- `packages/gate-engine/` — deterministic eligibility and integrity checks over evidence objects.
- `packages/agent-contracts/` — Zod schemas for every structured contract; exported to `schemas/`.
- `packages/knowledge-graph/` — ontology, derivation of the provenance graph from files and events.
- `packages/test-fixtures/` — defective candidates, event logs, knowledge scan cases.
- `constitution/` — governance authority. `.claude/agents/` — versioned role definitions.
- `knowledge/` — raw sources, wiki, outputs, SCHEMA, index, log.
- `docs/` — product, architecture, process, security, decisions, testing.

## Commands

```sh
pnpm install          # uses the committed lockfile
pnpm check            # biome lint, typecheck, unit tests across the workspace
pnpm tier             # derive this change's risk tier from its changed paths
pnpm --filter @virgil/agent-contracts export-schemas   # regenerate schemas/*.schema.json
pnpm --filter @virgil/knowledge-lint run lint           # Mind Scan over knowledge/
pnpm --filter @virgil/knowledge-graph export-seed-graph # regenerate the committed seed graph (a test fails when stale)
```

## What this repository is

**A build-and-review system, and nothing else.**

It scopes work into a bounded contract, plans it, builds it inside permitted
paths, proves each check can fail, hands the candidate to a reviewer with no
stake in the answer, records every finding where nothing can drop it, and stops
for the owner at the decisions that are his. It is meant to be pointed at any
project.

**It was first pointed at one:** a 3D interface called Virgil Mission Control,
which gave the repository its name. On 2026-09-13 the owner deleted it —
*"I want everything from the UI app gone"* — along with its hosting, its
endpoints, its assets, its screenshots, its visual contract, its phase records,
its reviews and the decisions taken about it.

**Why.** Its browser checks were the entire cost of working here: four viewport
jobs, a hosted build and two owner builds, between five and twelve minutes each.
A one-file documentation change waited twenty minutes for four browsers to
confirm a 3D world still rendered at 390 pixels. The repository's own checks take
thirty-five seconds. And 432 of 436 megabytes were its models and screenshots.

**What it cost, said plainly.** There is no longer a way to type an instruction
at a web page and start a run. Instructing this repository means starting a
session. The visual language, the art direction and the phase-one record are
gone from the tree.

**What could not be removed, and no session can remove.** The application is
still in this repository's *history*. `git push --force` is denied to sessions,
and rewriting history would break every review record pinned to a commit. It is
whole at `a182b196`.

**And one thing deliberately left.** `docs/product/VIRGIL_MASTER_COMMISSION.md`
and the owner decisions approving each phase mention the application, because it
is what the phases built. They are authority layer 1, they are the owner's own
records rather than the application's, and `CLAUDE.md` reserves them to him.

## Phase status

**Phase 0 and Phase 1 are finished and their subject is deleted.** What survives
them is the machinery: twenty gates each proved able to refuse, a findings
register nothing can drop from, risk tiers derived from a diff rather than
claimed, and a knowledge layer whose links are checked in both directions.

**What is in flight** is recorded in `docs/process/ROADMAP.md`, and what only the
owner can do is in `docs/process/OWNER_TODO.md`. Open findings are in
`docs/process/FINDINGS.md`, which is read on every `pnpm test` and which no
session can quietly close.
