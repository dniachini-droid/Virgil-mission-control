# V11 run record

Branch `claude/virgil-mobile-v11`, from `c2f9651`. The brief is
`docs/process/V11_BRIEF.md`; this file records what each stage of it actually did, what was measured,
what is simulated and what was not performed. One section per stage, written when that stage's
artifact exists.

**How to read it, and the one way it can mislead you.** Each section speaks **as of its own pass**,
and is left standing afterwards as the evidence of what that pass found rather than rewritten to
match what came later. So a sentence like *"stage 4 is not started"* or *"independent review has not
happened"* is true at the SHA of the section it sits in and is **superseded by the sections below
it** — where that is so, the sentence now says which pass it speaks for. The Keeper's **K11-01** was
exactly this fault taken one step too far: at candidate `de3c7d8` the words *"Stage 4 is not
started"* were the **last line of the whole file**, in the commit that added stage 4's compression
assessment, with no later section to supersede them, so the record contradicted the commit it shipped
in. The current state of the branch is always the **last** section, and the two indexes that hold no
history are **"The decisions waiting on the owner"** and **"Known limitations"**, near the end.

---

## Stage 1 — composition and interaction

**Scope, and what was deliberately not done.** Stage 1 is the phone composition and the way the
interface is reached with a thumb. **The screens keep V10's appearance** (stage 2), **the panel keeps
V10's design** (stage 3), and **nothing was done about performance** beyond keeping the new
per-frame work out of React (stage 4). Where looking at the frames found something belonging to a
later stage it is recorded below and left alone.

### How to open each version

| | Route | What it is |
|---|---|---|
| **V11** | open `v11-s1-virgil-<sha>.html` and it lands on `#/` | the phone-first composition |
| **V10, unchanged** | `#/v10` **in the same file** | V10's own `VirgilRoom`, with V10's own control bar, badge and provenance footer |
| the rejected spikes | `#/s1`, `#/spike/foundry`, `#/spike/mind` | as in every build since S1 |

The V10 artifact the owner already has — `docs/process/PHASE_1_owner-builds/v10-s2-virgil-4ae03314d9.html`
— is **untouched** and still opens exactly as it did. The `#/v10` route exists so the two can be
compared without a second download, which is what the brief asks for.

### The preservation contract, and the evidence for it

The brief names files that may not be edited, renamed or refactored. None of them was.
`owner.html`, `src/owner/main-owner.tsx`, its four routes, `vite.owner.config.ts`,
`owner-build/inline.mjs`, `owner-build/reproduce.mjs`, the `build:owner` / `verify:owner` /
`reproduce:owner` scripts and every committed artifact are byte for byte as V10 left them.
`test/owner-build-v11.test.ts` carries a SHA-256 of the five protected source files as a tripwire —
**not** a security measure, since anyone editing them can update the digest in the same commit, but
enough that a change becomes a deliberate act with a diff a reviewer sees.

Three independent checks:

- **`sha256sum -c *.sha256` in `docs/process/PHASE_1_owner-builds/`: all 15 committed artifacts OK**,
  including `v10-s2-virgil-4ae03314d9.html`.
- **`pnpm reproduce:owner`: PASS.** It rebuilt the committed V10 artifact in a detached worktree at
  its own source commit `4ae03314d93ed6e26982f3691034974ff5b3887b` and `cmp` found no difference —
  `sha256 98d83ac4cb90dddeddabbe70f09e179c5746e6ae161fa1245ac003a04eb8729f (8528241 bytes)`.
- **V10's route was driven in a browser inside V11's build** and still has 1 control bar with 12
  buttons, 1 demonstration badge, 1 provenance footer and 0 V11 nodes
  (`verify-owner-build-v11.ts`). A frame of it at 390 × 844 was looked at and is V10.

**One byte count did change, and here is exactly why.** Building V10's *entry* at this branch's HEAD
from a clean tree gives **8,528,318 bytes** against the committed artifact's **8,528,241** — **77
bytes larger**. The cause is the single change to shared world code: `Tabletop` now takes the
backdrop planes' placement as two optional parameters defaulting to `layout.tabletop.planetAt` and
`layout.tabletop.stationAt`, the values the old code read inline.

That was not asserted, it was isolated. `Tabletop.tsx` was swapped back to its pre-V11 text, V10 was
rebuilt with the same `VIRGIL_OWNER_SHA` and `VIRGIL_OWNER_BUILD_DATE`, and the two outputs were
diffed: **one common prefix of 8,512,600 bytes and one common suffix of 2,123 bytes**, with a single
differing region — the minified `Tabletop` gaining `{planetAt: e = $.tabletop.planetAt, stationAt: t
= $.tabletop.stationAt} = {}` and forwarding the two through to `Backdrop`. Allowing for the
23-character ` (+uncommitted changes)` the dirty-tree control build carried in its footer, the
difference is **77 bytes and nothing else**. No behaviour changed: `VirgilRoom` passes no props, so
`Backdrop` receives the same two vectors it always read, and the scene graph is identical.

### The portrait composition

**What V10 does at 390 × 844, measured rather than described.** `tabletopCamera` answers a portrait
aspect by widening the lens until it hits its ceiling of 62° and stopping there. Projecting the
consoles' own measured boxes through that pose gives a required field of **1.015 of the lens it
has** at 390 × 844 and **1.017** at 430 × 932: the Fabricator's and the Keeper's consoles are
outside the frame. That is the desktop camera shrunk, and it is the thing the brief says not to
ship.

**What V11 does instead.** A portrait phone is tall where the set is wide — and the set is also
7.9 m *deep*, Virgil at z = +0.3 and the Prover at z = −5.15. Raising the camera and pitching it
down maps that depth onto the screen's long axis. The frame is then **solved, not posed**
(`src/world/mobile/composition.ts`): it is required to hold 47 critical points — the four
characters' heads and feet, the three consoles' measured screen boxes, Virgil's console, his three
slabs — with 11 % of air, and to contain 28 enclosing points, the consoles' own measured boxes, with
3.5 %. The distance is the **nearest** the camera may stand and still do both, by bisection.

| Viewport | Camera | Target | Lens | Distance | Critical fill | Enclosure fill |
|---|---|---|---|---|---|---|
| 390 × 844 | 0.00, 8.48, 11.16 | 0.00, 1.30, −2.35 | 58.0° | 15.30 m | 0.855 | 0.966 |
| 430 × 932 | 0.00, 8.49, 11.18 | 0.00, 1.30, −2.35 | 58.0° | 15.32 m | 0.855 | 0.966 |
| 844 × 390 | 0.00, 3.97, 7.89 | 0.00, 1.25, −2.25 | 33.5° | 10.50 m | 0.926 | 0.606 |
| 1280 × 800 | 0.00, 3.97, 7.89 | 0.00, 1.25, −2.25 | 33.5° | 10.50 m | 0.926 | 0.710 |

A fill of 1.0 means a point sits exactly on the frame's edge. Portrait is 28° of elevation;
landscape keeps the near-level, stage-like reading the owner asked for at V8 and is an intentional
secondary layout with its own elevation, target and backdrop placement, not the portrait one
stretched.

**The depth layers move for portrait, and only for portrait.** A portrait frame has a horizontal
half-angle of about 13°, so the planet at x = +9 m and the station at x = −11 m fall outside it
entirely and the picture loses the depth the brief says to keep. In portrait they are placed at
`[3.9, 8.0, −30]` and `[−4.4, 4.6, −24]`; in landscape they are exactly `layout.tabletop.planetAt`
and `stationAt`, so nothing about the wide view moves. Nothing stands on those planes and nothing is
measured against them.

**Judged from the frames, at 390 × 844 and 430 × 932 and 844 × 390, looked at one by one.** Virgil is
the nearest and largest figure, low and central, inside his ring console, and reads as the subject
without any device — the test asserts he is nearer the camera than any specialist, and the frame
shows it. The Fabricator is at the left, the Prover behind and to the centre-left, the Keeper at the
right: three separate silhouettes with clear space between them, each standing clear of their own
console and none of them behind Virgil's. Nothing is cut by an edge — the Fabricator's console, the
first thing to go, is fully inside with a margin. Virgil's three slabs sit above the cast and their
words are legible at 390 px. The ringed planet is upper right, the station upper left, both against
the nebula band and the star field, and the disc's inlaid star holds the lower third.

**What is honestly weaker.** A 1 : 2.16 frame around a set that is wide and shallow leaves the top
third as sky. It is read as sky rather than as emptiness because both depth planes are up there, but
it is a real consequence of the aspect and the alternative — cropping the outer consoles to get the
set larger — was tried at three elevations and looked worse. Four elevations were rendered and
compared (27°, 28°, 31°, 33°); 28° is the one in the build.

### Touch, measured in the built artifact

Thirteen targets, every one measured by its own `getBoundingClientRect()` at each viewport. All are
**48 × 48 CSS px or larger**, against the 44 the brief and Apple both name.

| Viewport | Ten world targets | Badge | Talk to Virgil | Back | The record's dismissal |
|---|---|---|---|---|---|
| 390 × 844 | 48 × 48 each | 150 × 48 | 210 × 48 | 117 × 48 | 44 × 44 |
| 430 × 932 | 48 × 48 each | 150 × 48 | 237 × 48 | 117 × 48 | 44 × 44 |
| 844 × 390 | 48 × 48 each | 150 × 48 | 320 × 48 | 117 × 48 | 44 × 44 |

The ten world targets are Virgil, the three specialists, their three console screens and Virgil's
three slabs. Where two overlap on a phone the hit test takes the nearer centre, and a specialist and
their screen open the same record, so an overlap costs nothing.

**They are `pointer-events: none`, and that is load-bearing.** `OrbitControls` listens on the canvas,
a *sibling* of any overlay, so thirteen transparent buttons would have put dead zones over the whole
cast and stopped the world orbiting under them. The targets exist to be measured, to show press
feedback and to carry a name; the hit test runs on the stage and asks `gesture.ts` first.

**No horizontal overflow at any width tested**: `scrollWidth` equals `clientWidth` at 390, 430 and
844, and a sweep of every element in the document found **0 with a rect outside the viewport**.

### The gesture guard — the owner's own bug — driven, not asserted

At all three viewports, on the built artifact, through the browser's own mouse:

- **a 114 px drag beginning on the Virgil target opens nothing**: 0 panels, focus still `all`;
- **a tap on the same target opens exactly one record**, and the camera goes first — 0 panels at the
  press, 1 panel after the transition, focus `virgil`;
- the record's dismissal leaves the reader at the station, focus still `virgil`, as the owner
  decided at V9;
- the way back then returns to the overview: 0 panels, focus `all`.

`TAP_SLOP` is still 6 px and `TAP_MS` still 400 ms; `gesture.ts` was not edited. Fifteen unit tests
still hold it, and four more drive it over the gestures a phone makes.

**A method note, because it nearly produced a false defect.** The first version of this check dragged
first and tapped second, and the tap was refused — correctly. The guard compares the camera at the
press with the camera at the release, and the view was still easing from the drag. V10's run record
already names that behaviour. The order is now tap first from a page at rest, drag second from a
settled overview, and the guard is unchanged.

### The deliberate transition, and reduced motion

A tap sets the camera flying for 0.9 s and the record opens 1.02 s later — the move reads first,
which is what the brief asks and is the one place V11 departs from V10's simultaneous behaviour on
purpose. V10 still does it V10's way at `#/v10`.

Reduced motion is honoured by **arriving**, never by hiding: with no transition to wait for the
record opens in the same render as the camera move. Measured on the artifact at portrait 390:

| | Camera moves | Record opens | Gap |
|---|---|---|---|
| default | 2,629 ms | 4,604 ms | **1,975 ms** |
| `prefers-reduced-motion: reduce` | 2,726 ms | 2,726 ms | **0 ms** |

**The wall-clock figures are this software renderer's, not the product's.** A first attempt asserted
the record opens within 350 ms of the press and failed while the code was correct: the first
`evaluate` after a synthetic press returned at 2,518 ms, because SwiftShader takes that long to run
the handler and draw. What is measured is the **gap**, which the renderer's latency is common to and
cancels out of.

### The development chrome, and the version marker

Demo On/Off, the Scripted/Replay selector and its speeds, the Tabletop/Room selector with the retired
room behind it, the Look-at buttons, the keyboard instructions, the routes, the build SHA, the build
minute and the performance disclaimer have all moved into a menu behind one discreet mark at the top
right. Measured: **0 V10 chrome nodes are in the document** on V11's route at any of the three
viewports. The reproducibility path is untouched — the capture entry points are query parameters on
the hash (`#/?run=replay`, `#/?cam=prover`, `#/?view=room`, `#/?state=blocked`), read at mount
exactly as V10 reads them, and never were buttons.

**The coordinator's one judgment was followed.** A discreet version marker stays in the ordinary
interface: `V11 · stage 1 · <10-character SHA>`, at the foot beside the conversation control, dim
and unobtrusive. The full provenance footer went to the hidden menu as the brief permits; the marker
is the coordinator's addition and not the owner's instruction, and both `MobileRoom.tsx` and this
record say so. If the owner wants it invisible, deleting one `<span>` is the whole change and the
cost is a slower diagnosis next time a stale build is served.

### The demonstration badge

The large orange paragraph is replaced by a persistent pill — a lit dot, the words **`Demo data`**,
and an `i`. Pressing it opens, in full: *"This is a scripted demonstration. No repository event,
check or live session drives the information currently shown."* In replay mode the pill reads
**`Recorded run`** in the world's ice rather than amber, and opens to the recorded run's own
sentence ending *"It is past fact, not live state."* The badge may not be hidden, is on screen at
every viewport, and neither wording can be read as a live repository. Frames of both the closed and
the opened badge were looked at at all four viewports.

### One stage-1 interaction decision, recorded because it is a compromise

**The way back is hidden while a record is open.** In portrait the panel is a full-screen sheet —
measured, not assumed: at 390 × 844 it covers the top-left corner where the back control sits. A
control underneath it could be pressed by nobody; one on top of it would cross the panel's own
kicker. The panel's dismissal leaves the reader at the station, which is the owner's V9 decision and
not this stage's to overturn, so the way home appears the moment the record is closed. **Two taps
from an open record, one from anywhere else.** Stage 3 redesigns the panel and should fold "home"
into it.

### What looking found that measurement did not, and what was left alone

**The three console screens render black in their own close-ups, and the character is cropped out of
the shot.** Seen at 390 × 844 and at 1280 × 800 for the Keeper and the Fabricator. It is **not a V11
regression**: the same two frames were taken from `#/v10` inside this build and from the **committed
V10 artifact `v10-s2-virgil-4ae03314d9.html`** opened directly, and all three are the same picture —
black screen, cropped character, the same green glint. The cropping is the cost `closeUp.ts` records
in its own header ("the screen wins; the character may be cropped") and is one of the two items V9
left open. The black screen belongs with V9's other open item, the CRT collapse nobody had yet seen
in a frame; the station screens are lit in the overview at the same moment, so it is a state of the
screen and not a failure to draw. **Both are stage 2's, and neither was touched here.**

### The checks, as printed

| Check | Result |
|---|---|
| `pnpm check` — biome | `Checked 229 files in 136ms. No fixes applied.` |
| `pnpm check` — typecheck | `Tasks: 8 successful, 8 total` |
| `pnpm check` — tests | agent-contracts 70, visual-language 18, knowledge-graph 24, gate-engine 19, domain 104, **mission-control 360 in 22 files** |
| `pnpm check` — `verify:owner` | `PASS — opens from file://, no console errors, no off-document requests`; `console errors 0`; renderer `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)` |
| `pnpm check` — `verify:owner:v11` | `PASS — opens from file://, no console errors, no off-document requests, no horizontal overflow, every touch target at least 44 x 44, the gesture guard holds, V10 still loads at #/v10`; `console errors 0`; `requests 1, off-document 0` |
| Mind Scan | `82 nodes, 166 edges, 10 pages, 28 claims, 94 tethers (94 intact)`; `mind scan: no findings` |
| `build:owner` from a clean tree | `v10-s2-virgil-c269048153.html`, 8.13 MB (8,528,318 bytes) |
| `build:owner:v11` from a clean tree | `v11/v11-s1-virgil-ca8104e0d1.html`, 8.16 MB (8,556,332 bytes) |
| `sha256sum -c *.sha256` | 15 committed artifacts, all `OK` |
| `pnpm reproduce:owner` | `identical — rebuilt from 4ae03314d93ed6e26982f3691034974ff5b3887b`; `PASS` |
| `pnpm reproduce:owner:v11` | `identical — rebuilt from ca8104e0d1a3f2bd1290247b6ae592c54936d5ff`; `PASS — the committed V11 artifact is byte-for-byte derivable from its commit` |

**Tests added this stage: 91, none changed, skipped or weakened.** The app's suite goes from 269 to
360: 30 for the composition contract, 25 for the V11 build target and the preservation contract, 20
for the interaction and the gesture guard's new surface, 16 for the check wiring.

`pnpm check` now runs **both** verifies. Adding `verify:owner:v11` to the chain is a root-config
edit made under the owner's root-config permission of 2026-09-08 (`PHASE_1_BACKLOG.md`), and
`test/required-checks-v11.test.ts` fails if it is removed again.

### One deviation from the instruction's letter, recorded rather than smoothed over

**The V11 artifact is in `docs/process/PHASE_1_owner-builds/v11/`, a subdirectory, not beside V10's.**
`owner-build/reproduce.mjs` chooses what to reproduce by taking the newest `*.html` directly inside
`docs/process/PHASE_1_owner-builds/` and rebuilding it with `build:owner` — V10's build. A V11
artifact beside V10's would become the newest, and V10's reproducer would try to rebuild it with
V10's script and fail on the file name. `reproduce.mjs` may not be edited, so the artifact goes one
level down, where `readdirSync(...).filter(name => name.endsWith('.html'))` does not see it. **Its
digest stays at the top level and names the relative path**, so the workflow's existing
`sha256sum -c *.sha256` still covers it and no check was weakened to make room.

### The artifact

`docs/process/PHASE_1_owner-builds/v11/v11-s1-virgil-ca8104e0d1.html`, sha256
`7c9e1b69979bab42720868dbfe658418f6ad7ec5e659f6faf10b8887c48670ac`, **8,556,332 bytes** — 0.33 %
larger than V10's 8,528,241, which is the second entry, the phone composition, the touch layer, the
hidden menu and the badge against identical model payloads. Its digest is
`docs/process/PHASE_1_owner-builds/v11-s1-virgil-ca8104e0d1.html.sha256`, at the top level so the
one existing `sha256sum -c *.sha256` covers it.

### What this stage does not claim

