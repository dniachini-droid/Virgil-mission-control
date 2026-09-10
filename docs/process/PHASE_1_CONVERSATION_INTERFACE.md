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

**Added later, and the two sentences above no longer describe the whole file.**
§5c was written on 10 September 2026, after V11 built §5b and the owner used it.
It records his reversal of his own decision of 8 September and is what the build
follows; §5b is kept exactly as it was written. Sections 1 to 5b are the
8 September record and are unedited apart from the one pointer in §5b that says
where to read on.

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

## 5a. Decisions taken, 8 September 2026

The owner answered three questions in the owner console. These are settled and the build
does not reopen them.

1. **What feeds the conversation: a sample conversation *and* a real transcript the owner
   drops onto the page.** The page opens with a written sample so the layout reads
   immediately, and accepts a Claude Code session transcript dragged onto it, rendering the
   real conversation — history, Markdown, code blocks, terminal output, tool calls, diffs,
   and the images embedded in it. Read-only. Nothing is uploaded and nothing leaves the
   machine: a dropped file is read in the page, and the artifact makes no network request
   (`verify:owner` fails the build if it ever does). This is what makes the first build show
   real content rather than invented content, and it is the only part of the interface that
   can be honest about it in Phase 1.
   **A dropped transcript is the owner's own data and never enters this repository.** No
   transcript is committed as a fixture; the parser's tests run against synthesised records.
2. **At narrow widths the 3D panel shows the Virgil close-up**, not the whole set — his face
   and console, animated, reacting. The wide symmetrical set does not survive a third of the
   width; the characters become specks. This applies to the desktop's 35 % panel and to the
   phone's header.
3. **The composer is present and typeable, with an honest label** saying it is not connected
   to a session yet. Text typed into it is kept. It never pretends to have sent anything.

Decided by this session, not asked, and open to correction:

- **The conversation's text uses the reader's own system fonts.** The artifact is already
  over the mobile transfer budget (133.9 % of 6 MiB at V8); a conversation UI needs far more
  glyph coverage than the 3D screens' subsets, and a full text and monospace pair would add
  hundreds of kilobytes for no gain the owner would see. The custom subsets stay where they
  earn their place: on the screens in the world.
- **The greeting states what is actually true at the time.** With the demo running it
  describes the demo's current beat, so the world and the conversation never disagree; with a
  transcript loaded it describes that transcript's last state. It is never a fixed sentence
  that outlives the thing it describes.
- **The three suggested actions act on the view**, not on a session: go to the agent
  concerned, open the evidence, pause. Labelled as what they are.

## 5b. Clickable screens — the owner's direction of 8 September

His words: *"why dont we have each screen clickable? that way, it shows the information it has,
but when you click the window, it opens up an expanded text box with the full information."*
He also accepted the lighting and material diagnosis in the same message.

**This is the same component as the conversation panel, reached from the world instead of from a
menu**, and it is recorded here rather than in the backlog for that reason. It also dissolves a
constraint this session had stated as a limit: the ledger and the screens were going to have to
read as shape and colour at distance because screen text collapses below about 64 px. With the
screens clickable, the screen carries the glance and the panel carries the full truth, and
neither has to compromise.

- **One panel, many sources, and the screen is a summary of the panel — never a separately
  written text.** The Keeper's console opens the Keeper's record; the verdict slab opens the
  verdict with its evidence; a ledger row opens that hop. Two levels of detail over one source,
  because two texts written separately can disagree, which is the class of defect the owner
  caught in V7 when Virgil's slab said "awaiting review" during a build.
- **Three distances, three levels:** glance from the wide view (shape and colour), approach at the
  station close-up (headline text), read in the panel (everything).
- **Affordance without hover.** A phone has no hover, so a persistent cue on each screen — a
  corner bracket or expand glyph — rather than a highlight that only a mouse can find.
- **`ILLUSTRATIVE · NOT REAL STATE` belongs in the panel prominently, not as a footnote.** Full
  detail set in clean HTML is far more believable than a small glowing screen in a 3D scene, so
  the marking matters more there, not less. This is the one new risk the feature carries.

**Decided by the owner, 8 September** — and **superseded by his own decision of 10 September; see
§5c below, which governs.** The paragraph is kept as written because it is the record of what was
decided and why, and because two of its three consequences survive the reversal intact.

Decided against this session's recommendation, which had the
reader waiting for a camera flight before anything could be read: *"tapping a screen opens the
panel straight away and takes you there — but the panel opens up so you can see it instantly,
while you are being taken there. So you arent waiting to be taken there first."* One tap does
both, concurrently: the panel is up immediately and the camera travels underneath it, so the
world has arrived by the time the panel is dismissed. Three consequences, recorded because they
constrain the build:

- **The panel is driven by data, never by the camera arriving.** It renders complete before the
  flight starts. This is free if one source feeds both levels, as recorded above, and it is the
  reason that rule is not merely tidiness.
