# How to look — Phase 1, viewing point V6: the stylised set, in the room and on a tabletop, with the refusal

**This is the largest single pass in the project.** Your new cast — Virgil, the Fabricator, the Prover and the Keeper in the cartoony style you generated — and every prop replace the ornate set. Virgil is rigged and for the first time has a **refusal**: on a BLOCKED verdict he stomps. The set is shown two ways in the same file, with one key to switch, so you compare rather than remember: **the room** you approved from V1 to V5, and **a tabletop** — a disc floating in your nebula with the porthole standing free as an arch behind it.

Everything you agreed in the owner console for this pass is written down in `docs/process/PHASE_1_STYLISED_SPEC.md` as direction, and this document reports what was built against it. Where the brief turned out to be wrong, it says so.

Same kind of thing as before: one file, download it, double-click it. It is **smaller** than V5 — 9.8 MB against 15.3 — so the dark screen before the set appears is shorter.

> **What this viewing point asks:** does the stylised cast read as *yours*; does the tabletop or the room present them better; do the screens now read as a console from an animated film rather than a real instrument; and is the stomp the refusal you meant?

---

## Click by click

### 1. Find the file

```
https://github.com/dniachini-droid/Virgil-mission-control/blob/claude/virgil-phase-1-slice/docs/process/PHASE_1_owner-builds/virgil-s2-v6-5b4b52fb8b.html
```

### 2. Download it

Click **Download** (the arrow into a tray, top right). It lands in Downloads as `virgil-s2-v6-5b4b52fb8b.html`. If you see raw text instead, `Ctrl+S` / `Cmd+S` and save with that name ending in `.html`.

### 3. Open it

Double-click. Chrome, Edge, Firefox, or Safari 14 or later. The room appears after a few seconds.

### 4. Look

- **It opens on the room.** Virgil stands on his new console's deck at the centre; the Fabricator at his workbench on the left, the Prover at his rig on the right behind, the Keeper at his lectern on the right in front. Each has their own station now, as you directed after generating three of them; the earlier "one generic station" direction is superseded and the spec says so.
- **Press `V`**, or click **Tabletop** at the top left. The walls go; the set stands on a disc with a navy-and-gold edge, the porthole becomes an arch at the back, your nebula wraps round everything with crisp stars over it and a little grain, and the camera sits at 30° on an arc of about 120° — you cannot orbit round to the back. Press `V` again to come back. **Please look at both before you say which.**
- **Click any character**, or press `1` (Virgil), `2` (Fabricator), `3` (Prover), `4` (Keeper): the camera drops to near their eye level with their panel beside them. `Esc` or `0` comes back. **Look at** buttons do the same.
- **Demo On / Off**, top left, as before. It opens **On**, with the amber box saying in full that what you are watching is a **scripted demonstration driven by no real events**. The loop is thirty seconds now and has three hops: Virgil hands off to the Fabricator, who builds and reports **COMPLETE** — a claim, shown in ice, never a verdict; Virgil hands off to the Prover, who verifies and returns **PASS on one loop, BLOCKED on the next**; on a PASS the Keeper reviews and returns his own PASS and Virgil nods; **on a BLOCKED, Virgil stomps.** That is `Angry_Ground_Stomp`, your clip, wired to the one state this whole system exists to make legible.
- Every screen carries the thick amber stripe along its foot reading **ILLUSTRATIVE · NOT REAL STATE**. It is bolder than before on purpose: in this style a heavy stripe with four heavy words belongs, so honesty and style agree here rather than compete.

### 5. Tell us what you think

Room or tabletop? Is the cast yours? Are the screens an animated film's console now? Is the stomp the refusal? Which of the two unidentified characters is which — the file assigned as the Prover and the file assigned as the Keeper can be swapped in one line, and they are provisional until you say.

---

## What changed, and why

### Your nine files, imported unmodified, and one identification