- **No visual-quality judgment has been made on real graphics hardware.** Every frame here was
  rendered in software by SwiftShader. OD-0005 defers the two graphics-hardware checks and requires
  them recorded as not performed, never as met.
- **Every iPhone check is a simulated viewport in headless Chromium.** 390 × 844, 430 × 932 and
  844 × 390 are CSS pixel sizes given to a browser, not devices. **No real device has been used and
  no real-device check has been performed.** `viewport-fit=cover`, `100dvh`, the four
  `env(safe-area-inset-*)` values, the Dynamic Island and the home indicator are **written and
  exercised at zero inset**, because that is what this environment returns. Whether the chrome sits
  correctly around a real Dynamic Island is **not performed**, not met.
- **No performance figure was taken and none is implied.** The wall-clock numbers above describe
  SwiftShader.
- **A pass here is a builder's claim.** The deterministic checks are the evidence; **as of stage 1**
  independent review has not happened. It happened later, at `de3c7d8`
  (`docs/process/V11_KEEPER_REVIEW.md`), and covers stages 1 to 3 and no more.
- **As of stage 1**, stages 2, 3 and 4 of the brief are not started. The screens, the windows, the
  twelve review states and the KTX2/Draco/Meshopt assessment the brief's second caution requires are
  all still ahead of *this* pass; each has its own section below.

---

## Stage 2 — the in-world screens

**Scope, and what was deliberately not done.** Stage 2 is the four in-world display
families: the three role consoles' screens and Virgil's three slabs. **The window redesign is
stage 3** and the panel is untouched; **no composition work was done beyond the two edits and the
one arrangement the owner asked for after seeing this stage's own frames**; and **no performance
work was done beyond what the screens needed** — which turned out to be more than none, and is
recorded below rather than left to stage 4.

**The owner's decision of the day removed two comparison stages.** *"Decision made: proceed now
without an additional comparative evaluation stage. … Do not spend time implementing and comparing
all three options. The earlier alternatives are no longer candidates."* So there is no three-way
treatment comparison and no three-way bezel comparison in this record. What was kept, because it is
not a comparison and is what has caught every real defect in this project, is **render it, look at
it, refine it, look again**.

### The design, and the four things looking at it changed

The whole system is `apps/mission-control/src/world/screens/v11/`. One typography, one spacing
system, one status semantics, one glass treatment, one set of transition principles, one
information hierarchy — enforced by the shape of the code rather than by memory: every display is
the same five calls in the same order, and only the picture in the well, the vocabulary in the rail
and the accent on the edge differ.

It was designed as a **standalone study** first, exactly as V9's panel was. `study/screens-v11.html`
renders all six displays at the texture resolution the world gives them, then again at the CSS size
they occupy on a 390 px portrait viewport, from the same `drawConsoleScreen` and `drawSlab` the
world calls. `node study/capture-screens-v11.mjs <tier>` builds it, serves it and screenshots it in
one synchronous process; the frames are in `scratchpad/study-v11-screens/`. **The harness is
committed**, because V10 recorded what throwing V9's measuring script away cost — when the owner
asked a follow-up question about the visors it could not be reproduced and a defect was left
unfixed.

Four iterations, each from a frame, each recorded in the code at the place it changed:

1. the conclusion under the hero ran into the secondary rail on exactly the states whose terms are
   longest. The lead's line count is now computed from the space left, not fixed at two;
2. the status mark's ring was **0.6 of a CSS pixel** at the overview and vanished into the mipmap.
   Its stroke is 0.17 of the radius now and its interior fill is stronger, so the primary state
   resolves as a coloured disc at 43 × 25 px;
3. `SAFE TO MERGE` broken over two lines came out at 60 canvas pixels where the same term on one
   line comes out at 103. The hero now tries one, two and three lines and keeps whichever gives the
   larger type, with the split **balanced** because the longest line is what bounds the size;
4. the Keeper's finding flags were clipped by the well's edge; the Prover's isolated failure was
   printed over its own constellation; the dependency chain and the ledger overlapped; and the
   candidate's provenance chain was drawn through the identity's own glyphs.

**Bloom is controlled by arithmetic, not by taste.** The display material is `toneMapped={false}`,
so the texture's own luminance is what the bloom pass sees, and its threshold is 0.86. Every type
and status colour is declared under it — ivory at 0.850, cyan 0.727, amber 0.754, gold 0.812 — and
only the one white-hot core at 0.964 is over it and meant to bleed.
`test/screen-system-v11.test.ts` computes each one and fails if a colour crosses to the wrong side.
So text does not bleed into its own counters, and it is not asserted, it is measured.

### The measurement the stage is judged on

The brief: *"Measure the physical size each display occupies on a 390-CSS-px portrait viewport, in
CSS pixels, and state whether the primary status is legible at that size. That is the number that
decides whether this stage succeeded."*

**At 390 × 844, the overview:**

| Display | Drawn size | Primary state legible there? |
|---|---|---|
| Virgil's **verdict** slab (primary) | **172.3 × 120.6 px** | **yes** — `PASS`, `BLOCKED`, `NO VERDICT` read plainly |
| Virgil's **run ledger** slab | **131.5 × 88.6 px** | **yes** for the holder's name; the ledger's own rows read as shape and colour |
| Virgil's **candidate** slab | **131.5 × 88.6 px** | **yes** — `SAFE TO MERGE`, `VERIFICATION INCOMPLETE` |
| the **Fabricator's** console screen | **43.3 × 25.4 px** | **no, not as text.** As colour and as a mark |
| the **Prover's** console screen | **36.4 × 19.5 px** | **no, not as text.** As colour and as a mark |
| the **Keeper's** console screen | **39.5 × 26.0 px** | **no, not as text.** As colour and as a mark |

**And in each display's own close-up, where the words are meant to be read:** the Fabricator
200.2 × 117.4, the Prover 174.4 × 93.3, the Keeper 177.2 × 117.1, and Virgil's three at the board
camera 204.7 × 134.4 and 165.8 × 110.3. All are 2.6× to 3.2× the threshold.

**The threshold is this project's own measurement, not a guess.** `PHASE_1_PLAN.md` records screen
text collapsing between 96 px and 64 px of display width (contrast 0.715 at 480 px falling to 0.358
at 48 px), and `PHASE_1_CONVERSATION_INTERFACE.md` states it as *"screen text collapses below about
64 px"*. So:

**The hierarchy is a consequence of that arithmetic and not a preference.** The three consoles are
below the threshold at the overview by a factor of about 1.6 and cannot be made legible there at any
type size; Virgil's three slabs are above it by 2.1× to 2.7×. So **the readable overview state lives
on Virgil's slabs**, which is also where the brief puts *"overall project state, the current
hand-off, owner decisions awaiting attention"*, and the three consoles carry their state at the
overview as **one status colour washed at 8.5 % over the glass, one status-coloured accent along the
top edge, and one status mark about ten CSS pixels across whose interior shape is the state** — a
tick, a bar, a turning segment, an inward chevron, a ring with a piece missing, a seal. Colour
resolves at four pixels; a shape that size resolves at ten; the word resolves when the camera goes
to the console. `test/screen-geometry-v11.test.ts` asserts both sides of that — the slabs above 64
px, the consoles below — so a future change that closes the gap is noticed rather than assumed.

**What the owner's instruction to keep complexity meant in practice.** *"Do not remove complexity
merely because all microtext cannot be read from the overview. Establish hierarchy within that
complexity."* Each display carries four levels: the status mark and its colour, which survive the
overview; the hero term, which resolves at the close-up; the agent's own animated picture in the
well; and a rail of four columns of real counts, identifiers and check names, which is **meant** to
be unreadable at distance and is not reduced for it.

### The three role consoles: Option A, and what it could and could not do

The constraint, stated plainly: *"thinner bezels, more glass, less bulky beige framing"* asks to
change geometry the owner commissioned from Meshy, which may not be modified, and no new asset may
enter `assets/`. His decision was **Option A** — *"a lightweight authored thin bezel/faceplate
overlay fitted over each immutable Meshy console opening"*, slim and pearl-white or ivory, with
restrained gold edge detailing, fitted to the console's actual angle and opening, with no
z-fighting, clipping or floating, and the existing animated screen content preserved.

**It is derived, not posed.** `screens/v11/bezel.ts` builds it in the same frame the picture is
drawn in: `screenPlane.ts`'s fitted plane, whose normal is the mean normal
`asset-pipeline/fit-screen.mjs` measured over the console's own screen triangles, and
`screenOutline.ts`'s rounded-rect fit to the opening's own border. The three openings it fits are
re-measured from the payloads by `test/screen-geometry-v11.test.ts` rather than trusted: the fits
are the Fabricator's **955.4 × 569.0 mm at a 77.9 mm radius**, the Prover's **885.7 × 488.7 at
42.9**, the Keeper's **886.6 × 590.4 at 81.1**, and the drawn outlines inside them are
939.3 × 552.9, 855.0 × 458.1 and 871.6 × 575.4.

**A flat faceplate was tried first and the measurement refused it.** At every ring width from 75 mm
down to 25 mm, the offset a flat plate needs to clear the console's own surround came out at **22 mm
on the Keeper and 32 mm on the Prover**, because both models have a lip that rises immediately
outside the opening. A plate standing a finger's width off the console reads as floating, which the
owner's decision names as a failure; the test asserting the offset stays under 11 mm failed on two
consoles out of three.

**So the plate conforms to the surface it covers.** 864 rays per console are cast against a local
mesh of the opening's own neighbourhood; the inner lip sits a measured clearance in front of the
picture's plane, and from there outward the front face rides the surface beneath it, smoothed along
the ring so raycast noise cannot make the edge jagged and clamped to within 2 mm of that surface so
the smoothing cannot lift it. The measured result, per console:

| | Fabricator | Prover | Keeper |
|---|---|---|---|
| ring width | 62.0 mm | 62.0 mm | 62.0 mm |
| inner opening, inside the drawn outline | 4 mm on every side | 4 mm | 4 mm |
| the model's own frame covered, per side | **74.0 mm** | **81.3 mm** | **73.5 mm** |
| inner lip's offset in front of the fitted plane | 13.62 mm | 9.00 mm | 9.26 mm |
| the surround's own greatest height under the ring | 32.89 mm | 29.23 mm | **91.19 mm** |
| **minimum gap** (the z-fighting bound) | 3.50 mm | 3.50 mm | 3.50 mm |
| **outer edge's gap** (it meets the console) | 5.50 mm | 5.50 mm | 5.50 mm |
| **greatest lift over a ridge** (the floating bound) | 4.00 mm | 5.50 mm | 5.50 mm |
| samples with no surface beneath them | 0 of 864 | 0 of 864 | 0 of 864 |

**How I satisfied myself it neither fights nor floats at the angles the camera reaches.** By
construction: no sample is behind the surface it covers (minimum gap 3.5 mm, positive by
definition), and no sample stands more than 5.5 mm in front of the highest point the surround
reaches on the same radius. Both bounds are asserted per console. And by looking: the three
close-ups at 390 × 844 in `scratchpad/v11-s2-frames/` show the plate bedded onto each console's own
casing with no seam, no shimmer along the join and no shadow gap, including on the Prover's
chamfered opening.

**What it cost, and the limitation, recorded rather than argued.** The plate makes the immediate
73–81 mm of each console's beige surround into pearl ivory with a 6 mm gold inner lip, and the
display's own picture now runs to that lip. **What it cannot do is make the model's frame
narrower.** The console bodies are the owner's geometry: below and around the 62 mm ring the beige
casing, its dials and its cabinet are exactly as Meshy modelled them, and in the close-up frames
they still occupy most of the shot. The reason is geometric and worth stating precisely: the
surround is **not a bezel of even width**. Measured outward from the opening at 96 points, its width
before the surface turns away runs from **2 mm to 500 mm** on the same console — median 8 mm on the
Fabricator, 118 on the Keeper, 188 on the Prover — so no constant-width authored ring can both cover
it and stay on it. Per the owner's instruction — *"if an individual model imposes an unavoidable
limitation, refine that console's glass and screen presentation instead, record the limitation, and
continue"* — the rest of the refinement went into the glass and the picture, and this is the
limitation. **The finding the brief asked for, plainly: the beige frame cannot be made thin without
replacing the `.glb`s.** The faceplate makes it cleaner, not thinner.

### Virgil's three slabs, rebuilt

His are authored geometry, so the owner's instruction was to rebuild rather than work around:
*"They are ours, so there is no constraint to work around — they should be the clearest statement of
the system."* The overall object stays **1.540 × 1.040 m**, because `mobile/composition.ts` solves
stage 1's portrait frame against exactly that; everything inside it moves from frame to glass.

| | V10 | V11 | |
|---|---|---|---|
| bezel, each side | 120 mm | **32 mm** | −73 % |
| opening | 1.300 × 0.800 m | **1.476 × 0.976 m** | |
| glass area | 1.040 m² | **1.441 m²** | **+38 %** |
| case depth behind the plate | 396 mm (a half-ellipsoid) | **150 mm** (a chamfered box) | −62 % |
| plate depth | 50 mm | 30 mm | −40 % |
| glass bulge | 30 mm | 18 mm | −40 % |
| inner lip | plain cream | **gold, 5 mm** | |

`test/screen-bank-v11.test.ts` computes every figure in that table from both versions' own code.
The swollen shell that made the V10 slab read as an old Mac is gone; against *"refined celestial
instrumentation"* it was the single most retro thing in the set.

**One defect in the rebuild, found by looking at the first built artifact and worth recording
because of how it hid.** The three slabs rendered as **blank cream rectangles** — no picture, no
glass, no lip — with **no console error and nothing thrown**. An `ExtrudeGeometry`'s bevel reaches
*past* both ends of its depth, so the shell's front bevel came out at z = +0.009, in front of the
display plane at −0.009: a solid mesh in front of a live one, which is not an error. Every layer is
now placed by its own **measured** front extent from one table, and
`test/screen-bank-v11.test.ts` builds all five geometries under node and asserts their z extents
stack in order — a check that costs 30 ms and would have caught it before a forty-minute build.

### The close-up black screen: diagnosed and fixed

Stage 1 found by looking that all three console displays render black in their own close-ups, in
V11 and identically in the committed V10 artifact.

**It was never a drawing failure.** V10's power rule is `state !== 'READY'`, which comes from the
owner's own V8 instruction — *"we should avoid having every screen on if its not in use … when the
keepewr isnt doing work it should stay off his screen"* — and the scripted demonstration gives
**one** station work at a time. So at any moment two of the three are correctly, deliberately dark,
and a close-up entered at an arbitrary second lands on a dark screen two times in three. The
`#/?cam=<role>` capture entry point made it three times in three, because it opens at demonstration
second zero when all three are idle.

**The fix keeps the owner's instruction and adds one clause: a display is also on while the camera
is looking at it.** Going to a console is using it. It warms up through `crt.ts`'s own power-on, so
arriving reads as the television turn-on he asked for rather than a light switch, and what it then
shows is `STANDBY` with the role's identity, its last conclusion and its full secondary detail. In
the overview nothing changes: the idle screens are dark, exactly as he asked. **Verified by
looking** — the three close-ups in `scratchpad/v11-s2-frames/` are lit, legible and titled.

**The other half of that stage-1 finding is not fixed and is not this stage's to fix.** The
character is still cropped out of their own close-up. `closeUp.ts` records the reason in its own
header — the camera stands on the screen's own axis, which is the one direction from which nothing
on the console can cover the screen, and the character stands up to 47° off that axis. At 390 × 844
the close-up's **horizontal half-angle is 17.1°**, so in portrait the two cannot both be in frame
and the screen wins. There is a real remedy — standing the camera further back along the same axis
keeps the screen the same size on screen while shrinking the character's angular offset — and it
was not taken here, because it changes a camera stage 2 was not asked to change and it needs
`test/close-up-sight.test.ts` re-run over the longer sight lines. It is named here so the next pass
has it.

### Texture memory added, against the tiers

The texture width is scaled by tier, with mipmaps and anisotropic filtering
(`screens/v11/resolution.ts`): **2048 px at `ultra` and `desktop`, 1536 at `laptop`, 1024 at
`mobile` and `constrained`** — the brief's floor, never below it, because *"preserve performance by
reducing invisible work rather than by making visible screens blurry"*. The six displays' totals,
computed by `test/screen-geometry-v11.test.ts` from their own measured aspects, four bytes a texel
and a full mip chain:

| Tier | Width | Six displays | Tier's texture budget | Share |
|---|---|---|---|---|
| ultra | 2048 | **80.6 MB** | 512 MB | 16 % |
| desktop | 2048 | **80.6 MB** | 256 MB | 31 % |
| laptop | 1536 | **45.3 MB** | 192 MB | 24 % |
| mobile | 1024 | **20.1 MB** | 128 MB | 16 % |
| constrained | 1024 | **20.1 MB** | 64 MB | 31 % |

A phone gets `mobile` (`detectTier` returns it for any viewport whose short side is under 700 px),
so **the figure that matters is 20.1 MB of 128**. The test fails if any tier crosses a third of its
budget, because the models, the environment and the two backdrop planes have to fit in the same
budget. V10's six displays were a fixed 1024 with no mip chain, 15.1 MB, so **stage 2 adds 5.0 MB
on a phone**. There is one further CPU cost, stated because it is not free: the static glass layers
are drawn once per display into a cached canvas and blitted, which is one backing canvas per
display — **14.5 MB on a phone and 57 MB at 2048** — hard-capped at six entries.

### The performance regression, measured, reduced, and not hidden

Six live displays are not free, and this is the number: **V11's route renders at 1.49 frames a
second in this container against V10's 1.88** — a 21 % frame-time regression, measured by counting
`requestAnimationFrame` callbacks over four seconds on both routes of the same built artifact. It
was worse before it was reduced: 1.23 fps at the first measurement.

What was done about it, in the order the brief's *"reduce invisible work"* implies:

- the redraw rates are two thirds of the first version's — 24 fps at `ultra` and `desktop`, 18 at
  `laptop`, **12 at `mobile`**, 8 at `constrained`. The pictures are slow by design; Virgil's orrery
  turns once in ninety seconds, so 12 is indistinguishable from 18;
- the static glass layers — three full-canvas gradient composites, the well's recess, its graticule
  and the key light's highlight — are drawn once per display and blitted;
- on a **software renderer** the displays redraw 1.5 times a second and their textures carry no mip
  chain at all. **So this container does not exercise the mipmap path, and no frame taken here is
  evidence about minification quality on a GPU.** That is the renderer adaptation
  `docs/architecture/PERFORMANCE_STRATEGY.md` describes, applied to one cost and recorded rather
  than assumed.

