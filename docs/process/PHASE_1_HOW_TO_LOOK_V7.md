# How to look — Phase 1, viewing point V7: the tabletop, faces on the head, screens as objects

**This pass answers what you said about V6 on your phone.** The room is retired and the tabletop is what you are looking at. Virgil's face — and the other three — is no longer a screen patched onto the visor: it is drawn on the head's own surface, so it starts and ends exactly where the painted visor does and wraps because it *is* the head, with the eyes under a layer of glass that catches the light. The screens are objects now: a bulging cream case in your characters' own white, the display sitting under a slightly convex sheet of glass. The cast is arranged in depth so a phone sees all four without zooming out. The gold circles on the floor no longer flicker. And the file is smaller and unmistakably named.

Same kind of thing as before: one file, download it, double-click it. It is **8.4 MB** against V6's 9.8.

> **What this viewing point asks:** does the face now read as *his* visor rather than a screen on it; do the screens read as objects; can you see all four on your phone; is the floor still; and does the file open where V6 did not.

---

## Click by click

### 1. Find the file

```
https://github.com/dniachini-droid/Virgil-mission-control/blob/claude/virgil-phase-1-slice/docs/process/PHASE_1_owner-builds/v7-s2-virgil-ffa3e18cff.html
```

**The name starts with the viewing point now** — `v7-…` — so in a folder of seven builds it sorts apart and reads as what it is. The earlier files are `virgil-s2-v1…v6`; this one is not one of them.

### 2. Download it

Click **Download** (the arrow into a tray, top right). It lands in Downloads as `v7-s2-virgil-ffa3e18cff.html`. If you see raw text instead, `Ctrl+S` / `Cmd+S` and save with that name ending in `.html`.

### 3. Open it

Double-click. Chrome, Edge, Firefox, or Safari 14 or later. The tabletop appears after a few seconds. **The footer's stage line now reads "viewing point V7"** — that line is what finally diagnosed the V6 mix-up, and it is the first thing to check.

**On the phone:** we do not know that this file opens from Files on iOS. V6 did not, and nobody has established why (more below). If this one does not either, please say so, and say what you saw — blank, a spinner, an error — because that is the only evidence anyone will have.

### 4. Look

- **It opens on the tabletop.** Virgil forward at his console; the Fabricator behind him on the left, the Keeper further back on the right, the Prover furthest, under the arch; the three slabs raised behind them as a board. On a phone held upright the camera is steeper and a little wider so all four are in the frame without zooming out.
- **Click any character**, or press `1` (Virgil), `2` (Fabricator), `3` (Prover), `4` (Keeper): the camera drops to their eye level. **Look at Virgil's visor** — it is one piece of black glass filling his whole screen, the eyes under it, a highlight sliding across as you drag round him. Then the other three.
- **Look at a screen close up and drag round it.** The display sits behind the glass; as you move, it shifts against the case's lip and the light moves over the curve. That is what tells the eye it has an inside.
- **Watch the floor.** The gold rings and the navy disc are one drawn surface now. They should not flicker on the phone. If they do, that is new information and we want it.
- **Demo On / Off**, top left, as before. It opens **On**, with the amber box saying in full that what you are watching is a **scripted demonstration driven by no real events**. The loop is the V6 one — three hops, PASS on one loop, BLOCKED on the next, the stomp on BLOCKED — with one new thing: **the three agents stand aside at rest and move up to their panel when a job arrives**. Today that is a glide with no legs; it is the seam your walking rigs drop into when they come.
- **`V` shows the retired room.** It is there because you said you might go back to it; it is not the thing to judge.
- Every screen carries the thick amber stripe along its foot reading **ILLUSTRATIVE · NOT REAL STATE**, under the glass with the rest of the display.

### 5. Tell us what you think

Is the face his visor now? Are the screens objects? All four on the phone? Does it open from Files — and if not, what did you see?

---

## What changed, and why

### The room is retired, not removed

