# Backlog

The owner asked for one place that lists what is not done. This is it. It is a list, not a decision: nothing here is resolved by being written down, and nothing here is authorised by being written down. Items are grouped as the owner console grouped them, and each carries one of three statuses — **open** (a session could take it under an ordinary grant), **needs owner** (it cannot start without an owner decision or an owner action), **blocked** (it waits on something other than the owner).

Where this file sits: the owner console asked for `docs/process/BACKLOG.md`. The Phase 1 grant (`PHASE_1_BRIEF.md`, "Permitted and protected areas") permits `docs/process/PHASE_1_*` and no other name in `docs/process/`, so the session that wrote this filed it under the permitted name rather than crossing the boundary. Moving it is one `git mv` by whoever holds the grant for that path.

Dates below are 2026-09-07 unless stated.

## System rigour

### Agent evals — open

No way currently exists to know whether a Keeper review is *good*, only that it happened. `packages/test-fixtures/` already contains defective candidates (`packages/test-fixtures/src/candidates.ts`); feed them to the reviewer roles and score whether the planted defects are found. Highest-value open item in this group.

### Structured reports instead of prose — open

Every agent handoff to date was English that a human read carefully. `packages/agent-contracts/` exists for exactly this — every role definition says its result is an `agent-result` record with a payload validated against a schema in `schemas/` — and no handoff has yet been one. Named as the principal Phase 3 blocker.

### Record real runs as events — open

The event-sourced domain in `packages/domain/` recorded **zero events** for the four build passes and two reviews of 2026-09-07. The irony is stated plainly: the repository's own model of what a governed build looks like was not used to record its own governed builds. Every run of that day exists only as commits, prose documents and the owner console's transcript.

Partly answered in prose on 2026-09-08, not in events: `docs/process/PHASE_1_RUN_RECORD.md` now lists every viewing point with its source commit, artifact and digest, and the V6 pass's checks with their printed results; and `docs/process/PHASE_1_STYLISED_SPEC.md` wrote the owner's V6 direction down before anything was built, which is the first time a pass's direction has existed outside the console transcript. Still no event is recorded for any run.

### Cost and token visibility — open

One pass on 2026-09-07 consumed roughly 454,000 subagent tokens. No mechanism reports this, sums it, or puts it next to what the pass produced.

## Leanness

### CI — done, 2026-09-08

`.github/workflows/checks.yml` runs on push to any branch and on pull requests: `pnpm install --frozen-lockfile`, the Chromium the lockfile pins, `pnpm check`, the Mind Scan, `build:owner`, `verify:owner`, `sha256sum -c` over every committed Owner Build digest, and the byte-for-byte reproducibility rebuild of the newest committed artifact. Unblocked by the owner granting the repository root in the owner console on 2026-09-08 — "You may edit the root config files."

The part that matters is not the workflow file. `verify:owner` is now a turbo task depending on `build:owner`, both `cache: false`, and the root `check` script runs it, so `pnpm check` no longer passes without the Owner Build being built and opened from `file://`. `apps/mission-control/test/required-checks.test.ts` fails if that wiring is removed, if a step is dropped from the workflow, if the workflow file is deleted, or if a `continue-on-error` appears in it. `pnpm check` went from about 21s to about 75s as a result; that is the whole cost.

Where the boundary was drawn, and why: `verify:owner` is inside `pnpm check` because it takes 49s and needs only a browser. The reproducibility rebuild is a separate CI job and a root `pnpm reproduce:owner` script, not part of `pnpm check`, because it needs full git history and a second `pnpm install` in a detached worktree — putting that in the command every session runs would be the kind of cost that gets a check skipped.

It has run twice: green on `dd2c48f`, and red on a scratch branch carrying one external `fetch()` — which failed at `pnpm check`, on a runner with real egress where the request succeeds and only the off-document-request check can catch it. Both runs, and the reasoning that identifies the failing sub-step, are in `docs/process/PHASE_1_RUN_RECORD.md`, "Continuous integration — the pass of 2026-09-08". Recorded in full, including what it does **not** establish, in `docs/architecture/ENFORCEMENT_BOUNDARIES.md`, "Continuous integration: which checks now run without a human choosing to". One thing to know before trusting a green run: CI runs the Chromium the lockfile pins (153) and this container substitutes a preinstalled 141, so a local pass and a CI pass are not passes on the same browser. Every run now prints which browser it used.

### A generated index with a freshness test — open