**The regression made a check fail, and the check was right.** At 1.4 fps a fixed 1,200 ms wait is
under two frames, so three of `verify:owner:v11`'s assertions began failing while the behaviour they
test was correct: a touch target measured before its first projection, and a panel measured before
React had committed its close. **Nothing asserted was relaxed.** The fixed sleeps became frame
counts and polled conditions — the panel still has to close and the target still has to be on
screen; they are simply no longer required to happen inside an interval that describes SwiftShader.
This is the same fault stage 1 recorded and fixed once already for the motion measurement, in its
own words: *"Timing by the wall clock would make the assertion a property of SwiftShader."*

### Two content faults, found by reading, and the test that will catch the next

Both were on the verdict slab's `default` branch.

**`IN FLIGHT` in a verdict position.** `constitution/authority.json`'s `reviewVerdicts` are exactly
`PASS`, `PASS_WITH_NON_BLOCKING_FINDINGS`, `BLOCKED` and `INSUFFICIENT_EVIDENCE`. Under a heading
reading `VERDICT`, a large word that is not one of them presents a non-verdict as a verdict, and the
big word is what reads at distance while the small line under it does not. It reads **`NO VERDICT`**
now. The header chip that says `IN FLIGHT` stays: there it describes the review, not the verdict.

**`HEADING FOR <outcome>` announced the verdict before the review reported.** The scripted
demonstration knows how its loop ends, so the display said `HEADING FOR BLOCKED` while the Prover
was still working. Nothing in this architecture can know a verdict before a review returns one, so a
display implying it teaches the owner something untrue about his own system — the same family as the
V7 defect he caught when a slab read "awaiting review" during a build. The outcome is gone from that
line entirely, not softened to a hint.

The audit those two prompted found three more leaks and two more invented words:

- the verdict slab's evidence rail drew `evidenceLines(outcome)` unconditionally, so on a loop
  scripted to end BLOCKED it read `301 PASSED · 1 FAILED` while the Prover was still working. Until
  a verdict returns it now shows the holder, the candidate, the authority and
  `EVIDENCE — NONE RETURNED YET`;
- the Prover's three verification gates closed in red as soon as the loop was one that would end in
  a refusal. They now follow the checks that have actually resolved;
- the isolated failure's label chose `FAILED` or `COULD NOT RUN` from the outcome; it reads the
  check's own resolved state;
- `chipsFor` took the outcome and chose between two identical strings — harmless, and the exact
  shape of a leak. Removed;
- `hopNodes` coloured a returned hop by `outcome === 'BLOCKED' && i === 1`, and on a refusal marked
  all three hops returned and green although the Keeper never ran on that loop: **a hop that did not
  happen shown as one that passed.** Both derived from the content now;
- a station reporting `PASS` read `PASSED`, a tense variant of a verdict, and one reporting
  `PASS_WITH_NON_BLOCKING_FINDINGS` also read `PASSED`, with the verdict slab abbreviating it to
  `PASS WITH FINDINGS` — which drops the one word the verdict exists to carry. Shortening it to
  `PASS` would name a **different one of the four**. It is set in full now, over three balanced
  lines where the column is too narrow for two.

**The durable part is `test/screen-content-v11.test.ts`:** 299 assertions over the whole of every
screen's rendered text, at every half-second of all three loops, that no verdict word appears before
a verdict has returned — matched as whole words, so the Prover's own `PASSED` **count label** is
allowed, because a check resolving during the work *is* the work and hiding it would be dishonest
the other way. It also holds every word in a verdict position to the four, every word in a
candidate-state position to the fifteen, and the long verdict to its full form. V10's own
no-verdict-before-review test looked only at the rendered verdict word and could not see prose or a
rail.

### The bands, removed on the owner's instruction

The amber `ILLUSTRATIVE · NOT REAL STATE` band is removed from all six of V11's in-world displays in
the scripted mode, on the owner's instruction — *"No bands. No demo signage on the screens. And the
screens now will use the entire space of the screen properly"* — and each display's header, hero,
well and secondary rail are laid out into the freed area rather than leaving a gap; the persistent
`Demo data` badge stage 1 built remains in the chrome, V10's bands are untouched, and the replay
still draws its own three lines.

### The composition edits the owner asked for after seeing this stage's frames

**The default portrait camera comes down from 28° to 22°.** *"the default camera angle is too high
up… bring the camera down a little bit more level so it's not looking on top of the tabletop."* The
camera stands 7.02 m up where it stood 8.48, so the disc is foreshortened rather than displayed, and
**it stays movable**, as he asked: *"we could potentially even, like, lock that in place, but we can
do that later. Still make it movable."*

**Virgil's three slabs became a shallow triangle.** *"They are currently arranged in one horizontal
row and appear too small on the iPhone. Preserve their existing visual design, content and
animations, but enlarge them and arrange them in a shallow triangular composition"* — and, when that
collided with two things he had asked for earlier, *"Just move the screens as I have instructed.
Everything else remains the same."* So `screens/v11/bank.ts` changes **position and scale only**:
the same object, the same canvas, the same layout, the same type and the same animations, moved and
seen larger. His own priority order settled the collisions — the consoles stay readable, the primary
clears the safe area and the `⋯` control, then the size targets — and **all three are satisfied at
once**, which was not obvious: enlarging a slab moves the camera that frames it, so on-screen size is
not proportional to scale, and the five numbers were found by sweeping 1,600 combinations with the
composition solver re-run on every trial.

| Measured at 390 × 844 | Target | Measured |
|---|---|---|
| primary (verdict) | 155–175 CSS px | **172.3** |
| supporting, each | 125–140 | **131.5** |
| gap between the supporting pair | 10–16 | **14** |
| primary larger than the pair | 25–35 % | **28.4 %** |
| supporting pair clear of the consoles | — | **42 px** (46 px at 430 × 932) |
| clearance above the primary | — | **103 px** at 390 × 844, **115 px** at 430 × 932 |

The cluster is 4.68 m wide and 3.51 m tall, so shallow and wide rather than a tall pyramid, centred
on the line through Virgil. The gentle hover continues and the nudge on a state change is in — the
primary eases 6 cm forward and the pair 5 cm outward over 1.1 s — both position only, both stopped
by reduced motion. **Judged from the frames at 390 × 844 and 430 × 932: the three role consoles
below the cluster are clearly readable as consoles, their own screens visible and lit or dark
according to the beat, and Virgil is unobscured.**

**Two things these edits did to known weaknesses.** Stage 1 recorded honestly that a 1 : 2.16
portrait frame leaves the top third as sky; the raised cluster and the two depth planes now occupy
that band, and in the frames it reads as a composed upper register rather than emptiness — a side
benefit, not a cost. And **landscape pays for the cluster**, which is the one number that went the
wrong way: holding a 2.93 m primary inside an 844 × 390 frame takes the solver to its widest lens and
furthest distance, so the three consoles' displays there fall from 40.7 to **23.4 CSS px** and the
whole set reads as a wide establishing view. Portrait is the composition the owner names as primary
and the one his targets are set at; landscape is the intentional secondary and this is recorded
rather than smoothed.

**V9's ledger design is preserved deliberately, on the owner's own correction** — *"no I don't want
to overrule the V9 decision. Please keep that."* The run ledger is **131.5 px wide** at 390 and reads
there as **shape and colour**: three role nodes joined by a fine gold chain, three elapsed bars and
three verdict marks. Its role names do not read at that width, which is V9's intended behaviour and
not a defect, and nothing was enlarged or removed to change it.

### The preservation contract, and the strongest evidence yet for it

None of the files the brief names was edited. And this stage adds **zero bytes** to V10's build:
building V10's entry from a clean tree at this branch's HEAD gives **8,528,318 bytes**, byte-count
identical to stage 1's figure, because stage 2's drawing lives entirely in
`src/world/screens/v11/` and no shared world file was touched — `ConsoleScreen.tsx`,
`ScreenBank.tsx`, `stationScreen.ts`, `draw.ts`, `screenPlane.ts`, `closeUp.ts` and `palette.ts` are
all exactly as V10 left them. The 77-byte difference stage 1 isolated and explained is unchanged
and no new one was added.

### The checks, as printed

| Check | Result |
|---|---|
| `pnpm check` — biome | `Checked 251 files in 211ms. No fixes applied.` |
| `pnpm check` — typecheck | `Tasks: 8 successful, 8 total` |
| `pnpm check` — tests | agent-contracts 70, visual-language 18, knowledge-graph 24, gate-engine 19, domain 104, **mission-control 740 in 26 files** |
| `pnpm check` — `verify:owner` | `PASS — opens from file://, no console errors, no off-document requests`; `console errors 0` |
| `pnpm check` — `verify:owner:v11` | `PASS — opens from file://, no console errors, no off-document requests, no horizontal overflow, every touch target at least 44 x 44, the gesture guard holds, V10 still loads at #/v10`; 13 targets, smallest 48 px; reduced-motion gap **0 ms** against **1,809 ms** by default |
| Mind Scan | `82 nodes, 166 edges, 10 pages, 28 claims, 94 tethers (94 intact)`; `mind scan: no findings` |
| `build:owner` from a clean tree | `v10-s2-virgil-07b129bfb1.html`, **8,528,318 bytes** — identical to stage 1's |
| `build:owner:v11` from a clean tree | `v11-s2-virgil-07b129bfb1.html`, **8,605,472 bytes** |
| `sha256sum -c *.sha256` | **17 committed artifacts, all `OK`** |
| `pnpm reproduce:owner` | `identical — rebuilt from 4ae03314d93ed6e26982f3691034974ff5b3887b`; `PASS` |
| `pnpm reproduce:owner:v11` | `identical — rebuilt from 07b129bfb1ba63bb19c5ec275f3d0af571182208`; `PASS` |

**Tests added this stage: 380, none changed, skipped or weakened.** The app's suite goes from 360 to
740: 34 for the display geometry and the faceplate, 22 for the shared system, 17 for the rebuilt
slabs and their layer order, 299 for the content vocabulary and the verdict-leak invariant, and 8
for the two composition edits and the owner's cluster targets.

### The artifact

`docs/process/PHASE_1_owner-builds/v11/v11-s2-virgil-07b129bfb1.html`, sha256
`df667741844c6c2669f878968b996308c7409883742eab547208c2073c160835`, **8,605,472 bytes** — 0.57 %
larger than stage 1's 8,556,332 against identical model payloads, which is the whole of the new
display system, the faceplate geometry and the rebuilt slabs. Its digest is
`docs/process/PHASE_1_owner-builds/v11-s2-virgil-07b129bfb1.html.sha256`, at the top level so the
one existing `sha256sum -c *.sha256` covers it.

**V10, unchanged, is still at `#/v10` in the same file**, verified in the browser inside this build:
1 control bar, 12 buttons, 1 demonstration badge, 1 provenance footer, 0 V11 nodes.

### What this stage does not claim

- **No visual-quality judgment has been made on real graphics hardware.** Every frame here was
  rendered in software by SwiftShader. OD-0005 defers the two graphics-hardware checks and requires
  them recorded as not performed, never as met.
- **Every iPhone check is a simulated viewport in headless Chromium.** 390 × 844, 430 × 932 and
  844 × 390 are CSS pixel sizes given to a browser, not devices. **No real device has been used and
  no real-device check has been performed.**
- **The mipmap and anisotropy path is not exercised in this container**, because a software renderer
  turns it off (above). The settings for real renderers are held by a unit test; no frame here is
  evidence about minification quality, and the microtext's behaviour under a 24 : 1 minification on
  a GPU is **not measured**.
- **The frame-rate figures are this container's.** 1.49 fps against V10's 1.88 describes SwiftShader
  and says nothing about a phone. No performance figure against the tier budgets has been taken on
  any device, and `PERFORMANCE_STRATEGY.md`'s measurement section still reads "None has been
  performed on any branch."
- **A pass here is a builder's claim.** The deterministic checks are the evidence; **as of stage 2**
  independent review has not happened. It happened later, at `de3c7d8`.
- **As of stage 2**, stages 3 and 4 of the brief are not started: the full-screen windows, the twelve
  review states and the KTX2/Draco/Meshopt assessment the brief's second caution requires are all
  still ahead of *this* pass; each has its own section below.

---

## Stage 3 — the windows

**Scope, and what was deliberately not done.** Stage 3 is the full-screen agent
and Virgil views, the composer, and the architecture underneath them. **No
performance work was done beyond the pixel-ratio question the owner asked**
(stage 4), **the twelve review states are not started** (stage 4), and **the
KTX2 / Draco / Meshopt assessment the brief's second caution requires is still
ahead**. Three things outside that scope were done because the owner asked for
them from his own device, and they are recorded in their own section below: the
slab cluster's position and size, the default camera angle, and the landscape
regression this project introduced at stage 2.

**No comparison stage and no variants.** The owner has ruled those out twice.
What was kept is **render → look → refine → look**, which is what has caught
every real defect in this project, and it caught eleven more here.

### How a window opens, and how the reader gets back

**One tap does both, concurrently** — and this reverses a stage-1 decision on
the owner's own instruction rather than by preference.
`docs/process/PHASE_1_CONVERSATION_INTERFACE.md` §5b records his decision,
taken against this session's recommendation: *"tapping a screen opens the panel
straight away and takes you there — but the panel opens up so you can see it
instantly, while you are being taken there. So you arent waiting to be taken
there first."* Stage 1 had built the V11 brief's stage-1 line instead — *"tapping
triggers a deliberate camera transition before the interface opens"* — as a
1.02 s delay. His decision governs. `MobileRoom.select` now sets the window and
the camera focus in the same event, and the window renders from data with no
reference to the camera, the controls or the flight, so there is nothing that
could make it wait.

**Driven, not asserted.** `verify:owner:v11` presses the target through the
browser's own mouse and samples immediately: at all three viewports the window
is **already open at the press** with the focus already moved — `windows 1,
focus virgil at the press`. Stage 1's assertion that the record had *not* opened
at the press is inverted in the same file, with the reason written where the
change is; nothing was relaxed, and a regression that reintroduced a delay fails
the same check.

**The way back is a standard back chevron, never `ESC`, and it is one step per
level.** The window's own header carries it; pressing it leaves the reader at
the station the tap flew to, and the station's own `← Overview` control is the
next step. Measured in the built artifact at all three viewports: *window →
station → overview*, with the chevron 72 × 48 px and the overview control
117 × 48. **This closes the compromise stage 1 recorded**: *"The way back is
hidden while a record is open… Two taps from an open record, one from anywhere
else. Stage 3 redesigns the panel and should fold 'home' into it."* There is now
a visible way back at every level, and the frame
`scratchpad/v11-s3-frames/p390-station-after-back.png` shows the reader at the
Prover's station with the overview control on screen.

**It expands from the display that was tapped.** The window's
`transform-origin` is the anchor's own projected point at the moment of the
press, and the entry animates `transform` and `opacity` only — no width, height,
top, left, margin or padding, in the component or in any `@keyframes`, which
`test/window-v11.test.ts` asserts by parsing the stylesheet. It plays over the
camera flight, which is why that rule is not tidiness.

**Reduced motion is honoured by arriving.** The window is rendered open on the
first frame and no animation runs; KR-55 is the history — a reduced-motion
branch once deleted both of Virgil's faces. Measured on the artifact: the gap
between the camera moving and the window appearing is **0 ms at the default
setting and 0 ms under `prefers-reduced-motion: reduce`**, at 40 ms of polling
resolution. The check that used to require the reduced gap to be *smaller* than
the default's is now stricter: neither may wait at all.

### The conclusion-first hierarchy, in a frame that was looked at

The brief: *"lead with meaning, never with a table. In this order: what
happened; what it means; what happens next; what the owner can do; detailed
evidence on demand."*

`scratchpad/study-v11-windows/p390-prover-expanded.png`, at 390 × 844, reads
top to bottom:

> **All 14 required checks passed**
> No verification failures were found.
> The candidate is ready for review. Review is independent of verification, and
> it has not happened yet.
> `[ View all checks ]  [ Go to the review ]`

— then the conversation, then five collapsed disclosures (`The 14 required
checks`, `Verified facts, and claims`, `May the candidate progress?`, `Where
these numbers come from`, and on a refusal `The failure, and its evidence`),
then the composer. The first two lines are the owner's own example of the tone,
almost verbatim, because they are what the state actually is at that beat.

The order is not left to layout: `verify:owner:v11` reads the document and fails
if the first child of the body is not the conclusion, if a `<table>` appears
before the headline, or if the composer comes before the suggested actions. It
is checked with the evidence closed **and** expanded, at every viewport.

**Per agent, what leads.** The Fabricator: the objective, working status, files
changed, commands and tool activity, implementation decisions, the completion
report — *"a claim, not evidence"* — and the hand-off. The Prover: the
verification conclusion, then checks passed / failed / missing / skipped, and
**verified facts against claims** as its own section, where every row carries
`VERIFIED`, `CLAIM` or `NOT KNOWN` as a mark rather than a tone of voice. The
Keeper: findings with identities and severities, evidence and provenance,
**refusals with their exact reasons** taken from `authority.json`'s own
`protectedBoundaries` and `ownerOnlyActions`, decisions and authority, and the
historical record. Virgil: current project truth, what every agent is doing,
dependencies and sequencing, **the owner's next decision**, the whole
conversation, and the orchestration controls — none of them connected.

