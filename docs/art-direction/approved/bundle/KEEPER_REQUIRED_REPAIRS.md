# Required foundation repairs

An independent review of exact Phase 0 SHA `4b834a4b496bb07a45bfb8c9ca1f0384b644b1f3` returned `SUBSTANTIVE_WITH_REQUIRED_REPAIRS`.

## K-01 — authority and repair bypass

- A non-owner `owner_decision` event can currently resume into protected states, including `MERGED`.
- `$resumesTo` can bypass review, safe-to-merge and repair-cycle restrictions.
- Require a valid owner actor and existing cited owner decision.
- Restrict resume targets to the recorded permitted state; exclude `SAFE_TO_MERGE`, `MERGED`, `DEPLOYED` and `REPAIR_AUTHORISED`.
- Derive and preserve repair-cycle counts so they cannot be reset through replay.

## K-02 — contradictory verification payload

- The reducer trusts `allRequiredCompleted` instead of deriving completion from recorded check events.
- A skipped required check can therefore reach `READY_FOR_REVIEW`.
- Derive eligibility from required check identities and their recorded results.
- Contradictory payload summaries must be rejected or ignored.

## K-03 — actor and independence validation

- Validate authority grants, repair authorization, safe-to-merge and merge actors.
- `merged_by_owner` requires an owner actor, existing applicable owner decision, exact candidate SHA and correct prior state.
- Reviewer independence must account for builders, repairers and Prover/test sessions.
- Documentation must distinguish reducer enforcement, gate enforcement and future orchestration enforcement.

## K-15 — stale knowledge graph

- Regenerate `seed-graph.json` deterministically.
- Add a freshness test that fails when committed derived graph output differs from current sources.

## Regression requirements

Add explicit adversarial tests reproducing every exploit above. Do not weaken schemas or remove gates merely to make tests pass. After repair, a fresh read-only reviewer must inspect the exact final SHA before the owner merges.
