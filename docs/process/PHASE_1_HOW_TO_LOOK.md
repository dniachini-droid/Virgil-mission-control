# How to look — Phase 1, viewing point V0

**What is inside this file is the rejected Phase 0 spike, and it is not being offered for your judgement.** It is not the art direction you approved, it is not what Phase 1 will look like, and nothing about it is a proposal. It is old work, put in front of you on purpose, because this viewing point asks one question and one question only:

> **Can you open it?**

If you open the file and something appears on the screen, the answer is yes and this viewing point is finished. You do not have to like anything you see. Please do not say "no" to the look here — the look is viewing point **V1**, and it does not exist yet.

---

## Why we are doing this at all

You have never been able to look at anything this project has built. That is a real gap, and it is not your fault.

The computers these sessions run on have no graphics card. Anything they draw is drawn in software, and the Phase 0 record already says that software drawing makes glow and colour look better or worse than they really are. **Your own machine is the only working display this project has.** Everything from here on has to reach you as something you can open yourself.

The previous answer to "how does the owner see the work" was a document telling you to install a developer toolchain and run two commands in a terminal. You will not do that, and it should never have been written as though you would. This replaces it.

So: **one file. You download it and you double-click it.** No installing, no terminal, no server, no account, no cost, and it keeps working afterwards with the internet switched off.

---

## Click by click

### 1. Find the file

Open this address in your browser:

```
https://github.com/dniachini-droid/Virgil-mission-control/blob/claude/virgil-phase-1-slice/docs/process/PHASE_1_owner-builds/virgil-s1-v0-cd49062eda.html
```

If that link does not work, you can walk to it instead. On github.com, open the repository, use the branch button near the top left to switch from `main` to `claude/virgil-phase-1-slice`, then click through the folders: `docs` → `process` → `PHASE_1_owner-builds`. The file is the one ending in `.html`.

### 2. Download it

GitHub will not show you the file itself — it will show a page saying the file is too large or offering to view the raw version. Either way, look for the **`Download raw file`** button. It sits in the small toolbar just above the file, on the right, and it looks like a downward arrow into a tray. Click it.

The file lands in your **Downloads** folder. It is about **1.6 MB**, which is roughly the size of one photograph. It is called:

```
virgil-s1-v0-cd49062eda.html
```

### 3. Open it

Go to your Downloads folder and **double-click the file**.

It should open in your normal web browser — Chrome, Edge, Firefox or Safari. Give it a couple of seconds; there is a lot inside it.

**If double-clicking opens something other than a browser**, right-click the file instead, choose **Open with**, and pick a browser from the list.

**If your browser warns you about the file**, it is because you downloaded it rather than visited it. Choose **Keep** or **Keep anyway**. The file makes no connection to anything; if you are ever unsure, disconnect from the internet before opening it and it will behave exactly the same.

### 4. What you will see

A dark page with a heading, a short paragraph in amber repeating that this is the rejected spike, and two links.

**That page appearing is the entire test.** Everything below this point is optional.

At the very bottom of the screen, in small grey text, there is a line naming the exact version you are looking at:

```
Virgil Owner Build — Phase 1 S1 / viewing point V0
built from commit cd49062eda1dfc85c27fc01ec10f7d5bbf43bc8f
built 2026-09-07 09:02 UTC
Performance on this machine is not a measurement and is not recorded as one.
```

That line is there so that when there are several of these files, you always know which one is on your screen. It will be on every one of them.

### 5. If you want to see it move

Click either link — **Orbital Foundry spike** or **Mind of Virgil spike**. A 3D scene loads.

- **Turn the camera:** hold the left mouse button down and drag.
- **Zoom:** scroll the mouse wheel, or pinch on a trackpad.
- **Slide sideways:** hold the right mouse button and drag.
- **Step through the sequence:** the numbered buttons along the bottom (`00 station`, `01 file read`, …), or the **←** and **→** arrow keys. **Home** and **End** jump to the first and last.
- **Go back:** the link at the top right moves between the two scenes. To return to the first page, use your browser's back button.

The buttons at the top switch reduced motion on and off, hold the camera still, and change the detail level.

Again: none of this is being offered for your judgement. It is here so that "can you open it" has a real answer rather than a page that loads and does nothing.

---

## What this proves, and what it does not

**It proves the delivery works.** That a file built by a session, committed to this repository and downloaded by you, opens and runs on your machine. That is the mechanism every later viewing point depends on, and until now nobody knew whether it worked.

