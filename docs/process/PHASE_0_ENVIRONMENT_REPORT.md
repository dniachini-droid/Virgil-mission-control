# Phase 0 environment and repository inspection report

Deliverable 1 of the master commission, section 11. Recorded 2026-09-06.

## Repository identity

| Item | Finding |
|---|---|
| Remote | https://github.com/dniachini-droid/Virgil-mission-control |
| Intended repository | Yes. The commission names `virgil-mission-control`; GitHub treats the capitalised name as equivalent. Workspace package names use the lowercase form. |
| State at session start | Newly initialised, not empty: one commit (`8210125 Create README.md`) containing a two-line README. |
| Existing instructions | None. No CLAUDE.md, no `.claude/`, no package manifest, no lockfile, no `.gitignore`, no CI. Per owner instruction this is not a defect; scaffolding is a governed Phase 0 decision. |
| Default branch | `main` (untouched). |
| Working branch | `claude/virgil-phase-0-plan-kp7g38`, the only branch this session may push to. |
| Other repositories | None accessed. Session GitHub scope is limited to this repository. |

## Execution environment

| Tool | Version |
|---|---|
| Node | 22.22.2 (current LTS line is 24.x; 22 is supported and matches the container) |
| pnpm | 10.33.0 |
| npm | 10.9.7 |
| Python | 3.11.15 (used only for integrity analysis scripts) |
| Chromium | Playwright-managed build 1194 at `/opt/pw-browsers` |
| GPU | None. WebGL is available only through software rendering (SwiftShader). |
| Network | Outbound HTTPS through a session proxy. npm registry reachable. |
| Git identity | Session identity; commits carry a co-author trailer. |

## Consequences for Phase 0

- Unit, schema, domain, gate and knowledge-graph tests run fully here.
- Spike screenshots can be captured headlessly, but colour, bloom and frame rate under software rendering do not represent the real product. Final visual judgment requires the owner to run the spikes on a GPU. The run record will use `BLOCKED_PENDING_REAL_GPU_REVIEW` for the visual-quality criterion if software rendering cannot supply sufficient evidence.
- Performance budgets are defined in Phase 0 and can only be measured on real devices in Phase 1.

## Integrity of the master commission

See `docs/product/COMMISSION_PROVENANCE.md`. The repository copy has the same line count as the owner's original but differs by 752 bytes and in hash; the cause could not be reproduced in-session and an owner-side verification command is recorded there.
