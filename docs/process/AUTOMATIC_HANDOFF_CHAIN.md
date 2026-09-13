# The automatic handoff chain

**What it is, in one sentence.** You say what you want built. Sessions build it, review it,
fix it and review it again without you doing anything, and then they stop and tell you.

Authorised by the owner in the owner console on 2026-09-13:

> *"I want Virgil or Raphael to be able to write the brief and start a session. So I don't have
> to. THEN when the builder finishes, opens a pull request and starts the review session in a
> new window. The reviewer posts a comment on the pull request, and then Raphael automatically
> get the results and makes the recommendation and next step."*

> *"I don't want Raphael on a timer. I want Raphael to know exactly when the review is finished
> so it's not waiting on a timer."*

> *"I want it to go from Raphael—build—review—fix without me having [to] approve it. Always one
> round. 2 if I approve."*

---

## What happens, in order

```
you say what you want built
  │
  ├─► Raphael writes the brief and starts ONE build session
  │       it builds, pushes, opens its own pull request,
  │       writes down what it did, and stops.
  │
  ├─◄ the pull request wakes Raphael
  │
  ├─► Raphael starts ONE review session
  │       an inspector who did not do the building reads that exact
  │       version, posts what it found, and stops.
  │
  ├─◄ the comment wakes Raphael
  │
  ├─► if the inspection found real faults: ONE fix session
  │       it repairs only what was found, pushes, and stops.
  │
  ├─◄ the push wakes Raphael
  │
  ├─► ONE more review of the repaired version
  │
  └─  and then it stops and tells you, whatever it says.
```

Nothing on that diagram asks you for anything. The only thing that ever needs you is merging,
and the thing at the end of the chain is a report, not a merge.

**The analogy.** You hire a builder and a surveyor. The builder builds and calls it done. The
surveyor inspects and writes a snagging list. The builder gets one callback to fix the list,
and the surveyor comes back once to check the fixes. Then everyone stops and the report comes
to you. Nobody paints the house a different colour because they had time left over, and nobody
books a third visit without asking.

---

## The six things that make it safe

### 1. One hop, always

**Raphael starts sessions. Sessions start nothing.**

The builder does not start the reviewer, even though that is how the owner described it. The
outcome is the same and he does nothing either way; only the hand that starts it moves. The
reason is in `constitution/permission-matrix.json`: exactly one role in this repository has
`mayLaunchStages: true` and it is the conductor. Everything else, the builder included, is
`false`. That file is authority layer 2 and no session may edit it.

It is also simply the right rule. Sessions that can start sessions can start sessions. The
failure is not dramatic, which is what makes it dangerous: it is a quiet, branching tree of
work nobody asked for, discovered the next morning, having spent a night's usage on it.
Routing every hop through one conductor also means there is exactly one place to look to see
what started what.

`packages/repo-checks/test/handoff-chain.test.ts` fails if a role file stops saying this or if
the matrix stops agreeing with it.

### 2. The count lives on the pull request, not in anyone's head

Every session ends by posting a comment on the pull request with an invisible marker in it:

```
role=reviewer round=1 sha=bbb2222 verdict=BLOCKED next=fix
```

**Why it cannot be a session's memory.** Each session starts knowing nothing about the last
one. Ask any of them how many rounds have been spent and the honest answer is "no idea", and
the convenient answer is "one more than is allowed". On 2026-09-12 a single small change went
through **eleven** review rounds, because the limit was written in prose and nothing counted.

`packages/gate-engine/src/handoff.ts` counts the markers and says what happens next.
`pnpm chain` runs it. No session decides its own next step; it reads it.

This also means **a chain survives its conductor**. If the Raphael window is closed, archived
or replaced, a fresh one reads the same pull request and knows exactly where the chain stands.
Nothing has to be told to it and nothing is lost.

### 3. Every session that pushes declares its own facts

A session cannot be trusted to frame the review of its own change. Not from dishonesty —
**because it already believes the change is right, and every softening it introduces reads as
reasonable.**

So the handoff is split in two: **the session supplies facts, the repository supplies the
questions.** The comment is generated, not written:

```sh
pnpm chain -- --facts builder --round 0 --ran <file> --could-not-run "…" --not-done "…"
pnpm chain -- --facts fixer --round <n> --ran <file> --could-not-run "…" --not-done "…"
```

The script derives everything it can derive — branch, base, head, changed paths, risk tier,
and which governed paths were touched — **from Git rather than from the session**. A stale
head or a stale path list cannot be reported, because nobody is asked for them. What is left
is the three the repository cannot know, and it refuses to print without them:

| field | what it is for |
|---|---|
| what was run | the **real output**, from a file. An empty file is refused. |
| what could not be run, and why | "nothing" is an answer; silence is not |
| what was deliberately not done | where scope discipline becomes visible |

