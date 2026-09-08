# How to look — Phase 1, viewing point V4: the faces, the eyes, and the screens

**Your verdict on V3, verbatim:** *"looks good. needs work, but its decent, better than i expected. the eyes for both characters needs work. and the screens do but its a great start."*

So V4 is the faces and the screens, and nothing else. The room, the lighting, the camera, the console and its placement, the window, the orrery, Virgil's body and movement, the Prover at his station — all exactly as you saw them in V3 and approved. Nothing was added to the room and nothing was moved in it.

Same kind of thing as before: one file, download it, double-click it. It is the same size as V3 (about 15 MB), so the dark screen before the room appears lasts the same few seconds.

> **What this viewing point asks:** do the two faces now read as faces — sitting *on* the heads rather than in front of them, and changing expression with state in a way you can read from across the room — and can you read the screens?

---

## Click by click

### 1. Find the file

```
https://github.com/dniachini-droid/Virgil-mission-control/blob/claude/virgil-phase-1-slice/docs/process/PHASE_1_owner-builds/virgil-s2-v4-ca34062bcc.html
```

### 2. Download it

Click **Download** (the arrow into a tray, top right). It lands in Downloads as `virgil-s2-v4-ca34062bcc.html`. If you see raw text instead, `Ctrl+S` / `Cmd+S` and save with that name ending in `.html`.

### 3. Open it

Double-click. Chrome, Edge, Firefox, or Safari 14 or later. The room appears after a few seconds; Virgil starts moving as soon as it does.

### 4. Look

- **Drag** to look around; **scroll** to move closer. Scroll all the way in and look at his face; then drag right and look at the Prover's.
- **Demo On / Off**, top left, as before. It opens **On**, with the amber box saying in full that what you are watching is a **scripted demonstration driven by no real events**. The twenty-second loop is unchanged: survey, turn, hand-off, the Prover works, a verdict — **PASS on one loop, BLOCKED on the next** — and reset. Watch the faces through one full loop of each.
- Every screen now carries a solid amber band along its foot reading **ILLUSTRATIVE · NOT REAL STATE**. That band is meant to be readable from anywhere in the room, and it is the one thing on the screens that is not decoration.

### 5. Tell us what you think

Do the eyes read? Does each state — resting, attentive, working, passed, blocked — look like what it is, without the screens telling you? Does the Prover's visor now belong to his head? Can you read the screens from where the room opens, and what would you want on them?

---

## What changed, and why

### The faces sit on the heads now

V3's faces were flat-ish plates placed by hand and fitted by looking at screenshots. On the Prover that gave you a rectangle floating in front of a sphere — the defect V3's own report named — and on Virgil it gave a plate curved more than his face is, whose edges sat inside his head.

V4 does not place the faces by hand at all. Each visor is **built from the head's own geometry**: a fine grid is laid over the visor's area, every point of the grid is projected straight onto the head's surface as it actually is in your model, and the panel is lifted three or four millimetres off what it hits. So Virgil, whose face front measures as a flat plate, gets a flat panel that ends where his plate ends (there is a groove along the top of it, and the panel stops short of that). The Prover, whose head measures as a sphere 44 cm across, gets a curved cap that wraps it — and its outline is a rounded visor shape, cut from the drawing, so the dome shows through at the corners instead of a rectangle's corners floating off it. His visor also now moves *with* him: in V3 it was fixed to the room while his head rose and fell 1.5 cm beneath it.

The only numbers a person chose are the visor's outline — how wide, how tall, how rounded — and those were read off the measured surface, not off a screenshot.

### The eyes

Larger, with a lit centre so they read as lamps rather than stickers, and a different form for each state:

- **Resting** (teal): two rounded eyes and a small smile.
- **Attentive** (ice-white): taller eyes, no mouth.
- **Working** (amber): half-lidded eyes and a small bar sweeping beneath them.
- **Passed** (green): eyes closed in two arches, and a grin.
- **Blocked** (red): narrow slanted eyes under heavy brows, a flat mouth, and no blinking at all — it stares.

Blinks close fast and open slower, happen at a different rhythm in each state (quick when attentive, rare when working), come in occasional doubles and half-blinks, and there is one blink at every change of state, so the face registers the change. The state's colour also washes up the glass from below and lights a rim along its bottom edge, so even when the eyes are a few pixels the colour reads; and each face's own light onto its chest is a little stronger than in V3.

### A test that holds it

V3 found, late, that **both faces had been silently invisible** for most of its build — the panels were being culled, and the close-ups that seemed to show a fitted face were showing the painted face underneath. That defect hid itself once. There is now a test (`apps/mission-control/test/visor.test.ts`) that builds both visors from the same model files, the same fit and the same numbers as the room, and fails if a visor's material stops being double-sided, if any part of a panel leaves its head, if any part of the head stands in front of a panel, or if a panel floats more than 15 mm off the head. It runs in every `pnpm check`.

### The screens