Route "I need to do X" to "read Y". Generated, and freshness-tested the way the seed graph is (`pnpm --filter @virgil/knowledge-graph export-seed-graph`; a test fails when it is stale), so it cannot drift. A hand-written one already would be stale; two live examples, checked when this file was written:

- `docs/art-direction/approved/README.md` still cites OD-0002 at `docs/decisions/proposed/OD-0002-art-direction-checkpoint.md`; the record has been at `docs/decisions/OD-0002-art-direction-checkpoint.md` since the owner accepted it.
- `docs/architecture/ENFORCEMENT_BOUNDARIES.md` still says "the six filed decision records"; there are eight (`OD-0001` to `OD-0008`).

### Governing facts as data, prose to explain only — open

`constitution/authority.json` proves the pattern: the permission matrix is data, and a test holds the role definitions to it. By contrast the Phase 1 permitted paths live as one line of prose in `PHASE_1_BRIEF.md`, and on 2026-09-07 a coordinator paraphrased that line wrongly in a brief — an error caught only because the worker read the original. That is the motivating example. Facts that govern a session's boundary should be data that a check can read; prose should explain them.

### Fold or delete stale documents rather than annotating them — open

The habit so far has been to leave a superseded document standing and add a note beside it. The result is more to read and less that is true. Prefer folding what is still true into the current document and deleting the rest, with the history left to git. (Records the owner has accepted, and run records that stand as evidence of what a session found, are not stale documents and are not in this item.)

## Open review findings

Where the finding records are: **KR-01 to KR-10** appear in `docs/architecture/ENFORCEMENT_BOUNDARIES.md` and `docs/decisions/OD-0004-non-blocking-findings-disposition.md`, and since 2026-09-08 **KR-50, KR-58 and KR-59** are described in that same document's continuous-integration section. Everything else from KR-26 onward was reported to a session by the owner console and is listed here as reported; no file in the repository holds its text, which is itself an instance of the "record real runs as events" and "structured reports" items above.

- **KR-03, KR-06, KR-07, KR-09** — open. Phase 0 findings, accepted open under `docs/decisions/OD-0004-non-blocking-findings-disposition.md`, carried as Phase 1 entries; KR-03 and KR-07 are the first two in `PHASE_1_BRIEF.md`.
- **KR-26, KR-27, KR-40 to KR-47** — open. Carried into stage S0.
- **KR-48 to KR-54** — open, except KR-50. From the S1 review of `1e05d47`. **KR-50 (no CI) is addressed** by `.github/workflows/checks.yml` and the wiring test `apps/mission-control/test/required-checks.test.ts` (the "CI" item above). Not closed — that is a reviewer's to say.
- **KR-58** — **caught, not repaired.** `apps/mission-control/owner-build/inline.mjs` scans for external references before it reinserts the CSS and before it pastes the bundle, so it inspects only the bare shell; a remote `url()` in the stylesheet and a `fetch()` to an external host in a component both survive it and both survive the entire test suite. That blind spot is untouched. What changed is that `verify:owner` catches that class of defect and now runs on every push and inside `pnpm check`, so it can no longer be skipped. Both were demonstrated failing on 2026-09-08. The distinction is the point: a required check catches the escape; the guard that should have caught it still does not. Repairing `inline.mjs` to scan the finished document is open work.
- **KR-59** — **addressed.** `build:owner` and `verify:owner` are reachable from a required check, not only from a workflow file: `pnpm check` runs `verify:owner` through the turbo graph, and a test fails if that stops being true.
- **Review of `6503c8b`** — blocked. In flight; its findings will number from KR-55.
- **KR-55, KR-56, KR-57** — from the review of `a4f8b70` (V5), all medium; **addressed by the V6 pass** (`docs/process/PHASE_1_RUN_RECORD.md`, "Findings from the review of `a4f8b70`, addressed"): a static face under reduced motion with a test and a correction to the V5 owner document; the S2 scope contradiction recorded in `PHASE_1_STYLISED_SPEC.md` §7.1 and a run record opened; the visor mesh built by one tested builder with source guards on the component. Not closed — that is the reviewer's to say.
- **KR-41, the character form gate** — open. It is a name and not a check: nothing runs, nothing fails, nothing records a result.

## Product direction — the owner's directions of 2026-09-07

Recorded as direction the owner gave, not as decisions. None of it is a decision record and none of it carries authority layer 1. Each item's status says what it would take to start.

