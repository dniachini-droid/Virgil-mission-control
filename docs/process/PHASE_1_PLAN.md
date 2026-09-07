# Phase 1 implementation plan — the playable vertical slice

Authored by the Architect (planning session, 2026-09-07) against base SHA `118aa44d1537ebb6c87f03241500fdd333be6d80` on `main`.
Sources: `docs/product/VIRGIL_MASTER_COMMISSION.md` sections 5.5 and 11 and Amendment 1 (including the Phase 1 vertical-slice amendment); `docs/process/PHASE_1_BRIEF.md`; `docs/architecture/ENFORCEMENT_BOUNDARIES.md`; `docs/architecture/PERFORMANCE_STRATEGY.md`; `docs/art-direction/ART_BIBLE.md` and `ROLE_PERFORMANCE_BIBLE.md`; `docs/art-direction/approved/README.md`; `assets/README.md`; `assets/licenses/ASSET_PROVENANCE.md`; owner decisions OD-0002 to OD-0006 (currently at `docs/decisions/proposed/`, treated as accepted authority per the owner's instruction).

**Status: plan only. Nothing in this document is built, and this session built nothing.** The plan proposes work; it does not authorise it. Two owner decisions in Part 6 and three preconditions in Part 7 stand between this document and the first line of Phase 1 code.

Verdict: **GO, conditional on the three preconditions in Part 7.** One of those preconditions is that `pnpm check` is currently **failing on `main`** (Part 7, P0). That is a fact this session verified by running it, not an inference.

---

## Part 0 — For the owner, in plain language

Read this part. The rest is for the session that executes the work.

### The problem you named

You said: *"I don't want to build a lot and then see that it looks shit. So would like to see your plan for phase 1 first."*

Two things follow from that, and this plan is built around both.

1. **You have to be able to look at it, on your own machine, early.** Right now you cannot. The document that was supposed to let you judge the art (`docs/process/ART_DIRECTION_CHECKPOINT.md`) tells you to install a developer toolchain and run two terminal commands. You are not going to do that, and it was written as though you would. That is a real gap in what Phase 0 delivered, and closing it is the first piece of Phase 1 work.
2. **Saying "no" has to stay cheap.** So the work is ordered to put the look in front of you when almost nothing has been built, and to keep the expensive parts behind three separate "yes"es from you.

### How you will see the work

**You will get one file. You download it and double-click it.**

Every time there is something to look at, a session will build a single `.html` file that contains the entire 3D world inside it — no installation, no terminal, no server, nothing to sign up for, no cost. You open GitHub in your browser, click the file, click "Download raw file", and double-click it in your Downloads folder. It opens in Chrome, Firefox, Edge or Safari and runs on your computer's own graphics card.

That last part is the point. The containers these sessions run in have no graphics hardware, so any picture a session produces is rendered in software and — as the Phase 0 record already says — may make the glow, the colour and the bloom look better or worse than they really are. Your machine has a real graphics card. **You are the only working display in this project.** The plan is designed around that rather than pretending otherwise.

**What looking at it proves:** whether it looks right. Colour, glow, materials, shapes, movement, camera, readability, whether the characters are charming. That is the judgement you asked for and it is the judgement that matters here.

**What it does not prove:** how fast it runs. You will have an impression of speed, and an impression is not a measurement — you already decided (OD-0005) that performance stays formally unmeasured in Phase 1 and must be recorded that way. It also tells you nothing about anyone else's computer, or about phones (see Part 5 for the honest state of mobile).

### The order of work, and what a "no" costs at each point

| # | You look at | Roughly | If you say no, this is thrown away |
|---|---|---|---|
| **V0** | Can you open the file at all? (content is the old rejected spike — not an art judgement) | ~1 session | Nothing |
| **V1** | **The look.** One frame of the Foundry and one of the Mind: sky, colour, station, lighting, glow. No characters, no story. | ~3 sessions | The look itself. No characters, no story, no animation, no tests. **This is the cheapest possible complete "no".** |
| **V2** | **One character.** Virgil, built to your approved sheet, standing in the world you approved at V1. | ~3 sessions | One character. Not six. The world survives. |
| **V3** | **One moment of the story.** The commit sealing into its SHA capsule, with the evidence panel beside it. | ~2 sessions | One animation. The world and the character survive. |
| **V4** | **The Foundry story.** All nineteen Foundry beats, both routes, five more characters, replay. | ~8 sessions | A great deal. Which is exactly why V1, V2 and V3 come first. |
| **V5** | **The Mind and the crossing.** Beats 20–24. | ~5 sessions | The Mind half. |
| **V6** | **Mobile, reduced-motion and constrained modes.** Beat 25. | ~4 sessions | The modes work. |
| **V7** | **The finished slice and its honest run record.** Your merge decision. | ~4 sessions | — |

A "session" is one Claude Code session doing one bounded job. The numbers are **guesses** — see Part 5. Nobody has built a Phase 1 slice in this repository before, so there is no velocity to extrapolate from and I will not pretend otherwise.

### The three things only you can do

1. **Unblock the base.** `pnpm check` currently fails on `main`. Your own commit `9627bae` ("Update settings.json") removed two lines that a test still requires. That is not a criticism — you may have removed them deliberately so sessions can file decision records — but the test was not updated to match, so the repository's own check suite is red before Phase 1 starts. Part 7, P0 gives you two ways out and recommends one.
2. **Move the decision files.** OD-0002 through OD-0006 are still sitting in `docs/decisions/proposed/`. Phase 1 does not begin until you move them into `docs/decisions/`.
3. **Answer the two questions in Part 6.** Should Phase 1 be authorised in two halves rather than one? And, later, should the character ensemble be six or four? The first needs an answer now. The second should wait until V2.

### The honest problem with the characters

Six characters have to exist in this slice. Right now the repository contains five drawings and one 3D model that is unrigged and whose licence was never verified against its original source — and **no session can verify it, because sessions have no web access**. So that model is stuck, permanently, unless you paste the licence text in yourself.

Can sessions make the six characters instead? **My honest answer is: probably yes, but I am not certain, and the uncertainty is about charm, not about capability.** The robots you approved are compact, chunky, screen-faced things built from simple rounded shapes. That kind of design can be written as code — original geometry, authored in this repository, no licence problem at all — and chunky robots with separate limbs do not need the complicated skeletal rigging that a humanoid would. The technical route is real.

What I cannot promise is that code-authored robots will be *charming*, and charming is precisely what you approved. That is a thing you look at and know in two seconds and no session can predict for you. So V2 exists: one character, built properly, put in front of you, before the other five are attempted. If V2 fails, Phase 1 needs an artist or a licensed asset pack, and both of those are your decision and your cost — but you should not pay for either before V2 tells you whether you need to.

---

## Part 1 — How the owner sees the work

Everything else in this plan depends on this part, so it comes first.

### 1.1 The gap this closes

`docs/process/ART_DIRECTION_CHECKPOINT.md` is Phase 0's answer to "how does the owner judge the art". It says:

> On a machine with a GPU, at desktop tier, in a current Chromium or Firefox: `pnpm install`, `pnpm --filter mission-control dev`.

That mechanism assumes a reader who will install Node, install pnpm, clone a repository and run a dev server. The owner will not, and has said so. The brief specifies twenty-five story beats and never says how the owner looks at any of them. **The slice therefore has no delivery mechanism to the only person authorised to judge it.** That is the first thing Phase 1 builds.

### 1.2 Constraints the mechanism has to satisfy

| Constraint | Source | Consequence |
|---|---|---|
| No GPU in session containers | `PERFORMANCE_STRATEGY.md`, `docs/art-direction/spikes/capture-report.json` (renderer: `ANGLE … SwiftShader`) | Sessions cannot judge the look. Rendering must happen on the owner's hardware. |
| Software captures may overstate or understate bloom and colour | `PHASE_0_RUN_RECORD.md` line 65 | Still images produced in a container are not a sufficient basis for the owner's judgement, and this plan never uses them as one. |
| No paid services, subscriptions or commercial assets | `CLAUDE.md`, hard limits | No hosted preview service, no GPU runner, no CDN, no asset store. |
| The repository is **private** (verified via the GitHub API at plan time: `"private": true`) | GitHub | GitHub Pages on a private repository requires a paid plan. Pages is therefore unavailable without either a paid plan or making the repository public. Both are owner decisions; neither is assumed here. |
| The owner will not run a toolchain | owner console, this session's brief | No `pnpm`, no `npm`, no terminal, no local web server, no build step on the owner's side. |
| Visual judgement in Phase 1 is the owner's own | `OD-0005` | No automated baseline substitutes for it, and no session awards itself a visual pass. |

### 1.3 The mechanism: the Owner Build

**One self-contained HTML file per viewing point.** The whole application — JavaScript, CSS, shaders, textures, any geometry — inlined into a single file that runs from `file://` with no network access and no server.

Mechanics, for the session that builds it:

- Add a build target `pnpm --filter mission-control build:owner` producing `virgil-<stage>-<shortSha>.html`.
- The bundle must be a **classic script** (`build.rollupOptions.output.format = 'iife'`, `inlineDynamicImports: true`), not an ES module. Browsers refuse ES-module `<script type="module">` loads over `file://`; a classic inline script runs. This is the single detail on which the whole mechanism turns.
- Every asset becomes a `data:` URI. `fetch()` and `XMLHttpRequest` are blocked over `file://`, so nothing may be loaded at runtime — including any GLB, texture or JSON. Fixture data is already TypeScript and compiles in; that is fortunate and should be preserved.
- Inlining route, in order of preference:
  1. **A ~40-line Node script under `apps/mission-control/build/`** that reads the Vite `dist/` output and writes one HTML file. No new dependency, no ADR, and it stays inside the brief's already-permitted paths.
  2. `vite-plugin-singlefile` (MIT). Cleaner, but it is a new dependency and therefore needs an ADR and a licence row; and `tools/` is **not** in the brief's permitted areas. Only take this route if route 1 proves inadequate.
- **Every Owner Build carries a footer**, rendered in the page, containing: the source commit SHA, the build's own SHA-256, the stage name, and the sentence *"Performance on this machine is not a measurement and is not recorded as one."* The SHA-256 is recorded in the run record. This is what makes the artifact auditable and is why the Transport Inspector joins the review formation (Part 3).
- **Estimated size 2–4 MB.** Unmeasured: this session did not run a build, because the Architect's Bash policy is read-only (`constitution/permission-matrix.json`, `bashPolicy: read-only-git-and-status`). The estimate comes from the installed dependency sizes (`three` 0.185.1 unminified is 636 KB). The Phase 1 budget is ≤ 12 MB desktop, so there is comfortable headroom, but the first real number should be recorded at V0.

### 1.4 How the file reaches the owner

**Default route — commit and download.** The session commits the file to the Phase 1 branch under `docs/process/owner-builds/`. The owner opens the repository on github.com, clicks the file, clicks **Download raw file**, and double-clicks it. No account setup, no tooling, no service, no cost, works offline afterwards.

Cost of this route: binary-ish blobs accumulate in git history. At 2–4 MB across seven viewing points that is 15–30 MB. Acceptable; the repository is already 60 MB. Old builds should be deleted from the tree (not from history) once superseded, and the run record keeps the hashes.

**Alternative route, if the owner dislikes files in git — GitHub Actions artifact.** A workflow builds the file on push and uploads it as a workflow artifact; the owner downloads it from the Actions tab. Consequences the owner must weigh:
- `.github/workflows/**` is **outside** the Phase 1 brief's permitted areas, so it needs the owner's authorisation to extend them.
- It introduces a CI credential surface and an external action, which adds the **Security Sentinel** to the review formation (Part 3).
- Actions minutes on a private repository are metered. The free tier includes minutes each month and a Vite build is a couple of minutes, so this is very unlikely to become a paid service — **but I cannot read the account's billing plan from this session and will not assert that it is free.**

**Not available — GitHub Pages.** Private repository; Pages there requires a paid plan, which `CLAUDE.md` forbids. The only routes to Pages are making this repository public, or creating a separate public repository holding only the built file. The first has disclosure consequences the owner should decide deliberately; the second is outside this repository's boundary and a session must not do it. Recorded, not recommended, not acted on.

### 1.5 The viewing script

Alongside the build, Phase 1 delivers `docs/process/HOW_TO_LOOK.md`: one page per viewing point, in the owner's language, containing:

- What to download and how to open it (three sentences, with the fallback if the browser blocks it).
- What to click, in order.
- The three to five questions this particular viewing point is asking, and **only** those.
- The verdict vocabulary already established in `ART_DIRECTION_CHECKPOINT.md`: **PASS**, **PASS WITH DIRECTION** (with the changes listed), **FAIL**. Using the existing vocabulary means the owner's reply lands as a recordable decision instead of a comment.
- The sentence the owner needs in order to reject cheaply: *"you may say FAIL without a reason; a reason makes the next attempt better but is not required."*

### 1.6 What the mechanism proves and does not prove

**Proves**
- The look, on real graphics hardware, at real resolution: palette, nebula, bloom, materials, silhouettes, composition, camera movement, motion quality, legibility with colour removed, reduced-motion behaviour, the tier switch's *rendering* behaviour.
- That the world and the evidence panel agree — the owner can read the panel and check the world just did what it says.
- That rejection is available early and repeatedly.

**Does not prove**
- **Performance.** Formally deferred by OD-0005, must be recorded as *not performed*, never as met. The owner's impression of smoothness is not a measurement. A session that writes "ran smoothly on the owner's machine" into a run record has violated OD-0005.
- **Anything about other devices.** One machine, one browser, one operating system, one GPU.
- **Mobile.** Opening a downloaded `.html` from local storage works on Android via a file manager and is unreliable on iOS. See Part 5, item 6, for the honest position and the fallback.
- **A visual regression baseline.** It is not one and does not become one (OD-0005).
- **Correctness.** It is one build of one SHA judged by eye. Deterministic checks and independent review remain the evidence (`CLAUDE.md`: *a builder's success report is not evidence*).

### 1.7 Consequence for an existing document

`docs/process/ART_DIRECTION_CHECKPOINT.md` describes a mechanism the owner will not use. Phase 1 should update it to point at the Owner Build. That file is under `docs/process/` and inside the brief's permitted areas, so a session may do it — but **this session did not**, because it is not this session's job to edit a checkpoint record while planning against it. It is task T1.3 in Part 4.

---

## Part 2 — Staged order of work

The ordering principle is requirement two, stated as a rule: **build the cheapest thing that can be rejected, and put it in front of the owner before building anything that depends on it.**

Two structural facts make this unusually achievable here, and both were verified in the repository rather than assumed:

1. **The data spine for all twenty-five beats already exists on `main`.** `packages/test-fixtures/src/runs/foundry.ts` emits 83 events across 42 distinct types covering beats 1–19 (including `scope_proposed`, `plan_completed`, `file_read`, `repository_searched`, `changes_staged`, `candidate_committed`, `candidate_pushed`, `check_skipped`, `finding_raised`, `candidate_quarantined`, `repair_authorised`, `candidate_changed_after_review`, `safe_to_merge`, `merged_by_owner`). `runs/mind.ts` covers beats 20–24. `packages/visual-language/data/animation-grammar.json` holds **74 event-to-animation mappings** covering every event type the twenty-five beats need. The brief's instruction to "extend the fixtures with the scope and plan stages" is largely already satisfied.
2. **Therefore nearly all of the throwaway risk is in the visual layer alone**, and the visual layer is the last thing that has to be built and the first thing the owner can judge. That is what makes a cheap "no" structurally possible rather than merely aspirational.

### The stages

| Stage | Delivers | Owner viewing point | Rough size | **Thrown away if rejected here** |
|---|---|---|---|---|
| **S0 — Unblock the base** | P0 resolved; KR-03 anchor prepared; KR-07 wording prepared | none (owner reads two short proposals and acts) | 1 session + owner action | **Nothing.** Entirely art-independent. |
| **S1 — The Owner Build** | Single-file build target, inliner, SHA footer, `HOW_TO_LOOK.md`, one build of the *existing rejected spike* purely to prove the pipe | **V0 — "can you open it?"** Explicitly not an art judgement | 1 session | **Nothing.** Reused by every later stage. |
| **S2 — The look frame** | One Foundry hero composition and one Mind hero composition, live and orbitable: nebula and sky shaders, palette re-tuned from `03-approved-hybrid.png`, station/dock/gateway geometry with final materials and lighting, bloom, one label plate, tier and reduced-motion switches. **Featureless blockouts where characters will stand.** No events, no beats, no Evidence View. | **V1 — the art bar.** PASS / PASS WITH DIRECTION / FAIL against the `ART_DIRECTION_CHECKPOINT.md` rows *signature look*, *legibility*, *two worlds* | 2–3 sessions | Shader, material, lighting, palette and composition work — real, but bounded to the look itself. **No character work, no animation, no story wiring, no fixtures, no journeys are lost.** This is the cheapest complete "no" the project can offer. |
| **S3 — One character** | Virgil, authored to `assets/concepts/characters/virgil-turnaround.png` and `virgil-multiview.png`, with screen face, standing in the S2 composition, one idle and one refusal pose; plus the recorded decision on the authoring route | **V2 — the character bar.** "Is this the robot from the sheet, and is it charming?" | 2–3 sessions, genuinely uncertain | **One character, not six.** The approved world from V1 survives untouched. |
| **S4 — One authenticated beat** | Beat 8 (commit sealing into the SHA capsule) driven by the real fixture event through `animationFor`, with its Evidence View plate, its reduced-motion equivalent, and the test proving the animation cannot play without its event and evidence | **V3 — motion and truth.** "Does it move well, and does the panel say what the world just did?" | 2 sessions | One beat's animation and the Evidence View styling. The grammar and event plumbing survive. |
| **S5 — Foundry slice** | Beats 1–19 on `passingRun` and `blockedThenRepairedRun`; the five remaining characters; camera choreography; quarantine, repair and airlock areas; timeline replay with pause, step, scrub, jump-to-event and jump-to-evidence; Playwright journeys for the passing and quarantine routes; distinct-state tests | **V4 — the slice** | 6–9 sessions | A great deal. Which is why V1, V2 and V3 stand in front of it. |
| **S6 — Mind and crossing** | Beats 20–24: gateway crossing as one continuous camera move on one scene graph; Archive Nebula, Synaptic Forge, Living Knowledge Galaxy at slice scale; the contested claim; Mind Scan; the provenance tether; Playwright journeys for the crossing and the scan | **V5 — the Mind** | 4–6 sessions | The Mind half. The Foundry survives. |
| **S7 — Modes and access** | Beat 25: desktop, mobile, reduced-motion and constrained demonstrations; keyboard reachability of every selectable object; aria names; the compact mobile Evidence View; **code-split bundles per world** | **V6 — the modes** | 3–4 sessions | The mode work. |
| **S8 — Verify, review, record** | Prover verification against the S0 anchored required-check set; Keeper, Interface Keeper, Performance Examiner and Transport Inspector reviews; the Phase 1 run record stating the two deferred checks as **not performed** and why; updated art bible; `role-performance.json` rewritten under OD-0002; Phase 2 brief proposal | **V7 — the owner gate** | 3–4 sessions plus review | — |

**Total: roughly 24–36 sessions.** That is an order of magnitude, not a commitment. See Part 5, item 3.

### Notes on particular stages

**S1 is first, and deliberately shows the rejected spike.** The riskiest untested assumption in this entire plan is *"the owner can open the file"*. Testing that assumption costs one session and proves it against content nobody has to like. Building the look first and then discovering the delivery does not work would waste the look. `HOW_TO_LOOK.md` for V0 must say in its first line that the content is the rejected Phase 0 spike and is not being offered for judgement — otherwise the owner will reasonably read a "no" into it, and the wrong thing gets rejected.

**S2 deliberately contains no characters.** Splitting "does the world look right" from "do the characters look right" is what makes both rejections cheap. They are also different skills with different risk: the world is shaders and lighting, which sessions do well; the characters are charm, which is the open question.

**S3 and S4 can run in parallel.** Both depend only on V1. One session builds Virgil; another builds the commit-sealing beat using a blockout. They touch different files.

**S7's code-splitting contradicts S1's single file, and both are required.** The brief's deliverable is "code-split bundles per world"; the Owner Build is one file with everything inlined. These are two build targets over one source: `build` (code-split, the product) and `build:owner` (single file, the viewing artifact). S7 must produce and check both, and the run record must not present the single-file build as evidence that code-splitting works.

**S8 has a constraint the Performance Examiner does not normally operate under.** Under OD-0005 that role may review only what is countable without a GPU — draw calls, triangle counts, texture memory, bundle bytes, the reduction order, the tier-selection logic — and must record frame time and device performance as **not performed**. It may not write "no failure observed" as a measurement. This belongs in that role's stage assignment in writing, because it inverts the role's normal method.

---

## Part 3 — Risk classification and reviewer formation

### Classification

**Level: moderate.** This confirms `PHASE_1_BRIEF.md`. The slice runs on deterministic mock events; it touches no credentials, no external repository, no live Git or GitHub, no personal data and no state machine. Its risk is concentrated in rendered truthfulness and in resource behaviour, not in safety or destruction.

| Flag | Set | Why |
|---|---|---|
| `renderedUi` | yes | The slice is almost entirely rendered UI. |
| `accessibility` | yes | Keyboard reachability of every selectable object, aria names, reduced motion are acceptance criteria. |
| `mobile` | yes | Beat 25 and Amendment 1 section R. |
| `userFacingCopy` | yes | Every label, state name and Evidence View field is user-facing truth; "misleading but technically accurate UI copy" is a named fixture defect class (commission section 10). |
| `expensiveRendering` | yes | Two 3D worlds, custom shaders, post-processing, a continuous camera move across both. |
| `resourceBudget` | yes | `PERFORMANCE_STRATEGY.md` tier budgets. |
| `generatedArtifacts` | **yes — new** | The Owner Build is a generated artifact that leaves the repository and becomes the basis of an owner decision. |
| `canonicalFiles` | **yes — new** | The file the owner opens must be provably the file built from the reviewed SHA. |
| `permissionChange` | **yes — new** | S0 prepares the KR-03 required-check anchor and the KR-07 wording of `AUTHORITY_TIERS.md` invariant 3. The session-performed part is *preparation only*; enactment is the owner's. |
| `externalActions` | conditional | False under the default delivery route. **True** if the owner chooses the GitHub Actions route (§1.4). |
| `safetyLogic`, `destructiveOperations`, `stateMachineChange`, `migration`, `authentication`, `secrets`, `personalData`, `payments`, `domain` | no | Nothing in the slice touches these. |

The three "new" flags are additions to the brief's list. The brief was written before the owner-viewing requirement existed, so it had no reason to classify a generated artifact leaving the repository.

### Formation

**Smallest adequate formation: Keeper, Interface Keeper, Performance Examiner, Transport Inspector. Arbiter only if findings conflict.**

| Role | In | Why |
|---|---|---|
| **Keeper** | always | Independent review of the exact immutable SHA against contract, plan and diff. Non-negotiable under `REVIEW_POLICY.md`. |
| **Interface Keeper** | always | The whole slice is rendered UI, accessibility, mobile and user-facing truth — and specifically *"whether the visual world tells the same truth as the evidence"*, which is Amendment 1's foundational rule. This is the role that catches an animation that plays without its event. |
| **Performance Examiner** | always, **constrained** | `expensiveRendering` and `resourceBudget`. Constrained by OD-0005 to static, countable properties; must record frame time and device performance as *not performed*. Its normal instrument is unavailable and the stage assignment must say so. |
| **Transport Inspector** | **always — added to the brief's formation** | The Owner Build is exactly this role's remit: *"remote/local byte equality, generated artifacts, canonical files and immutable candidate integrity."* Every owner viewing point produces a file that leaves the repository and is judged on the owner's machine; if that file is not the reviewed SHA's output, the owner's decision is attached to the wrong artifact. This role verifies the build is reproducible from the SHA and that the recorded SHA-256 matches. |
| **Arbiter** | conditional | Only if findings conflict, overlap or need a consolidated repair contract. |
| **Security Sentinel** | conditional | **Only** if the owner chooses the GitHub Actions delivery route, or the public-repository/Pages route. Both add external actions and a credential surface. Not otherwise: the slice has no credentials and makes no external writes. |
| **Integrator** | conditional | Only for the S0 KR-03 task, *if* the required-check anchor turns out to touch `packages/gate-engine` or `packages/domain`. Not for the slice itself: the domain, contracts and gate engine are unchanged by rendering work. |
| **Breaker** | no | No destructive operations, no safety logic, no state corruption paths in a fixture-driven slice. |
| **Domain Verifier** | no | No governed scientific, medical, legal, financial or business domain. |

Specialists review in parallel against the same SHA; the Arbiter consolidates only on conflict, per `REVIEW_POLICY.md` and commission section 4.2 (*"do not activate the entire roster by default"*).

### One distinction that must not blur

**An owner viewing point is not a review.** The owner's verdict at V1–V6 is an owner decision about the look. The Keeper's verdict at S8 is an independent review of the candidate. Neither substitutes for the other, and a PASS at V4 does not make a candidate `SAFE_TO_MERGE`. The run record must keep them in separate columns, or the project will have quietly invented a route where liking something makes it eligible.

---

## Part 4 — Task graph

### Tasks

| Id | Task | Depends on | Permitted paths | Required checks |
|---|---|---|---|---|
| T0.1 | Resolve P0: reconcile `.claude/settings.json` deny rules with `constitution/authority.json` and `permission-matrix.test.ts`. **Owner-enacted**; a session prepares the two options and the diff | — | prepared proposal under `docs/process/PHASE_1_*` only | `pnpm check` |
| T0.2 | KR-03: prepare the owner-controlled required-check anchor — the file, its shape, the code that reads it, and the test. **The owner-controlled file is enacted by the owner** | T0.1 | proposal under `docs/process/PHASE_1_*`; implementation paths named in the proposal, authorised separately | `pnpm check` |
| T0.3 | KR-07: prepare the exact replacement wording for invariant 3 of `constitution/AUTHORITY_TIERS.md`. **Never enacted by a session** | — | `docs/process/PHASE_1_*` | knowledge-lint |
| T1.1 | Owner Build target and inliner | T0.1 | `apps/mission-control/**` | `pnpm check`, build |
| T1.2 | `HOW_TO_LOOK.md` | T1.1 | `docs/process/**` | knowledge-lint |
| T1.3 | Update `ART_DIRECTION_CHECKPOINT.md` to the Owner Build mechanism | T1.1 | `docs/process/**` | knowledge-lint |
| T1.4 | **V0** — owner opens the file | T1.1–T1.3 | — | — |
| T2.1 | Palette re-tune from `03-approved-hybrid.png` into `packages/visual-language/data/tokens.json` | V0 | `packages/visual-language/data/**` | `pnpm check` |
| T2.2 | Foundry hero composition: sky, nebula, station, docks, gateway, lighting, materials, bloom | T2.1 | `apps/mission-control/src/world/**`, `src/scenes/**` | `pnpm check` |
| T2.3 | Mind hero composition | T2.1 | as T2.2 | `pnpm check` |
| T2.4 | Tier and reduced-motion switches wired into the composition | T2.2 | `apps/mission-control/src/ui/**` | `pnpm check` |
| T2.5 | **V1** — the art bar | T2.2–T2.4 | — | — |
| T3.1 | Virgil geometry, materials, screen face | V1 | `apps/mission-control/src/characters/**`, `assets/**` + provenance row | `pnpm check` |
| T3.2 | Virgil idle and refusal poses | T3.1 | as T3.1 | `pnpm check` |
| T3.3 | **V2** — the character bar | T3.1–T3.2 | — | — |
| T4.1 | Beat 8 animation through `animationFor`, full-motion and reduced-motion | V1 | `apps/mission-control/src/**`, `packages/visual-language/**` | `pnpm check` |
| T4.2 | Evidence View plate for beat 8 | T4.1 | `apps/mission-control/src/ui/**` | `pnpm check` |
| T4.3 | Test: the animation cannot play without its event and evidence | T4.1 | `apps/mission-control/test/**` | `pnpm check` |
| T4.4 | **V3** — motion and truth | T4.1–T4.3 | — | — |
| T5.1 | Fabricator, Prover, Keeper, Cartographer, Architect | V2, V3 | as T3.1 | `pnpm check` |
| T5.2 | `role-performance.json` rewritten under OD-0002 (approved sheets govern the silhouette column) | T5.1 | `packages/visual-language/data/**` | `pnpm check` |
| T5.3 | Foundry beats 1–19 on both fixture runs | V3 | `apps/mission-control/src/**` | `pnpm check` |
| T5.4 | Fixture gap-fill: verify and add any event the beats need and the fixtures lack (candidates observed missing: `agent_waiting`, `review_blocked`, `review_insufficient_evidence`) | T5.3 | `packages/test-fixtures/**` | `pnpm check` |
| T5.5 | Camera choreography, overview-to-detail | T5.3 | `apps/mission-control/src/world/**` | `pnpm check` |
| T5.6 | Timeline replay: pause, step, scrub, jump-to-event, jump-to-evidence | T5.3 | `apps/mission-control/src/ui/**` | `pnpm check` |
| T5.7 | Playwright journeys: passing route, quarantine route | T5.3–T5.6 | `tests/**`, `apps/mission-control/e2e/**` | Playwright |
| T5.8 | **V4** — the slice | T5.1–T5.7 | — | — |
| T6.1 | Gateway crossing as one continuous camera move on one scene graph | V4 | `apps/mission-control/src/**` | `pnpm check` |
| T6.2 | Mind environments at slice scale; beats 20–24 | T6.1 | as T6.1 | `pnpm check` |
| T6.3 | Playwright journeys: gateway crossing, Mind Scan | T6.2 | `tests/**`, `apps/mission-control/e2e/**` | Playwright |
| T6.4 | **V5** — the Mind | T6.1–T6.3 | — | — |
| T7.1 | Mobile, reduced-motion and constrained demonstrations (beat 25) | V5 | `apps/mission-control/src/**` | `pnpm check` |
| T7.2 | Accessibility: keyboard reachability, aria names | V5 | `apps/mission-control/src/**` | `pnpm check`, Playwright |
| T7.3 | Code-split bundles per world (product build), alongside the single-file Owner Build | V5 | `apps/mission-control/**` | build, `pnpm check` |
| T7.4 | **V6** — the modes | T7.1–T7.3 | — | — |
| T8.1 | Prover verification against the T0.2 anchored required-check set | V6 | `tests/**` within the authorised test boundary | all required checks |
| T8.2 | Art bible updated with refinements | V6 | `docs/art-direction/**` | knowledge-lint |
| T8.3 | Phase 1 run record, stating both deferred checks as **not performed** and why | T8.1 | `docs/process/PHASE_1_*` | knowledge-lint |
| T8.4 | Phase 2 brief proposal | T8.3 | `docs/process/**` | knowledge-lint |
| T8.5 | Independent review formation (Part 3) against the exact candidate SHA | T8.1–T8.4 | read-only | — |
| T8.6 | **V7** — the owner gate | T8.5 | — | — |

### What runs in parallel

- **T0.1, T0.2, T0.3 and T1.1** are all art-independent and can run before or beside anything. T0.3 has no dependency at all.
- **T2.2 and T2.3** (the two hero compositions) after T2.1.
- **S3 and S4** in full — the character track and the one-beat track both depend only on V1 and touch different files. This is the plan's best parallel pair.
- **T5.1 (characters) and T5.3 (beats)** after their respective gates.
- **T6.x and T7.2 (accessibility)** partially, once the Foundry is stable.
- **T8.5's four reviewers** in parallel against one SHA, Arbiter only on conflict.

### What one session can hold

One session ≈ one coherent surface: roughly one to three files of new application code plus their tests, one owner-facing document, or one review. Concretely:

- T2.2, T3.1, T4.1, T5.6, T6.1 are each comfortably one session.
- **T5.1 must be split**: one session per two characters at most, or the session will run out of context mid-ensemble and produce five characters of declining quality. Three sessions is the realistic shape.
- **T5.3 must be split** by act: beats 1–9 (scope through push), 10–14 (verification and review), 15–19 (quarantine, repair, re-review, eligibility, airlock).
- **No session performs two roles.** `CLAUDE.md`: every role performs one hop. The session that builds T4.1 does not write T4.3's adversarial test as its own proof; the Prover does that at T8.1.

### Module and dependency map (what changes, what does not)

| Module | Phase 1 change |
|---|---|
| `apps/mission-control/` | Substantially rewritten. The Phase 0 spike **visuals** are rejected (OD-0002); the spike's **contract wiring** (`sequence.ts`, `anim.ts`, `useSequence.ts`, the Evidence View data path) is not rejected and should be kept. See Part 5, item 12 — this is a judgement, not a finding. |
| `packages/visual-language/` | `tokens.json` re-tuned (T2.1); `role-performance.json` rewritten under OD-0002 (T5.2); `animation-grammar.json` extended only if a beat needs a mapping that is missing from the existing 74. |
| `packages/test-fixtures/` | Small additions only (T5.4). The spine is already there. |
| `packages/domain/`, `packages/gate-engine/`, `packages/agent-contracts/` | **Unchanged by the slice.** Touched only by T0.2, and only under separately authorised paths. |
| `constitution/`, `docs/product/`, `knowledge/raw/`, `schemas/gate-*`, `docs/decisions/OD-*` | **Untouched by every session.** Owner layer. |

**Data and schema changes: none required by the slice.** The only candidate is T0.2's required-check anchor, whose shape is the owner's to choose. **Migration boundary: none** — there is no persisted state and no deployed instance to migrate.

---

## Part 5 — What this plan cannot determine

Stated plainly, because a tidy plan here would be a dishonest one.

1. **Whether the owner will like it.** Nothing determines this. The plan does not reduce the chance of a "no"; it reduces the cost of one. Those are different achievements and only the second is available to me.
2. **Whether sessions can author characters at the approved level of charm.** This is the largest single unknown in Phase 1. The technical route (Part 0, and Part 5 item 4 below) is sound; charm is not a technical property. Unknown until V2, and deliberately tested there for one-sixth of its cost.
3. **How long any of this takes.** The session counts in Part 2 are **guesses**. There is no Phase 1 velocity in this repository to extrapolate from; the only prior data point is Phase 0, which was documents plus two spikes and is not comparable to shader and character work. Treat the numbers as ordering information, not as a schedule. I would not be surprised by ±50%.
4. **Whether the code-authored character route works.** I believe it does: the approved designs are compact rounded volumes with distinctive equipment, which composes well from parametric geometry; and rigid chunky robots animate by transform hierarchy rather than skinned rigging, which removes the single hardest step. But I have not built one, and no one in this repository has. Guess, labelled as a guess.
5. **The Owner Build's actual size and start-up time.** Estimated 2–4 MB. Not measured: the Architect's Bash policy is read-only and this session did not run a build. First real number at V0.
6. **Whether the owner's phone can open the file.** Android via a file manager usually works; iOS is unreliable for local HTML. **Fallback, and it is a weak one:** judge mobile *layout and tier behaviour* by narrowing the desktop browser window and switching the tier control. That proves the layout and the tier logic; it does not prove the mobile experience, and beat 25's mobile demonstration should be recorded as *demonstrated in emulation, not on a device* unless the owner's phone turns out to open the file. Do not record it as met on a device that never ran it.
7. **Whether the GitHub Actions route is free on this account.** I cannot read the billing plan. Do not assert it is free; ask the owner if that route is chosen.
8. **Performance.** Not merely unknown — formally not to be determined in Phase 1 (OD-0005). Recorded here so nobody later reads its absence as an oversight.
9. **Where the KR-03 required-check anchor should live** — `constitution/`, `schemas/gate-*`, or a new owner-controlled file. That is a Tier 3 file choice and the owner's. A session proposes; it does not choose.
10. **Whether rewriting `role-performance.json` under OD-0002 breaks a test.** `packages/visual-language/test/contracts.test.ts` asserts that all fourteen role entries are distinct and that idle behaviour never describes work. Re-writing the silhouette column to match the approved sheets should preserve both properties, but I have not traced every assertion against every proposed new value.
11. **The memory cost of holding both worlds in one scene graph** for the continuous gateway crossing. Unmeasurable without hardware; it is the most likely place for a resource surprise, and the Performance Examiner cannot measure it under OD-0005 either. Flagged as a known blind spot rather than a solved problem.
12. **Whether the Phase 0 spike code is a useful base.** OD-0002 rejects its *visuals*; it does not reject its *wiring*. I recommend keeping the sequence, animation, Evidence View and settings plumbing and replacing the scene files. I have read those files in outline, not line by line, so this is a judgement and the executing session should verify it before relying on it.
13. **Whether twenty-five beats can hold together as one continuous experience.** They can be built. Whether they *read* as one story rather than a checklist of twenty-five demonstrations is a design question that only becomes answerable at V4, by which point a great deal is built. This is the one risk the staging does **not** de-risk, and I want it on the record.

---

## Part 6 — Should the Phase 1 scope be re-cut?

**Yes — but by re-cutting the authorisation, not by removing beats.** Two proposals. Both are owner decisions; this session does not act on either.

### Proposal A — split Phase 1 into 1A and 1B at an owner gate (recommended)

**The cut.** Phase 1A = stages S0–S4 (unblock, viewer, look frame, one character, one beat). Phase 1B = stages S5–S8 (the twenty-five-beat slice, modes, verification, run record). **1B is not authorised until the owner has passed V1, V2 and V3.**

**Why.** Twenty-five beats is the right *scope* and the wrong *unit of authorisation*. The owner has authorised Phase 1 as a single block of roughly 24–36 sessions whose visual acceptability is unknown until late. Splitting the authorisation caps the cost of a visual "no" at 1A — about six sessions — without removing a single beat, changing a single acceptance criterion, or amending the commission.

**Consequences.**
- Costs: one extra owner decision point, and a small amount of ceremony (a 1A completion note and a 1B authorisation).
- Gains: the worst case stops being "twenty-five beats built and rejected" and becomes "one world frame, one robot and one animation rejected".
- It does **not** need an amendment to `VIRGIL_MASTER_COMMISSION.md` or a rewrite of `PHASE_1_BRIEF.md`. The brief's contents are unchanged. What changes is the shape of the authorisation the owner gave on 2026-09-07, which is why only the owner can make it.
- If the owner declines, the plan still runs in the stage order of Part 2 — the viewing points remain, they simply are not authorisation gates. The owner keeps the ability to stop; they lose the structural guarantee that nothing beyond 1A is built before they have looked.

**This is the answer to "is twenty-five beats in one slice the wrong unit given requirement two".** The unit is wrong. The scope is right.

### Proposal B — reduce the modelled ensemble from six to four (offered; decide at V2, not now)

**The cut.** Model, pose and animate four characters — Virgil, Fabricator, Prover, Keeper — to the approved bar. Represent the Cartographer and the Architect as station-bound presences: their instruments, their working ritual, a silhouette at distance, their stations lit and acting, but not a fully realised character.

**Why it is available.** Commission 5.5 requires "at least three distinctive worker roles (Fabricator, Prover, Keeper, with Virgil, Cartographer and Architect present)" — the word is *present*, not *modelled*. The brief's deliverable line says "modelled worker ensemble for the six visible roles per the role bible **or an owner-approved stylisation direction**". That clause is the room. And OD-0002 approved exactly four character sheets: Virgil, Fabricator, Prover, Keeper. There are **no approved sheets for the Cartographer or the Architect**, so modelling them at all means a session inventing two characters the owner has never seen — which is a worse problem than not modelling them.

**Consequences.**
- Saves perhaps 3–5 sessions and removes two of six character unknowns.
- Costs ensemble richness. Beats 2 and 3 (the Cartographer bounding the idea; the Architect planning without building) would be carried by station and instrument rather than by a character, and would read as weaker than beats 5–8.
- It is a genuine reduction against the brief's deliverables list, so it must be recorded as one, not slipped through as an interpretation.

**Why not now.** If V2 shows sessions can author these robots well and quickly, B is unnecessary and the project loses ensemble quality for nothing. If V2 is slow or weak, B is the honest reduction and the owner will have real evidence to decide on. **Recommendation: defer B to V2.** Note, though, that the missing Cartographer and Architect sheets are a decision the owner must make either way — either approve two more sheets, or accept station-bound presences.

### What should not be cut

The quarantine route (beats 15–17), the contested claim (23) and the Mind Scan (24). These are the beats that show the world telling the truth about failure and uncertainty. A slice that demonstrates only the passing route is precisely the product the commission was written against — *"a serious development-governance system"* whose demo only shows things going well is a dashboard with a nice sky. If pressure comes to cut, cut breadth of polish, not the failure routes.

---

## Part 7 — Preconditions and repository findings

Under `CLAUDE.md`, a session that finds a contradiction reports it and does not resolve it silently. These are reported.

### P0 — `pnpm check` is red on `main`. Blocking.

**Evidence.** Run in this session at base SHA `118aa44`:

```
FAIL packages/agent-contracts/test/permission-matrix.test.ts
 > tool and write-authority overlap
 > session deny rules cover Write and Edit for every path-shaped protected boundary
AssertionError: Write(./docs/decisions/OD-*): expected [...] to include 'Write(./docs/decisions/OD-*)'
```

`constitution/authority.json` lists `docs/decisions/OD-*` as a protected boundary. `.claude/settings.json` no longer denies `Write` or `Edit` on it. The two lines were removed by commit `9627bae` — *"Update settings.json", authored by the owner on 2026-09-07* — which deleted exactly:

```
-      "Edit(./docs/decisions/OD-*)",
-      "Write(./docs/decisions/OD-*)",
```

Lint and typecheck pass; five of six turbo tasks succeed; this is the only failure.

**Why it matters, beyond the red check.**

1. Phase 1 cannot start from a green base, and no Phase 1 candidate can honestly reach `READY_FOR_REVIEW` while a required check fails — which is the very control KR-03 (task T0.2) is about.
2. **OD-0002 and OD-0005 both state, as the reason they remain at `proposed/`, that "`.claude/settings.json` denies `Edit` and `Write` under `docs/decisions/OD-*`". That statement is no longer true on `main`.** The stated protection those records rely on does not currently exist. Nothing was done wrong with the files; the documents now describe a control that has been removed.

**Two ways out, both the owner's.**

- **(a) Restore the two deny rules.** The boundary returns, the test passes, and the owner continues moving OD files by hand. Cheap, reversible, changes nothing else.
- **(b) Keep them removed and amend `constitution/authority.json` and the test** to match the intent in OD-0006 — that a session may file an owner decision on the owner's instruction. This is a Tier 3 authority change and needs the owner's deliberate act, not a session's inference from a settings edit.

**Recommended default: (a).** It restores a green base in one line each, and it does not require deciding a governance question under time pressure. If the owner genuinely wants sessions to file decision records, (b) is the right change — but it should be made as a decision, not as a side effect of a settings edit. **This session did not touch `.claude/settings.json`, `constitution/` or `packages/`, and could not: all three are outside its boundary.**

### P1 — The proposed owner decisions are still proposed. Blocking.

OD-0002, OD-0003, OD-0004, OD-0005 and OD-0006 are at `docs/decisions/proposed/` at base SHA `118aa44`. `PHASE_1_BRIEF.md` and `CLAUDE.md` both say Phase 1 does not begin until the owner moves them into `docs/decisions/`. A transcription ratifies nothing. This plan treats their content as accepted authority because the owner's brief to this session instructed it to; **the files themselves still need moving before any Phase 1 code is written.**

### P2 — The art-direction checkpoint mechanism is unusable by the owner. Non-blocking; fixed by T1.3.

`docs/process/ART_DIRECTION_CHECKPOINT.md` instructs the owner to run `pnpm install` and `pnpm --filter mission-control dev`. The owner will not run a toolchain. The document is not wrong about *what* to judge — its checklist is good and this plan reuses its verdict vocabulary — but its *mechanism* assumes a reader who does not exist. Part 1 replaces the mechanism; T1.3 updates the document.

### P3 — The Architect's write boundary and this document's path disagree. Reported, not resolved.

`constitution/permission-matrix.json` and `.claude/agents/architect.md` both give the Architect the write boundary `docs/architecture/plans/`. This session was instructed to produce `docs/process/PHASE_1_PLAN.md`, which is inside the Phase 1 brief's permitted areas (`docs/process/PHASE_1_*`) but outside the Architect's role boundary. **This session wrote where it was instructed and records the discrepancy rather than resolving it.** If the owner prefers the role boundary to govern, the plan should be moved to `docs/architecture/plans/` — or the matrix amended, which is the owner's layer. Either way it is a one-line fix and it is not this session's to make.

### P4 — `REPAIR_LIMITS.md` still contradicts the code. Carried forward, not resolved.

`constitution/REPAIR_LIMITS.md` says *"the gate engine refuses a `repair_authorised` transition"*. It does not; the reducer does. `ENFORCEMENT_BOUNDARIES.md` already records this and states that it is reported to the owner rather than resolved, because the constitution is owner-controlled. It is still open at `118aa44` and it will become visible in beats 16–17, where the slice renders repair authorisation. A session building those beats must render what the code does, not what the constitution says, and note the divergence in the run record.

### P5 — One stop condition can no longer fire. Recorded so nobody claims it cleared.

`PHASE_1_BRIEF.md` includes the stop condition *"performance budget unmet on the desktop tier after two optimisation passes"*. Under OD-0005 performance is not measured in Phase 1, so this condition cannot be evaluated, cannot fire, and cannot be cleared. It must be recorded in the run record as **not evaluable**, not as satisfied. The brief's other stop conditions are unaffected.

---

## Part 8 — Permitted, protected and untouched areas

**Permitted for Phase 1 sessions** (from `PHASE_1_BRIEF.md`, narrowed per task in Part 4):

```
apps/mission-control/**
packages/visual-language/**          (data changes are art-direction changes under OD-0002)
packages/test-fixtures/**
docs/art-direction/**
docs/process/PHASE_1_*
docs/process/HOW_TO_LOOK.md
docs/process/owner-builds/**         (new: the Owner Build artifacts)
assets/**                            (only with a provenance row written first)
tests/**
```

**Two path questions for the owner**, both raised rather than assumed:

- `docs/process/owner-builds/**` is new. It is inside `docs/process/` and consistent with the brief's permitted `docs/process/PHASE_1_*` in spirit, but it is not literally covered by that pattern. Recommend the owner confirm it, or that builds live at `docs/process/PHASE_1_owner-builds/` so that no confirmation is needed. **Default: use the `PHASE_1_` prefix and avoid the question entirely.**
- `tools/**` is **not** permitted by the brief. The Owner Build inliner therefore goes under `apps/mission-control/build/`, not `tools/`. Recorded so a session does not put it in the natural-looking place and quietly step outside its boundary.
- `.github/workflows/**` is **not** permitted and is touched only if the owner chooses the GitHub Actions delivery route (§1.4), which also adds the Security Sentinel.

**Protected — no session writes these under any grant in Phase 1:**

```
constitution/**                                  (incl. AUTHORITY_TIERS.md; KR-07 is prepared only)
docs/product/VIRGIL_MASTER_COMMISSION.md
docs/decisions/OD-*                              (accepted owner decisions)
knowledge/raw/**                                 (append-only, owner-curated)
schemas/gate-*
packages/domain/src/transitions.ts
constitution/authority.json
packages/gate-engine/**                          (gate changes need an ADR and an owner decision)
.claude/**
```

**Untouched — outside Phase 1 entirely:**

- `apps/orchestration-service/`, `packages/repository-adapters/`, `packages/knowledge-compiler/` — Phases 2 and 3.
- Any real repository, GitHub read model, session launching or live Git state — Phase 2 and later, and `CLAUDE.md`'s hard limits.
- **Sound.** Out of Phase 1 by the owner's decision. `animation-grammar.json` already carries a field for whether sound is an optional reinforcement per mapping; that field is where sound hooks would later go. Phase 1 populates nothing into it and builds no audio.
- Any third-party character or environment asset. Web access is denied, so primary-source licence verification is impossible and `assets/licenses/ASSET_PROVENANCE.md` forbids the import.

---

## Part 9 — The character and asset problem, stated plainly

The brief asked for a direct answer on whether six modelled, rigged, animated, budget-fitting characters are achievable by sessions alone. Here it is.

**What exists today.** Five owner-approved concept drawings (Virgil ×2, Fabricator, Prover, Keeper). One candidate 3D model of Virgil — unrigged, unoptimised, and with its generator licence recorded as *"stated, not verified"*. Zero production-ready runtime assets. The application loads procedural geometry only.

**The candidate model cannot be unblocked by any session.** `ASSET_PROVENANCE.md` requires the TripoSR licence text copied from its primary source before production use. Sessions have no web access (`.claude/settings.json` denies `WebFetch` and `WebSearch`). Therefore **any plan that depends on that GLB is a plan that cannot execute**, and this plan does not depend on it. It stays a candidate, useful for inspecting topology and proportion, until the owner pastes the licence in.

**Sheets exist for four of the six roles.** There are no approved sheets for the Cartographer or the Architect. Modelling them means a session inventing two characters the owner has never approved, which OD-0002's whole purpose was to prevent. This is a genuine gap in the inputs and it needs an owner decision either way: approve two more sheets, or accept station-bound presences (Proposal B).

**Is it achievable by sessions alone? My answer: probably yes, by one specific route, with one specific residual risk.**

- **The route.** Author the characters as original code — parametric geometry composed in `three.js` into the approved silhouettes, with the screen face as a shader-driven emissive panel, and animation by transform hierarchy rather than skinned rigging. The approved designs make this unusually tractable: compact rounded volumes with distinctive bolt-on equipment, and rigid chunky bodies that do not need a skeleton. Everything is authored in this repository from the owner's own sheets, so the licence question disappears entirely.
- **Budget fit is not the risk.** Six code-authored robots at a few thousand triangles each sit comfortably inside the ≤ 300k mobile and ≤ 900k desktop tier budgets. The nebula, the volumetrics and the post-processing pass are where the budget goes — and that is unmeasurable here in any case (OD-0005).
- **The residual risk is charm, and it is real.** "Achievable" and "charming" are different claims. A code-authored robot can nail the silhouette and miss the appeal, and appeal is exactly what OD-0002 approved. Nothing in this repository can tell me in advance which will happen, and I will not guess in the owner's favour.

**What it needs if the route fails at V2.** One of: a human modeller; a CC0 or permissively licensed asset pack imported with primary-source verification (needing either the owner, or a session granted web access for that one task); or assets the owner produces. All three are owner actions with owner costs. **None should be procured before V2**, because V2 costs three sessions and tells the owner which of these they actually need.

---

## Appendix — Implementation plan record

Conforms to `schemas/implementation-plan.schema.json`. `contractId` refers to `PHASE_1_BRIEF.md`, which serves as the approved acceptance contract for Phase 1.

```json
{
  "planId": "PLAN-PHASE-1",
  "contractId": "PHASE_1_BRIEF",
  "projectId": "virgil-mission-control",
  "baseSha": "118aa44d1537ebb6c87f03241500fdd333be6d80",
  "status": "proposed",
  "repositoryFindings": [
    "P0 blocking: pnpm check fails on main. packages/agent-contracts/test/permission-matrix.test.ts expects .claude/settings.json to deny Write and Edit on docs/decisions/OD-*; owner commit 9627bae removed both rules; constitution/authority.json still lists the boundary. Lint and typecheck pass.",
    "P0 corollary: OD-0002 and OD-0005 each cite that deny rule as the reason they remain at proposed/. The cited control no longer exists on main.",
    "P1 blocking: OD-0002 to OD-0006 remain at docs/decisions/proposed/ at the base SHA. Phase 1 does not begin until the owner moves them.",
    "P2: docs/process/ART_DIRECTION_CHECKPOINT.md specifies an owner-viewing mechanism (pnpm install; pnpm dev) the owner will not use. The brief specifies 25 beats and no viewing mechanism at all.",
    "P3: the Architect write boundary is docs/architecture/plans/; this plan was instructed to docs/process/PHASE_1_PLAN.md. Written as instructed, discrepancy reported.",
    "P4: constitution/REPAIR_LIMITS.md still states the gate engine refuses repair_authorised; the reducer does. Open, owner layer, visible in beats 16-17.",
    "P5: the stop condition 'performance budget unmet on the desktop tier after two optimisation passes' cannot be evaluated under OD-0005 and must be recorded as not evaluable.",
    "The data spine for all 25 beats already exists: 83 events across 42 types in packages/test-fixtures/src/runs/foundry.ts, the Mind sequence in runs/mind.ts, and 74 event-to-animation mappings in packages/visual-language/data/animation-grammar.json. Fixture work in Phase 1 is small.",
    "The repository is private, so GitHub Pages requires a paid plan and is unavailable under the no-paid-services limit.",
    "assets/models/candidates/virgil-model-candidate-01.glb cannot be unblocked by any session: licence verification needs a primary source and WebFetch and WebSearch are denied.",
    "No approved character sheets exist for the Cartographer or the Architect; only four of the six visible roles have owner-approved designs."
  ],
  "moduleDependencyMap": [
    { "module": "apps/mission-control", "dependsOn": ["packages/visual-language", "packages/test-fixtures", "packages/domain", "packages/agent-contracts"] },
    { "module": "packages/visual-language", "dependsOn": ["packages/agent-contracts"] },
    { "module": "packages/test-fixtures", "dependsOn": ["packages/agent-contracts", "packages/domain"] },
    { "module": "packages/domain", "dependsOn": ["packages/agent-contracts"] },
    { "module": "packages/gate-engine", "dependsOn": ["packages/agent-contracts"] },
    { "module": "packages/knowledge-graph", "dependsOn": ["packages/agent-contracts"] }
  ],
  "proposedArchitecture": "Two build targets over one source. 'build' produces code-split per-world bundles (the product artifact, Phase 1 deliverable). 'build:owner' produces one self-contained classic-script HTML file with every asset inlined as a data URI, runnable from file:// on the owner's own GPU with no toolchain, no server and no paid service (the viewing artifact). Rendering stays a projection of recorded events: the scene subscribes to fixture event streams through packages/visual-language animationFor, and no animation may play without its typed event and required evidence. The Evidence View reads the same event, never a parallel source. Both worlds share one scene graph so the gateway crossing is one continuous camera move. Every Owner Build renders a footer carrying its source SHA and its own SHA-256, recorded in the run record, so the artifact the owner judged is provably the artifact the Keeper reviewed.",
  "dataSchemaChanges": [
    "None required by the slice.",
    "Conditional: the KR-03 required-check anchor (task T0.2) introduces one owner-controlled file whose location and shape are a Tier 3 owner choice; a session prepares it and the owner enacts it."
  ],
  "migrationBoundary": "None. There is no persisted state, no deployed instance and no external consumer. packages/domain, packages/gate-engine and packages/agent-contracts are unchanged by the slice; the only candidate touch is task T0.2 under separately authorised paths.",
  "testingStrategy": "Unit and contract tests via pnpm check across the workspace on every task. Evidence-coupling tests proving an authenticated animation cannot play without its event and evidence, and that ambient motion cannot impersonate work. Distinct-state tests keeping skipped, failed, passed, reviewed, safe-to-merge, merged and deployed separate. Playwright journeys for the passing route, the quarantine route, the gateway crossing and the Mind Scan. Accessibility checks for keyboard reachability of every selectable object, aria names and reduced motion. Static resource counts (draw calls, triangles, texture memory, bundle bytes) reviewed by the Performance Examiner. Two checks are formally NOT PERFORMED under OD-0005 and must be recorded as not performed, never as met: representative-device performance targets and GPU visual regression baselines. The owner's viewing points are owner decisions about the look and are never recorded as review verdicts or as verification evidence.",
  "riskClassification": {
    "classificationId": "RISK-PHASE-1",
    "contractId": "PHASE_1_BRIEF",
    "level": "moderate",
    "flags": {
      "domain": "none",
      "safetyLogic": false,
      "destructiveOperations": false,
      "stateMachineChange": false,
      "crossComponent": false,
      "apiChange": false,
      "migration": false,
      "sharedInfrastructure": false,
      "renderedUi": true,
      "accessibility": true,
      "mobile": true,
      "userFacingCopy": true,
      "authentication": false,
      "secrets": false,
      "personalData": false,
      "payments": false,
      "externalActions": false,
      "permissionChange": true,
      "generatedArtifacts": true,
      "uploads": false,
      "canonicalFiles": true,
      "remoteLocalEquality": false,
      "expensiveRendering": true,
      "largeData": false
    },
    "requiredFormation": ["keeper", "interface-keeper", "performance-examiner", "transport-inspector"],
    "requiresArbiter": false,
    "rationale": "Confirms the brief's moderate level and adds three flags the brief predates. generatedArtifacts and canonicalFiles are set because the Owner Build leaves the repository and becomes the basis of an owner decision, which brings in the Transport Inspector to prove the artifact the owner opened is the reviewed SHA's output. permissionChange is set because stage S0 prepares the KR-03 required-check anchor and the KR-07 wording of AUTHORITY_TIERS.md invariant 3; the session-performed part is preparation only and enactment is the owner's. The Performance Examiner is included but constrained by OD-0005 to statically countable properties and must record frame time and device performance as not performed. No Security Sentinel: the slice holds no credentials and makes no external writes - unless the owner chooses the GitHub Actions or public-repository delivery route, which adds external actions and brings that role in. No Breaker, no Domain Verifier. Integrator only if task T0.2 reaches packages/gate-engine or packages/domain. Arbiter only on conflicting findings."
  },
  "taskGraph": [
    { "taskId": "T0.1", "title": "Resolve P0: reconcile settings deny rules, authority.json and permission-matrix.test.ts (owner-enacted)", "dependsOn": [], "permittedPaths": ["docs/process/PHASE_1_*"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T0.2", "title": "KR-03: prepare the owner-controlled required-check anchor (owner enacts the file)", "dependsOn": ["T0.1"], "permittedPaths": ["docs/process/PHASE_1_*"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T0.3", "title": "KR-07: prepare replacement wording for AUTHORITY_TIERS.md invariant 3 (never enacted by a session)", "dependsOn": [], "permittedPaths": ["docs/process/PHASE_1_*"], "requiredChecks": ["knowledge-lint"] },
    { "taskId": "T1.1", "title": "Owner Build: single-file classic-script build target and inliner", "dependsOn": ["T0.1"], "permittedPaths": ["apps/mission-control/**"], "requiredChecks": ["pnpm-check", "owner-build"] },
    { "taskId": "T1.2", "title": "HOW_TO_LOOK.md viewing script", "dependsOn": ["T1.1"], "permittedPaths": ["docs/process/**"], "requiredChecks": ["knowledge-lint"] },
    { "taskId": "T1.3", "title": "Update ART_DIRECTION_CHECKPOINT.md to the Owner Build mechanism", "dependsOn": ["T1.1"], "permittedPaths": ["docs/process/**"], "requiredChecks": ["knowledge-lint"] },
    { "taskId": "V0", "title": "Owner viewing point: can the file be opened", "dependsOn": ["T1.1", "T1.2", "T1.3"], "permittedPaths": ["docs/process/PHASE_1_*"], "requiredChecks": ["owner-decision"] },
    { "taskId": "T2.1", "title": "Palette re-tune from 03-approved-hybrid.png into tokens.json", "dependsOn": ["V0"], "permittedPaths": ["packages/visual-language/data/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T2.2", "title": "Foundry hero composition: sky, nebula, station, docks, gateway, lighting, materials, bloom", "dependsOn": ["T2.1"], "permittedPaths": ["apps/mission-control/src/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T2.3", "title": "Mind hero composition", "dependsOn": ["T2.1"], "permittedPaths": ["apps/mission-control/src/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T2.4", "title": "Tier and reduced-motion switches in the composition", "dependsOn": ["T2.2"], "permittedPaths": ["apps/mission-control/src/ui/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "V1", "title": "Owner viewing point: the art bar", "dependsOn": ["T2.2", "T2.3", "T2.4"], "permittedPaths": ["docs/process/PHASE_1_*"], "requiredChecks": ["owner-decision"] },
    { "taskId": "T3.1", "title": "Virgil geometry, materials and screen face from the approved sheets", "dependsOn": ["V1"], "permittedPaths": ["apps/mission-control/src/**", "assets/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T3.2", "title": "Virgil idle and refusal poses", "dependsOn": ["T3.1"], "permittedPaths": ["apps/mission-control/src/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "V2", "title": "Owner viewing point: the character bar", "dependsOn": ["T3.1", "T3.2"], "permittedPaths": ["docs/process/PHASE_1_*"], "requiredChecks": ["owner-decision"] },
    { "taskId": "T4.1", "title": "Beat 8 commit-sealing animation through animationFor, full and reduced motion", "dependsOn": ["V1"], "permittedPaths": ["apps/mission-control/src/**", "packages/visual-language/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T4.2", "title": "Evidence View plate for beat 8", "dependsOn": ["T4.1"], "permittedPaths": ["apps/mission-control/src/ui/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T4.3", "title": "Test: the animation cannot play without its event and evidence", "dependsOn": ["T4.1"], "permittedPaths": ["apps/mission-control/test/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "V3", "title": "Owner viewing point: motion and truth", "dependsOn": ["T4.1", "T4.2", "T4.3"], "permittedPaths": ["docs/process/PHASE_1_*"], "requiredChecks": ["owner-decision"] },
    { "taskId": "T5.1", "title": "Fabricator, Prover, Keeper, Cartographer, Architect (split across sessions; subject to Proposal B)", "dependsOn": ["V2", "V3"], "permittedPaths": ["apps/mission-control/src/**", "assets/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T5.2", "title": "Rewrite role-performance.json under OD-0002", "dependsOn": ["T5.1"], "permittedPaths": ["packages/visual-language/data/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T5.3", "title": "Foundry beats 1-19 on passingRun and blockedThenRepairedRun (split by act)", "dependsOn": ["V3"], "permittedPaths": ["apps/mission-control/src/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T5.4", "title": "Fixture gap-fill for any beat event the fixtures lack", "dependsOn": ["T5.3"], "permittedPaths": ["packages/test-fixtures/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T5.5", "title": "Camera choreography, overview to detail", "dependsOn": ["T5.3"], "permittedPaths": ["apps/mission-control/src/world/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T5.6", "title": "Timeline replay: pause, step, scrub, jump-to-event, jump-to-evidence", "dependsOn": ["T5.3"], "permittedPaths": ["apps/mission-control/src/ui/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T5.7", "title": "Playwright journeys: passing route and quarantine route", "dependsOn": ["T5.3", "T5.5", "T5.6"], "permittedPaths": ["tests/**", "apps/mission-control/e2e/**"], "requiredChecks": ["playwright"] },
    { "taskId": "V4", "title": "Owner viewing point: the Foundry slice", "dependsOn": ["T5.1", "T5.2", "T5.4", "T5.7"], "permittedPaths": ["docs/process/PHASE_1_*"], "requiredChecks": ["owner-decision"] },
    { "taskId": "T6.1", "title": "Gateway crossing as one continuous camera move on one scene graph", "dependsOn": ["V4"], "permittedPaths": ["apps/mission-control/src/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T6.2", "title": "Mind environments at slice scale; beats 20-24", "dependsOn": ["T6.1"], "permittedPaths": ["apps/mission-control/src/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T6.3", "title": "Playwright journeys: gateway crossing and Mind Scan", "dependsOn": ["T6.2"], "permittedPaths": ["tests/**", "apps/mission-control/e2e/**"], "requiredChecks": ["playwright"] },
    { "taskId": "V5", "title": "Owner viewing point: the Mind", "dependsOn": ["T6.1", "T6.2", "T6.3"], "permittedPaths": ["docs/process/PHASE_1_*"], "requiredChecks": ["owner-decision"] },
    { "taskId": "T7.1", "title": "Beat 25: desktop, mobile, reduced-motion and constrained demonstrations", "dependsOn": ["V5"], "permittedPaths": ["apps/mission-control/src/**"], "requiredChecks": ["pnpm-check"] },
    { "taskId": "T7.2", "title": "Accessibility: keyboard reachability of every selectable object, aria names", "dependsOn": ["V5"], "permittedPaths": ["apps/mission-control/src/**"], "requiredChecks": ["pnpm-check", "playwright"] },
    { "taskId": "T7.3", "title": "Code-split per-world product bundles alongside the single-file Owner Build", "dependsOn": ["V5"], "permittedPaths": ["apps/mission-control/**"], "requiredChecks": ["pnpm-check", "owner-build"] },
    { "taskId": "V6", "title": "Owner viewing point: the modes", "dependsOn": ["T7.1", "T7.2", "T7.3"], "permittedPaths": ["docs/process/PHASE_1_*"], "requiredChecks": ["owner-decision"] },
    { "taskId": "T8.1", "title": "Prover verification against the anchored required-check set", "dependsOn": ["V6"], "permittedPaths": ["tests/**"], "requiredChecks": ["pnpm-check", "playwright"] },
    { "taskId": "T8.2", "title": "Art bible updated with Phase 1 refinements", "dependsOn": ["V6"], "permittedPaths": ["docs/art-direction/**"], "requiredChecks": ["knowledge-lint"] },
    { "taskId": "T8.3", "title": "Phase 1 run record stating both deferred checks as not performed and why", "dependsOn": ["T8.1"], "permittedPaths": ["docs/process/PHASE_1_*"], "requiredChecks": ["knowledge-lint"] },
    { "taskId": "T8.4", "title": "Phase 2 brief proposal", "dependsOn": ["T8.3"], "permittedPaths": ["docs/process/**"], "requiredChecks": ["knowledge-lint"] },
    { "taskId": "T8.5", "title": "Independent review formation against the exact candidate SHA", "dependsOn": ["T8.1", "T8.2", "T8.3", "T8.4"], "permittedPaths": [], "requiredChecks": ["review-report"] },
    { "taskId": "V7", "title": "Owner gate: the finished slice and its run record", "dependsOn": ["T8.5"], "permittedPaths": [], "requiredChecks": ["owner-decision"] }
  ],
  "permittedPaths": [
    "apps/mission-control/**",
    "packages/visual-language/**",
    "packages/test-fixtures/**",
    "docs/art-direction/**",
    "docs/process/PHASE_1_*",
    "docs/process/HOW_TO_LOOK.md",
    "assets/**",
    "tests/**"
  ],
  "protectedPaths": [
    "constitution/**",
    "docs/product/VIRGIL_MASTER_COMMISSION.md",
    "docs/decisions/OD-*",
    "knowledge/raw/**",
    "schemas/gate-*",
    "packages/domain/src/transitions.ts",
    "constitution/authority.json",
    "packages/gate-engine/**",
    ".claude/**"
  ],
  "untouchedAreas": [
    "apps/orchestration-service (Phase 3)",
    "packages/repository-adapters (Phase 2)",
    "packages/knowledge-compiler (Phase 5)",
    "any real repository, GitHub read model, live Git state or session launching",
    "sound and audio of any kind (owner decision: out of Phase 1)",
    "tools/** (not permitted by the brief; the Owner Build inliner goes under apps/mission-control/build/)",
    ".github/workflows/** (only if the owner selects the GitHub Actions delivery route)",
    "any third-party character or environment asset (primary-source licence verification is impossible without web access)"
  ],
  "requiredChecks": [
    { "checkId": "pnpm-check", "name": "biome lint, typecheck and unit tests across the workspace", "commandClass": "workspace-check" },
    { "checkId": "knowledge-lint", "name": "Mind Scan over knowledge/", "commandClass": "knowledge-lint" },
    { "checkId": "playwright", "name": "Playwright journeys: passing route, quarantine route, gateway crossing, Mind Scan", "commandClass": "e2e" },
    { "checkId": "owner-build", "name": "Owner Build produces a single self-contained HTML file whose SHA-256 is recorded", "commandClass": "build" },
    { "checkId": "review-report", "name": "Independent review by the required formation against the exact candidate SHA", "commandClass": "review" },
    { "checkId": "owner-decision", "name": "Owner viewing verdict recorded as PASS, PASS WITH DIRECTION or FAIL", "commandClass": "owner-gate" }
  ],
  "goNoGo": {
    "verdict": "go",
    "reasons": [
      "The Phase 1 scope is buildable as specified: the event spine, animation grammar and fixtures for all 25 beats already exist on main, so the remaining work is the visual layer plus a viewing mechanism.",
      "Requirement one is solvable within the constraints: a single self-contained classic-script HTML file, downloaded from the repository and opened by double-click, renders on the owner's own GPU with no toolchain, no server, no account and no paid service.",
      "Requirement two is structurally satisfiable: the throwaway risk concentrates almost entirely in the visual layer, which can be shown at V1 after roughly three sessions and before any character, story, animation or journey work exists.",
      "GO is conditional on three preconditions, all owner-side. P0: pnpm check fails on main because owner commit 9627bae removed two deny rules a test still requires - Phase 1 must not start from a red base. P1: OD-0002 to OD-0006 are still at docs/decisions/proposed/. P2 is non-blocking and fixed by task T1.3.",
      "Two owner decisions are presented and not acted on: whether to split the authorisation into Phase 1A and 1B (recommended), and whether to reduce the modelled ensemble from six characters to four (recommended to defer to viewing point V2).",
      "The plan schedules no work depending on the checks deferred by OD-0005 and claims neither of them. Both are carried as NOT PERFORMED through to the run record.",
      "The largest residual uncertainty is whether session-authored characters reach the charm the owner approved. It is untestable in advance, is isolated to viewing point V2 at a cost of roughly three sessions, and is stated as an open question rather than assumed away."
    ]
  },
  "authoredBy": { "kind": "agent", "roleId": "architect", "displayName": "Architect - Phase 1 planning session" },
  "createdAt": "2026-09-07T07:00:00Z"
}
```