You said they need work without saying how, so this is a judgement: **legibility first.** From where the room opens, each of the three panels is about two hundred pixels wide on a 1440-pixel screen, and in V3 nothing on them but the titles could be read from there. Now each panel carries **one headline sized to read from the opening view** — the active role, the verdict, the phase — a few secondary lines that become readable as you scroll closer, and the amber honesty band. The drawing behind each panel is twice the resolution it was, so the headline stays crisp when you are close. The panels themselves — their size, their positions, their frames — are as they were.

Everything on them is still illustrative and still says so. Nothing is looked up; the abbreviated commit walks through digits on a timer; the role states cycle on a timer. The demonstration stays a demonstration.

### Size: tried, and not done

The file is over the project's budget (below), and the console is the biggest thing in it. Its textures were reduced by half as an experiment — that saves 385,743 bytes, 2.5 % of the file — and the result was compared at the closest view you can scroll to. **It was visibly softer** there: the small key-caps and the metal relief on the rim lose their definition. The instruction was to cut only what costs nothing visible, so it was put back. The honest finding is that the console's textures are not where its weight is: of the 4.77 MB it occupies in the file, 0.54 MB is texture and 4.23 MB is geometry (148,615 vertices). A real saving would come from repacking that geometry without loss, which is a change to the asset pipeline and not part of this pass; it is noted for you rather than done.

## What the screenshots showed

Close-ups were taken of both faces held in each of the five states, plus the opening view. What they showed, including what is not right:

- **The Prover's visor is a cap on his dome.** Curved with the sphere, rounded at the corners, the dome visible above and beside it. In the blocked state his whole chest lights red under it. The rectangle is gone.
- **Virgil's visor fills his bezel** and stops at its edge. All five states read at close range; passed and blocked read from the opening view by colour alone.
- **The screens:** from the opening view the role names, the headline words and the amber bands are readable; the smaller state words on the ROLES panel are not, and are not meant to be from there — they resolve as you scroll in.
- **Still true, as in V3:** the middle (REVIEW) panel is behind Virgil's head from the opening view and from his close-up, so its verdict headline is usually hidden by him. That is the composition you approved — face, then screens, then window — and it was not changed here; if you want the verdict visible past him, say so.
- **The working face's eyes read small** in the first set of close-ups and were enlarged before the final build; in the final build's close-ups both working faces show half-lidded amber eyes with the scanning bar visible beneath them.
- Which frames came from which build, exactly: from the committed file — the opening view at three moments, both faces during the demonstration, Virgil resting and attentive, both faces working, and the opening view held in passed and in blocked. The remaining state close-ups (Virgil passed and blocked; the Prover resting, attentive, passed and blocked) were taken on the build immediately before, whose only difference from the committed one is the working face's eye size; the full set on the committed file was not completed, because a second render was started beside it and the first timed out.
- The machines that produce these screenshots draw in software and show glow and colour differently from a real screen; the screenshots were for catching gross errors — a face floating off a head, a panel through a skull — and none was found.

## Not in this viewing point

Spawn-in and spawn-out, new characters, set dressing, more side stations, a refusal clip, any change to the room, lighting, camera, console placement or window. All of that you approved as it stands, and it stands.

## What looking at it proves, and what it does not

**It proves** the file opens; that both faces are built from the heads' own geometry and are held to them by a test; that the states are distinguishable; and that the screens' headlines and honesty bands are readable from the opening view on one 1440-pixel software-rendered frame.

**It does not prove** anything about speed, and nothing about how it looks was checked on real graphics hardware by anybody. `OD-0005` set aside the two checks that need that hardware and requires them written down as **not performed**, never as met; this file changes nothing about that. Your look is the first real judgement of any of it, and it is one machine and one look, not a measurement.

## The honest size

The file is **15,276,973 bytes** (14.57 MiB; 15.28 MB at a million bytes each) — 6,758 bytes more than V3. Against the project's budget of "12 MB desktop, 6 MB mobile" it is **over both, on both readings**: over desktop by 2.57 MiB / 3.28 MB, over mobile by 8.57 MiB / 9.28 MB. Nothing was cut for the number (see above), and nobody has said this budget is binding on this file; if it is, say so and the choice is yours.

SHA-256 of the file:

```
8e16debf4cf1e72810bca500aa5933225abe2e71cbd2efd78f2e169072a51193
```

Built from source commit `ca34062bcc8f21514eac23a38cbdff5e2b5cba41` with `VIRGIL_OWNER_BUILD_DATE="2026-09-07 15:30 UTC"`, and rebuilt byte for byte from a clean tree with `VIRGIL_OWNER_SHA=ca34062bcc8f21514eac23a38cbdff5e2b5cba41` set to the same value; the second build's SHA-256 matched the first. Checks run on that source, all with `TURBO_FORCE=true`: `pnpm check` (lint, typecheck, and 253 tests across the workspace, 18 of them in the application, six of those new), the Mind Scan (`knowledge-lint`: no findings), `build:owner`, `verify:owner` (opens from `file://`, one request and it is the document, no console errors), and `sha256sum -c` against the committed digest.