- **Mobile-first UI** — needs owner. Character portraits rather than figures, tap to expand a panel, and "Virgil needs you" notifications. The owner stated they would use a phone more often than a desktop. A change of this size to the interface is an art-direction change and needs the checkpoint decision the brief requires.
- **A star map of repositories** — blocked. Driven by real session scope, **never a hand-written list**, distinguishing read from write. Blocked on real session scope existing as data (Phase 3), and on Phase 1's non-goal of real repositories.
- **A hologram console** — blocked. Read-only over real repository records first; typing into it depends on Phase 3. Blocked on real repository records being in the product, which Phase 1 excludes.
- **Per-agent panels rendering actual contract objects** — blocked on "structured reports instead of prose" above: there are no contract objects to render until handoffs produce them.
- **Spawn-in/out with a hand-off animation** — open. Constraint from the owner: **anything that spawns out must leave its evidence behind.**
- **Independence reading spatially** — open. Reviewers opposite Virgil, not alongside him.
- **Mind of Virgil** — open. Authority as orbital radius, tethers running inward, and a broken tether visible from across the room.
- **Set dressing** — open. Instanced from one wall panel, one plant, one shelf; skip the monorail.
- **Remaining characters** — needs owner. Cartographer, Architect and Arbiter as individuals, then the seven conditional specialists as one badged family. Needs the owner because the models come from the owner (`assets/licenses/ASSET_PROVENANCE.md`, `docs/decisions/OD-0008-meshy-licence-attestation.md`).
- **A refusal/blocked animation clip** — needs owner. The owner said they would supply it (`PHASE_1_HOW_TO_LOOK_V3.md`, "Owner direction, recorded", item 4); until then a blocked state is expressed through face, light and colour.
- **Mobile performance levers** — open. 512² textures, a faked floor reflection, quarter-resolution bloom, characters loaded on demand. None is measured; `docs/decisions/OD-0005-phase-1-visual-checks-and-reference.md` requires performance recorded as unmeasured until it is measured on real hardware.

## Product direction — the owner's direction of 2026-09-08

- **The Virgil conversation — "to do soon", the owner's own priority.** Clicking Virgil
  opens the working interface: full conversation history, Markdown, code and terminal
  output, plans and progress, owner decisions, attachments, image previews, diffs and
  PR summaries, and approve/reject/pause/resume controls. Desktop compresses the 3D
  world to ~35% with a draggable boundary and a focus button; mobile gives the
  conversation nearly the whole screen with Virgil in an animated header and the
  composer pinned. Per-agent records exist for inspection only — Virgil stays the one
  conversation. Opening beat: a greeting naming the real state, three suggested
  actions, and an unrestricted chat box beneath them.
  Recorded in full, with its costs and a proposed order, in
  `docs/process/PHASE_1_CONVERSATION_INTERFACE.md`. **Nothing of it is built.** The
  read-only shell is buildable inside Phase 1; the live transport and the control
  buttons are Phase 2/3 capability and are not authorised by that record. This
  supersedes the shape of the "Mobile-first UI" item above, which it does not delete —
  that item's portraits-and-notifications direction still stands for the command-centre
  view the conversation returns to.

- **Simpler consoles — the owner's thought of 8 September, under consideration, not a decision.** His words:
  *"im honeslty thinking we clean this up even further and making the consoles even simpler. like
  ultra futuristic white stands with a screen. I think the simpler the better, and the focus is on
  the screens and the info in them. Just a thought at the moment."* Authored white stands in place of
  the three Meshy role consoles, the screen the only detail. Recorded now so the thought is not lost
  while he weighs it; **nothing is built and nothing is deleted** — the three station models stay in
  `assets/models/candidates/` with their provenance rows whatever he decides.
  What it would cost and save, measured: the three station payloads are 279,076 + 260,224 + 282,976 =
  **822,276 bytes** of the bundle's base64, so dropping them takes the artifact from 8,426,374 bytes to
  about 7.6 MB — mobile goes from 133.9 % of 6 MiB to about 121 %, still over, so this does not solve
  the budget on its own. The screen work already done carries over: drawing a flat screen with convex
  glass in front of it survives, and only the derivation of that plane from Meshy's faceted triangles
  is discarded. The risk to name is that the ornate consoles are doing real work — they make the set a
  place and give each character something to belong to; three bare stands could read as a slideshow with
  robots beside it. The obvious hedge is to keep Virgil's ring console as it is and simplify only the
  three role stands, which also strengthens the "Virgil is the conductor" reading he asked for.
  A change of this size is an art-direction change and wants an owner decision record, not a silent
  drift away from `docs/decisions/OD-0002-art-direction-checkpoint.md`.

