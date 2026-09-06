Virgil Mission Control — Master Commissioning Brief for Claude Code

How to use this brief

Use this brief in a new, dedicated repository named virgil-mission-control.

This document governs the complete product, but the first Claude Code session must execute Phase 0 only. It must establish the repository foundation, product and technical authority, knowledge system, agent definitions, deterministic gates, art-direction proof, and the plan for the first playable vertical slice. It must not attempt to build the entire product in one session.

After Phase 0 is independently reviewed and accepted, each later phase must receive its own bounded implementation brief derived from this master brief and the approved repository authority.

────────

1. Commission

Design and build Virgil Mission Control, a graphically ambitious three-dimensional command centre for supervising agentic software development across multiple independent repositories.

Virgil is both:

1. A serious development-governance system that coordinates scoping, planning, building, verification, independent review, bounded repair and owner-controlled merge decisions.
2. A proper real-time 3D experience with high-quality video-game presentation: a psychedelic orbital foundry populated by recognisable specialist workers, moving candidate artifacts, docking bays, scanners, quarantine fields, project worlds and cinematic spatial transitions.

The product contains two co-equal, connected three-dimensional environments:

1. Orbital Foundry — the living operational universe showing repositories, agents, worktrees, artifacts, handoffs, verification, review, quarantine, merge gates and deployment.
2. The Mind of Virgil — the living knowledge universe showing immutable sources, compilation, wiki knowledge, provenance, contradictions, uncertainty, supersession and knowledge health.

Neither environment may be reduced to a conventional dashboard, documentation sidebar or decorative background. They must express different forms of truth while remaining part of one coherent product world.

The visual world must communicate real operational truth. It must not be an ornamental animation placed behind an ordinary dashboard. Every meaningful graphical object and state must correspond to traceable repository, session, task, branch, worktree, commit, PR, test, review, finding, permission or gate data.

The product must retain dense, exact detail when needed. A user should be able to move fluidly from a beautiful spatial overview to the precise evidence behind any object without losing context.

The intended long-term result should feel like a fusion of:

• A premium science-fiction strategy game.
• A psychedelic orbital observatory.
• A living software-development map.
• A flight-control system for digital labour.
• A rigorous, auditable agentic SDLC platform.

It must never feel like a generic SaaS dashboard with a few 3D models added.

────────

2. Product thesis

Autonomous coding agents can produce more work than a person can reliably supervise through terminal transcripts, chat windows and conventional PR lists. The difficult problem is no longer only generating code. It is maintaining trustworthy control over:

• What was authorised.
• Which agent did what.
• Which repository, branch, worktree and SHA were involved.
• What changed between handoffs.
• Which checks actually ran.
• Whether review was genuinely independent.
• Whether findings were reproduced and repaired.
• Whether the reviewed artifact is still the current artifact.
• Whether something merely looks good or is actually safe to merge.
• When autonomy must stop and return authority to the owner.

Virgil makes this work spatially legible, operationally bounded and auditable.

The key visual and architectural principle is:

> The artifact moves between workers. Authority does not silently move with it.

A builder produces a sealed candidate identified by an immutable commit SHA. That artifact travels to an independent review station. The reviewer may inspect it but cannot alter it. Failed candidates enter quarantine. Repairs receive bounded authority. Passing review makes an artifact eligible for the owner gate; it does not merge the artifact.

────────

3. Non-negotiable governance constitution

These rules are product authority, not suggestions.

3.1 Virgil’s role

Virgil is the conductor, continuity layer and owner adviser.

Virgil may:

• Maintain project and workflow state.
• Launch authorised single-hop stages.
• Route complete handoffs.
• Observe repositories, sessions, PRs, checks and reviewers.
• Recover interrupted state from evidence.
• Detect stalls, mismatches and missing prerequisites.
• Translate technical state into a concise owner report.
• Present exactly one recommended next action.

Virgil must never:

• Scope the product itself.
• Plan implementation itself.
• Build or repair code.
• Review a candidate.
• Adjudicate disputed findings.
• Approve a PR.
• Merge.
• Deploy.
• Change its own constitutional authority.
• Start an additional repair or retry round without the required owner authority.
• Treat a builder’s success report as proof that the candidate is safe.

3.2 Required normal chain

The normal development chain is:

scope → owner scope acceptance → plan → build → deterministic verification → independent review → bounded repair if required → fresh re-review → owner merge decision

Every stage is a single-hop assignment. One stage may produce the handoff for the next, but may not silently perform the next role.

3.3 Owner authority

The owner alone may merge.

The owner must also approve:

• Material product or domain decisions.
• Changes to governing authority.
• Expansion beyond approved scope.
• A new open-PR repair round.
• Retrying work after a bounded failure.
• Deployment where consequential.
• Changes to Virgil’s constitution, role permissions or gate definitions.

