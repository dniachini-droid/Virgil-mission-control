# State language

Version 1.0.0. Owner-controlled. Source: master commission section 3.6; Amendment 1, sections E, F and H. The transition table is encoded in `constitution/authority.json` and enforced by `packages/domain`.

## Candidate states

| State | Meaning | Established by |
|---|---|---|
| BUILDING | A Fabricator holds an active grant and is producing changes in an isolated worktree. | `agent_started` for role fabricator under a build stage |
| BUILDER_REPORTED_COMPLETE | The builder's structured result claims completion. Claim only. | agent result with `claimedComplete` |
| VERIFICATION_INCOMPLETE | Deterministic verification has started or partially run; not all required checks have completed. | `verification_started`, or `verification_completed` with required checks missing |
| READY_FOR_REVIEW | All required checks completed, candidate pushed and remote-equal, diff within permitted paths. | `verification_completed` with gate `review_eligibility` passing |
| REVIEW_IN_PROGRESS | An independent reviewer has received the exact SHA. | `review_started` |
| PASS_WITH_NON_BLOCKING_FINDINGS | Review passed with findings that persist and remain inspectable. | `review_passed` with non-blocking findings |
| BLOCKED | A proven defect or failed required check exists. | `check_failed` on a required check, or review verdict BLOCKED |
| INSUFFICIENT_EVIDENCE | Missing proof, not a proven defect. | review verdict INSUFFICIENT_EVIDENCE, or gate finds required evidence absent |
| QUARANTINED | The candidate is held in a quarantine field pending adjudication, repair authority or owner decision. | `candidate_quarantined` |
| REPAIR_AUTHORISED | A bounded repair contract exists within the repair limit. | `repair_authorised` |
| RE_REVIEW_REQUIRED | A new SHA exists in the lineage and needs fresh verification and fresh review. | `repair_completed` or `candidate_changed_after_review` |
| SAFE_TO_MERGE | Every merge gate passes. Eligible. Not merged. | `safe_to_merge` gate decision |
| MERGED | The owner merged. | `merged_by_owner` |
| DEPLOYED | Deployment completed. | `deployed` |
| OWNER_DECISION_REQUIRED | Machinery stopped; one decision with consequences and a recommended default awaits the owner. | `owner_decision_required` |

Deployment additionally records `NOT_STARTED`, `STARTED`, `FAILED` or `SUCCEEDED` as a separate field so started, succeeded and failed remain distinct persistent states.

## Distinctions that must never collapse

- Check `skipped` is not `passed`; it is visible, labelled and carries a reason.
- Check `failed` does not erase other passed checks.
- `BUILDER_REPORTED_COMPLETE` is not verified.
- `READY_FOR_REVIEW` is not reviewed.
- `PASS_WITH_NON_BLOCKING_FINDINGS` is not `SAFE_TO_MERGE`.
- `SAFE_TO_MERGE` is not `MERGED`.
- `MERGED` is not `DEPLOYED`.
- `BLOCKED` (proven defect) is not `INSUFFICIENT_EVIDENCE` (missing proof).
- A PR being open is not verification, review or approval.

## Allowed transitions

Encoded in `authority.json` under `transitions`. Any event not listed for the current state is an invalid transition and is rejected by the reducer with a recorded reason. `OWNER_DECISION_REQUIRED` may be entered from any state; it exits only through an `owner_decision` event whose `resumesTo` names an allowed state. `candidate_changed_after_review` from any post-verification state leads to `RE_REVIEW_REQUIRED`. `merged_by_owner` is accepted only from `SAFE_TO_MERGE` with an owner actor.

## Review verdict vocabulary

`PASS`, `PASS_WITH_NON_BLOCKING_FINDINGS`, `BLOCKED`, `INSUFFICIENT_EVIDENCE`. Nothing else is a verdict.