**The half everybody forgets is the fix session.** Almost everyone writes this rule for "the
builder", and a rule that binds the builder is obeyed by the builder and by nobody else. The
fix stage is the more dangerous one: it works fast, against a list, on code it did not write,
and it is the likeliest commit in a chain to introduce something new. A chain whose builder
posts facts and whose fixer posts prose hands the second reviewer the *first* builder's stale
head, stale paths, and a "could not run" line describing a different change.

**And a paragraph is not a mechanism.** This one has one: a pushing handoff with no facts
block for its own SHA **stops the chain at the owner** instead of starting a review, and a
facts block in an earlier comment does not vouch for a later push. Nothing proceeds without
it.

**One thing that is not enforced**, said rather than implied: the rule is a *new* comment each
time, never an edit of the previous one, so a reader sees what each session did rather than
what the last one left behind. From outside, an edited comment and a fresh one look identical.
That rule is written down precisely because nothing holds it.

### 4. A verdict is about one version, and the fix makes a new one

When the fix session pushes, the review that prompted it stops counting. The chain owes the
repaired version a review of its own — which is the second review round in the diagram, and it
happens because the counter treats any push newer than the last review as unreviewed, not
because anyone remembered to ask.

This is `constitution/REVIEW_POLICY.md`'s staleness rule, applied by the machine rather than by
a reader: *a review vouches for the exact version it read and is broken by any later push.*

### 4a. Two ways it could have run without stopping

Both were found by an independent inspector attacking the counter rather than reading it, and
neither could bite while a person was driving. They bite on the night nobody is watching, which
is the night this exists for. Each was answered, and **4b is the record of a second inspector
showing that neither answer worked** — read the two sections together.

**A repair session that called itself a builder was never counted.** The count read the role
each session declared for itself, and both spellings are commands this system offers. A repair
labelled `builder` left the count at zero for ever, so the chain would authorise "round 1 of 1"
again and again. **A round is now counted by position: a push that follows a review is a repair
round, whatever it calls itself.**

**Comments read newest-first commissioned reviews without bound.** The order was load-bearing,
undocumented and unchecked; reviews are not repair rounds, so the cap never engaged. **The
counter now refuses to decide when it can prove the order is wrong** — a review of a version
that had not been pushed yet cannot happen in a chain that ran forwards.

**The first signal tried for this was round numbers falling, and it was wrong.** A session that
misdeclares its role also writes round zero, so they fall legitimately, and the check cried wolf
over the very chain the first fix exists to catch. The two repairs collided, a test caught it,
and the signal became one no session declares at all.

### 4b. Both of those fixes were half a fix, and what finished them

An independent inspector attacked the two repairs above the same way, and neither survived
first contact. This is what was wrong with them and what closes them.

**The order check could not fire on a chain this repository produces.** It matched the
reviewer's marker against the builder's by exact string, and the two are written by different
code paths that disagree about how long a SHA is: the facts block writes the first seven
characters, and a reviewer is handed the full forty of the version it read. Seven against forty
never matches, so the check found nothing to object to in any chain, including a reversed one —
the original failure, unchanged, behind a guard that read as if it were closed. The tests passed
because they used one seven-character literal on both sides. **The two markers are now matched
on the prefix they share**, and a case with a forty-character reviewer marker holds it there.

**"Position cannot be misdeclared" was not true, and that sentence used to be here.** Position
is read off `role` on a marker that parsed, and both halves are the session's own output, so
the old defect was narrowed to one spelling rather than closed. A session that spells its push
`reviewer` is not counted as a push — `--emit reviewer` is a legal command for anyone, needing
only a verdict — and a session whose marker is missing or malformed is not counted at all,
because unreadable markers are ignored by design. Ten repairs of the first kind, or six of the
second, still read as "round 1 of 1 is authorised".

**What closes it is counting the reviews, which is the one number no session declares about
itself.** A chain that ran forwards pushes something before each review: the first review reads
the build, and every review after it reads work pushed in answer to the one before. So *r*
reviews mean at least *r − 1* repair rounds are spent, and the count is now the larger of the
pushes seen and that floor. It takes from each attack what the attack gives it — spelling a push
`reviewer` adds to the review count exactly what it removes from the push count, and a repair
too quiet to be counted was still read by a reviewer who was not.

**It over-counts in one place, on purpose.** Two reviews of the same push — a re-review after
`INSUFFICIENT_EVIDENCE`, say — read as a round that nobody spent, and the chain stops one round
early. That is the direction this whole file leans: a chain that cannot tell where it is stops
at you rather than starting another session.

**One gap is left open, and it is left open knowingly.** If a repair posts no readable marker
*and* the review that follows it posts none either, the pull request holds no record that either
happened, and nothing counted over markers can see them. That chain resolves towards another
session rather than towards the owner, which is the unsafe direction. It needs every session in
the chain to skip a step the tooling refuses to skip for them — `pnpm chain --facts` will not
print without its three answers, and `--emit` will not print a marker the counter cannot read —
but nothing enforces that they are posted. It is written here rather than left to be found.

### 5. One round without you, two with you, and never three

`constitution/REPAIR_LIMITS.md` says one repair cycle without the owner and two with him, and
past that the run stops at `OWNER_DECISION_REQUIRED`. The chain runs at exactly those numbers.

