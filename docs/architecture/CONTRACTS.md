# Structured contracts

Deliverable 6. Source: master commission section 9; Amendment 1 sections B and G. Source of truth: Zod schemas in `packages/agent-contracts/src`. Exported JSON Schema 2020-12 in `schemas/` via `pnpm --filter @virgil/agent-contracts export-schemas`. Cross-validated with Ajv in tests.

## Coverage of section 9

| Required contract | Schema | Notes |
|---|---|---|
| Project manifest | `project-manifest` | repository is an allowlist entry id, never a path |
| Acceptance contract | `acceptance-contract` | Cartographer output; open owner decisions carry consequence and default |
| Implementation plan | `implementation-plan` | Architect output; the only source of permitted paths and required checks |
| Risk classification | `risk-classification` | 26 flags select the conditional specialists |
| Stage assignment | `stage-assignment` | single hop, references a grant |
| Agent authority grant | `agent-authority-grant` | tier, permitted actions, boundary, expiry, stop conditions |
| Agent result | `agent-result` | `claimedComplete` is a claim; payload validated against the role's payload schema |
| Handoff | `handoff` | `authorityTravels` is always false; unsealed when information is missing |
| Candidate artifact | `candidate-artifact` | sealed, full SHA, parent, manifest, push state |
| Machine verification result | `machine-verification-result` | checks with skip reasons; optional mutation control; signature over completed checks only |
| Review finding | `review-finding` | stable id, severity, surface, reproduction evidence, status |
| Review report | `review-report` | verdict vocabulary, independence declaration |
| Adjudication | `adjudication` | accepted, rejected with reason, consolidations preserving ids, cycle count |
| Repair contract | `repair-contract` | accepted finding ids, permitted files, prohibited collateral, required checks, cycle count, stop conditions |
| Gate decision | `gate-decision`, `gate-report` | pass, fail, insufficient evidence |
| Owner decision | `owner-decision` | kinds include additional repair round, merge, deployment |
| Run record | `run-record` | commands, files, checks run and skipped, limitations, commits, verdict, one next action |
| Domain event | `domain-event` | discriminated union of 56 operational and 18 knowledge events |
| Raw source record | `raw-source-record` | canonical path plus hash, never a copy |
| Knowledge node and atomic claim | `knowledge-node`, `atomic-claim` | epistemic and authority classes |
| Provenance tether | `provenance-tether` | intact, broken, stale, absent |
| Support, contradiction, supersession | `knowledge-relationship` | |
| Knowledge compilation proposal and result | `knowledge-compilation-proposal`, `knowledge-compilation-result` | result asserts raw sources unchanged |
| Wiki lint / Mind Scan finding | `mind-scan-finding` | ten finding classes |
| Epistemic-to-visual projection contract | `epistemic-visual-projection-contract` | nine classes, authority rank versus visual stability |

Added by Amendment 1: `work-order`, `operational-animation-grammar`, `animation-mapping`, `role-performance-bible`. Added for governance data: `agent-definition-frontmatter`, `permission-matrix`, `authority-config`, `repository-allowlist`, `telemetry-signal`, `evidence-ref`, `check-run`.

## Retained fields

`ChainContext` (in `common.ts`) is mixed into candidate artifact, verification result, review report, repair contract, agent result and run record. It carries project and repository, branch and worktree, base and head SHA, PR, role and session, tier and permitted actions, files changed, checks run and skipped with reasons, finding ids, handoff source and destination, gate result, stop reason and one next action.

## Rules

- A SHA is always the full 40-hex value; short forms are display only.
- No schema has a field for secret values; command apertures carry a command class and target only.
- Prose fields are never evidence. `EvidenceRef` is the only evidence type.
- Schemas are versioned with the package; a breaking change to a contract is an ADR.

## Which of these anything actually produces

**The coverage table above says a contract exists. It does not say anything writes one, and
until 2026-09-13 nothing said so anywhere.** Counted on that date, over 345 commits:

| contract | instances in the repository | last written |
|---|---|---|
| `run-record` | 2 | 2026-09-07 |
| `candidate-artifact` | 0 | never |

**Why**, recorded so it is not rediscovered. These contracts were built in Phase 0 work
package 3 as the foundation for an orchestration service that reads and writes them. That
service is Phase 3 and does not exist. What runs in this repository is sessions, and a session
writes prose into a pull request. The schema and the pull request never met.

**And nothing refused to proceed without one.** `run-record` has two instances because a test
names those two files; nothing has ever demanded a third, so there has not been a third. A
test that names its instances proves those instances valid and is structurally incapable of
noticing that no more were written.

A contract nobody produces costs nothing, breaks nothing, passes every check and exports
cleanly. That is precisely why it can sit for eight days without anyone noticing, and it is
the failure mode to watch for in every row of the table above.

### `candidate-artifact`, box by box, against the facts block that replaced it

`scripts/virgil-chain.ts --facts` is what a pushing session actually posts
(`docs/process/AUTOMATIC_HANDOFF_CHAIN.md`). The contract was used as its checklist rather
than as its format, and this is the result. **The contract is not dead: it is the specification
the facts block is checked against.**

| contract field | in the facts block | how |
|---|---|---|
| `branch`, `baseSha`, `headSha`, `shortSha`, `parentSha` | yes | derived from Git, never asked for |
| `filesChanged`, `manifest` | yes | derived; the path list, not a hash manifest |
| `checksRun` | yes | `--ran`, the real output from a file |
| `checksSkipped` | yes | `--could-not-run` |
| `notDone` | yes | `--not-done`. **The box the contract did not have**, added on 2026-09-13 |
| `findingIds` | yes | `--findings`, required of a fixer. **Found by this comparison** |
| `pushed` | yes | verified, not declared. A handoff for an unpushed commit is refused. **Found by this comparison** |
| `roleId`, `handoffSource`, `handoffDestination`, `nextAction` | yes | the handoff marker |
| `authorityTier` | partly | the facts block carries the **risk** tier, derived from paths. Authority tier is the role's, and is in the role definition |
| `repository`, `pr` | implicitly | the comment is on the pull request |
| `projectId`, `worktree` | no | one repository, no worktrees in practice |
| `sessionId`, `authorityGrantId`, `permittedActions` | no | there is no grant issuer to issue them |
| `artifactId`, `lineageId`, `sealed` | no | identity and sealing belong to the orchestration service |
| `author`, `committedAt` | no | Git holds both, next to the commit the block names |
| `gateResult`, `stopReason` | no | a gate result belongs to a gate, and a push is not a stop |

**Four of these are deliberately empty rather than filled with something plausible.**
`artifactId`, `lineageId`, `sealed` and `authorityGrantId` describe a service that assigns and
seals them. A script inventing values for them would be manufacturing evidence, which is worse
than an honest gap.
