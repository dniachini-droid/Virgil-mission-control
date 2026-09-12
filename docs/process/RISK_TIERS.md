# Risk tiers — how much process a change gets, decided by the change

**Authority: layer 4.** This implements `constitution/REVIEW_POLICY.md`, which is
layer 2 and governs. Where they disagree, the constitution wins and this file is
wrong.

## The rule this implements, which already governs and was never followed

`constitution/REVIEW_POLICY.md`:

> The Architect's risk classification selects the smallest adequate formation.
> Low-risk ordinary change: Keeper alone. Higher consequence: independent
> specialists in parallel … then the Arbiter. **The full roster is never
> activated by default.**

Every piece of work in this repository's history has activated a full formation.
That is the one thing the rule forbids. On 2026-09-12 a change of two test files,
a markdown register and a plugin install took **eleven independent reviews** and
produced thirty-odd findings, most of them about the reviewing machinery rather
than about anything the repository does. The owner's words, that day:

> *"This is meant to be a system that makes programming reliable … working means
> it doesn't stop the project from going forward."*

He was right. Eleven rounds is not a system proving itself; it is a system with
no idea how much care a change deserves, applying the maximum to everything.

## The three tiers

| tier | what it is | what it costs |
|---|---|---|
| **1 — routine** | documentation and prose, and nothing else | the checks pass, and it merges. No brief, no independent review, no run record. |
| **2 — ordinary** | code that changes behaviour inside an existing boundary | one independent review. A brief only when a reviewer would otherwise have to guess the intent. |
| **3 — governed** | anything that changes **what a session may do, or what a check can catch** | the full treatment: brief committed first, independent review, run record, red-before-green, register rows. |

**Tier 1 skips the ceremony — the brief, the independent review, the run
record — and one narrow class of check.** A tier-1 change with a red suite does
not merge, exactly like every other change.

### The one amendment, and the line it draws — `KXR-42`

This section first read *"tier 1 still runs every machine check … never the
verification."* It was written before anything consumed the tier, and the first
change the system classified — a single documentation file — waited twenty
minutes for four browsers to confirm the 3D world renders at 390 pixels.

**A check may be skipped only when the diff provably cannot change its inputs.**
Not when it seems unlikely to, and not when it would be convenient. The V11 and
hosted builds are compiled from `src/`; a markdown file is not an input to
either, so running them over a prose change verifies nothing that could have
moved. `.github/workflows/checks.yml` skips those two at tier 1 and nothing
else.

**What still runs at every tier, and why it must.** `turbo.json` declares
`docs/**` and `knowledge/**` as inputs to the test task, so a prose change
really can change what the suite sees — `packages/knowledge-graph` derives its
graph from those files. The suite, the Mind Scan and the standalone check are
therefore never gated on the tier, and
`packages/repo-checks/test/tier-gating.test.ts` fails if anybody gates them.

**The derivation fails safe.** A bad base, a missing ref, an unreadable output
or an unanticipated exit code all derive tier 3 and run everything. The
expensive path is the default; the cheap one has to be earned.

**Merging is unchanged and remains the owner's.** No tier merges itself. The
phrase is `merge approved`, naming the pull request, in that turn.

## Tier 3 is a closed list

A tier system whose top tier is a judgement call collapses into whichever tier is
convenient. The list lives in `packages/gate-engine/src/tiers.ts`, each entry
carrying the authority it answers to, and every path on it has produced a real
finding in this repository's history:

- `constitution/**` — authority layer 2
- `docs/product/VIRGIL_MASTER_COMMISSION.md` — authority layer 1
- `docs/decisions/OD-*`, `docs/decisions/ADR-*` — layers 1 and 3
- `CLAUDE.md`, `.claude/**` — what every session may and may not do
- `.github/workflows/**` — which checks run at all
- `packages/gate-engine/src/**` — what a gate refuses
- `packages/domain/src/**` — which transitions are legal
- `netlify/functions/**` — runs with the owner's secrets in scope
- `docs/process/FINDINGS.md` — the one file whose job is to be trusted
- every file whose job is to make a check able to fail, named individually

**The highest tier wins, always, and there is no averaging.** A diff touching any
governed path is tier 3 whatever else it touches: the cheap ninety percent of a
change does not dilute the expensive ten.

## The tier is derived, never declared

`tierOf(paths)` reads the changed paths. It does not read a claim. A brief saying
*"this is tier 1"* while the diff edits `.claude/settings.json` is `KXR-07`
wearing a new hat — a contract satisfied by trusting the candidate about itself.

A brief **may raise its own tier and never lower it.** A builder who thinks their
change is more consequential than its paths suggest is a builder to agree with.

```sh
pnpm tier                      # derive the tier of the working branch against main
pnpm tier --claimed 1          # and refuse a claim lower than the derivation
```

## What this does not do, said plainly

- **It does not lower the bar on anything governed.** The work that felt heavy
  yesterday is exactly as heavy today. What changes is everything else.
- **It does not read content, only paths.** A behavioural change smuggled into a
  file nobody listed is tier 2 here however dangerous, and a comment fixed in
  `gates.ts` is tier 3 however trivial. Paths are a coarse proxy for
  consequence, chosen because they cannot be argued with, not because they are
  precise. **This is the honest limit of the thing and it is not a small one.**
- **It does not remove the owner from any decision he has today.**
- **It does not amend `REVIEW_POLICY.md`.** Implementing a rule is not amending
  it. If a reviewer thinks that reading is wrong, that is a finding and the owner
  decides; a session must not resolve it.
- **It does not claim to be calibrated.** Three tiers and a path list are a first
  cut. The test is whether tier-1 work starts moving in minutes while tier-3 work
  keeps finding what it has been finding.
