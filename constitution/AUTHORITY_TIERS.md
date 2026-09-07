# Authority tiers and the permission invariant

Version 1.0.0. Owner-controlled. Source: master commission section 3.3 and 3.4; Amendment 1, "Permission invariant correction" and section G.

## Tier 1 — act and report

Permitted without a new decision: read-only recovery; status reconciliation; collecting machine evidence; updating non-authoritative presentation state from authoritative live data; reporting inactivity or failure; identifying the next already-authorised action.

## Tier 2 — ask scope once, then execute the agreed chain

Permitted after the owner approves the bounded scope: starting an agreed project stage; creating an isolated worktree and branch; running the approved build; pushing the branch and opening a draft PR; commissioning the required review formation; applying one adjudicated, bounded repair.

## Tier 3 — owner approval required before action

Material owner decisions; authority changes; new work after a failed bounded cycle; additional repair or re-review rounds; merge; deployment; permission expansion.

## Authority grants

Authority is a first-class object, separate from the work order it accompanies. Every grant states the tier, the permitted actions, the file or repository boundary, the expiry, and the stop conditions. Every grant, transfer, expiry and revocation is an explicit, bounded, auditable event (`authority_granted`, `authority_revoked`). A handoff carries the artifact; it does not carry authority unless an explicit grant event exists for the receiving role.

## The permission invariant

1. Every artifact has one clearly accountable owner at a time.
2. No two agents hold ambiguous or simultaneous overlapping authority over the same artifact or boundary.
3. Protected boundaries are exclusive: the constitution, authority data, gate definitions, `knowledge/raw/`, and the merge and deploy mechanisms.
4. A role may receive a narrow sequential grant where required. Example: the Prover may modify files inside an explicitly authorised test boundary after the Fabricator's grant on those files has expired or been scoped away.
5. Reviewer independence is absolute. The Keeper and the Arbiter cannot modify the candidate, and a reviewer never reviews its own work.
6. Virgil cannot perform the specialised work it routes.

The invariant is deliberately not "no two roles may ever write the same path". Sequential, bounded, audited grants are legitimate; simultaneous or implicit ones are not.

## Ratchet

After a failed bounded cycle, an ambiguity, a mismatch or a missing decision, the active authority narrows or stops. It does not widen without a Tier 3 decision.