Your words: *"Room retired for now. No window. I might go back to it. But for the time being, we proceed with tabletop."* The room's code stays and is reachable behind `V` and the "Room (retired)" button, and the verifier still opens it so a retirement cannot silently become a removal. The porthole stays as the free-standing arch on the disc: "no window" was read as the window in the wall, and without the arch a flat disc reads as a straight line. If that reading is wrong, the arch is one line to remove.

### The visor — the face on the head's own triangles

You said the visor underneath was a different black and the face looked pasted on, and that you wanted the whole visor mapped, the face starting and ending where the visor does, wrapping round. That was right, and the cause was exactly the method: V4 to V6 fitted a separate panel over the head and inset it to clear a brow groove, and the inset was the pasted-on edge.

There is no panel now. Every head you generated has its visor **painted** into its own texture as near-black paint. A pipeline script reads that texture across each head's front triangles and records which of the head's own triangles carry the paint; at runtime those triangles are copied out of the head — for Virgil, bound to his skeleton, so they move exactly with his head through the stomp — and the face is drawn on them through a shader that keeps only the painted pixels. So the face's edge is the paint's edge, by construction, and it wraps because it is the head's curve. Over it, the same triangles six millimetres out carry a sheet of glossy glass, masked to the same paint, so the eyes sit under glass and a highlight travels across it as you move.

**Virgil first, as you asked, then the other three.** His worked, and all three converted. One needed care: the Prover's dome is painted a dark blue-grey rather than black, and with the strict rule the shader threw away a fifth of his visor as speckle, so close up his eyes vanished while from across the disc they showed. His rule is relaxed and recorded with his mask; the strict rule is what keeps the Keeper's navy hood out of his face. The V6 test that held a panel within 15 mm of the head has no object any more — the face is at 0 mm — and was rewritten for the new mechanism rather than removed.

### The screens — objects, not drawings; and a correction to the V6 brief

You said the animations were good but the screens looked cheap, and that you wanted them curved slightly outwards, the text under the glass, and a case in your characters' white that bulges like the old Macs. The V6 brief had told the session to cut specular everywhere, and applied to the screens that flattened the one thing that needed to be glossy. The rule is now: **everything matte except the screens and the visors.**

Each slab is a pillowy front plate and a swollen shell behind it, in the cream sampled from your characters' own textures (`#fcecd4`, measured); the display is recessed eight millimetres behind the opening; a convex sheet of glass with a CRT's profile sits over it. The glass is one piece of code shared with the visors, drawn so it adds reflections without dimming what is under it. Nothing was added to what the screens say. The honesty band is under the glass with the rest.

### Composition — in depth, for a tall frame

You could not see all four on the phone without zooming out too far. That was the arrangement, not the camera: the V6 set was wide and a phone is tall. Virgil now stands forward; the three agents recede behind him at three depths; the cluster is compacted; and the camera answers to the shape of the screen — on a phone held upright it is steeper and a little wider. The control bar fits a phone's width now ("Keeper" was cut off in V6) and the footer no longer hides the bottom of the frame. Worth saying: this problem largely goes away once spawning exists, because the real system shows Virgil plus whoever is active, not the whole cast at once.

### The floor

The gold circles flickered because they were separate surfaces a millimetre above the floor, and on a phone the depth buffer cannot tell a millimetre apart at twelve metres, so it swapped them frame to frame. The whole inlay — rings, disc, star — is now one texture drawn on the floor's one surface. There is nothing left to swap.

### Size — and an honest uncertainty

**Nobody has established that file size is why the V6 file did not open from Files on iOS.** That was the console's hypothesis; it is untested, and no session here can test iOS Safari. The file is smaller — 8,395,984 bytes, 8.4 MB, 1.4 MB (14 %) less than V6 — from smaller textures (the three agents at 512², their stations at 256², Virgil at 768², the arch at 512²), judged in close-ups on this machine not to have degraded what you praised. It is not much smaller, and the reason is worth knowing: most of the file is now the models' geometry and the code, not their textures, and neither can be cut without cutting the models themselves. Whether 8.4 MB opens where 9.8 MB did not, only your phone can say.

