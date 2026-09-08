# How to look — Phase 1, viewing point V5: the Prover in his station, the screens as objects, receiving and working, and stillness

**Your notes on V4, verbatim, and what each became:**

- *"the prover is standing behind the console. he isnt sitting in the middle inside the console."* — He now stands in the centre of his station, on its floor, as Virgil stands in his console's well. Measured, not eyeballed (below).
- *"they have a stand coming out the botom but it doesnt touch anything. take away the stand."* — Gone. The panels float.
- *"make the computers curved corners and give them some depth"* — Each screen is now a slab: rounded corners, real thickness, a bevelled edge, the display set back inside a bezel.
- *"the text looks a bit basic, can it look quite sleek and stylised?"* — Two typefaces now, bundled into the file: one for headlines and one for data.
- *"when the prover receives the information, i want the screen to have some soert of animation and saying receiivng as well ... more developed. right now it looks basic and a bit ugly."* — A receiving beat of its own, with the hand-off visibly arriving on his panel, and a working state rebuilt from scratch.
- *"virgil is moving too much... When virgil is watiing I want him to move but only breathing etc, same as the prover."* — He no longer plays a sway clip while waiting. He breathes. The clips are kept for the moments something happens.

**Not touched, because you approved them:** the room, the floor, the lighting, the window, the porthole, the camera, Virgil's console and where it stands, the orrery, the faces and eyes.

Same kind of thing as before: one file, download it, double-click it. It is a little larger than V4 (about 15.3 MB; the two typefaces are 41 KB of that), so the dark screen before the room appears lasts the same few seconds.

> **What this viewing point asks:** does the Prover now belong in his station; do the screens read as instruments rather than labels; does the hand-off *arrive*, and is the working state worth watching; and is Virgil now still enough when he is waiting, and alive enough when he is not?

---

## Click by click

### 1. Find the file

```
https://github.com/dniachini-droid/Virgil-mission-control/blob/claude/virgil-phase-1-slice/docs/process/PHASE_1_owner-builds/virgil-s2-v5-868971a375.html
```

### 2. Download it

Click **Download** (the arrow into a tray, top right). It lands in Downloads as `virgil-s2-v5-868971a375.html`. If you see raw text instead, `Ctrl+S` / `Cmd+S` and save with that name ending in `.html`.

### 3. Open it

Double-click. Chrome, Edge, Firefox, or Safari 14 or later. The room appears after a few seconds.

### 4. Look

- **Drag** to look around; **scroll** to move closer. Drag right to the Prover: he is inside his station now, its desks either side of him, his panel floating beside him at head height.
- **Demo On / Off**, top left, as before. It opens **On**, with the amber box saying in full that what you are watching is a **scripted demonstration driven by no real events**. The twenty-second loop now has one more beat: rest (Virgil breathing, nothing else), the turn toward the Prover, the hand-off, **receiving** — watch the Prover's panel and the light over him — then **working**, then the verdict: **PASS on one loop, BLOCKED on the next**. Virgil nods on a PASS and does his dumbfounded turn on a BLOCKED, then goes back to breathing.
- Scroll in close to the Prover's panel during receiving and working. Those two are the ones you called ugly, and they were redrawn for close range as well as from across the room.
- Every screen still carries the solid amber band along its foot reading **ILLUSTRATIVE · NOT REAL STATE**. It is set in the new headline face and letter-spaced; it is meant to look like part of the instrument, and it is still the one thing on the screens that is not decoration.

### 5. Tell us what you think

Is the Prover placed right, and is his panel where you would want it? Do the slabs read as objects in the room? Is the type sleek enough, and is anything now too small to read from where the room opens? Does receiving read as an arrival, and does working hold your eye? Is Virgil's stillness right, and are his reactions the right size?

---

## What changed, and why

### The Prover stands in the middle of his station — measured first

Before moving him, the station model was measured the way Virgil's console was in V3 (the ring's well floor at 0.384 m): every vertex of the model, at the size it stands in the room, sorted by distance from the station's centre, and rays cast straight down through it.

What the measurement found: **the station has a clear centre.** A raised deck at **0.108 m**, flat to within four millimetres over the middle sixty centimetres and the whole depth of the station, on a base plate at 0.010 m; desks rising to 0.44–0.60 m in a **U** behind and to both sides; the front open. The same shape as the console's well, one size down. So the owner's arrangement works with the model as it is, and he was put on the deck at its centre — a little forward of the middle, facing the camera as Virgil does — with nothing to cut through.

Then the model was checked against him: his whole surface and the station's whole surface, cut into 15 mm cells, at rest and at every extreme of his breathing (highest rise, most sway, most turn, and all their combinations), share **no cell above the deck**. His feet sit on the deck at 0.109 m; the nearest desk edge is 196 mm from his nearest point. That check is now a test (`apps/mission-control/test/prover-station.test.ts`) that runs with every `pnpm check`: it re-measures the deck from the model file and fails if the numbers in the layout ever drift from it, or if he ever touches the station.

### The stands are gone

They hung from the panels and touched nothing. Deleted.

### The screens are slabs

