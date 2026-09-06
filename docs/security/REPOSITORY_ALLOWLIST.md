# Repository allowlist

Owner-controlled. Machine-readable form: `schemas/repository-allowlist.schema.json` describes the record; the live allowlist file is introduced in Phase 2 with the first read-only adapter and must validate against it.

Rules:

- Adapters accept only an allowlist entry id, never a user-supplied path or URL.
- Each entry names the repository, the permitted operations per role (read, worktree, push-to-branch-pattern), the protected branches, and the owner decision that added it.
- Adding, widening or removing an entry is a Tier 3 permission change requiring an owner decision record.
- Phase 0 allowlist: this repository only, read and push limited to `claude/virgil-phase-0-plan-kp7g38`, per OD-0001. The consolidation session was authorised by the owner in writing to push only to the single consolidation branch and to open one pull request targeting `main`, which the owner alone merges (`docs/process/CONSOLIDATION_RUN_RECORD.md`). No other repository is listed or reachable.
- Status: this allowlist is design-level only. The gate `repository_allowlisted` exists over evidence objects, and every repository path in a contract or event is normalised with traversal rejected (validated by tests), but no adapter reads an allowlist file and the live allowlist file does not exist yet (Phase 2).