**Virgil summarises the specialists**, which is the owner's constraint from §4:
*"the user must not have to manage four separate chats."* On the refusing loop
his message reads *"The Fabricator completed the implementation. The Prover
found 1 failed check. I have stopped the candidate before review. Would you like
to inspect the failure, or is this where we stop?"* with `[ Show me the
failure ]` going to the Prover's own failure evidence. **`Authorise repair` is
not offered as an action**, and that is deliberate: it is
`authority.json`'s `additional_repair_or_rereview_round`, which is owner-only in
every phase. It appears in the controls section, disabled, with its reason.

**The three slabs open Virgil's window** at the section each of them summarises
— the verdict slab at *current project truth*, the run ledger at *dependencies
and sequencing*, the candidate slab at *your next decision* — because his is the
central interface and a ledger row opens that hop's own agent, which is his
decision of 8 September.

### The composer, and how it tells the truth about having no session

It is always present, always beneath the suggested actions, and typeable. What
is typed is **kept**: it becomes a turn in that window's thread, labelled
`You`, and it survives the window closing. Under it, at all times, one sentence:

> Kept on this page. Nothing is sent: there is no session behind this build.

That sentence is the **transport's own** (`session.ts`), not a string written in
the component, so there is exactly one statement about having no session and it
cannot drift. `session.ts` is the seam a live transport would attach to and it
has one implementation: a refusal that says why. `NO_SESSION.send` never returns
`sent: true`; `NO_SESSION.act` never returns `performed: true` and answers
`approve` with *"merge is the owner's alone in every phase."*

**The five session controls are declared and not one is usable.** Approve,
reject, pause, stop and resume are rendered `disabled` with `aria-disabled`,
a `not-allowed` cursor, no press state, and each carries its reason as a title —
buttons that quietly did nothing would be worse. **Merge is not among them at
all.** `verify:owner:v11` counts them at every viewport: `5 session controls, 0
enabled`, and the test fails if one is ever enabled. Nothing in the window
makes a request of any kind: no `fetch`, no `XMLHttpRequest`, no `WebSocket`, no
storage API, asserted over every file in the directory, and the build's own
off-document request count is 0.

**Where the absence is stated, and where it is not hidden.** Every window
carries `ILLUSTRATIVE · NOT REAL STATE` at full width directly under its header
with the whole sentence, which is §5b's requirement that the marking be
prominent in the panel rather than a footnote. In portrait the sheet covers the
world's own `Demo data` badge; the band carries the same claim in the same
place, so the claim is never off screen. In landscape the badge moves into the
visible strip rather than being hidden, because stage 1's rule is that it never
is.

### Architecture capable of carrying a real session

The window renders **a list of blocks**, one renderer per kind, not authored
HTML per agent. `capabilities.ts` names the sixteen things the brief lists and
what carries each, and `test/window-content-v11.test.ts` requires every one to
appear in a real window document at some beat of the demonstration — a
capability that is only a sentence in a run record fails that test:

| The brief's words | Carried by |
|---|---|
| complete persistent conversation history | the thread, and `windowStore.ts` |
| streaming responses | the arriving turn and its caret |
| rich Markdown | `markdown` (bold, code, bullets, quotes) |
| code blocks | `code` |
| terminal output | `terminal`, with its exit code |
| plans and task progress | `plan` |
| file references and attachments | `files`, `attachment` |
| image and screenshot previews | `image` |
| commits and branches | `commits`, `branch` |
| diffs | `diff` |
| pull-request summaries | `pr` |
| expandable tool activity | `tools`, inside a disclosure |
| verification evidence | `checks`, `evidence`, `facts`, `findings` |
| owner decisions | `decision` |
| approve/reject/pause/stop/resume | the disabled control row |
| a full composer | the composer |

**`live` is `false` for all sixteen**, and the type will not let it say
otherwise. A real transcript later builds the same blocks from a different
source and the renderers do not change.

**One source, two levels.** Every state word and every number comes from the
function the in-world screen draws from — `screens/v11/content.ts` for a
station's state and conclusion, `screens/tally.ts` for the counts,
`screens/ledger.ts` for the hops, `stationScreen.ts`'s `countsFor` for the lines
under a report. The test drives all three loops and asserts that each
specialist's status word **is** the screen's own word, in ordinary case. The
prose is authored only in the window, because the screens carry none.

**No verdict is named before its review has returned.** Asserted over every
string in all four windows, at every half-second of all three loops, matched
case-insensitively so a sentence-case leak is caught as surely as a shouted one.
V10's own test looked only at a rendered verdict word and could not see prose.

**The functional interface text is DOM text and never enters the canvas.**
Asserted by refusing the whole window directory any `three` or `@react-three`
import, any `getContext('2d')` and any `CanvasTexture`. It cannot draw into the
scene even by accident.

### The phone requirements, measured in the built artifact

Simulated viewports in headless Chromium. **No real device has been used by
this session**; the only real-device evidence in this stage is the owner's own
screenshot, and it is his.

| | 390 × 844 | 430 × 932 | 844 × 390 |
|---|---|---|---|
| world touch targets | 13, smallest **48 × 48** | 13, smallest 48 × 48 | 13, smallest 48 × 48 |
| window controls, evidence closed | 17, smallest **44 px** | 17, smallest 44 | 15, smallest 44 |
| window controls, evidence expanded | 17, smallest **44 px** | 17, smallest 44 | 15, smallest 44 |
| document `scrollWidth` / `clientWidth` | 390 / 390 | 430 / 430 | 844 / 844 |
| elements outside the viewport | **0** | 0 | 0 |
| sections open by default / total | 1 of 5 | 1 of 5 | 0 of 4 |
| session controls / enabled | 5 / **0** | 5 / 0 | 5 / 0 |

**The sticky composer, above a simulated keyboard.** `useKeyboardInset` reads
`visualViewport` and pads the sheet by exactly what it reports missing, because
on iOS the layout viewport does not shrink when the keyboard appears. The check
substitutes a `visualViewport` short by a keyboard's height and dispatches its
`resize`, so the product's own code path runs:

| | keyboard | composer's bottom edge | keyboard starts at | clear |
|---|---|---|---|---|
| 390 × 844 | 336 px | 460 | 508 | **48 px** |
| 430 × 932 | 336 px | 564 | 596 | **32 px** |
| 844 × 390 | 180 px | 205 | 210 | **5 px** |

The landscape figure uses 180 px because a 336 px keyboard in a 390 px-tall
viewport leaves 54 px for a whole interface and is not a state any device
produces; asserting it would be asserting a fiction. **Whether a real iOS
keyboard leaves the composer where this says it does is NOT PERFORMED.**

**Scroll is preserved per window** and restored on the layout pass, so a window
reopened is where it was left. **Safe-area insets**: the window reads the same
four `--v11-safe-*` variables `mobile.css` defines from `env(safe-area-inset-*)`,
and they are **exercised at zero inset**, because that is what this environment
returns; a simulated 59 px inset was also rendered and looked at
(`p390-island-inset.png`). **Portrait and landscape** both have authored
furniture, and landscape's is its own — found by looking, below.

**Accessibility.** The window is `role="dialog"` with `aria-modal`, labelled by
the agent's name and described by its own honesty marking; focus lands on the
sheet as a container on open, so the next Tab is the back chevron and the
reading order is back, actions, conversation, evidence, composer; every
disclosure carries `aria-expanded`; the disabled controls carry `aria-disabled`;
the composer has a full visually-hidden label; `:focus-visible` draws a 2 px
cyan ring for keyboard use. **No screen reader has been run.** These are the
attributes and the focus order, verified in the DOM; a real assistive-technology
pass is **not performed**.

### Voice, which is a deliberate change

Conversation text is the reader's own proportional system type in ordinary
sentence case. Monospace is reserved for what is literally a token: a path, a
SHA, a command, a candidate state, a verdict, terminal output, code. There are
**no giant uppercase headings for ordinary content**, and the test enumerates
every `text-transform: uppercase` in the stylesheet and fails on any selector
outside a small allow-list of labels, tags, standings and column heads. That is
a real departure from the in-world screens' voice, and it is deliberate: the
screens shout because they are read across a room, and the window is read in the
hand.

### The composition the owner corrected from his own phone

He photographed his own iPhone with the camera at its lowest position and named
four things. **This is the only real-device evidence in the stage** and it is
better than anything this container renders.

**1. The cluster comes down, and the top screen is not clipped.** *"you can
actually see on the phone that the screens are still too high up. And they
actually get cut off a little bit… the three big screens can move a lot further
down. And that way, you can stay kinda zoomed in a little bit."* `lift` goes
from 3.2 m to **2.6 m**, which closes the empty band from 42 px of clearance
above the consoles to **11.0 px** at 390 × 844 and 12.3 px at 430 × 932. What
stops it going further is his own first priority — **no slab may stand over a
console's picture** — and that is asserted per console against every slab at
every viewport, as an intersection in projected pixels, not assumed.

**And it is not paid for with a wider lens**, which is the prize he named: the
frame is still 58.0° at **15.26 m**, stage 2's own figures. Lowering the cluster
frees vertical field, but portrait's frame is bound by the three consoles' own
**horizontal** footprint, so the camera cannot come nearer whatever the cluster
does. That is worth stating plainly: the hope that lowering the screens would
let the view zoom in is not what happened, because the camera was already as
near as the consoles allow.

**2. All three slabs are the same size.** *"I actually think that all three
screens should be the same size as the top screen, and it would still fit."* It
does. One `scale`, **1.9**, which is the largest that costs the consoles
nothing — at 2.0 the solver begins retreating and they shrink.

**3. One thin gap, used twice, and even in pixels.** *"just even spacing between
them, very thin… that same thin space between the top screen and the two bottom
screens."* The spread and the drop are both derived from a single `gap` of
0.14 m, with a measured vertical correction of 1.3 because the lower pair stands
slightly nearer the camera and perspective is not obliged to agree with
arithmetic. What he can see is equal.

| Measured at the overview | 390 × 844 | 430 × 932 |
|---|---|---|
| each slab's display | **160.5 × 109.3 px** | 176.9 × 120.4 |
| the three within | **2.2 %** of each other | 2.2 % |
| gap between the lower pair | **9.6 px** | 10.5 |
| gap under the primary | **9.7 px** | 10.7 |
| margin outside the pair, each side | **26.3 px** | 29.1 |
| clearance above the primary's top edge | **133.4 px** | 147.9 |
| clearance above the consoles' screens | **11.0 px** | 12.3 |
| the three consoles | 43.1 / 36.1 / 39.1 | 47.5 / 39.9 / 43.1 |

The primary was 172.3 px and the pair 131.5 at stage 2; all three are 160.5 now.
The owner's own arithmetic put the side margins at about 9 px; they are 26.3,
because the solver holds 11 % of air around every critical point and the pair is
inside that rule.

**4. The default camera stands where he put it.** He photographed the lowest
position *"which he says is how he wants it to start by default."* That position
was not a number anybody chose: it is 22° minus the 0.18 rad of downward travel
the old orbit limits allowed, which is 10.31°, so the default is **11.7°** — the
camera 4.39 m up at 12.59 m, looking at 0.00, 1.30, −2.35. It costs the three
consoles **0.2 of a pixel** (43.3 → 43.1), because portrait is bound
horizontally.

**And the clipping had a second cause, which measurement found and reasoning had
missed.** Rotating to the old lower limit moves the primary's top edge by less
than half a pixel — the slabs sit near the target's own depth, so the angle
barely changes their vertical offset. Pulling in to `0.68 ×` magnifies by 1.47
about the frame's centre and takes that edge **off the top of the screen**. So
the overview's downward travel is now 0.06 rad and its nearest stand `0.84 ×`,
and the clearance is asserted at that extreme pose rather than only at the
default. The camera stays movable, as he asked.

**What the lower cluster gave back.** Stage 1 recorded that a 1 : 2.16 portrait
frame leaves the top third as sky and stage 2 filled that band with the raised
cluster. Lowering it re-opens it: there are now 133 px of star field and the two
depth planes above the primary. It reads as sky rather than as emptiness, and it
is the honest cost of the move he asked for. **Judged from the frames** at
390 × 844 and 430 × 932: all three slabs are large and their words legible —
`PASS`, `VIRGIL`, `READY FOR REVIEW` — the three consoles read as consoles under
them with their own screens visible, and Virgil is unobscured and central.

### Landscape: the regression's real cause, and its recovery

Stage 2 recorded that *"landscape pays for the cluster… the three consoles'
displays there fall from 40.7 to 23.4 CSS px"* and attributed it to the cluster
being large. **That was half the truth.** `slabCorners()` took no orientation
and defaulted to the **portrait** cluster, so a landscape frame was solved to
hold a 2.93 m primary hanging 2.6 m up — geometry that is not on screen in
landscape at all. The solver did exactly as it was told, retreated to 13.89 m
and opened its lens to its 50° ceiling, and the consoles paid for it. Proof that
the cluster was not the cause: with the landscape cluster shrunk to a 0.7 scale
the consoles still measured 25.8 px, unchanged, because the frame was still
being solved against the portrait one.

Landscape has its own parameters now, and the orientation is threaded through
`slabCorners`, `compositionPoints`, `anchors`, the board camera and
`ScreenBankV11`.

| At 844 × 390 | stage 1, as recorded | stage 2, measured | **stage 3, measured** |
|---|---|---|---|
| Fabricator's screen | 40.7 px | 23.4 | **45.2** |
| Prover's screen | not recorded | 19.6 | **35.8** |
| Keeper's screen | not recorded | 21.2 | **40.6** |
| lens | 33.5° | 50.0° (its ceiling) | **38.6°** |
| distance | 10.50 m | 13.89 | **10.50 m** (its nearest) |
| the slabs' displays | — | 89.2 | **85.3** |

**One figure in that table is quoted and not re-derived, and it matters enough
to say so.** Stage 2's record states the consoles fell *"from 40.7 to 23.4"*,
and 40.7 is the only stage-1 landscape console figure either record carries.
Projecting the three consoles through the pose stage 1's own table gives —
`0.00, 3.97, 7.89` at 33.5° — produces **52.5 / 41.7 / 47.3** with today's
geometry, not 40.7, so this session **could not reproduce that number** and does
not claim it. The comparison that is measured end to end is stage 2's
23.4 / 19.6 / 21.2 against stage 3's 45.2 / 35.8 / 40.6, both taken with the
same code in `study/measureDisplays.ts`. The slabs stay over the 64 px width at
which this project has measured screen text to collapse. **Portrait is untouched
by the fix**: the two parameter sets are independent objects and the test asserts
it.

### Crispness: the canvas, not the textures

*"the text isn't as crisp as I would like… if it's something that's gonna take a
long time to do or investigate, don't worry about it. And it is still nice text.
I'm just wondering if you can get a bit crisper. If we can't, it's no
problems."*

**The cause was found by arithmetic and it is the canvas's pixel ratio.** Every
version to date — V10's room and V11 stages 1 and 2 — wrote
`dpr={coarse ? [1, 1.25] : [1, 1.75]}`, and `coarse` is true for the `mobile`
and `constrained` tiers, which is every phone. An iPhone reports
`devicePixelRatio` 3, so the world was rasterised at **1.25 × and upscaled to
3 × by the display: 42 % of the device's own resolution**, on every edge in the
picture. Text has the finest edges, so text looks softest, which is exactly the
symptom he described.

**The textures were never the limit.** A slab's display is 160.5 CSS px wide,
which is 482 device pixels at DPR 3, and it is drawn from a 1024 px texture on
the mobile tier — **2.1 × more texture than there are device pixels to put it
in**. Raising texture resolution could not have fixed this and would have cost
memory for nothing. At the old 1.25 the headroom was over five.

**What changed.** `src/world/mobile/pixelRatio.ts` makes the ratio explicit per
tier and adds a **Sharpness** row to the hidden development menu: `Low` (1.25 on
a phone, what every earlier version drew), `Standard` (**2**, the new default)
and `Native` (the device's own ratio, capped at 3). The floor is 1 everywhere, so
nothing draws below one device pixel per CSS pixel — `constrained`'s old 0.75
was a blur nobody asked for.

**What it costs, measured — and why the measurement is nearly worthless as a
prediction.** `pnpm --filter mission-control measure:fps:v11`, at 390 × 844 with
the page told to report a device pixel ratio of 3:

| Sharpness | canvas | this container |
|---|---|---|
| Low | 487 device px for 390 CSS px | **1.18 fps** |
| Standard | 780 | **0.77 fps** |
| Native | 1170 | **0.48 fps** |

This container rasterises in **software, on the CPU**, where every extra
fragment is paid at full price and the displays' mip chains are off entirely; a
GPU pays a small fraction of it, and the phone tiers skip the whole
post-processing chain, which this machine does not. **So no performance figure
for any device has been taken and none is implied.** The first run of this
script measured nothing at all and said so: a headless page defaults to a device
pixel ratio of 1, `dpr=[1, ceiling]` clamps to the device's own ratio, all three
settings drew 390 device pixels, and the figures — 1.51 / 1.46 / 1.54 fps — were
noise. That is why the setting is in the owner's own menu: he can answer on his
device the question this one cannot, and `Low` is one tap away if `Standard`
costs him frames.

### What looking found, and what each fix cost

Eleven defects, each found in a frame or in a printed number, each fixed at its
cause:

1. **the failure card and the conclusion disagreed** — the conclusion said
   `unit mission-control returned a failure` while the terminal under it printed
   `@virgil/visual-language`, because the card was authored by hand and the
   conclusion derived from `tally.ts`'s failing index. Two texts written apart,
   disagreeing on screen: the exact defect the owner caught in V7. The card is
   derived from the check's own name now;
2. **`sentence()` raised only character zero** — *"A required check failed. the
   candidate is refused."*;
3. **the progression pips read *nothing in flight* after a verdict** and *not
   started* at the owner gate, because the demonstration deliberately returns
   every station to `READY` at the gate, so a station's current state cannot
   answer *did this hop happen*. They read the run ledger now, whose whole rule
   is that a row is appended and never rewritten;
4. **Virgil's status read *At rest*** while he was holding a returned candidate
   between hops. Holding work is not resting;
5. **his headline shouted a verdict** — *"The review returned PASS WITH
   NON-BLOCKING FINDINGS"* in three lines of 22 px capitals, which is the giant
   uppercase heading the brief forbids, and the verdict cannot be shortened
   because `PASS` names a different one of the four. The headline is prose and
   the verdict is a token in the monospace face; a test forbids any of the four
   words in any headline;
6. **a stacked two-column table repeated its own column heads** above every
   cell — `WHAT / Candidate`, `STATE / SAFE_TO_MERGE`;
7. **the composer's placeholder wrapped to two lines** inside a one-line box and
   was clipped at 390 px;
8. **the session controls' disclosure came out as `Session controls— none is
   connected`** — a whitespace-only text node between flex items is not
   rendered at all;
9. **landscape gave the conversation about forty of its 390 px** and the rest to
   chrome. It has its own compressed furniture now, with the honesty marking
   reduced in leading and **not** in words;
10. **the dock and the badge ran under the landscape sheet**, leaving a
    half-covered `TALK` in the one strip of world still visible. The dock goes
    while a window is open; the badge moves into the strip rather than being
    hidden;
11. **the small character portrait read as a dark disc with a dash in it.** It
    has a helmet lighter than the ground, a shoulder line and its accent at full
    strength, and it reacts — the visor breathes while work proceeds and flinches
    on a refusal, on the compositor only, stopped under reduced motion.

And two in the instruments, worth recording because both produced a **picture
that lied while the numbers were right**, which is the worse way round:

- **the window study's own expand ran on every frame.** React 19 commits
  asynchronously, so the second pass still saw `aria-expanded="false"` and
  clicked every section shut again. A whole set of "expanded" frames showed only
  the sections that open by default. It clicks once now;
- **the store subscribed in a `useEffect`**, so a change made between React's
  commit and its passive effects notified nobody: the store updated, no
  re-render was scheduled, and the same frames stayed closed. `useSyncExternalStore`
  is the fix rather than a workaround, because it re-checks the snapshot after
  subscribing. `panelStore.ts` uses the same idiom for the same class of reason.

Three more in `verify:owner:v11` itself, found by running it: a `goto` that
changes only the hash does not reload, so the window's memory crossed between
viewports; a 336 px keyboard does not fit a 390 px-tall viewport; and the check
assumed a tap near the Prover's screen focuses the Prover, when two world
targets can overlap and the hit test takes the nearer centre.

### The study, committed

`study/windows-v11.{html,tsx}` renders the **same component the world renders**,
with the same stylesheet, against the demonstration's own state at a chosen
second, at phone size, with no 3D — so *render → look → refine → look* costs a
second instead of a build. `study/capture-windows-v11.mjs` photographs every
window at every viewport, closed and expanded, with a simulated keyboard, under
reduced motion, and at a simulated 59 px Dynamic Island inset, and prints every
pressable box and every overflow check. `study/measureDisplays.ts` holds the one
projection measurement now used by the tests, the parameter sweep and any later
question; `study/sweep-cluster.ts` is the sweep that chose the cluster's
numbers. All of it is committed, for the reason V10 recorded: V9's measuring
script was thrown away, could not be reproduced when the owner asked a follow-up
question, and a defect was left unfixed because of it.

### The preservation contract

None of the files the brief names was edited. **V10 built from a clean tree at
this branch's HEAD is 8,528,318 bytes — byte-count identical to stages 1 and 2**,
so stage 3 adds nothing at all to V10's build: the window lives entirely in
`src/world/window/`, and the shared world files V10 renders are untouched. The
77-byte difference stage 1 isolated and explained is unchanged and no new one was
added. V9's panel and its stylesheet are untouched and still dress V10's own
record at `#/v10`, which was driven in the browser inside this build: 1 control
bar, 1 demonstration badge, 1 provenance footer and 0 V11 nodes, each of them a
condition `verify:owner:v11` fails on rather than a note.