All nine models are in `assets/models/candidates/` byte for byte as they reached the session, each with its provenance row written before the file was committed and every digest re-measured; the register is `assets/licenses/ASSET_PROVENANCE.md`. Two figures the console gave for the Prover's file did not match the file — its texture is 4096 × 4096, not 6562 × 6547, and its roughness is 0.5, not 0.8 — and the measurement is what is recorded.

You identified one character: *"the fatteest one is the fabricator."* The other two you said do not matter and can be swapped later. So `char-A` (the widest) is the Fabricator, filed under the project's name for the role with your word "builder" recorded as the alias; `char-C`, whose own upload name says "prover", is filed as the Prover; `char-B` as the Keeper by elimination. **The last two are provisional and their register rows say so.** The binding is data: the two `model:` lines marked in `apps/mission-control/src/world/room/cast.ts` (the Prover's and the Keeper's); exchanging their values swaps them, and the two files would then be renamed and their rows rewritten.

### Sizes chosen, and why

Every one of your files is normalised to a two-unit box, so every size is a decision, read against a 1.8 m Virgil as before:

| Model | Size | Why |
|---|---|---|
| Virgil (rigged) | 1.8 m | The height you approved in V2. The rigged file is exported at 3.0 units, exactly 1.5× the static one; scaled by 0.6, feet at the origin |
| Virgil's console | 3.4 m across | Measured: a low oval ring with a raised deck at its centre and an open front. At 3.4 m the deck is at 0.17 m, the back rim tops at 0.87 m, and its well clears his 1.24 m silhouette; the rim meets him at the waist as the ring console did |
| Fabricator, Prover, Keeper | 1.7 m | Clearly shorter than Virgil without reading as a different species; the widest reads heavy and the slimmest tall at the same height |
| Fabricator's station | 2.2 m across | A workbench with a crane arm; 1.53 m tall, so its screen shows beside him rather than over his head |
| Prover's station | 2.2 m deep | Deeper than wide; the same footprint as the Fabricator's so the three read as a set; screen top at his eye line |
| Keeper's station | 2.0 m tall | A sloped desk with a column and screen behind it; the desk at 1.0 m, waist to chest on him; 1.64 m across |
| The porthole | 11 m in the wall; 5.6 m as the arch | Unchanged in the room. On the tabletop it stands at 5.6 m so it is a skyline for a 13 m disc rather than a wall |

Each character stands on the floor at the front-left corner of their station, 20 cm clear of its front edge, turned toward the camera, with the station's own screen beside their head and their panel on their other side. The standing point is derived from the two models' measured fronts, not set by hand, and a test holds every figure clear of their station — and Virgil clear of his console above its deck — at every extreme of their breathing (`test/cast-clearance.test.ts`).

### The refusal, and how Virgil moves

Three clips ship: `Idle_11` held at its first frame under procedural breathing (your V5 direction that he only breathes while waiting stands), `Agree_Gesture` for the hand-off, and **`Angry_Ground_Stomp` for BLOCKED**. `Running`, `Walking` and the bind pose do not ship, as you said. The V5 "dumbfounded turn" is gone with its clip. The nod on a PASS is as before: two small dips of the head joint, not a clip.

### The faces

Every one of your four heads was made with a black plate or dome where a face goes — Virgil's a rounded screen filling most of his head, the Fabricator's a rectangular screen, the Prover's an astronaut dome, the Keeper's the dark opening of his hood — so the V4 method transfers: a panel fitted to the head's own front triangles, its outline cut from the canvas, eyes and mouth drawn on it live. The specs were read off ray scans of each model and are held to the geometry by `test/visor.test.ts`, which fails if a panel leaves its head, floats off it, or lets the head poke through.

