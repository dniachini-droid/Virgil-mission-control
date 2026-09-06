# Agent roster and permission matrix

Deliverable 5. Authority source: `constitution/permission-matrix.json` (owner-controlled). Definitions: `.claude/agents/*.md`, one per role, each versioned and required by test to agree with the matrix. Performance identity for each role: `docs/art-direction/ROLE_PERFORMANCE_BIBLE.md`.

## Roster

| Role | Kind | Stage | Tools | Bash policy | Writes | Modifies candidate | Modifies tests | Launches stages | Independent of | Escalates to |
|---|---|---|---|---|---|---|---|---|---|---|
| Virgil (Conductor) | permanent | orchestration | Read, Grep, Glob, Bash, Agent | read-only git and status | none | no | no | yes | — | owner |
| Cartographer (Scoper) | permanent | scope | Read, Grep, Glob, Write | none | docs/product/acceptance/ | no | no | no | — | owner |
| Architect (Planner) | permanent | plan | Read, Grep, Glob, Bash, Write | read-only git and status | docs/architecture/plans/ | no | no | no | — | owner |
| Fabricator (Builder) | permanent | build | Read, Grep, Glob, Bash, Edit, Write | build, test, commit, push in worktree | permitted paths in assigned worktree | yes | implementation tests only | no | — | virgil |
| Prover (Test Engineer) | permanent | verification | Read, Grep, Glob, Bash, Edit, Write | run checks and mutation controls | authorised test boundary | no | within authorised boundary | no | — | virgil |
| Keeper (Independent Reviewer) | permanent | review | Read, Grep, Glob, Bash | read-only reproduction | none | no | no | no | fabricator, prover, architect of same candidate | virgil |
| Arbiter (Adjudicator) | permanent | adjudication | Read, Grep, Glob, Bash | read-only reproduction | none | no | no | no | fabricator, prover, keeper of same candidate | owner |
| Domain Verifier | conditional | review | Read, Grep, Glob, Bash | read-only reproduction | none | no | no | no | fabricator, prover | arbiter |
| Breaker | conditional | review | Read, Grep, Glob, Bash, Write | disposable copy only | disposable scratch copy | no | no | no | fabricator, prover | arbiter |
| Integrator | conditional | review | Read, Grep, Glob, Bash | read-only reproduction | none | no | no | no | fabricator, prover | arbiter |
| Interface Keeper | conditional | review | Read, Grep, Glob, Bash | run app and browser checks read-only | none | no | no | no | fabricator, prover | arbiter |
| Security Sentinel | conditional | review | Read, Grep, Glob, Bash | read-only reproduction | none | no | no | no | fabricator, prover | owner |
| Transport Inspector | conditional | review | Read, Grep, Glob, Bash | read-only hash and compare | none | no | no | no | fabricator | arbiter |
| Performance Examiner | conditional | review | Read, Grep, Glob, Bash | run benchmarks read-only | none | no | no | no | fabricator | arbiter |

The owner is not a role definition. The owner alone merges, deploys, changes authority, expands permissions and authorises further repair rounds.

## Invariant enforced by tests

Per Amendment 1, the invariant is not "no two roles may write the same path". The tests in `packages/agent-contracts/test/permission-matrix.test.ts` check:

1. Exactly one role may modify the candidate (Fabricator), and only under a grant.
2. Every reviewer role (Keeper, Arbiter, all conditional specialists) has `mayModifyCandidate: false`, no write boundary inside the candidate, and an `independentOf` list containing the Fabricator.
3. Virgil has no write boundaries and cannot modify candidate or tests.
4. Every role has at least one stop condition, an escalation target, a result schema and a payload schema that exists in `schemas/`.
5. Each agent definition's frontmatter `tools` equals the matrix `tools` for that role, and its body states the same write boundaries.
6. Write boundaries do not overlap between roles except by explicit sequential grant (the only sanctioned overlap is the Prover's authorised test boundary inside the Fabricator's worktree, which requires a separate `authority_granted` event).
7. No role's permitted actions include merge or deploy.
8. A role has `Edit` or `Write` tools if and only if it has a write boundary; a role may modify tests only if it has a write tool.
9. Only a role with `mayModifyCandidate: true` holds a boundary inside the candidate worktree; a role whose Bash policy is `none` or read-only cannot modify the candidate.
10. Stage launching (`mayLaunchStages`) is exclusive to the role holding the `Agent` tool.
11. The three placeholder boundaries (assigned worktree, authorised test boundary, disposable scratch copy) are each held by exactly one role, and no other placeholder exists.
12. Concrete boundaries normalise as repository path patterns, never nest across roles, and never reach a protected boundary from `constitution/authority.json`.
13. `.claude/settings.json` denies both `Write` and `Edit` for every path-shaped protected boundary in `authority.json`.

These are data-agreement tests between the matrix, the agent definitions, the authority file and the session settings. They do not make any runtime enforce the matrix; see the enforcement levels below and `docs/architecture/ENFORCEMENT_BOUNDARIES.md`.

## Enforcement levels

| Mechanism | Enforces | Status |
|---|---|---|
| Agent definition `tools` frontmatter | Which Claude Code tools a subagent can call | Enforced by Claude Code at launch |
| `.claude/settings.json` deny rules | Named destructive Git commands, secret file reads, Write and Edit into every path-shaped protected boundary (constitution, master commission, accepted owner decisions, raw sources, gate schemas) | Enforced for Write/Edit/Read/Bash pattern matches; Bash-mediated file writes (heredocs, sed) are not covered; coverage of the protected boundaries is validated by tests |
| Domain reducer over the event log | Actor, grant and cited-decision validity; recorded file, staging and manifest events within the actor's granted paths, with paths normalised and traversal rejected; reviewer independence; repair count; resume-target allowlist; merge and deploy authority | Implemented now and validated by tests, pending fresh independent review; sees only events that were recorded |
| Authority grants and gate engine | Permitted paths (normalised), SHA currency, reviewer independence, repair count, merge and deploy authority | Computed deterministically from evidence; Phase 0 provides the functions and fixtures, Phase 3 wires them to live sessions |
| PreToolUse hooks (planned Phase 3) | Per-role path boundaries for every write path including Bash | Not yet implemented; recorded in the threat model as a residual risk until then |
| Prose prohibitions in definitions | Everything else | Advisory; violations are detected after the fact by gates, review and permission tests, never assumed prevented |
