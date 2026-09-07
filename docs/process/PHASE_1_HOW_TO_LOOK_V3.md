# How to look — Phase 1, viewing point V3: Virgil moves, and someone else is in the room

**V2 passed without changes:** *"looks beautiful, honestly."* V3 is your next instruction, verbatim — *"lets build it in with another agent at their console, with examople stuff printed and animated on the screen, animations for virgil, and face/eye animations. and anything else you think"* — plus your correction to the console: *"position the centre console so the screens are behind virgil … so you can see the screens, his face and the window behind him."*

Same kind of thing as before: one file, download it, double-click it. It is bigger (about 15 MB), so the dark screen before the room appears lasts a little longer.

> **What this viewing point asks:** does the room now feel *inhabited* — Virgil moving and looking at you, the Prover at his station, screens ticking over, faces changing — and is the scripted demonstration the kind of thing you want the real system to look like when it works?

---

## Click by click

### 1. Find the file

```
https://github.com/dniachini-droid/Virgil-mission-control/blob/claude/virgil-phase-1-slice/docs/process/PHASE_1_owner-builds/virgil-s2-v3-532631a16d.html
```

### 2. Download it

Click **Download** (the arrow into a tray, top right). It lands in Downloads as `virgil-s2-v3-532631a16d.html`. If you see raw text instead, `Ctrl+S` / `Cmd+S` and save with that name ending in `.html`.

### 3. Open it

Double-click. Chrome, Edge, Firefox, or Safari 14 or later. The room appears after a few seconds; Virgil starts moving as soon as it does.

### 4. Look

- **Drag** to look around; **scroll** to move closer.
- **Demo On / Off**, top left. It opens **On**, and while it is on an amber box under the buttons says, in full, that what you are watching is a **scripted demonstration driven by no real events**. Every screen also carries the word ILLUSTRATIVE. Switch it off to see the room at rest.
- The demonstration is a twenty-second loop: Virgil surveys, turns toward the Prover, hands the job over with a gesture, the Prover's station lights and his face goes amber (working), a verdict comes back — **PASS on one loop, BLOCKED on the next**, so you see both — both faces and the review screen take that colour, and it resets.

### 5. Tell us what you think

Does he read as *him* when he moves? Do the faces read as faces? Is the Prover the right size next to him? Is the screen bank behind him what you pictured? Anything at all.

---

## What is in it, and the choices made

- **Your new ring console** (3.0 m across). Virgil stands on its inner floor (0.38 m up), so the rim meets him at the knee and he is not squashed inside it, as you asked. It is placed as you built it — its low open side toward the camera, its taller arc behind him.
- **Virgil moves.** He is your rigged model, 1.8 m as before, standing at the centre facing you with his back to the window. Four of the eleven animations are in the file: the long sway (his resting state), the short idle, the agreeing gesture (the hand-off), and the head-turn taken from the "look around" clip. The running, walking and dancing clips are not shipped. **No refusal or "blocked" pose exists yet** — you said you would add one later — so when a verdict is BLOCKED his face and his own light go red and hard, and a clip drops in later without redoing anything.
- **The Prover** is at a side station to his right. He is 1.6 m — clearly shorter than Virgil — and because your model of him has no skeleton he does not move his limbs; he breathes instead: a 1.5 cm rise and fall and a small sway, out of step with Virgil. **The station is generic**, by your instruction ("*no prover markings on it*"): one model, used for every future slot. The station is a place; the agent is the identity.
- **Faces.** Every character's visor is an animated panel: irregular blinking, eye shape and colour by state (teal at rest, ice when attentive, amber working, green passed, red blocked), a pulse whose speed follows activity — and the panel gives off real light, so each face lights its own chest and that light changes colour with state. Virgil's panel is fastened to his head joint and rides it through every movement. Your Prover was generated with a blank visor, so his panel sits straight on it; for Virgil, whose eyes are baked into his texture, the panel covers the visor entirely rather than partly (partial cover would show two sets of eyes). Painting the baked eyes out in the texture itself was tried first and set aside: the texture is a fragmented atlas in which the visor cannot be found without more analysis than this pass had.
- **Screens.** Three upright panels stand behind Virgil, facing you: roles and their states, the review verdict with evidence bars, and the candidate with a scrolling short SHA and a provenance line. **These three panels are not something you supplied** — the screens built into your console face inward and are a few dozen pixels tall from the camera, far below the size at which words can be read, so they keep their own glow and the readable content stands behind him on panels made in code. The classic control-room image; if you would rather the words lived on your console's own screens, say so and they will need to be much larger. The side station carries a smaller panel of its own. Small strips and edge-lights never carry text.
- **The porthole, window, floor, lighting and orrery** are as you approved them. The orrery still turns around him, and its rings still clear his body at every point of their rotation — checked again with the moving model, from several angles and several moments.