**The 15 mm bound, and what tripped it.** The console predicted Virgil's head might trip the test's 15 mm floating bound (V5's worst was 13 mm). It did not: the worst gaps measured are Fabricator 9.6 mm, Prover 8.0 mm, Keeper 12.0 mm, and Virgil 5.1 mm at scale (8.6 in his joint's units, where the bound is effectively 9 mm). **The Prover's did trip it once**, when the panel was widened to fill his visor: its top row at 1.32 m was lifted 16.5 mm over the helmet's brim ridge, which stands proud of the dark visor from about 1.30 m up. That is the helmet's fact, not the bound's; the panel's top was lowered to 1.295 m, under the ridge, and the bound is unchanged.

**Reduced motion (a review finding, KR-55).** V5's document said "both are still with reduced motion" and did not disclose that with reduced motion it removed both faces and their lights entirely, leaving Virgil's baked grin and the Prover's blank dome — and losing the blocked-versus-passed distinction the animation document forbids losing. V6 draws a **static face** instead: eyes open, no blink, no pulse, the state's form and colour, redrawn only when the state changes. The decision is a pure function and is tested; the V5 document carries a dated correction.

### The three characters stay unrigged

By your note. They breathe, out of step with each other and quicker while working, and their faces and the light over them carry their state. One consequence accepted: **the hand-off is one-sided** — Virgil gestures; the receiver answers with face, light and stillness. The seam for a rig is one component (`Figure.tsx`).

### The tabletop

A disc 13.2 m across, 0.42 m thick, with a navy band and a gold line at its edge so it reads as an object; no walls, no ceiling, no window aperture. The porthole stands free at the back. Your nebula wraps a tall cylinder round the whole set, mirrored at its seams so no edge can show, with 2,600 procedural star points over it and a fine grain over the frame — the nebula reached us at 1672 × 941 and no original exists, so its clouds are soft, and it is stars going mushy that reads as bad, not soft clouds. The planet and the station hang as separate layers in front of it and slide against it as you orbit. The camera is at 30° and the orbit is limited to 120° of arc and ±12.6° of elevation, which is also what stops you finding the back of the set undressed.

**Something the brief did not anticipate and the first capture showed:** a camera looking down at 30° sees the sky *below* the horizon. The first backdrop was a plane centred above the horizon and its bottom edge cut straight across the frame; that is why the nebula is now a cylinder and the planet and station sit below the horizon, where the camera actually looks.

### Style

Matte throughout: every V6 model declares metallic 0, and the loader applies the factors the files declare. **The mirror floor is gone** — a contact shadow under the cast replaces it — and the floor's inlaid star, previously lost competing with the reflection, is drawn bigger as a navy-and-gold graphic. In post: less contrast, more saturation, bloom cut to the emissives (faces, orrery, screens), a light vignette, grain on the tabletop only. Fittings thickened: pilasters, coves, the slabs' bezels. **The lighting was halved from V5's**, because a matte cream cast reflects far more diffuse light than the metallic one did: in the first V6 capture Virgil's head blew out to white.

### The screens — subtraction

Every panel is one title, one word, one chunky graphic and the stripe: flat saturated colour on near-black, no gradients; rules ten canvas pixels thick, brackets sixteen; no small text anywhere; motion stepped — blocks land one at a time, bars fill in eight hard steps, the hex string walks in jumps; and one imperfection per screen, a scanline sweeping down every few seconds and a faint flicker. The three slabs behind Virgil read ROLES / REVIEW / CANDIDATE; each character's panel reads their name and their state. The slabs are thicker (7.5 cm bezel, 9 cm deep), flat-shaded, in a saturated matte blue, with no specular.

