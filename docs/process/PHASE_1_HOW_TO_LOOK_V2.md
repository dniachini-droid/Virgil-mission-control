# How to look — Phase 1, viewing point V2: Virgil at the centre

**V1 passed.** You opened `virgil-s2-v1-ed68a46eb1.html` and said, verbatim, *"fucking amazing. It needs tweaking but as a start it's FANTASTIC!!!"* and *"the window looks amazing, floor looks amazing."* The composition, the lighting idea and the three-layer window are kept exactly as they were. This file is V1 with your six tweaks applied, and it is the same kind of thing: one file, download it, double-click it.

> **What this viewing point asks:** with Virgil standing inside the console as the centre of the orrery, the console turned round, your porthole frame in the wall and the orrery of light as the default — is this the right direction, and what is next?

---

## Click by click

### 1. Find the file

```
https://github.com/dniachini-droid/Virgil-mission-control/blob/claude/virgil-phase-1-slice/docs/process/PHASE_1_owner-builds/virgil-s2-v2-2ad2191154.html
```

### 2. Download it

Click **Download** (the arrow into a tray, top right of the file view). The file is about 8 MB and lands in your Downloads folder as `virgil-s2-v2-2ad2191154.html`. If you see the raw text instead, press `Ctrl+S` / `Cmd+S` and save it with that name, ending in `.html`.

### 3. Open it

Double-click it. A dark screen for a few seconds while your browser unpacks the models is normal; then the room appears. Chrome, Edge, Firefox, or Safari 14 or later.

### 4. Look

- **Drag** to look around him from the left, right or above; **scroll** to move closer. The view is kept in front of him and above the console's screen line.
- **Light / Metal**, top left: it opens on **Light**, because you preferred it. Metal puts your armillary sphere back — it is solid, so it cannot share his centre, and it stands on the floor beside the console.
- The strip at the bottom names the version this file was built from.

### 5. Tell us what you think

As specific as you like. Particularly: does he read as the centre of it — the thing the rest turns around — or does he read as a figure with hoops round him?

---

## What changed since V1, in your words and what was done with them

1. **"I like the light better than the metal."** — Light is the default. Metal stays behind the switch; the model stays in the repository.
2. **"Virgil should be standing inside the console, facing the screens. If that's the case, he replaces the sun in the middle of the console, and the planets revolve around him."** — Done as said. He stands on the console's inner floor. The bright core at the middle of the orrery is gone, not hidden: the five rings and their planets turn around him at chest height. Two of the planets carry small coloured lights, so as they pass, teal and magenta move across his chest and cape — the orrery is now part of what lights him.
3. **"…the console needs to turn around 180 degrees."** — Turned. The screens now curve round the near side, facing him, so from the camera you see their backs as glowing panels below his chest and he faces you with the window behind. The camera was raised a little so the shot looks *over* the console at him, the way a bridge shot does, rather than at the back of a monitor. Looking at the actual geometry, this is better than V1, not worse: the console reads as his, and the screens' glow lights him from below and in front.
4. **"I might have Virgil a bit bigger."** — He is 1.8 m, up from 1.65 m. Being the centre argued for a little more presence; more than that and his head left the window.
5. **The pale hot patch on the floor right of the console** — traced to the violet window light sitting just inside the wall and lighting the sill, whose reflection was the patch. The light now sits outside the aperture and the floor's reflection softens with distance.
6. **Size** — see "The honest size" below. It got bigger, not smaller, and this document says by how much.

**Your porthole frame** replaces the frame that was drawn in code, which was the weakest thing in V1. The wall is cut to the hole measured in your model (3.52 m radius at the size chosen, 11 m across), so there is no gap between frame and wall. It came through Blender rather than straight from Meshy, has no normal map and two PNG textures; it is used unmodified, with its provenance row written before it was committed.

## Ring clearance — the risk, and what was checked

A ring passing through his body would break the whole idea. His widest point (the discs beside his head) is 1.21 m across at his new size; the innermost ring is 0.98 m from his centre, a 0.37 m gap, and the rings are only slightly tilted so none dips to the console rim or climbs into his face. Screenshots were taken at several moments of the rotation and from two orbit positions, and no ring or planet crossed him in any of them. That is a check for gross errors on a software renderer, not a proof; if you catch one on your screen, say where.

---

## Owner direction, recorded (not decisions)

You have said you are tired of governance, so these are written down here as **direction you gave**, not as decision records. Nothing below changes an accepted decision.

1. **Virgil is the centre of the orrery; the world turns around him.** This supersedes the earlier idea of a free-standing orrery that Virgil walks over to consult. Worth flagging, not resolving: the old line in `packages/visual-language/data/role-performance.json` — *"Never walks; the dais rotates slowly toward whatever it addresses"* — which looked stale, is now closer to right than it looked. The tension between "he never walks" and any future scene where he moves is left open here.
2. **The orrery of light is preferred over the metal armillary.** Metal stays available.
3. **The longer-term picture, in your words:** *"just have Virgil in it, and then when other agents are called, they spawn next to him with their control panels. room for 3 or 4 agents. theres an animation that passes the job over to them and they start work, and when they are done they spawn out."* Recorded alongside it, the constraints the coordinator gave you:
   - **Anything that spawns out must leave its evidence behind.** `docs/architecture/PERFORMANCE_STRATEGY.md`'s never-removed list already forbids losing provenance tethers and the difference between blocked and passed; a departing agent cannot take those with it.
   - **Independence must read spatially.** A reviewer arrives *opposite* Virgil, not alongside him: scrutiny from outside should not look like collaboration.
   - **A slot is a place, not an identity.** Seven core roles plus seven conditional specialists share three or four slots, so a role must be unmistakable the moment a slot changes occupant.

A side-console model is coming from you; this build did not wait for it.

---

## What looking at it proves, and what it does not

**It proves** the file opens; that your four models and three window pictures are in it and load; and that the V2 arrangement exists and can be seen. Your reaction to it is the first real judgement of it.

**It does not prove** anything about speed, and nothing about how it looks was checked anywhere else. The machines that build this have no graphics card and draw in software, which shows glow and colour differently from a real screen. Screenshots were taken only to catch gross mistakes. Your decision `OD-0005` set aside the two checks that need real graphics hardware and requires them written down as **not performed**, never as met; this file changes nothing about that. **And the symmetry:** if it runs slowly or looks wrong on your machine, that is worth saying, but it is one machine and one look, not a performance finding or a visual-quality measurement.

## One assumption, still named

The textures are WebP, which every current browser and Safari 14+ read. Untested on your machine; V1 opened and showed textures for you, which is the first evidence that it works there.

## The honest size

The file is **8,036,197 bytes** (7.66 MiB; 8.04 MB counting a megabyte as a million bytes). V1 was 7,135,241 bytes and you called it fantastic; V2 is larger because your porthole frame is in it (about 1.1 MB as packed) and the metal orrery, now the alternative, was shrunk (down 0.2 MB). Against the project's budget of "12 MB desktop, 6 MB mobile": inside desktop on either reading; **over mobile by 1.66 MiB or 2.04 MB.** The remaining ways to get under it — dropping the metal orrery from the file, re-compressing your window pictures, or cutting Virgil's textures — would each take something away that you have seen and liked, so they were not done. Nobody has told you this budget is binding on this file; if it is, say so and the choice is yours.

SHA-256 of the file:

```
760c2c7bfb8eafe12eed22d9354666197c2020e1a4abe2d1b8d73c0a5b9ea775
```