### The checks, as printed

| Check | Result |
|---|---|
| `pnpm check` — biome | `Checked 272 files in 192ms. No fixes applied.` |
| `pnpm check` — typecheck | `Tasks: 8 successful, 8 total` |
| `pnpm check` — tests | agent-contracts 70, visual-language 18, knowledge-graph 24, gate-engine 19, domain 104, **mission-control 816 in 29 files** |
| `pnpm check` — `verify:owner` | `PASS — opens from file://, no console errors, no off-document requests`; `console errors 0`; `requests 1, off-document 0` |
| `pnpm check` — `verify:owner:v11` | `PASS — … no horizontal overflow with the window open or closed, every touch target and every window control at least 44 x 44, one tap opens the window and moves the camera together, back is one step per level, the composer stays above a simulated keyboard and claims nothing was sent, no session control is enabled, the gesture guard holds, V10 still loads at #/v10`; `console errors 0`; `requests 4, off-document 0` |
| Mind Scan | `82 nodes, 166 edges, 10 pages, 28 claims, 94 tethers (94 intact)`; `mind scan: no findings` |
| `build:owner` from a clean tree | `v10-s2-virgil-0101bddce1.html`, **8,528,318 bytes** — identical to stages 1 and 2 |
| `build:owner:v11` from a clean tree | `v11-s3-virgil-0101bddce1.html`, **8,680,573 bytes** |
| `sha256sum -c *.sha256` | **17 committed artifacts, all `OK`** |
| `pnpm reproduce:owner` | `identical — rebuilt from 4ae03314d93ed6e26982f3691034974ff5b3887b`; `PASS` |
| `pnpm reproduce:owner:v11` | `identical — rebuilt from 0101bddce107c627f144a69f2039af7467303615`; `PASS` |

**One deviation in how `pnpm check` was run, recorded rather than smoothed
over.** Its five steps were run as three foreground commands — `pnpm lint`,
`pnpm typecheck`, `pnpm test`; then `pnpm verify:owner`; then
`pnpm verify:owner:v11` — because this harness caps a single command at ten
minutes and the two verifies take about thirteen between them in a software
renderer. They are the same commands in the same order that `pnpm check` runs,
and every one of them passed.

**Tests added this stage: 76, none changed to pass and none skipped or
weakened.** The app's suite goes from 740 to 816: 30 for the window's content
and the sixteen capabilities, 24 for the component and its stylesheet, 21 for
the owner's four stage-3 instructions and the pixel ratio, and 1 for the
concurrent open.

**Four assertions were replaced rather than deleted, and each says why where it
lives.** Stage 1's *"the record waits out the flight"* becomes *"the window is
open at the press"*; stage 1's *"reduced motion opens sooner than the default"*
becomes *"neither waits at all"*, which is stricter; stage 2's *"the primary is
25–35 % larger than the pair"* becomes *"all three are the same size"*, which is
harder to hold; and stage 2's *"the supporting screens are 125–140 px"* becomes
the equality above. In all four cases the owner replaced the instruction behind
the assertion, and in none of them was a failing check made to pass.

### The artifact

`docs/process/PHASE_1_owner-builds/v11/v11-s3-virgil-0101bddce1.html`, sha256
`062b3dac70953832a10f4713d8ab9a06538e1f9a3e4e061a78e3e68f999a6a43`,
**8,680,573 bytes** — 0.87 % larger than stage 2's 8,605,472 against identical
model payloads, which is the whole window: its content model, its four
documents, its block renderers and its stylesheet. Its digest is
`docs/process/PHASE_1_owner-builds/v11-s3-virgil-0101bddce1.html.sha256`, at the
top level so the one existing `sha256sum -c *.sha256` covers it and V10's
reproducer still finds V10's own newest artifact.

**How to open each version.** `#/` is V11 stage 3; `#/v10` is V10, unchanged, in
the same file; `#/s1`, `#/spike/foundry` and `#/spike/mind` are the rejected
Phase 0 spikes, as in every build since S1. The world's panel opens by tapping a
character, a console screen or one of Virgil's slabs, or with keys 1–5; `0` or
Escape returns to the overview; `D` opens the development menu, where the
Sharpness selector lives.

### What this stage does not claim

- **No visual-quality judgment has been made on real graphics hardware by this
  session.** Every frame here was rendered in software by SwiftShader. OD-0005
  defers the two graphics-hardware checks and requires them recorded as not
  performed, never as met.
- **Every iPhone check here is a simulated viewport in headless Chromium.**
  390 × 844, 430 × 932 and 844 × 390 are CSS pixel sizes given to a browser, not
  devices. **No real device has been used by this session.** The owner's own
  screenshot is real-device evidence and it is his, not this session's; three of
  the four composition changes above exist because of it.
- **`viewport-fit=cover`, `100dvh`, the four `env(safe-area-inset-*)` values, the
  Dynamic Island and the home indicator are written and exercised at zero
  inset**, because that is what this environment returns. A 59 px inset was
  simulated and looked at. Whether the chrome sits correctly around a real
  Dynamic Island is **not performed**, not met.
- **The onscreen keyboard is simulated** by substituting `visualViewport`.
  Whether a real iOS keyboard leaves the composer where this record says it does
  is **not performed**.
- **No screen reader has been run** and no assistive-technology pass has been
  performed. What is verified is the attributes, the labels and the focus order
  in the DOM.
- **No performance figure for any device has been taken.** The three sharpness
  figures describe SwiftShader on a CPU and are a direction, not a budget.
  `PERFORMANCE_STRATEGY.md`'s measurement section still reads "None has been
  performed on any branch."
- **There is no session behind this build and nothing here fakes one.** The
  composer keeps what is typed and says so; the five session controls are
  disabled with their reasons; merge is not offered at all and remains the
  owner's alone in every phase.
- **A pass here is a builder's claim.** The deterministic checks are the
  evidence; **as of stage 3** independent review has not happened. It happened
  later, at `de3c7d8`, and covers this stage.
- **As of stage 3**, stage 4 of the brief is not started: performance, the twelve
  review states and the KTX2 / Draco / Meshopt assessment the brief's second
  caution requires are all still ahead of *this* pass. Stage 4 has its own
  section below.

---

## Between stages 3 and 4 — the character in their own close-up, and the demo signage removed

**Two items the owner asked for after seeing stage 3, and nothing else.** As of
this pass stage 4 is not started: performance, the twelve review states and the
KTX2 / Draco / Meshopt assessment are all still ahead of *it*, and none of them
was touched here. Stage 4 has its own section below.

### Item 1 — the character is no longer cropped out of their own station close-up

**This is the oldest open visual defect in the project.** V8.1 opened it, V9
deferred it to the panel pass, V11 stage 2 deferred it again and named the
remedy. It contradicted the owner's V8 §0.10.8 direction — *"have each agent at
the console, sightly to the left so it doesnt obstruct the screens, faciung
forward"* — and the V11 brief's requirement that the Fabricator, the Prover and
the Keeper stay recognisable.

**Why V8.1 could not fix it, and why this pass could.** V8.1 searched **242
candidate poses** and found none that held both the whole of a console's screen
and its character for all three roles; the characters stand about 2 m in front of
their consoles and up to **47° off the screen's axis**, and stage 2 measured the
close-up's horizontal half-angle at 390 × 844 as **17.1°**. That search was only
necessary because the screen had to carry the full text of the hop. **Stage 3's
window carries it now**, so the screen has to be present and its **primary state**
has to read — which is what freed the frame.

**The new poses**, at 390 × 844, from `src/world/mobile/stationCloseUp.ts`. Every
number in the file is measured, and the measurement is written at the place it
decides. Only the **distance** is solved — by bisection, as the nearest stand
that holds the required points inside the lens at this viewport's aspect — so a
change to a console's position, a character's height or a model moves the camera
rather than silently cropping something.

| | V10's close-up | V11's station close-up |
|---|---|---|
| the Fabricator | (−1.95, 2.07, −0.99), 3.00 m, **67.5°** | **(−0.47, 2.11, 1.18) → (−2.97, 1.01, −1.96), 5.53 m, 52°** |
| the Prover | (−0.08, 2.05, −2.26), 3.00 m, **69.9°** | **(0.55, 2.18, 0.89) → (−0.76, 0.89, −3.46), 6.14 m, 52°** |
| the Keeper | (1.90, 2.45, −1.43), 3.00 m, **70.6°** | **(1.22, 2.62, 1.96) → (1.68, 0.85, −2.84), 6.39 m, 52°** |

It keeps the one property V8.1 established — the camera stands on the screen's
own measured mean normal — and swings **6° off it away from the character**,
which is measured rather than chosen: rays from the pose to the 132 samples of
the Fabricator's glass his console does not itself hide, with him in his
front-facing pose, are blocked at **13 of them at −8°, 7 at −4°, 4 at 0° and 0 at
+6°**, and every one of those blocked samples is in the third of the screen the
primary state is drawn on. The first built frame of this pass showed exactly
that: `STANDBY` reading as `ANDBY`.

The elevation is **0.7 of the screen's own rise**, and it is bounded from both
sides by the set. Above: at V10's 1.25 the camera stands at y ≈ 3.3 from six
metres out and **Virgil's candidate slab comes between the camera and the
Keeper's screen** — 73 of his 75 unhidden samples blocked at 1.35, 37 at 1.2, 1
at 1.05, 0 at 0.9 and below. Below: at 0.35 **Virgil's own console stands in
front of the Prover's torso** — 1 of the 18 points of it blocked at 6.0 m, 3 at
6.5, 6 at 9.0. Nothing is blocked at 0.6 and above at any distance the solve
reaches.

**Which edge of the screen is croppable is not arbitrary.** The primary state is
drawn at the **left** of the display canvas (`screens/v11/chrome.ts`,
`heroRect`), and the canvas's left edge maps onto the station's own −x
(`screens/screenPlane.ts`), which is the side the character stands on. So a
frame that keeps the character and loses the far edge of the glass loses the
**micro-rail**, never the state — which is what stage 2 says that rail is for.

### What each new pose gives up, measured

`test/station-close-up-v11.test.ts` prints all of this from the geometry rather
than quoting it.

| At 390 × 844 | Fabricator | Prover | Keeper |
|---|---|---|---|
| of the screen inside the frame | **69 %** | **69 %** | **70 %** |
| the visible part's width | **109 CSS px** | **95** | **94** |
| the whole screen's width at that distance | **162** | **142** | **134** |
| the **drawn display**, against stage 2's | **152.2 × 89.3** (was 200.2 × 117.4) | **125.0 × 66.9** (was 174.4 × 93.3) | **123.9 × 82.4** (was 177.2 × 117.1) |
| against the 64 px text-collapse threshold | **2.4×** (was 3.1×) | **2.0×** (was 2.7×) | **1.9×** (was 2.8×) |
| the character's head and torso, of the frame's height | **44 %** | **37 %** | **34 %** |
| the face | **66 px** | **54** | **45** |
| screen samples behind anything | **5 of 132**, his own shoulder, in the bottom 10 % of the glass | **5 of 142**, his own console's casing at the mask's edge | **6 of 216**, his own console's casing |
| in the **primary state's own region** | **0** | **0** | **0** |
| the character behind anything | **0 of 18** | **0 of 18** | **0 of 18** |

At 430 × 932 the same, larger: 120, 105 and 104 CSS px of visible screen and 73,
59 and 50 px of face. **In landscape all three screens are whole** — 100 % in
frame at 103, 115 and 159 CSS px — because the frame there is wide and shallow
and the solve stands much nearer (4.2, 4.0 and 3.4 m).

**What else entered frame, and it is the one thing this fix could not clear:
the lower edge of Virgil's slab cluster.** The cluster hangs at y = 2.50–6.64,
x = ±3.0, z ≈ −1.3, which is between a camera standing off a console on the +z
side and the console itself, and the first frames of this pass showed it as a
cropped slab with legible type across the **top fifth** of all three close-ups —
reading as an overlay rather than as depth. **The cluster is not moved**: the
owner has declined that change, and `composition.ts`'s overview and
`screens/v11/bank.ts` are untouched. The camera tilts down 0.2 m of target
height instead, which takes the cluster's sample points in frame from 12, 10 and
17 to **6, 6 and 12 of 294**, and what is left is a strip from the top of the
frame down to **78 px** on the Fabricator, **64 px** on the Prover and **142 px**
on the Keeper at 390 × 844 — the Keeper's the worst, and his reads `OWNER ONLY`
above the `← Overview` control. **It is a reduction and not a cure, and the
arithmetic says why**: clearing it completely takes a tilt of 0.8 m on the
Fabricator and 1.0 m on the Prover, and **no tilt clears it at all on the
Keeper**, whose candidate slab reaches x = +0.07 while his own camera stands at
x ≈ +1.2. Those tilts put the character's feet near the middle of the frame and
turn its lower half into floor. **In landscape the cluster is out of shot
entirely** — 0 of 294 points, at all three roles. This is named as a finding for
stage 4 or for the owner, not as a thing that was fixed.

### What looking found, and every frame that was looked at

The frames are in the session scratchpad **outside the repository**, at
`/tmp/claude-0/-home-user-Virgil-mission-control/f269a3ff-13b6-5a28-ace2-f0d6b365c3ad/scratchpad/`,
and are referenced rather than committed. They were captured from a vite dev
server on this branch's own sources, in headless Chromium at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, with the demonstration
clock seeked on `window.__virgilDemo` and the view changed by pressing the same
**Look at** control in the development menu the owner has — never by navigating,
which is the mistake stage 2 recorded.

- **before**, `before-p390/`, at 390 × 844: all three close-ups of the committed
  stage-3 behaviour. The Fabricator's console fills the frame with `BUILDING`
  legible and **one arm** of him at the left edge; the Prover's the same with a
  knee and a shoulder; **the Keeper is not in his own frame at all.** This is the
  defect, and it is what three passes reasoned about instead of looking at;
- **after**, `after-p390/`, at 390 × 844: each character large and central,
  their console beside them, `BUILDING`, `VERIFYING` and `REVIEWING` legible on
  the glass;
- **after, facing front**, `after-idle/`: the two roles that are idle at another
  role's beat, which is the worst case for a character standing between the
  camera and their own screen. The Fabricator's cyan visor eyes and smile read
  plainly and his screen says `STANDBY` **whole**; the Keeper's face, his hood
  and his three floating cards read, and his `STANDBY` is whole too;
- **after, landscape**, `after-l844/` at 844 × 390: each character central with
  their console at the right, and in the Keeper's frame the Prover's console
  behind him reading `PASS`;
- **the four iterations that were rejected**, `try1-p390/` to `try4-p390/`,
  kept because each one is the evidence for a constant in the file: `try1` is
  where Virgil's slab filled the top fifth, `try2` where a low camera put
  Virgil's console across the Prover's body, `try3` where `STANDBY` read as
  `ANDBY`, `try4` where the swing fixed that and the Keeper's slab strip grew;
- **the window**, `after-window/`, for item 2 below.

**Stage 2's other fix still holds at the new poses.** A display is on while the
camera is looking at it (`ConsoleScreenV11.tsx`: `state !== 'READY' || attention`,
and `attention` is `focus === role`, which does not depend on distance). Verified
by looking: in the idle frames both the Fabricator's and the Keeper's screens are
lit and titled at their new distance, and the black-screen defect stage 1 found
has not come back.

**The gesture guard and the touch targets are exactly as they were.**
`room/gesture.ts` and `mobile/TouchTargets.tsx` are untouched, and
`verify:owner:v11` drives both in the built artifact: 13 targets, smallest 48 px,
and a 114 px drag across Virgil opens nothing.

**The overview and the slab cluster are unchanged, and here is the evidence
rather than the assurance.** Nothing outside `src/world/mobile/` was edited;
`composition.ts`'s `overviewPose`, `PORTRAIT_FRAME` and `LANDSCAPE_FRAME` and
`screens/v11/bank.ts`'s `V11_CLUSTER` are byte-identical to stage 3, and their
own assertions — the overview's enclosure and anchor tests in
`mobile-composition.test.ts` and the cluster's five size, gap and clearance
targets in `cluster-v11-s3.test.ts` — all still pass unchanged. The 11 px
clearance over the consoles is not touched by anything in this pass.

### Item 2 — every sign of Demo out of V11 except one chip

Removed on the owner's instruction, which is recorded in the commit: the amber
`Illustrative · not real state` bar and its paragraph from every stage-3 window,
and the word `illustrative` from the Prover's `Where these numbers come from`
evidence block. **One chip remains**, the `Demo data` pill in the overview chrome
with its full sentence behind a press.