**The fonts changed**, exactly as you agreed and by the process V5 established: **Outfit Bold** for headlines and **Geist Mono Bold** for anything data-shaped, both SIL Open Font License 1.1, their licence texts read in full and committed byte for byte (`assets/licenses/OUTFIT-OFL.txt`; the Geist Mono text was already committed and is byte-identical for the Bold weight), the unmodified fonts under `assets/fonts/`, register rows reading **verified — licence text read and committed**, subsetting recorded as a Modified Version under §5, and the subsetter refusing any file whose digest differs. The subsets are 10,072 bytes (Outfit, 65 of 414 glyphs) and 16,364 bytes (Geist Mono Bold, 94 of 846); 35,252 bytes of text in the file between them. Tektur and Geist Mono Regular are **retired**: their files, Tektur's licence text and both subsets are removed rather than left as dead licence entries; their register rows stay, marked retired, as the record of what V5 shipped. `test/screen-fonts.test.ts` is green against the new faces.

### KR-57 — three mutations the tests missed

Three edits survived all of V5's tests: re-siding the visor material after it was made, deleting `frustumCulled={false}`, and adding `visible={false}`. The mesh is now made by one function, `buildVisorMesh`, which sets all three, and the test asserts them on the object it returns; `Visor.tsx` is held by source to using that function through `<primitive>` with no mesh, material, `.side =`, `frustumCulled =`, `visible =` or `return null` of its own. Honestly: the object-level checks are the test; the source guards close the routes a component has to undo them, and a route not listed would need a guard added.

## What the screenshots showed

Captured from the built file on this machine's software renderer at 1440 × 900: the room and the tabletop at several moments of the demonstration and on the orbit, the switch made with the `V` key, each character at eye level, the stomp at four moments, the Prover's receiving beat, and every face and panel held in BLOCKED. What they showed, including what is not right:

- **The room opens with all four in frame.** Virgil on his console's deck at the centre with the three slabs behind him; the Fabricator at his bench on the left with his panel beside him; the Prover at his rig behind on the right; the Keeper at his lectern on the right in front, now inside the frame. The window, the planet and the station are as they were. The floor is matte and the inlaid star and rings read as a graphic. **Not right:** from the opening camera the Keeper's panel, nearest the lens, stands in front of the Prover's and hides most of it; a small orbit, or the Prover button, clears it.
- **The key switches.** Pressing `V` in the room lands on the tabletop without a reload: the disc, its edge, the arch standing over the set, the nebula wrapped behind with the planet on the left and the station on the right, crisp star points over it. The set reads as an object floating in space, which is what the spec asked. The first V6 capture did *not* show this — the nebula's bottom edge cut across the frame because a camera looking down at 30° sees below the horizon — and the backdrop was rebuilt as a cylinder before the artifact was filed.
- **The stomp plays.** At 300 ms after BLOCKED: the red slit-eyed face with its heavy brows, the REVIEW slab reading BLOCKED with a broken ring and a cross, the CANDIDATE slab reading VERDICT. At 800 ms his head is thrown down so far the camera sees the top of his crown — **and that crown is blown out to white**, because it faces the key light square; the lighting was halved from V5's for the matte cast and this one angle still overexposes on this renderer. At 1300 ms he is back up, glaring; at 2400 ms at rest, still glaring. Whether the stomp is the refusal you meant is yours to say; that it plays, and on BLOCKED only, is held by a test.
- **Every face is a face.** The Fabricator's teal eyes and smile inside his black screen; the Keeper's inside his hood, with the hood's brow above them; the Prover's ice eyes and smile in his dome, now filling it; Virgil's across most of his head. Working faces are amber and half-lidded with the stepping bar; BLOCKED faces are red with brows and a flat mouth, and the light on each figure goes red with them. **Held in BLOCKED from the tabletop, the whole set is red at once** — four faces, four panels with crosses, the review slab, and Virgil mid-stomp — and it is legible from across the disc.
- **The panels read at every distance the owner will use.** From the room's camera: ROLES / VIRGIL or the active role, REVIEW / AWAITING or PASS or BLOCKED with the gauge ring, CANDIDATE / the phase word and the walking hex, and each character's name and state; the stripe reads in full on every one. Close up: RECEIVING with its blocks landing one by one, WORKING with five bars ticking, PASS with its huge tick, BLOCKED with its cross, COMPLETE with a ring and not a tick. The first capture clipped the stripe ("LLUSTRATIVE · NOT REAL STAT") because the letter-spacing was applied after the text was fitted; fixed before filing.
- **Eye level.** Each of the four "Look at" poses lands near the character's eyes with their panel beside them. **Not right:** the Prover's close-up in the room has the Keeper at its right edge, with one eye-stalk crossing the stripe of the Prover's panel. This was worse before the last commit (the Keeper's hood filled the right of the frame and his head-gem covered the panel); the camera now stands on the Prover's other side and the Keeper's station moved, and what remains is the tension between fitting the Keeper into the room's opening frame and keeping him out of the Prover's close-up. Both were not achieved at once, and the opening frame was preferred.
- **Nothing through anything**, in any frame: no figure in a station, no station in a body, no panel through a head. The tests hold the same for every extreme of breathing and for Virgil at bind pose on his deck.
- The machines that produce these screenshots draw in software and show glow and colour differently from a real screen; they are for catching gross errors and for judging the panels at close range, not for judging the look.