3.4 Autonomy tiers

Tier 1 — act and report

Permitted without a new decision:

• Read-only recovery.
• Status reconciliation.
• Collecting machine evidence.
• Updating non-authoritative presentation state from authoritative live data.
• Reporting inactivity or failure.
• Identifying the next already-authorised action.

Tier 2 — ask scope once, then execute the agreed chain

Permitted after the owner approves the bounded scope:

• Starting an agreed project stage.
• Creating an isolated worktree and branch.
• Running the approved build.
• Pushing the branch and opening a draft PR.
• Commissioning the required review formation.
• Applying one adjudicated, bounded repair.

Tier 3 — owner approval required before action

• Material owner decisions.
• Authority changes.
• New work after a failed bounded cycle.
• Additional repair/re-review rounds.
• Merge.
• Deployment.
• Permission expansion.

After failure or ambiguity, autonomy must ratchet downward rather than expand.

3.5 Repair limits

Normal maximum:

1. One independent review.
2. One consolidated adjudication when necessary.
3. One bounded repair.
4. One fresh re-review of the repaired SHA and regression boundary.
5. At most one further cycle only with explicit owner authority.

No endless builder/reviewer loop is permitted.

3.6 Status language

The product must preserve meaningful distinctions:

• BUILDING
• BUILDER_REPORTED_COMPLETE
• VERIFICATION_INCOMPLETE
• READY_FOR_REVIEW
• REVIEW_IN_PROGRESS
• PASS_WITH_NON_BLOCKING_FINDINGS
• BLOCKED
• INSUFFICIENT_EVIDENCE
• REPAIR_AUTHORISED
• RE_REVIEW_REQUIRED
• SAFE_TO_MERGE
• MERGED
• DEPLOYED
• QUARANTINED
• OWNER_DECISION_REQUIRED

“Good,” “finished,” “tests passed,” “reviewed,” “safe to merge,” “merged” and “deployed” must never be collapsed into one generic completed state.

────────

4. Agent roster

Create versioned Claude Code subagent definitions for the following core crew. Each definition must specify its remit, inputs, required outputs, allowed tools, prohibited actions, stop conditions, escalation rules and structured result schema.

4.1 Permanent core crew

Virgil — Conductor

Read-only orchestration and state translation. Never performs another role.

Cartographer — Scoper

Turns an idea into a bounded acceptance contract containing:

• Problem and intended user.
• Product promise.
• V1 boundary.
• User journeys.
• Acceptance criteria.
• Non-goals.
• Assumptions.
• Material open owner decisions.
• Evidence required for acceptance.
• Failure conditions.

It must not plan architecture, code, or invent missing material behaviour.

Architect — Planner

Reads the approved acceptance contract and target repository, then produces:

• Repository findings.
• Module and dependency map.
• Proposed architecture.
• Data/schema changes.
• Migration boundary.
• Testing strategy.
• Risk classification.
• Required reviewer formation.
• Staged task graph.
• Explicit protected and untouched areas.
• Go/no-go finding.

It cannot modify production code or expand approved scope.

Fabricator — Builder

Implements only the approved plan inside an assigned isolated worktree. It may modify permitted files, add implementation tests, commit, push and open a draft PR. It cannot merge, deploy, review itself, change authority, suppress failures, modify unrelated files or resolve missing owner decisions.

Prover — Test Engineer

Designs and runs meaningful verification, including red-before-green checks and deliberate mutation controls where risk warrants them. It may create or modify tests within an explicitly authorised test boundary. It must not modify production behaviour to make tests pass.

Keeper — Independent Reviewer

Examines an exact immutable PR SHA against the approved contract, plan, diff, repository and test evidence. It must be read-only and independent of builder reasoning. Valid verdicts:

• PASS
• PASS_WITH_NON_BLOCKING_FINDINGS
• BLOCKED
• INSUFFICIENT_EVIDENCE

Arbiter — Adjudicator

Runs only when findings conflict, overlap or require a consolidated repair contract. It reproduces material findings, rejects unsupported findings, preserves finding identities, classifies severity and defines the bounded repair and re-review boundary. It cannot edit the candidate.

4.2 Conditional specialists

Create definitions, but invoke them only when the risk classification requires them:

• Domain Verifier — governed scientific, medical, legal, financial or business logic.
• Breaker — adversarial edge cases, state failure, destructive operations and safety logic.
• Integrator — cross-component changes, APIs, migrations and shared infrastructure.
• Interface Keeper — rendered UI, accessibility, mobile behaviour and user-facing truth.
• Security Sentinel — authentication, secrets, personal data, payments and external actions.
• Transport Inspector — remote/local byte equality, generated artifacts, uploads, canonical files and immutable candidate integrity.
• Performance Examiner — expensive rendering, large data, concurrency and resource budgets.

