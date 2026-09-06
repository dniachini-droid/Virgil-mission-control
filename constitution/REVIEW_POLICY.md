# Review policy

Version 1.0.0. Owner-controlled. Source: master commission sections 3, 4.1, 4.2, 6.1; Amendment 1, sections F and H.

## Independence

Independent review examines one exact immutable candidate SHA against the approved acceptance contract, plan, diff, repository and machine verification evidence. The reviewer is read-only, works at a station separate from fabrication, receives no builder reasoning as evidence, and cannot alter the candidate. A session that built or repaired a candidate may not review it.

## What review requires

Review may start only when deterministic verification has completed for the SHA, the SHA is pushed and equal on local and remote, the diff stays within permitted paths, and every required check either ran or is recorded as skipped with a reason. Missing any of these yields `INSUFFICIENT_EVIDENCE`, not a pass.

## Verdicts

`PASS`, `PASS_WITH_NON_BLOCKING_FINDINGS`, `BLOCKED`, `INSUFFICIENT_EVIDENCE`. A blocked verdict names a proven defect and the acceptance criterion it fails. An insufficient-evidence verdict names the missing proof. The two are different states with different geometry, never distinguished by colour alone. Non-blocking findings persist and stay inspectable after a passing verdict.

## Findings

Every finding has a stable identity, a severity, an affected surface, reproduction evidence and the acceptance criterion or authority it concerns. Findings are never renumbered, merged silently or dropped. Unsupported findings fail to obtain an evidence tether and are rejected by adjudication rather than quietly accepted.

## Formation

The Architect's risk classification selects the smallest adequate formation. Low-risk ordinary change: Keeper alone. Higher consequence: independent specialists in parallel (Domain Verifier, Breaker, Integrator, Interface Keeper, Security Sentinel, Transport Inspector, Performance Examiner as required), then the Arbiter. The full roster is never activated by default.

## Adjudication

The Arbiter runs only when findings conflict, overlap or require a consolidated repair contract. It reproduces material findings, rejects unsupported ones, preserves identities, classifies severity and defines one bounded repair and re-review boundary. It cannot edit the candidate.

## Staleness

Any change to the candidate SHA after review breaks the review seal. Verification signatures and review verdicts never transfer to a new SHA. The new SHA requires fresh verification and fresh independent review.

## Deterministic gates versus judgment

Gates in `packages/gate-engine` compute exact eligibility from evidence: working tree state, branch identity, base ancestry, commit and push completion, local and remote SHA equality, reviewed SHA currency, required checks ran, exit codes, reviewer presence, reviewer independence, permitted diff paths, artifact hashes, baseline versus candidate failures, repair-cycle count, merge and deploy authority. Reviewer judgment addresses correctness, contract satisfaction and risk. A passing judgment never overrides a failing gate.