Other plausible causes of a blank page from a `file://` origin on iOS, named so they can be checked rather than guessed at:

- **Files previewing the `.html` instead of handing it to Safari.** The Files preview does not run scripts, and a page that is nothing but a script shows blank. Try the share sheet → Safari, or "Open in" → Safari.
- **Safari's memory ceiling for one tab.** This page decodes several textures into GPU memory and holds a WebGL context; iOS reloads or blanks a tab that goes over its limit, with no error shown. Smaller textures help with this one whether or not size was the problem.
- **A download that arrived truncated or without `.html`.** Check the file's size in Files against 8,395,984 bytes, and its name.
- **The `file://` origin itself on iOS.** V0 established that this kind of file opens from `file://` on a Mac; nobody has established it on an iPhone.

One experiment separates the file from the path: open it from Files once, and separately upload it to the Netlify drop and open that address on the phone. If the second works and the first does not, the cause is the `file://` path on iOS and not the file.

### Walking, coming next

You are sending rigged versions of the three with walk clips. Not in this pass. The seam is built: each station has an idle position (standing aside) and a working position (at the panel), and the move between them is one swappable behaviour with a procedural glide as the placeholder. The clips drop into that without rework.

## What the screenshots showed

Captured from the built file on this machine's software renderer — at 1440 × 900, and at **390 × 664** for the phone — the tabletop wide and held in BLOCKED, six consecutive portrait frames, Virgil's close-up across an orbit, the standard capture set with orbits, and, during the build, each character's close-up and zoom. What they showed, including what is not right:

- **The phone frame holds all four.** At 390 × 664 the tabletop opens with Virgil at his console in the lower half, the Fabricator standing aside at his bench on the left, the Prover and the Keeper behind, and the three slabs as a board above them — nothing to zoom out for. The control bar fits in two rows with "Keeper" whole; the badge sits under it; the footer takes the bottom hundred pixels and the canvas is framed above it, not under it. **Not right:** the badge and the bar together take the top fifth of a phone screen; they say what they must, and no smaller.
- **The floor is still, measured.** Six consecutive frames at 390 × 664 — the tier a phone gets, no post-processing — were diffed pixel by pixel over three floor-only regions (the star, the bare disc, the rings in front of the console): **25,200 pixels, five frame pairs, no channel differing by more than 1.** A z-fight flips a pixel between gold and navy, a difference of well over a hundred; there is none, because there is no second surface left to fight.
- **Virgil's face is his visor.** In the close-up the black glass fills his screen edge to edge — no second black, no inset — with the eyes and smile drawn under it, the depth gradient at its edges, and the orrery's ring and the pink planet reflected across the glass. Dragging round him, the highlight moves across the curve and the face follows the head's dome in profile. Held in BLOCKED at 800 ms, with his head thrown down toward the camera, the face stays on the skin with no separation — and his crown still blows out to white at that angle, as it did in V6, because it faces the key light square.
- **The other three converted.** The Fabricator's face fills his rectangular screen to the edge; the Keeper's is confined to the black opening of his hood, the navy hood itself untouched; the Prover's sits as a band across his dome. **What went wrong and was fixed before filing:** zoomed in on the Prover, his eyes vanished while from the standard close-up they were crisp — his dome's paint is tinted blue-grey, and at full texture resolution the shader discarded a fifth of it as speckle; a rule relaxed for him alone, recorded with his mask, brought them back at every distance.
- **The screens are objects.** Every slab now has a cream case with a bulging back, a lip round the opening, and the display behind convex glass. Across an orbit the highlight slides over the glass and the display shifts against the lip. **Not right, and repaired before filing:** at the first oblique angle the lip and a 14 mm recess hid the display's edge and part of the honesty band; the recess is 8 mm and the lip 10 mm now, and the band reads whole in the orbit frames. **Still not right:** the cases blow out toward white under the warm key on this renderer, as the cast's cream does; that is this machine's rendering and the lighting it has always had, and only real hardware will say whether it is too much.
- **Held in BLOCKED from across the disc**, the whole set is red at once — four faces, four panels with crosses, the review slab, Virgil mid-stomp — and legible.
- **The seam moves.** With the Fabricator's station held in RECEIVING, six frames 300 ms apart show him glide from his idle spot to his panel; nothing walks yet, and the glide is the placeholder it says it is.
- **The retired room still opens** behind `V`, with the same cast in it; it is not composed for and is not offered for judgement.
- The machines that produce these screenshots draw in software and show glow and colour differently from a real screen; they are for catching gross errors and for judging the close-ups, not for judging the look.

