# How to look — Phase 1, viewing point V10: the world replays a run that actually happened

**A new document rather than a note on V9's.** V9's covers a new surface — the panel, the ledger, the visors — in eighty lines and everything it describes is still true of this build. V10 changes what the thing *is*: for the first time the world shows something that happened rather than something invented, and the two modes make opposite claims about their own truthfulness. That needed its own explanation rather than a paragraph at the end of somebody else's.

**What is new.** There are now two things the world can run, and a control that says which. **Scripted** is the thirty-second demonstration you have been looking at since V6: invented content, an amber badge, `ILLUSTRATIVE · NOT REAL STATE` on every screen. **Replay** is the Phase 0 consolidation — the run that built and merged this repository's foundation on 6–7 September — played back at 90×, with its real SHAs, its real verdicts and its real findings, read out of the repository's own committed record. Its badge is ice-coloured rather than amber so a glance tells them apart, and its screens say `PHASE 0 CONSOLIDATION · RECORDED RUN · REPLAYED · NOT LIVE STATE · 3B9A964E`.

**Also in this build, from what you said about V9 on your own machine.** A drag or a zoom no longer opens a window: a press has to stay still, be brief, be one finger, have no wheel inside it and not move the camera before anything opens. And the close control on the panel now works — it never did; sliding the panel down only *looked* as though it worked, because the drag leaves the sheet off the bottom of the screen while it is still there.

**One thing you named is not fixed**, and it is better you read it here: **the space under Virgil's visor.** It is still there, unchanged, and `PHASE_1_RUN_RECORD.md`, "V10 — defect C", says exactly why and what the next pass has to measure.

One file, download it, double-click it. It is **8.13 MB**, 0.4 % smaller than V9.

> **What this viewing point asks:** when the world is replaying the real run, do you believe it — and can you tell at a glance that you are watching a recording of past fact rather than a demonstration or a live system? And is it now possible to move the camera around without windows opening at you?

---

## Click by click

### 1. Find the file

```
https://github.com/dniachini-droid/Virgil-mission-control/blob/claude/virgil-phase-1-slice/docs/process/PHASE_1_owner-builds/v10-s2-virgil-4ae03314d9.html
```

### 2. Download it

Click **Download** (the arrow into a tray, top right). If you see raw text instead, `Ctrl+S` / `Cmd+S` and save with the name ending in `.html`.

### 3. Open it

Double-click. **The footer's stage line reads "viewing point V10"** — check that first. It opens on the scripted demonstration, exactly as V9 did.

### 4. Switch it to the replay

Top left, next to `DEMO On/Off`, there is now **`RUN Scripted | Replay`**. Press **Replay** (or the **R** key). Three things change at once:

- the badge at the bottom left turns from amber to **ice**, and reads `RECORDED RUN, REPLAYED AT 90× — the Phase 0 consolidation, which began 06 SEP 23:30 UTC and ran 1 H 30 M …`;
- the honesty band along the foot of every screen changes from `ILLUSTRATIVE · NOT REAL STATE` to three lines naming the run and saying it is **not live state**;
- a **`SPEED 30× | 90× | 180×`** control appears. Those numbers are not settings someone chose; each is the run's recorded span divided by how long the playback takes, so the label is derived from the two clocks rather than asserted.

### 5. Watch it once, at the wide view

Sixty seconds, then it starts again. What you are watching is a real lineage: a build, nine checks that all passed, an independent review that **blocked it anyway**, the owner authorising one bounded repair, a second candidate with a new SHA, nine checks again, a second review that passed with four non-blocking findings, the owner's gate, and the merge as `cd0981d`.

**The moment to watch for is the BLOCKED.** Every deterministic check on that first candidate was green, and the reviewer stopped it. That is the whole argument for the review hop, made by this project's own history rather than by an example.

### 6. Press **5** (or **Board**) and read the ledger

Three rows, one per hop, with the candidate's real short SHA above them. The time column is the thing to look at: the Fabricator's row says **`24 M 57 S`** and has a bar; the other rows say **`NOT RECORDED`** and have **no bar at all**.

That is deliberate and it is the most important honest thing in this build. The repository timestamps commits, not hops. Exactly one of this run's nine hops has a duration anyone can derive from the record. A bar is a length, and a length would be a claim — so where there is no recorded duration there is no bar and no number, only the words.

**Change the speed while you watch this.** Press 30×, then 180×. Every playback figure moves — the badge, the control's own label, the line in the panel that says what you are watching at. **`24 M 57 S` does not move, and neither does `NOT RECORDED`, or `06 SEP 23:30 UTC`, or `1 H 30 M`.** Recorded time and playback time never mix; that is the rule the whole mode is built on.

### 7. Open a panel on a hop that has a verdict

Let it reach the BLOCKED, press **4** (the Keeper) and then **P**. The panel now reads:

- `HOP 3 OF 3 · CANDIDATE 956BE26064`, `REVIEW`, `BLOCKED`;
- an amber band that says `RECORDED RUN · REPLAYED · NOT LIVE STATE` instead of `Illustrative`, because a recording of a real run is evidence and calling it illustrative would understate the truth as badly as dropping the band would overstate it;
- **all ten findings, by ID, with what each found and what became of it** — KR-01 and KR-02 blocking and repaired, KR-03, KR-06, KR-07 and KR-09 accepted and still open today;
- and at the foot, **`WHERE THIS COMES FROM`**: the file in this repository, the section inside it, and the commit. Every document in the replay has one. If a line cannot be traced to a file, it should not be on the screen.

### 8. Try to break the pointer

This is the part to be rough with. **Drag hard across the screens to spin the camera. Pinch. Scroll to zoom, repeatedly.** No window should open. Then **tap** a screen once, without moving: it should open immediately.

The one place it errs is on purpose: if you tap in the moment just after a fling, while the view is still gliding to a stop, nothing opens and you have to tap again. It refuses a press that arrives while the world is still moving, because that was the gesture that kept opening windows at you.

**Then close the panel with the `ESC` control at its top right.** It works now, at both sizes, and its target is 44 px square. The marks at the panel's corners that look like part of it are the world's corner brackets — decoration, not controls. If you want a cross there instead of the word `ESC`, say so and it is a small change.

### 9. Switch back to Scripted

Press **Scripted**. Everything reverts: amber badge, `ILLUSTRATIVE · NOT REAL STATE`, the invented candidate `9abcdef012`, the demonstration's own elapsed seconds on the ledger. The demonstration was not replaced. It teaches how the system works with three loops and four verdicts; the replay shows one real run that only ever produced two of them.

---

## What this build does not claim

- **The replay is past fact, not live state.** It is a recording of a lineage that was merged on 7 September. It is not this repository's condition now, and nothing in it is being computed as you watch.
- **No visual-quality judgment has been made on real graphics hardware by anybody.** Every frame anyone has looked at was rendered in software. OD-0005 defers the two graphics-hardware checks and requires them recorded as **not performed**, never as met.
- **Eight of the nine hops have no recorded duration**, and the build says so on every surface that could have printed a number. Fixing that is the open backlog item "record real runs as events" — not a display change.
- **The space under Virgil's visor is unchanged.** See the run record.
