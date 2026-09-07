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