**Illustrative, and labelled.** Everything on the screens uses this project's real vocabulary — the role names, the state words, the four review verdicts — but none of it is this repository's real state. Nothing is looked up; the SHA walks through digits on a timer. The word ILLUSTRATIVE is on every panel every frame, and the amber badge says the rest. A convincing fake of the real thing would be worse than nothing, so it is never allowed to look real.

## Owner direction, recorded (not decisions)

Recorded here as direction you gave, not as decision records, as before:

1. **The console's screens sit behind Virgil; he faces the viewer.** Front to back: his face, the screens, the window. This supersedes V2's arrangement. The reason it is right beyond composition: his visor is the room's state display and must never point away from you.
2. **The side station is generic.** *"its generic - lets make it a generic panel - no prover markings on it."* One model, every slot; the agent at it is the identity.
3. **The light orrery, Virgil at its centre**, both unchanged from V2's record.
4. **A refusal pose is coming from you**; until then, blocked is expressed in face, light and colour.
5. Your Fabricator and Keeper models are in the repository with provenance rows, unmodified, and are not yet in the room.

## What is not there

Spawn-in and spawn-out of agents (the P3 item; the demonstration's hand-off shows the shape of it without the arrival and departure). Movement for the Prover beyond breathing. Sound. The other side stations. Anything real behind the screens.

---

## What looking at it proves, and what it does not

**It proves** the file opens; that your rigged Virgil, your ring console, your station and your Prover are in it and load; that Virgil animates, the faces animate and the screens animate; and that the demonstration runs. Your reaction is the first real judgement of any of that.

**It does not prove** anything about speed, and nothing about how it looks was checked anywhere else. The machines that build this have no graphics card and draw in software, which shows glow and colour differently from a real screen. Screenshots were taken only to catch gross mistakes — a ring through his body, a face floating off a head, nothing in shot. `OD-0005` set aside the two checks that need real graphics hardware and requires them written down as **not performed**, never as met; this file changes nothing about that. **And the symmetry:** if it runs slowly or looks wrong on your machine — and this one has far more in it than V2 — that is worth saying, but it is one machine and one look, not a measurement.

## The honest size

The file is **15,270,238 bytes** (14.56 MiB; 15.27 MB at a million bytes each). Against the project's budget of "12 MB desktop, 6 MB mobile" it is **over both, on both readings**: over desktop by 2.56 MiB / 3.27 MB, over mobile by 8.56 MiB / 9.27 MB. The largest single item is your new console — 148,615 vertices, more than four times the old one, which alone is about 4.8 MB as packed — followed by the rigged Virgil with his four clips (about 3.3 MB). The metal orrery and the static Virgil are no longer in the file. Nothing you have seen and liked was cut to chase the number, and nobody has said this budget is binding on this file; if it is, say so and the choice is yours.

SHA-256 of the file:

```
a1e3e3e3da264eef13700d59336cfc5ba7b31ce980df20950bb89cc5d21a52e9
```
