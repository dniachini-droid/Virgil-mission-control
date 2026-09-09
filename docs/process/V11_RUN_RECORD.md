# V11 run record

Branch `claude/virgil-mobile-v11`, from `c2f9651`. The brief is
`docs/process/V11_BRIEF.md`; this file records what each stage of it actually did, what was measured,
what is simulated and what was not performed. One section per stage, written when that stage's
artifact exists.

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

- **`sha256sum -c *.sha256` in `docs/process/PHASE_1_owner-builds/`: all 14 committed artifacts OK**,
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
| `build:owner:v11` from a clean tree | see the artifact below |
| `sha256sum -c *.sha256` | 14 committed artifacts, all `OK` |
| `pnpm reproduce:owner` | `identical — rebuilt from 4ae03314d93ed6e26982f3691034974ff5b3887b`; `PASS` |
| `pnpm reproduce:owner:v11` | see the artifact below |

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
- **A pass here is a builder's claim.** The deterministic checks are the evidence; independent review
  has not happened.
- Stages 2, 3 and 4 of the brief are not started. The screens, the windows, the twelve review states
  and the KTX2/Draco/Meshopt assessment the brief's second caution requires are all still ahead.