The grep the instruction asked for covered `ILLUSTRATIVE`, `NOT REAL STATE`,
`SCRIPTED`, `DEMONSTRATION`, `DEMO` and `illustrative` across every V11 source.
Four things were kept and each is a judgment at the boundary, named so it can be
overruled: the chip itself; the **recorded run's** own marking, which is the
opposite claim (the run did happen and every figure is read out of this
repository's committed record); the composer's *"Nothing is sent: there is no
session behind this build"* and the five disabled session controls, which the
instruction's own second boundary protects; and the hidden development menu's
`Demo On/Off` and `Scripted/Replay` switch labels, which are the names of two
switches rather than signage. The in-world screens needed nothing — stage 2
already took their bands off on the owner's earlier instruction. V10 keeps all of
its own signage.

Nothing was left where the bar was: `.v11w-head` carries its own bottom rule and
`.v11w-body` is `flex: 1`, so the sheet closes up, and in landscape the window
gets those pixels back — the one place this removal makes the window better
rather than only quieter. Looked at in three frames in `after-window/`: the
Prover's window, the same window with its evidence expanded, and Virgil's.

### The checks, as printed

`pnpm check` was **split into its five parts** because the two verifies build the
two artifacts and `verify:owner:v11` alone takes 11m 43s, past the ten-minute
foreground cap. Every part ran in the foreground.

| Check | Result |
|---|---|
| `pnpm lint` | `Checked 274 files in 201ms. No fixes applied.` |
| `pnpm typecheck` | `Tasks: 8 successful, 8 total` |
| `pnpm test` | agent-contracts 70, visual-language 18, gate-engine 19, domain 104, knowledge-graph 24, **mission-control 826 in 30 files** |
| `pnpm verify:owner` | `PASS — opens from file://, no console errors, no off-document requests`; `console errors 0` |
| `pnpm verify:owner:v11` | `PASS`; `console errors 0`; 13 targets, smallest 48 px; reduced-motion gap **0 ms**; **`0 demo words, 0 not-real-state bands`** in the window at both viewports and **`demo signs outside the one chip 0`** in the ordinary interface |
| Mind Scan | `82 nodes, 166 edges, 10 pages, 28 claims, 94 tethers (94 intact)`; `mind scan: no findings` |
| `build:owner` from a clean tree | `v10-s2-virgil-5d16cbc3ab.html`, **8,528,318 bytes** — identical to stages 1, 2 and 3 |
| `build:owner:v11` from a clean tree | `v11-s3-virgil-5d16cbc3ab.html`, **8,682,729 bytes** |
| `sha256sum -c *.sha256` | **18 committed artifacts, all `OK`** |
| `pnpm reproduce:owner` | `identical — rebuilt from 4ae03314d93ed6e26982f3691034974ff5b3887b`; `PASS` |
| `pnpm reproduce:owner:v11` | `identical — rebuilt from 5d16cbc3ab2a6e10889f88520fff98ec0160a1ce`; `PASS` |

**The preservation contract, and the strongest single number in this record.**
Building V10's entry from a clean tree at this pass's own HEAD gives
**8,528,318 bytes** — byte-count identical to stages 1, 2 and 3. Nothing outside
`src/world/mobile/`, `src/world/window/` and V11's own verifier and config was
edited; `room/closeUp.ts`, `room/palette.ts`, `screens/draw.ts` and
`screens/v11/bank.ts` are exactly as stage 3 left them, and V10's own close-ups
still come from `closeUpPose` unchanged.

### The artifact

`docs/process/PHASE_1_owner-builds/v11/v11-s3-virgil-5d16cbc3ab.html`, sha256
`14e3c7357a745e6607a9e73bbaa80781161885660508bba90f74bcc6a323fcb4`,
**8,682,729 bytes** — 2,156 bytes (0.025 %) larger than stage 3's 8,680,573
against identical model payloads: the new close-up module, its test's own
exports, the demo signage removed and the longer stage line. Its digest is
`docs/process/PHASE_1_owner-builds/v11-s3-virgil-5d16cbc3ab.html.sha256`, at the
top level so the one existing `sha256sum -c *.sha256` covers it and V10's
reproducer still finds V10's own newest artifact. **How to open it is unchanged
from stage 3**: `#/` is V11, `#/v10` is V10 in the same file, `#/s1`,
`#/spike/foundry` and `#/spike/mind` are the rejected Phase 0 spikes.

**Tests: 10 added, two replaced, none skipped or weakened.** The app's suite goes
from 816 to 826: nine for the station close-up and one for the recorded run's own
marking. Three assertions changed because their subject changed on the owner's
instruction, and each replacement is stated at the place it was made and is
stronger in the dimension that now matters:

1. `mobile-composition.test.ts` required the whole of the screen's box inside the
   close-up frame; it now requires the **primary state and the character**,
   at all five viewports rather than one;
2. `screen-geometry-v11.test.ts` carries the re-measured drawn-display widths and
   a floor of 1.8× the text-collapse threshold rather than 2.5×, with the old
   figures quoted in the file beside the new ones;
3. `window-content-v11.test.ts` required the removed bar's two strings to be
   present; it now walks **every word of every document at every beat of every
   loop** — every message, every expandable section and every block inside one —
   and fails if any of the removed vocabulary appears anywhere.

`window-v11.test.ts`'s accessibility assertion changed form for a real reason: a
fixed `aria-describedby="v11w-honesty"` would now point at an id that is not in
the document on the scripted route, which makes a screen reader announce nothing
for it, so the attribute is spread in with the element and the test holds the
pairing.

### One thing this pass leaves for the Keeper's attention, not a change

The repository's own `scratchpad/` directory holds **86 tracked files, 27 MB** of
diagnostic PNGs and sweep logs committed by earlier passes on this branch; this
pass wrote every frame and every sweep to the session scratchpad outside the
repository instead and added nothing to it, and the existing files are left
exactly as they are because removing them from `HEAD` would not shrink the
history and it is the owner's call.

### What this pass does not claim

- **No visual-quality judgment has been made on real graphics hardware.** Every
  frame here was rendered in software by SwiftShader. OD-0005 defers the two
  graphics-hardware checks and requires them recorded as not performed, never as
  met.
- **Every iPhone check here is a simulated viewport in headless Chromium.**
  390 × 844, 430 × 932 and 844 × 390 are CSS pixel sizes given to a browser.
  **No real device has been used and no real-device check has been performed.**
- **"Recognisable and substantially in frame" is a judgment from frames, not a
  measurement.** What the tests hold is the geometry: the character inside the
  frame with air, their head and torso spanning more than 30 % of its height,
  nothing in front of them, and nothing in front of the primary state. The
  judgment itself is this session's, from the frames listed above, and it is a
  builder's claim.
- **Most of the frames were captured from a vite dev server on these sources
  rather than from the committed artifact**, because a pose that has to be
  iterated needs a loop shorter than a build-and-boot. **Four were then taken
  from the committed artifact itself** — `capture:v11:screens p390 consoles`
  into `artifact-p390/`, `console errors 0` — and they show the same three
  poses: the Fabricator with `BUILDING` legible beside him, the Prover with
  `VERIFYING`, the Keeper with `REVIEWING`, and the Keeper idle and facing
  front with his face readable and `STANDBY` whole. The `Demo data` chip is the
  only demo signage in any of them, and the slab strip is at the top of the two
  it is at the top of in the dev-server frames. So the judgment does not rest
  on the dev server alone, and where it does the record says so.
- **The slab cluster's lower edge is still in the top of all three portrait
  close-ups**, above, and that is recorded as open rather than fixed.
- **A pass here is a builder's claim.** The deterministic checks are the
  evidence; **as of this pass** independent review has not happened. It happened
  immediately afterwards, at `de3c7d8`, and covers this pass
  (`docs/process/V11_KEEPER_REVIEW.md`).
- **As of this pass, stage 4 is not started.** It is started in the very next
  section, and at candidate `de3c7d8` this sentence was the last line of the file
  in a commit that had begun stage 4 — the Keeper's **K11-01**, repaired by the
  note at the top of this record and by this line naming the pass it speaks
  for.

---

## Stage 4 — performance, the twelve review states, and the verification evidence

**Scope.** The last stage of the brief. Three things: the performance work and
the compressed-format assessment its second caution requires; the twelve review
states, each reachable and each looked at; and the verification evidence the
brief lists, followed by the closing summary. One item outside that scope was
done and is recorded with its reason: the Keeper's finding **K11-02**, which
his review says should be repaired at its cause rather than documented.

**An independent review exists now, and this stage is a delta on it.**
`docs/process/V11_KEEPER_REVIEW.md` reviewed candidate `de3c7d8b2a` and returned
`PASS_WITH_NON_BLOCKING_FINDINGS` with six findings. That candidate is stages 1
to 3, the station-close-up repair, the demo-signage removal and stage 4's
compressed-format measurement. **Everything after it in this section is
unreviewed**, including the reduced-performance mode, the twelve states and this
record.

---

### Item 1a — the compressed-format assessment: measured, and not adopted

The brief's second caution: *"KTX2, Draco and Meshopt are to be assessed, not
assumed. Each needs a transcoder or decoder inlined into a single `file://`
document that is already over the mobile transfer budget. The existing bespoke
quantised payload may beat them under this constraint. Measure, then choose,
and record the numbers either way."*

`asset-pipeline/assess-compression.mjs` is the measurement and it is committed.
It runs as **`pnpm measure:compression:v11`** — a named command since the
repair pass below, because at candidate `de3c7d8` nothing invoked it at all
(the Keeper's K11-01). Every number in this section was **re-derived by that
command** during the repair pass and came back byte-identical.
It reads every committed runtime payload and re-encodes the geometry with the
**real** `draco3d` 1.5.7 and `meshoptimizer` 1.1.1 encoders that are already in
this workspace's pnpm store — no dependency was added, because the lockfile is
what the Owner Build's reproducibility rests on. Every figure below is a byte
count of a real encode, except the one that says it is not measured.

**What the document is made of.** The nine payloads are **3,942,257 bytes**
binary and **5,256,344 bytes** as base64 in the document — **60 % of the
8,690,854-byte artifact.** Geometry is 3,325,385 of that binary total and
textures 616,872.

**Per payload, geometry only, in bytes of binary:**

| payload | triangles | today | Draco 14-bit | Draco 16-bit | Meshopt |
|---|---|---|---|---|---|
| console3 | 11,933 | 274,710 | 67,172 | 71,549 | 184,787 |
| fabricator2 | 12,282 | 312,281 | 76,131 | 80,695 | 216,831 |
| fabricatorStation | 7,990 | 186,299 | 47,403 | 50,393 | 127,565 |
| keeper2 | 12,470 | 275,332 | 66,586 | 71,125 | 182,887 |
| keeperStation | 7,907 | 171,943 | 44,145 | 47,160 | 116,341 |
| porthole | 28,513 | 582,710 | 137,623 | 141,100 | 345,335 |
| prover2 | 12,481 | 288,905 | 67,340 | 70,742 | 191,100 |
| proverStation | 8,004 | 189,425 | 47,557 | 50,538 | 130,064 |
| **the eight together** | | **2,281,605** | **553,957** | **583,302** | **1,494,910** |

Draco is compared at **16 bits** of position, not at glTF's usual 14, because
this project's own payload is a 16-bit normalised integer over a 2-unit box and
a comparison at 14 would be a comparison against a coarser mesh. Meshopt is
compared on **the payload's own quantised bytes** after `reorderMesh`, which is
what its codec is for and makes it bit-exact: what it decodes is byte-identical
to what the loader reads today.

**The rigged Virgil is not in that table**, because he arrives as a whole `.glb`
and not as quantised sections: 1,043,780 bytes, of which the JSON chunk is
48,220 and the binary chunk 995,540 — 408,860 of mesh attributes, 125,058 of
indices, 247,108 of skinning and **214,512 of animation across three clips and
139 accessors**, which no geometry codec touches.

**What each option costs and saves, in the document, over the eight props:**

| | decoder, in the document | geometry saved, in the document | **net** |
|---|---|---|---|
| **Draco** | **334,046** (`DRACOLoader.js` 19,030 + `draco_wasm_wrapper.js` 58,456 + `draco_decoder.wasm` 192,420 → 256,560 as base64) | 2,264,404 | **−1,930,358** |
| **Meshopt** | **29,256** (`meshopt_decoder.module.js`, whose wasm is already inside it) | 1,048,924 | **−1,019,668** |
| **KTX2** | **856,894** (`KTX2Loader.js` 36,567 + `ktx-parse` 19,932 + `zstddec` 39,754 + `basis_transcoder.js` 57,529 + `basis_transcoder.wasm` 527,333 → 703,112 as base64) | **not measured** | **+34,398 at best** |

**KTX2 is settled without an encoder, and here is why that is legitimate.**
There is no `basisu`, `toktx` or KTX2 encoder in this environment and none may
be installed, so **the transcoded texture size was NOT MEASURED** and is not
estimated. It does not need to be: the transcoder costs **856,894 bytes** in the
document and **every texture in the whole build is 822,496 bytes** in it. A
transcoded set of *zero bytes* would still make the document **34,398 bytes
larger**. KTX2's real prize is GPU texture memory rather than transfer, and this
build's six live displays already dominate that at 20.1 MB of a 128 MB mobile
budget (stage 2) against the models' textures at 0.6 MB of source. **Rejected,
on a measurement.**

**One option the brief does not name, measured because it costs no decoder at
all.** `DecompressionStream('gzip')` is in the browser already: **0 bytes of
decoder**. Gzipping the payloads and base64-ing the result takes the 5,256,388
bytes they occupy to **3,940,072** — **1,316,316 saved, for nothing.** That is
more than Meshopt saves, for 29,256 fewer bytes of decoder.

**And the combination, measured rather than assumed to compose.** Draco geometry
plus the untouched `.glb` and textures, gzipped, plus the Draco decoder:
**2,739,030 bytes in the document against today's 5,256,388** — a saving of
**2,517,358**, which would take this artifact from 8.29 MB to about **6.17 MB**.
That is the only combination measured here that comes near the 6 MB mobile
transfer budget in `PERFORMANCE_STRATEGY.md`, and it still does not meet it.

**The choice, and it is a choice not a deferral by omission: none of the three
is adopted in stage 4.** The reasons, in order of weight:

1. **Every one of them changes the payload that V10's own world renders from.**
   `src/world/assets/meshyAsset.ts` and the twelve `.b64.txt` payloads are
   shared: V11's route and V10's route read the same bytes. The preservation
   contract's strongest single number is that V10 built from a clean tree is
   8,528,318 bytes at every stage of this branch, and adopting any codec moves
   it by about a megabyte. That is a change the owner should make knowingly, not
   one a stage-4 session should make on its way past.
2. **It is a pipeline change, not an edit.** `asset-pipeline/reduce-model.mjs`
   generates the payloads and its own header records why it may not sit in the
   build path: re-encoding images through Chromium is not bit-stable across
   versions. A codec step therefore needs either a second generation of derived
   committed files or a redesign of that pipeline, and both are their own pass
   with their own review.
3. **No visual verification is possible here.** A geometry codec's defects are
   visual, this container has no GPU, and OD-0005 defers exactly that judgement
   to the owner's own machine.

**The recommendation, with the numbers attached, for whoever takes it:** Draco
saves the most and Meshopt is the safe one — bit-exact, a 29 kB decoder, no
worker and no wasm to inline, and a test could prove the decoded bytes equal
today's byte for byte. Gzip beats Meshopt on bytes at no decoder cost and is
the cheapest first move. **KTX2 should not be attempted in this document at
all.**

---

### Item 1b — the graceful reduced-performance mode

The brief: *"a graceful reduced-performance mode rather than a visibly blurry
default"*, and the instruction that the pixel-ratio decision is now load-bearing
because stage 3 raised the default from 1.25 to 2 on a phone.

**The ladder gives up invisible work before it gives up a single pixel of
sharpness**, in the order `PERFORMANCE_STRATEGY.md` already sets out
(Amendment 1 section S) — *particle density, volumetric resolution, reflection
and shadow quality, background traffic, geometry detail, post-processing
intensity* — in which **resolution does not appear at all**. So resolution is
the last rung, not the first. `src/world/mobile/performance.ts` declares the
three levels as data, so `test/performance-v11.test.ts` holds them:

| | tier steps | screens redraw | post | shadows | pixel ratio | faces | display resolution |
|---|---|---|---|---|---|---|---|
| **Full** | 0 | ×1 | on | on | ×1 | animated | unchanged |
| **Reduced** | 1 | **×0.5** | **off** | **off** | **×1** | animated | unchanged |
| **Minimal** | 2 | **×0.25** | off | off | **×0.625**, floored at 1 | animated | unchanged |

`faces` and `displayResolution` are declared rather than described, and a test
fails if a future level tries to switch either off — because the brief names
both (*"preserve character facial and state animation"*, and the displays' 1024
px floor from stage 2).

**The default pixel ratio is derived now, not assumed.** Stage 3 shipped a flat
2 on every phone. `autoPixelRatio` takes the smallest of three bounds: the
device's own ratio, the tier's ceiling, and **the tier's pixel budget** — 1.6
megapixels on `mobile`. At 390 × 844 the budget alone would allow 2.20, so the
tier's 2 binds and the answer is 2 rather than the device's 3; at 1024 × 1366 on
the same tier the budget binds and the answer is 1.06. A flat 2 could not tell
those two apart, and their fragment cost differs by a factor of seven. It is
rounded **down** to two places, never up: a cap that rounds up is not a cap.
`Auto` is the default; the owner's three explicit settings are untouched,
because an override that quietly refuses to do what it says is worse than none.

**The governor.** 90-frame windows; two consecutive windows over the tier's
budget step down one level; sixty seconds under 70 % of budget gives one back;
never above the level the reader chose. Those are `PERFORMANCE_STRATEGY.md`'s
own rules, which that document records as design-level only and nothing
implemented. **It is switched off on a software renderer, deliberately**: this
container runs twenty times over the mobile budget, so a live governor would
step every frame in this record down to `minimal` and nothing here would show
what the product does. The consequence is stated rather than hidden — **the
step-down path is exercised by a synthetic frame trace in
`test/performance-v11.test.ts` and by forcing a level in the hidden menu, and
has never been observed engaging on a real device, because no real device has
been used.**

**A tier change is never silent.** A discreet `Reduced performance mode` line
appears at the top left whenever the world is doing less than it was authored
to, and disappears when it is not. It carries no action, so it is not a touch
target; it carries no demonstration vocabulary, so the one `Demo data` chip
stays the only thing in this interface that speaks about the demonstration.
Driven in the built artifact: **1 notice at `minimal`, 0 at `full`.**

**The reduced mode was caught being blurrier than the full one, by the check
written to catch exactly that.** At a device pixel ratio of 3 the reduced level
drew at **1.25** against the full level's **2**. The cause: the ladder steps the
tier down to shed the scene's costs, and the pixel-ratio ceiling is also read
per tier, so stepping to `constrained` lowered the ceiling as a side effect.
Resolution has one lever now — the plan's own `pixelScale`, read against the
**detected** tier — and only the last rung pulls it. Measured again on the
artifact: **full 2, reduced 2, minimal 1.25**, and never below 1.

**The two cases the brief names, driven on the built artifact:**

| | measured |
|---|---|
| nothing over the world | `frameloop` **always** |
| a full-screen window open over it | `frameloop` **demand**, driven at 15 fps |
| the page hidden | `frameloop` **never** |
| the page visible again | `frameloop` **always** |

It is **reduced and not paused** under a window for one reason: the window's own
content is published from the demonstration's clock, which advances inside the
render loop, so stopping the loop would freeze the thing being read. 15 fps is a
quarter of the work and keeps the clock honest — every animated thing in this
set caps its own frame delta at 0.1 s, and 1/15 s is inside that cap, so no beat
is skipped or slowed.

**"Load Virgil and the critical foreground first and defer secondary assets" —
built, measured, and switched off.** There is no network in an Owner Build, so
"load" can only mean decode and upload. Split into two Suspense boundaries, at
390 × 844, three runs:

| | cast on screen | backdrop on screen |
|---|---|---|
| run 1 | 13.79 s | 2.39 s |
| run 2 | 13.82 s | 2.61 s |
| run 3 | 13.70 s | 2.54 s |

**The cast is eleven seconds later than the backdrop, not earlier**, because
Virgil's rigged payload is 1.16 MB against the two backdrop planes' 0.65 MB.
Deferring the backdrop cannot make Virgil arrive sooner — he was never waiting
for it. What the split does instead is paint a **command centre with nobody in
it** for eleven seconds, which is a picture of a state this system cannot be in.
So the default is one boundary in exactly V10's order, and `#/?defer=1` keeps
the experiment reproducible from the committed artifact. The first frame this
session captured with the split showed precisely that empty stage, and it is why
the measurement exists at all.

**The rest of the brief's performance list, answered honestly:**

- **compressed GLB, Draco, Meshopt, KTX2** — measured above, none adopted;
- **mipmaps and anisotropic filtering** — done at stage 2: 1024 px displays with
  a full mip chain and anisotropy 4 on the mobile tier, 20.1 MB of a 128 MB
  budget. **Not exercised in this container**, which turns mipmaps off on a
  software renderer;
- **sensible levels of detail** — **not done, and not disguised.** There is no
  LOD system: every model is one mesh at one detail, and adding LOD needs
  decimated meshes from a pipeline step and new committed payloads — the same
  class of change as adopting a codec, and deferred with it. What the tiers
  reduce instead is star count, post-processing, shadows, anisotropy, redraw
  rate and pixel ratio;
- **bake lighting where possible** — the environment is a `<Environment>` with
  `frames={1}`: rendered **once** into a 64² cube map on the coarse tiers and
  256² elsewhere, not re-rendered per frame;
- **limit expensive dynamic lights and real-time shadows** — counted from
  `LightingRig.tsx`: on a phone **9 lights** (3 spot, 4 point, 1 directional,
  1 hemisphere) and **0 shadow casters**; on the desktop tiers 11 lights and
  **1** shadow caster at 2048². The three per-console rim lights collapse to one
  shared light on a phone. The reduced level turns shadows off at every tier;
- **pause or reduce expensive scene animation when a full-screen window is
  open** — done, above;
- **stop unnecessary rendering when the page is hidden** — done, above;
- **preserve character facial and state animation** — preserved at every level,
  declared as data and held by a test;
- **a graceful reduced-performance mode rather than a visibly blurry default** —
  done, above, including the defect the check found.

**What it costs, measured — and the measurement's own verdict on itself.**
`pnpm --filter mission-control measure:fps:v11`, at 390 × 844 with the page told
to report a device pixel ratio of 3:

| | canvas | this container |
|---|---|---|
| sharpness **Auto** | 780 device px for 390 CSS px (ratio 2.00) | **0.65 fps** |
| sharpness Low | 487 (1.25) | **0.94 fps** |
| sharpness Standard | 780 (2.00) | **0.63 fps** |
| sharpness Native | 1170 (3.00) | **0.34 fps** |
| level **Full** | 780 (2.00), tier mobile, screens ×1 | **0.66 fps** |
| level **Reduced** | 780 (2.00), tier constrained, screens ×0.5 | **0.66 fps** |
| level **Minimal** | 487 (1.25), tier constrained, screens ×0.25 | **0.90 fps** |

**Read the fifth and sixth rows together, because they are the honest result of
this stage.** In this container the Reduced level buys **nothing measurable** —
0.66 against 0.66 — and the only rung that moves the number is the one that
lowers the pixel ratio, which is the opposite of what the ladder is designed to
do. That is a property of a **CPU rasteriser**, where fragment count dominates
absolutely and where the things Reduced gives up are either already off on a
coarse tier or cost almost nothing: it is not evidence that the reduction order
is wrong on a GPU, and it is not evidence that it is right. **No performance
figure for any device has been taken and none is implied.** These figures
describe SwiftShader on a CPU with the displays' mip chains off, and they are a
direction, not a budget. `PERFORMANCE_STRATEGY.md`'s measurement section still
reads "None has been performed on any branch", and this stage does not change
it.

---

### Item 2 — the twelve review states

Each one is reachable by a **query parameter on the hash**, read once at mount
exactly as `#/?cam=`, `#/?run=` and `#/?state=` have been read since S1. Stage 4
adds four: `hold=1`, `win=`, `motion=` and `perf=`. **`hold=1` is what makes
them deterministic rather than approximate** — it freezes the demonstration at
the second the URL names, so two runs of the same URL give the same picture
instead of whichever beat a 1.5 fps container lands on. It freezes the
demonstration, not the world: the camera still flies and the visors still
animate.

Append the entry point to the artifact's own `file://` URL. The contact sheet is
`docs/process/PHASE_1_owner-builds/v11/v11-s4-twelve-review-states.png`, and the
frames are numbered to match this table.

| # | The brief's words | Entry point | What it is |
|---|---|---|---|
| 01 | idle command centre | `#/?demo=0&loop=0&hold=1` | no candidate, every station READY, `NO VERDICT` |
| 02 | an agent actively working | `#/?demo=11&loop=0&hold=1` | the Fabricator building, inside his own beat |
| 03 | successful verification | `#/?demo=30&loop=0&hold=1` | the Prover has returned PASS; the candidate is `READY_FOR_REVIEW` |
| 04 | blocked or failed verification | `#/?demo=30&loop=1&hold=1` | loop 1 ends BLOCKED: a required check failed |
| 05 | owner decision required | `#/?demo=50&loop=0&hold=1` | the owner gate, `SAFE_TO_MERGE`, everything else quiet |
| 06 | Virgil's full conversation | `#/?demo=50&loop=0&hold=1&win=virgil` | his window at the gate, every disclosure opened |
| 07 | the Fabricator window | `#/?demo=11&loop=0&hold=1&win=fabricator` | opened while he is building |
| 08 | the Prover window, **collapsed** | `#/?demo=30&loop=0&hold=1&win=prover` | conclusion first, 1 of 5 sections open |
| 09 | the Prover window, **expanded** | the same, then one press on each disclosure | 5 of 5 open: the checks, the facts, the gates |
| 10 | the Keeper window | `#/?demo=42&loop=0&hold=1&win=keeper` | opened while he is reviewing |
| 11 | the composer, iPhone keyboard considered | `#/?demo=30&loop=0&hold=1&win=prover` + a **simulated** 336 px keyboard | a question typed and kept |
| 12 | reduced-motion presentation | `#/?demo=11&loop=0&hold=1&motion=reduce` | and the media preference, both at once |
| 13 | reduced-performance presentation | `#/?demo=11&loop=0&hold=1&perf=reduced` | the graceful mode forced, with its notice |

Twelve entries, thirteen frames, because the brief counts the Prover's two as
one. **`#/?win=<agent>` also takes the camera there**, so the entry point
produces the state a tap produces rather than a window hanging over an overview.

**Two are honestly not URLs alone, and are recorded that way.** Number 09 needs
one press on each collapsed disclosure — deterministic, and driving the
interface, which is what this project prefers to asserting from source; the
window's scroll is then set to the first disclosure by layout, not left wherever
the clicks scrolled to. Number 11 needs a keyboard, and **no headless browser
can raise an iOS keyboard**: `visualViewport` is substituted and the product's
own `useKeyboardInset` path runs against it. **Whether a real iOS keyboard
leaves the composer where this says it does is NOT PERFORMED.**

**Every image was looked at, and two defects came out of looking.**

**The reduced-motion frame had no hero word on any of the six displays.** No
`NO VERDICT`, no `FABRICATOR`, no `BUILDING`, no status marks — six screens of
rails and an orrery, and nothing that says what the system is doing. Both
display components hold their own clock still under `prefers-reduced-motion`,
which is right for the hover and the sweep and wrong for everything measured
from it: `since` stayed at 0, and so did every `clamp01(since / n)` — including
the hero's own `globalAlpha`. **It had been in the build since stage 2 and no
frame of it had ever been looked at.** It is the same fault as KR-55, where a
reduced-motion branch deleted both of Virgil's faces, and the remedy is this
project's own rule: **arrive, never hide.** `sinceFor` reports every transition
as long finished when the preference is set. The test measures the hero's
**alpha** rather than its absence, because the words were in the draw calls all
along — drawn at zero opacity, which is why nothing but a frame could have
caught it.

**A state sentence appeared before its state.** `EVERY GATE PASSES. ELIGIBLE,
NOT MERGED.` is `constitution/STATE_LANGUAGE.md`'s sentence for `SAFE_TO_MERGE`
and for nothing else, and it was printed under the word `PASS`
unconditionally — so at the passing loop's thirtieth second, with the candidate
`READY_FOR_REVIEW` and the Keeper yet to review, the verdict slab told the
reader the candidate was eligible to merge. **Stage 2's 299-assertion audit
could not see it**: it looks for a verdict *word* appearing early, and the
verdict word here was honest; the line under it was not. It reads
`VERIFICATION PASSED. NOT YET REVIEWED.` now — shortened after looking at the
slab a second time, because the lead is elided to the width it has and
"VERIFICATION PASSED. REVIEW HAS NOT …" can be read as *review has not passed*.
`test/screen-content-v11.test.ts` now holds the sentence to its state at every
half-second of all three loops.

**One capture artefact, recorded because it looked like a defect and was not.**
The first reduced-performance frame showed the three slabs with no hero words
either. Choosing that level steps the tier down, which rebuilds each display's
canvas and restarts its arrival — and a software renderer redraws them at 1.5
fps scaled by 0.5, so the arrival takes about ten wall-clock seconds here
against well under one on a device at 12 fps. The capture waits longer for that
one frame, and the product was not changed.

---

### The Keeper's K11-02, repaired at its cause

His review: *"a duration or bar drawn where no duration was recorded"* — this
project's own named failure class, live in V11's rebuilt slab. The run ledger's
bar was `done ? 1 : active ? clamp01((seconds % 6) / 6) : 0`, and `seconds` is
the demonstration's **global** clock. So an in-flight hop drew a six-second
sawtooth that was the same for whichever hop was running and reset every six
seconds, and every returned hop drew a full bar whatever its length. It read as
*how far through this hop is*. It measured nothing.

`screens/ledger.ts` already states the rule it broke: *"a bar is a length and a
length is a claim"*, with `maxElapsed` there so lengths are comparable between
rows. A length is drawn now only where a duration exists. In the scripted
demonstration each hop's window is a constant of the script, quoted from
`demo.ts`'s own `BEATS` rather than restated — 2→14, 17→29, 32→44 — so the bar
is that hop's real elapsed seconds against the longest hop, and a running one
grows from its own start. In the **replay** this slab is handed no per-hop
duration at all, so **no bar is drawn**: the track stays and the claim goes.

The review also recorded that **no test asserted the bar's semantics** and that
a grep for `elapsed` across the V11 screen tests returned nothing. The fill is a
pure exported function now, with four assertions on it — including the one the
old expression would have failed outright: at eight seconds the Prover's hop has
not started and draws nothing, where the old one drew a full sawtooth.

**The other five findings are not repaired here**, and the reason for each:
K11-01 is overtaken by this section existing; **K11-03 is the owner's**, and is
carried into the limitations below as the review asked, because what the review
found genuinely wrong about it was that the run record did not carry it at all;
K11-04 is partly reduced (the stage-4 checks poll conditions and count frames)
and partly still true; K11-05 is the owner's call on tracked scratch, and this
stage adds 4.0 MB of deliverable frames to that weight, named here rather than
slipped in; K11-06 stands.

---

### The preservation contract

**V10 built from a clean tree at this stage's own HEAD is 8,528,318 bytes —
byte-count identical to stages 1, 2, 3 and the pass between them.** Nothing
outside `src/world/mobile/`, `src/world/screens/v11/`, `src/world/window/` and
V11's own harnesses was edited; `src/world/assets/meshyAsset.ts`, every payload,
`room/closeUp.ts`, `room/palette.ts` and `screens/draw.ts` are exactly as they
were. The 77-byte `Tabletop.tsx` difference stage 1 isolated and explained is
unchanged and no new one was added. `src/ui/settings.ts` is shared with V10 and
was deliberately **not** touched, which is why the stepped tier is threaded
through V11's own context value rather than through a new field on it.

`#/v10` was driven in the browser inside this build at all three viewports: **1
control bar, 12 buttons, 1 demonstration badge, 1 provenance footer, 0 V11
nodes.**

---

### The checks, as printed

`pnpm check` was **split into its parts**, because this harness caps one
foreground command at ten minutes and `verify:owner:v11` alone takes about
fifteen in a software renderer. Every part below ran in the foreground, at the
artifact's own commit `99614fa209`, and they are the same commands in the same
order `pnpm check` runs.

| Check | Result |
|---|---|
| `pnpm lint` | `Checked 278 files in 233ms. No fixes applied.` |
| `pnpm typecheck` | `Tasks: 8 successful, 8 total` |
| `pnpm test` | agent-contracts 70, visual-language 18, gate-engine 19, domain 104, knowledge-graph 24, **mission-control 861 in 31 files** |
| `pnpm verify:owner` | `PASS — opens from file://, no console errors, no off-document requests`; `console errors 0`; `requests 1, off-document 0` |
| `verify:owner:v11`, portrait 390 | `PASS (partial)`; 13 targets, smallest 48 px; 17 window controls, smallest 44; `scrollWidth 390/390`, 0 past the edge; 5 session controls, 0 enabled; composer clear of a simulated keyboard by 48 px |
| `verify:owner:v11`, portrait 430 | `PASS (partial)`; the same, 32 px of keyboard clearance |
| `verify:owner:v11`, landscape 844 | `PASS (partial)`; 15 window controls; 29 px of clearance at a 180 px keyboard |
| `verify:owner:v11`, motion and performance | `PASS (partial)`; reduced-motion gap **0 ms** and default gap **0 ms**; loop always / demand / never / always; levels at DPR 3 **full 2, reduced 2, minimal 1.25**; window text **1,287 DOM characters, 0 canvases** |
| Mind Scan | `82 nodes, 166 edges, 10 pages, 28 claims, 94 tethers (94 intact)`; `mind scan: no findings` |
| `build:owner` from a clean tree | `v10-s2-virgil-99614fa209.html`, **8,528,318 bytes** |
| `build:owner:v11` from a clean tree | `v11-s4-virgil-99614fa209.html`, **8,690,854 bytes** |
| `sha256sum -c *.sha256` | **19 committed artifacts, all `OK`** |
| `pnpm reproduce:owner` | `identical — rebuilt from 4ae03314d93ed6e26982f3691034974ff5b3887b`; `PASS` |
| `pnpm reproduce:owner:v11` | `identical — rebuilt from 99614fa2091eddfa8f5a2f4191684cce62f2a751`; `PASS` |

**A partial run of `verify:owner:v11` may never print `PASS`.** It prints
`PASS (partial: …)` and names exactly which viewports and which sections ran, so
no record can quote one as the whole check by accident. The four partial runs
above together cover every assertion the single run makes, and each of them
re-runs the shared prelude — the five routes and V10's own chrome — from a fresh
document.

**Tests added this stage: 35, none changed to pass and none skipped or
weakened.** The app's suite goes from 826 to 861: 25 for the performance ladder,
the pixel budget and the governor's step-down and step-up over a synthetic frame
trace; 6 for the reduced-motion arrival and the merge-eligibility sentence; 4
for the ledger bar. Two assertions changed subject and each says so where it
lives: `cluster-v11-s3.test.ts`'s sharpness list gains `auto` in front of the
three, which are still held to exactly what stage 3 said they mean; and
`owner-build-v11.test.ts`'s artifact-name assertion is pinned to the pattern
`v11-s<n>` plus the current stage, because pinning it to `v11-s3` exactly made a
correct change fail.

**Three instrument faults, fixed and recorded rather than worked around.** The
visibility check used a getter inside a `page.evaluate`, which `tsx` compiles
into an `esbuild` `__name(...)` call that does not exist in the page — the trap
the verifier already records once, met a second time. The dev menu grew tall
enough to cover the mark that opens it, so both capture harnesses now close it
by its own `Close` and address its rows by label, since `Auto` and `All` are no
longer unique names in the panel. And Playwright's default 30-second action
timeout is not enough at a device pixel ratio of 3 in software, where a single
frame takes seconds: `measure:fps:v11` waits three minutes, because the renderer
is the slow thing and not the interface.

**One deviation from the instruction to run everything in the foreground.**
`measure:fps:v11` at DPR 3 takes **11 m 19 s** — four sharpness settings and
three levels, each with its own canvas rebuild — and exceeded the harness's
ten-minute cap, which moved it to the background. It completed inside the same
turn and its output is the table above. Every other command ran in the
foreground.

---

### The artifact

`docs/process/PHASE_1_owner-builds/v11/v11-s4-virgil-99614fa209.html`, sha256
`85f02334db36b6b33a7682ed2c7add8adf7d864b275b3211e651cc85845c3d01`,
**8,690,854 bytes** — 8,125 bytes (0.094 %) larger than the previous pass's
8,682,729, against identical model payloads: the performance module, the four
new entry points, the notice and its stylesheet, and the two content repairs.
Its digest is
`docs/process/PHASE_1_owner-builds/v11-s4-virgil-99614fa209.html.sha256`, at the
top level so the one existing `sha256sum -c *.sha256` covers it and V10's
reproducer still finds V10's own newest artifact.

---

## The closing summary the brief asks for

### How to open each version

| | How | What it is |
|---|---|---|
| **V11, stage 4** | open `docs/process/PHASE_1_owner-builds/v11/v11-s4-virgil-99614fa209.html` from the file system. It lands on `#/` | the phone-first composition, the in-world screens, the full-screen windows and the performance work |
| **V10, unchanged, in the same file** | `#/v10` | V10's own `VirgilRoom`, with V10's own control bar, badge and provenance footer |
| **V10, its own untouched artifact** | open `docs/process/PHASE_1_owner-builds/v10-s2-virgil-4ae03314d9.html` | byte for byte as it was before this branch existed; `reproduce:owner` rebuilds it from `4ae03314d9` and `cmp` finds no difference |
| the rejected Phase 0 spikes | `#/s1`, `#/spike/foundry`, `#/spike/mind` | as in every build since S1 |

Inside V11: tap a character, a console screen or one of Virgil's three slabs to
open that window; keys 1–5 do the same; the window's back chevron returns to the
station and `← Overview` returns to the overview; `0` or Escape goes straight
back; `D` opens the hidden development menu, which holds Demo On/Off, the
Scripted/Replay selector, the Tabletop/Room selector, the Look-at controls, the
**Sharpness** row, the **Performance** row and the full provenance footer.

### The screenshots

- desktop, 1280 × 800: `docs/process/PHASE_1_owner-builds/v11/v11-s4-desktop-1280x800.png`
- iPhone-sized, 390 × 844: `docs/process/PHASE_1_owner-builds/v11/v11-s4-iphone-390x844.png`
- the twelve review states: `docs/process/PHASE_1_owner-builds/v11/v11-s4-twelve-review-states.png`

All three are **simulated viewports in headless Chromium, rendered in software
by SwiftShader**, taken from the committed artifact. **No iPhone and no GPU was
used**, and none of them is evidence of how the world looks on real graphics
hardware.

### What changed, across all four stages

171 files, +44,926 lines, −11. Almost all of it is new and V11's own; **six
existing files were modified and one of them is shared world code.**

**Modified:**

- `apps/mission-control/src/world/room/Tabletop.tsx` — the only shared world
  file touched in the whole branch: two optional parameters for the backdrop
  planes' placement, defaulting to the values the old code read inline. **77
  bytes** in V10's build, isolated by a diff of two builds and explained at
  stage 1;
- `package.json`, `apps/mission-control/package.json`, `turbo.json`,
  `.github/workflows/checks.yml` — V11's build, verify, reproduce, capture and
  measure scripts, and `verify:owner:v11` added to `pnpm check`;
- `.gitignore`, `docs/process/PHASE_1_BACKLOG.md`.

**Added, by area:**

- **the entry**: `owner-v11.html`, `src/owner/main-owner-v11.tsx`,
  `src/owner/owner-v11.css`, `vite.owner.v11.config.ts`,
  `owner-build/inline-v11.mjs`, `owner-build/reproduce-v11.mjs`;
- **the phone composition** (stage 1): `src/world/mobile/MobileRoom.tsx`,
  `composition.ts`, `TouchTargets.tsx`, `safeArea.ts`, `mobile.css`;
- **the in-world screens** (stage 2): `src/world/screens/v11/` — eleven files:
  `ConsoleScreenV11.tsx`, `ScreenBankV11.tsx`, `screens.ts`, `chrome.ts`,
  `system.ts`, `content.ts`, `motifs.ts`, `marks.ts`, `bank.ts`, `bezel.ts`,
  `resolution.ts`;
- **the windows** (stage 3): `src/world/window/` — `AgentWindow.tsx`,
  `Blocks.tsx`, `blocks.ts`, `windowContent.ts`, `windowStore.ts`,
  `capabilities.ts`, `session.ts`, `window.css`;
- **the station close-ups** (between 3 and 4): `src/world/mobile/stationCloseUp.ts`;
- **performance** (stage 4): `src/world/mobile/performance.ts`,
  `src/world/mobile/pixelRatio.ts`;
- **the harnesses**, all committed: `e2e/verify-owner-build-v11.ts`,
  `capture-v11.ts`, `capture-v11-screens.ts`, `capture-v11-windows.ts`,
  `capture-v11-states.ts`, `measure-fps-v11.ts`,
  `asset-pipeline/assess-compression.mjs`, and `study/` — the screen study, the
  window study, the projection measurement and the cluster sweep;
- **the tests**: fourteen files, 592 assertions added over the branch;
- **the records**: `docs/process/V11_BRIEF.md`, this file,
  `docs/process/V11_KEEPER_REVIEW.md`,
  `docs/process/OWNER_GRANT_2026-09-09-overnight.md`,
  `docs/process/OVERNIGHT_PLAN_2026-09-09.md`;
- **five V11 artifacts with their digests, and stage 4's three frames**, under
  `docs/process/PHASE_1_owner-builds/` — thirteen files, every one an addition;
  nothing under that directory was modified or deleted.

### Test results

`mission-control` 861 in 31 files, `@virgil/domain` 104, `@virgil/agent-contracts`
70, `@virgil/knowledge-graph` 24, `@virgil/gate-engine` 19,
`@virgil/visual-language` 18 — **1,096 in all, all passing.** The app's suite
went from 269 at the branch point to 861. Lint clean over 278 files, typecheck
clean over 8 packages, Mind Scan no findings, 19 committed artifacts verified by
digest, and both reproducers byte-identical.

### What V11 changes, and what it preserves

**Preserved, and this is the point of the branch.** V10 is openable, unchanged,
at `#/v10` inside V11's own file and at its own untouched artifact. Its entry,
its component, its four routes, its build config, its inliner, its reproducer,
its three scripts and every committed artifact are byte for byte as V10 left
them; a SHA-256 tripwire over the five protected sources is in
`test/owner-build-v11.test.ts`, and the independent Keeper review proved the
contract on its own evidence rather than accepting this record's word for it.
The living 3D celestial command centre, Virgil and the three specialists, their
individual workstations, the animated in-world screens, character selection, the
scripted demonstration and the governance information are all still there. **The
default approved version has not changed.**

**Changed:**

| | V10 | V11 |
|---|---|---|
| the portrait camera | the desktop camera widened until the outer consoles fall off the frame — a required field of 1.015 of the lens it has | a frame **solved** for the viewport: 47 critical points held with 11 % of air, 58° at 15.26 m, at the elevation the owner set from his own phone |
| landscape | the same camera | an intentional secondary with its own parameters; the consoles' displays recovered from 23.4 to 45.2 / 35.8 / 40.6 CSS px |
| reaching things | mouse-first, a 12-button control bar across the picture | 13 touch targets, none under 48 × 48; tap distinguished from gesture by the owner's own guard; the chrome behind one discreet mark |
| the in-world screens | one flat treatment, a fixed 1024 texture, no mip chain | a thin ivory-and-gold faceplate fitted to each console's measured opening, deep sapphire glass, bloom under arithmetic control, 1024–2048 by tier with mipmaps and anisotropy, per-agent art direction |
| Virgil's slabs | 120 mm bezels, a 396 mm shell, 1.04 m² of glass, one row | 32 mm bezels, a 150 mm case, 1.44 m² of glass, a shallow triangle at one size, at the height the owner set |
| opening an agent | a side panel with a table | a full-screen window that leads with what happened, what it means, what happens next and what the owner can do, evidence on demand behind five disclosures |
| the conversation | none | a real composer that keeps what is typed and says plainly that nothing is sent, with the iPhone keyboard handled |
| session controls | none | five, declared, disabled, each carrying its reason; merge not offered at all |
| performance | one pixel ratio for every phone, no adaptation, no window or visibility handling | a ratio derived from the tier's pixel budget, a three-rung reduced-performance mode that gives up invisible work first, 15 fps under an open window, stopped when hidden |
| demonstration marking | a paragraph of orange and a band on every screen | one `Demo data` chip, on the owner's instruction |
| build identity | a provenance footer across the foot | the footer in the hidden menu, one discreet `V11 · stage 4 · <sha>` marker left in the open |

### Known limitations, carried forward and not solved

1. **The slab cluster's lower edge is in the top of all three portrait station
   close-ups** — a strip from the top of the frame down to 78 px on the
   Fabricator, 64 on the Prover and **142 on the Keeper** at 390 × 844. Reduced
   from 12/10/17 sample points in frame to 6/6/12 of 294, **not cured**:
   clearing it takes a tilt of 0.8 m on the Fabricator and 1.0 m on the Prover,
   and **no tilt clears it at all on the Keeper**, whose candidate slab reaches
   x = +0.07 while his camera stands at x ≈ +1.2. Moving the cluster is the only
   remedy and the owner has declined it. In landscape it is out of shot
   entirely — 0 of 294 points.
2. **11 px of clearance above the three consoles' screens** at 390 × 844 (12.3
   at 430 × 932). The owner chose it, from a photograph of his own phone, and it
   is bounded by his own first priority: no slab may stand over a console's
   picture.
3. **The CRT collapse nobody has ever seen in a frame.** V9 opened it; every
   pass since has looked and not found it. It is still open because it has never
   been reproduced, not because it has been fixed.
4. **The portrait hierarchy in which the verdict slab out-weighs Virgil.** The
   owner has seen it and approved it.
5. **In portrait, an open window carries no demonstration marking** (the
   Keeper's K11-03). Stage 3's `ILLUSTRATIVE · NOT REAL STATE` band justified
   itself by exactly this case, and the owner then instructed that it be
   removed; the `Demo data` chip is underneath the full-screen sheet, and the
   `has-window` rule that relocates it exists in landscape only. What remains on
   screen is the composer's *"Nothing is sent: there is no session behind this
   build"* and `Session controls — none is connected`. **The review's finding
   was that the stylesheet named this cost and the run record did not.** It does
   now. The substantive question — whether portrait should carry a marking — is
   the owner's, because the removal was his instruction and a session may not
   overrule authority layer 1.
6. **No level-of-detail system**, and the compressed-format options measured and
   not adopted (above). The artifact is 8.29 MB against a 6 MB mobile transfer
   budget, and the only measured route under it is Draco plus gzip, at about
   6.17 MB.
7. **27 MB of scratch output tracked in `HEAD`** from earlier passes (the
   Keeper's K11-05), to which this stage adds 4.0 MB of deliverable frames.
   Named, not slipped in; removing it from `HEAD` would not shrink the history
   and it is the owner's call.
8. **`verify:owner:v11` still contains fixed timeouts** (K11-04), reduced but
   not eliminated: the stage-4 checks poll conditions and count frames, and
   nine `timeout: 10_000` sites remain.

### What this stage does not claim

- **No visual-quality judgment has been made on real graphics hardware by
  anybody.** Every frame in this record was rendered in software by SwiftShader.
  OD-0005 defers the two graphics-hardware checks and requires them recorded as
  **not performed, never as met**, and they are.
- **Every iPhone check here is a simulated viewport in headless Chromium.**
  390 × 844, 430 × 932 and 844 × 390 are CSS pixel sizes given to a browser, not
  devices. **No real device has been used by this session and no real-device
  check has been performed.** `viewport-fit=cover`, `100dvh`, the four
  `env(safe-area-inset-*)` values, the Dynamic Island and the home indicator are
  written and exercised at zero inset, with a 59 px inset simulated and looked
  at. Whether the chrome sits correctly around a real Dynamic Island is **not
  performed**.
- **The onscreen keyboard is simulated** by substituting `visualViewport`.
  Whether a real iOS keyboard leaves the composer where this record says it does
  is **not performed**.
- **No screen reader has been run**; what is verified is the attributes, the
  labels and the focus order in the DOM. A real assistive-technology pass is
  **not performed**.
- **No performance figure for any device has been taken.** Every frame rate here
  describes SwiftShader on a CPU and is a direction, not a budget. The
  reduced-performance mode's step-down has **never been observed engaging on a
  real device**, and the finding that its first rung buys nothing measurable is
  a property of this container, not of a phone.
- **The KTX2 transcoded texture size was not measured**, because no encoder for
  it exists here and none may be installed. What is measured is the transcoder's
  own size against the whole texture payload, which settles the question in this
  document's constraint and is not dressed up as more.
- **There is no session behind this build and nothing here fakes one.**
- **A pass here is a builder's claim.** The deterministic checks are the
  evidence. The independent Keeper review covers `de3c7d8b2a` and **not this
  stage**; everything after that SHA is unreviewed.

---

## The decisions waiting on the owner

**Read this section first in the morning.** It is the whole of what V11 needs
from the owner and nobody else can settle. Each item says what the choice is,
what each way costs, and — where a session has one — a recommendation. **Nothing
here has been decided by a session, and writing an item down decides nothing.**
No code was changed to anticipate any of these answers.

It is written for someone who has not read the code. The finding identities in
brackets are the independent review's (`docs/process/V11_KEEPER_REVIEW.md`), for
anyone who wants the technical version.

### 1. On a phone, an open window carries no "this is a demonstration" marking [K11-03]

**The choice.** When you tap a character on a phone held upright, the record
that opens fills the whole screen and covers the small `Demo data` chip. While
that record is open, nothing on screen is labelled as a demonstration, and the
candidate, the checks and the agent it describes are all invented.

**How it got here, and this matters.** Stage 3 put a band across the top of that
record reading `ILLUSTRATIVE · NOT REAL STATE`, and justified it by exactly this
case. You then instructed: *"Remove all signs of Demo from the entire system
except one small spot… I know its a demo."* The band went. **This is your
instruction working as you gave it**, not a mistake, and no session may overrule
it — which is why the band has not come back and will not until you say so.

**What is still on screen while a record is open.** The composer's permanent
line — *"Kept on this page. Nothing is sent: there is no session behind this
build."* — and `Session controls — none is connected`. So the screen does say
there is no live session; what it does not say is that the content is invented.

**The ways out, and their costs.**

| | What it costs |
|---|---|
| **Leave it** | Anyone you hand the phone to, at the moment they are reading a record, sees fabricated content with nothing marking it. You know it is a demonstration; a stranger does not. |
| **Move the one chip instead of adding a second marking** | The `Demo data` chip follows the reader into the record's own header, so there is still exactly one marking in the whole product — the thing you asked for — and it is never off screen. Costs a little of the record's header and one small pass; the exact space it takes has not been measured, because nothing has been built. |
| **Bring the band back in portrait only** | The clearest, and the thing you explicitly rejected. Not recommended. |

**Recommendation:** the middle one — relocate the single existing chip rather
than add anything. It is the only option that keeps *"one small spot"* literally
true and still marks the screen a stranger is actually looking at. **Say the
word and it is a small pass. Nothing has been done in anticipation.**

### 2. Does V11 become the version you open by default?

**The choice.** V11 lives on the branch `claude/virgil-mobile-v11` and nothing
of it has been merged. The approved default is still V10, exactly as it was.
Merging is yours alone in every phase, and no session will do it.

**What you would be accepting.** The phone composition, the in-world screens,
the full-screen records, the composer and the performance work — none of which
any human has yet looked at on real graphics hardware or a real phone (item 3).

**Recommendation:** look at the artifact on your own phone first. There is no
deadline and nothing degrades by waiting.

### 3. The two graphics-hardware checks are still not performed, and only you can perform them

Not a decision so much as **the one thing no session can do for you**. Every
frame in this record was drawn in software by a CPU renderer with no GPU, at
about one and a half frames a second, on a simulated 390 × 844 rectangle that is
not an iPhone. `OD-0005` requires these recorded as *not performed*, never as
met, and they are.

So: the Dynamic Island, the real onscreen keyboard, real scrolling, real
sharpness, whether the thing is beautiful — **unknown**. Open
`docs/process/PHASE_1_owner-builds/v11/` and the newest `v11-*.html` from your
phone's own file system and look. Until you do, every aesthetic sentence in this
record is a builder's claim about a software rasteriser.

### 4. 27 MB of working scratch is tracked in the repository [K11-05]

**Already decided by you on 9 September** — *"leave them and stop the bleeding"*
— and honoured: `.gitignore` excludes `scratchpad/` and no pass has added to it
since, though stage 4 added 4.0 MB of deliverable frames under
`docs/process/PHASE_1_owner-builds/`, which is a different thing and is where
frames belong. Listed only so you know it is still there. Removing the files
from the current tree would not shrink the history and would cost a commit.
**Recommendation: leave it.** No action is proposed against your decision.

### 5. Whether to spend a megabyte of the download on a geometry codec

**The choice.** The V11 file is 8.29 MB; the mobile transfer budget in
`PERFORMANCE_STRATEGY.md` is 6 MB. Stage 4 measured every option with real
encoders rather than guessing (`pnpm measure:compression:v11`, and the table in
stage 4, item 1a):

| | What it would save | What it costs |
|---|---|---|
| **gzip**, which the browser already decodes | **1.32 MB** | nothing — 0 bytes of decoder |
| **Meshopt** | 1.02 MB | a 29 kB decoder; bit-exact, provably identical output |
| **Draco** | 1.93 MB | a 334 kB decoder, and a real risk of visual change |
| **Draco + gzip together** | 2.52 MB → about **6.17 MB** | the same, and still not under 6 MB |
| **KTX2** | **nothing** — it would *add* 34 kB at best | rejected on the measurement |

**Why it is yours and not a session's.** Every option changes the payload files
that **V10's own world** renders from, and V10 built from a clean tree has been
**8,528,318 bytes at every single stage of this branch**. That number is the
preservation contract's strongest evidence, and moving it by a megabyte is a
thing you should do knowingly.

**Recommendation:** gzip first, in its own pass with its own review — it is free
in decoder bytes and the largest saving per unit of risk. Not KTX2, ever, in a
single-file document.

### 6. The slab strip across the top of the portrait close-ups

When you tap a character on a phone, the bottom edge of Virgil's screen cluster
is still in the top of the frame — 78 px on the Fabricator, 64 on the Prover,
**142 on the Keeper**. It was reduced, not cured. The only remedy is moving the
cluster, **and you declined that**. Listed so the record does not quietly carry
it as solved. **Recommendation: none — it is your composition.** If you change
your mind, moving the cluster is a small pass.

### 7. What happens after V11

Your overnight instruction was *"Review after stage 4 and fix and that's it"*,
so the three queued items below were **not started**
(`docs/process/OVERNIGHT_PLAN_2026-09-09.md`):

- **The dropped transcript** — you drag one of your own Claude Code session
  files onto the page and read your real work in Virgil's interface. Read-only,
  nothing uploaded. This is the step that answers whether you would actually use
  this. **Ready to start under an ordinary grant.**
- **A real state snapshot baked at build time** — the world stops playing a
  script and reports this repository's actual state. **This is Phase 2 work and
  Phase 2 is not authorised**, so it needs your word, not just your go-ahead.
- **The Mind of Virgil** — a Phase 1 item never started. Ready when you want it.

**Recommendation:** the dropped transcript next. It is the only one that tells
you whether the product is worth continuing.

### 8. Sound

Out of the Phase 1 slice by your own decision (`OD-0007`, and
`PHASE_1_BRIEF.md`, "Owner decisions required before start", item 3): optional
sound motifs return *after it works well*. Nothing waits on you unless you want
them sooner.
