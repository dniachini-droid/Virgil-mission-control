# Phase 2, slice three — you type into it, and work happens

**Status: proposed, and started on the owner's instruction of 2026-09-10.** He was offered a narrow version first — the page writes his message into one file and nothing else — and declined it: *"I want the wide one first. thats what I am going to want to use, lets not waste time with narrow because its not what i want."* So this is the wide one.

This is the slice where the application stops describing and starts **doing**. Everything before it was read-only by construction, which is why it could be built without a session ever touching a credential. That ends here, and most of this document is about what the new power is bounded by.

## What it is

The owner types an instruction into Virgil's window on his phone. A real Claude Code session starts, in this repository, on a branch, and does the work. The room shows it happening — the Fabricator lit, the hop it is on, the checks arriving from GitHub — and when it finishes, the change is on a branch waiting for him.

## How it works

1. **The page** posts his message to `/api/instruct` on the site he already has.
2. **A Netlify function** authenticates the request, refuses anything malformed, and triggers a GitHub workflow by `workflow_dispatch`, passing the instruction.
3. **The workflow** checks the repository out, runs an agent against the instruction, and lets it work under the ordinary rules in `CLAUDE.md`.
4. **The agent** writes `.virgil/state.json` as it goes — the mechanism slice two already built — so the room fills in while he watches.
5. **It commits to a branch and stops.** It never merges, never touches `main`, never deploys.

Chosen because it uses what already exists: his repository, his Actions runner, his site. There is no new server to run, nothing to keep alive, and no machine of mine anywhere in it.

## What the owner has to provide, and what each thing can do

**This is the part to read twice.** `CLAUDE.md` forbids a session connecting credentials, and `OD-0009` says plainly that authorising Phase 2 was not authorising a token. Each of these is his to create and to place in Netlify or GitHub himself. No session creates, holds, sees or types any of them.

| What | Why | What it must NOT be able to do |
|---|---|---|
| A GitHub token with **Actions: read *and write*** | to start the workflow | merge, administer, delete, or touch any other repository |
| An **Anthropic API key**, in GitHub's secrets | so the workflow can run an agent | anything else — it is a spend, and it is metered |
| A **shared secret** between page and function | so only his site can start a run | be readable by anyone who opens the page |

**The Anthropic key is a real, ongoing cost**, separate from the $10 Actions budget he set. Every instruction he types spends money. That is not a hidden consequence to discover later, and slice three is not finished until the page tells him a run costs something before he starts it.

## The limits, and how each is enforced rather than promised

1. **Nothing merges, deploys or touches `main`.** Already `CLAUDE.md`'s hard limit and `constitution/authority.json`'s `ownerOnlyActions`. The workflow additionally refuses to run against `main`, so it is a property of the machinery and not only of the agent's good behaviour.
2. **Only his site can start a run.** The function requires the shared secret and refuses without it. Netlify's password protects the page; the function is protected separately, because an endpoint is reachable whether or not a page in front of it is.
3. **One run at a time, and a ceiling on runs.** A typed instruction is cheap to send and expensive to serve. The function refuses a second run while one is in flight, and refuses more than a set number in a day. Without this, a stuck finger is a bill.
4. **Every instruction is recorded.** What was asked, when, by which run — written where he can read it, so there is never a change in the repository whose reason cannot be found.
5. **The agent's own report stays a claim.** Slice two's rule is untouched: what the agent says about itself is drawn as a claim, the checks come from GitHub, and a report that goes cold stops being drawn as now.

## What this slice does NOT do

- **It does not merge.** Not with a button, not on a passing review, not ever. That is the owner's alone and it is the line the whole system exists to hold.
- **It does not run without him.** No schedule, no trigger on push, no agent starting itself. Every run begins with him typing.
- **It does not touch another repository**, and the token cannot reach one.
- **It does not make the agent's word evidence.** The checks still come from somewhere the agent cannot write.
- **It does not change the Owner Build.** V10 and V11's file builds still make zero network requests and still know nothing about any of this.

## What could go wrong, said in advance

- **Cost.** The failure mode is not one expensive run, it is fifty cheap ones. Limits 3 and the visible cost are the answer, and they are part of the slice rather than a follow-up.
- **An agent doing something unwanted on a branch.** Bounded by the branch and by `main` being unreachable, and the cost of the worst case is a branch he deletes.
- **The endpoint being found.** A URL is not a secret. The shared secret is what actually guards it, and it must never be in anything the page ships.
- **His instruction being wrong or ambiguous.** An agent acting confidently on a half-sentence is a real risk; the run record is what lets him see what it understood.

## How the owner will know it worked

He types *"add a test for X"* into his phone, puts it down, and comes back to a branch with the change on it, a room that showed him the Fabricator working while it happened, and check results he can read.

## Order of work

1. The workflow that runs an agent on dispatch, and refuses `main`. **No credential needed to write it.**
2. The function that triggers it, with the secret, the one-at-a-time rule and the daily ceiling. **Written now, inert until he installs the secrets.**
3. The composer in the page, and the cost it shows before he sends.
4. The record of every instruction.

Steps 1, 2 and 4 can be built and tested before any credential exists. **Nothing runs until he provides the three things above**, and the brief says so rather than leaving him to discover a half-wired feature.