**It proves nothing about speed.** If it feels fast, that is an impression, not a measurement, and it will not be recorded as one. You decided in OD-0005 that performance stays formally unmeasured in Phase 1, and that decision holds. This applies even if it feels slow: a bad impression here is not a performance finding either.

**It proves nothing about anyone else's computer.** One machine, one browser, one operating system, one graphics card — yours.

**It proves nothing about the art.** The art has not been built. What you are looking at is the work you already rejected.

**It proves nothing about your phone.** It may well open there; nobody has tested it. Android usually manages a downloaded `.html` through a file manager, and iPhones are unreliable at it. If you happen to try it and it works, that is useful to know. If it does not, that is not a failure of this viewing point.

---

## How to answer

One line back is enough.

- **PASS** — it opened.
- **FAIL** — it did not open, or it opened and stayed blank.

If it is a FAIL, the single most useful thing you can tell us is **what you saw instead**: a blank white page, a blank black page, an error message (the words in it), a download that would not start, a browser that refused the file, or nothing happening on double-click. Any one of those points at a different cause. You do not owe an explanation beyond that.

**You may say FAIL without a reason.** A reason makes the next attempt better, but it is not required.

If FAIL is the answer, the alternative delivery route is a GitHub Actions build you download from the repository's Actions tab. That route needs a separate decision from you, because it touches files outside what this work is allowed to change, and because we cannot read your account's billing plan and will not tell you it is free when we do not know.

---

## One document that is now wrong, and what it needs from you

`docs/process/ART_DIRECTION_CHECKPOINT.md` is the Phase 0 document that was meant to be how you judge the art. It tells you to run:

> `pnpm install`, `pnpm --filter mission-control dev`

**That instruction is now wrong.** It asks you to install a developer toolchain, which you have said you will not do, and it describes a mechanism this document replaces.

**No session may correct it.** Phase 1 sessions are permitted to write files under `docs/process/` only where the name begins with `PHASE_1_`, and `ART_DIRECTION_CHECKPOINT.md` does not. That boundary is doing its job, so it is being reported rather than stepped around.

**What it would take:** you confirming, in writing, that single file by name as a permitted path. One sentence — *"sessions may edit `docs/process/ART_DIRECTION_CHECKPOINT.md`"* — is enough, and it authorises that one file and nothing else.

**If you would rather not**, that is a fine answer too. The checkpoint document then stays as it is, wrong about the mechanism, and this document is the only place the Owner Build is described. The cost is that a future reader may follow the old instruction and get stuck. The judging criteria in that document — the *signature look*, *legibility* and *two worlds* rows, and the PASS / PASS WITH DIRECTION / FAIL vocabulary — are still good and are still what V1 will use.

---

## For the record

| | |
|---|---|
| Viewing point | **V0** — delivery proof |
| Stage | S1 (`docs/process/PHASE_1_PLAN.md`, Part 2) |
| File | `docs/process/PHASE_1_owner-builds/virgil-s1-v0-cd49062eda.html` |
| Size | 1,658,226 bytes (1.58 MB) |
| SHA-256 | `e0c78552e73d33f90473506134165960d7ea94e21d337182cbb657432625fc1e` |
| Built from commit | `cd49062eda1dfc85c27fc01ec10f7d5bbf43bc8f` |
| Contents | the Phase 0 spike, unchanged and rejected (`docs/decisions/OD-0002-art-direction-checkpoint.md`) |
| Asks | can you open it |
| Does not ask | anything about the look, the speed, or any other device |

For a reviewer rather than the owner: that file is reproducible byte for byte, and this was checked rather than asserted. From a clean worktree,

```sh
VIRGIL_OWNER_SHA=cd49062eda1dfc85c27fc01ec10f7d5bbf43bc8f \
VIRGIL_OWNER_BUILD_DATE="2026-09-07 09:02 UTC" \
pnpm --filter mission-control build:owner
```

emits a file identical to the committed one, with the SHA-256 above. The build minute has to be supplied because it is stamped into the footer; nothing else about the output varies.

The commit named above is the commit the file was **built from**, not the commit that added the file to the repository — a file cannot contain the name of the commit that has not been made yet. The two are one commit apart, and the SHA-256 above is what ties the file on your screen to the one in the repository.

Rendering inside the session container that produced this file is software rendering (SwiftShader), and it is not a valid basis for any visual judgement. See `docs/process/PHASE_0_RUN_RECORD.md`.
