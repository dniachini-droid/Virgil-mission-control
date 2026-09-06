# Repair limits

Version 1.0.0. Owner-controlled. Source: master commission sections 3.5 and 4.3; Amendment 1, section H.

## Normal maximum per candidate lineage

1. One independent review.
2. One consolidated adjudication when necessary.
3. One bounded repair.
4. One fresh re-review of the repaired SHA and its regression boundary.
5. At most one further cycle, only with explicit owner authority (`owner_decision` approving an additional repair round).

`authority.json` encodes this as `repairLimits.maxCyclesWithoutOwner = 1` and `repairLimits.maxCyclesWithOwner = 2`. The domain reducer counts `repair_authorised` events per lineage; the gate engine refuses a `repair_authorised` transition beyond the limit without a matching owner decision. Beyond the owner-extended limit the candidate stops and the run enters `OWNER_DECISION_REQUIRED`.

## Repair contract

A repair is a fresh bounded context, never a permanent fixer. The repair contract contains only: accepted finding IDs; reproduction evidence; permitted files; prohibited collateral changes; required checks; maximum repair scope; the repair-cycle count; stop conditions. The Fabricator may relaunch in that context and nowhere else.

## Repair produces a new candidate

The reviewed capsule remains immutable. A repair produces a new SHA. Old verification and review signatures never transfer. The new SHA receives fresh deterministic verification and a fresh independent review by a reviewer independent of the repair.

## No loop

No builder-reviewer loop exists. Retrying after a bounded failure, or a second open-PR repair round, is a Tier 3 owner decision. Autonomy ratchets down after failure.