For an ordinary low-risk change, use the smallest adequate formation. For a high-consequence change, allow independent specialist reviews in parallel followed by the Arbiter. Do not activate the entire roster by default.

4.3 Repair mode

Do not create an all-powerful permanent fixer. The Fabricator may be relaunched in a fresh bounded repair context containing only:

• Accepted finding IDs.
• Reproduction evidence.
• Permitted files.
• Prohibited collateral changes.
• Required checks.
• Maximum repair scope.

The repaired SHA must receive a fresh independent review.

────────

5. Two-world visual system and art direction

5.1 Primary metaphor: Orbital Foundry

Use a true navigable 3D world, not CSS pseudo-3D and not an ordinary dashboard surrounding a decorative canvas.

The product universe contains:

• A central Virgil observatory.
• One distinct orbital station or world for each project repository.
• Docking bays representing isolated worktrees.
• Specialist workers or drones representing active agent sessions.
• Work orders representing scoped tasks.
• Sealed cargo capsules representing candidate commits.
• Visible SHA markings on candidate artifacts.
• Transit paths representing handoffs.
• Scanner arrays representing deterministic verification.
• Inspection stations representing independent review.
• Quarantine fields representing blockers or artifact mismatch.
• Repair docks representing bounded repair authority.
• An owner-controlled merge airlock.
• A launch event representing deployment.

5.2 Second environment: The Mind of Virgil

The Karpathy-style knowledge layer must be represented as a first-class navigable 3D environment, not as three folders rendered in a sidebar.

The Mind of Virgil represents the documented knowledge lifecycle. It must never claim to expose a model’s literal private thoughts, hidden reasoning or consciousness. The environment visualises inspectable sources, compilation operations, provenance, structured relationships, contradictions, status and history.

Archive Nebula

The immutable knowledge/raw/ layer becomes a deep cosmic archive containing visually distinct source artifacts:

• Specifications as crystalline monoliths.
• Research and long-form documents as illuminated manuscripts or encoded stellar tablets.
• Images and design references as floating holographic plates.
• Approved owner decisions as sealed golden objects.
• Imported datasets as structured swarms or lattices.
• Newly arrived, uncompiled sources as unopened transmissions, meteors or capsules.

Each source object must retain inspectable provenance, source path, content hash where available, ingestion state and relationships. Knowledge workers may read these objects but must not visually or operationally imply that the immutable source was rewritten.

Synaptic Forge

Compilation from raw source into wiki knowledge occurs in a visible processing environment. This should communicate documented operations rather than theatrical fake cognition:

• Candidate concepts separate from a source as luminous fragments.
• Entity and topic relationships form as traceable connections.
• Existing knowledge nodes visibly respond when an approved source strengthens, challenges or supersedes them.
• Contradictions form interference patterns rather than being silently averaged away.
• Unsupported proposed claims remain unstable, translucent or incomplete.
• Sensitive updates remain proposed projections until the required owner authority exists.

The user must be able to inspect what operation occurred, which source supported it, which pages were proposed or changed, and which agent or skill performed the compilation.

Living Knowledge Galaxy

The knowledge/wiki/ layer becomes a navigable galaxy of durable knowledge nodes. Use a stable visual grammar:

• Product principles as bright reference stars.
• Architecture concepts as geometric orbital structures.
• Agent roles as character-linked constellations.
• Approved decisions as sealed luminous monuments.
• Verified lessons as persistent structures retaining links to their evidence.
• Open questions as unstable anomalies.
• Contradictions as turbulent fields connecting the claims in conflict.
• Superseded knowledge as faded but still inspectable historical structures linked to the evidence or decision that superseded it.
• Unsupported claims as dim or unstable objects lacking a complete provenance tether.

The interface must pair colour with form, label, pattern or motion. Epistemic state must never depend on colour alone.

Provenance tethers

Every material knowledge node must have inspectable provenance links back to raw sources, approved decisions, ADRs, schemas, verified run evidence or relevant code. Selecting a knowledge node should reveal:

• Compiled explanation.
• Knowledge type and authority class.
• Supporting and contradicting sources.
• Exact provenance links.
• Date compiled and last verified.
• Related concepts.
• Supersession history.
• Decisions and code surfaces affected.
• Maintaining agent or skill.
• Verification, uncertainty or contested status.

A broken, absent or stale provenance tether must have a clear visual and machine-readable state.

Mind Scan

Karpathy-style wiki linting becomes a neurological scan across the knowledge galaxy. It should reveal:

• Contradictory pages or claims.
• Stale or superseded material presented as current.
• Orphan nodes.
• Broken references and provenance tethers.
• Repeated concepts that lack their own page.
• Claims without adequate supporting authority.
• Knowledge regions that have become internally consistent around an outdated source.
• Live operational values incorrectly copied into durable prose.
• Proposed repairs awaiting approval.

The Mind Scan reports evidence and proposes maintenance. It may not silently rewrite owner-controlled authority.

Epistemic visual contract

The same category must have the same representation throughout the product:

• Durable compiled knowledge: solid celestial structure.
• Immutable raw evidence: sealed source artifact.
• Owner-approved decision: sealed monument with owner authority mark.
• AI-generated hypothesis: translucent projection.
• Contested claim: interference or bifurcated node.
• Superseded claim: faded historical structure with visible successor link.
• Unverified claim: unstable object with incomplete provenance.
• Live operational state: moving signal or transmission, never a permanent memory object.
• Deterministically verified fact: machine-verification signature attached to its evidence.

Define this contract as data and documentation so rendering does not invent epistemic meaning.

Connection between the two worlds

Orbital Foundry and the Mind of Virgil must be navigably and causally connected.

Examples:

• A verified development run may deposit a run record at the Mind gateway.
• A knowledge compiler may propose a durable lesson derived from verified evidence.
• A project station may show which wiki principles, decisions and architecture nodes govern it.
• Selecting a finding may travel to the knowledge node or authority it contradicts.
• Selecting a durable rule may reveal every active project surface that depends on it.

No worker report becomes durable knowledge merely because it was emitted. The knowledge update must retain provenance, applicable verification state and any required approval.

5.3 Psychedelic space character

The visual direction should feel cosmic, uncanny, beautiful and premium:

• Deep-space scale with layered parallax.
• Flowing nebulae and restrained volumetric fog.
• Iridescent energy fields.
• Emissive transit lanes.
• Bioluminescent station accents.
• Animated star fields and cosmic dust.
• Holographic information projections.
• Controlled bloom and chromatic effects.
• Fluid colour transitions influenced by workflow state.
• Surreal planetary forms rather than generic NASA realism.
• A coherent art bible rather than an asset-store collage.

Psychedelic must not mean unreadable. Functional state colour, labels, focus, contrast and motion hierarchy must remain unambiguous.

Avoid:

• Generic glassmorphism dashboards.
• Rows of rectangular statistic cards as the primary experience.
• Cartoon clip-art astronauts.
• Low-effort primitive spheres as final assets.
• Constant uncontrolled movement.
• Excessive bloom that destroys detail.
• Decorative particle noise that obscures paths or selectable objects.
• Colour as the only state indicator.
• A 3D background with all real work occurring in text boxes.

5.4 Proposed rendering stack

Evaluate the current stable ecosystem before installing dependencies. Prefer a web-first TypeScript architecture using:

• React and a production-capable React framework.
• Three.js through React Three Fiber.
• Drei where it reduces boilerplate without constraining the art direction.
• A maintained post-processing pipeline.
• glTF/GLB asset workflow.
• Physically based materials where appropriate.
• Custom shaders for signature cosmic effects.
• An animation system supporting authored clips and procedural state transitions.
• Optional lightweight physics only where it produces meaningful interaction.

Do not lock versions from this brief. Record chosen versions and reasons in an ADR.

5.5 Quality bar

Before the product scales to multiple projects, one vertical slice must demonstrate the final intended quality:

• One project station.
• Plan, build, review, quarantine and owner-gate areas.
• At least three distinctive worker roles.
• One artifact visibly moving through a handoff.
• A passing flow and a blocked flow.
• Cinematic camera movement between overview and detail.
• A polished signature nebula or energy-field effect.
• A coherent lighting and material system.
• A detail surface tied to the selected 3D object.
• Keyboard and pointer selection.
• Reduced-motion behaviour.
• Defined desktop and mobile performance targets.
• A transition into a small but genuine Mind of Virgil environment.
• One immutable source artifact compiled into one durable wiki node.
• A visible provenance tether between the source and compiled knowledge.
• At least one contested, unsupported or superseded knowledge state.

Do not populate the universe with dozens of mediocre assets before this slice meets the approved art bar.

5.6 Information design

Provide three coordinated views of the same authoritative state:

Living World

The primary spatial experience. Event-driven animations show work, handoffs, tests, blockers and owner gates.

Evidence View

Selecting any world object reveals exact details without leaving the spatial context:

• Project and repository.
• Stage and state.
• Agent identity and role.
• Authority tier.
• Branch and worktree.
• Base and head SHAs.
• PR.
• Checks run, passed, failed and skipped.
• Findings and finding identity.
• Handoff source and destination.
• Elapsed time and usage.
• Current blocker.
• One next action.

