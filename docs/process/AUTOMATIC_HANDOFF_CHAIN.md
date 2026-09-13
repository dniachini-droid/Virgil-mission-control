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

## The four things that make it safe

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

### 3. One round without you, two with you, and never three

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

### 4. It never merges

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
| The rule that counts rounds | `packages/gate-engine/src/handoff.ts` |
| The command that runs it | `scripts/virgil-chain.ts`, as `pnpm chain` |
| The conductor | `.claude/skills/raphael/SKILL.md` |
| What a builder posts, and that it starts nothing | `.claude/agents/fabricator.md` |
| What a reviewer posts, and that it starts nothing | `.claude/agents/keeper.md` |
| The guards on all of the above | `packages/repo-checks/test/handoff-chain.test.ts` |
| The round limits themselves | `constitution/REPAIR_LIMITS.md`, `constitution/authority.json` |