- **The visors are faceted, not smooth — the owner's direction of 8 September, measured.** His words:
  *"the same issue but to a lesser extent is true for the agents' visors. they are not compleely
  smooth and black...... I wonder if we can spend a lot of time on this.... since even small
  inperfections make them look cheap"*, and then: *"if we replace the visors, they need to be curved
  like they currently are, but completley smooth, convex"*. He has authorised depth here. Not built.

  **Measured** by this session on the committed runtime payloads (2026-09-08), fitting a sphere by
  least squares to the vertices of each visor's selected triangles and dequantising positions the way
  `meshyAsset.ts` does (`i16/32767 × runtime.scale`):

  | Visor | Triangles | Mean facet | Sphere radius | Residual RMS | Residual max | Distinct normals |
  |---|---|---|---|---|---|---|
  | Fabricator | 235 | 47.7 mm | 264 mm | 12.29 mm | 42.05 mm | 206 of 334 |
  | Prover | 207 | 34.6 mm | 339 mm | 43.63 mm | 154.53 mm | 239 of 287 |
  | Keeper | 549 | 39.3 mm | 247 mm | 25.39 mm | 121.67 mm | 423 of 705 |

  **What this rules out.** The session's first hypothesis was its own asset pipeline: normals are
  quantised to `INT8` (`reduce-model.mjs`, `reduce-rigged.mjs`), which on a glossy dome could terrace
  the highlight. It is not the cause. The decoded normals are within 0.50–0.58 % of unit length — well
  under a degree — and nearly every visor vertex carries its own distinct normal, so there is no
  terracing to see. Recorded because the wrong answer was nearly acted on.

  **What it is.** Facets 34.6–47.7 mm wide across a face of 247–339 mm radius. At that size the flats
  are visible directly and no shading treatment hides them.

  **What must not be done.** These visors are not spherical: up to 42, 155 and 122 mm from a best-fit
  sphere. Fitting an analytic sphere and snapping the surface onto it would visibly deform the faces
  the owner designed.

  **Correction, from V8.3's measurements: this session's inference about the Prover was wrong.** It read
  his 154.53 mm as evidence that his selection wraps around the sides of the head rather than being a
  single front-facing cap. A best-fit-sphere residual measures how far a surface is from *spherical*,
  not how far it is from *convex*, and the two are unrelated: his selection is a wide, strongly
  elliptical band — nowhere near a sphere, and after smoothing **the most convex of the three at 95.1 %
  of interior vertices**. The wide spread of his triangle normals, which this session also read as
  wrapping, is what a convex dome gives too. No visor needed its own method; subdivision with a pinned
  boundary preserves whatever shape it is given and assumes no cap.
  **The one that is genuinely not convex is the Keeper** — 49.0 % of interior vertices, worst wrong-way
  curvature 539 /m, largest quadric residual 1.38 mm — because his painted region includes a fold in
  his hood. It was measured and reported rather than flattened, since flattening it would deform a face
  the owner designed.

  **The approach that satisfies "curved as now, completely smooth, convex":** subdivide the extracted
  visor (two levels takes a 40 mm facet to 10 mm, three to 5 mm), smooth interior positions while
  pinning the boundary so the silhouette stays exactly the owner's, recompute normals on the result,
  keep the convex glass in front, then verify the curvature is convex everywhere and correct any
  concave patch against a fitted quadric rather than against a sphere. Cost is runtime vertices — about
  60k triangles for all four visors against `PERFORMANCE_STRATEGY.md`'s 300k mobile tier — and no
  added download. It must keep V7's reason for existing: the boundary comes from the head's own
  painted triangles, which is what stopped the visor reading as pasted on in V6.

  **Built in the V8.3 pass of 8 September** (`src/world/characters/visorSmooth.ts`;
  `docs/process/PHASE_1_RUN_RECORD.md`, "V8.3"). Two levels of Loop subdivision with the boundary
  pinned: the facet goes 47.7 → 11.30, 34.6 → 8.29, 39.3 → 9.16 and 43.5 → 10.33 mm, the outline
  moves 23–108 **nanometres** and its total length is unchanged to six decimal places, and a
  per-vertex lift with a bounded slope clears the head's own facets (2.1–4.7 mm of them) without
  putting a step round the pinned rim. No sphere is fitted and nothing is snapped to one.
  **23,184 triangles in the four faces and the same again in their glass — 43,470 more than the 2,898
  they replace, and no added download**; `mobile` and `constrained` get one level rather than two,
  because two is 36.2 % of the constrained tier's 120k triangles for four faces ten pixels across.

  **Two things this entry got wrong, corrected with numbers.** The convexity check — a quadric fitted
  over a fixed 25 mm radius, never a sphere — finds the **Prover the most convex of the three role
  visors** (95.1 % of patches) and the **Keeper the one that is not** (49.0 %, worst wrong-way
  curvature 539 /m, largest quadric residual at 1.38 mm: his selection includes a fold in his hood).
  His 154.53 mm best-fit-sphere residual measures how far from *spherical* his band is, not how far
  from *convex*, and the same is true of the wide spread of his triangle normals. No visor needed its
  own treatment, because subdividing with a pinned boundary preserves whatever shape it is given and
  assumes no cap. And the concavity that remains is the owner's own design; flattening it would be the
  deformation this entry forbids, so it is reported per visor instead of forced.

  **A dimple correction was written, measured and removed**: moving a dimpled vertex onto a quadric
  fitted to its neighbourhood changed the dimple count by a few per cent, made the worst one worse as
  often as better, and tripled the time. The subdivision is what removes the facets.

