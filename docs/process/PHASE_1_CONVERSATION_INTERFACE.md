# The Virgil conversation — owner direction, 8 September 2026

Status: **recorded, not built.** Owner instruction: "mark this to do soon".
Authority: owner product direction, layer 4 (a process/design record). It does not
amend `docs/product/VIRGIL_MASTER_COMMISSION.md` and does not change
`docs/process/PHASE_1_BRIEF.md`'s nine steps; it names the interface those steps
must eventually carry. Where this conflicts with the brief, the brief governs until
the owner says otherwise.

This is the owner's direction as given, transcribed. Nothing below is implemented.
Nothing below has been costed. The one judgment added by this session is the
sequencing note at the end, marked as such.

## 1. What the conversation is

Clicking Virgil opens a text box. That box is not a status panel — it is the actual
working interface, and it carries:

- Complete conversation history.
- Rich Markdown.
- Code blocks and terminal output.
- Plans and task progress.
- Questions and owner decisions.
- File attachments.
- Image and screenshot previews.
- Diffs and pull-request summaries.
- Approve, reject, pause and resume controls.
- The ability to ask Virgil to plan, delegate, inspect or explain anything.

"This is where the real work happens."

## 2. Desktop layout

- The 3D command centre compresses into approximately the left 35%.
- Virgil remains visible and animated.
- The full conversation opens across the right 65%.
- The boundary can be dragged.
- A focus button makes the conversation full-screen.

## 3. Mobile layout

- The full conversation occupies nearly the entire screen.
- Virgil appears in a small animated header.
- Swipe down, or tap the celestial icon, to return to the command centre.
- The text composer stays fixed at the bottom.

When Virgil is speaking or working, his face and body react in the visible 3D
portion — however small that portion is.

## 4. Agent conversations

Virgil is the main conversation. Tapping another agent may open its own focused
record:

- **Fabricator** — implementation plan, files changed, terminal progress.
- **Prover** — tests, verification results and failures.
- **Keeper** — evidence, provenance, history and governance.

The constraint the owner attached to this: the user must not have to manage four
separate chats. Virgil stays the central interface and surfaces the agents' work
inside the main conversation — "Fabricator has completed the implementation. Prover
found two failures. I have authorised one repair cycle." The agent-specific panels
exist for inspection, not for navigation.

## 5. The opening experience

Virgil greets the owner:

> "Good evening, Daniel. Fabricator has finished the current build. Prover found one
> issue that can be repaired safely. Would you like me to continue?"

Beneath it, suggested actions:

- Continue repair
- Show me the issue
- Pause everything

And beneath those, a normal unrestricted chat box where the owner can type anything.

"That combination is the product: a complete coding conversation inside a living,
animated command centre. The 3D world makes it understandable and lovable; the
Virgil chat makes it genuinely useful."

## 6. What this costs, stated plainly

Recording this is not planning it. Four things in it are not small, and none of them
are solved:

1. **A real conversation transport.** Every version of the slice to date is a
   scripted demo with mock events and a self-contained `.html` opened from
   `file://`. A conversation that can approve, reject, pause and resume needs a live
   session to talk to. `docs/process/PHASE_1_BRIEF.md` puts real Mission Control in
   Phase 2 and governed session launching in Phase 3; approve/reject/pause/resume
   controls are Phase 3 capability wearing Phase 1 clothing. This document does not
   authorise them.
2. **Merge stays owner-only.** Nothing in this interface may become a path to merge,
   deploy, or credential connection. An "Approve" button in a chat box is exactly
   the shape of control that `CLAUDE.md`'s hard limits forbid a session to give
   itself, and the owner gate in the demo is illustrative today.
3. **A 35% viewport changes the art.** Every camera, framing and legibility decision
   from V1 to V8 was made against a full-width frame, and the screen-text
   measurements (readable to ~96 px, collapsed by 64 px) were taken there. A
   third-width 3D panel re-opens all of it, and the mobile header re-opens it again.
   Expect the composition work to be redone, not adapted.
4. **The Mind of Virgil is still unstarted**, and it is a Phase 1 item. This
   interface and that one both want the centre of the screen.

## 7. Sequencing — this session's judgment, not the owner's instruction

The honest order, if the owner wants this soon:

1. Finish V8 (in flight) so the world is stable enough to compress.
2. Build the **shell** of this interface against the existing mock demo: the 35/65
   split, the drag, the focus button, the mobile header and composer, the greeting
   and the suggested actions — with the message list fed by the demo's own scripted
   events and everything read-only. No approve, no reject, no pause, no resume.
   That is buildable inside Phase 1 and inside the owner-build constraint, and it
   answers the question the owner actually cares about: does it feel like the
   product.
3. Treat the live conversation transport and the control buttons as the Phase 2/3
   items they are, and put them to the owner as a phase decision rather than
   shipping a button that lies.

The risk of skipping step 2 and waiting for a real transport is that the layout
question — the one the owner can answer by looking — stays unanswered for two
phases.