| | fix rounds | who allowed it |
|---|---|---|
| you said nothing | 1 | the constitution |
| you approved a second | 2 | you, quoted on the pull request |
| anything beyond | 0 | nobody can, in a chat window |

The ceiling is enforced by the counter, not by a paragraph. A marker saying `rounds=99` is
read as two. Raising it is a change to authority layer 2 and takes a written decision under
`docs/decisions/`.

When a chain stops you are told **which** dead end it reached, because only one of them is
yours to lift: *one round is spent and you can approve a second*, or *both are spent and a
third would need the constitution changed*.

### 6. It never merges

Sessions branch, commit, push and open pull requests unattended, overnight, and that is
authorised. **They never merge.** No session merges into `main` unless the owner writes
`merge approved` in the owner console, in that turn, naming the pull request.

Worth being precise about why this is a discipline rather than a wall: a session acts with the
owner's own GitHub identity, and that identity is allowed to merge. The `ask` rules in
`.claude/settings.json` stop the obvious tools and put the decision in front of him; branch
protection requiring his approving review is the only enforcement a session cannot reach.
`CLAUDE.md` says all of this already and it is repeated here rather than assumed.

---

## No timer, and what that means

Raphael does not poll. It subscribes to the pull request, ends its turn, and is woken when
something actually happens on it. A comment posted at 3am is read at 3am.

A timer would be worse than slow. **A timer that fires while a session is still working finds
nothing, and has to guess whether nothing means *not yet* or means *it died*.** An event never
has that ambiguity, because the event is the thing that happened.

**If the subscription is unavailable**, Raphael says so in those words and the chain stops at
the owner. It does not quietly fall back to a fifteen-minute poll. An automatic chain you
believe is event-driven, silently running on a timer, is worse than no chain at all, because
you will plan around a promise that is not being kept.

**What the subscription does not survive.** It belongs to one window. If that session ends or
is archived, events stop arriving and the chain stops where it is. That is safe rather than
lossy, for the reason in rule 2: the state is on the pull request, so any new window picks it
up.

---

## What it costs

Being honest about this, because "free" does a lot of work in the usual answer.

- **It costs no GitHub minutes.** GitHub is never asked to run anything. There is no workflow
  behind this, no machine started on your behalf, nothing to bill. This repository is public,
  so GitHub Actions would have been free anyway; that is not the argument.
- **It costs Claude usage.** Every hop is a real session spending real tokens, and a full
  chain is four of them: build, review, fix, review. A night with three pieces of work in it
  is twelve sessions.

So the saving is not that the work became free. It is that the cost arrives as usage you can
see and cap, rather than as a bill from a second vendor for a machine whose only job was to
start a model you were going to run anyway.

**And the real argument for it is not the money.** An automatic trigger fires on a *push*, and
a push is not a claim that work is finished. It is a claim that work is *saved*. So a trigger
reviews typos, half-finished thoughts and every intermediate commit — that is where eleven
reviews in one day came from. A session deciding it is done is making a judgement, with the
work in front of it. That judgement is the valuable part, and an automatic trigger throws it
away.

---

## How to start one, and how to stop it

**Start:** say what you want built. That is the whole interface. Raphael writes the brief,
pins the branch, and starts the build session. You are told which pull request to watch and
nothing else.

**Approve a second round**, if you want one before going to bed: say so naming the pull
request, for example *"2 rounds approved on 27"*. Raphael posts your words on that pull request
with the marker. It covers that pull request only and expires with it.

**Stop:** say stop. Raphael starts nothing further. Sessions already running finish their own
hop and stop there, because none of them can start anything.

---

## What this does not do, said plainly

- **It does not decide anything is good.** A chain ending in `PASS` means an independent
  inspection found nothing on that exact version. It does not mean the work is what you wanted.
- **It does not merge**, ever, and it does not ask to in a way that could be mistaken for
  doing it.
- **It does not fix what the review did not find.** A fix session repairs the named findings
  and nothing else, and a fix session that tidies other things up is doing the thing the
  repair contract exists to prevent.
- **It cannot rescue a brief that was wrong.** Four sessions building the wrong thing
  carefully is still the wrong thing, and they will not notice. That is the part that is still
  yours, and it is the reason Raphael writes the brief in front of you rather than behind you.

---

## Where the pieces are

| Piece | File |
|---|---|
| The rule that counts rounds, and refuses a factless handoff | `packages/gate-engine/src/handoff.ts` |
| The command that runs it | `scripts/virgil-chain.ts`, as `pnpm chain` |
| The conductor | `.claude/skills/raphael/SKILL.md` |
| What a builder **and a fixer** post, and that they start nothing | `.claude/agents/fabricator.md` |
| The questions the repository asks a reviewer | `.claude/agents/keeper.md` |
| The guards on all of the above | `packages/repo-checks/test/handoff-chain.test.ts` |
| The round limits themselves | `constitution/REPAIR_LIMITS.md`, `constitution/authority.json` |