- **A persistent ledger on Virgil's far-left screen — the owner's direction of 8 September. Still
  open.** *(This entry said "next pass, ahead of the visors". The order went the other way: the owner
  put the glass and the visors first, and V8.3 built them. Nothing here changed; the ledger has not
  been begun.)* His words: *"if im not looking at the screen the moment an agent is giiven a
  job, i'll miss the 'receiiving' animaton, or when it gets back to virgil, the 'pass' animation. So Im
  thining.... the screen on the far left (virgils far left screen) should really have a list of the
  agents used, and next to it the outcome, and that updates (with fancy animations) as it happens, but
  also remains on the screen so at a glance you can see where its up to."*

  The defect he has found is real and structural: **the information currently *is* the animation.** Every
  state in the slice is announced by a transient beat — receiving, working, the verdict converging — and
  nothing persists to be read by someone who looked away. The interface has an alarm and no status board.

  What this session would add to his design, none of it his instruction:
  - **It is a ledger, not a status light: rows are appended and never rewritten**, and a row stays when
    the next agent starts. That is the same shape as the domain — `packages/domain`'s event log is the
    truth and the current state is derived from it — so the display mirrors the model instead of
    inventing a parallel one. The far-left slab's present `ROLES` indicator is a light that moves and is
    strictly dominated by this; it merges into the ledger rather than sitting beside it.
  - **Elapsed time is the missing column.** Who and what came back tells the story; how long ago tells
    you whether the board is live or stale. Without it a finished board reads as a working one, which is
    the same class of untruth as the "awaiting review" during a build that the owner caught in V7.
  - **In flight must read as unresolved, not blank** — an open verdict, distinguishable from "no answer
    is coming".
  - **It must survive the wide view, which is what "at a glance" means.** `screen-fonts` measured text
    readable to about 96 px and collapsing by 64 px; four rows of words on a 0.9 m slab at 11 m will be
    mush. So each row must read as **shape and colour at distance and as text up close**: role glyph,
    the verdict's own shape (the four already exist in `verdicts.ts`), its colour, an elapsed bar. A
    ledger that only works in the Board close-up has not done the job asked of it.
  - The returning convergence then **lands into its row**, so the same event is both the beat and the
    record, with no second source of truth.

  **Decided by the owner, 8 September: the ledger clears per candidate.** Each new candidate starts a
  fresh board, with the candidate's identity shown so a new run is visible as one. Accumulating all
  three loops was the alternative and is not what he wants; a real Mission Control would group by
  candidate and let the reader scroll back, which stays a Phase 2 concern.

