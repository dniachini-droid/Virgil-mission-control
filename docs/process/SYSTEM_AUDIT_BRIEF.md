# The system audit — reviewing the machine rather than what it makes

**Status: proposed, not started. Nothing in this document is authority.** It is written now so that it is not lost, and because the owner asked for the tension inside it to be named before anyone starts rather than discovered halfway.

## Where it came from

The owner, 2026-09-11:

> "I want a fully independent review of the efficiency of this system and what we designed earlier. Not now, but I want to make it a clean way to build things."

and, later the same day:

> "let's conduct an entire wide system audit and completely simplify things and take out the bulk while keeping the best bits to make it a clean, simplex strong system."

and on sequence and scope:

> "Let's fix. See it working then 1 and 2, and nothing gets grandfathered."

## The order, which is the owner's and is not negotiable by a session

1. **Fix.** Phase 2 slices four and five, to a Keeper `PASS`, merged.
2. **See it working.** The owner opens the Virgil command centre and looks. Not a screenshot, not a test report — him, on his device.
3. **Build 1 and 2** (below).
4. **Then this audit**, over everything, including 1 and 2.

**Nothing is grandfathered.** This document, the two mechanisms below, `CLAUDE.md`, the agent definitions, the verifiers, the wiki — all of it is in scope for deletion. A thing is not safe because it is old, because a Keeper once approved it, or because it is written down somewhere. The audit may recommend removing anything below authority layer 2.

## The two mechanisms to build first, and why they come before the audit

On 2026-09-11 three checks written by the building session **could not fail**. One modelled the single server configuration in which the defect it guarded is invisible; one searched page text for values drawn inside a 3D canvas; one counted things drawn whether or not anything had been read, passing once by timing and failing the honest build on the next run. A fourth — a unit test — asserted the defect outright while its own docstring, one line above, stated the opposite rule.

All four were found by hand, by choosing to look. That is not a system.

**1. A mutation manifest.** For every check, the exact edit to the product that must make it go red. A script applies each edit, runs that check alone, and **fails if the check still passes**. It is the red-before-green ritual, done by a machine instead of by a session's good intentions, aimed precisely at the places that matter rather than at random. Deliberately small.

**2. Swallowed-wait refusal.** A wait whose result is discarded — `.catch(() => {})` and its relatives — turns *"I gave up after sixty seconds"* into *"fine"*. Two of the three worthless checks had exactly that shape. The verifier sources are already read as text by existing tests; this is a few lines more, and it deletes a class of defect rather than adding a layer.

Both are built to be judged by the audit like everything else. If they have become ceremony by then, they go.

## The tension this audit must resolve, named before it starts

**"Take out the bulk" and "the record is the product" pull against each other, and an auditor told only the first will cut both.**

This repository holds roughly 228,000 words of prose across `docs/`, `knowledge/` and `constitution/`, and its source is about 26% comment by line. Two true things about that:

- **Some of it is the product.** This project's subject is the difference between evidence and a claim. The reason any statement it makes can be checked is that the reasoning, the findings, the owner's decisions and the corrections are written down where they were made. `OD-0006` exists because a mechanism with no record is a mechanism nobody can audit. Several comments in the source exist because a previous version of that comment was false and the correction is worth more than the tidiness. Delete that and the system still runs and stops being trustworthy — which is the only property it has that a weekend project does not.
- **Some of it is nobody-reads-it.** Prose written to discharge a feeling of thoroughness rather than to answer a question a reader will have. Records duplicated across three documents. Comments restating the line beneath them.

So the audit is not asked to minimise words. It is asked, for each body of prose, to answer one question: **what would a reader be unable to check if this were gone?** Nothing → cut it. Something → it stays, however long it is.

The same question in its operational form, for the machinery: **what would stop failing if this were deleted?** A rule nothing enforces is a comment; a check that cannot fail is decoration; a role nobody runs is a paragraph. Each should be cut or given teeth, and the audit should say which.

## What is already measured, so nobody starts from zero

| | measured 2026-09-11 | note |
|---|---|---|
| `.git` | **499 MB** | every CI job clones it before doing anything |
| Committed build artifacts | **192 MB across 22 HTML files** | belongs in releases, not commits |
| Prose across `docs/`, `knowledge/`, `constitution/` | **~228,000 words** | the question above applies to each body separately |
| App source | **26% of non-blank lines are comment** | deliberate; whether it is still earning that is the question |
| `CLAUDE.md` | 1,093 words | loaded every session and every subagent; not bloat |
| Agent definitions | 322–511 words each, one loads at a time | not bloat |
| Cost of one pull request | **112 machine-minutes ≈ $0.90** | stopped work once on 2026-09-11 |
| Mutation coverage | **none** | so "1,669 tests pass" is a claim about the tests |

The first two rows are the clearest waste found so far and are not contentious: old copies of the app, committed as files, paid for on every job forever.

## How it should be run

Independent of the sessions that built the thing, and adjudicated where reviewers disagree. The repository already defines the roles — `security-sentinel`, `performance-examiner`, `integrator`, `transport-inspector`, `interface-keeper`, with `arbiter` to consolidate — and has never pointed any of them at itself. Each gets a dimension; the arbiter reconciles and produces one bounded set of recommendations rather than five overlapping lists.

**It recommends. It does not cut.** Deletion of anything at authority layers 1 and 2 is the owner's alone, and the removal of anything else happens as ordinary work against a written scope, reviewed like any other change.

## What I need from the owner, when the time comes

**Yes** — and it runs as written. **Change it** — and this page is rewritten first. The sequence above means it does not start until the owner has opened the command centre and seen it working.