- **Dismissing the panel leaves the reader at the station**, never snapped back. The tap did two
  things and neither is thrown away. Going back is then one step per level — panel, station, wide
  view — which matches the three distances.
- **The panel's entry must animate on the compositor only** (transform and opacity, no layout),
  because it plays at the same moment as the camera flight and, on a phone, both land on the
  worst frame budget in the product.

Consequence for sequencing: the panel is the first piece of this interface, so the flat mock
offered to the owner should cover both — the expanded screen panel and the full-conversation
split are the same layout at two sizes.

## 5c. Tapping a station is two steps — the owner's decision of 10 September, which reverses §5b

His words, in full, from `docs/process/OWNER_DECISIONS_2026-09-10.md` item 9:

> *"When you click each agent, the window opens straight away. And then when you exit their window
> it has the close up of them. What should happen when you click them is first zoom in to their
> close up view. And THEN when you click their screen, that's when it should open the window. It's
> better that way."*

**This supersedes the decision recorded in §5b.** It does not delete it. §5b stands as the record of
what he decided on 8 September and of the reasoning both sides put; this section is what the build
follows.

**Why it reversed, and it is worth being exact about this.** §5b was chosen from a description of
the interface, before one existed. §5c is chosen from using the thing. The argument he gives for it
is the consequence he noticed himself: leaving a window put him at a close-up, because the tap had
flown the camera there while the window covered it — so the interface kept arriving somewhere he
had never asked to go. One tap doing two things is what produced that, and it is why the fix is to
separate them rather than to change what dismissal does. **Use beat description**, and that is the
whole of the justification; no session found a defect here.

### The rule

- **The first tap on a station takes the camera to it and opens nothing.**
- **A tap on that same station once you are there opens its record, and does not move the camera
  again.**
- A tap on a *different* station from a station is a first tap: it travels there and opens nothing.

The rule lives in exactly one function, `stepFor` in
`apps/mission-control/src/world/mobile/composition.ts`, so that no surface can disagree with
another about it.

### What a station is, and what this means for Virgil

A station is a character and the screens that belong to them: the Fabricator and the Fabricator's
display are one station, and the three slabs are one station of their own. **The second tap counts
wherever it lands on that station — on the screen or on the character.** His sentence names the
screen, and the screen is what carries the content, but the rule is stated over the station for a
reason that is specific and measured rather than tidy:

**Virgil has no screen.** His console is a bare oval ring (`world/room/Models.tsx`), and his
displays are the three floating slabs, which hang above the whole set. At his close-up they are
**above the frame and project to nothing** — measured in a browser at 390 × 844, 430 × 932 and
844 × 390, in which the only world targets that appear at his close-up are Virgil himself and
whichever specialists stand behind him. A rule that only screens open would therefore leave the
central character of the product with no second step at all; and a rule that made characters inert
would put a dead target under a thumb at every close-up, which reads as a broken interface.

So: **tap Virgil → his close-up; tap him again → his conversation.** That is the same two-step
grammar the specialists have, applied to the one member of the cast whose interface *is* the
conversation rather than a display.

**The `TALK TO VIRGIL` control keeps opening the conversation in a single press, and it no longer
moves the camera.** It is a control with its name written on it: pressing something that says
`TALK TO VIRGIL` can hold no surprise, which is exactly what a tap on a character in the world
could. Removing the camera move from it is the other half of his complaint answered — dismissing a
conversation opened from the dock now returns him precisely where he was, rather than to a close-up
he never asked for.

### What survives the reversal, unchanged

1. **The gesture guard.** A drag still opens nothing and still travels nowhere; a tap still works.
   `wasTap()` guards every press, and the guard against one press being answered twice — by the
   world's raycast and by the DOM hit test — matters *more* under two steps, because a press counted
   twice would travel and open at once, which is the behaviour being removed.
2. **Back is one step per level.** Record → station → overview, matching the three distances.
   Dismissing a record still leaves the reader at the station rather than snapping back; under two
   steps that is no longer a special provision but simply where he was.
3. **The record renders from data, never from the camera arriving** (§5b's first consequence, and
   the reason the one-source rule is not merely tidiness). There is no timer anywhere between the
   press and the window: the tap that opens it opens it in its own event.

§5b's second consequence — *"the tap did two things and neither is thrown away"* — is the one the
reversal retires, because the tap now does one thing.

### What it cost, said plainly

**A record is now two taps instead of one**, which is the trade he chose knowingly and from use. And
**the second step is not discoverable on a phone**, because there is no hover with which to advertise
it. `e2e/verify-owner-build-v11.ts` drives both taps at three simulated viewports and measures each
step separately, so the check and the interaction changed together — but no check can tell whether a
reader finds the second tap. One discreet line at a station, *"Tap again to open"*, is this session's
answer to that and **this session's judgment, not his instruction**: it is one element, deleting it
is the whole of removing it, and it is recorded here so he can.

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
