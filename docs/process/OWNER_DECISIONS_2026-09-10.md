# Owner decisions, 10 September 2026

Answers to the nine items put to him after V11. Recorded because they change what is built next
and because two of them supersede earlier decisions of his own.

## 1. No demonstration marking is required on a phone [K11-03 closed]

*"That's fine. I told you I don't care. Don't need to mark as demo."*

An open window on a phone carries no marking and that is now deliberate, not a defect. K11-03 is
closed by the owner's decision rather than by a repair. The single `Demo data` chip remains in the
overview chrome.

**What this does not touch:** the replay's own three-line band, which makes the *opposite* claim —
that what is shown is a real recorded run — and the composer's statement that no session is behind
the build. Neither is demonstration signage.

## 2. V11 becomes the version he opens

*"Yes it's V11."*

The approved default changes from V10 to V11, which the preservation contract reserved to him alone.
**V10 remains reachable and unchanged**; nothing about the contract is relaxed by this, and V10's
clean-tree build stays the number every pass measures.

## 3. He has looked on real hardware, and it runs well

*"Runs beautifully."*

**This is the first judgment of this project's visual quality made on real graphics hardware by
anybody.** Every image in every record before this was drawn in software by a CPU rasteriser.

Recorded precisely, and not stretched: he has looked at V11 on his own device and judged that it
looks right and runs well. `docs/decisions/OD-0005-phase-1-visual-checks-and-reference.md` deferred
two graphics-hardware checks and required them recorded as not performed until met; the owner's own
judgment is what they were waiting for. What his sentence **does not** establish, and what therefore
stays unmeasured: a frame-rate figure, and whether the reduced-performance governor ever engages —
it has still never been observed doing so on any hardware.

## 4. Purge the tracked scratch

*"Purge if not needed."*

Reverses his decision of 9 September ("leave them and stop the bleeding"), which was taken to stop
new scratch entering rather than to keep what was there. The 86 tracked files, 27 MB, are to be
removed from the working tree. Removing them from HEAD does not shrink the history, and the branch
is not to be rewritten for housekeeping.

## 5. Make the download smaller — gzip only

*"Make it smaller, gzip only."*

Gzip through the browser's own `DecompressionStream`: **1,316,316 bytes saved, no decoder shipped.**
Draco and Meshopt are not adopted. KTX2 stays rejected on the arithmetic that needed no encoder.

**The care this needs:** every compression option changes the payload V10's own world renders from,
and a repair pass has already caught 96 bytes of V11 work leaking into V10's build once. V10's
clean-tree build must still be exactly 8,528,318 bytes afterwards, or the change is wrong.

## 6. The slab strip stays

*"Leave it."* The underside of the floating screens continues to cut a strip across the top of the
three portrait close-ups. Curing it needs the cluster moved, which he has declined twice.

## 7. The dropped transcript is next

*"Yes."* After V11: he drags one of his own session transcripts onto the page and reads his real work
in Virgil's interface. The real-state snapshot remains **Phase 2 and unauthorised**.

## 8. Sound returns later

*"Yes we do later."* Unchanged from `PHASE_1_BRIEF.md`.

## 9. Tapping an agent — a two-step, which reverses his earlier decision

*"When you click each agent, the window opens straight away. And then when you exit their window it
has the close up of them. What should happen when you click them is first zoom in to their close up
view. And THEN when you click their screen, that's when it should open the window. It's better that
way."*

**This supersedes the decision recorded in `PHASE_1_CONVERSATION_INTERFACE.md` §5a/§5b**, where he
chose the opposite: one tap opening the window immediately while the camera travelled underneath it,
explicitly so that he would not wait. That decision was taken from a description. This one is taken
from use, and use wins.

So: **tap a character → the camera goes to their close-up. Tap their screen → the window opens.**
The consequence he had noticed himself is exactly the argument for it — leaving a window already put
him at the close-up, so the interface was arriving somewhere he had never asked to go.

What must survive the change: the gesture guard, so a drag still opens nothing; the back path being
one step per level; and the panel still rendering from data rather than waiting for the camera.