## Three things known to be wrong, and not yet addressed

Seen by the owner console in its own render of this file at 1280 × 800 and 390 × 664, recorded here so you are not the one to discover them. They are the next pass, not this one.

1. **Too many screens, and they overlap.** At the top of the phone frame Virgil's three slabs, the three floating panels and the three stations' own painted screens crowd together, and one panel partly hides another. To be exact about what is there: the stations' screens are the static ones your models were made with — nothing was drawn onto them in this pass; your idea of mapping them, like the visors, is written down in the spec for the pass after this one, and when it lands the floating panels go and the count falls. Your three slabs above Virgil stay, as you asked.
2. **Virgil does not read as the conductor.** He is small, low in the frame and the least prominent of the four. The arrangement that put all four on the phone put him nearest the camera but lowest in a frame seen from above.
3. **The frame is bottom-heavy:** his console fills the lower half, the cast sits in a band across the middle, the screens crowd the top.

## Not in this viewing point

The walking rigs (not yet sent), the consoles' own screens carrying the information (your later idea, recorded in the spec as queued for the pass after this one), sound, real events, any performance measurement, any look on real graphics hardware.

## What looking at it proves, and what it does not

**It proves** the file opens from `file://` on this machine with one request and no console errors, on the tabletop and in the retired room; that every face is the head's own triangles and the glass a fixed gap off them, held by a test; that every figure stands clear of their station at work, at rest and on the way, held by a test; that the floor is one surface, held by a test; that the refusal is wired to BLOCKED, held by a test; and that the artifact rebuilds byte for byte from its commit.

**It does not prove** that it opens on your phone, that its size was V6's problem, anything about speed, or anything about how it looks on real graphics hardware. `OD-0005` set aside the two checks that need that hardware and requires them written down as **not performed**, never as met; this file changes nothing about that, and its footer says so.

## The honest size

The file is **8,395,984 bytes** — 8.01 MiB, or 8.40 MB at a million bytes each — 1,408,758 bytes (14.4 %) smaller than V6. Against the project's budget of "12 MB desktop, 6 MB mobile", which does not say which unit it means: **inside the desktop budget on both readings** (66.7 % of 12 MiB, 70.0 % of 12 MB); **over the mobile budget on both readings** (133.5 % of 6 MiB, 139.9 % of 6 MB), as every viewing point has been. Of the file, 6.58 MB is payloads carried as base64 — the six V7 models 2.81 MB, the rigged Virgil 1.55 MB, the arch 0.90 MB, the three window layers 1.28 MB, the fonts and the four visor masks 49 KB — and 1.82 MB is code and styles. What was not cut, and why: the window layers are your files and are the backdrop; the geometry is the models; the code is three.js and the post pipeline. What could still be cut, for a later pass to weigh: the rejected Phase 0 spikes ride in the file for the sake of `#/s1`, and the base64 carrying costs a third over the raw bytes.

SHA-256 of the file:

```
11f043dfa3e73392c09a8204251778ce35a6b7af7280869a533407143d5201bc
```

Built from source commit `ffa3e18cffb17ec55588ac8facc544d9ee1f4043` with `VIRGIL_OWNER_BUILD_DATE="2026-09-08 08:10 UTC"`, and rebuilt byte for byte from a clean tree with `VIRGIL_OWNER_SHA` set to the same value; the second build's SHA-256 matched the first. Checks run on that source, all with `TURBO_FORCE=true`, with their printed results in `docs/process/PHASE_1_RUN_RECORD.md`.