- **"Dark, bland, dead and lifeless" — the owner's observation of 8 September, diagnosed before acting.**
  His words: *"the consoles of the agents, and the floor... it looks a bit dark.... like they are in
  shadows, it looks bland, and dead and lifeless.... Im thining of changing the consoles, because you can
  see that they arent made straight/smooth etc.... unless you have any ideas."*

  He was ready to replace the three station models. This session read the code first, and three values in
  it account for what he is seeing. Recorded so the decision is made on them rather than on impressions:

  1. **Every console is `metalness 0, roughness 0.8`** (`fabricatorStation`, `keeperStation`,
     `proverStation`, `console3`, all in their `-asset.json` runtime blocks). At that roughness there is
     effectively no specular highlight, which is what reads as lifeless — and matte under flat light is
     the one condition that *reveals* faceting, because nothing but the shading step between flats is
     left to look at. His "dead" complaint and his "not smooth" complaint are therefore the same defect.
  2. **The rig was deliberately halved.** `LightingRig.tsx` says it: "every intensity here is roughly
     half of V5's", on the reasoning that the cream set bounces more diffuse light than the metallic
     ornate one. The reasoning is sound; the result is dark. `hemisphereLight` sits at 0.3.
  3. **His spotlight instruction became two states, not three.** He asked for consoles *normal* when idle
     and lit while working; "normal" was built as "dark", so two of the three stations are unlit at any
     moment. That is the shadowed band behind Virgil. His ring console reads as alive for one reason:
     it is the only thing with a dedicated light on it.

  **The floor's mirror was removed** (`RoomShell.tsx`: "the mirror floor is gone… the planar reflection
  was both the strongest…", and a note asking what seats the cast "now that nothing reflects them"). The
  owner-approved reference in `docs/art-direction/approved/visual-canon/03-approved-hybrid.png` has a
  polished floor with the star inlaid in it. A floor that reflects nothing reads as a plate.

  **Proposed before any model is replaced**, none of it touching his assets or adding a byte of download:
  raise the idle baseline so "normal" means lit and the spotlight is a lift over it; roughness from 0.8
  to about 0.4 with a soft sheen; a cheap blurred floor reflection rather than the planar mirror that was
  pulled; a rim light behind each console to separate it from the starfield. **Decidable by looking:** the
  same models under the new lighting, in one frame beside what he saw. If they still look cheap when well
  lit, replace them — and it will have been established rather than guessed.

  **Authorised by the owner, 8 September:** *"i agree with all your choices. on the lighting. they. are
  all good. implement all."* All four changes are approved — the lit idle baseline with the spotlight as
  a lift over it, roughness near 0.4 with a sheen, the cheap blurred floor reflection, and the rim light
  behind each console — ahead of the ledger and the visors.

  **All four implemented in the V8.2 pass of 8 September**, with the registered A/B frames captured
  before and after at the same five entry points (`docs/process/PHASE_1_RUN_RECORD.md`, "V8.2"). The
  values landed on: hemisphere 0.3 → 0.8 with a new shadowless back-row fill, `SPOT.base` 0.05 under the
  unchanged `SPOT.lift` 0.34, console roughness 0.8 → 0.42 with `sheen` 0.55 applied at runtime to the
  four consoles only (the generated `-asset.json` records still state the source's 0.8), the disc's face
  polished to roughness 0.52 / metalness 0.07 plus seven additive smear quads, and three cool rim lights
  that collapse to one on a phone. **The decision the item exists for is now decidable by looking, and
  the frames say: the consoles no longer look dead, and they still show their faceting where the new
  highlight crosses a decimated edge.** Nothing here is measured for speed; OD-0005 still applies.

  **The wash this entry's fourth change ran into is fixed in V8.3.** V8.2 tried raising the baked
  environment, saw every screen and every visor come back grey-brown, reverted it and recorded the
  cause — the set's one glass is additive and reflects the environment. That was the diagnosis and not
  the fix, and the screens stayed grey: measured on the committed V8.2 artifact, the picture's own
  near-black ink read at **luminance 93–99 of 255**. V8.3 shapes the glass's environment term by angle
  instead of turning the environment down, and the same rectangles now read **39.0–39.9** (the
  centre slab 52.4, which is the verdict's own green and not the glass). See `PHASE_1_RUN_RECORD.md`, "V8.3", item 1.

  **The A/B must isolate the lighting, so its "before" frames come from the V8.1 build, not from V8.**
  V8.1 replaces the console screens with fitted flat planes; a comparison taken against V8 would show
  flat screens *and* new lighting together and prove nothing about either. So the order is forced: V8.1
  pushes, the before frames are captured from it at named beats and cameras, the lighting pass runs, and
  the after frames use the identical entry points. The comparison is registered before the change rather
  than chosen after it.

- **A fast replay of a real run — the owner's direction of 8 September, queued behind V9.** His words:
  *"once this is all done, queue up a job that runs an example script (just take one from this chat
  window) - but not normal speed. Make it faster so I can see. With the new text on screens too."*

  What it is: the world plays a **run that actually happened**, at faster than real time, with V9's
  screens, ledger and panel carrying its real content.

  **This changes the nature of what is on screen, and the labelling must change with it.** Every
  viewing point so far has been a scripted demonstration of invented content, marked
  `ILLUSTRATIVE · NOT REAL STATE`. A replay of a real run is not illustrative — it is real evidence,
  played back. Keeping the old band would understate the truth as badly as dropping it would overstate
  it. The band must say what the thing actually is: a replay of a recorded run, not live state.

  **The source must be the repository's own record, not this chat.** `docs/process/PHASE_1_RUN_RECORD.md`
  carries, for V8 through V8.3, the real commit SHAs, the real measurements and the check output as
  printed; `docs/process/PHASE_0_RUN_RECORD.md` and `docs/decisions/OD-0004` carry the Phase 0
  consolidation and the Keeper's verdict on candidate `3b9a964e7de4c53560fd3128090cdba39b005c6c`. Those
  are committed and traceable; a chat transcript is not. Every line the replay shows should be
  answerable with "where in the repository does this come from".

  **The trap to avoid, and it is the interesting one.** The V8.x passes had a builder and deterministic
  checks but **no independent review hop** — no Keeper reviewed V8.1, V8.2 or V8.3. If the replay of one
  of those runs shows a Keeper row with a verdict, it is a lie, and precisely the class of lie the owner
  caught in V7 when a slab said "awaiting review" during a build. Two honest options, and the pass should
  choose one with a stated reason:
  1. **Replay a V8.x pass and show the missing hop as missing** — the ledger reads the Fabricator, the
     checks, and then no review. Truthful, and it surfaces a real gap in how this project has been
     working, which is worth the owner seeing.
  2. **Replay the Phase 0 consolidation**, which is a complete loop with a real candidate SHA, a real
     Keeper verdict of `PASS_WITH_NON_BLOCKING_FINDINGS`, real findings (KR-01, KR-02, KR-04, KR-05) and
     the owner's real disposition in OD-0004.

  Also required: **a speed control** — fast by default, since that is what he asked for, but able to slow
  down so a beat can be looked at rather than only glimpsed.

## The owner's decision of 9 September: polish stops at V10

*"let's stop at V10 and start building the product."*

**Binding on every pass after V10.** The visual work is done being the priority. The structural
defects that made the slice look cheap are all fixed and measured — faceted console screens (V8.1),
square inset pictures (V8.2), milky glass (V8.3), faceted visors, Meshy's eye indents and the light
marks (V8.3, V9), the dark and lifeless set (V8.2), the wrong camera (V8.1), the slab gap (V9). What
remains on the visual side is cosmetic, and "beautiful" is an unbounded goal that would absorb every
night it is given.

**What is deliberately left unfinished, and stays unfinished until the owner asks otherwise:**

- The CRT collapse has never been seen by anyone, in five passes. It is built and held by a test; no
  capture can reach it because it is driven by each station's own power clock. One entry point would
  fix that and it is not worth a pass on its own.
- The close-ups still crop the characters out of their own stations, against the owner's V8 §0.10.8
  direction. The panel now carries the text, so the re-framing is cheap whenever it is wanted.
- The ledger's role names are unreadable at the wide view — by design (shape and colour at distance),
  and also a limit: names need a bigger slab or fewer rows.
- The phone's slab honesty bands are unreadable at the wide view.
- The consoles still read as decimated generated meshes at their edges when the light crosses them.
  Lighting them well was never going to make them smooth; that is a modelling decision the owner has
  been shown a picture of and has not taken.

**What "the product" means next, in the order this session would build it.** Each step is buildable
inside the owner-build constraint — one file, opened from `file://`, no network, no server:

1. **The conversation at full size.** The panel V9 built is the first piece of it. The rest is the
   desktop 35/65 split with a draggable boundary and a focus button, and the phone's full-screen
   conversation with Virgil in an animated header and the composer pinned — all recorded with the
   owner's decisions in `docs/process/PHASE_1_CONVERSATION_INTERFACE.md`.
2. **The dropped transcript.** Decided on 8 September and deferred twice so the panel could be
   designed properly. It is what makes the interface show the owner's own work rather than a
   demonstration: he drags a session transcript onto the page and reads it in Virgil's interface.
   Read-only, nothing uploaded, no network request — `verify:owner` fails the build if one appears.
3. **A real state snapshot, baked at build time.** V10 proves the method: real content read out of the
   repository and committed into the artifact. The same machinery can carry this repository's actual
   current state — its branches, its commits, its check results, its open findings — so the world shows
   what is true as of the build rather than a fixed schedule. That is what `docs/process/PHASE_1_BRIEF.md`
   reserves for Phase 2, achieved without a server, and it is the step where this stops being a
   depiction and starts being an instrument.
4. **Live sessions** remain Phase 3 and remain owner-gated. Merge stays the owner's alone.

## The owner's question of 9 September: could this interface serve another repository?

Asked as a question for later, not a request to build: *"can I ask you to look at another repo, and ask
— not for now; but for later, if we can adopt this similar interface for use with that repo and how it
works?"* Recorded so it is not lost.

**Reading another repository needs the owner's written authorisation, and does not have it.**
`CLAUDE.md`'s hard limits say plainly: *"Work only inside this repository. Never read, clone or modify
any other repository."* The owner may lift that — it is his rule — but it should be lifted in writing for
a named session and named repository, and recorded as a decision rather than assumed from a
conversation, because it is one of the standing limits that has kept this work bounded. Separately, this
session's GitHub access is scoped to `dniachini-droid/virgil-mission-control`; another repository has to
be attached deliberately.

**The interface itself is more portable than it looks, for one specific reason: the world knows nothing
about this project's subject matter.** It knows agents, hops, candidate states, the four verdicts,
evidence and an owner gate — the governance model in `constitution/authority.json` and
`packages/domain`, not this repository's content. So the honest framing is that **the interface reads a
contract, not a repository**, and V10 already proved the method by replaying a real run out of git and
the committed records rather than a script.

**The limit is the one this project keeps re-learning: it can only show what a repository actually
records.** Pointed at a project with no independent review and no run records, the truthful display is
largely empty — and the failure mode is exactly the defect the owner caught in V7, a station claiming a
hop that never happened. V10 refusing to draw eight duration bars because only one duration was recorded
is the same principle applied honestly.

Two tiers, when the owner wants this:

1. **Works on any repository today** — commits, branches, pull requests and CI results. Every repository
   has these and GitHub exposes them. A real, truthful, useful view, and the cheapest way to find out
   whether the idea travels at all.
2. **The full command centre** — the target project emits a small standard evidence format (run records,
   check results, verdicts, decisions) and gets the whole interface. This is the multi-project universe
   already reserved for Phase 5 in `docs/process/PHASE_1_BRIEF.md`.

The sequence when he is ready: written authorisation naming the repository, the repository attached, then
**an assessment before any building** — what it already records, what the interface could show truthfully
today, and what it would have to start emitting for the rest.

Recorded on branch `claude/virgil-mobile-v11`, which is where the active work is; neither this branch nor
`claude/virgil-phase-1-slice` is merged, so a reader should expect to find it on one of the two.

## Waiting on the owner

- **Delete the scratch branch `claude/ci-failure-demo`** — needs owner. One commit on top of `dd2c48f` carrying a deliberate external `fetch()`, pushed on 2026-09-08 to prove CI fails on a network escape (it did). The session cannot remove it: `git push origin --delete` returns 403 and the REST ref deletion is refused by the proxy. One `git push origin --delete claude/ci-failure-demo` from a machine that can. Nothing from it is merged.
- **Root-config permission** — **granted 2026-09-08**, by the owner in the owner console: "You may edit the root config files." `turbo.json`, the root `package.json` and `biome.json` are in scope, and `.github/` may be created. Nothing else moved: `constitution/**`, `docs/product/VIRGIL_MASTER_COMMISSION.md`, `knowledge/raw/**` and `schemas/gate-*` remain out of bounds. This unblocked the CI item above.
- **Whether `CLAUDE.md`'s "No paid services, subscriptions or commercial assets" binds sessions rather than the owner** — needs owner. The owner generates models with a paid Meshy subscription (`docs/decisions/OD-0008-meshy-licence-attestation.md`); the line has been read as binding sessions, and only the owner can say so.
- **The Meshy prompts and generation times** still outstanding in the provenance rows of `assets/licenses/ASSET_PROVENANCE.md` — needs owner. OD-0008 requires them for every Meshy row.
- **Meshy's terms text** — needs owner. Once read and filed as `assets/licenses/MESHY-TERMS.txt`, it retires OD-0008's attestation by the two steps that record sets out.