Dense information may use carefully designed 2D overlays, drawers, timelines and tables. These surfaces must visually belong to the same world and must not replace it.

Timeline Replay

Allow a run to be replayed from its append-only event history. The user can scrub to any event and inspect what was believed, which artifact existed, what authority was active and why the next transition occurred.

Mind View

Allow the user to enter the Archive Nebula, Synaptic Forge and Living Knowledge Galaxy; trace a node to its sources; inspect contradictions and supersession; and initiate a read-only Mind Scan. Exact wiki content remains accessible without leaving the spatial context.

5.7 Motion rules

• Motion must be caused by a real event or deliberate user navigation.
• Ambient movement must be slow and non-essential.
• Do not continuously animate every worker merely to make the world look busy.
• State changes should be legible without relying on motion.
• Respect reduced-motion preferences.
• Provide graceful quality tiers for constrained devices.

────────

6. System architecture

Design clear boundaries between:

1. Presentation and 3D world — renders state but never invents or recomputes workflow authority.
2. Virgil orchestration service — validates transitions and launches authorised stages.
3. Deterministic gate engine — calculates exact eligibility from machine evidence.
4. Repository adapters — GitHub and local Git/worktree state.
5. Agent runtime adapters — Claude Code sessions and structured result ingestion.
6. Event store — append-only operational history.
7. Read model — current project, run, task, agent, artifact and gate state derived from events.
8. Knowledge layer — durable documentation and accumulated understanding, never live operational authority.
9. Knowledge compiler and provenance graph — controlled raw-to-wiki integration, contradiction and supersession modelling, provenance validation and Mind Scan results.
10. World projection layer — deterministic mapping from operational and epistemic state into Orbital Foundry and Mind of Virgil visual objects; presentation never creates authority.
11. Secrets and permissions boundary — credentials remain outside source control.

Prefer an event-driven model. The 3D world should react to domain events such as:

• idea_received
• scope_proposed
• scope_approved
• plan_completed
• worktree_created
• agent_started
• agent_waiting
• candidate_committed
• candidate_pushed
• pr_opened
• verification_started
• check_passed
• check_failed
• review_started
• finding_raised
• candidate_quarantined
• repair_authorised
• repair_completed
• review_passed
• safe_to_merge
• merged_by_owner
• deployment_started
• deployed
• owner_decision_required

The knowledge lifecycle must use equally explicit facts, including:

• raw_source_added
• raw_source_hashed
• knowledge_compilation_proposed
• knowledge_compilation_approved
• wiki_page_created
• wiki_page_updated
• provenance_tether_created
• provenance_tether_broken
• claim_supported
• claim_contested
• claim_superseded
• knowledge_gap_detected
• wiki_lint_started
• wiki_lint_finding_raised
• wiki_lint_completed
• knowledge_output_generated

Operational events and knowledge events may reference one another, but they must retain their different authority semantics. A wiki compilation event cannot manufacture a repository fact, and an agent completion event cannot automatically create verified durable knowledge.

The event log must store facts. Derived status may be rebuilt from those facts.

6.1 Deterministic gates

Implement exact checks as code rather than LLM judgment wherever possible:

• Working tree state.
• Branch identity.
• Approved base ancestry.
• Commit and push completion.
• Local and remote SHA equality.
• Reviewed SHA remains current.
• Required checks actually ran.
• Check exit codes.
• Required reviewer presence.
• Reviewer independence rule.
• Permitted diff paths.
• Remote/local artifact hashes where required.
• Known baseline versus candidate failures.
• Repair-cycle count.
• Merge and deploy authority.

An agent can report evidence, but its prose cannot override a failing deterministic gate.

6.2 Security

• Start with an explicit repository allowlist.
• Apply least privilege per role.
• Keep credentials out of the repository and logs.
• Do not allow arbitrary repository access through user-supplied paths.
• Never expose hidden prompts, environment secrets or credential material in the interface.
• Make external writes visible and attributable.
• Require owner authority for permission expansion.
• Model prompt-injection threats from issues, code comments, documentation and external sources.

────────

7. Karpathy-style compounding knowledge layer

Incorporate Andrej Karpathy’s LLM Wiki pattern as a project knowledge system, adapted for governed software development.

The original pattern separates immutable raw sources, an LLM-maintained interlinked wiki, and a schema defining maintenance behaviour. Implement a practical three-directory form plus an explicit schema:

```text
knowledge/
├── raw/           # owner-curated, immutable source material
├── wiki/          # agent-maintained, interlinked project knowledge
├── outputs/       # generated briefs, analyses and approved exports
├── SCHEMA.md      # wiki structure, provenance and maintenance rules
├── index.md       # content-oriented index
└── log.md         # append-only knowledge-operation journal
```

