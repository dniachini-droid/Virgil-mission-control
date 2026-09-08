# Phase 1 — the stylised rebuild: the agreed specification (owner direction)

**Status: owner direction, not owner decisions.** Everything in this file was agreed between the owner and the owner console in conversation on 2026-09-08 and relayed to the build session in the same session's brief. It is written down here because until this file existed the whole of it lived in one console transcript, which is the exact failure `docs/process/PHASE_1_BACKLOG.md` records under "record real runs as events" and which has already cost this project an hour of unpushed work. It is direction the owner gave; it is not a decision record, it does not carry authority layer 1, and nothing in it changes `constitution/`, the commission, or any accepted `OD-*`. Where it narrows or supersedes an earlier document, that is said in the section "Contradictions reported, not resolved" at the end, as `CLAUDE.md` requires.

**Superseded in part by the V7 direction of 2026-09-08 (§0 below).** The owner looked at V6 on their phone and gave new direction; §0 records it and says which sections below it overrides. Nothing else in this file is rewritten: the V6 sections stand as the record of what V6 was asked to be.

This is the largest single pass in the project: a new cartoony cast and props replacing the ornate ones, a rigged Virgil with a refusal clip, and a second presentation beside the room. It is built on branch `claude/virgil-phase-1-slice`, restarted forward from `main` at `90b116c` (pull request #7 merged the previous branch, which is fully contained in it).

---

## 0. V7 — the owner's direction after V6, and what it supersedes

Relayed by the owner console on 2026-09-08 from the owner's reaction to V6 on their phone; built by the V7 pass from `e144e9f`. The owner's words are quoted where they were given; the rest is the console's reading of them, and is marked as such.

### 0.1 The room is retired, not removed; no window; tabletop only

The owner: *"Room retired for now. No window. I might go back to it. But for the time being, we proceed with tabletop."*

**Supersedes §2's "as a SECOND view".** The tabletop is the default and the only presentation the owner is asked to judge. The room's code — `RoomShell.tsx`, `WindowView.tsx`, the aperture, `layout.wallZ` and the rest of the room's dimensions in `palette.ts` — **stays in the repository and stays reachable** behind the `V` key, the "Room (retired)" button and `#/?view=room`, and `verify:owner` visits it so a retirement never silently becomes a removal. Nothing of it is deleted, because the owner has said they may go back to it. "No window" is read as the window in the wall; the porthole stays as the **free-standing arch** on the disc, the skyline element §2 gave it, because a flat disc without it reads as a straight line. If that reading is wrong the arch is one line to remove.

### 0.2 The visor: the face on the head's own triangles

The owner's biggest complaint, and a real one: *"you can kind of see that his visor underneath is like a different colour black and looks like it's kinda pasted on… I really want us to map the entire visor and have the face where we edit the eyes to be almost perfectly mapped to where the visor starts and ends… I wanted it to actually wrap around. Whereas right now, it looks like a little screen that's patched onto his visor."* And: *"For the visor also have the eyes underneath the layer of the glass."* And the order of work: *"if we can just try that with Virgil firstly"*.

**Supersedes the V4–V6 panel** (`fitHeadSurface`, the grid ray-cast onto the head and lifted off it, inset to clear a brow groove — the inset was exactly what read as pasted on). What V7 built instead, in `asset-pipeline/fit-visor.mjs` and `src/world/characters/visorFit.ts`:

- every model the owner generated has its visor **painted** into its own base-colour texture as near-black neutral paint; the pipeline samples that texture across the head's front triangles (seven samples each) and records, beside each payload, **which of the head's own triangles carry the paint** (`*-visor.json`), with the rule it used, the paint's measured bounds and the payload digest it was read off;
- at runtime those triangles are copied out of the head's geometry — with their skin weights, for Virgil, so both meshes are bound to his skeleton and deform exactly with his head — and drawn twice: the **face**, a shader that samples the model's own paint per pixel and keeps only the painted ones, so the face starts and ends where the paint does, by construction, and wraps because it *is* the head's surface; and the **glass**, the same triangles pushed 6 mm out along their normals with a glossy clear-coated near-black physical material masked to the same paint, so the eyes sit under a layer of glass and a highlight travels across it as the camera moves;
- the paint rule is on linear colour, luminance < 0.045 and chroma < 0.03 by default, which is what excludes the Keeper's navy hood and the Prover's navy collar. **The Prover's dome needed the rule relaxed** (luminance 0.06, chroma 0.06, his region trimmed above the collar): 15 % of the samples inside his mask were dark but tinted blue-grey, and at full texture resolution the shader discarded them as speckle, so close up his eyes went missing while from across the disc a lower mip passed. The relaxed rule is recorded in his mask, and the shader is given the mask's rule, never a constant, so pipeline and shader always agree;
- measured per head (triangles carrying paint; wholly painted; straddling the paint's edge): Virgil 466 (370 / 96), the Fabricator 259 (73 / 186), the Prover 222 (40 / 182), the Keeper 523 (226 / 297). The straddling count is how ragged each head's paint edge is at triangle level; the per-pixel mask is what makes the visible edge the paint's own.

**Virgil first, then all three**, as instructed: his was built and looked at first (the face fills his painted visor to its edges and follows the head's curve in the side view; the orrery's ring and the pink planet reflect across the glass; it rides the stomp with no separation), and the three figures were converted once his was seen to work. `test/visor.test.ts` was rewritten for the mechanism, not removed: it holds each mask to its payload's digest and to head-front triangles only, the glass to the face's normals at the recorded gap, the face's UVs to the canvas, the meshes uncullable and visible, and the face double-sided (KR-57). The 15 mm floating bound of V4–V6 has no object any more — the face is at 0 mm by construction — and is retired with the panel rather than kept as a dead number.

### 0.3 The screens are objects — and the V6 brief's error about specular

The owner: *"the animations on the screens are good… it just looks cheap and everything else looks really nice."* And: *"I don't want richer details. I just want it to look nicer. More detailed. Or more like a screen. Shiny and a bit of light reflecting off it."* And, precisely: *"try to make them curved if it is at all possible. Not flat. Like a slight curve outwards. That makes it look cartoony."* — *"Have the text sit below the glass."* — *"make the actual screen case be cute — the same white as the characters main colour, but make it bulge out, like the old apple Mac computers."*

**Supersedes §3's "Matte throughout" and §4's "less specular" for the screens and the visors only.** The console's correction of its own V6 brief: the rule is now **everything matte except the screens and the visors**; in a matte world the only glossy things draw the eye, and the screens are the information, so that is correct rather than a compromise. Not more content — no words, panels or data are added. The `ILLUSTRATIVE · NOT REAL STATE` band stays baked in and undismissable. The case colour is sampled from the characters' own textures: the dominant bright low-saturation colour of all four is `#fcecd4`/`#fceccc` (measured 2026-09-08 from the shipped base-colour maps), so the case is that cream rather than the room palette's.

### 0.4 Composition: in depth, not across; a portrait camera

The owner: *"at least on the phone, you have to zoom out too far to see all of them."* The console's reading, which the V7 pass agrees with: a composition problem, not a camera problem — the V6 set was arranged wide and a phone is tall, and no camera reconciles that.

**Supersedes §2's arrangement and `layout.stations`.** Virgil forward at his console; the Fabricator, Keeper and Prover receding behind him at three depths, the cluster compacted from stations near the rim of a 13 m disc to a 10.8 m disc with stations about three to five metres apart; the review board of three slabs raised behind and above the agents rather than at head height in front of them. The tabletop camera is a function of the viewport's aspect (`tabletopCamera` in `palette.ts`): 30° and 12.5 m in landscape as §2 authored, 38° and 12 m for a phone held upright, the lens widened only as far as the set's width needs. Verified at 1440 × 900 and 390 × 664: all four in frame at both. The control bar fits 390 px (V6's cut "Keeper" off the right edge) and the footer publishes its height so the stage reserves exactly that strip.

Worth recording: this problem largely dissolves once spawning exists, because the real system shows Virgil plus whoever is active, not the whole cast at once. Four at once is an artefact of a demonstration built to be judged.

### 0.5 The floor flicker

The owner: *"the gold circles on the floor, they flicker, and it doesn't look very nice."* Z-fighting: V6's rings, navy disc and star were separate meshes a millimetre apart over the floor with the same polygon offset. Repaired by drawing the whole inlay as **one texture on the disc's one top face** (`floorGraphic.ts`), so there is no second surface to fight; the near plane raised from 0.1 to 0.2 m for depth precision; `test/floor.test.ts` holds the graphic to the layout and the tabletop to one floor face with no coplanar inlay.

### 0.6 Size, and an honest uncertainty

The owner lost two hours because the 9.8 MB V6 file would not open from Files on iOS (blank), fell back to Netlify, and served themselves an older build. V7 makes the file as small as it can without degrading what the owner praised, and names the artifact with the version at the front (`v7-s2-virgil-<sha>.html`) so seven files in one Downloads folder cannot be confused again. **Nobody has established that file size is why iOS failed**; it is the console's hypothesis, untested, and no session here can test iOS Safari. The owner document reports the size achieved and does not claim it fixes the local-open problem.

What V7 achieved: **8,395,984 bytes** (8.01 MiB / 8.40 MB), 1,408,758 bytes (14.4 %) under V6, from smaller texture plans — the three characters 512², their stations 256², Virgil 768² (not 512², because his close-up fills the frame and the owner praised him), Virgil's console 512², the porthole 512² with its metallic-roughness map at 256². The model payloads went from 6.68 MB to 5.26 MB of base64. Most of what remains is geometry (about 2.9 MB raw across eight models) and code (1.8 MB), neither of which can be cut without cutting the models or the libraries; the rejected Phase 0 spikes ride in the file for `#/s1`, and base64 costs a third over the raw bytes — both are levers for a later pass to weigh, not this one. Judged in close-ups on the software renderer, Virgil at 768² and the Fabricator at 512² read as before; that judgement is this machine's, not real hardware's.

### 0.7 Walking, coming next — a seam only

The owner is sending rigged Fabricator, Prover and Keeper with walk clips, **later, once the rest is right** (confirmed by the console during V7). Not built in V7. The seam: each station has an idle position and a working position, and the move between them is one swappable behaviour (`locomotion.ts`), a procedural glide as the placeholder, so a walk clip drops in without rework.

### 0.8 Root configuration: permission granted, used once, CI deferred

For the first time any session here has been permitted to touch the repository root. The owner, verbatim: *"You may edit the root config files."* V7 used it for exactly one line: `"!docs/process/PHASE_1_owner-builds/**"` added to `biome.json`'s exclusions beside `!schemas/**` and `!constitution/**`, which retires **KR-54** (Biome warning on every committed artifact since S1). No rule or formatter setting was changed — an exclusion for a generated artifact is not a weakened check; a rule change would be, and `CLAUDE.md` forbids it.

**CI is unblocked and deliberately deferred.** KR-50/KR-59 — no automated checks, so the only guard that catches a network escape is the one nothing requires — is the largest item on the backlog and is to be its own bounded pass with its own review, commissioned by the console after V7 is delivered. The next session should not read the old restriction as still standing, and should not add CI as a tail to another pass.

### 0.9 Queued for the pass after V7: the consoles' own screens (owner direction, not built)

The owner: *"Every one of the consoles has a screen big enough to put the actual information, instead of on a seperate screen! Yes, the screens have static writing on it, but if you map the screens just like you're doing with the visors, we should be able to use them instead which is much better"* — and then, settling the division: *"the only console whjere there isnt room is Virgils. So leave his 3 screens above him as is. But the other ones, you can map the scrteens, make them compleetyley black, reflective, and text sitting slightly under it!"*

Recorded here so it survives the conversation; **not a V7 build item**, and its scope does not change V7's.

- **It is the same technique as the visor:** extract the screen's own triangles from the console's mesh and draw live content onto them. Whatever V7 built for the visor generalises directly.
- **Virgil's three slab panels stay.** They are the owner's accepted solution for his station, not a stand-in to be retired: his ring console's own screens face inward and stand a few dozen pixels tall from the camera. A later session must not read an earlier note and delete them as leftovers. Being permanent, they carry the full glass treatment of §0.3.
- **The three role consoles get their own screens mapped**, in the material the owner specified — completely black, reflective, the text sitting slightly under the glass. One material, two hosts: code-built slabs for Virgil, extracted model geometry for the agents. **The material and its parallax are to be shared code, not implemented twice**; that is what keeps them one system rather than two attempts. This *extends* the treatment from three slabs to three consoles; it retires nothing.
- **Why it works now and did not at V3:** the V3 ring console's screens ring the inside of the well, tilt inward and are unreadable at any arrangement; the three role consoles are 1.4 to 2.0 m tall with outward-facing surfaces, a genuinely readable size.
- **Two things it gives for free:** the baked static writing on those screens disappears, because drawing on the geometry replaces that surface entirely, as it does the visors' baked eyes; and it narrows the set at the agents' stations, which helps the portrait framing directly.
- **The owner's earlier prompt may pay off:** they asked Meshy for screens *"completely blank, flat, matte, pure-black rectangles"*. If the consoles honoured that, the screen regions may be findable from the texture automatically, as the visors are, rather than measured by hand. To be tested when the pass comes.
- **The honest trade, recorded rather than discovered:** at the wide tabletop view on a phone a console screen is roughly 40–60 px, against this project's measured limit of text readable to about 96 px and gone by 64. At distance those screens carry **state — colour, glow, one large word — not sentences**; the detail is legible only when a character is selected and the camera drops in. That is the layered approach already agreed for the screens.
- **Sequencing:** the extraction technique was proven on Virgil's visor first, in V7, so that if it failed the visors and the consoles did not break at once.

---

## 1. Assets supplied (nine files)

All nine were supplied by the owner on 2026-09-08, generated with Meshy under the subscription attested in `docs/decisions/OD-0008-meshy-licence-attestation.md`. Each is imported **unmodified** into `assets/models/candidates/` with a provenance row written **before** the file is committed (`assets/licenses/README.md`). Verification for every row: **"owner attestation, not verified"**. Generation prompts and generation times: **outstanding, never invented**.

| Delivered as | Bytes | SHA-256 | Faces | Verts | Bounding box (units) |
|---|---|---|---|---|---|
| `v2-virgil.glb` | 8,213,292 | `d8daeadd32fba8ea83df539c7a78545b23bfe9023f5e18f72574caba9313630c` | 20,843 | 20,443 | 1.381 × 2.000 × 0.915 |
| `v2-virgil-anim.glb` | 9,447,580 | `5541fecde26f58862334ea89ed0030d4dd1de521db595286982a63afc3f0d18f` | 20,843 | 20,443 | 2.071 × **3.000** × 1.373 |
| `v2-console.glb` | 4,279,352 | `846b55de5b6b85aeea6bb171a52e051293e7ced1d5e41b15fa9e734ce131f72e` | 11,933 | 15,624 | 2.000 × 0.623 × 1.966 |
| `v2-console-keeper.glb` | 3,660,708 | `b09dc58fca76eb01498a6a6ec2174e8e5f5fdae14c4228d5f9d99c3729b2942b` | 7,907 | 9,577 | 1.638 × 2.000 × 1.639 |
| `v2-console-builder.glb` | 3,820,204 | `dcc6ea3e498818ba3fd8727f57664e0c77830979b0b43fc40fb4cbdc81cab2fd` | 7,990 | 10,643 | 2.000 × 1.391 × 1.795 |
| `v2-console-prover.glb` | 3,866,812 | `1f342120751471a2d8379597fdeffee2bc4b8c1f4db25b9b2b9d91089ecca8af` | 8,004 | 10,877 | 1.921 × 1.545 × 2.000 |
| `char-A.glb` | 10,295,680 | `deb3b611ffac638787cc3c0ecd21839d2cf641f7b2fb4f9a12fcb3f644a7bd23` | 12,282 | 18,353 | 1.349 × 2.000 × 0.960 |
| `char-B.glb` | 8,818,396 | `8789aea585744623fc23c42d84adc6cc3bd284100ac29e7398c626da90e59db5` | 12,470 | 15,424 | 1.147 × 2.000 × 0.628 |
| `char-C-prover.glb` | 16,048,640 | `b97f04b7167f547e116203f4485c23e961c57bc4664412de40cf56cd378a8063` | 12,481 | 16,463 | 1.216 × 1.999 × 1.081 |

The digests and byte counts above were given in the brief and **re-measured by the build session against the delivered files before import**; all nine matched. Every other figure in the table is the brief's and is re-measured by the reduction pipeline when the file is imported; where a measurement disagrees, the measurement is what the register records.

### 1.1 Which character is which — one owner identification, two provisional assignments

The owner attached the three characters as "the prover, fabricator and keeper" in that order, but the third file's original upload name is `Meshy_AI_prover_char_final_low_0908032817_texture.glb`. The order and the filename contradicted each other, so the build session was instructed not to guess and to do all non-character work first. The owner console asked the owner. The owner answered twice in the owner console, and the second answer retracts most of the first; both are quoted verbatim so a reader sees exactly what was said.

First: 

> "widest is builder. slimmest is prover deepest is keeper"

Then, walking that back:

> "i dont know which one is which. it doesnt matter.the fatteest one is the fabricator. the other two it doesnt matter. we cna swap them later."

The second statement retracts the second and third clauses of the first. **Only the Fabricator is owner-identified.** The other two are assigned by the session, provisionally, on the stated basis, under the owner's own words — "the other two it doesnt matter. we cna swap them later" — as the authority for proceeding without an identification.

| Delivered as | Box | Role | Basis | Committed as |
|---|---|---|---|---|
| `char-A.glb` | 1.349 wide — widest ("fattest") | **Fabricator** (the owner's word: "builder") | **Owner-identified.** Both statements agree on this one | `fabricator-model-candidate-02.glb` |
| `char-C-prover.glb` | 1.081 deep — deepest | **Prover** | **Provisional, session assignment, not identified by the owner.** Assigned on the strength of its own upload filename, `Meshy_AI_prover_char_final_low_0908032817_texture.glb`, which is real evidence where the retracted sentence is not. Filing it as the Prover also means its name and its role agree | `prover-model-candidate-02.glb` |
| `char-B.glb` | 1.147 wide, 0.628 deep — slimmest | **Keeper** | **Provisional, session assignment, not identified by the owner.** By elimination | `keeper-model-candidate-02.glb` |

Two things recorded rather than tidied away:

1. **The three provenance rows must not read as equally settled, because they are not.** The Fabricator's row records an owner identification with the owner's words quoted. The Prover's and Keeper's rows record a session assignment, provisional, with the basis stated and the owner's "we cna swap them later" quoted. A row that reads as identified when it was guessed is the kind of quiet falsehood the register exists to prevent.
2. **The owner says "builder"; this project's canonical name for that role is `fabricator`** — `.claude/agents/`, the concept sheets and every review document use it. The file is committed as the Fabricator, and "builder" is recorded as the owner's alias so a reader searching either word finds it.

**The swap is made cheap**, because the owner has said they may want it: the role-to-model binding sits in **data** (`apps/mission-control/src/world/room/cast.ts`, one table), not scattered through component code, so exchanging the Prover and the Keeper is one edit. The build record names the exact line.

Committed filenames follow the register's existing convention (`virgil-model-candidate-02.glb`, `prover-model-candidate-01.glb`): role, then `model-candidate`, then a sequence number. The new cast is `-02` because a `-01` of each already exists. **If the owner later swaps the Prover and the Keeper, the committed filenames become wrong and must be swapped too**, with the register rows updated to say so; the files themselves are not touched.

### 1.2 Consoles pair by role

`v2-console.glb` is Virgil's console. `v2-console-builder.glb` goes to the Fabricator, `v2-console-prover.glb` to the Prover and `v2-console-keeper.glb` to the Keeper: each character has their own station. **This supersedes the earlier direction** from the same owner that a station is generic — "its generic - lets make it a generic panel - no prover markings on it" (2026-09-07, recorded in `assets/licenses/ASSET_PROVENANCE.md` and `docs/process/PHASE_1_HOW_TO_LOOK_V3.md` as "the station is a place; the agent is the identity"). The owner has since generated three role-specific consoles, and that later act supersedes the earlier words. **A consequence to write down where the next session will find it:** the constitution names seven core roles and seven conditional specialists, and a set has three or four slots; role-specific stations mean the rarer roles will eventually have to share a station or bring their own, and that is a question for the owner when it arrives, not something this pass decides.

### 1.3 Material facts worth having

All three new characters and both Virgils declare `metallicFactor: 0, roughnessFactor: 0.8` — matte and non-metallic — unlike the ornate cast, which declared nothing and so defaulted to fully metallic. Each carries **one base-colour texture only**: no metallic-roughness map, no normal map. They light correctly without intervention. `char-C-prover`'s texture is 6562 × 6547 (14.73 MB; about 218 MB of GPU memory if uploaded as delivered) from the Blender export path; it is resampled like every other source, and the decoder is checked against a non-square multi-thousand-pixel PNG.

### 1.4 The rigged Virgil

`v2-virgil-anim.glb` has the same mesh as the static file — 20,843 faces, 20,443 vertices — so the rig preserved it, and it carries its own 4096² JPEG so no texture pairing is needed. **It is exported at 3.000 units tall, exactly 1.5× the static model**, feet at y = 0; the runtime scales it to the chosen height (§5). Six clips, 28 joints, 1 skin:

| Clip | Length | Use |
|---|---|---|
| `Idle_11` | 1.97 s | idle, blended with procedural breathing |
| `Angry_Ground_Stomp` | 1.47 s | **the refusal — wired to BLOCKED.** The clip every previous build lacked; BLOCKED is the state this whole system exists to make legible |
| `Agree_Gesture` | 13.07 s | the hand-off |
| `Running`, `Walking` | — | **not shipped** |
| `restpose` | — | not shipped |

The owner console measured the head-shell rigid residual — 6,351 vertices at ≥ 98 % weight on `Head`/`head_end`/`headfront` — at 1.8 m real scale as 2.2–3.9 mm on Idle, 2.6–4.0 mm on the stomp and up to 7.3 mm mid-`Agree_Gesture`: two to four times softer than the ornate rig, whose weights bound 11 % of vertices rigidly against this one's 1.8 %, and still inside the 15 mm this project recorded as its bad case. **A specific prediction from the console:** `test/visor.test.ts` allows a panel at most 15 mm off the surface behind it and its measured worst was already 13 mm; this head may trip it. If it does, the bound is re-measured and a new one justified with evidence — never simply loosened. The build session re-derives the figure itself rather than relying on the console's.

### 1.5 The three characters stay unrigged this round

By the owner's explicit note. They get procedural breathing and live faces, as the Prover had in V5. The seam for rigs is left where it is. One consequence accepted: **the hand-off is one-sided** — Virgil gestures; the receiver answers with face, light and stillness.

---

## 2. Presentation — a tabletop, as a SECOND view

**The room is not replaced.** Both views ship in the same artifact with one key to switch, so the owner compares rather than remembers. That method has decided every question on this project.

The tabletop:

- **Camera at 30° elevation, orbit constrained to about a 120° arc.** The constrained arc is also what stops the owner orbiting round to find the back of the set undressed.
- **A disc floor with a visible edge**, so it reads as an object rather than a room.
- **No walls, no ceiling, no window aperture.**
- The owner's nebula becomes the surrounding backdrop with **procedural stars and fine grain layered over it**. The nebula reached us at only 1672 × 941 because the upload channel recompressed it and no original exists, so its clouds will be soft; crisp procedural star points and grain are the agreed remedy, because it is the stars going mushy that reads as bad, not soft clouds.
- **Planet and station stay as separate, unobstructed depth layers.**
- **The porthole becomes a free-standing arch** at the back of the disc. It gives a flat disc a skyline; without it the silhouette is all horizontal.
- **Selecting a character drops the camera to near their eye level**, their panel beside them.

## 3. Style

- **Matte throughout.**
- **Remove the mirror floor.** It is both the strongest realism signal and the most expensive thing being drawn, since it re-renders the scene. A contact shadow replaces it.
- **Compress the value range and push saturation** — less contrast, more colour separation — which reads as cartoon more than any geometry change.
- **Cut general bloom; keep emissive glow** on faces and the orrery, because that glow carries meaning rather than atmosphere.
- **Thicken every fitting.**
- **Graphic shapes rather than surface detail.** The inlaid floor star from the approved reference is the example; it was previously lost competing with the reflection.

## 4. Screens — "as if from a console from a space animation movie"

**The defining rule is subtraction.** A realistic console is dense; an animated one has four words the size of your fist and nothing else.

- **Three or four words per panel, enormous. No small text anywhere** — if it cannot be read across the room it should not be there.
- **Flat saturated colour on near-black. No gradients.**
- **Chunky geometry only:** thick bars, rings, brackets, crosshairs. No realistic widgets.
- **Rules two or three pixels, never hairlines.**
- **Motion stepped and snappy** — hard jumps between states, because smooth easing reads realistic.
- **One deliberate imperfection** — a scanline, a sweep, a slight flicker — which is what makes a screen feel switched on.
- **The slabs:** thicker bezels, flatter shading, saturated frame colour, less specular.

### 4.1 The fonts change

Tektur is squarish and technical, which reads as *realistic* sci-fi, and it has no bold weight — only Regular and Medium. It is replaced by **Outfit-Bold** for headlines (geometric, round, chunky) and **GeistMono-Bold** for anything data-shaped. Both are in the session machine's font library (`/mnt/skills/examples/canvas-design/canvas-fonts/`) with their OFL text beside them. The process V5 established is followed exactly:

- the `*-OFL.txt` copied verbatim into `assets/licenses/`;
- register rows with verification **"verified — licence text read and committed"**;
- subsetting recorded as a Modified Version under OFL §5;
- the unmodified sources committed under `assets/fonts/`;
- the subsetter refusing any file whose digest differs from the register;
- `test/screen-fonts.test.ts` kept green against the new faces.

Tektur's rows and payloads are **retired** if it is no longer used, rather than left as dead licence entries.

### 4.2 The honesty band stays

The `ILLUSTRATIVE · NOT REAL STATE` band stays, baked into every panel and undismissable. **It becomes bold and graphic** — in this style a thick amber stripe with four heavy words belongs, so honesty and style agree here rather than competing.

---

## 5. Sizes chosen by the build session (recorded here, reasons in each `*-asset.json`)

Every absolute size is a decision, not a fact of the file; Meshy normalises to a 2-unit box. The build session's choices and reasons are recorded under `runtime.targetReason` in each generated `apps/mission-control/src/world/**/*-asset.json` and summarised in `docs/process/PHASE_1_HOW_TO_LOOK_V6.md`. Virgil remains 1.8 m, as approved in V2; the three characters are sized against him; each console is sized so its occupant stands in or at it as the model's own geometry allows, measured, not eyeballed.

---

## 6. Standards this pass is held to

`TURBO_FORCE=true` on everything. Real output reported for `pnpm check`, `knowledge-lint`, `build:owner`, `verify:owner`, `sha256sum -c` and the byte-for-byte reproducibility rebuild. No test skipped, disabled or weakened. OD-0005 honesty in the footer and in `PHASE_1_HOW_TO_LOOK_V6.md`. The demonstration stays unmistakably labelled scripted with nothing real behind it. Close-up and full-scene screenshots taken and reported as they actually are, including anything that looks wrong. The shipped size reported against both readings of the 12 MB / 6 MB budgets. Nothing the owner has praised — the window, the floor treatment, the lighting, Virgil himself — degraded to hit a number. **Ship an openable file:** if any single item defeats the pass, the rest ships and the record says which and why.

---

## 7. Contradictions reported, not resolved

`CLAUDE.md`: a session that finds a contradiction reports it; it does not resolve it silently. Three are on record from this pass.

**7.1 The scope of stage S2 (KR-56).** `docs/process/PHASE_1_PLAN.md` (authority layer 4) defines stage S2 as "one Foundry hero composition and one Mind hero composition … featureless blockouts where characters will stand" and stage S3 as "one character, not six". What was actually built from V1 to V5 is one room with two characters (Virgil and the Prover) and a scripted twenty-second sequence, and this pass extends it to four characters, four consoles and a second presentation. That narrowing and re-shaping was the owner's direction in the owner console across 2026-09-07 and 2026-09-08, viewing point by viewing point; owner direction is layer 1 over a layer-4 plan, so the work is authorised. But until this paragraph no document recorded that the plan and the work disagree, and the reviewer of `a4f8b70` found the silence (KR-56, medium). It is recorded here. The plan is not rewritten by this pass, because a plan is a session document and the stage table stays as the evidence of what was planned; a future Phase 2 brief should start from what exists rather than from S2's stage table. The same finding notes that no Phase 1 run record with commit SHAs exists; `docs/process/PHASE_1_RUN_RECORD.md` is opened by this pass.

**7.2 Generic station versus role-specific consoles.** §1.2 above. The later direction supersedes the earlier one; the consequence for seven-plus roles and three or four slots is written down and not decided.

**7.3 Reduced motion and the faces (KR-55).** `docs/art-direction/OPERATIONAL_ANIMATION.md` line 38 requires a reduced-motion *equivalent* and forbids losing the blocked-versus-passed distinction. V5's `Visor.tsx` returned nothing under reduced motion, removing both visors and their light, and `PHASE_1_HOW_TO_LOOK_V5.md` said "both are still with reduced motion" without disclosing that. This pass draws a static face instead, adds a test, and corrects the V5 document with a dated note rather than rewriting its sentence.

---

## 8. What this document is not

It is not a decision. It does not amend the commission, the constitution, any ADR, or any owner decision. It is the written form of the owner's direction so that the next session does not have to reconstruct it from a transcript, and so that a reviewer can check what was built against what was asked. If the owner's direction changes, this file is superseded by the later direction and says so at the top.