Each panel was a flat picture with a thin frame drawn behind it. Now each is built as an object: a rounded-rectangle frame 5 cm deep with a small bevel along its edges, a back plate, and the display recessed 12 mm inside the bezel, so the inside edge of the frame is visible around it. The frame is dark slate, chosen so that the room's warm light catches one edge and the window's cool light the other; nothing on it is teal or magenta, which in this room are only ever light. The panels are where they were.

### Two typefaces, bundled — and why that is allowed

The screens were set in whatever monospace the machine happened to have. One face doing every job — titles, headlines, states, hashes — is what made them read as a terminal rather than an instrument. Now there are two, and no more:

- **Tektur** (display) for titles, headlines and the honesty band — capitals, letter-spaced.
- **Geist Mono** (data) for states, counts, check names and the walking hash.

The decision that governs labels, `ADR-0010`, forbids *fetching* a font — its stated problem is that the library it rejected "fetches a default font from the network" — and its Consequences line reads: **"Revisit with bundled SDF fonts in Phase 1 if label density grows."** So this is the revisit that decision anticipated, done inside it rather than against it. Nothing is fetched: each face is cut down to only the characters the screens draw (65 of Tektur's 1,129 glyphs; 94 of Geist Mono's 846), carried inside the file like every model, and registered from memory when the room opens. The verifier still counts **one request — the document itself — and none off it.** The two subsets add **41,580 bytes** of text to the file (14,796 and 16,388 bytes of font, encoded); with the new drawing code the file is 53,883 bytes larger than V4.

Both faces are under the **SIL Open Font License 1.1**, and this is the first asset in the project whose licence is honestly recorded as **verified** rather than stated or attested: the licence text was read in full — permission is granted free of charge to use, embed, modify and redistribute, on condition that the copyright notice and licence travel with every copy, and neither face reserves its name — and copied byte for byte into `assets/licenses/` (`TEKTUR-OFL.txt`, `GEISTMONO-OFL.txt`), with the unmodified font files under `assets/fonts/` and a register row each in `assets/licenses/ASSET_PROVENANCE.md` that records the subsetting as a modification. Free, per the project's rule against paid assets. A test (`test/screen-fonts.test.ts`) checks the bundled subsets byte for byte against what the cutter recorded, checks their internal checksums, checks that every kept character has an outline, and checks that the loader never uses a URL.

### Receiving, and a working state rebuilt

The station's panel now has its own states, and a light over the Prover's head follows them:

- **Receiving.** When the hand-off lands, eight packets travel in along a channel from the left of the panel and each one seals a segment of a manifest on the right, with a flash on the frame as it lands; the word RECEIVING resolves out of scrambled hex, one letter at a time, as they arrive; the light over him flickers with each landing. Three seconds, then the manifest reads SEALED.
- **Working.** Five checks — LINT, TYPES, TESTS, SCHEMA, TETHER, which are *kinds* of check this repository runs and not any run of them — each with a bar that advances in eight quantised steps to a beat, one after another, ending in a tick; a pulse line along the top keeps the same beat; a count (3/5) in the headline face; the light over him beats in time, amber. Then "run complete · reporting" until the verdict comes back.
- **Reported.** The verdict, large, in its colour, with the run's marks under it — all ticks on a PASS; on a BLOCKED the last carries a cross, which is a fixed choice of the script and a finding of nothing.

His face already had a working expression (half-lidded, the scanning bar); it is unchanged, and it now sits inside a station whose light and panel are doing the same thing.

Every number in all of this is a fixed number from the timeline. Nothing is looked up, nothing is measured, and each panel says so on its foot.

### Virgil is still when he is waiting

Your diagnosis was right, and it was measured: the clip he idled on, `Happy_Sway_Standing`, moves his hips up to **20 cm** and turns his head up to **36°** through its ten seconds. That is a person shifting their weight, not a robot waiting. It is no longer played at all.

At rest he holds a standing pose and **breathes**: a rise of up to 1.5 cm, a sway of ±0.6° and a turn of ±1.1°, at three rates that never share a period, so it never visibly loops. The sway is smaller than the 1.5° first considered because it pivots at his feet, and at 1.5° a foot's edge would dip through the floor. The Prover breathes the same way, out of phase with him. Both are still with reduced motion.

The clips are kept for the moments something happens, blended in from rest and back over half a second: the dumbfounded turn when he addresses the Prover, `Agree_Gesture` for the hand-off, and reactions to the verdict — the turn again on a BLOCKED, and on a PASS a **nod**. The nod is not a clip: the start of `Agree_Gesture` was tried for it and measured as a 16 cm shift of his body with the head turned 22–26°, so it was replaced by two small dips of the head itself, 9° each, applied on top of whatever else he is doing; his face rides along. When a rigged Prover arrives he plugs into the same seam: one word for what he is doing (`rest`, `receiving`, `working`, `reported`), mapped to clips the way Virgil's poses are.

## What the screenshots showed

Close-ups were taken of the station's panel held in each of its states, at several moments of the receiving and working beats, of the Prover from the front, of Virgil's face on a PASS, and of the opening view at three moments of the demonstration. What they showed, including what is not right:

- **The Prover is inside his station.** From the opening view and from his own close-up he stands on the deck at its centre with the desks either side of him and the open side toward the camera; no desk passes through him, which the test also holds. His feet are on the deck, not in it.
- **The panels are objects.** Seen from the side (the orbit views) the three console screens and the station's panel show their thickness and the lighter lip of the bezel; the display sits visibly inside the frame. The stands are gone and nothing hangs beneath any panel.
- **The type reads as instrumentation.** From the opening view the titles, the headline words (PROVER, HAND-OFF, VERDICT, PASS) and the amber bands are readable; the mono state words on the ROLES panel are not meant to be from there and resolve on approach, as in V4. Both faces were confirmed registered on every page captured (`document.fonts.check` true for Tektur and for Geist Mono); no page produced a console error.
- **Receiving reads as an arrival at close range.** In the first frames a packet is mid-flight along the channel with its trail and its hex tag, the manifest is filling segment by segment, the chunks list as they land, and the state word is partly hex; by the end the manifest reads SEALED in green and "hand-off landed". From the opening view what carries is the state word resolving out of hex, the manifest filling, and the light over him flickering — the packets themselves are a few pixels from there.
- **Working reads as a run.** The pulse line with its spikes to the beat, the five bars advancing in steps, the ticks arriving one by one, the count going to 5/5, "run complete · reporting" — with his half-lidded amber face and the amber light on him in the same frame. It holds the eye better than V4's row of pips, which is the claim you are being asked to judge, not a measurement.
- **The verdict on the station:** PASS in green with five ticks; BLOCKED in red with the cross on TETHER, the red face and the red light on him.
- **Two things that are not right, honestly.** From straight in front of the Prover at two metres, his halo and the eye-stalk on that side cover the right third of his panel — the count and the ticks. The panel was raised above his shoulder line and moved beside him for this, which cleared it from the opening view and from its own close-up, but not from dead ahead; he stands in the middle of the station, and a panel beside him is beside him. If you want it clear from the front, the honest options are to put it on his other side (which from the opening view is at the frame's edge) or on the station's back desk behind his head, and neither was chosen for you. And the nod could not be confirmed from stills: the frames of Virgil's face on a PASS show the passed face with the head level, before or after the dip. That the head joint pitches forward on the axis used was measured in the model, not seen in a screenshot.
- **A timing note about the captures, not the file.** On this software renderer the room's clock runs a second or two ahead of the moment the capture harness calls the room ready, so a frame taken "0.5 s" into receiving is really a second or more in. The sequence itself — rest, turn, hand-off, receiving, working, verdict — was seen in order across the opening frames.

- The machines that produce these screenshots draw in software and show glow and colour differently from a real screen; the screenshots were for catching gross errors — a figure through a desk, a panel through a head, a word cut off — and for judging the two new states at close range.

## Not in this viewing point

A rigged Prover, a refusal clip, spawn-in and spawn-out, new characters, set dressing, more side stations, sound, any change to the room, lighting, camera, console placement, window or faces. The stylised Virgil you generated is not in it either, at your instruction ("dont add it in yet").

## What looking at it proves, and what it does not

**It proves** the file opens; that the Prover stands on his station's measured floor and touches none of it at any point of his breathing, held by a test; that the screens are set in two bundled faces with nothing fetched; that the new states run; and that the headlines and honesty bands are readable from the opening view on one 1440-pixel software-rendered frame.

**It does not prove** anything about speed, and nothing about how it looks was checked on real graphics hardware by anybody. `OD-0005` set aside the two checks that need that hardware and requires them written down as **not performed**, never as met; this file changes nothing about that, and its footer says so. Your look is the first real judgement of any of it, and it is one machine and one look, not a measurement.

## The honest size

The file is **15,330,856 bytes** (14.62 MiB; 15.33 MB at a million bytes each) — 53,883 bytes more than V4. Against the project's budget of "12 MB desktop, 6 MB mobile" it is **over both, on both readings**, as V4 was; nothing was cut for the number, and V4's finding stands that the weight is the console's geometry, not anything added since. Nobody has said this budget is binding on this file; if it is, say so and the choice is yours.

SHA-256 of the file:

```
883ddfa4c3af42cbf44896265628252ba30d4abe67ba03d01b506bed3b0a5ee5
```

Built from source commit `868971a375e4a6953eb839af7fe267efb74c0fe6` with `VIRGIL_OWNER_BUILD_DATE="2026-09-08 02:05 UTC"`, and rebuilt byte for byte from a clean tree with `VIRGIL_OWNER_SHA=868971a375e4a6953eb839af7fe267efb74c0fe6` set to the same value; the second build's SHA-256 matched the first. Checks run on that source, all with `TURBO_FORCE=true`: `pnpm check` (lint, typecheck, and 269 tests across the workspace, 34 of them in the application, 16 of those new; the six visor tests among them, unchanged), the Mind Scan (`knowledge-lint`: no findings), `build:owner`, `verify:owner` (opens from `file://`, one request and it is the document, no console errors), and `sha256sum -c` against the committed digest.