7.1 knowledge/raw/

• Owner-curated source material.
• Append-only in normal operation.
• Agents may read but never silently alter or delete it.
• Store design references, research, source documents, visual inspiration notes, approved course materials and imported specifications.
• Record provenance and content hashes where practical.

7.2 knowledge/wiki/

• Maintained by a dedicated wiki-maintenance skill or agent mode.
• Contains architecture explanations, glossary, visual language, agent roles, governance explanations, decisions, lessons and cross-linked concept pages.
• Pages must cite the raw source, ADR, code path, schema or event definition that supports them.
• Contradictions and uncertainty must remain visible.
• Superseded pages must be marked rather than silently rewritten into false continuity.

7.3 knowledge/outputs/

• Generated presentations, analyses, design reviews, project briefs and other derived deliverables.
• Outputs are not automatically product authority.
• Each output must identify its sources, creation date and governing version.

7.4 Critical anti-drift rule

The wiki must never become a second home for live operational state.

Do not treat copied values such as current HEAD, active SHA, PR status, check result, agent status or current gate eligibility as authoritative wiki facts. Those values must come from GitHub, Git, the event store or deterministic read model at display time.

The wiki may explain the shape of a contract and link to the live authority. It must not freeze changing operational values into prose that silently becomes stale.

7.5 Wiki operations

Define controlled operations:

• ingest — process one or more curated raw sources.
• query — answer from wiki pages with traceable citations.
• compile — update linked pages after an approved source or decision changes.
• lint — detect contradictions, stale pages, unsupported claims, missing sources, broken links and orphans.
• propose — prepare wiki edits for sensitive authority-related pages without applying them.

Keep wiki maintenance separate from operational event ingestion.

7.6 Graphical knowledge projection

The three-directory structure is the storage convention, not the user experience. The default user-facing expression of this layer is The Mind of Virgil.

Create a typed provenance graph capable of projecting:

• Raw source artifacts.
• Wiki pages and atomic claims.
• Supporting, contradicting and superseding relationships.
• Owner decisions and ADRs.
• Code, schemas, tests and verified run evidence.
• Generated outputs.
• Knowledge-maintenance operations and findings.

The filesystem remains inspectable and authoritative within its declared boundary. The graph must be reproducibly derived from files, metadata and explicit events; it must not become an opaque second store of invented relationships.

Define deterministic mapping rules between graph entities and their 3D forms, labels, tethers and interaction states. The rendering layer may arrange or animate nodes, but may not change their epistemic classification.

Phase 0 must produce the ontology, projection contract, sample data and a focused rendering proof. The complete navigable Mind is deferred according to the delivery phases.

────────

8. Repository structure to establish

The Architect may refine names with documented justification, but preserve the conceptual boundaries:

```text
virgil-mission-control/
├── CLAUDE.md
├── README.md
├── apps/
│   ├── mission-control/        # user-facing application and 3D world
│   └── orchestration-service/  # orchestration API/runtime
├── packages/
│   ├── domain/                 # workflow entities, events and state machine
│   ├── gate-engine/            # deterministic eligibility and integrity checks
│   ├── agent-contracts/        # agent inputs, outputs and validation schemas
│   ├── repository-adapters/    # GitHub/Git/worktree adapters
│   ├── visual-language/        # state-to-world mapping and shared presentation contracts
│   ├── knowledge-graph/         # provenance, claims, contradiction and supersession
│   ├── knowledge-compiler/      # controlled raw-to-wiki operations
│   └── test-fixtures/          # known-good and deliberately defective scenarios
├── constitution/
│   ├── VIRGIL_CONSTITUTION.md
│   ├── AUTHORITY_TIERS.md
│   ├── REVIEW_POLICY.md
│   ├── REPAIR_LIMITS.md
│   └── STATE_LANGUAGE.md
├── .claude/
│   ├── agents/
│   ├── skills/
│   └── settings.json
├── knowledge/
│   ├── raw/
│   ├── wiki/
│   ├── outputs/
│   ├── SCHEMA.md
│   ├── index.md
│   └── log.md
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── art-direction/
│   ├── process/
│   ├── security/
│   ├── decisions/              # ADRs and owner decisions
│   └── testing/
├── schemas/
├── tools/
├── tests/
├── assets/
│   ├── source/                 # editable source assets
│   ├── models/
│   ├── textures/
│   ├── shaders/
│   ├── audio/
│   └── licenses/
└── project-templates/
```

Do not create empty directories merely to imitate this tree. Add the files required for the approved phase and document deferred areas.

────────

9. Required structured contracts

Define machine-validatable schemas for at least:

• Project manifest.
• Acceptance contract.
• Implementation plan.
• Risk classification.
• Stage assignment.
• Agent authority grant.
• Agent result.
• Handoff.
• Candidate artifact.
• Machine verification result.
• Review finding.
• Review report.
• Adjudication.
• Repair contract.
• Gate decision.
• Owner decision.
• Run record.
• Domain event.
• Raw source record.
• Knowledge node and atomic claim.
• Provenance tether.
• Support, contradiction and supersession relationship.
• Knowledge compilation proposal and result.
• Wiki lint/Mind Scan finding.
• Epistemic-to-visual projection contract.

Every build, review and repair record must retain, where applicable:

• Project and repository.
• Branch and worktree.
• Approved base SHA.
• Candidate head SHA.
• PR identity.
• Role and agent/session identity.
• Authority tier and permitted actions.
• Files changed.
• Checks run, results and timestamps.
• Checks skipped and explicit reasons.
• Finding identities.
• Source and destination of handoff.
• Gate result.
• Stop reason.
• One next action.

────────

10. Testing and evaluation strategy

Treat agent definitions and orchestration policies as testable production assets.

Create a fixture suite containing deliberately defective candidate scenarios, including:

• Obvious logic defect.
• Subtle regression.
• Missing acceptance criterion.
• Stale reviewed SHA.
• Remote/local artifact mismatch.
• Unapproved path in the diff.
• Misleading but technically accurate UI copy.
• Test suite that cannot detect a planted mutation.
• Invented owner decision.
• Missing reviewer.
• Repair-cycle limit exceeded.
• Harmless candidate that should pass without manufactured blockers.

Measure reviewer and agent-stack quality using:

• Seeded defects caught.
• Material defects missed.
• False blockers.
• Unsupported findings.
• Authority violations.
• Scope expansion.
• Invalid state transitions.
• Cost and elapsed time.
• Whether the agent stopped when evidence was insufficient.

Required test layers should include:

• Domain state-machine tests.
• Schema validation.
• Gate-engine unit and integration tests.
• Adapter contract tests.
• Event replay tests.
• Permission and prohibited-action tests.
• Agent prompt/fixture evaluations.
• UI component tests.
• 3D interaction tests where feasible.
• Browser end-to-end journeys.
• Visual regression checks for key camera positions and workflow states.
• Provenance-graph derivation and replay tests.
• Knowledge compilation tests preserving source immutability.
• Mind Scan fixtures for contradictions, orphans, supersession and copied live state.
• Visual-contract tests ensuring epistemic categories cannot be rendered as a stronger authority class.
• Performance budgets for representative desktop and mobile devices.
• Accessibility checks for non-visual access to essential state.

────────

11. Delivery phases

Phase 0 — Foundation and governed design

Execute this phase now. Do not proceed automatically to Phase 1.

Required outputs:

1. Repository inspection and environment report.
2. Proposed final repository architecture.
3. Product vision and V1 boundary.
4. Governance constitution files.
5. Agent roster definitions and permission matrix.
6. Structured contract/schema plan, with initial schemas where useful.
7. System architecture and event model.
8. Threat model.
9. Karpathy-style knowledge structure and SCHEMA.md.
10. Knowledge ontology and provenance-graph model covering sources, pages, claims, support, contradiction, supersession, owner decisions, code and verified run evidence.
11. Epistemic visual contract mapping each knowledge and authority class to a stable 3D representation.
12. Two-world navigation and causal-connection architecture for Orbital Foundry and The Mind of Virgil.
13. Art bible covering both environments: colour, lighting, materials, camera, motion, environment, character language, knowledge forms and prohibited generic treatments.
14. A lightweight Orbital Foundry technology spike proving that the selected rendering stack can produce the intended signature psychedelic-space look.
15. A focused Mind of Virgil spike showing one immutable source artifact, one compilation operation, one durable knowledge node, one provenance tether and one contested or unverified state. These spikes are art-direction and data-contract proofs, not the final interface.
16. Mind Scan design and fixture plan.
17. Performance strategy and device tiers.
18. Test and agent-evaluation strategy.
19. ADRs for material technology choices.
20. A bounded Phase 1 brief for the integrated playable vertical slice.
21. A complete Phase 0 run record and explicit go/no-go recommendation.

Phase 0 must not:

• Build the full orchestrator.
• Connect privileged GitHub credentials.
• Launch production agents against other repositories.
• Create an autonomous repair loop.
• Merge or deploy.
• Fill the universe with placeholder content and call it a product.
• Reduce The Mind of Virgil to a folder browser, documentation sidebar or ordinary graph visualisation.
• Claim to display a model’s literal private thoughts, hidden reasoning or consciousness.

Phase 1 — Playable visual vertical slice

