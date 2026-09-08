# How to look — Phase 1, viewing point V1: Virgil in his room

**This is the first file in this project that is meant to be looked at.** It shows Virgil standing at his console, in his room, in front of the big round window, lit the way your approved picture is lit — warm gold inside, cold blue and violet outside. It is built from the three models you made (Virgil, the console, the orrery) and the three window pictures you made (the nebula, the ringed planet, the station).

It is one file. You download it and double-click it. No installing, no internet needed once it is on your machine.

> **What this viewing point asks:** does the room, with your models and your window in it, feel like the direction you approved — or not, and where does it miss?

You are the only person who can answer that, because your screen is the only working display this project has. Everything below explains what you are looking at and what your answer will and will not prove.

---

## Click by click

### 1. Find the file

Open this address in your browser:

```
https://github.com/dniachini-droid/Virgil-mission-control/blob/claude/virgil-phase-1-slice/docs/process/PHASE_1_owner-builds/virgil-s2-v1-ed68a46eb1.html
```

### 2. Download it

Look for a **Download** button (an arrow pointing down into a tray) near the top right of the file view. Click it. The file is about 7 MB and will land in your Downloads folder as `virgil-s2-v1-ed68a46eb1.html`.

If you see the raw text of the file instead of a download button, press `Ctrl+S` (Windows) or `Cmd+S` (Mac) and save it with the name above, making sure it ends in `.html`.

### 3. Open it

Double-click the downloaded file. It opens in your normal browser. Chrome, Edge, Firefox or Safari 14 or later are all expected to work; Safari older than 14 will not show the textures, because the file uses the WebP picture format (see "One assumption" below).

The first thing you see may be a dark screen for a few seconds while your browser unpacks the three models. That is normal. Then the room appears.

### 4. Look

- **Drag** with the mouse to look around Virgil from the left or the right, or slightly above. The view is deliberately kept in front of him.
- **Scroll** to move closer or further away.
- The two buttons in the top left, **Metal** and **Light**, switch the orrery on the console between your metal armillary sphere and a version drawn as rings of light. You asked to see metal first, so it opens on Metal.
- The strip along the bottom says which version of the project the file was built from and repeats the sentence about performance not being measured.

### 5. Tell us what you think

Anything is useful, and the more specific the better. "The floor is too pink." "Virgil is too small." "The window is right." "The metal orrery is better than the light one." "I can't see his face." If you can, say it in terms of the approved picture: what is closer to it, what is further from it.

---

## What you are looking at, in plain words

- **Virgil** is 1.65 m tall. The model you made arrived at a nominal 2 metres because the tool that made it fits everything into the same box, so his size had to be decided. 1.65 m was chosen because it puts the top of the console across his lower chest, which is where your picture puts it.
- **The console** is 2.6 m across, chosen for the same reason: in your picture it is a piece of furniture he stands behind, wider than he is tall. At its nominal 2 m it looked like a table.
- **The orrery** is 1.1 m tall, standing on the console's inner floor. It is a sphere, not the flat platter in your picture, so it is placed so it never crosses Virgil's face; he stands a little to the right of it.
- **The window** is 7 m across and shows your three pictures at three different distances: the nebula far away, the planet nearer, the station nearer still. That is why they slide against each other when you drag — it was the point of making three separate pictures.
- **The light** is one idea: warm gold from inside the room (from above, from the console, and from the amber strips) against cool blue-violet from the window. The floor is polished and reflects the room.
- **The three models are used exactly as you supplied them.** Each had its pivot at its centre, so placed naively all three sank halfway into the floor; that is corrected when the file loads, not by editing your files. Their textures were shrunk (from four 2048-pixel pictures per model to smaller ones) so the whole thing fits in one downloadable file. The originals are untouched in the repository.

## What is not there, on purpose

The other robots, the monorail, the bookshelves, the plants, the side consoles, any sound, any movement of Virgil (the model has no skeleton, so he cannot move yet), and the rest of the room off to the sides. This is the centre of the picture only.

---

## What looking at it proves, and what it does not

**It proves** the file opens on your machine; that your three models and three window pictures are in it and load; and that the room, the window and the lighting idea exist and can be seen. Whatever you say about how it looks is the first real judgement of this room anyone has been able to make.

**It does not prove** anything about speed, and nothing about how it looks was checked anywhere else. The computers that build this have no graphics card and draw in software, which shows glow and colour differently from a real screen. Screenshots were taken only to catch gross mistakes — a black screen, Virgil buried in the floor, nothing in shot — not to judge the look. Your decision `OD-0005` set aside the two checks that would need real graphics hardware and requires them to be written down as **not performed**, never as met; this file changes nothing about that.

**Symmetry, please:** if it runs slowly or looks wrong on your machine, that is worth saying, but it is not a performance finding or a visual-quality measurement either. It is one machine, one look, and it should be recorded as exactly that.

## One assumption, named

The textures inside this file are in the WebP picture format, which every current browser reads and which Safari has read since version 14 (2020). Nobody has tested it on your machine. If you open the file and the room appears but Virgil and the console are flat grey, that is most likely what happened; say so, and the next build can ship the textures another way.

## The honest size

The file is **7,135,241 bytes** (6.80 MiB; 7.14 MB counting a megabyte as a million bytes). The project's own budget for the whole Phase 1 slice is "12 MB desktop, 6 MB mobile" without saying which megabyte it means. Against the desktop figure this is inside on either reading. Against the mobile figure it is **over on both readings**: by 0.80 MiB or by 1.14 MB. That is stated here rather than adjusted away. Roughly 4.1 MB of the file is the three models and 1.3 MB is the three window pictures; the code is about 1.7 MB. If the file were served by a web server with compression rather than downloaded as a file it would travel as about 3.96 MB, which is inside both budgets — but a downloaded file is not compressed, so the honest number for what you download is the first one.

SHA-256 of the file, for anyone who wants to check it is the one this document describes:

```
81bedb4f4a2549121fbe12ec4c6a3560f494d1e05b12dc87a33b035c7021c9b6
```