## Not in this viewing point

Rigs for the three characters, sound, real events, any performance measurement, any look on real graphics hardware. Generation prompts and times for all nine models are outstanding.

## What looking at it proves, and what it does not

**It proves** the file opens from `file://` with one request and no console errors; that every figure stands clear of their station and Virgil of his console, held by a test; that every face is fitted to its own head within the unchanged bound, held by a test; that the refusal clip is shipped and wired to BLOCKED, held by a test; and that the artifact rebuilds byte for byte from its commit.

**It does not prove** anything about speed, and nothing about how it looks was checked on real graphics hardware by anybody. `OD-0005` set aside the two checks that need that hardware and requires them written down as **not performed**, never as met; this file changes nothing about that, and its footer says so. Your look is the first real judgement of any of it.

## The honest size

The file is **9,804,742 bytes** — 9.35 MiB, or 9.80 MB at a million bytes each — 5,526,114 bytes (36 %) smaller than V5. Against the project's budget of "12 MB desktop, 6 MB mobile", which does not say which unit it means: **inside the desktop budget on both readings** (77.9 % of 12 MiB, 81.7 % of 12 MB), the first viewing point since V2 to be; **over the mobile budget on both readings** (155.8 % of 6 MiB, 163.4 % of 6 MB), as every viewing point has been. The owner console estimated 6–8 MB for this pass; the file is **over that estimate by 1.8–3.8 MB**. Where the estimate went wrong: every payload is carried as base64, which is four thirds of its bytes, and the porthole and the three window layers (2.4 MB encoded) were kept unchanged because you praised the window. Nothing was cut for the number. Of the file, 8.0 MB is payloads (the seven V6 models 3.95 MB, the rigged Virgil 1.62 MB, the porthole 1.11 MB, the window layers 1.28 MB, the fonts 35 KB) and about 1.8 MB is code.

SHA-256 of the file:

```
80e64a1517829db7a660f02e67f4f4a54c5b9e9d7eb94a706109359f8c879f99
```

Built from source commit `5b4b52fb8bc1c93ab9ee6ef789c16dd61a614d00` with `VIRGIL_OWNER_BUILD_DATE="2026-09-08 05:20 UTC"`, and rebuilt byte for byte from a clean tree with `VIRGIL_OWNER_SHA` set to the same value; the second build's SHA-256 matched the first. Checks run on that source, all with `TURBO_FORCE=true`, with their printed results in `docs/process/PHASE_1_RUN_RECORD.md`: `pnpm check` (lint, typecheck, and the workspace's tests, 51 of them in the application), the Mind Scan (`knowledge-lint`: no findings), `build:owner`, `verify:owner` (opens from `file://`, one request and it is the document, no console errors), and `sha256sum -c` against the committed digest.