Build one integrated fictional story using deterministic mock events:

1. A scoped task enters one project station in Orbital Foundry.
2. It passes through build, sealed-artifact handoff, deterministic verification and independent review.
3. Provide both a passing route and a quarantine/blocker route.
4. A verified run record travels to the Mind gateway.
5. The user transitions into The Mind of Virgil.
6. One immutable source and verified run artifact are compiled into one proposed lesson.
7. The lesson becomes a durable wiki node with visible provenance tethers only after its required verification/approval state is satisfied.
8. A conflicting or unsupported claim remains visibly contested rather than being silently absorbed.
9. A focused Mind Scan identifies the contested state and returns inspectable evidence.

The slice must establish the art bar, world transition, epistemic visual language and end-to-end data contract before expanding product breadth.

Phase 2 — Read-only real Mission Control

Connect allowlisted repository and GitHub read models. Render real branch, SHA, PR, check and review state without launching agents or modifying repositories.

Phase 3 — Governed session launching

Create isolated worktrees and launch bounded agent assignments. Ingest structured results. Keep merge owner-only.

Phase 4 — Project Foundry

Create new project repositories from approved templates, acceptance contracts and owner-approved scopes.

Phase 5 — Multi-project universe and replay

Add portfolio-scale spatial navigation, dependencies, cost/usage telemetry, timeline replay, alerts, the complete navigable Mind of Virgil, production knowledge compilation and linting, and carefully bounded recurring observation.

Phase 6 — Hardening and release

Security review, performance tuning, accessibility, cross-platform validation, agent evals, recovery drills, documentation and packaging.

────────

12. Instructions for this first Claude Code session

1. Confirm that the current repository is the intended new virgil-mission-control repository and report whether it is empty, newly initialised or contains existing work.
2. Read all existing repository instructions before proposing changes.
3. Do not access or modify Steady State or any other repository.
4. Do not create external services, incur paid usage, push, merge or deploy unless explicitly authorised.
5. Treat this document as product authority for the commission, subject only to explicit owner decisions and contradictions discovered during Phase 0.
6. Ask only questions whose answers materially block Phase 0. For each, explain the consequence and recommend a default. Do not present a large preference questionnaire.
7. Produce the Phase 0 plan before editing.
8. Map every proposed Phase 0 deliverable to this brief.
9. Clearly identify anything deferred to Phase 1 or later.
10. Use the highest-reasoning model configured for the session for architectural and governance work. Do not silently substitute a weaker model for critical review.
11. Maintain a run record containing commands, files changed, checks run, skipped checks, limitations and the exact resulting commit if a commit is authorised.
12. Stop after Phase 0 with:
  • deliverables completed;
  • files created or modified;
  • tests and validations run;
  • open owner decisions;
  • risks;
  • Phase 1 readiness verdict;
  • one recommended next action.

────────

13. Acceptance criteria for Phase 0

Phase 0 is acceptable only if:

• The architecture preserves role separation and owner-only merge authority.
• Operational truth, derived read models and wiki knowledge are clearly separated.
• Deterministic gates are distinguished from LLM judgments.
• The agent roster has explicit, non-overlapping permissions and stop conditions.
• The repair-cycle limit is encoded in authority and planned state transitions.
• The event model can support timeline replay.
• The two 3D worlds map directly to operational and knowledge entities and events.
• Orbital Foundry and The Mind of Virgil have distinct purposes, a coherent shared art direction and a defined transition between them.
• The knowledge ontology distinguishes raw evidence, durable knowledge, owner decisions, hypotheses, contradictions, supersession, unverified claims and live operational signals.
• Provenance tethers are reproducible from inspectable sources rather than invented by the renderer.
• The art bible is specific enough to prevent a generic dashboard, folder-browser wiki or primitive placeholder aesthetic from becoming the final design.
• Both rendering spikes provide credible evidence that the intended psychedelic-space quality and epistemic visual language are technically achievable.
• The integrated first playable slice is tightly bounded and testable.
• The knowledge wiki has provenance, linting and anti-drift rules.
• Security and prompt-injection risks are addressed before privileged integrations.
• No other repository was accessed or modified.
• No merge or deployment occurred.

If any of these conditions cannot be met, report NO-GO with evidence rather than manufacturing completion.

────────

14. Final product principle

Virgil Mission Control must make autonomous digital work feel alive without making it mysterious.

The universe may be surreal. The evidence must be exact.

The workers may have personality. Their authority must be bounded.

The handoffs may be cinematic. The candidate SHA must be immutable.

The Mind may feel alive. Its sources, uncertainty and contradictions must remain visible.

Knowledge may compound. Live operational truth must never be copied into stale memory.

The product may look like a game. It must govern real work like a serious system.
