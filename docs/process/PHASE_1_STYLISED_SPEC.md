# Phase 1 — the stylised rebuild: the agreed specification (owner direction)

**Status: owner direction, not owner decisions.** Everything in this file was agreed between the owner and the owner console in conversation on 2026-09-08 and relayed to the build session in the same session's brief. It is written down here because until this file existed the whole of it lived in one console transcript, which is the exact failure `docs/process/PHASE_1_BACKLOG.md` records under "record real runs as events" and which has already cost this project an hour of unpushed work. It is direction the owner gave; it is not a decision record, it does not carry authority layer 1, and nothing in it changes `constitution/`, the commission, or any accepted `OD-*`. Where it narrows or supersedes an earlier document, that is said in the section "Contradictions reported, not resolved" at the end, as `CLAUDE.md` requires.

This is the largest single pass in the project: a new cartoony cast and props replacing the ornate ones, a rigged Virgil with a refusal clip, and a second presentation beside the room. It is built on branch `claude/virgil-phase-1-slice`, restarted forward from `main` at `90b116c` (pull request #7 merged the previous branch, which is fully contained in it).

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
